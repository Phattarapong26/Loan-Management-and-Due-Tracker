#!/bin/bash

# ===================================
# Update URLs After First Deployment
# ===================================
# ใช้หลังจาก deploy ครั้งแรกและได้ URLs แล้ว

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║              🔄 Update URLs After First Deployment                  ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# ===================================
# Get URLs from user
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Enter Your Railway URLs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "หา URLs ได้จาก Railway Dashboard → Service → Settings → Domains"
echo ""

read -p "Backend URL (e.g., https://backend-production-xxxx.up.railway.app): " BACKEND_URL
read -p "Frontend URL (e.g., https://frontend-production-yyyy.up.railway.app): " FRONTEND_URL

# Validate URLs
if [[ ! $BACKEND_URL =~ ^https:// ]]; then
    print_error "Backend URL must start with https://"
    exit 1
fi

if [[ ! $FRONTEND_URL =~ ^https:// ]]; then
    print_error "Frontend URL must start with https://"
    exit 1
fi

echo ""
print_success "URLs received:"
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# ===================================
# Update Backend Variables
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Update Backend Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_step "Updating Backend environment variables..."

railway variables --service backend set BACKEND_URL="$BACKEND_URL"
railway variables --service backend set FRONTEND_URL="$FRONTEND_URL"
railway variables --service backend set CORS_ORIGIN="$FRONTEND_URL"

print_success "Backend variables updated"
echo ""

# ===================================
# Update Frontend Variables
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Update Frontend Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_step "Updating Frontend environment variables..."

railway variables --service frontend set VITE_API_URL="$BACKEND_URL"
railway variables --service frontend set VITE_BACKEND_URL="$BACKEND_URL"

print_success "Frontend variables updated"
echo ""

# ===================================
# Trigger Redeploy
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Redeploy Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Railway will automatically redeploy after variable changes"
print_info "Waiting for redeployment..."
echo ""

sleep 5

print_step "Checking deployment status..."
railway status

echo ""

# ===================================
# Run Migrations
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Run Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Run database migrations now? (y/n): " RUN_MIGRATIONS

if [[ $RUN_MIGRATIONS == "y" || $RUN_MIGRATIONS == "Y" ]]; then
    print_step "Running migrations..."
    railway run --service backend npm run prisma:migrate
    
    print_step "Seeding admin user..."
    railway run --service backend npm run seed:admin
    
    print_success "Migrations completed"
else
    print_info "Skipped migrations. Run manually later:"
    echo "  railway run --service backend npm run prisma:migrate"
    echo "  railway run --service backend npm run seed:admin"
fi

echo ""

# ===================================
# Summary
# ===================================
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                    ✅ URLs Updated Successfully!                    ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Updated URLs:"
echo "  🔧 Backend:  $BACKEND_URL"
echo "  🎨 Frontend: $FRONTEND_URL"
echo ""
echo "Next steps:"
echo "  1. Wait for redeployment to complete (check Railway Dashboard)"
echo "  2. Test your application:"
echo "     - Backend:  curl $BACKEND_URL/health"
echo "     - Frontend: $FRONTEND_URL"
echo "  3. Check logs for any errors:"
echo "     - railway logs --service backend"
echo "     - railway logs --service frontend"
echo ""
print_success "Deployment complete! 🚀"
echo ""
