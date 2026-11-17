# ExplorViz on Kubernetes

The Helm chart is generated from [the Docker Compose stack](../docker/compose.yaml). Each Compose profile becomes a Helm profile under `profiles` in [values.yaml](explorviz/values.yaml). By default the chart enables the `env`, `otel`, `backend`, `frontend`, and `generator` profiles.

## Install

Install [Kind](https://kind.sigs.k8s.io/), Docker, kubectl, and Helm 3. Start Docker, then run this command from the repository root.

```sh
./k8s/run.sh
```

The script creates a Kind cluster named `explorviz` or reuses it if it exists. It installs or upgrades the Helm release in the `explorviz` namespace using the `kind-explorviz` context. The chart requests 1 GiB per persistent volume claim.

After Helm finishes, the script waits for a ready pod for each enabled service below and forwards it on `127.0.0.1`. If a pod is replaced, its forward reconnects when a ready pod is available.

| Service | Default local port | Environment variable |
| --- | --- | --- |
| Frontend | 8080 | `EXPLORVIZ_FRONTEND_LOCAL_PORT` |
| OTLP/gRPC collector | 4317 | `EXPLORVIZ_OTLP_LOCAL_PORT` |
| Trace generator | 8079 | `EXPLORVIZ_GENERATOR_LOCAL_PORT` |
| Grafana | 3000 | `EXPLORVIZ_GRAFANA_LOCAL_PORT` |
| Prometheus | 9090 | `EXPLORVIZ_PROMETHEUS_LOCAL_PORT` |

If a port is already in use, override it when starting the script, for example `EXPLORVIZ_FRONTEND_LOCAL_PORT=8088 ./k8s/run.sh`. Keep the terminal open while using the forwarded ports. Press Ctrl+C to close the forwards and leave the cluster running.

Open the frontend at `http://localhost:8080`. Send OTLP/gRPC telemetry to `localhost:4317` from the host or `otel-collector:4317` from the release namespace. Set the chart's `clusterDomain` if your cluster uses a DNS domain other than `cluster.local`.

Kafka topic creation runs as a Job. The collector and Kafka-dependent backends wait for the topics before starting. View the initializer logs with `kubectl --context kind-explorviz -n explorviz logs -l io.kompose.service=init-kafka`.

The chart provisions fresh Kubernetes volumes. Back up any existing data before moving it from Docker or removing a release. Helm can delete the claims when you disable their profiles or uninstall the release.

## Shut down

Press Ctrl+C in the terminal running `run.sh`, then stop the cluster:

```sh
./k8s/shutdown.sh
```

The shutdown script stops the Kind node containers and preserves their data. Run `./k8s/run.sh` again to restart the cluster and its port-forwards. To permanently remove the cluster and its data, run `kind delete cluster --name explorviz`.

## Optional profiles

Pass Helm options to the script, for example `./k8s/run.sh --set profiles.monitoring=true`. For profiles that require a Secret, run the default install first so the cluster and namespace exist, then press Ctrl+C to close its port-forwards. Create the Secret using the `kind-explorviz` context and `explorviz` namespace, then rerun the script with the profile enabled.

| Profile | Helm flag | Configuration |
| --- | --- | --- |
| Monitoring | `--set profiles.monitoring=true` | Grafana and Prometheus are forwarded automatically. |
| Chatbot | `--set profiles.chatbot=true` | Create the `explorviz-chatbot` Secret in the release namespace from `docker/.llm-api-keys.env` using `kubectl create secret generic --from-env-file`. |
| VS Code backend | `--set profiles.vs-code=true` | No extra configuration. |
| Keycloak | `--set profiles.auth=true` | Create the `explorviz-keycloak` Secret in the release namespace with `database-password` and `admin-password` keys. |

For Keycloak, set `keycloak.publicURL` to the browser-facing frontend origin and register that origin in the realm's frontend client redirect URIs. Route `/realms` and `/resources` on that origin to `svc/keycloak:8080` through your ingress or reverse proxy so the browser can load the login page and its assets. The chart uses the same public origin for the backend's expected token issuer and for `PUBLIC_URL` in the realm import.

## Regenerate

Install Python 3 with PyYAML, Docker Compose with support for `include` and `config --no-env-resolution`, Kompose 1.34.0, and Helm 3. From the repository root:

```sh
python3 k8s/generate.py
helm lint ./k8s/explorviz
helm template explorviz ./k8s/explorviz --namespace explorviz
```

The generator resolves Compose includes and interpolation, runs `kompose convert --chart`, then adds ConfigMaps for bind mounts, Kubernetes startup dependencies, and the Kafka Job. Each Compose profile becomes a folder under `explorviz/generated/`. The generator fails if `values.yaml` has no entry for a profile, so add new Compose profiles there. Deployments with volumes stop the old pod before starting the new one, so ReadWriteOnce claims are released. The generator replaces the files under `explorviz/generated/` after Helm lint succeeds. Update the Compose files and generator to make persistent changes. Helm controls enabled profiles via `values.yaml`.

The generator uses the shared `docker/.env` and the shell environment for Compose interpolation. Keep private settings in Kubernetes Secrets. The local `.env-custom` and `.llm-api-keys.env` files are excluded from chart generation.
