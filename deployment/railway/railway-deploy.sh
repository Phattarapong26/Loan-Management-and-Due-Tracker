#!/bin/bash

# Railway Complete Deployment Script
# This script handles the complete deployment process to Railway

set -e  # Exit on error

echo "🚂 Railway Complete Deployment"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}📦 Railway CLI not found. Installing...${NC}"
    npm i -g @railway/cli
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Railway CLI${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
fi

# Login to Railway
echo ""
echo -e "${YELLOW}🔐 Logging in to Railway...${NC}"
railway login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to login${NC}"
    exit 1
fi

# Link to project
echo ""
echo -e "${YELLOW}🔗 Linking to Railway project...${NC}"
railway link

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to link project${NC}"
    exit 1
fi

# Check if services exist
echo ""
echo -e "${YELLOW}📋 Checking Railway services...${NC}"
echo ""
echo "Make sure you have these services in Railway:"
echo "  1. PostgreSQL database"
echo "  2. Redis"
echo "  3. Backend service"
echo ""
read -p "Do you have all services set up? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please set up the required services in Railway first:${NC}"
    echo "  1. Add PostgreSQL database"
    echo "  2. Add Redis"
    echo "  3. Create backend service"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Deploy to Railway
echo ""
echo -e "${YELLOW}🚀 Deploying to Railway...${NC}"
railway up --service backend

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait for build to complete (check Railway dashboard)"
echo "  2. Run database setup: ./railway-setup-db.sh"
echo "  3. Check logs: railway logs --service backend"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
