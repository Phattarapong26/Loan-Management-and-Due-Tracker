#!/bin/bash

# Railway Set Environment Variables Script
# Automatically sets all environment variables from .env.railway.example

set -e

echo "🔧 Railway Environment Variables Setup"
echo "======================================="
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
echo -e "${YELLOW}⚠️  WARNING: This will set environment variables in Railway${NC}"
echo ""
echo "Variables to be set:"
echo "  - JWT_SECRET (will be generated)"
echo "  - JWT_REFRESH_SECRET (will be generated)"
echo "  - SESSION_SECRET (will be generated)"
echo "  - ENCRYPTION_KEY (will be generated)"
echo "  - LINE_OA_ID"
echo "  - LINE_CHANNEL_ACCESS_TOKEN"
echo "  - LINE_CHANNEL_SECRET"
echo "  - NODE_ENV"
echo "  - BACKEND_URL"
echo "  - FRONTEND_URL"
echo "  - CORS_ORIGIN"
echo "  - SMTP_HOST"
echo "  - SMTP_PORT"
echo "  - SMTP_USER"
echo "  - SMTP_PASS"
echo "  - SMTP_FROM"
echo "  - RESEND_API_KEY"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔐 Generating secrets...${NC}"

# Generate secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

echo -e "${GREEN}✅ Secrets generated${NC}"

echo ""
echo -e "${YELLOW}📝 Setting environment variables...${NC}"

# Set secrets
railway variables --service backend set JWT_SECRET="$JWT_SECRET"
railway variables --service backend set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
railway variables --service backend set SESSION_SECRET="$SESSION_SECRET"
railway variables --service backend set ENCRYPTION_KEY="$ENCRYPTION_KEY"

# Set LINE configuration
railway variables --service backend set LINE_OA_ID="@186krrbq"
railway variables --service backend set LINE_CHANNEL_ACCESS_TOKEN="tUW8OkX4MbZ2ObcNReV8U+Rls3umowBFcteq0qT4cc6HwuJ+pWBL6cqbbAl3vE1H09Hnv+rd14YjHZXyI2Xv5lHDgFZ37fh9LLxkyx4mhDp7UyV/XRvdSHUPCF0PRjvRhVw7pPa0pM8ZlIuS8zD1sQdB04t89/1O/w1cDnyilFU="
railway variables --service backend set LINE_CHANNEL_SECRET="aee13b8ce5206c3531278dd9ce0ad347"

# Set environment
railway variables --service backend set NODE_ENV="production"

# Set URLs (you'll need to update these after first deploy)
railway variables --service backend set BACKEND_URL="https://backend-production-c6a3.up.railway.app"
railway variables --service backend set FRONTEND_URL="https://code-companion-b30f2741-production.up.railway.app"
railway variables --service backend set CORS_ORIGIN="https://code-companion-b30f2741-production.up.railway.app"

# Set email configuration
railway variables --service backend set SMTP_HOST="smtp.gmail.com"
railway variables --service backend set SMTP_PORT="465"
railway variables --service backend set SMTP_USER="mulamedlab@gmail.com"
railway variables --service backend set SMTP_PASS="abcdefghijklmnop"
railway variables --service backend set SMTP_FROM="mulamedlab@gmail.com"
railway variables --service backend set RESEND_API_KEY="re_gFhfDtue_KjBw89HX31RVM4hCa43BX39f"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All environment variables set successfully!${NC}"
    echo ""
    echo "Generated secrets:"
    echo "  JWT_SECRET: $JWT_SECRET"
    echo "  JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
    echo "  SESSION_SECRET: $SESSION_SECRET"
    echo "  ENCRYPTION_KEY: $ENCRYPTION_KEY"
    echo ""
    echo -e "${YELLOW}⚠️  Save these secrets securely!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Update URLs after first deploy: ./railway-update-urls.sh"
    echo "  2. Deploy: ./railway-deploy.sh"
    echo "  3. Setup database: ./railway-setup-db.sh"
    echo ""
    echo -e "${GREEN}🎉 Done!${NC}"
else
    echo ""
    echo -e "${RED}❌ Failed to set environment variables${NC}"
    exit 1
fi
