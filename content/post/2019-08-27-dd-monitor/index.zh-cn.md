---
title: DD Monitor
date: 2019-08-27 10:00:00
slug: 2019-08-27-dd-monitor
categories:
    - project
tags:
    - python
---

# dd_monitor

> 誰でも大好き

> [Github Repo here](https://github.com/AyakuraYuki/dd_monitor)

DD monitor, which means a monitor for DDs (DD means `誰でも大好き`), can let you watch multiple YouTube streams (if the stream is enabled to be embedded outside YouTube) in one screen at the same time.

In the beginning, I was planning to see the multi-view of Hololive's Project Winter collab streams, but it is very difficult to allocate space for browsers. So I decide to build this program to make things easier.

When I noticed that hey if I can use YouTube embed link, I can watch not only the Project Winter streams but also every stream which supports to play outside YouTube.

So this is it, a simple but functionally DD monitor.

DD 监视器，你要来当监视房里的老大爷吗？这个工具可以让你同时观看多个（允许在 YouTube 外部播放的）油管直播。

一开始的时候我打算看当时 Hololive 的 Project Winter 联动直播，但是一起 8 个视角，给浏览器分配空间太难了。所以我决定搞一个工具来把事情变得容易解决。

然而当我注意到，当我使用油管的外部嵌入链接时，我不但可以用来看 Project Winter 联动直播，还可以看任何支持在油管外播放的直播。

所以，这就是一个简单但很好用的 DD 监视器。

## Environment

-   Python 3.7.4
-   Flask 1.1.1
-   sqlite3
-   Vue 3
