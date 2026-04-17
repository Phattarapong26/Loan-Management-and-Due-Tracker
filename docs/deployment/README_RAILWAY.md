# 🚂 Railway Deployment - Quick Start

Deploy โปรเจกต์ขึ้น Railway ใน 3 ขั้นตอน

## 🎯 Prerequisites

1. บัญชี Railway: https://railway.app
2. Git repository
3. Node.js 20+ installed

## 🚀 3-Step Deployment

### 1️⃣ Setup Railway Project

ใน Railway Dashboard:
1. Create New Project
2. Add PostgreSQL (Database template)
3. Add Redis (Database template)  
4. Add Backend (Empty Service)

### 2️⃣ Configure Environment

**Option A: Automatic (แนะนำ)**
```bash
# Set all environment variables automatically
./railway-set-env.sh
```

**Option B: Manual**
```bash
# Generate secrets
./generate-secrets.sh

# Copy output to Railway Dashboard > Backend > Variables
# Plus add LINE credentials and other variables
```

### 3️⃣ Deploy

```bash
# Deploy code
./railway-deploy.sh

# Setup database (after build completes)
./railway-setup-db.sh
```

## ✅ Verify

```bash
# Check health
curl https://your-backend.up.railway.app/health

# View logs
railway logs --service backend
```

## 📚 Full Documentation

- [Complete Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Generate Secrets Guide](./GENERATE_SECRETS.md)

## 🔧 Available Scripts

```bash
./railway-set-env.sh           # Set all environment variables (automatic)
./railway-deploy.sh            # Deploy code to Railway
./railway-setup-db.sh          # Setup database & seed data
./railway-db-push.sh           # Push schema only
./railway-seed.sh              # Seed data only
./railway-env-setup.sh         # Setup environment variables (LINE only)
./generate-secrets.sh          # Generate production secrets
```

## 🆘 Troubleshooting

### Build Failed
```bash
railway logs --service backend
```

### Database Error
```bash
railway run --service backend npx prisma db push
```

### Need Help?
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

## 🎉 Default Credentials

After deployment:
- Admin: admin@smebank.com / Admin@123
- Manager: manager@smebank.com / Manager@123
- Officer: officer@smebank.com / Officer@123

**⚠️ Change these immediately after first login!**

---

**Happy Deploying! 🚀**
