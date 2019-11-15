---
layout: post
title: 简记修复Git提交时GPG签名失败的问题
date: 2019-11-15
excerpt: "管管你的GPG"
tags: [post, guide]
comments: false
---

> 一直以来都很正常的GPG签名，唐突暴毙了？？？

最近在IDEA提交代码的时候，因为GPG签名失败的问题，一直没有提交成功。

起初是直接走的IDEA的VCS提交，一开始还觉得是没有触发输入证书密码的界面导致的，但回想了一下之前都可以提交，那应该跟证书密码没什么关系才对。

于是我尝试去终端走命令的方式提交了下，老样子还是失败了。。。

```bash
error: gpg failed to sign the data
fatal: failed to write commit object
```

上stack overflow搜搜问题，偶然发现有一条答案挺有用的，先贴原文地址

[Git error - gpg failed to sign data](https://stackoverflow.com/questions/41052538/git-error-gpg-failed-to-sign-data)

具体步骤嘛，首先检查Git全局配置的签名程序配置对了没，正确的配置应该是`gpg.program=gpg2`

那么我本机的话，gpg2是定位到了`/usr/local/bin/gpg2`，可以直接跑下面的命令修复配置

```bash
git config --global gpg.program /usr/local/bin/gpg2
```

接着用下面的命令检查GPG签名时是不是正常工作的

```bash
echo "test" | gpg2 --clearsign
```

顺带一提如果没有输入证书密码的界面，或许需要安装`pinentry`，以macOS举例，可以用`brew install pinentry`装一下就完事了

之后再尝试`git commit`，没报错的话就到此为止了，问题定位在没有正确配置签名程序（以及有可能是缺少`pinentry`）

尝试提交还是失败的话，这时候就要把一个叫`gpg-agent`的家伙干掉了

```bash
gpgconf --kill gpg-agent
```

一般到此为止，重新提交就可以正常签名。要是缺少`gpgconf`或者`--kill`选项丢失，重新装一下`gnupg`或许是个好选择。

那么这里我顺带吐槽一下，国内各个博客，不是教你怎么关闭提交签名，就是让你检查提交时的`user.name`和`user.email`，其实那些都不是主要问题，别人就是要用GPG对提交签名，你们却教别人关闭签名，意义何在？
