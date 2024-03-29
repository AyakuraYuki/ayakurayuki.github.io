---
title: CodErator
date: 2017-06-03 12:00:00
slug: 2017-06-03-coderator
categories:
    - project
tags:
    - C#
    - generator
---

# [CodErator](https://github.com/AyakuraYuki/CodErator)

> 轻量级代码生成工具

查询元数据，暴力封装元数据信息，暴力生成源码，能生成就是好工具，反正都要按需求改！

## 环境与依赖

-   项目创建于 Visual Studio 2017

-   .Net Framework 4.5.2

-   WinForm

-   “难用”的要死的[Razor Engine 3.9.3](https://github.com/Antaris/RazorEngine)

-   MySQL Connector.Net 6.9

## 使用目标

### JavaEE

-   SSM 框架代码生成

-   可自由选择需要生成的层面

### CSharp

-   生成 Entity

## 支持功能

-   连接到指定 schema，尚未支持不指定 schema 的连接

-   表字段内容获取

-   列表多选即可选择需要生成的表

-   指定输出位置

## 开发路线

-   项目初始版本属于 XP 模型产物，根据开发过程遇到的问题，可能需要在代码框架、逻辑设计上重新进行分析。

-   初始版本对模板的支持比较严格，不建议用户修改模板文件。然而这不是废话吗？并不，我鼓励各位根据自己的需求或者代码风格去修改模板文件，只要遵守现有的文件名以及 Razor Engine 语法即可。

-   未来考虑对模板支持进行大的修改，做到支持程序猿自己定义的模板。这个修改只要确保程序猿们遵守了 Razor Engine 语法，就可以生成代码，不受模板文件名的影响。

-   上述开发路线说明或许会因为懒癌发作延期，作为开源项目，如果各位愿意的话，倒不是不可以去修改。欢迎 fork，不求 star。

## 现存问题

-   模板文件是定死的，包括文件名（前缀后缀）、文件数量

-   仅支持三层生成（Entity、Dao、Service）

-   C#暂时只支持 Entity，其余两层因为本人没有接触过 ASP.Net MVC 所以不太能下手

-   一些藏得比较深的 bug
