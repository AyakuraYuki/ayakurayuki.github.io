---
layout: post
title: Bean的生命周期
date: 2017-06-28
excerpt: "记录有关Spring Bean生命周期的过程"
tags: [post, guide]
comments: false
---

## 生命周期过程描述

大致的 Bean 生命周期可以描述为如下过程：

#### 创建

1. 实例化

2. 设置属性值

3. 调用 BeanPostProcessor 的预初始化方法

4. 调用 InitializingBean 的 afterPropertiesSet()方法

5. 调用定制的初始化方法

6. 调用 BeanPostProcessor 的后初始化方法

7. 完成实例化，Bean 可以使用

#### 关闭

8. 调用 DisposableBean 的 destroy()方法

9. 调用定制的销毁方法

## 相关内容

### Bean 实例化和生命周期行为控制

Bean 实例化可以通过构造器、静态工厂、实例工厂三种方式进行实例化。

有三种方式可以控制 Bean 生命周期行为：

-   InitializingBean & DisposableBean

-   init() & destroy()

-   @PostConstruct & @PreDestroy

### BeanPostProcessor

如果我们需要在 Spring 容器完成 Bean 的实例化、配置和其他的初始化前后添加一些自己的逻辑处理，我们就可以定义一个或者多个 BeanPostProcessor 接口的实现，然后注册到容器中。

在 BeanPostProcessor 中，我们可以通过实现

-   public Object postProcessAfterInitialization(Object bean, String arg) throws BeansException

和

-   public Object postProcessBeforeInitialization(Object bean, String arg1) throws BeansException

来执行 Bean 创建前后的动作
