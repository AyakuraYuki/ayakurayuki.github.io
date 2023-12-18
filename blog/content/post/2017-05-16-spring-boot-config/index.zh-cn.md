---
title: Spring Boot学习之基本配置
date: 2017-05-16 12:00:00
slug: 2017-05-16-spring-boot-config
categories:
    - guide
tags:
    - Java
    - Spring
---

> Spring Boot 其实可以不需要配置就能运行，但实际的实现过程中，我们还是需要给它写一些配置，准确的说，是给包含第三方依赖的环境编写配置。

## Maven - pom.xml

根据相关文档说明，构建 Spring Boot 项目建议使用 Gradle，但不排斥 Maven 创建项目。

在我的演示项目中，我使用了 Spring Boot + MyBatis + Thymeleaf 的环境。

以下是使用 Maven 创建 Spring Boot 项目所用的 pom.xml 文件配置内容。

```xml
<!-- Spring Boot基础依赖 -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>1.5.2.RELEASE</version>
    <relativePath/> <!-- lookup parent from repository -->
</parent>

<dependencies>
    <!-- Spring Boot JDBC 支持 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>

    <!-- Spring-MyBatis 支持 -->
    <dependency>
        <groupId>org.mybatis.spring.boot</groupId>
        <artifactId>mybatis-spring-boot-starter</artifactId>
        <version>1.3.0</version>
    </dependency>

    <!-- Thymeleaf 模板引擎支持 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>

    <!-- MySQL 连接器 -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Spring Boot 测试单元支持 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Restful 文档 -->
    <dependency>
        <groupId>org.springframework.restdocs</groupId>
        <artifactId>spring-restdocs-mockmvc</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Spring Boot 开发工具包 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- Groovy 支持 -->
    <dependency>
        <groupId>org.codehaus.groovy</groupId>
        <artifactId>groovy</artifactId>
        <version>2.4.10</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <!--
            使用Maven package时，如果指定了这个插件，打包会生成JAR文件，而不是WAR文件
            启动Spring Boot是通过指定的BootApplication.main()来启动，所以使用JAR包直接运行
         -->
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

## Environment - application.yml

[YAML](http://www.yaml.org/) (YAML Ain't Markup Language)，即“YAML 不是一种置标语言”，是所有编程语言的人性化数据序列化标准。

YAML 是 JSON 的一个超集，也是一种方便的定义层次配置数据的格式。只要将 SnakeYAML 库放到 classpath 下，SpringApplication 就会自动支持 YAML，以作为 properties 的替换。

简单来说，YAML 不像 xml 那样需要配置繁琐的标签和属性以及文档验证，也不像 properties 那样只有普通的 key/value。YAML 使用大纲的缩进表现形式，让配置项有明显的结构表示。

```yaml
# System configuration
server:
    display-name: CRUD # 定义服务器的显示名称
    port:
        8888 # 定义可访问的端口，默认访问端口是8080
        # 由于Spring Boot是内建Tomcat，所以没有了Tomcat的配置，取而代之的是在这里配置访问端口

# Datasource & Thymeleaf configuration
spring:
    datasource:
        driver-class-name: com.mysql.jdbc.Driver # 定义数据源使用的驱动类
        username: root # 数据库用户
        password: root # 数据库密码
        url: jdbc:mysql://[server_address]:[port]/[schema_name] # 连接URL
    thymeleaf: # 配置模板引擎
        enabled: true # 开启模板引擎，默认true，这里配置其实可以不写这句
        mode: HTML5 # 定义模板类型
        encoding: utf-8 # 编码，不用多说了
        content-type: text/html # 报文类型
        cache:
            false # 是否开启缓存，这里跟修改模板文件后自动部署有关
            # 关闭之后如果对模板文件有修改，就会更新服务器上的文件
        prefix: classpath:/templates/ # 访问前缀，默认是/template文件夹
        suffix: .html # 访问后缀，可以改为其他的名称，默认就是.html
    resources: # 资源文件绑定
        static-locations: classpath:/static # 这里的配置可以使模板像调用本地文件一样调用到样式资源
