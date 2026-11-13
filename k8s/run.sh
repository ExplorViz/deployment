#!/usr/bin/env bash
set -euo pipefail

chart_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/explorviz"
cluster="explorviz"
context="kind-$cluster"
namespace="explorviz"
export KIND_EXPERIMENTAL_PROVIDER=docker

for tool in docker kind helm kubectl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf 'Required command missing: %s\n' "$tool" >&2
        exit 1
    fi
done

clusters="$(kind get clusters)"
if grep -Fxq "$cluster" <<< "$clusters"; then
    stopped_nodes="$(docker ps -aq --filter "label=io.x-k8s.kind.cluster=$cluster" --filter status=exited)"
    while IFS= read -r node; do
        if [[ -n "$node" ]]; then
            docker start "$node"
        fi
    done <<< "$stopped_nodes"
    kind export kubeconfig --name "$cluster"

    deadline=$((SECONDS + 300))
    until kubectl --context "$context" --request-timeout=5s get --raw=/readyz >/dev/null 2>&1; do
        if (( SECONDS >= deadline )); then
            printf 'Timed out waiting for the %s Kubernetes API.\n' "$cluster" >&2
            exit 1
        fi
        sleep 2
    done
else
    kind create cluster --name "$cluster" --wait 5m
fi

helm upgrade --install explorviz "$chart_dir" "$@" \
    --kube-context "$context" --namespace "$namespace" --create-namespace \
    --wait --wait-for-jobs --timeout 15m

kubectl_cmd=(kubectl --context "$context" --namespace "$namespace")
services="$("${kubectl_cmd[@]}" get services -o name)"
forward_pids=()
forward_count=0

forward_service() {
    local service="$1" ports="$2" pods pod pid="" waiting=false

    trap 'if [[ -n "$pid" ]]; then
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    fi' EXIT
    trap 'exit 0' INT TERM

    while true; do
        if pods="$("${kubectl_cmd[@]}" --request-timeout=5s get endpointslices \
            --selector "kubernetes.io/service-name=$service" \
            -o 'jsonpath={range .items[*].endpoints[?(@.conditions.ready==true)]}{.targetRef.name}{" "}{end}')" \
            && [[ -n "$pods" ]]; then
            pod="${pods%% *}"
            waiting=false
            "${kubectl_cmd[@]}" port-forward --address 127.0.0.1 "pod/$pod" "$ports" &
            pid="$!"
            wait "$pid" || true
            pid=""
            printf 'Port-forward for %s ended. Reconnecting in 3 seconds.\n' "$service" >&2
        elif [[ "$waiting" == false ]]; then
            printf 'Waiting for a ready pod for %s.\n' "$service"
            waiting=true
        fi
        sleep 3
    done
}

stop_forwards() {
    if (( forward_count > 0 )); then
        kill "${forward_pids[@]}" 2>/dev/null || true
        wait "${forward_pids[@]}" 2>/dev/null || true
    fi
}

trap stop_forwards EXIT
trap 'exit 0' INT TERM

for mapping in \
    "frontend:${EXPLORVIZ_FRONTEND_LOCAL_PORT:-8080}:80" \
    "otel-collector:${EXPLORVIZ_OTLP_LOCAL_PORT:-55678}:55678" \
    "trace-generator:${EXPLORVIZ_GENERATOR_LOCAL_PORT:-8079}:8079" \
    "grafana:${EXPLORVIZ_GRAFANA_LOCAL_PORT:-3000}:3000" \
    "prometheus:${EXPLORVIZ_PROMETHEUS_LOCAL_PORT:-9090}:9090"; do
    service="${mapping%%:*}"
    if grep -Fxq "service/$service" <<< "$services"; then
        forward_service "$service" "${mapping#*:}" &
        forward_pids+=("$!")
        forward_count=$((forward_count + 1))
    fi
done

if (( forward_count == 0 )); then
    exit 0
fi

printf 'Keep this terminal open for port forwarding. Press Ctrl+C to stop it.\n'
wait
