#!/bin/bash

# Railway Database Push Script (Faster alternative to migrations)
# This script pushes Prisma schema directly to Railway database

echo "🚀 Railway Database Push"
echo "========================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "📦 Installing Railway CLI..."
    npm i -g @railway/cli
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Railway CLI"
        exit 1
    fi
fi

echo "🔐 Logging in to Railway..."
railway login

echo ""
echo "🔗 Linking to project..."
railway link

echo ""
echo "📊 Pushing database schema..."
echo "⚠️  This will sync your Prisma schema with the database"
echo ""

railway run --service backend npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema pushed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Seed the database: ./railway-seed.sh"
    echo "2. Restart your Railway service"
    echo "3. Test the API"
else
    echo ""
    echo "❌ Database push failed!"
    echo "Check Railway logs for details"
fi
