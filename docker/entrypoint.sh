#!/bin/sh
set -e

# Ensure Prisma has correct binary for alpine; already bundled via @prisma/client
# Run migrations (safe on SQLite)
./node_modules/.bin/prisma migrate deploy

# Start the server
node dist/index.js