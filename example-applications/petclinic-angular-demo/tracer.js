/*instrumentation.js*/
// Require dependencies
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { PeriodicExportingMetricReader, ConsoleMetricExporter } = require("@opentelemetry/sdk-metrics");
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    // optional - default url is http://localhost:4318/v1/traces
    url: "http://node-collector:4318/v1/traces",            // vielleicht muss hier ein anderer por als 4318
    // optional - collection of custom headers to be sent with each request, empty by default
    headers: {},
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://node-collector:4318/v1/metrics",   // url is optional and can be omitted - default is http://localhost:4318/v1/metrics
      headers: {},
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
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
