# Setup ExplorViz in a Local Kind Cluster

## Prerequisites

- A [kind](https://kind.sigs.k8s.io/docs/user/quick-start/) kubernetes cluster
- A `kubectl` installation configured to interact with the kind cluster (use `kind export kubeconfig` optionally with `--name` if not using the default cluster name)
- A [helm](https://helm.sh/) installation (version 3.0.0+)

## Deploy Infrastructure Services

The script `kind.sh` can deploy and remove all infrastructure services for explorviz, that is,

- Apache Kafka
- Avro Schema Registry
- Apache Cassandra
- Opencensus Collector

Call the script via `./kind.sh setup` or `./kind.sh shutdown`.

By default, all pods are created with a replication factor of 1. Settings can be overridden in the respective subdirectories.
