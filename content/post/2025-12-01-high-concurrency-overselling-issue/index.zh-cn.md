+++
title = '超卖问题 - 高并发下性能与一致性的博弈'
description = '库存超卖是秒杀或抢购场景下看似简单的扣减库存问题，实际上是高并发下性能与一致性的博弈，是考验工程师基本功和场景思维的一种核心考点。'
date = 2025-12-01T09:27:00+08:00
slug = '2025-12-01-high-concurrency-overselling-issue'
categories = ['guide']
tags = ['business']
+++

> - \> “超卖怎么办？”
> - < “加锁就可以了。”
> - \> “你再思考一下？”

库存超卖看似是“扣减库存”的简单问题，实际上是高并发下性能与一致性的博弈，也是大厂面试筛选基础扎实且具备场景思维的工程师的核心考点。
看似简单的超卖问题，可以从7种技术方案来吃透。

## 核心矛盾：为什么超卖难解决？

“超卖”的本质是，多线程/多服务（分布式）并发执行“查库存 -> 扣库存”时，出现“库存判断实效”。
比如100个请求同时查询到库存1，都执行了扣减，最后库存变成了-99，这就是典型的超卖。

解决超卖没有完美无缺的解法，所有的方案都是**性能、一致性、复杂度**的三方取舍。下面的7种方案，正是从**简单兜底**到**高阶解法**的取舍演进。

### 1: 数据库无符号字段——超卖的“最后防线”

```text
库存：1 --> UPDATE --> 库存：0

再次UPDATE --> 失败

```

- 👍 兜底保证不超卖
- 👎 被动防御

#### 技术原理

```sql
CREATE TABLE goods
(
    id    BIGINT PRIMARY KEY,
    stock BIGINT UNSIGNED NOT NULL DEFAULT 0 -- 关键: UNSIGNED
);

-- 如 stock - 1 < 0，SQL执行失败
UPDATE goods SET stock = stock - 1 WHERE id = 1;
```

#### 要点

使用无符号字段，只能防范**最终超卖**，防不住并发请求穿透，例如100个并发请求查到库存是1，都执行了UPDATE，99个请求会因为库存负数报错，
但这些请求已经进入业务流程，会导致**订单超卖**，即订单数大于实际库存，用户下单成功但却**被告知库存不足**，用户体验差。

#### 适用场景

中小型非秒杀场景的**兜底方案**，不能单独使用，需要配合其他并发控制手段。

### 2: 悲观锁——强一致性的性能杀手

```text
请求1  请求2  请求3

[SELECT ... FOR UPDATE]
```

- 👍 强一致性
- 👎 吞吐量极低

#### 技术原理

利用 InnoDB 的行锁机制，通过`FOR UPDATE`锁定查询行，避免并发修改

```sql
BEGIN;
-- 锁定 id = 1 的商品，其他对本商品的请求需等待释放锁
SELECT stock FROM goods WHERE id = 1 FOR UPDATE;
-- 确认库存充足后扣减
UPDATE goods SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

#### 要点

悲观锁的行锁带来的串行执行会导致吞吐量极低，秒杀场景几百个请求排队，超时率飙升；若 where 条件不命中索引，会升级为表锁，阻塞全表，使得业务彻底瘫痪。

#### 适用场景

一致性要求极高、没有并发或并发极低的场景，例如奢侈品库存扣减，宁慢勿错。

### 3: 乐观锁（CAS）——中低并发的“平衡之选”

```text
请求A: 读V1    A 成功
           ->        -> B 重试
请求B: 读V1    B 失败
```

- 👍 性能提升
- 👎 冲突时CPU空转

#### 技术原理

给库存表增加版本号，更新时校验版本号，确保**只有未修改过的库存才可以扣减**：

```sql
-- 1. 查询库存和版本号
SELECT stock, version FROM goods WHERE id = 1;
-- 2. 扣减库存时校验版本号
UPDATE goods
   SET stock   = stock - 1,
       version = version + 1
 WHERE id = 1
   AND version = #{old_version};
