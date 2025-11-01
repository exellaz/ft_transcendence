#!/bin/bash
set -e

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
