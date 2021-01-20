#!/bin/sh
java -javaagent:./opentelemetry-javaagent-all.jar \
    -Dotel.exporter=otlp\
    -Dotel.imr.export.interval=1000\
    -Dotel.exporter.otlp.endpoint=localhost:55680 \
    -Dotel.exporter.otlp.insecure=true\
    -Dotel.resource.attributes=service.name=petclinic\
    -jar spring-petclinic-2.3.1.BUILD-SNAPSHOT.jar

