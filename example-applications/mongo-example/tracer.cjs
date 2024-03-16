// Require dependencies
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "http://node-collector:4318/v1/traces",    // send to trace HTTP/Protobuf receiver of collector
  }),

  metricReader: new PeriodicExportingMetricReader({   // exporting metrics in periods not constantly
    exporter: new OTLPMetricExporter({
      url: "http://node-collector:4318/v1/metrics", // send to metric HTTP/Protobuf receiver of collector
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],  // configured type of instrumentation
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start();

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
