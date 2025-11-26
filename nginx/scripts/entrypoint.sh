#!/bin/sh
set -e

DOMAIN_NAME="${DOMAIN_NAME:-localhost}"

echo "DOMAIN_NAME is set to: ${DOMAIN_NAME}"

# Generate SAN configuration file
cat > /tmp/san.cnf <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = v3_req
distinguished_name = dn

[ dn ]
CN = ${DOMAIN_NAME}

[ v3_req ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = ${DOMAIN_NAME}
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

echo "Generated san.cnf with CN = ${DOMAIN_NAME}"

echo "Checking for SSL certificates..."
/scripts/generate-certs.sh

echo "Substituting environment variables in NGINX config..."
export DOMAIN_NAME
envsubst '${DOMAIN_NAME}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Generated NGINX config:"
cat /etc/nginx/nginx.conf | grep -A 3 "ssl_certificate"

echo "Starting NGINX..."
exec "$@"
