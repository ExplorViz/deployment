#!/bin/sh

echo -e 'Creating kafka topics'

kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic telemetry.entities --replication-factor 1 --partitions 1

kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic tokens.events --replication-factor 1 --partitions 20

echo -e 'Successfully created the following topics:'
kafka-topics --bootstrap-server kafka:${KAFKA_INT_PORT} --list
