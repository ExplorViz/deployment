## BEGIN Build stage

FROM eclipse-temurin:17-jdk as build

# Install Git
RUN apt update && apt install -y git && rm -rf /var/lib/apt/lists/*

# Clone the repository
RUN git clone https://github.com/spring-petclinic/spring-petclinic-rest.git petclinic && \
    cd petclinic && git checkout master

# Set environment variable for Maven
ENV MVNW_VERBOSE=true

# Package the application
RUN cd petclinic && ./mvnw package -q && mv target/*.jar /app.jar

## END Build stage

## BEGIN Publish stage

FROM eclipse-temurin:17-alpine
COPY --from=build /app.jar /app.jar
CMD java -jar /app.jar

## END Publish stage
