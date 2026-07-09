#!/bin/bash
# Dexto Dev Server Startup Script
# Ensures DATABASE_URL is loaded correctly from .env file

cd /home/z/my-project

# Kill any existing dev servers
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Clear cache
rm -rf .next/cache 2>/dev/null

# Read DATABASE_URL and JWT_SECRET from .env file
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# Verify
echo "============================================"
echo "  Dexto Dev Server Starting..."
echo "============================================"
echo "DATABASE_URL: ${DATABASE_URL:0:60}..."
echo "============================================"

# Start dev server
exec bun run dev
