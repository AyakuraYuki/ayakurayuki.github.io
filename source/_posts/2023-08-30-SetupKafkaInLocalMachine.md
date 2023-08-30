---
title: 记录一下本地搭建 Kafka 的一些命令
date: 2023-08-30 17:10:00
categories:
    - guide
tags:
    - Kafka
    - Zookeeper
mp3:
cover:
---

简单记录一下本地搭建 Kafka 用到的命令。

利用 Docker 在本地搭建单机版 Kafka。

## 拉取镜像

```shell
docker pull wurstmeister/zookeeper
docker pull wurstmeister/kafka
```

## Zookeeper

```shell
mkdir -p /var/docker-services/zookeeper/data
mkdir -p /var/docker-services/zookeeper/datalog
docker run -d --privileged=true --restart=always --name=zookeeper -p 2181:2181 -v /etc/localtime:/etc/localtime -v /var/docker-services/zookeeper/data:/data -v /var/docker-services/zookeeper/datalog:/datalog -t wurstmeister/zookeeper
```

## Kafka

```shell
mkdir -p /var/docker-services/kafka/data
docker run -d --privileged=true --restart=always --name=kafka -p 9092:9092 -v /var/docker-services/kafka/data:/kafka -e KAFKA_BROKER_ID=0 -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 -e KAFKA_AUTO_CREATE_TOPICS_ENABLE=true -e KAFKA_LOG_RETENTION_HOURS=72 -t wurstmeister/kafka
```

完成上述配置后，重启一下 Kafka

```shell
docker restart kafka
```