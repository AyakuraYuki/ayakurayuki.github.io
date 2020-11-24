---
layout: post
title: Android项目各文件夹含义说明
date: 2017-09-14
excerpt: "使用Android Studio 2.3版开发的Android项目文件结构说明"
tags: [post, android, guide]
comments: false
---

> AS 版本：Android Studio 2.3.3 <br/>
> 视图：Project <br/>
> 注：本文部分说明可以通过“视图：Android”查看该文件/文件夹影响或相关的部分

初次创建了一个 Basic Activity 例程之后，我们会获得如下图的文件结构

![](/assets/img/postPictures/2017-09-14-ASProjectFolders/1.png)

# /Demo

这个文件夹是整个项目的根目录，包含了项目的主要资源文件，以及构建所需的 Gradle 配置和脚本。

### /gradle

该文件夹主要包含了 gradle wrapper 有关的文件，无须我们关心。

### /.idea & Demo.iml

这两个文件放在一起说，主要是它们和项目完全无关。由于 AS 2.x 之后使用了 JetBrains 的 IDE 系列，所以必然会创建它们，用来让 IDE 识别项目，并自动配置 IDE 相关环境。

### /.gradle

该文件夹是 AS 自动生成的，表示该项目是一个由 gradle 管理和构建的项目，效果与上面的两项相同。

### .gitignore

这是用来存放需要忽略，不提交到 git 版本控制项目中的文件/文件夹的名称。通过这个文件，就可以在 commit/push 到 git 时自动忽略列表中的文件/文件夹。

### build.gradle

这个文件在项目中一共有两个，位于/Demo 下的该文件配置了项目构建相关的配置信息，一般不需要修改。

在本人的项目中，由于我使用了 Groovy 进行 Android 开发，所以我会对本文件进行修改。

### settings.gradle

这个文件在例程 Demo 中，由于我们只有一个/app，所以只会包含一句：

```yaml
include ':app'
```

它的作用是，指定 Project 中所引入的 module。通常该文件由 IDE 自动完成注入，不需要开发者自行填写。

### gradle.properties

Gradle 全局配置，包括代理设置、编译所需 JVM 内存等。一般不建议修改，或使用 IDE 提供的工具进行影响较小的修改。

### local.properties

这个文件不是用来配置本地化默认国家语言编码的，而是用来指定本机 Android SKD 的路径。根据文件注释说明，该文件不能上传到版本控制项目中，以免出现协同开发错误。

### gradlew & gradlew.bat

这两个文件，前者运行于 Unix/Linux 系统，后者运行于 Windows 系统，它们是用于命令行执行 Gradle 脚本的批处理脚本，一般不允许修改。

# /app

主要的开发目录，项目的几乎所有的资源都存放在如下目录中。该文件夹内构成如图

![](/assets/img/postPictures/2017-09-14-ASProjectFolders/2.png)

### /build

该文件夹也是作为构建输出文件夹，但相对于/Demo/build，该文件夹用于存放具体编译构建的资源，其内容更复杂。

### /libs

如果项目使用了第三方依赖包，这些依赖包会被存放到该文件夹中，并由 IDE 自动注入。

### .gitignore

同理，该文件夹管理根目录为/app 的目录下，不提交到 git 的文件/文件夹列表

### app.iml

该文件用于让 AS 识别项目，但不建议直接从此处打开，否则会缺失全局 gradle 配置信息，导致编译构建失败。

### build.gradle

此处的 build.gradle 直接管理项目引入的依赖包、编译器版本等配置信息，比/Demo/build.gradle 更复杂，一般开发不需要修改。

同理，我使用了 Groovy 开发，所以我需要在这个文件夹添加相关的依赖和 compile 信息。

### proguard-rules.pro

进行大型 Java 项目开发的开发者应该都清楚该文件的作用。该文件是由开发者指定代码混淆保护的混淆规则，显式指定忽略哪些包、类，或者混淆哪些包、类。

对代码混淆不熟悉的开发者一般不会修改这个文件。

## /app/src（或称/src）

该文件夹无疑是我们开发的重心，所有的源代码和资源文件都在这个文件夹下。

该文件夹的构成如下图：

![](/assets/img/postPictures/2017-09-14-ASProjectFolders/3.png)

### /androidTest

此处用来编写 Android Test 测试用例，可以对项目进行测试。

### /test

相对的此处则是编写单元测试代码，可以对一些独立模块进行功能性测试。

### /main

该文件夹包含了我们接触最多的开发资源，具体如下

### /java

顾名思义，这个包下面包含了程序主要的逻辑代码（Java 代码），所有的 Java 包/类，都在这个包下面存放。

### /res

全称“resources”，即资源文件。这个文件夹下存放了一个 APK 所需的如 ICON、颜色配置、layout 设计、界面元素等等文件。

该文件夹内的结构比较规范，一般不用担心资源该放在哪里。

#### /drawable

该文件夹用来存放图片

#### /mipmap

该文件夹用来存放 ICON

#### /values

该文件夹用来存放样式、颜色配置

#### /layout

该文件夹存放 application 的布局配置文件

### AndroidManifest.xml

该文件管理了整个 application 的配置，包括定义的组件、application 所需的权限，都在这个文件里定义。

# 核心文件

### AndroidManifest.xml

一个 Android Application 的所有样式配置、activities、使用到的权限，都会被引入到这个文件中，在安装、运行时被调用。这个文件相当于 Android Application 的中枢。

### layout/activity_main.xml

这个文件是整个 Android Application 的基础界面设计配置文件，几乎所有的前台显示的界面的设计配置文件都会由这个文件引用。

### cc.ayakurayuki.demo.MainActivity

> （路径：cc/ayakurayuki/demo/MainActivity.groovy）

这个文件即逻辑代码，创建的 Basic Activity 会生成。它管理了 application 中按钮、菜单等元素交互的逻辑。
