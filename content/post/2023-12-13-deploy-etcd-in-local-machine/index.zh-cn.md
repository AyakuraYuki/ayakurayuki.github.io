---
title: 本机部署 etcd 的小记
description: 利用 supervisor 配置成服务
date: 2023-12-13 15:44:00
slug: 2023-12-13-deploy-etcd-in-local-machine
image: etcd-hero.png
categories:
    - guide
tags:
    - linux
    - supervisor
    - etcd
---

> 我在 Github Gist 上写了一份在本机环境部署 etcd 单机版的脚本和配置，在这里记录一下使用方式

本机部署 etcd 可以很简单，并且如果是在云环境下可以很方便的在多个云主机部署分布式微服务，也可以很方便的做多节点。

其实我很早以前就用了 Kubernetes，大概是版本 1.14 的时候就在用了，至于为什么这个时候又来记录一下 etcd 这玩意儿，只能说 k8s 还是太重了，有时候可以不需要做那么重的集群。

---

### 事前准备

闲话到此，下面我先给出我这个方案下，本机部署 etcd 所需要的一些环境和工具。

1. 首先需要一个 linux server，当然要是用 macOS 做服务器系统也可以，我的脚本没有针对 macOS 来写
2. 需要安装一个 supervisor，这是一个进程控制系统，简单来理解，它是一个守护程序，用来维护程序的运行状态
3. 可能需要检查系统里有没有 `bash` 和 `curl`，我的脚本是基于 `bash` 去写的，并且没有测试过使用其他 shell 运行的兼容性

就这么多了。

### 大致步骤

准备好环境和工具后，需要准备好如下的两个文件。

> 再次强调，要使用 macOS 做服务器系统，需要更改脚本里的一些路径，特别指出新版 macOS 正常情况下禁止用户写 `/` 目录，所以脚本里的 `/data` 目录必不可能通过正常方式在较新的 macOS 中创建出来。
>
> 我有另一篇文章介绍了两种解决办法，但本文不会针对 macOS 来写。

---

- etcd-server.conf

这个文件是 supervisor 的程序描述配置，提供给 supervisor 去维护程序服务用的，它应该被放置在 `/etc/supervisor/conf.d` 目录里。

> 脚本里有一些针对 etcd 启动时的参数，这些参数不在这里细说，请检查 etcd 官方文档。

```conf
[program:etcd-server]
; 在本机运行 etcd-server
command = /data/server/etcd/bin/etcd --name etcd0 --advertise-client-urls http://0.0.0.0:2379 --listen-client-urls http://0.0.0.0:2379 --initial-advertise-peer-urls http://0.0.0.0:2380 --listen-peer-urls http://0.0.0.0:2380 --initial-cluster-token etcd-cluster-1 --initial-cluster etcd0=http://0.0.0.0:2380 --initial-cluster-state new
directory = /data/server/etcd/bin                   ; 声明 etcd 程序所在目录
user = root                                         ; 声明使用 root 用户运行程序
autostart = true                                    ; 声明在 supervisor 启动时启动 etcd-server 服务
autorestart = true                                  ; 声明遇到异常后自动重启
startsecs = 5                                       ; 声明在服务启动后的 5 秒内没有出现异常，代表服务成功运行
startretries = 50                                   ; 声明服务重启的最大重试次数
stopasgroup = true                                  ; 声明停止服务时，停止子进程，用来防止产生僵尸进程
killasgroup = true                                  ; 声明杀死进程时，停止子进程，用来防止产生僵尸进程
redirect_stderr = false                             ; 声明不要将 stderr 重定向到 stdout
stdout_logfile = /data/log/etcd.log
stdout_logfile_maxbytes = 1024MB
stdout_logfile_backups = 3
stderr_logfile = /data/log/etcd.err
stderr_logfile_maxbytes = 1024MB
stderr_logfile_backups = 3
```

---

- bootstrap.sh

这个文件是首次运行 etcd-server 服务时，用来准备环境和可执行文件的脚本，其中的部分内容参考了 etcd 官方 Github 页面的代码，可能会需要科学上网去访问域名。

```shell
#!/usr/bin/env bash

which supervisorctl > /dev/null 2>&1
if [ $? -eq 1 ]; then
    echo 'please install supervisor first'
    exit 1
fi

ETCD_VER=v3.5.11

GOOGLE_URL=https://storage.googleapis.com/etcd
GITHUB_URL=https://github.com/etcd-io/etcd/releases/download
# choose either URL
DOWNLOAD_URL=${GOOGLE_URL}

mkdir -p /data/server/etcd/bin
mkdir -p /data/log

cd /data/server/etcd || exit

rm -vf /data/server/etcd/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -vrf /data/server/etcd/etcd-download
mkdir -p /data/server/etcd/etcd-download

curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /data/server/etcd/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf /data/server/etcd/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /data/server/etcd/etcd-download --strip-components=1
rm -vf /data/server/etcd/etcd-${ETCD_VER}-linux-amd64.tar.gz

mv /data/server/etcd/etcd-download/etcd /data/server/etcd/bin/etcd
mv /data/server/etcd/etcd-download/etcdctl /data/server/etcd/bin/etcdctl
mv /data/server/etcd/etcd-download/etcdutl /data/server/etcd/bin/etcdutl

# make sure the /etc/supervisor/conf.d/etcd-server.conf file is exist
supervisorctl update

exit 0
```

---

准备好上述文件，其中 `bootstrap.sh` 可以放在任意一个位置，然后执行 `bootstrap.sh`，成功后应该可以利用 `etcdctl` 或 `etcd-manager` 来连接并查看运行信息。
