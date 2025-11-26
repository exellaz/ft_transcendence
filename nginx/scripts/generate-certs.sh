#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
DOMAIN="${DOMAIN_NAME:-localhost}"

echo "Generating self-signed certificate for $DOMAIN..."
mkdir -p $CERT_DIR

# Generate certificate and key in one command (only if it doesn't exist)
if [ ! -f "$CERT_DIR/$DOMAIN.crt" ]; then
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$CERT_DIR/$DOMAIN.key" \
        -out "$CERT_DIR/$DOMAIN.crt" \
        -subj "/C=MY/ST=KL/L=KualaLumpur/O=42KL/OU=ft_transcendence/CN=$DOMAIN" \
        -config "/tmp/san.cnf" \
        -extensions v3_req

    echo "Certificate generated successfully!"
else
    echo "Certificate already exists."
fi

echo "Files in $CERT_DIR/:"
echo " - $DOMAIN.crt (Certificate)"
echo " - $DOMAIN.key (Private Key)"
