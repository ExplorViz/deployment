/*instrumentation.js*/
// Require dependencies
const { WebTracerProvider, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-web');
const { getWebAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-web');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ZoneContextManager } = require('@opentelemetry/context-zone');
const { B3Propagator } = require('@opentelemetry/propagator-b3');


const exporter = new OTLPTraceExporter({
  // optional - default url is http://localhost:4318/v1/traces
  url: "http://localhost:4318/v1/traces",
  // optional - collection of custom headers to be sent with each request, empty by default
  headers: {},
});

class CustomSpanProcessor extends SimpleSpanProcessor {
  process(span) {
    console.log(new Error().stack);
    span.setAttribute("methodName", "meineMethode");
    super.process(span);
  }
}

const provider = new WebTracerProvider();
provider.addSpanProcessor(new CustomSpanProcessor(new OTLPTraceExporter())); 
provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new B3Propagator(),
});

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    getWebAutoInstrumentations({
      // load custom configuration for xml-http-request instrumentation
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: /.*/,
        clearTimingResources: true,
      },
    }),
  ],
});





// const sdk = new NodeSDK({
//   traceExporter: new OTLPTraceExporter({
//     // optional - default url is http://localhost:4318/v1/traces
//     url: "http://otel-collector:4318/v1/traces",
//     // optional - collection of custom headers to be sent with each request, empty by default
//     headers: {},
//   }),
//   metricReader: new PeriodicExportingMetricReader({
//     exporter: new ConsoleMetricExporter(),
//   }),
//   instrumentations: [getNodeAutoInstrumentations()],
// });

// // initialize the SDK and register with the OpenTelemetry API
// // this enables the API to record telemetry
// sdk.start();

// // gracefully shut down the SDK on process exit
// process.on('SIGTERM', () => {
//   sdk.shutdown()
//     .then(() => console.log('Tracing terminated'))
//     .catch((error) => console.log('Error terminating tracing', error))
//     .finally(() => process.exit(0));
// });

