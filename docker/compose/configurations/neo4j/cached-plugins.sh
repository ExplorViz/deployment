#!/bin/sh
set -eu

# The upstream installer downloads APOC Extended on every invocation. Reuse
# complete JARs from the versioned volume, including after container recreation.
# Validate archives so an interrupted download is retried on the next startup.
if jar tf /plugins/apoc.jar >/dev/null 2>&1 &&
   jar tf /plugins/apoc-extended.jar >/dev/null 2>&1; then
    echo "Using cached Neo4j APOC plugins."
    unset NEO4J_PLUGINS
fi

exec /startup/docker-entrypoint.sh "$@"
