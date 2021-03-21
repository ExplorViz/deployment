#!/bin/sh
java -Dinspectit.config.file-based.path="./" -javaagent:inspectit-ocelot-agent-1.8.1.jar -jar fibonacci.jar

