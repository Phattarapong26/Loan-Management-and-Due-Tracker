#!/bin/bash

# Railway Database Seed Script
# Seeds the Railway database with initial data

echo "🌱 Railway Database Seed"
echo "========================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Please run: npm i -g @railway/cli"
    exit 1
fi

echo "🔐 Logging in to Railway..."
railway login

echo ""
echo "🔗 Linking to project..."
railway link

echo ""
echo "🌱 Seeding database..."
echo ""

# Step 1: Create admin user first
echo "📝 Step 1: Creating admin user..."
railway run --service backend npm run seed:admin

if [ $? -ne 0 ]; then
    echo "❌ Failed to create admin user"
    exit 1
fi

echo "✅ Admin user created"
echo ""

# Step 2: Run production seed
echo "📝 Step 2: Running production seed..."
railway run --service backend npm run seed:production-2025

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database seeded successfully!"
    echo ""
    echo "Default users created:"
    echo "- Admin: admin@smebank.com / Admin@123"
    echo "- Manager: manager@smebank.com / Manager@123"
    echo "- Officer: officer@smebank.com / Officer@123"
    echo ""
    echo "🎉 Your Railway deployment is ready!"
else
    echo ""
    echo "❌ Seeding failed!"
    echo "Check Railway logs for details"
fi
