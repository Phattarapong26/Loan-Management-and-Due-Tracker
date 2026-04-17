#!/bin/bash

# Railway Update URLs Script
# Updates BACKEND_URL, FRONTEND_URL, and CORS_ORIGIN after deployment

echo "🔗 Railway URL Update"
echo "===================="
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed"
    exit 1
fi

echo "🔐 Logging in..."
railway login

echo ""
echo "🔗 Linking to project..."
railway link

echo ""
echo "📝 Please enter your Railway URLs:"
echo ""

# Get backend URL
read -p "Backend URL (e.g., https://backend-production-xxxx.up.railway.app): " BACKEND_URL

# Get frontend URL
read -p "Frontend URL (e.g., https://frontend-production-xxxx.up.railway.app): " FRONTEND_URL

# Confirm
echo ""
echo "Will set:"
echo "  BACKEND_URL=$BACKEND_URL"
echo "  FRONTEND_URL=$FRONTEND_URL"
echo "  CORS_ORIGIN=$FRONTEND_URL"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
fi

# Set variables
echo ""
echo "🔧 Updating variables..."

railway variables --service backend set BACKEND_URL="$BACKEND_URL"
railway variables --service backend set FRONTEND_URL="$FRONTEND_URL"
railway variables --service backend set CORS_ORIGIN="$FRONTEND_URL"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ URLs updated successfully!"
    echo ""
    echo "Railway will automatically restart the service."
    echo "Wait a moment, then test:"
    echo "  curl $BACKEND_URL/health"
else
    echo ""
    echo "❌ Failed to update URLs"
    exit 1
fi
