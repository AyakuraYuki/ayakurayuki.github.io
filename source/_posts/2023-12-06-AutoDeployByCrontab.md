---
title: 记录一个配合 Crontab 实现自动部署的脚本
date: 2023-12-06 17:50:00
categories:
    - guide
tags:
    - Linux
    - Crontab
mp3:
cover:
---

记录一个配合 Linux Crontab 实现的自动定时部署脚本

## Crontab 部分

首先简单说一下 Crontab 的 `cron` 表达式，Crontab 的 `cron` 表达式与通常我们在 Java、Golang 里写过的 6 位表达式不同，它是一个只支持到【分钟】单位的表达式，所以只有 5 位。

对于需要指定间隔的表达式，还需要把时间范围显式地给表达出来。

这里推荐一个 [crontab guru](https://crontab.guru/) 网站可以快速检查 Crontab 表达式，这个网站会指出不符合标准的表达式。

![crontab guru website](/static/images/2023-12-06-AutoDeployByCrontab/crontab-guru-image.png)

这里给出一个例子：

```txt
# Edit this file to introduce tasks to be run by cron.
# 
# Each task to run has to be defined through a single line
# indicating with different fields when the task will be run
# and what command to run for the task
# 
# To define the time you can provide concrete values for
# minute (m), hour (h), day of month (dom), month (mon),
# and day of week (dow) or use '*' in these fields (for 'any').
# 
# Notice that tasks will be started based on the cron's system
# daemon's notion of time and timezones.
# 
# Output of the crontab jobs (including errors) is sent through
# email to the user the crontab file belongs to (unless redirected).
# 
# For example, you can run a backup of all your user accounts
# at 5 a.m every week with:
# 0 5 * * 1 tar -zcf /var/backups/home.tgz /home/
# 
# For more information see the manual pages of crontab(5) and cron(8)
# 
# m h  dom mon dow   command

# 每间隔 5 分钟，定时执行脚本 /data/shell/cleanup-docker-images.sh
0-59/5 * * * * /data/shell/cleanup-docker-images.sh

```

可以看到，这里我定义了一个每间隔 5 分钟清理一次 docker 镜像的任务，它每隔 5 分钟就会执行一次脚本 `/data/shell/cleanup-docker-images.sh`。

当然，这里也可以不使用脚本，在 `cron` 表达式后面可以接一些简单的脚本命令，例如 `echo "2233"`。

## 命令部分

本文说的是一个自动部署，那么下面直接给出一个用来做自动部署的脚本。

假设这是一个网页，它使用了 yarn 来作为依赖管理工具，使用 Nuxt 来构建网页。

```shell
#!/usr/bin/env bash

cd /path/to/git-repo || exit

# 检查 git 仓库更新
git stash
git checkout deploy_branch
old_version=$(git rev-parse HEAD)
echo "old version: $old_version"
### 刷新分支和更新信息
git fetch --prune origin
### 拉取变更
git pull
new_version=$(git rev-parse HEAD)
echo "new version: $new_version"
if [ "$old_version" = "$new_version" ]; then
    ### 没有更新，退出脚本
    echo "不需要更新"
    exit 0
fi

cd /path/to/git-repo || exit
yarn
yarn nuxt cleanup
### 下面这句命令配置在 package.json 中，等效于 `yarn nuxt generate`
yarn generate

cd /path/to/git-repo || exit
### 备份旧资源
cp -a /var/www/website /var/www/website-backup
### 拷贝新资源
cp -a /path/to/git-repo/dist/* /var/www/website

### 可选：重载 nginx
nginx -s reload

```
