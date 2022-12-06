# PlantUML-Server

PlantUML-Server sample application.

Uses official [PlantUML-Server](https://github.com/plantuml/plantuml-server) [Docker image](https://hub.docker.com/r/plantuml/plantuml-server) with a adjusted Docker entrypoint.

## Load Generation

Run JMeter script with the following command:

`jmeter -n -t plantuml-jmeter.jmx &`

Or go to localhost:18081
