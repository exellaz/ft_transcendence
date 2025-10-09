#!/bin/sh
set -e  # exit on errors

# Patch tsconfig.json
sed -i 's#\.\./shared/\*#./shared/*#g' tsconfig.json

# Run migrations (optional)
npx prisma migrate dev

# Start the app (this keeps container alive)
exec npm run dev