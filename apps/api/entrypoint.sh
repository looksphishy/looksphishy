#!/bin/sh
set -e

echo "Running database schema push..."
cd /app/apps/api
npx drizzle-kit push

echo "Starting API server..."
cd /app
exec node apps/api/dist/main.js
