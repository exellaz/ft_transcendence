#!/bin/bash
set -e

echo "Starting backend setup..."

echo "Setting up database..."

npx prisma migrate dev --name init || echo "Migration already exists or failed"

echo "Setup complete! Starting application..."

exec "$@"
