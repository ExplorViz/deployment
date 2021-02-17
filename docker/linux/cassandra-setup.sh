#!/bin/sh

docker exec -it cassandra-trace-service cqlsh -u cassandra -p cassandra -e "CREATE KEYSPACE IF NOT EXISTS explorviz WITH replication = {'class':'SimpleStrategy', 'replication_factor':1};"

docker exec -it cassandra-trace-service cqlsh -u cassandra -p cassandra -e "CREATE TYPE IF NOT EXISTS explorviz.span (
  landscape_token text,
  trace_id text,
  span_id text,
  parent_span_id text,
  start_time bigint,
  end_time bigint,
  hash_code text
);"

docker exec -it cassandra-trace-service cqlsh -u cassandra -p cassandra -e "CREATE TABLE IF NOT EXISTS explorviz.trace (
  landscape_token text,
  start_time bigint,
  trace_id text,
  end_time bigint,
  duration bigint,
  overall_request_count int,
  trace_count int,
  span_list frozen<list<frozen<explorviz.span>>>,
  PRIMARY KEY ((landscape_token), start_time, trace_id)
);"

docker exec -it cassandra-trace-service cqlsh -u cassandra -p cassandra -e "CREATE INDEX IF NOT EXISTS trace_id_index ON explorviz.trace (trace_id);"