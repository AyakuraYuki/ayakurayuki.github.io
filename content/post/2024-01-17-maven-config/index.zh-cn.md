+++
title = 'Maven的一些配置小记'
description = '记录一些有用的插件、依赖'
date = 2024-01-17T10:44:50+08:00
slug = '2024-01-17-maven-config'
categories = ['guide']
tags = ['java', 'maven']
+++

> 所有的插件版本均截至笔记编写日期 2024-01-17 时我所使用的版本，按需更新

## 源码类

### maven-source-plugin

打包源代码，指定在 package 阶段执行 jar-no-fork 目标。

[Apache Maven Source Plugin - Introduce](https://maven.apache.org/plugins/maven-source-plugin/)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-source-plugin</artifactId>
  <version>3.2.1</version>
  <executions>
    <execution>
      <phase>package</phase>
      <goals>
        <goal>jar-no-fork</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

### maven-javadoc-plugin

打包 Javadoc，指定在 package 阶段执行 jar 目标。

[Apache Maven Javadoc Plugin](https://maven.apache.org/plugins/maven-javadoc-plugin/)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-javadoc-plugin</artifactId>
  <version>3.5.0</version>
  <configuration>
    <additionalJOption>-Xdoclint:none</additionalJOption>
  </configuration>
  <executions>
    <execution>
      <phase>package</phase>
      <goals>
        <goal>jar</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

## 编译保障类

### maven-surefire-plugin

单元测试插件，在编译时执行开发者编写的单元测试，保证测试通过后才可以打包。

[Maven Surefire Plugin - Introduce](https://maven.apache.org/surefire/maven-surefire-plugin/)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.2.5</version>
  <configuration>
    <!-- 这里给执行的单元测试注入参数，按需自定义 -->
    <argLine>--illegal-access=permit</argLine>
  </configuration>
</plugin>
```

### maven-failsafe-plugin

集成测试插件，在编译时执行依赖外部组件（如数据库、网络等）的测试用例。

[Maven Failsafe Plugin - Introduce](https://maven.apache.org/surefire/maven-failsafe-plugin/)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-failsafe-plugin</artifactId>
  <version>3.2.5</version>
  <configuration>
    <!-- 这里给执行的单元测试注入参数，按需自定义 -->
    <argLine>--illegal-access=permit</argLine>
  </configuration>
</plugin>
```

## GPG签名

GPG签名插件，指定在 verify 阶段对产生的包签名。

[Apache Maven GPG Plugin - Introduce](https://maven.apache.org/plugins/maven-gpg-plugin/)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-gpg-plugin</artifactId>
  <version>3.1.0</version>
  <executions>
    <execution>
      <id>sign-artifacts</id>
      <phase>verify</phase>
      <goals>
        <goal>sign</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

GPG签名需要同时配置 Maven 用户配置文件 `settings.xml` 的相关 `profile` 才能正确调用 GPG 签名工具，这里给出一个范例：

```xml
<settings>
  <!-- ... -->

  <profiles>
    <profile>
      <id>central</id>
      <properties>
        <gpg.executable>/path/to/gpg</gpg.executable>
        <gpg.passphrase>replace_to_your_gpg_passphrase</gpg.passphrase>
      </properties>
    </profile>
  </profiles>
  <activeProfiles>
    <activeProfile>central</activeProfile>
  </activeProfiles>

  <!-- ... -->
</settings>
```

## 开发环境版本检查

这个插件用来检查开发者的当前环境，可以用来限制例如最低 Maven 版本号，或者最低 JDK 版本号等。

[Apache Maven Enforcer Plugin - Introduce](https://maven.apache.org/enforcer/maven-enforcer-plugin/)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-enforcer-plugin</artifactId>
  <version>3.0.0</version>
  <configuration>
    <rules>
      <requireMavenVersion>
        <message>Unsupported Maven version, the minimum version is 3.0, please upgrade it.</message>
        <version>[3.0,)</version>
      </requireMavenVersion>
      <requireJavaVersion>
        <message>JDK 11 required, the minimum version of JDK is 11.0.9, please upgrade your JDK.</message>
        <version>[11.0.9,)</version>
      </requireJavaVersion>
    </rules>
  </configuration>
  <executions>
    <execution>
      <id>enforce-versions</id>
      <goals>
        <goal>enforce</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```
