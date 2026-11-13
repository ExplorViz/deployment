#!/bin/sh
set -eu

# The upstream installer downloads APOC Extended on every invocation. Reuse
# complete JARs from the plugin volume, including after container recreation.
# Validate archives so an interrupted download is retried on the next startup,
# and discard JARs that were installed for a different Neo4j version.
version_file=/plugins/.neo4j-version
version="$(basename "$(ls "${NEO4J_HOME:-/var/lib/neo4j}"/lib/neo4j-kernel-[0-9]*.jar)" .jar)"
if [ "$(cat "$version_file" 2>/dev/null)" = "$version" ] &&
   jar tf /plugins/apoc.jar >/dev/null 2>&1 &&
   jar tf /plugins/apoc-extended.jar >/dev/null 2>&1; then
    echo "Using cached Neo4j APOC plugins."
    unset NEO4J_PLUGINS
else
    rm -f /plugins/apoc.jar /plugins/apoc-extended.jar
    echo "$version" > "$version_file"
fi

exec /startup/docker-entrypoint.sh "$@"
