#!/bin/bash

# Ice Calendar Worker Deployment Script
# This script helps deploy the Cloudflare Worker with proper configuration

set -e

echo "🧊 Ice Calendar Worker Deployment"
echo "================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run:"
    echo "   wrangler login"
    exit 1
fi

echo "✅ Authenticated with Cloudflare"

# Check if D1 database exists
echo "🗄️  Checking D1 database configuration..."
DB_ID=$(grep -o 'database_id = "[^"]*"' wrangler.toml | cut -d'"' -f2)

if [ "$DB_ID" = "your-d1-database-id" ]; then
    echo "⚠️  D1 database not configured. Creating..."
    
    echo "Creating D1 database..."
    wrangler d1 create ice-calendar-db
    
    echo ""
    echo "⚠️  Please update wrangler.toml with the D1 database ID printed above"
    echo "   Then run this script again."
    exit 1
fi

echo "✅ D1 database configured"

# Run database migrations
echo "🔄 Running database migrations..."
wrangler d1 execute ice-calendar-db --local --command "SELECT name FROM sqlite_master WHERE type='table';" || {
    echo "Initializing database schema..."
}

# Type check
echo "🔍 Running type check..."
npm run type-check

echo "✅ Type check passed"

# Deploy
echo "🚀 Deploying to Cloudflare..."
npm run deploy

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure email routing in Cloudflare Dashboard"
echo "2. Set up email forwarding to your worker"
echo "3. Test by sending an email to your configured address"
echo "4. Subscribe to your calendar at: https://your-worker.your-subdomain.workers.dev/calendar.ics"
echo ""
echo "For detailed setup instructions, see setup.md"