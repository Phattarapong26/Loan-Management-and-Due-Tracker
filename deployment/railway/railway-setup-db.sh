#!/bin/bash

# Railway Database Setup Script
# Complete database initialization for Railway deployment

set -e  # Exit on error

echo "🗄️  Railway Database Setup"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Run: npm i -g @railway/cli"
    exit 1
fi

echo -e "${YELLOW}🔐 Logging in to Railway...${NC}"
railway login

echo ""
echo -e "${YELLOW}🔗 Linking to project...${NC}"
railway link

echo ""
echo -e "${YELLOW}📊 Step 1: Generating Prisma Client...${NC}"
railway run --service backend npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate Prisma client${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📊 Step 2: Pushing database schema...${NC}"
echo "This will sync your Prisma schema with the database"
railway run --service backend npx prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push schema${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check DATABASE_URL is set correctly"
    echo "  2. Verify PostgreSQL service is running"
    echo "  3. Check Railway logs for errors"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Database schema created${NC}"

echo ""
echo -e "${YELLOW}🌱 Step 3: Seeding database...${NC}"
echo ""

# Create admin user
echo "Creating admin user..."
railway run --service backend npm run seed:admin

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Admin seed failed, but continuing...${NC}"
fi

# Run production seed
echo ""
echo "Running production seed..."
railway run --service backend npm run seed:production-2025

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Database setup complete!${NC}"
    echo ""
    echo "Default credentials:"
    echo "  Admin:   admin@smebank.com / Admin@123"
    echo "  Manager: manager@smebank.com / Manager@123"
    echo "  Officer: officer@smebank.com / Officer@123"
    echo ""
    echo "Next steps:"
    echo "  1. Test health endpoint: curl https://your-app.up.railway.app/health"
    echo "  2. Check logs: railway logs --service backend"
    echo "  3. Monitor in Railway dashboard"
    echo ""
    echo -e "${GREEN}🎉 Your app is ready!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Seeding completed with warnings${NC}"
    echo "Check Railway logs for details"
fi
