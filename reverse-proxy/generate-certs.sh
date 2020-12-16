#!/bin/bash

# Generate SSL certificate in Docker volume for certificates.
mkdir -p certs
cd ./certs

# Generate random password.
pass=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 1023)

# Generate SSL keys.
openssl genrsa -des3 -passout pass:$pass -out server.pass.key 2048
openssl rsa -passin pass:$pass -in server.pass.key -out server.key
rm server.pass.key

# Generate SLL certificate signing request.
openssl req -new -key server.key -out server.csr

# Generate SSL certificate.
openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt
