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
  echo installing apache cassandra for structure
  helm install -f cassandra-structure/values.yml cassandra-structure bitnami/cassandra

  sleep 1

  echo
  echo installing apache cassandra for traces
  helm install -f cassandra-traces/values.yml cassandra-traces bitnami/cassandra

  # Wait until Kafka is ready to create the topics
  echo
  echo waiting for kafka to be ready
  kubectl wait --for=condition=Ready --timeout=360s pod/kafka-0 
  
  echo
  echo kafka is ready
  echo creating topics
  source create_topics.sh

  # Install the service after Kafka is ready
  
  # Otel Collector
  echo
  echo installing openetelemetry service
  kubectl create -f ot-collector/manifest.yml

  # OpenCensus Collector
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
