---
title: 为什么说 macOS 无权创建 /data 目录？
date: 2023-12-13 16:07:00
categories:
    - guide
tags:
    - macOS
    - Catalina
mp3:
cover:
---

自从 macOS Catalina 版本开始，苹果就开始收缩用户操作文件夹的权限了，但仍然可以按照下面介绍的两种办法来扩展用户权限：

1. 修改 SIP 权限（不安全）
    1. 打开终端，输入 `csrutil status`，显示 `enabled` 表示启用了 SIP，接下来需要禁用 SIP；
    2. 重启 mac，按住 `Command (⌘)-R`，进入恢复模式；
    3. 点击屏幕左上角实用工具第三栏：终端，打开终端，输入 `csrutil disable`，重启；
    4. 重启后会发现仍然不能新建文件，会提示 `Read-only file system`，此时需要重新挂载一下根目录 `sudo mount -uw /`，重新挂载后即可新建文件夹了，但此次挂载会在电脑重启后失效，即重启后又重新恢复为 `Read-only file system`；
2. 建立一个映射路径
    1. 输入命令 `sudo vim /etc/synthetic.conf`，新建一个配置文件；
    2. 进入到这个文件后，进入 Vim 编辑模式，输入如下内容：`export /Users/xxx/Documents/export`（举例），前者为需要映射的路径名称，后者为映射后的路径名称（真实的文件路径）
        - 需要注意的是，两者之间用 tab 隔开，而不是空格。
    3. 给真实路径赋权限
        ```text
         cd /Users/xxx/Documents/
         sudo mkdir export  # 没有则新建目录
         sudo chmod -R 777 export
        ```
    4. 重启电脑，实现功能
