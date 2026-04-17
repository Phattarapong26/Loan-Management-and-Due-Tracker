# Docker Deployment

คู่มือการ deploy ด้วย Docker

## 📋 Prerequisites

- Docker installed
- Docker Compose installed

## 🚀 Quick Start

### Start All Services
```bash
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

## 🔧 Services

### PostgreSQL Database
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `duetracker`

### Redis Cache
- Port: `6379`
- No password (development)

### Backend API
- Port: `3000`
- URL: `http://localhost:3000`

### Frontend Web App
- Port: `5173`
- URL: `http://localhost:5173`

## 📝 Commands

### Build Services
```bash
docker-compose build
```

### Rebuild Specific Service
```bash
docker-compose build backend
docker-compose build frontend
```

### Start Specific Service
```bash
docker-compose up backend
docker-compose up frontend
```

### View Service Logs
```bash
docker-compose logs postgres
docker-compose logs redis
docker-compose logs backend
docker-compose logs frontend
```

### Check Database
```bash
docker-compose exec postgres psql -U postgres -d duetracker
```

### Check Redis
```bash
docker-compose exec redis redis-cli
# Test: PING (should return PONG)
```

### Clean Up
```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes database data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 🔍 Health Checks

### Check Backend
```bash
curl http://localhost:3000/health
```

### Check Frontend
```bash
curl http://localhost:5173
```

### Check Database
```bash
docker-compose exec postgres pg_isready -U postgres
```

### Check Redis
```bash
docker-compose exec redis redis-cli ping
```

## 🐛 Troubleshooting

### View Container Status
```bash
docker-compose ps
```

### Restart Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### View Resource Usage
```bash
docker stats
```

### Access Container Shell
```bash
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec postgres sh
```

## 📖 Configuration

แก้ไข `docker-compose.yml` เพื่อปรับแต่ง:
- Environment variables
- Port mappings
- Volume mounts
- Resource limits

## 🔐 Production Deployment

สำหรับ production ควร:
1. ใช้ environment variables จากไฟล์ `.env`
2. ตั้งค่า resource limits
3. ใช้ secrets management
4. Enable SSL/TLS
5. Setup monitoring และ logging

ดูตัวอย่าง production config ใน `docker-compose.prod.yml`
