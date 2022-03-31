---
title: 在新版的macOS上切换不同版本的JDK
date: 2018-05-31 10:00:00
categories:
    - guide
tags:
    - macOS
    - Java
    - JDK
mp3:
cover:
---

> 新版macOS的JDK切换似乎有些，不那么直接？这就仁者见仁了。

## 引

为了开发（或者说玩耍）的需要，我们或多或少都会在本机上安装多个版本的 JDK。在 Windows 上，我们可以很自然的，通过定义`JAVA_HOME`的路径，来修改我们要使用的 JDK 版本。在 Linux 系统中，我们也可以通过直接定义 JDK 的路径，去配置要使用的 JDK 版本。

对于 Windows 和 Linux 开发者来说，修改 JDK 使用的版本可以说是非常舒适了，简单配置一下路径，就能实现目标。然而反观 macOS，它在 JDK 版本切换上，有些人会说它方便，有些人则会说它恼人，从 macOS 10.5+版本开始，Apple 为 macOS 加的一个新东西，可以说是让那些习惯了配置路径修改 JDK 版本的开发者感到很不习惯。

## 背景

让我们先来看看来自`Apple Developer - Guides and Sample Code`中[Technical Q&A QA1170 Important Java Directories on Mac OS X](https://developer.apple.com/library/content/qa/qa1170/_index.html)的文档说明。

---

#### Java Home

Many Java applications need to know the location of a `$JAVA_HOME` directory. The `$JAVA_HOME` on Mac OS X should be found using the `/usr/libexec/java_home` command line tool on Mac OS X 10.5 or later. On older Mac OS X versions where the tool does not exist, use the fixed path "`/Library/Java/Home`". The `/usr/libexec/java_home` tool dynamically finds the top Java version specified in Java Preferences for the current user. This path allows access to the `bin` subdirectory where command line tools such as `java`, `javac`, etc. exist as on other platforms. The tool `/usr/libexec/java_home` allows you to specify a particular CPU architecture and Java platform version when locating a `$JAVA_HOME`.

Another advantage of dynamically finding this path, as opposed to hardcoding the fixed endpoint, is that it is updated when a new version of Java is downloaded via Software Update or installed with a newer version of Mac OS X. For this reason, it is important that developers do not install files in the JDKs inside of `/System`, since the changes will be lost with subsequent updates by newer versions of Java.

To obtain the path to the currently executing `$JAVA_HOME`, use the `java.home` System property.

---

可以看到，在使用 macOS 10.5 或更新版本的系统时，Apple 已经推荐开发者使用`/usr/libexec/java_home`去设置 JDK 的版本了，并且由于`java_home`会动态查找到最新的 JDK 版本，并且支持通过发行版通称，即 JDK1.7、JDK1.8、JDK11 等来获取路径，所以很适合用来切换不同版本的 JDK。

让我们再来看一下接下来会用到的脚本。我们可以利用如`/usr/libexec/java_home -v 1.8`来查找当前本机存在的 Java 1.8 版本路径，在 Terminal 中执行该脚本会得到以下的返回值：

```bash
*****-Pro:~ *****$ /usr/libexec/java_home -v 1.8
/Library/Java/JavaVirtualMachines/jdk1.8.0_161.jdk/Contents/Home
```

而输入参数为`-v 10`时，则会有下面的返回：

```bash
*****-Pro:~ *****$ /usr/libexec/java_home -v 10
/Library/Java/JavaVirtualMachines/jdk-10.0.1.jdk/Contents/Home
```

## 怎么做

根据官方文档的说明，在新版本 macOS 中，我们只需要将以往的

`export JAVA_HOME=<JAVA_HOME_PATH>`

改写成形如

`export JAVA_<MAIN_VERSION>_HOME=$(/usr/libexec/lava_home -v<MAIN_VERSION_NUMBER>)`

即可完成对某个版本的配置，最后再以下面的配置完成 JDK 版本选择：

`export JAVA_HOME=${JAVA_<MAIN_VERSION>_HOME}`

而为了快速切换版本，我们可以使用 alias 来绑定别名执行相应的`export`操作。完整的脚本配置如下脚本所示：

```bash
# .bash_profile

# Java
export JAVA_8_HOME=$(/usr/libexec/java_home -v1.8)
export JAVA_X_HOME=$(/usr/libexec/java_home -v10)
alias jdk8='export JAVA_HOME=${JAVA_8_HOME}'
alias jdkX='export JAVA_HOME=${JAVA_X_HOME}'
export JAVA_HOME=${JAVA_8_HOME}
```

执行结果直接上 Bash 输出吧

```shell
*****-Pro:~ *****$ java -version
java version "1.8.0_161"
Java(TM) SE Runtime Environment (build 1.8.0_161-b12)
Java HotSpot(TM) 64-Bit Server VM (build 25.161-b12, mixed mode)
*****-Pro:~ *****$ jdkX
*****-Pro:~ *****$ java -version
java version "10.0.1" 2018-04-17
Java(TM) SE Runtime Environment 18.3 (build 10.0.1+10)
Java HotSpot(TM) 64-Bit Server VM 18.3 (build 10.0.1+10, mixed mode)
*****-Pro:~ *****$ jdk8
*****-Pro:~ *****$ java -version
java version "1.8.0_161"
Java(TM) SE Runtime Environment (build 1.8.0_161-b12)
Java HotSpot(TM) 64-Bit Server VM (build 25.161-b12, mixed mode)
```
