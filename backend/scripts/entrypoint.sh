#!/bin/bash
set -e

DOMAIN_NAME="${DOMAIN_NAME:-localhost}"
cat > scripts/san.cnf <<EOF
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
IP.1 = ${DOMAIN_NAME}
EOF

echo "Generated san.cnf with CN and IP.1 = ${DOMAIN_NAME}"

echo "Starting backend setup..."

if [ "$HTTPS_ENABLED" = "true" ]; then
  echo "HTTPS enabled, checking for SSL certificates..."
  ./scripts/generate-certs.sh
else
  echo "HTTPS disabled, skipping certificate generation"
fi

echo "Setting up database..."

npx prisma migrate dev --name init || echo "Migration already exists or failed"

echo "Setup complete! Starting application..."

exec "$@"
