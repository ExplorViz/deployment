#!/bin/bash

setup-adapter() {  
  
  echo installing opencensus service
  kubectl create -f oc-collector/manifest.yml

}

setup-landscape() {
  echo installing apache cassandra for structure
  helm install -f cassandra-structure/values.yml cassandra-structure bitnami/cassandra
}

setup-user() {

  # Install MongoDB for token
  echo 
  echo installing landscape token MongoDB
  helm install -f mongodb-token/values.yml mongo-token bitnami/mongodb

}

setup-trace() {
  echo installing apache cassandra for traces
  helm install -f cassandra-traces/values.yml cassandra-traces bitnami/cassandra
}

setup-base() {
  echo creating explorviz kind cluster
  kind create cluster --wait 3m --name explorviz-dev --config=kind-config.yaml

  echo
  echo setting kubectl context to that cluster
  kind export kubeconfig --name explorviz-dev

  echo
  echo adding helm repo  
  helm repo add bitnami https://charts.bitnami.com/bitnami

}

setup-kafka() {
  echo
  echo installing kafka
  helm install -f kafka/values.yml kafka bitnami/kafka
  sleep 1
  
  echo
  echo installing the schema registry
  kubectl create -f registry/manifest.yml
  sleep 1

  # Wait until Kafka is ready to create the topics
  echo
  echo waiting for kafka to be ready
  kubectl wait --for=condition=Ready --timeout=360s pod/kafka-0 
  
  echo
  echo kafka is ready
  echo creating topics
  source create_topics.sh
}

setup-monitoring() {
  echo installing prometheus
  helm install -f prometheus/values.yml prometheus prometheus-community/prometheus
  echo
  echo installing grafana
  helm install -f grafana/values.yml grafana grafana/grafana
  
  echo installing the lag exporter
  helm install -f lag-exporter/values.yml kafka-lag-exporter https://github.com/lightbend/kafka-lag-exporter/releases/download/v0.6.5/kafka-lag-exporter-0.6.5.tgz

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
