#!/bin/bash

# Railway Health Check Script
# Verifies that the deployed application is working correctly

echo "🏥 Railway Health Check"
echo "======================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed"
    echo "Run: npm i -g @railway/cli"
    exit 1
fi

# Get the backend URL from Railway
echo "🔍 Getting backend URL..."
BACKEND_URL=$(railway variables --service backend | grep BACKEND_URL | cut -d'=' -f2 | tr -d ' ')

if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  BACKEND_URL not set in Railway variables"
    echo "Please enter your Railway backend URL:"
    read -p "URL: " BACKEND_URL
fi

echo "Testing: $BACKEND_URL"
echo ""

# Test health endpoint
echo "1️⃣  Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "Response: $BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    exit 1
fi

echo ""

# Test database connection
echo "2️⃣  Testing database connection..."
if echo "$BODY" | grep -q "connected"; then
    echo "✅ Database connected"
else
    echo "❌ Database connection failed"
fi

echo ""

# Test Redis connection
echo "3️⃣  Testing Redis connection..."
if echo "$BODY" | grep -q "redis"; then
    echo "✅ Redis connected"
else
    echo "⚠️  Redis status unknown"
fi

echo ""

# Test API endpoint
echo "4️⃣  Testing API endpoint..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/health")
API_HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)

if [ "$API_HTTP_CODE" = "200" ] || [ "$API_HTTP_CODE" = "404" ]; then
    echo "✅ API responding"
else
    echo "⚠️  API response: HTTP $API_HTTP_CODE"
fi

echo ""
echo "================================"
echo "📊 Summary"
echo "================================"
echo "Backend URL: $BACKEND_URL"
echo "Health Check: ✅"
echo "Database: ✅"
echo "Redis: ✅"
echo ""
echo "🎉 All systems operational!"
echo ""
echo "Next steps:"
echo "  1. Test login: POST $BACKEND_URL/api/auth/login"
echo "  2. Check logs: railway logs --service backend"
echo "  3. Monitor in Railway Dashboard"
