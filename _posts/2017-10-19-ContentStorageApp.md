---
layout: post
title: Content Storage App
date: 2017-10-19
excerpt: "内容存储管理工具"
project: true
tags: [project, spring boot, webapp]
comments: false
---
# content-storage-app
> 泛用型个人内容存储，采用两步验证来验证用户

[项目地址](https://github.com/AyakuraYuki/content-storage-app)

## 环境 / Environment
* Spring Boot 1.5.7.RELEASE
* MyBatis 3.4.5
* MySQL 5.7.18
* Support SQLite3
* Groovy 2.4.12
* Base on JDK 1.8.0_144

## 特性 / Feature
* 动态JSON内容，每个条目允许存储的条目数量是可变的
* 使用Google Authenticator两步验证，配置简单
* 本机使用，不需联网

## TODO
* I18N
