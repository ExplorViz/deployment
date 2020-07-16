#!/bin/sh

echo adding helm repo
helm repo add bitnami https://charts.bitnami.com/bitnami

echo installing kafka
helm install -f kafka/values.yml kafka bitnami/kafka
sleep 1
echo installing the schema registry
kubectl create -f registry/manifest.yml
sleep 1
echo installing apache cassandra
helm install -f cassandra/values.yml cassandra bitnami/cassandra

sleep 1

# Wait until Kafka is ready to create the topics
echo waiting for kafka to be ready
kubectl wait --for=condition=Ready --timeout=360s pod/kafka-0 
echo kafka is ready
echo creating topics
kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic cluster-dump-spans
kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-spans
kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-traces
kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-records

# Install the service after Kafka is ready
echo installing opencensus service
kubectl create -f oc-collector/manifest.yml
