---
layout: post
title: Spring Boot学习之初次见面
date: 2017-05-15
excerpt: "Spring Boot是一个全新的框架，其设计理念抛弃了大量的Spring和ApplicationContext配置文件，做到了零配置文件完成后台支持。"
tags: [post, spring boot, guide]
comments: false
---

> Spring Boot 是一个全新的框架，其设计理念抛弃了大量的 Spring 和 ApplicationContext 配置文件，做到了零配置文件完成后台支持。

Spring Boot 是由 Pivotal Software 开发的一款全新框架，隶属于 Spring 项目系列之下。根据 Spring.io 上的说明，利用 Spring Boot，开发者可以快速开发独立的，工业级的，即刻运行的应用程序，并且开发者可以根据自己的需要，快速添加其他的框架。

我使用的平台如下：

-   Java SE，JDK1.8.0_121

-   IntelliJ IDEA 2017.01

-   Maven 3.3.9

首先是创建一个项目，新版 IDEA 已经提供了 Spring Initializr，可以方便开发者快速生成自己的 Spring Boot 空白项目，项目基于 Maven 提供依赖包支持。

![pic-01](/assets/img/postPictures/2017-05-15-HelloSpringBoot/pic-01.png)

![pic-02](/assets/img/postPictures/2017-05-15-HelloSpringBoot/pic-02.png)

![pic-03](/assets/img/postPictures/2017-05-15-HelloSpringBoot/pic-03.png)

接下来会进入的一个页面是选择所需要的其他依赖包，在这里可以根据项目的需求和将来需要扩展的功能来进行选择。因为是用来开发 Webapp，以及考虑到后续要使用到 MyBatis 进行持久化操作，在这里我选择了 Web 核心、MySQL 数据库连接驱动和 MyBatis。

![pic-04](/assets/img/postPictures/2017-05-15-HelloSpringBoot/pic-04.png)

项目建好之后的文件结构如下

![pic-05](/assets/img/postPictures/2017-05-15-HelloSpringBoot/pic-05.png)

下一篇将会讲到一些的配置的解释
