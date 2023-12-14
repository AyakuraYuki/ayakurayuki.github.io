---
title: 基于位的权限功能的设计
date: 2023-12-14 15:34:00
categories:
    - infrastructure
tags:
    - permission
    - role
mp3:
cover:
---

> 权限是一种用来赋予或限制用户使用功能的方式，它可以被配置到公会级别或者不同的身份上。另外，身份可以附加给用户，以此来组织化的赋予/限制用户在组织内的能力。

上述引言是我对 Discord 开发者文档库中对于 `Permissions` 的开篇描述的一个提炼。

---

这篇文章介绍了基于位 `bit` 的权限功能的设计，在这个设计中，主要包含了下面列出的要素：

1. 整个权限功能是在一个群体里流转的，不同的群体可以有不同的权限配置；
2. 权限功能的基础设施，在业务描述上可以称为群、频道、身份；
3. 权限功能离不开用户，因为最终会被分配到用户身上；
4. 权限的集合应该由一系列原子属性来定义，每一位代表了一个独立的、可以原子化的功能，各属性之间不应该也不能出现歧义或重叠。

## 关于位

【位】是我们整个功能设计的核心，我们使用 `位运算` 来作为权限归集的运算基础。

权限的操作涉及到“授予”、“撤除”、“归集”、“检查”四种行为。

这四种行为映射到位上，可以描述为：

- 授予：将位上的某一个位设成 `1`
- 撤除：将位上的某一个位设成 `0`
- 归集：所有属性或权限值合并得到最终结果
- 检查：验证某一位上是 `0` 还是 `1`，表示这个属性是 `开` 还是 `关`

这里举个例子来表达一下其中一些行为。

```python
# 把权限 A（定为 0x40）和权限 B（定为 0x800）归集到一起
permissions = 0x40 | 0x800  # 0x840 -> 2112

# 分别检查权限 A 和 B
(permissions & 0x40) == 0x40  # True
(permissions & 0x800) == 0x800  # True

# 检查一个不存在的权限 C（定为 0x2）
(permissions & 0x2) == 0x2  # False

# 撤除权限 A
permissions = permissions & ~0x40
(permissions & 0x40) == 0x40  # False
```

我们从中可以看到，要实现上面说到的四种行为，我们需要使用位运算中的【或 `|`】、【与 `&`】、【取反 `~`】三种操作。

实际上，对于这些运算，我们可以不用写的很复杂。我们可以把权限转换成“位置”的思路，那么我们可以抽象出下面的一系列操作，来实现“授予”、“撤除”、“归集”、“检查”四种行为。

```go
// SetBit 打开/关闭某一个 position 上的属性
func SetBit(attr uint64, position int, flag bool) uint64 {
	if position <= 0 {
		return attr
	}
	if flag {
		// set to 1
		return attr | uint64(1)<<(position-1)
	} else {
		// set to 0
		return attr & ^(uint64(1) << (position - 1))
	}
}

// SetBits 批量的打开/关闭多个 positions 上的属性
func SetBits(attr uint64, positions []int, flag bool) uint64 {
	if len(positions) == 0 {
		return attr
	}
	for _, position := range positions {
		if position <= 0 {
			continue
		}
		attr = SetBit(attr, position, flag)
	}
	return attr
}

// GetBit 获取 attr 在 position 上的属性是开启的（1）还是关闭的（0）
func GetBit(attr uint64, position int) int {
	res := (attr >> (position - 1)) & 1
	return int(res)
}

// GetBitFlag 获取 attr 在 position 上的属性是开启的还是关闭的
func GetBitFlag(attr uint64, position int) bool {
	res := GetBit(attr, position)
	return res == 1
}

// Collect 归集一组权限值，得到最终权限值
func Collect(attrs []uint64) (attr uint64) {
	if len(attrs) == 0 {
		return 0
	}
	attr = 0
	for _, v := range attrs {
		attr |= v
	}
	return attr
}
```

## 属性

上面提到，

> 权限的集合应该由一系列原子属性来定义，每一位代表了一个独立的、可以原子化的功能

