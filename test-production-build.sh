#!/bin/bash

# ===================================
# Production Build Testing Script
# ===================================
# ทดสอบ production build ก่อน deploy

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║              🏗️  Testing Production Build                           ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# ===================================
# Test Backend Build
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing Backend Production Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd backend

print_info "Installing dependencies..."
npm install

print_info "Building backend..."
if npm run build; then
    print_success "Backend build successful"
else
    print_error "Backend build failed"
    exit 1
fi

print_info "Checking build output..."
if [ -d "dist" ]; then
    print_success "Build output directory exists"
    ls -lh dist/
else
    print_error "Build output directory not found"
    exit 1
fi

cd ..

echo ""

# ===================================
# Test Frontend Build
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing Frontend Production Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd frontend

print_info "Installing dependencies..."
npm install

print_info "Building frontend..."
if npm run build; then
    print_success "Frontend build successful"
else
    print_error "Frontend build failed"
    exit 1
fi

print_info "Checking build output..."
if [ -d "dist" ]; then
    print_success "Build output directory exists"
    ls -lh dist/
else
    print_error "Build output directory not found"
    exit 1
fi

cd ..

echo ""

# ===================================
# Summary
# ===================================
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                  ✅ Production Build Complete!                      ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Build outputs:"
echo "  🔧 Backend:  backend/dist/"
echo "  🎨 Frontend: frontend/dist/"
echo ""
echo "Next steps:"
echo "  1. Test with Docker Compose: ./deployment/docker/test-local.sh"
echo "  2. If tests pass, you're ready to deploy to Railway!"
echo ""
