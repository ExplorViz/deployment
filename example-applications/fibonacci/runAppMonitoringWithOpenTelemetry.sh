#!/bin/sh
java -javaagent:./opentelemetry-javaagent-all.jar \
    -Dotel.exporter=otlp \
    -Dotel.exporter.otlp.endpoint=localhost:31501 \
    -Dotel.exporter.otlp.insecure=true \
    -jar sampleApplication.jar

