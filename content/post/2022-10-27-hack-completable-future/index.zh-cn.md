---
title: 优雅使用CompletableFuture的正确姿势
description: 一个在 JDK 16 以前还可以用的反射调优 ForkJoinPool 的实现
date: 2022-10-27 11:10:00
slug: 2022-10-27-hack-completable-future
categories:
    - guide
tags:
    - Java
---

> 利用反射优化 `ForkJoinPool` 让 `CompletableFuture` 用起来更舒服

> 注意：自 JDK17 以后，需要强制 `--add-opens` 打开反射，较为繁琐，建议 JDK17 以后自己开一个 `ForkJoinPool` 传入给 `CompletableFuture`，也建议 JDK21 以后直接使用虚拟线程（协程）。

本文开头我不过多讨论 `CompletableFuture` 底层的东西，从入口出发。

以 `java.util.concurrent.CompletableFuture#supplyAsync(java.util.function.Supplier<U>)` 为入口，我们将创建得到一个 `CompletableFuture` 对象。
这个方法的相关代码如下：

```java
/**
 * Returns a new CompletableFuture that is asynchronously completed
 * by a task running in the {@link ForkJoinPool#commonPool()} with
 * the value obtained by calling the given Supplier.
 *
 * @param supplier a function returning the value to be used
 * to complete the returned CompletableFuture
 * @param <U> the function's return type
 * @return the new CompletableFuture
 */
public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier) {
    return asyncSupplyStage(ASYNC_POOL, supplier);
}
```

这个方法的 Javadoc 已经明说了，他会创建一个在 `ForkJoinPool#commonPool()` 中运行的任务。
我们可以自己优化一个线程池，提交给 `CompletableFuture` 拿去创建任务，但我们可以更激进的，去直接优化这个 `commonPool`。

要想优化这个 `commonPool`，我们可以关注一下 `java.util.concurrent.ForkJoinPool#common` 这个对象，这是一个 `ForkJoinPool` 默认创建的通用池，所有通过 `CompletableFuture` 创建的应用，并且没有指定线程池的，都会走到这个默认池。
另外，我们还可以关注 `java.util.concurrent.CompletableFuture#ASYNC_POOL` 这个对象，这是一个由 `CompletableFuture` 自身维护的，一个有条件的线程池，他会按照 `java.util.concurrent.CompletableFuture#USE_COMMON_POOL` 的判断结果，选择使用下面两种的其中一种线程池：

-   `java.util.concurrent.ForkJoinPool#common`
-   `java.util.concurrent.CompletableFuture.ThreadPerTaskExecutor`

目前我们明确了要优化的目标，一共是两个线程池，分别是：

-   从 `java.util.concurrent.ForkJoinPool` 挑出 `common` 对象，用我们自己的 `ForkJoinPool` 覆盖它
-   从 `java.util.concurrent.CompletableFuture` 挑出 `ASYNC_POOL` 对象，用我们自己的 `ForkJoinPool` 覆盖它

我们需要使用反射来把我们自己的 `ForkJoinPool` 塞到对应的类里，下面直接贴代码，后续有时间再来解释怎么设置并发度。

