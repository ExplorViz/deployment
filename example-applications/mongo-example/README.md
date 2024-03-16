# Requirements for deploying the example application

You need to have Docker and Docker-compose installed. 

# Mongo-Example

The following provides the README.md of the MongoDB admin panel software:
    [Link:](https://github.com/mongo-express/mongo-express/blob/master/README.md)

There all the installation hints what you need to build the software completely from scratch.

To build and run the example use following command:

    docker-compose up --build -d

If a custom .env should be used, the following command builds and runs the example:

    docker-compose --env-file .env-custom up --build -d

If you plan to stop everything and delete the created volumes, use this command:

    docker-compose down -v or docker-compose --env-file .env-custom down -v

# Connect application to ExplorViz

Insert the created landscape token and token secret in the provided .env or in your new created, but not versioned .env-custom as new values for the variables LANDSCAPE_TOKEN and TOKEN_SECRET.

The traces are sent to ExplorViz's collector, while the metrics are sent to its metric-service. Both must run within the Docker network "explorviz".
