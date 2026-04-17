#!/bin/bash

# ===================================
# Local Testing Script
# ===================================
# ทดสอบ Docker Compose ก่อน deploy จริง

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║              🧪 Local Testing with Docker Compose                   ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
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
# Step 1: Check Prerequisites
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
print_success "Docker is installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_success "Docker Compose is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running"
    exit 1
fi
print_success "Docker is running"

echo ""

# ===================================
# Step 2: Clean Up Old Containers
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Cleaning Up Old Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Stopping old containers..."
docker-compose down -v 2>/dev/null || true
print_success "Old containers cleaned up"

echo ""

# ===================================
# Step 3: Build and Start Services
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Building and Starting Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Building images..."
docker-compose build

print_info "Starting services..."
docker-compose up -d

print_success "Services started"

echo ""

# ===================================
# Step 4: Wait for Services
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Waiting for Services to be Ready"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Waiting for PostgreSQL..."
sleep 10

print_info "Waiting for Backend..."
sleep 15

print_info "Waiting for Frontend..."
sleep 10

print_success "All services should be ready"

echo ""

# ===================================
# Step 5: Check Services Status
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Checking Services Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker-compose ps

# Count running containers
RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l | tr -d ' ')
print_info "Running containers: $RUNNING_CONTAINERS/4"

if [ "$RUNNING_CONTAINERS" -eq 4 ]; then
    print_success "All 4 containers are running"
else
    print_error "Expected 4 containers, but only $RUNNING_CONTAINERS are running"
fi

echo ""

# ===================================
# Step 6: Test Endpoints
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Testing Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test PostgreSQL
print_info "Testing PostgreSQL..."
if docker exec duetracker-postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_error "PostgreSQL is not ready"
fi

# Test Redis
print_info "Testing Redis..."
if docker exec duetracker-redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is responding"
else
    print_error "Redis is not responding"
fi

# Test Backend
print_info "Testing Backend (http://localhost:3000/health)..."
if curl -f -s http://localhost:3000/health > /dev/null; then
    print_success "Backend is responding"
else
    print_error "Backend is not responding"
    echo ""
    print_info "Backend logs:"
    docker-compose logs --tail=50 backend
    exit 1
fi

# Test Frontend
print_info "Testing Frontend (http://localhost:5173)..."
if curl -f -s http://localhost:5173 > /dev/null; then
    print_success "Frontend is responding"
else
    print_error "Frontend is not responding"
    echo ""
    print_info "Frontend logs:"
    docker-compose logs --tail=50 frontend
    exit 1
fi

echo ""

# ===================================
# Step 7: Check Logs
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Checking Logs for Errors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Checking Backend logs..."
if docker-compose logs backend | grep -i "error" | grep -v "0 error" > /dev/null; then
    print_error "Found errors in Backend logs"
    docker-compose logs --tail=20 backend | grep -i "error"
else
    print_success "No critical errors in Backend logs"
fi

print_info "Checking Frontend logs..."
if docker-compose logs frontend | grep -i "error" | grep -v "0 error" > /dev/null; then
    print_error "Found errors in Frontend logs"
    docker-compose logs --tail=20 frontend | grep -i "error"
else
    print_success "No critical errors in Frontend logs"
fi

echo ""

# ===================================
# Summary
# ===================================
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                        ✅ Testing Complete!                         ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Services are running (4 containers):"
echo "  �️  PostgreSQL: localhost:5432"
echo "  🔴 Redis:      localhost:6379"
echo "  🔧 Backend:    http://localhost:3000"
echo "  🎨 Frontend:   http://localhost:5173"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Test login and features"
echo "  3. Check for any errors in browser console"
echo "  4. If everything works, you're ready to deploy!"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f postgres"
echo "  docker-compose logs -f redis"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
