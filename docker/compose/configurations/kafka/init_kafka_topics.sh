#!/bin/sh

echo 'Creating kafka topics'

/opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic telemetry.entities --replication-factor 1 --partitions 1

/opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:${KAFKA_INT_PORT} --create --if-not-exists --topic tokens.events --replication-factor 1 --partitions 20