```

## MyBatis - bean & mapping xml

MyBatis 是支持定制化 SQL、存储过程以及高级映射的优秀的持久层框架。MyBatis 避免了几乎所有的 JDBC 代码和手动设置参数以及获取结果集。MyBatis 可以对配置和原生 Map 使用简单的 XML 或注解，将接口和 POJO 映射成数据库中的记录。

MyBatis 相比 Hibernate，其可控性几乎是完全的，程序员可以通过 mapping 配置，使程序不用回炉重造就能支持多个数据库的连接，并且有效控制对数据的操作。

本演示项目没有使用如 Druid、DBCP 等的数据库连接池工具，而是使用 Tomcat 数据库连接池，使用 Tomcat 连接池的配置相对简单，适合初学者入门（但为了数据库连接信息安全，更推荐使用 Druid）。对于使用数据库连接池的配置，会在今后撰文介绍。

```java
@SpringBootApplication
@MapperScan("me.yuki.dao")
public class BootApplication {
	@Bean
	@ConfigurationProperties("spring.datasource")
	public DataSource getDataSource() {
		return new org.apache.tomcat.jdbc.pool.DataSource();
	}

	@Bean
    public SqlSessionFactory getSqlSessionFactory() throws Exception {
    	SqlSessionFactoryBean sqlSessionFactory = new SqlSessionFactoryBean();
    	sqlSessionFactory.setDataSource(getDataSource());
    	PathMatchingResourcePatternResolver resolver
    	                        = new PathMatchingResourcePatternResolver();
    	sqlSessionFactory.setMapperLocations(resolver.getResources("/mapper/*.xml"));
    	return sqlSessionFactory.getObject();
    }

	@Bean
	public PlatformTransactionManager getTransactionManager() {
		return new DataSourceTransactionManager(getDataSource());
	}

	public static void main(String[] args) {
		SpringApplication.run(BootApplication.class, args);
	}
}
```

### 数据源配置 - 代码分析

#### 类注解

```java
@SpringBootApplication // 标记该类是Spring Boot启动类
@MapperScan("me.yuki.dao") // 配置mapper扫描器扫描的包位置
```

#### getDataSource()

```java
@Bean // 注册为DataSource Bean
@ConfigurationProperties("spring.datasource") // 从yml取得节点spring.datasource下的配置
public DataSource getDataSource() {
    return new org.apache.tomcat.jdbc.pool.DataSource(); // 从Tomcat获取DataSource
}
```

对应的 SpringFramework 配置如下（可能会有不同，参考的 xml 采用了 DBCP 配置数据源）

```xml
<bean id="dataSource" class="org.apache.commons.dbcp.BasicDataSource" destroy-method="close">
	<property name="driverClassName" value="${spring.datasource.driver-class-name}" />
	<property name="url" value="${spring.datasource.url}" />
	<property name="username" value="${spring.datasource.username}" />
	<property name="password" value="${spring.datasource.password}" />
</bean>
```

#### getSqlSessionFactory()

```java
@Bean // 注册为SqlSessionFactory Bean
public SqlSessionFactory getSqlSessionFactory() throws Exception {
    // <bean id="sqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
    SqlSessionFactoryBean sqlSessionFactory = new SqlSessionFactoryBean();
    // <property name="dataSource" ref="dataSource" />
    sqlSessionFactory.setDataSource(getDataSource());
    PathMatchingResourcePatternResolver resolver
                            = new PathMatchingResourcePatternResolver();
    // <property name="mapperLocations" value="classpath*:/mapper/*.xml" />
    sqlSessionFactory.setMapperLocations(resolver.getResources("/mapper/*.xml"));
    return sqlSessionFactory.getObject();
}
```

#### getTransactionManager()

```java
@Bean // 注册为PlatformTransactionManager Bean
public PlatformTransactionManager getTransactionManager() {
    /*
    <bean id="transactionManager"
            class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
       	<property name="dataSource" ref="dataSource" />
    </bean>
     */
	return new DataSourceTransactionManager(getDataSource());
}
```

### Mapping.xml

MyBatis mapping 文件的配置与 SSM 的配置完全一样，只要把文件放到在 getSqlSessionFactory()中配置的 MapperLocation 文件夹之下，对应文件名匹配格式即可。
