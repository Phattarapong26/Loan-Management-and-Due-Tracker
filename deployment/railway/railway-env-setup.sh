#!/bin/bash

# Railway Environment Variables Setup Script
# This script helps you set up environment variables using Railway CLI

echo "🚂 Railway Environment Variables Setup"
echo "========================================"
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
echo "📝 Setting LINE environment variables..."

# Set LINE variables
railway variables set LINE_OA_ID="@186krrbq"
railway variables set LINE_CHANNEL_ACCESS_TOKEN="tUW8OkX4MbZ2ObcNReV8U+Rls3umowBFcteq0qT4cc6HwuJ+pWBL6cqbbAl3vE1H09Hnv+rd14YjHZXyI2Xv5lHDgFZ37fh9LLxkyx4mhDp7UyV/XRvdSHUPCF0PRjvRhVw7pPa0pM8ZlIuS8zD1sQdB04t89/1O/w1cDnyilFU="
railway variables set LINE_CHANNEL_SECRET="aee13b8ce5206c3531278dd9ce0ad347"

if [ $? -eq 0 ]; then
    echo "✅ LINE environment variables set successfully"
else
    echo "❌ Failed to set environment variables"
    exit 1
fi

echo ""
echo "🎯 Environment variables have been updated!"
echo ""
echo "Next steps:"
echo "1. Railway will automatically redeploy your service"
echo "2. Monitor the deployment in Railway dashboard"
echo "3. Check logs for successful startup"
echo "4. Test the /health endpoint"
echo ""
echo "To manually trigger a deployment, run:"
echo "  railway up"
echo ""
echo "To view current variables, run:"
echo "  railway variables"
echo ""
echo "✨ Done!"
