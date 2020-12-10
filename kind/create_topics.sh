#!/bin/bash

# Unset JMX_PORT as workaround https://github.com/bitnami/charts/issues/1522
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic cluster-dump-spans'
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-spans'
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-traces'
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-records'
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-spans-structure'
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-spans-dynamic'
kubectl exec kafka-0 -c kafka -- /bin/bash -c 'unset JMX_PORT; kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic token-events'
