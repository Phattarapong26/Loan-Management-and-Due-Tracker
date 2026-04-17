# 🐳 Docker Setup - 4 Containers

## 📦 Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DueTracker System                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │    Redis     │  │   Backend    │    │
│  │              │  │              │  │              │    │
│  │  Port: 5432  │  │  Port: 6379  │  │  Port: 3000  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         └──────────────────┴──────────────────┘            │
│                            │                               │
│                   ┌──────────────┐                        │
│                   │   Frontend   │                        │
│                   │              │                        │
│                   │  Port: 5173  │                        │
│                   └──────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 4 Containers

### 1. PostgreSQL (duetracker-postgres)
- **Image**: `postgres:15-alpine`
- **Port**: `5432`
- **Purpose**: Main database
- **Credentials**:
  - User: `postgres`
  - Password: `postgres`
  - Database: `duetracker`

### 2. Redis (duetracker-redis)
- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Purpose**: Cache & Session storage
- **Features**:
  - Persistence enabled (AOF)
  - No password (development)

### 3. Backend (duetracker-backend)
- **Build**: Custom Dockerfile
- **Port**: `3000`
- **Purpose**: API Server
- **Connects to**:
  - PostgreSQL (database)
  - Redis (cache)

### 4. Frontend (duetracker-frontend)
- **Build**: Custom Dockerfile
- **Port**: `5173`
- **Purpose**: Web Application
- **Connects to**:
  - Backend API

## 🚀 Quick Start

### Start All 4 Containers
```bash
cd deployment/docker
docker-compose up -d
```

### Check Status
```bash
# Using docker-compose
docker-compose ps

# Using custom script
./check-containers.sh
```

### Expected Output
```
✅ PostgreSQL (duetracker-postgres) - Port: 5432
✅ Redis (duetracker-redis) - Port: 6379
✅ Backend (duetracker-backend) - Port: 3000
✅ Frontend (duetracker-frontend) - Port: 5173

Running containers: 4/4
```

## 🧪 Testing

### Automated Test
```bash
cd deployment/docker
./test-local.sh
```

This will:
1. ✅ Check prerequisites
2. ✅ Clean up old containers
3. ✅ Build and start 4 containers
4. ✅ Wait for services to be ready
5. ✅ Test all endpoints
6. ✅ Check logs for errors

### Manual Testing

#### Test PostgreSQL
```bash
docker exec duetracker-postgres pg_isready -U postgres
# Expected: postgres:5432 - accepting connections
```

#### Test Redis
```bash
docker exec duetracker-redis redis-cli ping
# Expected: PONG
```

#### Test Backend
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

#### Test Frontend
```bash
curl http://localhost:5173
# Expected: HTML content
```

## 📊 Container Details

### Network
All containers are connected via `duetracker-network` (bridge network)

### Volumes
- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence

### Health Checks
- **PostgreSQL**: `pg_isready -U postgres` (every 10s)
- **Redis**: `redis-cli ping` (every 10s)

### Dependencies
```
Frontend → Backend → PostgreSQL
                  → Redis
```

## 🔧 Management Commands

### View Logs
```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Containers
```bash
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```

### Restart Specific Container
```bash
docker-compose restart postgres
docker-compose restart redis
docker-compose restart backend
docker-compose restart frontend
```

### Execute Commands

#### PostgreSQL
```bash
# Access psql
docker exec -it duetracker-postgres psql -U postgres -d duetracker

# Run SQL file
docker exec -i duetracker-postgres psql -U postgres -d duetracker < schema.sql
```

#### Redis
```bash
# Access redis-cli
docker exec -it duetracker-redis redis-cli

# Check keys
docker exec duetracker-redis redis-cli KEYS '*'
```

#### Backend
```bash
# Run migrations
docker exec duetracker-backend npm run prisma:migrate

# Seed database
docker exec duetracker-backend npm run seed:admin
```

## 🐛 Troubleshooting

### Container Not Starting

**Check logs:**
```bash
docker-compose logs <container-name>
```

**Common issues:**
- Port already in use
- Volume permission issues
- Build errors

### Port Already in Use

**Find process:**
```bash
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
```

**Kill process:**
```bash
kill -9 <PID>
```

### Database Connection Failed

**Check PostgreSQL is ready:**
```bash
docker exec duetracker-postgres pg_isready -U postgres
```

**Check DATABASE_URL in backend:**
```bash
docker exec duetracker-backend env | grep DATABASE_URL
```

### Redis Connection Failed

**Check Redis is running:**
```bash
docker exec duetracker-redis redis-cli ping
```

**Check REDIS_URL in backend:**
```bash
docker exec duetracker-backend env | grep REDIS_URL
```

## 📈 Monitoring

### Resource Usage
```bash
docker stats
```

### Container Status
```bash
# Quick check
./check-containers.sh

# Detailed
docker-compose ps
```

## 🔐 Security Notes

### Development vs Production

**Development (Current Setup):**
- ✅ Simple passwords
- ✅ No SSL/TLS
- ✅ Exposed ports
- ✅ Debug logging

**Production (Railway):**
- ✅ Strong passwords
- ✅ SSL/TLS enabled
- ✅ Internal networking
- ✅ Production logging

## 📝 Environment Variables

### Backend Container
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/duetracker
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
PORT=3000
```

### Frontend Container
```env
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
```

## ✅ Checklist

### Before Starting
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Docker daemon running
- [ ] Ports 5432, 6379, 3000, 5173 available

### After Starting
- [ ] 4 containers running
- [ ] PostgreSQL accepting connections
- [ ] Redis responding to PING
- [ ] Backend API responding
- [ ] Frontend loading

### Testing
- [ ] Can access frontend at http://localhost:5173
- [ ] Can login
- [ ] Can fetch data from backend
- [ ] No errors in browser console
- [ ] No errors in container logs

## 🎯 Next Steps

After successful local testing:
1. ✅ Commit changes
2. ✅ Push to GitHub
3. ✅ Deploy to Railway
4. ✅ Setup PostgreSQL on Railway
5. ✅ Setup Redis on Railway
6. ✅ Deploy Backend
7. ✅ Deploy Frontend

---

**Ready to test? Run:**
```bash
cd deployment/docker
./test-local.sh
```

**Check status anytime:**
```bash
./check-containers.sh
```
