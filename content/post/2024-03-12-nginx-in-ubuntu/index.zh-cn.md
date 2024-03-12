+++
title = 'nginx in Ubuntu'
description = '在 Ubuntu 上安装 nginx 的笔记'
date = 2024-03-12T16:01:00+08:00
slug = '2024-03-12-nginx-in-ubuntu'
categories = ['guide']
tags = ['linux', 'network']
+++

> 本文内容撰文于 2024-03-12，部分内容会随着日期更新，相关内容请前往指定网站获取最新对照内容。如需对照，会有引言标注网站。

## 利用 apk 依赖管理工具

Ubuntu 默认的 apk repo 提供的 nginx 是旧的 stable 版本，大多数 Ubuntu apk repo 提供的都是 1.18 版本的 nginx，所以要想用 apk 安装最新的 nginx 需要对 repo 做一些修改。

### 事前准备

1. 访问 [nginx: Linux packages](https://nginx.org/en/linux_packages.html) 并找到 Installation instructions > Ubuntu

2. 截至撰文日，该页面提供的 Ubuntu 版本别名和支持平台如下：

   ```text
   Version        Supported Platforms
   20.04 "focal"  x86_64, aarch64/arm64, s390x
   22.04 "jammy"  x86_64, aarch64/arm64, s390x
   23.10 "mantic" x86_64, aarch64/arm64
   ```

   > 要获取更新的版本信息，请前往 [nginx: Linux packages](https://nginx.org/en/linux_packages.html)

3. 安装前置软件

   ```shell
   sudo apt install -y curl gnupg2 ca-certificates lsb-release ubuntu-keyring
   ```

### 添加新仓库

- 导入官方的签名信息，以便 apt 可以验证包的真实性

  ```shell
  curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
      | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null
  ```

- 验证下载的文件是否包含正确的密钥

  ```shell
  gpg --dry-run --quiet --no-keyring --import --import-options import-show /usr/share/keyrings/nginx-archive-keyring.gpg
  ```

  正确的输出应该包含完整的指纹 `573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62` 并有如下的输出：

  ```text
  pub   rsa2048 2011-08-19 [SC] [expires: 2024-06-14]
        573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62
  uid                      nginx signing key <signing-key@nginx.com>
  ```

  如果指纹不正确，请删除 `/usr/share/keyrings/nginx-archive-keyring.gpg` 文件并重新下载。

  > 上面的内容截至撰文日，如需获取新的对照信息请前往 [nginx: Linux packages (#Ubuntu)](https://nginx.org/en/linux_packages.html#Ubuntu)

- 设置 apt repository

  - 如要安装最新稳定版的 nginx 则执行下面的命令：

    ```shell
    echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
    http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
        | sudo tee /etc/apt/sources.list.d/nginx.list
    ```

  - 如要安装最新主线版本的 nginx 则执行下面的命令：

    ```shell
    echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
    http://nginx.org/packages/mainline/ubuntu `lsb_release -cs` nginx" \
        | sudo tee /etc/apt/sources.list.d/nginx.list
    ```

- 设置版本库钉选，使刚添加的软件包优先于发行版提供的软件包

  ```shell
  echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
      | sudo tee /etc/apt/preferences.d/99nginx
  ```

### 安装 nginx

完成上述配置后，执行下面的命令即可

```shell
sudo apt update
sudo apt install -y nginx
```

完成安装后，nginx 自动会使用下面的路径：

- 可执行文件：`/usr/sbin/nginx`
- 配置路径：`/etc/nginx`
- 静态页面：`/usr/share/nginx/html`
- 日志目录：`/var/log/nginx`

## 手动编译安装

手动编译安装可以更好的自定义 nginx，包括安装位置、模块等等，所以如果 apt 满足不了需求的时候，可以考虑从源代码编译。

手动编译有三个前置组件，分别是 `pcre2`，`zlib` 以及 `openssl`，这三个组件都建议使用自己构建的版本，而 `openssl` 也允许使用系统自己的版本，但建议更新到最新的稳定版。

截至撰文日，本文将使用下面的软件清单来介绍安装步骤：

- nginx: 1.25.4
- pcre2: 10.43
- zlib: 1.3.1
- openssl: 3.2.1

另外，本文将手动安装 nginx 到 `/data/server/nginx` 目录下，相关的路径为：

- 可执行文件：`/data/server/nginx/sbin/nginx`
- 配置路径：`/data/server/nginx/conf`
- 日志目录：`/data/server/nginx/logs`
- 默认静态页面目录：`/data/server/nginx/html`
- 其他网站静态页面：`/var/www`（需另外创建）

### 准备目录

```shell
mkdir -p "/data/server"
mkdir -p "/var/www"
```

### pcre2

```shell
cd "/data/server"
wget "https://github.com/PCRE2Project/pcre2/releases/download/pcre2-10.43/pcre2-10.43.tar.gz"
tar zxf "pcre2-10.43.tar.gz"
# 目录：/data/server/pcre2-10.43
```

### zlib

```shell
cd "/data/server"
wget "https://zlib.net/zlib-1.3.1.tar.gz"
tar zxf "zlib-1.3.1.tar.gz"
# 目录：/data/server/zlib-1.3.1
```

### openssl

```shell
cd "/data/server"
wget "https://www.openssl.org/source/openssl-3.2.1.tar.gz"
tar zxf "openssl-3.2.1.tar.gz"
# 目录：/data/server/openssl-3.2.1
```

### 正式构建 nginx

```shell
nginx_version=1.25.4
cd "/data/server"
wget "https://nginx.org/download/nginx-${nginx_version}.tar.gz"
tar zxf "nginx-${nginx_version}.tar.gz"
mv "nginx-${nginx_version}" "nginx"
cd "nginx"
# 配置编译参数，指定前缀目录，手动设置 pcre、zlib、openssl 的路径，module 部分可以按需添加参数，比如 --with-http_v3_module 在比较新的版本可以开启 HTTP/3 的支持
./configure --prefix="/data/server/nginx" \
    --with-pcre="/data/server/pcre2-10.43" \
    --with-zlib="/data/server/zlib-1.3.1" \
    --with-openssl="/data/server/openssl-3.2.1" \
    --with-http_stub_status_module \
    --with-stream \
    --with-http_ssl_module \
    --with-http_v2_module
make
```

### 设为 systemd 服务

创建 `/lib/systemd/system/nginx.service` 文件并填入下面的内容

```text
[Unit]
Description=The NGINX HTTP and reverse proxy server
After=syslog.target network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/data/server/nginx/pid/nginx.pid
ExecStartPre=/data/server/nginx/sbin/nginx -t
ExecStart=/data/server/nginx/sbin/nginx
ExecStop=/data/server/nginx/sbin/nginx -s stop
ExecReload=/data/server/nginx/sbin/nginx -s reload
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

然后运行下面的命令添加服务

```shell
sudo systemctl daemon-reload
sudo systemctl start nginx.service
```

用下面的命令可以检查服务状态

```shell
sudo systemctl status nginx.service
```