```

#### 要点

1. 高并发下限制重试次数，避免乐观锁重试过多
2. 结合 Redis 预热缓存，减少数据库请求
3. 可以用时间戳代替版本号，但需要注意时钟同步问题

#### 适用场景

中低并发（QPS < 1000）下且允许少量重试的场景，例如电商日常促销。

### 4: Redis队列——瞬时高流量的削峰处理

```text
🌊  ->  队列  ->  💧  -> 处理
```

- 👍 扛住瞬时流量冲击
- 👎 逻辑复杂且容易写出问题

#### 技术原理

##### 预热阶段

将商品库存同步到Redis队列

```shell
for i in 1..1000; do LPUSH goods:stock:1 1; done
```

##### 下单阶段

请求从队列取出元素，成功则有库存

```java
public void handleStock() {
  // RPOP goods:stock:1
  Object stock = redisson.getDeque("goods:stock:1").pollLast();
  if (stock == null) {
    throw new RuntimeException("库存不足");
  }

  // 继续执行数据库扣减和下单逻辑
}
```

#### 要点

需要保证双写一致性，保持Redis队列与库存一致

1. 下单成功后，先更新Redis队列，再更新数据库，如数据库更新失败，需回滚Redis队列
2. 定时任务同步数据库库存到Redis队列，修复异常差异
3. 避免**单商品多件购买**（无法一次取多个），需额外处理批量场景

#### 适用场景

瞬时高流量削峰，但库存粒度是**单件**的场景。

### 5: Redis Lua脚本——原子性的“终极保障”

```text
GET stock
IF stock > 0
    DECR stock
END
```

- 👍 Redis层面的原子性
- 👎 脚本难以维护

#### 技术原理

Redis执行Lua脚本时，会阻塞其他命令，确保脚本内的操作原子性：

```lua
-- 查库存 -> 扣库存
local stock = redis.call('GET', 'goods:stock:1');
if not stock or tonumber(stock) <= 0 then
    return 0; -- 库存不足
end
-- 扣减库存
redis.call('DECR', 'goods:stock:1');
return 1; -- 扣减成功
```

#### 要点

Lua脚本有可能会导致Redis阻塞，需分场景讨论：

1. 短脚本阻塞时间极短，可忽略
2. 长脚本涉及到复杂运算，会阻塞Redis，需拆分或用异步任务
3. 需开启Redis持久化（AOF+RDB），避免脚本执行过程中因宕机导致库存丢失

#### 适用场景

Redis主导库存管理，对原子性要求极高的场景，如直播带货瞬时下单。

### 6: 分布式锁——跨服务的“一致屏障”

```text
服务A ✅
服务B ❌
...
服务Z ❌
```

- 👍 分布式强一致
- 👎 性能瓶颈

#### 技术原理

使用Redis分布式锁，控制多节点业务处理一致：

```java
public void handleStock() {
  // 1. 获取分布式锁（锁商品ID）
  RLock lock = redisson.getLock("lock:goods:1");
  lock.lock(30, TimeUnit.SECONDS); // 自动续期避免死锁
  try {
    // 2. 查库存
    int stock = repository.getStock(1);
    if (stock <= 0) {
      throw new RuntimeException("库存不足");
    }
    // 3. 扣减库存
  } finally {
    // 4. 释放锁
    if (lock.isHeldByCurrentThread()) {
      lock.unlock();
    }
  }
}
```

#### 要点

需要避免分布式死锁的问题：

1. 设置锁超时，并开启自动续期，例如Redisson的watch dog机制
2. 使用 finally 强制释放锁
3. 避免锁嵌套，例如先锁A再锁B，在另一个服务先锁B再锁A

#### 适用场景

微服务架构、分布式服务、多服务节点等操作同一库存的场景，如电商订单服务、库存分离等。

### 7: 分段锁——解决高热Key的分治手段

#### 技术原理

##### 分片初始化

将库存拆分成多个分片

```shell
SET goods:stock:1:0 10 # 分片0
SET goods:stock:1:1 10 # 分片1
# ...
SET goods:stock:1:99 10 # 分片99
```

##### 选分片下单

取用户ID按一定的算法定位分片，避免单分片热点，例如可以采用CRC32均分用户进行定位

```java
public void handleStock(long uid) {
  CRC32 crc32 = new CRC32();
  crc32.update(Long.toString(uid).getBytes());
  int shardIndex = crc32.getValue() % 100;
  String shardKey = String.format("goods:stock:1:%d", shardIndex);
  int stock = runStockLuaScript(shardKey);
  if (result == 0) {
    throw new RuntimeException("库存不足");
  }
  // 继续处理库存
}
```

#### 要点

1. 需要预期确认分片数，如 QPS = 10000，分10分片，每片承载1000左右的QPS
2. 避免过多分片，多分片会带来管理上的复杂度
3. 剩余库存会分散在各个分片，可考虑合并分片或循环分片，如分片0售空，可尝试分片1、分片2，顺次遍历分片拿库存

#### 适用场景

高并发秒杀场景，QPS > 10000 的极端流量，如字节电商、拼多多百亿补贴等。
