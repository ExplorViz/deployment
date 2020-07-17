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

## Configuring the OC-Agent

The Opencensus Agent must be set up to send traces to the Opencensus Collector which runs in the cluster. To do so, the agent needs to know the IP address of the cluster and the node port that is forwarded to the collector.

To find the IP address use `kubectl get node -o wide`. The `INTERNAL-IP` is the docker IP address the kind cluster container can be access from.

Use `kubectl get service oc-collector` to find the node port of the Opencensus Collector Service. The output is similar to

```sh
NAME           TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)
oc-collector   NodePort   10.100.75.52   <none>        55678:31353/TCP  
```

In this case the node port to access the OpenCensuns Collector is `31353`. This port is chose at random each time the cluster is setup.

Both values need to be specified in the `oc-agent.yml` configuration file in the `oc-agent` subdirectory of this repository.
