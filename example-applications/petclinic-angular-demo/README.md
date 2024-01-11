


## Automatic instrumentation setup

First download all necessary packages:

npm install express mongoose body-parser
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/node
npm install @opentelemetry/tracing
npm install @opentelemetry/exporter-collector
npm install @opentelemetry/exporter-metrics-otlp-proto

npm install @opentelemetry/exporter-collector //depreciated


npm install @opentelemetry/sdk-trace-web
npm install @opentelemetry/auto-instrumentations-web
npm install @opentelemetry/context-zone



# Run the Application 

To use this application in a docker environment, first you need to build this application:

docker-compose up --build -d

docker-compose --env-file .env-custom up -d

docker-compose --env-file .env-custom down -v




Go to http://localhost:18080/rolldice to generate more trace data.




