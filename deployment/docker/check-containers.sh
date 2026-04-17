#!/bin/bash

# ===================================
# Check Docker Containers Status
# ===================================

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                    🐳 Docker Containers Status                      ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if containers are running
check_container() {
    local container_name=$1
    local port=$2
    local service_name=$3
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✅ ${service_name}${NC} (${container_name}) - Port: ${port}"
        return 0
    else
        echo -e "${RED}❌ ${service_name}${NC} (${container_name}) - Not running"
        return 1
    fi
}

echo "Checking containers..."
echo ""

# Check all 4 containers
check_container "duetracker-postgres" "5432" "PostgreSQL"
check_container "duetracker-redis" "6379" "Redis"
check_container "duetracker-backend" "3000" "Backend"
check_container "duetracker-frontend" "5173" "Frontend"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count running containers
RUNNING=$(docker ps --filter "name=duetracker-" --format '{{.Names}}' | wc -l | tr -d ' ')
echo ""
echo -e "Running containers: ${YELLOW}${RUNNING}/4${NC}"

if [ "$RUNNING" -eq 4 ]; then
    echo -e "${GREEN}✅ All containers are running!${NC}"
    echo ""
    echo "Access services:"
    echo "  🗄️  PostgreSQL: localhost:5432"
    echo "  🔴 Redis:      localhost:6379"
    echo "  🔧 Backend:    http://localhost:3000"
    echo "  🎨 Frontend:   http://localhost:5173"
else
    echo -e "${RED}⚠️  Some containers are not running${NC}"
    echo ""
    echo "To start all containers:"
    echo "  cd deployment/docker"
    echo "  docker-compose up -d"
fi

echo ""
