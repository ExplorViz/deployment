-- Modified version of the schema from the ClickHouse exporter:
-- https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/internal/sqltemplates/metrics_sum_table.sql

CREATE TABLE IF NOT EXISTS otel_metrics_sum (
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ResourceSchemaUrl String CODEC(ZSTD(1)),
    ScopeName String CODEC(ZSTD(1)),
    ScopeVersion String CODEC(ZSTD(1)),
    ScopeAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeDroppedAttrCount UInt32 CODEC(ZSTD(1)),
    ScopeSchemaUrl String CODEC(ZSTD(1)),
    ServiceName LowCardinality(String) CODEC(ZSTD(1)),
    MetricName LowCardinality(String) CODEC(ZSTD(1)),
    MetricDescription String CODEC(ZSTD(1)),
    MetricUnit String CODEC(ZSTD(1)),
    Attributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    StartTimeUnix DateTime CODEC(Delta, ZSTD(1)),
    TimeUnix DateTime CODEC(Delta, ZSTD(1)),
    Value Float64 CODEC(ZSTD(1)),
    Flags UInt32  CODEC(ZSTD(1)),
    Exemplars Nested (
        FilteredAttributes Map(LowCardinality(String), String),
        TimeUnix DateTime,
        Value Float64,
        SpanId String,
        TraceId String
    ) CODEC(ZSTD(1)),
    AggregationTemporality Int32 CODEC(ZSTD(1)),
    IsMonotonic Boolean CODEC(Delta, ZSTD(1)),

    -- Materialized columns for ExplorViz
    Timestamp_ns Int64 MATERIALIZED toUnixTimestamp64Nano(toDateTime64(TimeUnix, 9, 'UTC')),
    CommitHash String MATERIALIZED Attributes['vcs.ref.head.revision'],
    ExplorvizTelemetryKey String MATERIALIZED Attributes['explorviz.entity.telemetrykey'],
    ExplorvizServiceName String MATERIALIZED Attributes['explorviz.service.name'],
    ExplorvizTokenId String MATERIALIZED Attributes['explorviz.token.id'],

    INDEX idx_res_attr_key mapKeys(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_res_attr_value mapValues(ResourceAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_key mapKeys(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_scope_attr_value mapValues(ScopeAttributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_key mapKeys(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_attr_value mapValues(Attributes) TYPE bloom_filter(0.01) GRANULARITY 1,
    INDEX idx_time_minmax TimeUnix TYPE minmax GRANULARITY 1
    ) ENGINE = MergeTree
    PARTITION BY toDate(TimeUnix)
    ORDER BY (ServiceName, MetricName, toStartOfHour(TimeUnix), cityHash64(Attributes), TimeUnix)
    SETTINGS index_granularity=8192, ttl_only_drop_parts = 1
