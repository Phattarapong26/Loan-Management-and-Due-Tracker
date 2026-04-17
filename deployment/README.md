# Deployment

โฟลเดอร์นี้รวม configurations และ scripts สำหรับ deployment

## 📁 Structure

```
deployment/
├── railway/              # Railway platform deployment
│   ├── scripts/         # Deployment scripts
│   ├── *.toml          # Railway configurations
│   └── *.sh            # Shell scripts
└── docker/              # Docker deployment
    ├── Dockerfile
    └── docker-compose.yml
```

## 🚂 Railway Deployment

### Prerequisites
- Railway CLI installed
- Railway account connected

### Deploy Backend
```bash
cd railway
./railway-deploy.sh backend
```

### Deploy Frontend
```bash
cd railway
./railway-deploy.sh frontend
```

### Full Stack Deploy
```bash
cd railway
./railway-deploy-fullstack.sh
```

## 🐳 Docker Deployment

### Build & Run
```bash
cd docker
docker-compose up -d
```

### Stop
```bash
docker-compose down
```

## 📝 Configuration Files

- `railway.toml` - Main Railway configuration
- `railway-fullstack.toml` - Fullstack deployment config
- `nixpacks.toml` - Nixpacks build configuration
- `.railwayignore` - Files to ignore in Railway deployment

## 🔧 Scripts

- `railway-deploy.sh` - Deploy single service
- `railway-deploy-fullstack.sh` - Deploy both frontend & backend
- `railway-setup-db.sh` - Setup database
- `railway-migrate.sh` - Run database migrations
- `railway-seed.sh` - Seed database
- `railway-env-setup.sh` - Setup environment variables
- `railway-health-check.sh` - Health check script

## 📚 Documentation

ดูเอกสารเพิ่มเติมใน `docs/deployment/`