所以属性可以看成用来定义这些功能是不是可以提供给用户使用的开关。

比如我们可以声明一些这篇文章后文会用到的属性，具体见下表：

| 属性            | 位置 | 描述                         | 适用范围 |
|:--------------|:---|:---------------------------|:-----|
| Administrator | 1  | 允许所有的权限并且绕过权限覆写            | 群、身份 |
| ViewChannel   | 2  | 允许成员查看频道，包括阅读消息和查看语音频道基本信息 | 频道   |
| SendMessage   | 3  | 允许成员发送文本消息                 | 频道   |
| Connect       | 4  | 允许成员连接到频道语音                | 频道   |
| Speak         | 5  | 允许成员说话                     | 频道   |
| BanMembers    | 6  | 允许封禁成员                     | 群、身份 |

这是一个随意声明的属性表单，他不能概括一个业务的全部功能，仅仅只是举例。

表单里给出的位置，代表了这个属性在权限值的二进制序列中，从右到左数的第 x 个位置。

## 实体定义

有了运算方式和属性，接下来我们来围绕权限功能的基础设施，定义一些实体对象。

首先，权限是在一个群体里流转的，我们就需要有描述一个群体的对象，这里我们会定义一个 `Guild` 实体：

```go
type Guild struct {
    Permission string // 基础权限值（Hex 字符串）
    Attr       uint64 // 基础权限值（实值）
}
```

`Guild` 提供了一个群体的基本权限配置，它作用于所有在这个群体里的成员，作为成员的默认权限配置。
在这个实体里，我们定义了字符串类型的 `Permission` 用来做持久化，另外定义了 `Attr` 作为数值运算的参数，`Attr` 是由 `Permission` 经过进制转换得到的无符号数值。
对于一些不支持无符号类型的语言，需要使用数值范围尽可能大的类型去承载。

---

接下来，我们定义一个群体里会存在多个频道，因为不是所有的用户都喜欢聚集在一个很大的地方来交流，所以这个群体里会存在多个附属的频道。
这里我们会定义一个 `Channel` 实体：

```go
type Channel struct {
    GuildID   int64  // 关联到某一群体的ID
    Allow     string // 这个频道默认开启的一些权限（Hex 字符串）
    AllowAttr uint64 // 这个频道默认开启的一些权限（实值）
    Deny      string // 这个频道默认禁止的一些权限（Hex 字符串）
    DenyAttr  uint64 // 这个频道默认禁止的一些权限（实值）
}
```

`Channel` 提供了频道的基本权限配置，由于 `Guild` 定义了基本的权限，在频道这一级别需要定义的就稍微有些不同。
要在频道里声明权限，因为已经有了基本权限，所以需要明确声明在基本权限之上，有哪些权限是开放的，又有哪些权限是需要禁止的。
所以这里我们声明了 `Allow` 和 `Deny` 分别描述要开放的权限和要禁止的权限。同理，我们另外定义包含 `-Attr` 后缀的属性，来作为数值运算的参数。
频道里定义的这些权限，同样是作为成员在频道里的默认权限配置，并且覆写群级别的基本权限。

---

再接下来，我们回到 `Guild`。群组里的成员一定会有一些身份，这些身份可能是区分管理员和普通人，可能是给一些头衔名号，也可能是一些 KickStarter 赞助奖励身份等等。
假如一个身份是用来授予给一些用户管理群组的能力，那么这个身份一定是声明了额外的权限，授权身份组内的成员使用更多的功能。
这里我们会定义一个 `Role` 实体：

```go
type Role struct {
    GuildID    int64  // 关联到某一群体的ID
    Permission string // 基础权限值（Hex 字符串）
    Attr       uint64 // 基础权限值（实值）
}
```

因为身份不会声明禁止成员不能使用哪些功能，并且我们的这套权限功能使用了另外的方式去实现【禁止】的操作，所以 `Role` 实体只需要定义 `Permission` 来声明这个身份被授予了哪些权限。
同样的，我们额外定义了 `Attr` 来做数值运算的参数，后续也不再赘述。

---

此时我们已经可以构建出一个大致的组织架构了
