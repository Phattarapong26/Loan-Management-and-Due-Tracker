# 🚀 Full Stack Railway Deployment - Quick Start

Deploy ระบบ Full Stack (Backend + Frontend) ขึ้น Railway ใน 10 นาที

## 📦 What's Included

- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL + Redis
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Deployment**: Railway (PaaS)

## 🎯 Prerequisites

1. บัญชี Railway: https://railway.app
2. Git repository
3. Node.js 20+ installed

## 🚀 Quick Deployment (10 minutes)

### 1️⃣ Setup Railway Project (2 นาที)

ใน Railway Dashboard:
1. Create New Project
2. Add **PostgreSQL** (Database template)
3. Add **Redis** (Database template)  
4. Add **Backend** (Empty Service)
5. Add **Frontend** (Empty Service)

### 2️⃣ Configure Environment (2 นาที)

```bash
# Generate and set all environment variables
./railway-set-env.sh
```

จากนั้นเพิ่ม Frontend variables ใน Railway Dashboard:

**Frontend Service Variables:**
```env
VITE_BACKEND_URL=https://your-backend.up.railway.app
NODE_ENV=production
```

### 3️⃣ Deploy Full Stack (3 นาที)

```bash
# Deploy both backend and frontend
./railway-deploy-fullstack.sh
```

### 4️⃣ Setup Database (2 นาที)

```bash
# Setup database and seed data
./railway-setup-db.sh
```

### 5️⃣ Update URLs (1 นาที)

หลัง deploy เสร็จ ให้อัพเดท URLs:

**Get URLs from Railway Dashboard:**
- Backend: `https://backend-production-xxxx.up.railway.app`
- Frontend: `https://frontend-production-xxxx.up.railway.app`

**Update Backend Variables:**
```bash
railway variables --service backend set BACKEND_URL="<backend-url>"
railway variables --service backend set FRONTEND_URL="<frontend-url>"
railway variables --service backend set CORS_ORIGIN="<frontend-url>"
```

**Update Frontend Variables:**
```bash
railway variables --service frontend set VITE_BACKEND_URL="<backend-url>"
```

## ✅ Verify Deployment

```bash
# Test backend
curl https://your-backend.up.railway.app/health

# Test frontend (open in browser)
https://your-frontend.up.railway.app

# View logs
railway logs --service backend
railway logs --service frontend
```

## 📚 Documentation

- 📖 [Full Stack Deployment Guide](./FULLSTACK_DEPLOYMENT.md) - Complete guide
- 📋 [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist
- 🔐 [Generate Secrets Guide](./GENERATE_SECRETS.md) - Security setup
- 🛠️ [Scripts Reference](./RAILWAY_SCRIPTS.md) - All available scripts

## 🔧 Available Scripts

### Full Stack
```bash
./railway-deploy-fullstack.sh    # Deploy both backend and frontend
```

### Backend Only
```bash
./railway-deploy.sh               # Deploy backend
./railway-setup-db.sh             # Setup database
./railway-set-env.sh              # Set environment variables
```

### Frontend Only
```bash
railway up --service frontend     # Deploy frontend
```

### Utilities
```bash
./generate-secrets.sh             # Generate production secrets
./railway-health-check.sh         # Health check verification
./test-railway-setup.sh           # Test setup completeness
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Platform                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Frontend   │─────▶│   Backend    │                │
│  │  React+Vite  │      │   Fastify    │                │
│  │  Port: $PORT │      │  Port: 3000  │                │
│  └──────────────┘      └──────┬───────┘                │
│                               │                          │
│                    ┌──────────┴──────────┐              │
│                    │                     │              │
│              ┌─────▼─────┐        ┌─────▼─────┐        │
│              │PostgreSQL │        │   Redis   │        │
│              │ Database  │        │   Cache   │        │
│              └───────────┘        └───────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Service Communication

### Frontend → Backend
```typescript
// Frontend calls backend API
const API_URL = import.meta.env.VITE_BACKEND_URL;
fetch(`${API_URL}/api/loans`);
```

### Backend → Database
```typescript
// Backend connects to PostgreSQL
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});
```

### Backend → Redis
```typescript
// Backend uses Redis for caching
const redis = new Redis(process.env.REDIS_URL);
```

## 🐛 Common Issues

### Frontend Can't Connect to Backend

**Problem**: CORS errors or 404

**Solution**:
```bash
# Check VITE_BACKEND_URL
railway variables --service frontend | grep VITE_BACKEND_URL

# Update if wrong
railway variables --service frontend set VITE_BACKEND_URL="<correct-url>"
```

### Backend CORS Errors

**Problem**: Frontend blocked by CORS

**Solution**:
```bash
# Check CORS_ORIGIN
railway variables --service backend | grep CORS_ORIGIN

# Update to match frontend URL
railway variables --service backend set CORS_ORIGIN="<frontend-url>"
```

### Database Connection Error

**Problem**: Backend can't connect to database

**Solution**:
```bash
# Check DATABASE_URL (should be auto-set)
railway variables --service backend | grep DATABASE_URL

# Verify PostgreSQL service is running
railway status
```

## 💡 Tips

1. **Use Railway Dashboard** - Monitor deployments visually
2. **Check Logs** - Use `railway logs` to debug issues
3. **Test Locally First** - Run `npm run dev` before deploying
4. **Update URLs** - Always update after first deployment
5. **Monitor Costs** - Check Railway usage regularly

## 🔐 Security Checklist

- [ ] Generate new secrets (don't use defaults)
- [ ] Update CORS_ORIGIN to match frontend URL
- [ ] Change default admin passwords
- [ ] Use HTTPS only (Railway default)
- [ ] Review environment variables
- [ ] Enable rate limiting (already configured)

## 💰 Cost Estimate

**Railway Pricing:**
- Free Tier: $5 credit/month
- Hobby Plan: $5/month

**Estimated Monthly Cost:**
- PostgreSQL (Shared): ~$2
- Redis (Shared): ~$1
- Backend Service: ~$1
- Frontend Service: ~$1
- **Total**: ~$5/month (within free tier!)

## 🎉 Default Credentials

After deployment:
- **Admin**: admin@smebank.com / Admin@123
- **Manager**: manager@smebank.com / Manager@123
- **Officer**: officer@smebank.com / Officer@123

**⚠️ Change these immediately after first login!**

## 📞 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**🚀 Deploy Full Stack in 10 Minutes!**

*Everything you need for production-ready deployment*
