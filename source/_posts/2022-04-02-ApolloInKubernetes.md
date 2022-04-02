---
title: 利用Helm在Kubernetes部署无状态的Apollo配置中心
date: 2022-04-02 18:49:00
categories:
    - guide
tags:
    - Kubernetes
    - Apollo
    - Helm
mp3:
cover:
---

> 采用 K8S 无状态模式部署 Apollo 配置中心，可以利用 Helm 安装，本文给出部署 Apollo 配置中心的步骤说明。
>
> 截至发文日，我所使用的版本为`1.9.2`。
>
> 如果你还不了解 Apollo 配置中心，建议在阅读本文前，查看[Apollo 配置中心官方文档](https://www.apolloconfig.com/#/zh/README)。

要在 Kubernetes 部署 Apollo 配置中心，你需要做以下准备：

1. 安装`kubectl`和`helm`命令行工具；
2. 执行 Apollo 配置中心初始化数据库的 SQL 文件；
3. 准备几个部署时会用到的文件，具体文件个数，视你要部署的环境；
4. 以阿里云 ACK 为例子，你可以在 ACK 集群详情页面找到用于连接到 Kubernetes 的 `.kube/config` 描述文件。

---

### 安装工具

部署和操作 Kubernetes 所需要的命令行工具有`kubectl`和`helm`，这里我们主要会用到`helm`，它是 Kubernetes 的包管理工具，我们可以通过`helm`向自己的集群部署通用包应用。

-   [`kubectl` Install Tools | Kubernetes](https://kubernetes.io/docs/tasks/tools/)
-   [`helm` Helm](https://helm.sh/)

---

### 初始化数据库

初始化数据库的相关脚本，可以在[Apollo 配置中心官方文档](https://www.apolloconfig.com/#/zh/README)获取，这里不再给出具体链接。

需要注意，初始化 Apollo 配置中心的数据库内容，需要执行一共两个脚本，分别是`ApolloPortalDB.sql`和`ApolloConfigDB.sql`。两个脚本缺一不可。

本文举例给出两个文件执行后，对应的数据库库名：

-   `ApolloPortalDB.sql`对应数据库 schema：`ApolloPortalDB`
-   `ApolloConfigDB.sql`对应数据库 schema：`ApolloConfigDB`

---

### 准备文件

这里我们举例部署 pro 环境和 fat 环境，那么我们需要准备的文件有如下四个。

> 请注意，三个描述文件中连接数据库的参数，需要根据实际情况改变。
>
> 如果部署环境允许，即 ACK 集群和数据库处在同一个 VPC 内，可以将`host`改成私网地址；公网地址理论上也是支持的，但我没有验证过，就不在本文下定论了。

-   apollo 中心服务 pro 环境描述文件

```yaml
configdb:
    host: "<database-connect-host>" # 将单引号内的所有字符，替换成你的数据库 Host
    dbName: "ApolloConfigDB"
    userName: "<database-username>" # 将单引号内的所有字符，替换成连接数据库的用户名
    password: "<database-password>" # 将单引号内的所有字符，替换成连接数据库的密码
    connectionStringProperties: "characterEncoding=utf8&useSSL=false"
    service:
        enabled: true
        type: ExternalName
```

-   apollo 中心服务 fat 环境描述文件

```yaml
configdb:
    host: "<database-connect-host>" # 将单引号内的所有字符，替换成你的数据库 Host
    dbName: "ApolloConfigDB"
    userName: "<database-username>" # 将单引号内的所有字符，替换成连接数据库的用户名
    password: "<database-password>" # 将单引号内的所有字符，替换成连接数据库的密码
    connectionStringProperties: "characterEncoding=utf8&useSSL=false"
    service:
        enabled: true
        type: ExternalName
```

-   apollo 控制台描述文件

```yaml
portaldb:
    host: "<database-connect-host>" # 将单引号内的所有字符，替换成你的数据库 Host
    dbName: "ApolloPortalDB"
    userName: "<database-username>" # 将单引号内的所有字符，替换成连接数据库的用户名
    password: "<database-password>" # 将单引号内的所有字符，替换成连接数据库的密码
    connectionStringProperties: "characterEncoding=utf8&useSSL=false"
    service:
        enabled: true
        type: ExternalName
config:
    envs: test,prod
    metaServers:
        # 此处的域名，是依据 Kubernetes Pod 间通信域名来配置的，其名称需要在 helm 部署脚本里指定，请注意对比连接字符串与部署脚本的关系
        prod: http://apollo-service-apollo-configservice.middleware.svc.cluster.local:8080
        test: http://apollo-service-test-apollo-configservice.middleware.svc.cluster.local:8080
```

-   helm 部署脚本

```shell
#!/usr/bin/env bash
# 创建命名空间
kubectl create namespace middleware
# 向集群注册 Apollo Charts
helm repo add apollo https://www.apolloconfig.com/charts
# 部署 pro 环境
helm install -f apollo_prod-config-values.yml apollo-service apollo/apollo-service --namespace middleware
# 部署 fat 环境
helm install -f apollo_test-config-values.yml apollo-service-test apollo/apollo-service --namespace middleware
# 部署 控制台
helm install -f apollo_portal-config-values.yml apollo-portal apollo/apollo-portal --namespace middleware
```

---

### 部署

准备好上述文件，并配置好本机的命令行工具后，执行部署脚本。安装过程视网络情况而定，一般会需要一小段时间。

执行成功后，前往阿里云 ACK 集群查看命名空间 middleware 的部署情况，可以在「无状态」页面和「服务」页面看到新部署的服务。

现在部署好的服务暂时还不可用，你需要调整相关的路由配置和服务类型。

首先，修改「服务」页面 `apollo-portal` 服务的类型为 `NodePort`（节点端口），然后前往「路由」页面，为这个服务创建域名解析，最后前往阿里云 DNS 控制台配置好 Apollo Portal 控制台的域名解析。

其次，修改「服务」页面 `apollo-service-apollo-configservice` 服务和 `apollo-service-test-apollo-configservice` 服务的服务类型为 `LoadBalancer`（负载均衡），设为私网访问（因为配置中心不一定需要开放公网访问）。

到此为止，Apollo 配置中心部署完毕。
