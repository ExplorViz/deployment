/*instrumentation.js*/
// Require dependencies
const { WebTracerProvider, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-web');
const { getWebAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-web');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ZoneContextManager } = require('@opentelemetry/context-zone');
const { B3Propagator } = require('@opentelemetry/propagator-b3');

// metrics
const { MeterProvider, ConsoleMetricExporter } = require('@opentelemetry/sdk-metrics-base');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');



const exporter = new OTLPTraceExporter({
  // optional - default url is http://localhost:4318/v1/traces
  url: "http://localhost:4318/v1/traces",   
  // optional - collection of custom headers to be sent with each request, empty by default
  headers: {},
});

const provider = new WebTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter)); 
provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new B3Propagator(),
});


const otlpExporter = new OTLPMetricExporter({
  url: "http://localhost:4318/v1/metrics",
  headers: {},
});

const consoleExporter = new ConsoleMetricExporter();

// Erstellen eines MeterProviders mit beiden Exportern
const meterProvider = new MeterProvider({
  exporter: [otlpExporter, consoleExporter],
  interval: 1000, // Exportintervall in Millisekunden
});

// Registrierung des MeterProviders
// meterProvider.register();


registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    getWebAutoInstrumentations({
      // load custom configuration for xml-http-request instrumentation
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: /.*/,
        clearTimingResources: true,
      },
      // '@opentelemetry/instrumentation-document-load': {},
      // '@opentelemetry/instrumentation-user-interaction': {},
      // '@opentelemetry/instrumentation-fetch': {},
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

