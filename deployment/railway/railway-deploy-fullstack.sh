#!/bin/bash

# Railway Full Stack Deployment Script
# Deploys both backend and frontend to Railway

set -e

echo "🚂 Railway Full Stack Deployment"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}📦 Railway CLI not found. Installing...${NC}"
    npm i -g @railway/cli
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Railway CLI${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
fi

# Login
echo ""
echo -e "${YELLOW}🔐 Logging in to Railway...${NC}"
railway login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to login${NC}"
    exit 1
fi

# Link project
echo ""
echo -e "${YELLOW}🔗 Linking to Railway project...${NC}"
railway link

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to link project${NC}"
    exit 1
fi

# Check services
echo ""
echo -e "${YELLOW}📋 Checking Railway services...${NC}"
echo ""
echo "Make sure you have these services:"
echo "  1. PostgreSQL database"
echo "  2. Redis"
echo "  3. Backend service"
echo "  4. Frontend service"
echo ""
read -p "Do you have all services set up? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please set up the required services first${NC}"
    echo ""
    echo "Setup instructions:"
    echo "  1. Add PostgreSQL database"
    echo "  2. Add Redis"
    echo "  3. Create backend service (Empty Service)"
    echo "  4. Create frontend service (Empty Service)"
    echo ""
    exit 1
fi

# Deploy Backend
echo ""
echo -e "${YELLOW}🚀 Deploying Backend...${NC}"
railway up --service backend

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend deployment initiated${NC}"

# Wait a bit
echo ""
echo -e "${YELLOW}⏳ Waiting for backend to build...${NC}"
sleep 5

# Deploy Frontend
echo ""
echo -e "${YELLOW}🚀 Deploying Frontend...${NC}"
railway up --service frontend

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend deployment initiated${NC}"

echo ""
echo -e "${GREEN}✅ Full stack deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait for builds to complete (check Railway dashboard)"
echo "  2. Setup database: ./railway-setup-db.sh"
echo "  3. Update frontend VITE_BACKEND_URL"
echo "  4. Test both services"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
