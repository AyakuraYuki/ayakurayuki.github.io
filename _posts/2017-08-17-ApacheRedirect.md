---
layout: post
title: 小记Apache端口转发——万网解析初步
date: 2017-08-17
excerpt: "记录自己对万网解析和Apache端口转发的理解"
tags: [post, guide]
comments: false
---
> 最近几天在做部署平台测试，第一次从域名到ECS到解析，这么一走流程，倒是了解了些许有关解析配置的事情。

## 域名配置浅记

阿里云的域名解析，主要使用的是A记录、CNAME两种，前者直接解析到IP地址，后者则可以使域名直接解析到另一个域名（关于解析到另一个域名的授权方面的合法性在这里暂且不提）。

值得注意的是，A记录一般情况下不携带端口号，而是从@记录或www记录的地址，访问时携带端口号进行对应端口访问。

## 端口转发

万网域名解析配置由于不建议携带端口号配置A记录，可以视为所有二级域名配置均被指向同一个IP的80端口。对于这样的应用情况，我们可以配置Apache的VirtualHost来将指定的二级域名地址从80端转发到本地其他端口上的服务器。

在我的应用环境中，包含如下两个配置：

* 8080端Tomcat应用服务器

* 8180端Apache图片服务器

### 前期工作

首先需要配置的是Apache的端口监听，以Apache2.4为例，需要找到httpd.conf的如下位置

```yaml
#
# Listen: Allows you to bind Apache to specific IP addresses and/or
# ports, instead of the default. See also the <VirtualHost>
# directive.
#
# Change this to Listen on specific IP addresses as shown below to 
# prevent Apache from glomming onto all bound IP addresses.
#
#Listen 12.34.56.78:80
```

并在此后添加：

```yaml
Listen 80
Listen 8180
```

为了打开端口转发，我们需要找到配置文件中的如下两行，取消它们的注释：

```yaml
#LoadModule proxy_module modules/mod_proxy.so

#LoadModule proxy_http_module modules/mod_proxy_http.so
```

如果Apache处于运行状态，重新启动Apache服务器即可使新配置生效。

### 配置虚拟服务器转发前的准备

在配置虚拟服务器之前，我们需要关注几个指令

#### ServerName

ServerName是一个比较关键的指令，它指定了每个<VirtualHost>对应的主域名或二级域名，该指令的值需要与万网解析配置的A记录完全一致，否则会出现Apache无法获取访问请求的问题。

#### ProxyPass 与 ProxyPassReverse

```yaml
# 语法
ProxyPass [path] !|url
ProxyPassMatch [regex] url
```

ProxyPass：它主要是用作URL前缀匹配，配置的path是一个虚拟的路径，在反向代理到后端的url后，path是不会带过去的。该指令可以设置某些path不被转发。

ProxyPassMatch：它一般和ProxyPass配合使用，该指令使Apache调整HTTP重定向应答中Location、Content-Location、URI头里的URL，这样可以避免在Apache作为反向代理使用时，后端服务器的HTTP重定向造成的绕过反向代理的问题。

#### DocumentRoot

该指令配置了访问本地的根路径

#### Directory

```yaml
# 语法
<Directory path>
[options]
</Directory>
```

这是一个XML标签形式的指令，紧跟DocumentRoot，配置该本地路径相关的访问选项，其中可以包含：

* Options
* AllowOverride
* Order
* Allow 
* Deny

具体则不在本文详细解释。

### 配置转发

这里就直接把相关的配置放在下面了

#### 将Apache本身配置为图片服务器的场景

```yaml
# Apache物理服务器配置的DocumentRoot与Directory指令
DocumentRoot [Your image path]
<Directory [same as DocumentRoot]>
    Options FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>

# Tomcat
<VirtualHost *.80>
ServerName www.yourdomain.com
ProxyPass / http://yourdomain.com:8080/
ProxyPassReverse / http://yourdomain.com:8080/
</VirtualHost>

# Picture Server
<VirtualHost *.80>
ServerName pic.yourdomain.com
ProxyPass / http://yourdomain.com:8180/
ProxyPassReverse / http://yourdomain.com:8180/
</VirtualHost>
```

#### 另一种配置，Apache本身不作为图片服务器，尚待查证

```yaml
# Tomcat
<VirtualHost *.80>
ServerName www.yourdomain.com
ProxyPass / http://yourdomain.com:8080/
ProxyPassReverse / http://yourdomain.com:8080/
</VirtualHost>

# Picture Server
<VirtualHost *.80>
ServerName pic.yourdomain.com
ProxyPass / http://yourdomain.com:8180/
ProxyPassReverse / http://yourdomain.com:8180/
</VirtualHost>

<VirtualHost *.8180>
ServerName yourdomain.com
DocumentRoot [Your image path]
<Directory [same as DocumentRoot]>
    Options FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>
</VirtualHost>
```
