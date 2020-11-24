---
layout: post
title: Million Live Event Ranking Viewer
date: 2017-05-14
excerpt: "卡牌游戏偶像大师百万现场活动排名查看器，简单查看各个分数线的分数。"
project: true
tags: [project, imas, swing, html analyze]
comments: false
---

# Million Live Event Ranking Viewer

这是一个用于查看 Million Live 活动排名的小工具，可以方便查看各分数线的分数。

## 开发工具及项目环境

1.Intellij Idea

2.使用 Maven 构建项目

3.JavaSE 1.8

## 使用技术

1.Httpclient ——Ver4.5.2

2.Jsoup ——Ver1.10.2

3.log4j ——Ver1.2.17

## 使用说明

配置文件里可以设置当前活动的活动编号，这个编号可以从 URL 中提取，例如当期「夢の国！？ショコラティエの大冒険」的编号是 348。

## 参与测试？

可以在[这里](https://github.com/AyakuraYuki/IMAS-ML-event-ranking-list/releases)下载最新版，包括测试版本和发布版。

## 已知问题

-   需要配合使用 Chrome 调试、Firebug、Fiddler 等软件抓取请求头，获得 Cookie 之后设置配置文件 config.properties

-   异常错误转储为日志尚未完成

-   Cookie 失效的情况，刷新排名之后界面不刷新任何数据，也不会有异常错误提示

-   由于是单线程加 Swing 编程，点击刷新按钮后界面会卡住“假死”，但不是真正的程序崩溃，也由此导致获取的数据会有相对较大的延迟。

根据上述问题，该软件可能需要重写，所以暂时就没什么更新了。

## 关于 config.properties 的说明：

-   第 1-10 行属于 HTTP 请求配置，这个配置暂时需要用户自行提取请求头内容。推荐的获取方式是使用 Chrome 的 F12 调试界面，选择 Network，然后重新载入 mypage 页面，获取 mypage 的 Request Header 中的 User-Agent 和 Cookie，将这两项复制到 config.properties 对应的两项中即可。需要注意的是，Cookie 需要复制的内容是从"PHPSESSID"开始到"utmcsr="的"u"前面的"."，中间的这一段。

-   第 12 行是活动编号，活动的「ランキング」页面的 URL 中，“event/”后面的数字即是活动编号

-   第 13-15 行是软件表格的背景色设置，分别代表 R、G、B 颜色数值
