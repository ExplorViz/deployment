# Automatic instrumentation setup

First download all necessary packages:
npm install express mongoose body-parser
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/node
npm install @opentelemetry/tracing
npm install @opentelemetry/exporter-collector
npm install @opentelemetry/exporter-metrics-otlp-proto

# Run the Application

To use this application in a docker environment, first you need to build this application:
docker-compose up --build -d

Go to http://localhost:3000/rolldice to generate more trace and metric data.

Now you can go to http://localhost:9411 to see your traces and to http://localhost:9090 to see your metrics