#!/bin/bash

# Generate SSL certificate in Docker volume for certificates.
cd ./certs

# Generate SSL keys.
openssl genrsa -des3 -passout pass:x -out server.pass.key 2048
openssl rsa -passin pass:x -in server.pass.key -out server.key
rm server.pass.key

# Generate SLL certificate signing request.
openssl req -new -key server.key -out server.csr

# Generate SSL certificate.
openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt