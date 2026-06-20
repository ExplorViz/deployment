#!/bin/sh

echo -e 'Creating kafka topics'

kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic telemetry.spans.raw --replication-factor 1 --partitions 20

kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic telemetry.spans.parsed --replication-factor 1 --partitions 1

kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic tokens.events --replication-factor 1 --partitions 20

echo -e 'Successfully created the following topics:'
kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --list