```java
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ForkJoinPool;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ThreadPools {

  /**
   * 默认阻塞系数
   */
  private static final double DEFAULT_BLOCKING_COEFFICIENT = 0.9;

  /**
   * 默认线程池并发度 核数 / (1 - 阻塞系数) * 2
   */
  private static final int DEFAULT_PARALLELISM = (int) (Runtime.getRuntime().availableProcessors() / (1 - DEFAULT_BLOCKING_COEFFICIENT)) * 2;

  public static final ForkJoinPool common;

  static {
    common = newForkJoinPool("Fork-Join-Common-Pool", DEFAULT_PARALLELISM);
    try {
      var forkJoinPoolCommon = ForkJoinPool.class.getDeclaredField("common");
      reflectionSet(forkJoinPoolCommon, common);
      var completableFutureAsyncPool = CompletableFuture.class.getDeclaredField("ASYNC_POOL");
      reflectionSet(completableFutureAsyncPool, common);
      log.info("modify Fork-Join-Common-Pool parallelism: {} success!", DEFAULT_PARALLELISM);
    } catch (NoSuchFieldException | IllegalAccessException e) {
      log.warn("Can not find declared field: common", e);
    }
  }

  private static <T> void reflectionSet(Field field, T t) throws NoSuchFieldException, IllegalAccessException {
    field.setAccessible(true);
    boolean isFinal = Modifier.isFinal(field.getModifiers());
    Field modifiers = field.getClass().getDeclaredField("modifiers");
    if (isFinal) {
      modifiers.setAccessible(true);
      modifiers.setInt(field, field.getModifiers() & ~Modifier.FINAL);
    }
    field.set(null, t);
    if (isFinal) {
      modifiers.setInt(field, field.getModifiers() & ~Modifier.FINAL);
    }
  }

  public static ForkJoinPool newForkJoinPool(String name, int parallelism) {
    return new ForkJoin(parallelism, getForkJoinFactory(name));
  }

  private static ForkJoin.ForkJoinThreadFactory getForkJoinFactory(String name) {
    return new ForkJoin.ForkJoinThreadFactory(name);
  }

}
```

```java
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.ForkJoinWorkerThread;
import java.util.concurrent.atomic.AtomicLong;

class ForkJoin extends ForkJoinPool {

  public ForkJoin(int parallelism, ForkJoinWorkerThreadFactory factory) {
    this(parallelism, factory, null, true);
  }

  public ForkJoin(int parallelism, ForkJoinWorkerThreadFactory factory, Thread.UncaughtExceptionHandler handler, boolean asyncMode) {
    super(parallelism, factory, handler, asyncMode);
  }

  @Override
  public void execute(Runnable command) {
    super.execute(command);
  }

  public static class ForkJoinThreadFactory implements ForkJoinWorkerThreadFactory {

    private final String     name;
    private final AtomicLong count = new AtomicLong();

    public ForkJoinThreadFactory(String name) {
      this.name = name;
    }

    public final ForkJoinWorkerThread newThread(ForkJoinPool pool) {
      return new NamedForkJoinWorkerThread(String.format("%s-%d", name, count.incrementAndGet()), pool);
    }

  }

  public static class NamedForkJoinWorkerThread extends ForkJoinWorkerThread {

    protected NamedForkJoinWorkerThread(String name, ForkJoinPool pool) {
      super(pool);
      super.setName(name);
      super.setContextClassLoader(ClassLoader.getSystemClassLoader());
    }

  }

}
```

---

附赠一个拆箱异步任务拿结果的工具类

```java
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.CollectionUtils;

/**
 * FutureUtil
 *
 * @author kuaiyue
 * @date 2022/4/6 7:40 下午
 */
@Slf4j
public class FutureUtil {

  public static <T> T joinWithEx(CompletableFuture<T> future) {
    try {
      return future.join();
    } catch (Exception e) {
      log.warn("joinWithEx exception!!", e);
      throw new RuntimeException(e);
    }
  }

  public static <T> T joinSafe(CompletableFuture<T> future, T demotionResult, String apiName, Object... args) {
    try {
      return future.join();
    } catch (Exception e) {
      log.warn("future.join exception!! apiName:[{}] args:[{}]", apiName, args, e);
    }
    return demotionResult;
  }

  public static <K, V> CompletableFuture<Map<K, V>> mergeFutures(List<CompletableFuture<Map<K, V>>> futures) {
    if (CollectionUtils.isEmpty(futures)) {
      return CompletableFuture.completedFuture(Collections.emptyMap());
    }
    return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
        .thenApply(v -> futures.stream()
            .map(CompletableFuture::join)
            .filter(Objects::nonNull)
            .map(Map::entrySet)
            .flatMap(Set::stream)
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (k1, k2) -> k2)));
  }

  public static <T> CompletableFuture<List<T>> mergeListFutures(List<CompletableFuture<T>> futures) {
    if (CollectionUtils.isEmpty(futures)) {
      return CompletableFuture.completedFuture(Collections.emptyList());
    }
    return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
        .thenApply(v -> futures.stream()
            .map(CompletableFuture::join)
            .filter(Objects::nonNull)
            .collect(Collectors.toList()));
  }

}
```
