FROM adoptopenjdk/openjdk11:alpine
ARG JAR_FILE=spring-petclinic-2.3.1.BUILD-SNAPSHOT.jar
ADD ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]