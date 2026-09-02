#!/bin/sh
set -e

if [ ! -f /app/data/dev.db ]; then
  echo "Initializing database..."
  node node_modules/prisma/build/index.js db push --skip-generate
  node prisma/seed.js
else
  echo "Applying any schema changes..."
  node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>/dev/null || true
fi

exec "$@"
