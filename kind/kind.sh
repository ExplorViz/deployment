#!/bin/bash

setup() {

  echo creating explorviz kind cluster
  kind create cluster --wait 3m --name explorviz-dev --config=kind-config.yaml

  echo
  echo setting kubectl context to that cluster
  kind export kubeconfig --name explorviz-dev

  echo
  echo adding helm repo  
  helm repo add bitnami https://charts.bitnami.com/bitnami

  echo
  echo installing kafka
  helm install -f kafka/values.yml kafka bitnami/kafka
  sleep 1
  
  echo
  echo installing the schema registry
  kubectl create -f registry/manifest.yml
  sleep 1
  
  echo
  echo installing apache cassandra
  helm install -f cassandra/values.yml cassandra bitnami/cassandra

  sleep 1

  # Wait until Kafka is ready to create the topics
  echo
  echo waiting for kafka to be ready
  kubectl wait --for=condition=Ready --timeout=360s pod/kafka-0 
  
  echo
  echo kafka is ready
  echo creating topics
  kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic cluster-dump-spans
  kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-spans
  kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-traces
  kubectl exec kafka-0 -- kafka-topics.sh --create --zookeeper kafka-zookeeper:2181 --replication-factor 1 --partitions 1 --topic explorviz-records

  # Install the service after Kafka is ready
  echo
  echo installing opencensus service
  kubectl create -f oc-collector/manifest.yml
}

shutdown() {
  kind delete cluster --name explorviz-dev
  kubectl cluster-info --context default
}

if [ "$(type -t $1)" == 'function' ]; then
    $1
else
    echo "$1 is not a valid function"
fi
