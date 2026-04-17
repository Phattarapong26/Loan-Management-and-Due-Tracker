# Railway Deployment

คู่มือการ deploy บน Railway platform

## 📋 Prerequisites

1. Railway CLI installed
```bash
npm install -g @railway/cli
```

2. Login to Railway
```bash
railway login
```

3. Link project
```bash
railway link
```

## 🚀 Deployment Scripts

### Deploy Backend
```bash
./railway-deploy.sh
```

### Deploy Frontend
```bash
cd ../../frontend
railway up
```

### Full Stack Deploy
```bash
./railway-deploy-fullstack.sh
```

## 🗄️ Database Setup

### Setup Database
```bash
./railway-setup-db.sh
```

### Run Migrations
```bash
./railway-migrate.sh
```

### Seed Database
```bash
./railway-seed.sh
```

## 🔧 Environment Variables

### Setup Environment
```bash
./railway-env-setup.sh
```

### Example Environment File
ดูตัวอย่างใน `.env.railway.example`

## 📝 Configuration Files

- `railway.toml` - Backend configuration
- `railway-fullstack.toml` - Fullstack configuration
- `nixpacks.toml` - Build configuration
- `Procfile` - Process configuration

## 🔍 Health Check

```bash
./railway-health-check.sh
```

## 📚 Scripts Reference

| Script | Description |
|--------|-------------|
| `railway-deploy.sh` | Deploy backend service |
| `railway-deploy-fullstack.sh` | Deploy both services |
| `railway-setup-db.sh` | Initialize database |
| `railway-migrate.sh` | Run migrations |
| `railway-seed.sh` | Seed database |
| `railway-env-setup.sh` | Setup environment variables |
| `railway-health-check.sh` | Check service health |
| `railway-db-push.sh` | Push database schema |
| `railway-update-urls.sh` | Update service URLs |
| `railway-set-env.sh` | Set environment variables |

## 🐛 Troubleshooting

### Check Logs
```bash
railway logs
```

### Check Status
```bash
railway status
```

### Restart Service
```bash
railway restart
```

## 📖 More Information

ดูเอกสารเพิ่มเติมใน `../../docs/deployment/`
