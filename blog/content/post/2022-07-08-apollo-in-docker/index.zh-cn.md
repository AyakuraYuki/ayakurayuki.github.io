---
title: 在 Docker 部署 Apollo 的正确姿势
description: 
date: 2022-07-08
slug: 2022-07-08-apollo-in-docker
image:
categories:
    - guide
tags:
    - Docker
    - Apollo
---

> 本文介绍了利用 Docker 部署 Apollo 配置中心的操作步骤。
>
> 截至发文日，我所使用的版本为`2.0.1`，并且经历过`1.9`升级到`2.0`的迁移步骤。
>
> 如果你还不了解 Apollo 配置中心，建议在阅读本文前，查看[Apollo 配置中心官方文档](https://www.apolloconfig.com/#/zh/README)。

要在 Docker 部署 Apollo 配置中心，你应该要做以下准备：

1. 安装 Docker；
2. 在 Docker 建立内部网络；
3. 在 Docker 内部署 MySQL，需要版本号大于等于 MySQL 5.6.5；
4. 执行 Apollo 配置中心初始化数据库的 SQL 文件；
5. 部署 Apollo 配置中心。

> 以下内容，我将用`Apollo`指代`Apollo 配置中心`

---

### 安装工具

在这步，你只需要安装 Docker 就行了，安装的方式根据操作系统不同，会有不同的方式，具体请前往官网，按引导步骤，或者查看官方文档，来完成安装 Docker 的工作。

-   [Home - Docker](https://www.docker.com/)

---

### 建立内部网络

利用 Docker 部署，我们需要在 Docker 里建立一个内部网络环境。这一步是可选的，但是为了可读性，我建议把 MySQL、Apollo 都部署到这个内网，并赋予别名来打通访问。

在这一步，你只需要执行下面的命令就可以了：

```shell
docker network create docker-internal
```

这里我们创建了一个名称是`docker-internal`的 Docker Network，在后面会用到。

---

### 部署 MySQl

在这一步，我们会用到 MySQL 8.0.29。按照 Apollo 官方要求，只要我们部署的 MySQL 版本号大于等于 5.6.5，就可以满足部署条件。

可以使用下面的命令来部署 MySQL：

```shell
docker pull mysql:8.0.29

docker run --name mysql \
  --network docker-internal \
  --network-alias mysql \
  -p 3306:3306 \
  -p 33060:33060 \
  -e MYSQL_ROOT_PASSWORD=Shimokitazawa114514 \
  -v ~/.mysql/data:/var/lib/mysql \
  -d mysql:8.0.29
```

上面的命令做了这些事情：

1. 拉取 MySQL 8.0.29 的镜像；
2. 运行一个 MySQL 容器，并且指定了运行的环境
    1. `-p 3306:3306`将容器的`3306`端口映射到宿主机的`3306`端口；
    2. `-p 33060:33060`将容器的`33060`端口映射到宿主机的`33060`端口；
    3. `--network docker-internal`指定了 MySQL 将会利用到`docker-internal`这个 Docker Network；
    4. `--network-alias mysql`指定了这个容器可以通过`mysql`来访问到，举例说明如果要在 Docker 内部用 JDBC URL 连接到这个容器，可以使用`jdbc:mysql://mysql:3306/`访问到；
    5. `-e MYSQL_ROOT_PASSWORD=root`指定了 MySQL root 用户的密码，这里可以把`Shimokitazawa114514`改成你想要的密码；
    6. `-v ~/.mysql/data:/var/lib/mysql`指定了 MySQL 可以持久化保存数据库文件资源到本地的`~/.mysql/data`目录，你可能需要手动创建这个目录，或者更换到其他的路径；理论上`-v`参数仅仅只是做了宿主机和容器的挂载行为，但 MySQL 会自动创建存储文件，所以可以在第一次启动容器时就指定这个挂载；

---

### 创建 Apollo 数据库

初始化数据库的相关脚本，可以在[Apollo 配置中心官方文档](https://www.apolloconfig.com/#/zh/README)获取，这里不再给出具体链接。

需要注意，初始化 Apollo 配置中心的数据库内容，需要执行一共两个脚本，分别是`ApolloPortalDB.sql`和`ApolloConfigDB.sql`。两个脚本缺一不可。

本文举例给出两个文件执行后，对应的数据库库名：

-   `ApolloPortalDB.sql`对应数据库 schema：`ApolloPortalDB`
-   `ApolloConfigDB.sql`对应数据库 schema：`ApolloConfigDB`

---

### 部署 Apollo

到这一步，理论来说你已经准备好运行环境了，接下来只要按顺序执行下面的这些命令，去部署 Apollo：

#### apollo-configservice

```shell
#!/usr/bin/env zsh

version=2.0.1
db_user=root
db_pass=root # 这个数据库密码应该是你部署 MySQL 的时候设置的 root 用户的密码
app_name=apollo-configservice
ip=xxx.xxx.xxx.xxx # 这里需要改成你自己的宿主机的内网 IP ，一定是你可以用 ifconfig 查询到的那个 IP

docker pull apolloconfig/${app_name}:${version}

# 部署 apollo-configservice ，并且利用 docker-internal 这个网络，设定网络别名为 apollo-configservice
# 映射端口 8080 到宿主机 8080 端
# 设定 JDBC URL 使用的 host 为 MySQL 服务的网络别名 mysql
docker run --name ${app_name} \
  --network docker-internal \
  --network-alias ${app_name} \
  -p 8080:8080 \
  -e SERVER_PORT=8080 \
  -e EUREKA_INSTANCE_IP_ADDRESS=${ip} \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/ApolloConfigDB?characterEncoding=utf8" \
  -e SPRING_DATASOURCE_USERNAME=${db_user} \
  -e SPRING_DATASOURCE_PASSWORD=${db_pass} \
  -d apolloconfig/${app_name}:${version}
```

#### apollo-adminservice

```shell
#!/usr/bin/env zsh

version=2.0.1
db_user=root
db_pass=root # 这个数据库密码应该是你部署 MySQL 的时候设置的 root 用户的密码
app_name=apollo-adminservice
ip=xxx.xxx.xxx.xxx # 这里需要改成你自己的宿主机的内网 IP ，一定是你可以用 ifconfig 查询到的那个 IP

docker pull apolloconfig/${app_name}:${version}

# 部署 apollo-adminservice ，并且利用 docker-internal 这个网络，设定网络别名为 apollo-adminservice
# 映射端口 8090 到宿主机 8090 端
# 设定 JDBC URL 使用的 host 为 MySQL 服务的网络别名 mysql
docker run --name ${app_name} \
  --network docker-internal \
  --network-alias ${app_name} \
  -p 8090:8090 \
  -e SERVER_PORT=8090 \
  -e EUREKA_INSTANCE_IP_ADDRESS=${ip} \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/ApolloConfigDB?characterEncoding=utf8" \
  -e SPRING_DATASOURCE_USERNAME=${db_user} \
  -e SPRING_DATASOURCE_PASSWORD=${db_pass} \
  -d apolloconfig/${app_name}:${version}
```

#### apollo-portal

```shell
#!/usr/bin/env zsh

version=2.0.1
db_user=root
db_pass=root # 这个数据库密码应该是你部署 MySQL 的时候设置的 root 用户的密码
app_name=apollo-portal
dev_meta=http://apollo-configservice:8080 # 注意到这里使用的 host 是 apollo-configservice 容器的名称，这是因为部署 apollo-configservice 的时候指定了 --network-alias

# 部署 apollo-portal ，并且利用 docker-internal 这个网络，设定网络别名为 apollo-portal
# 映射端口 8070 到宿主机 8070 端
# 设定 JDBC URL 使用的 host 为 MySQL 服务的网络别名 mysql
# 设定 Apollo 环境 dev 的 meta server 地址为 http://apollo-configservice:8080
docker run --name ${app_name} \
  --network docker-internal \
  --network-alias ${app_name} \
  -p 8070:8070 \
  -e SERVER_PORT=8070 \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/ApolloPortalDB?characterEncoding=utf8" \
  -e SPRING_DATASOURCE_USERNAME=${db_user} \
  -e SPRING_DATASOURCE_PASSWORD=${db_pass} \
  -e APOLLO_PORTAL_ENVS=dev \
  -e DEV_META=${dev_meta} \
  -d apolloconfig/${app_name}:${version}
```

---

### 假如你需要更改端口

> 一般的，Apollo 会占用掉端口`8070`、`8080`和`8090`，大多数应用（包括你可能正在开发的应用）都会占用到其中的某个端口。一旦占用端口，要么就是 Apollo 不能用，要么就是自己的程序不能启动。
>
> 所以这也是为什么我需要写这篇博客的原因：我需要改 Apollo 监听的端口，而且不是一个，而是全部！

注意回顾一下上一节的部署命令，眼尖的读者应该已经看到了，三个命令中都包含了一行设置环境变量的代码`-e SERVER_PORT=xxxx`。

在官方文档的[2.2.2 部署 Apollo 服务端](https://www.apolloconfig.com/#/zh/deployment/distributed-deployment-guide?id=_222-%e9%83%a8%e7%bd%b2apollo%e6%9c%8d%e5%8a%a1%e7%ab%af)中，有一段引文简单说明了调整监听端口的做法：

> 注 3：如要调整服务的监听端口，可以修改 scripts/startup.sh 中的`SERVER_PORT`。另外 apollo-configservice 同时承担 meta server 职责，如果要修改端口，注意要同时 ApolloConfigDB.ServerConfig 表中的`eureka.service.url`配置项以及 apollo-portal 和 apollo-client 中的使用到的 meta server 信息，详见：[2.2.1.1.2.4 配置 apollo-portal 的 meta service 信息](https://www.apolloconfig.com/#/zh/deployment/distributed-deployment-guide?id=_221124-%e9%85%8d%e7%bd%aeapollo-portal%e7%9a%84meta-service%e4%bf%a1%e6%81%af)和[1.2.2 Apollo Meta Server](https://www.apolloconfig.com/#/zh/usage/java-sdk-user-guide?id=_122-apollo-meta-server)。

这段引文中提到了两个关键参数：

1. `SERVER_PORT`环境变量
2. `eureka.service.url` Eureka 服务 Url

在 Apollo 物理机部署的 Release 包里，你可以在 configservice、adminservice 和 portal 的`scripts/startup.sh`，找到`SERVER_PORT`这个参数的赋值代码，简单来说，你可以使用环境变量，或者启动入参等可以让 shell script 正确接收参数方式，传入`SERVER_PORT`来指定监听端口。换算到我们的 docker 启动脚本里，这就是一行`-e SERVER_PORT=xxxx`。

而当你修改了 configservice 的端口时，因为相应的 meta server 端口变了，而`eureka.service.url`还是指向原来的端口`8080`，当启动完整的服务后，相关的服务不能正确注册到 Eureka，则整套 Apollo 服务端不可用。

所以当你需要修改端口，请确保做到以下 3 点：

1. 变更需要更改端口的服务的`SERVER_PORT`；
2. 在更新了 configservice 的`SERVER_PORT`后，需要把数据库 ApolloConfigDB.ServerConfig 表中的`eureka.service.url`更新到 configservice 指定的端口上；
3. apollo-portal 的 meta.url 需要更新到新的端口上，举例如果指定了`APOLLO_PORTAL_ENVS=dev`，则更新`DEV_META`的 meta url 到新的端口上。

注意这里的第三点提到了`APOLLO_PORTAL_ENVS`和`DEV_META`，这两个环境变量在官方文档里有相对详细的说明，这里就不再赘述了。

---

### 如果你要从 1.9 迁移到 2.0

> 我的部署场景不属于全新部署，而是需要从`1.9.2`版本升级到`2.0.1`，所以我的部署应该是更新迁移的流程。这里我会把我的操作流程描述出来，供各位参考。

从 1.9 迁移到 2.0，Apollo 官方 Release Logs 中有给出操作步骤，具体可以查看[Release Apollo 2.0.0 Release · apolloconfig/apollo](https://github.com/apolloconfig/apollo/releases/tag/v2.0.0)这次版本的`How to upgrade from v1.9.x to v2.0.0`章节。

简单来说，我们需要关心的步骤如下：

#### （可选的）检查脏数据

使用下面的脚本来检查数据库中是否存在对于迁移过程来说的脏数据：

```sql
-- ApolloConfigDB data unique check
select `AppId`,`Secret`,count(*) from `AccessKey` where `IsDeleted`=0 group by `AppId`,`Secret` having count(*) > 1;
select `AppId`,count(*) from `App` where `IsDeleted`=0 group by `AppId` having count(*) > 1;
select `AppId`,`Name`, count(*) from `AppNamespace` where `IsDeleted`=0 group by `AppId`,`Name` having count(*) > 1;
select `AppId`,`Name`,count(*) from `Cluster` where `IsDeleted`=0 group by `AppId`,`Name` having count(*) > 1;
select `AppId`,`ClusterName`,`NamespaceName`,count(*) from `Namespace` where `IsDeleted`=0 group by `AppId`,`ClusterName`,`NamespaceName` having count(*) > 1;
select `NamespaceId`,count(*) from `NamespaceLock` where `IsDeleted`=0 group by `NamespaceId` having count(*) > 1;
select `ReleaseKey`,count(*) from `Release` where `IsDeleted`=0 group by `ReleaseKey` having count(*) > 1;
select `Key`,`Cluster`,count(*) from `ServerConfig` where `IsDeleted`=0 group by `Key`,`Cluster` having count(*) > 1;

-- ApolloPortalDB data unique check
select `AppId`,count(*) from `App` where `IsDeleted`=0 group by `AppId` having count(*) > 1;
select `AppId`,`Name`, count(*) from `AppNamespace` where `IsDeleted`=0 group by `AppId`,`Name` having count(*) > 1;
select `AppId`,count(*) from `Consumer` where `IsDeleted`=0 group by `AppId` having count(*) > 1;
select `ConsumerId`,`RoleId`,count(*) from `ConsumerRole` where `IsDeleted`=0 group by `ConsumerId`,`RoleId` having count(*) > 1;
select `Token`,count(*) from `ConsumerToken` where `IsDeleted`=0 group by `Token` having count(*) > 1;
select `UserId`,`AppId`,count(*) from `Favorite` where `IsDeleted`=0 group by `UserId`,`AppId` having count(*) > 1;
select `TargetId`,`PermissionType`,count(*) from `Permission` where `IsDeleted`=0 group by `TargetId`,`PermissionType` having count(*) > 1;
select `RoleName`,count(*) from `Role` where `IsDeleted`=0 group by `RoleName` having count(*) > 1;
select `RoleId`,`PermissionId`,count(*) from `RolePermission` where `IsDeleted`=0 group by `RoleId`,`PermissionId` having count(*) > 1;
select `Key`,count(*) from `ServerConfig` where `IsDeleted`=0 group by `Key` having count(*) > 1;
select `UserId`,`RoleId`,count(*) from `UserRole` where `IsDeleted`=0 group by `UserId`,`RoleId` having count(*) > 1;
select `Username`,count(*) from `Users` group by `Username` having count(*) > 1;
```

#### 创建新的字段

在`ApolloConfigDB`数据库执行下面的脚本，增加 2.0 需要的新字段：

```sql
--
-- Copyright 2022 Apollo Authors
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
# delta schema to upgrade apollo config db from v1.9.0 to v2.0.0

Use ApolloConfigDB;

ALTER TABLE `App`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `AppNamespace`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Audit`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Cluster`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Commit`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `GrayReleaseRule`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Item`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`,
    ADD INDEX IX_key (`Key`);

ALTER TABLE `Namespace`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `NamespaceLock`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Release`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `ReleaseHistory`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `ServerConfig`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `AccessKey`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;
```

在`ApolloPortalDB`数据库执行下面的脚本，增加 2.0 需要的新字段：

```sql
--
-- Copyright 2022 Apollo Authors
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
# delta schema to upgrade apollo portal db from v1.9.0 to v2.0.0

Use ApolloPortalDB;

ALTER TABLE `App`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `AppNamespace`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Consumer`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `ConsumerRole`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `ConsumerToken`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Favorite`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Permission`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `Role`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `RolePermission`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `ServerConfig`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;

ALTER TABLE `UserRole`
    ADD COLUMN `DeletedAt` BIGINT(20) NOT NULL DEFAULT '0' COMMENT 'Delete timestamp based on milliseconds' AFTER `IsDeleted`;
```

#### 按顺序升级服务

官方给出的建议是，按照`apollo-configservice` -> `apollo-adminservice` -> `apollo-portal`的顺序来升级服务。

但在我的实际操作中，我发现三个服务只有`apollo-configservice`和`apollo-adminservice`会有依赖，所以你可以按照下面的两种流程来滚动升级：

1. `apollo-configservice` -> `apollo-adminservice` -> `apollo-portal`
2. `apollo-portal` -> `apollo-configservice` -> `apollo-adminservice`

#### 创建 Unique 索引

在`ApolloConfigDB`数据库执行下面的脚本：

```sql
--
-- Copyright 2022 Apollo Authors
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
# delta schema to upgrade apollo config db from v1.9.0 to v2.0.0

Use ApolloConfigDB;

-- the follow DML won't change the `DataChange_LastTime` field
UPDATE `AccessKey` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `App` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `AppNamespace` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Audit` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Cluster` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Commit` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `GrayReleaseRule` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Item` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Namespace` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `NamespaceLock` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Release` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `ReleaseHistory` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `ServerConfig` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;

-- add UNIQUE CONSTRAINT INDEX for each table
ALTER TABLE `AccessKey`
    ADD UNIQUE INDEX `UK_AppId_Secret_DeletedAt` (`AppId`,`Secret`,`DeletedAt`),
    DROP INDEX `AppId`;

ALTER TABLE `App`
    ADD UNIQUE INDEX `UK_AppId_DeletedAt` (`AppId`,`DeletedAt`),
    DROP INDEX `AppId`;

ALTER TABLE `AppNamespace`
    ADD UNIQUE INDEX `UK_AppId_Name_DeletedAt` (`AppId`,`Name`,`DeletedAt`),
    DROP INDEX `IX_AppId`;

-- Ignore TABLE `Audit`

ALTER TABLE `Cluster`
    ADD UNIQUE INDEX `UK_AppId_Name_DeletedAt` (`AppId`,`Name`,`DeletedAt`),
    DROP INDEX `IX_AppId_Name`;

-- Ignore TABLE `Commit`

-- Ignore TABLE `GrayReleaseRule`, add unique index in future

-- Ignore TABLE `Item`, add unique index in future

ALTER TABLE `Namespace`
    ADD UNIQUE INDEX `UK_AppId_ClusterName_NamespaceName_DeletedAt` (`AppId`(191),`ClusterName`(191),`NamespaceName`(191),`DeletedAt`),
    DROP INDEX `AppId_ClusterName_NamespaceName`;

ALTER TABLE `NamespaceLock`
    ADD UNIQUE INDEX `UK_NamespaceId_DeletedAt` (`NamespaceId`,`DeletedAt`),
    DROP INDEX `IX_NamespaceId`;

ALTER TABLE `Release`
    ADD UNIQUE INDEX `UK_ReleaseKey_DeletedAt` (`ReleaseKey`,`DeletedAt`),
    DROP INDEX `IX_ReleaseKey`;

-- Ignore TABLE `ReleaseHistory`

ALTER TABLE `ServerConfig`
    ADD UNIQUE INDEX `UK_Key_Cluster_DeletedAt` (`Key`,`Cluster`,`DeletedAt`),
    DROP INDEX `IX_Key`;
```

在`ApolloPortalDB`数据库执行下面的脚本：

```sql
--
-- Copyright 2022 Apollo Authors
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
# delta schema to upgrade apollo portal db from v1.9.0 to v2.0.0

Use ApolloPortalDB;

-- the follow DML won't change the `DataChange_LastTime` field
UPDATE `App` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `AppNamespace` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Consumer` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `ConsumerRole` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `ConsumerToken` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Favorite` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Permission` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `Role` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `RolePermission` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `ServerConfig` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;
UPDATE `UserRole` SET `DeletedAt` = -Id, `DataChange_LastTime` = `DataChange_LastTime` WHERE `IsDeleted` = 1 and `DeletedAt` = 0;

-- add UNIQUE CONSTRAINT INDEX for each table
ALTER TABLE `App`
    ADD UNIQUE INDEX `UK_AppId_DeletedAt` (`AppId`,`DeletedAt`),
    DROP INDEX `AppId`;

ALTER TABLE `AppNamespace`
    ADD UNIQUE INDEX `UK_AppId_Name_DeletedAt` (`AppId`,`Name`,`DeletedAt`),
    DROP INDEX `IX_AppId`;

ALTER TABLE `Consumer`
    ADD UNIQUE INDEX `UK_AppId_DeletedAt` (`AppId`,`DeletedAt`),
    DROP INDEX `AppId`;

ALTER TABLE `ConsumerRole`
    ADD UNIQUE INDEX `UK_ConsumerId_RoleId_DeletedAt` (`ConsumerId`,`RoleId`,`DeletedAt`),
    DROP INDEX `IX_ConsumerId_RoleId`;

ALTER TABLE `ConsumerToken`
    ADD UNIQUE INDEX `UK_Token_DeletedAt` (`Token`,`DeletedAt`),
    DROP INDEX `IX_Token`;

ALTER TABLE `Favorite`
    ADD UNIQUE INDEX `UK_UserId_AppId_DeletedAt` (`UserId`,`AppId`,`DeletedAt`),
    DROP INDEX `IX_UserId`;

ALTER TABLE `Permission`
    ADD UNIQUE INDEX `UK_TargetId_PermissionType_DeletedAt` (`TargetId`,`PermissionType`,`DeletedAt`),
    DROP INDEX `IX_TargetId_PermissionType`;

ALTER TABLE `Role`
    ADD UNIQUE INDEX `UK_RoleName_DeletedAt` (`RoleName`,`DeletedAt`),
    DROP INDEX `IX_RoleName`;

ALTER TABLE `RolePermission`
    ADD UNIQUE INDEX `UK_RoleId_PermissionId_DeletedAt` (`RoleId`,`PermissionId`,`DeletedAt`),
    DROP INDEX `IX_RoleId`;

ALTER TABLE `ServerConfig`
    ADD UNIQUE INDEX `UK_Key_DeletedAt` (`Key`,`DeletedAt`),
    DROP INDEX `IX_Key`;

ALTER TABLE `UserRole`
    ADD UNIQUE INDEX `UK_UserId_RoleId_DeletedAt` (`UserId`,`RoleId`,`DeletedAt`),
    DROP INDEX `IX_UserId_RoleId`;

ALTER TABLE `Users`
    ADD UNIQUE INDEX `UK_Username` (`Username`);
```

到此为止，如果升级过程中没有出现异常，则说明升级迁移成功。

---

### 结语

Apollo 的 Docker 部署方式，看起来比较简单，实际操作我个人体验下来还是不如 K8S 的 Helm 部署，Helm 部署会帮我做很多我不需要关心的流程，我仅仅需要调整 service 的服务类型，以及 portal 的 ingress。

Docker 部署其实有更友好的 Docker-Compose 模式，但要想像我一样完全控制资源，那就比较复杂，就会遇到像我在上面提到的，要利用 Docker Network 打通内网，再利用 MySQL 实现持久化（以及宿主机持久化），再有服务发现，再有更换端口等等。

不过整套流程做下来，至少有一个比较明确的结论，那就是即使不使用 Docker-Compose，你依然可以拥有一套能够切实解藕并且可维护的部署流程，并且这个流程是可以复制和复用的。
