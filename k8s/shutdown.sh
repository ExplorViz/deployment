#!/usr/bin/env bash
set -euo pipefail

cluster="explorviz"
nodes="$(docker ps -q --filter "label=io.x-k8s.kind.cluster=$cluster")"

if [[ -z "$nodes" ]]; then
    printf 'No running nodes found for Kind cluster %s.\n' "$cluster"
    exit 0
fi

while IFS= read -r node; do
    docker stop "$node"
done <<< "$nodes"
