# Requirements for deploying the example application

You need to have Docker and Docker-compose installed. 

# Pet Clinic application

The following provides the README.md of the backend:
    [Link:](https://github.com/spring-petclinic/spring-petclinic-rest/blob/master/readme.md)

The following provides the README.md of the frontend (which can also be found in spring-petclinic-angular/README.md):
    [Link:](https://github.com/spring-petclinic/spring-petclinic-angular/blob/master/README.md)

There all the installation hints what you need to build the software completely from scratch.

To build and run the example use following command:

    docker-compose up --build -d

If a custom .env should be used, the following command builds and runs the example:

    docker-compose --env-file .env-custom up --build -d

If you plan to stop everything and delete the created volumes, use this command:

    docker-compose down -v or docker-compose --env-file .env-custom down -v

# Connect application to ExplorViz

Insert the created landscape token and token secret in  new created, but not versioned .env-custom as new values for the variables LANDSCAPE_TOKEN and TOKEN_SECRET. The blueprint of .env-custom is the provided .env file.

The traces are sent to ExplorViz's collector, which must run within the Docker network "explorviz".






