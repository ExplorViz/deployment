#!/bin/bash

setup() {

  export KUBECONFIG="/Users/alex/.kube/config-se"

  echo
  echo adding grafana repo  
  helm repo add grafana https://grafana.github.io/helm-charts

  echo
  echo adding prometheus repo  
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

  echo
  echo adding helm repo  
  helm repo add bitnami https://charts.bitnami.com/bitnami

  echo
  echo installing grafana
  #helm install -f grafana/values.yml grafana grafana/grafana
  sleep 1
  

  echo
  echo installing prometheus
  #helm install -f prometheus/values.yml prometheus prometheus-community/prometheus
  sleep 1  

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
  sleep 1

  # Wait until Kafka is ready
  echo
  echo waiting for kafka to be ready
  kubectl wait --for=condition=Ready --timeout=360s pod/kafka-0 

  # Install the service after Kafka is ready
  echo
  echo installing opencensus service
  kubectl create -f oc-collector/manifest.yml

  # Install MongoDB for token
  echo 
  echo installing landscape token MongoDB
  helm install -f mongodb-token/values.yml mongo-token bitnami/mongodb

  # Deploy ExplorViz Adapter Service
  echo
  echo deploying ExplorViz Adapter-Servive
  kubectl create -f backend/manifest-adapter.yml

  # Deploy ExplorViz Landscape Service
  echo
  echo deploying ExplorViz Landscape-Servive
  kubectl create -f backend/manifest-landscape.yml

  # Deploy ExplorViz Trace Service
  echo
  echo deploying ExplorViz Trace-Servive
  kubectl create -f backend/manifest-trace.yml

  # Deploy ExplorViz User Service
  echo
  echo deploying ExplorViz User-Servive
  kubectl create -f backend/manifest-user.yml
}

shutdown() {
  kubectl delete -f backend/manifest-adapter.yml
  kubectl delete -f backend/manifest-landscape.yml
  kubectl delete -f backend/manifest-trace.yml
  kubectl delete -f backend/manifest-user.yml

  kubectl delete -f oc-collector/manifest.yml
  kubectl delete -f registry/manifest.yml

  helm uninstall grafana prometheus mongo-token cassandra-traces cassandra-structure kafka
}

if [ "$(type -t $1)" == 'function' ]; then
    $1
else
    echo "$1 is not a valid function"
fi
