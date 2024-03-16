/*instrumentation.js*/
// Require dependencies
const { WebTracerProvider} = require('@opentelemetry/sdk-trace-web');
const { getWebAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-web');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ZoneContextManager } = require('@opentelemetry/context-zone');
const { B3Propagator } = require('@opentelemetry/propagator-b3');

const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const exporter = new OTLPTraceExporter({
  url: "http://collector:4318/v1/traces",
});

// Setting a service name
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: "Petclinic-Angular"
})

/**
 * Example, how adding attributes to the span works. However more action than adding is not possible.
 */
class CustomSpanProcessor extends SimpleSpanProcessor {
  process(span) {
    console.log(new Error().stack);
    span.setAttribute("methodName", "meineMethode");
    span.
    super.process(span);
  }
}

const provider = new WebTracerProvider({
  resource: resource,
});
provider.addSpanProcessor(new CustomSpanProcessor(exporter)); // normally just SimpleSpanProcessor
provider.register({
  contextManager: new ZoneContextManager(), // connect spans to its child span
  propagator: new B3Propagator(), // gathers more information
});

// function call with set provider and instrumentation type
registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    getWebAutoInstrumentations({
    }),
  ],
});

