#!/bin/bash

setup() {
  echo adding helm repo  
  helm repo add bitnami https://charts.bitnami.com/bitnami

  echo
  echo creating kubernetes namespace
  kubectl create namespace explorviz-dev

  echo
  echo installing kafka
  helm install -n explorviz-dev -f kafka/values.yml kafka bitnami/kafka
  sleep 1
  
  echo
  echo installing the schema registry
  kubectl create --namespace=explorviz-dev -f registry/manifest.yml
  sleep 1
  
  echo
  echo installing apache cassandra
  helm install -n explorviz-dev -f cassandra/values.yml cassandra bitnami/cassandra

  sleep 1

  # Wait until Kafka is ready to create the topics
  echo
  echo waiting for kafka to be ready
  kubectl wait --for=condition=Ready --timeout=360s pod/kafka-0 
  
  echo
  echo kafka is ready
  echo creating topics
  kubectl exec --namespace=explorviz-dev kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic cluster-dump-spans
  kubectl exec --namespace=explorviz-dev kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-spans
  kubectl exec --namespace=explorviz-dev kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-traces
  kubectl exec --namespace=explorviz-dev kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-records

  # Install the service after Kafka is ready
  echo
  echo installing opencensus service
  kubectl create --namespace=explorviz-dev -f oc-collector/manifest.yml
}

shutdown() {
  echo removing deployments, pods, and services
  kubectl delete --namespace=explorviz-dev deploy,po,svc,statefulsets --all

  echo
  echo removing statefulsets
  kubectl delete --namespace=explorviz-dev statefulsets --all

  echo
  echo removing persistentvolumes
  kubectl delete --namespace=explorviz-dev persistentvolumeclaims --all
  kubectl delete --namespace=explorviz-dev persistentvolume --all
}

if [ "$(type -t $1)" == 'function' ]; then
    $1
else
    echo "$1 is not a valid function"
fi
