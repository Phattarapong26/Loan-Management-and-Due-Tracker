#!/bin/bash

# Thailand Timezone Checker Script
# ตรวจสอบการตั้งค่า timezone ในระบบ

echo "🕐 Thailand Timezone Checker"
echo "=================================="

# Check environment variables
echo "📋 Environment Variables:"
echo "TZ: ${TZ:-'Not set'}"
echo "TIMEZONE: ${TIMEZONE:-'Not set'}"

# Check system timezone
echo ""
echo "🖥️  System Information:"
echo "System TZ: $(date +%Z)"
echo "System Time: $(date)"
echo "UTC Time: $(date -u)"

# Check if backend is running
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
echo ""
echo "🔍 Backend Timezone Check:"
echo "Backend URL: $BACKEND_URL"

# Test timezone API
if command -v curl &> /dev/null; then
    echo "Testing timezone API..."
    RESPONSE=$(curl -s "$BACKEND_URL/api/timezone" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "✅ API Response:"
        if command -v jq &> /dev/null; then
            echo "$RESPONSE" | jq .
        else
            echo "$RESPONSE"
        fi
    else
        echo "❌ Failed to connect to backend API"
        echo "Make sure backend is running on $BACKEND_URL"
    fi
else
    echo "❌ curl not found, skipping API test"
fi

# Check Node.js timezone (if node is available)
if command -v node &> /dev/null; then
    echo ""
    echo "🟢 Node.js Timezone Check:"
    node -e "
        console.log('Node TZ:', process.env.TZ || 'Not set');
        console.log('Current Time:', new Date().toString());
        console.log('UTC Time:', new Date().toISOString());
        console.log('Thailand Time:', new Date().toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'}));
        console.log('Timezone Offset:', new Date().getTimezoneOffset());
    "
fi

# Recommendations
echo ""
echo "💡 Recommendations:"
echo "1. Set TZ=Asia/Bangkok in your environment"
echo "2. Use TimezoneUtil for all date operations"
echo "3. Store UTC dates in database"
echo "4. Display Thailand time in UI"
echo ""
echo "📚 See TIMEZONE_CLOUDFLARE_GUIDE.md for more details"