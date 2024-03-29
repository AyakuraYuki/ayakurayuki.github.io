---
title: 粗分析 Discord Bot OAuth 认证过程
date: 2021-03-03 10:00:00
slug: 2021-03-03-analysis-of-discord-bot-oauth
categories:
    - guide
tags:
    - discord
image: cover-discord-bot.png
---

> 稍微记录一下我对 V8 版本的 Discord Bot 授权认证的流程的理解

## 引

最近因为我需要设计一个开放 API 系统（虽然我可不保证能达到`系统`这个高度），我重新回顾了一下以前做`Discord Bots`的事情，也稍微花了点时间啃了[Discord Dev Doc - OAuth - Bots](https://discord.com/developers/docs/topics/oauth2#bots)章节，
所以为了避免以后还要重新回去想一遍流程之类的细节，我想把我对整个 Bot 认证授权的理解粗略记录下来。

## 关于 Discord Bot

`Discord Bots`（下简称`Bot`或`Bots（复数形式）`）是个比较巧妙的东西，透过 RESTFul API 和 Gateway，Discord 开放了几乎所有能对外使用的功能，这在 Discord 这个平台中给了开发者很大的发展空间。

> We support the authorization code grant, the implicit grant, client credentials, and some modified special-for-Discord flows for Bots and Webhooks

Discord 开发团队为`Bots`设计的 OAuth 是一种定制化的 OAuth，有别于一般的客户端授权模式，它让 Bots 的接入变得十分简单。

一个可用的`Bot`其本质，是一个由开发者创建的`Application`（下简称`APP`）下属的一个特殊的用户，在 Discord 中，这样的用户被称为`Bot user`。

在创建`APP`时，Discord 会为`APP`分配在一般的`OAuth`所需的诸如`ClientID`、`ClientSecret`等参数，并且创建一个属于这个应用的`Bot user`，分配一个专有的`Token`，可以理解`Token`是`Bot user`用来登录的密码。

## `Bots`是怎么运作的？

当你创建了一个应用后，你还不能拿着 Discord 下发给你的东西直接去快乐调接口（或者说你可以去调用一些 API，但拿不到什么有用的数据），因为这个时候你手上的`APP`还仅仅只是一个空壳，甚至`Bot`没有进入过一个伺服器，也没有加过一个好友（别忘了，在 Discord 里`Bot`连加好友的能力都没有）。

在[Bot Authorization Flow](https://discord.com/developers/docs/topics/oauth2#bot-authorization-flow)章节中，文档告诉了你授权`Bot`进入伺服器的流程。

`https://discord.com/api/oauth2/authorize?client_id=157730590492196864&scope=bot&permissions=1`

| name                 | description                                                            |
| :------------------- | :--------------------------------------------------------------------- |
| client_id            | your app's client id                                                   |
| scope                | needs to include `bot` for the bot flow                                |
| permissions          | the permissions you're requesting                                      |
| guild_id             | pre-fills the dropdown picker with a guild for the user                |
| disable_guild_select | `true` or `false` —disallows the user from changing the guild dropdown |

这个链接会把你带到一个 Discord 官方提供的授权页面，在这个页面里，按我的理解，Discord 做了如下几件事情：

1. 验证用户登录状态
2. 用户选择需要加入的自己持有的伺服器
3. 等待用户通过授权

从上面的流程上来看，一个`Bot`的授权，实际上是一个加入伺服器的申请，需要伺服器所有者通过`Bot`的加入申请（有可能是管理员？我在我加入过的所有伺服器都没有管理员的身份，所以管理员可否授权我就无从得知了）。

所以明面上来看，`Bot`的授权流程其实还蛮简单的，把应用 ID 或者一个拼好的链接发送给伺服器所有者，然后等待对方通过授权（通过加入伺服器申请），之后这个`Bot`就可以在伺服器里快乐玩耍了。

## 后续

后续的工作，以我通常会用的`Discord.py`举例，只要把一些需要交给`Bot`去做的事情、指令等等，写好代码定义好，再把 Discord 下发的`Token`放到代码里跑起来，似乎就完成了一个简单的`APP`了。

## 关键点

到这里，该说的东西也不剩多少了。

`Bots`依赖`Application`，是`APP`下属的一个特殊用户，这个用户有一个全局唯一的`Token`，这个`Token`一方面用来辨别`Bot user`，一方面用来申请`Bot`用的`access_token`来调用开放的 API。

`Bot`能正常工作，通常需要让伺服器所有者通过授权，也就是通过加入申请，让`Bot user`加入到伺服器中。

大概就点到这里为止。
