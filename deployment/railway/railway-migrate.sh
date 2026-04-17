#!/bin/bash

# Railway Database Migration Script
# This script runs Prisma migrations on Railway

echo "🚀 Railway Database Migration"
echo "=============================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "📦 Installing Railway CLI..."
    npm i -g @railway/cli
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Railway CLI"
        echo "Please install manually: npm i -g @railway/cli"
        exit 1
    fi
    echo "✅ Railway CLI installed successfully"
fi

echo ""
echo "🔐 Please login to Railway..."
railway login

if [ $? -ne 0 ]; then
    echo "❌ Failed to login to Railway"
    exit 1
fi

echo ""
echo "🔗 Linking to your Railway project..."
railway link

if [ $? -ne 0 ]; then
    echo "❌ Failed to link to Railway project"
    exit 1
fi

echo ""
echo "📊 Running Prisma migrations..."
railway run --service backend npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Seed the database: ./railway-seed.sh"
    echo "2. Check your Railway deployment logs"
    echo "3. Test the API: curl https://your-backend.up.railway.app/health"
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check DATABASE_URL is set in Railway"
    echo "2. Verify Postgres service is running"
    echo "3. Check Railway logs for errors"
    echo ""
    echo "Alternative: Use db push instead of migrate"
    echo "  railway run --service backend npx prisma db push"
fi
