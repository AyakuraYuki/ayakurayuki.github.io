---
title: Content Storage App
date: 2017-10-19 10:00:00
slug: 2017-10-19-content-storage-app
categories:
    - guide
tags:
    - Java
    - Spring
---

> 泛用型个人内容存储，采用两步验证来验证用户
> 
> 注：已经不再维护，玩具项目

## 环境 / Environment

-   Spring Boot `ver 2.0.2.RELEASE`
-   MyBatis `ver 3.4.6`
-   SQLite JDBC `ver 3.23.1`
-   Groovy `ver 2.5.0`
-   JDK 1.8 `ver 1.8.0_181`

## 特性 / Feature

-   JSON 化存储内容
-   使用 Google Authenticator 两步验证
-   单机使用
-   数据加密后持久化
-   DB 文件级唯一的 DES Key

## 使用：用户

如果您是普通用户，建议您从[Release](https://github.com/AyakuraYuki/content-storage-app/releases)下载

Linux/macOS 使用`startup.sh`，Windows 使用`startup.bat`启动

浏览器访问地址：`http://localhost:8888/`

## 使用：开发者

如果您是开发者，并且有兴趣进行客制化开发和生成，您可以根据下面的说明来使用

### clone

```git
git clone https://github.com/AyakuraYuki/content-storage-app.git
```

### 导入

> 推荐使用 IntelliJ IDEA

选择导入 maven 项目即可

### 修改配置文件

将配置文件中的 MySQL 连接信息修改为您的 SQLite 连接信息，可修改属性如下：

```yaml
url: jdbc:sqlite:< _your_db_file_path_ || data/storage.db >
```

### 执行程序

```bash
(java -jar content-storage-app-<version>.jar &)
```

## Special Thanks to

![](/jetbrains/variant-2_logos/jetbrains-variant-2.svg)

-   [JetBrains: Developer Tools for Professionals and Teams](https://www.jetbrains.com/?from=content-storage-app)

### Built by

![](/jetbrains/intellij-idea_logos/logo.svg)
![](/jetbrains/webstorm_logos/logo.svg)
![](/jetbrains/datagrip_logos/logo.svg)
