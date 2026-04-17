# 🚀 Full Stack Deployment Guide

คู่มือการ deploy ระบบ Full Stack (Backend + Frontend) ขึ้น Railway

---

## 📋 Overview

ระบบประกอบด้วย:
- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL + Redis
- **Frontend**: React + Vite + TypeScript + TailwindCSS

---

## 🎯 Quick Start (10 นาที)

### Step 1: สร้าง Railway Project

1. ไปที่ https://railway.app/dashboard
2. สร้าง New Project
3. เพิ่ม Services:
   - **PostgreSQL** (Database template)
   - **Redis** (Database template)
   - **Backend** (Empty Service)
   - **Frontend** (Empty Service)

### Step 2: Setup Environment Variables

#### Backend Service Variables

```bash
# Option A: Automatic (แนะนำ)
./railway-set-env.sh

# Option B: Manual
# Copy from .env.railway.example
```

ตัวแปรที่จำเป็น:
```env
# Secrets (generate ใหม่)
JWT_SECRET=<generate>
JWT_REFRESH_SECRET=<generate>
SESSION_SECRET=<generate>
ENCRYPTION_KEY=<generate>

# LINE OA
LINE_OA_ID=@186krrbq
LINE_CHANNEL_ACCESS_TOKEN=<your_token>
LINE_CHANNEL_SECRET=<your_secret>

# Environment
NODE_ENV=production

# URLs (update after deploy)
BACKEND_URL=https://your-backend.up.railway.app
FRONTEND_URL=https://your-frontend.up.railway.app
CORS_ORIGIN=https://your-frontend.up.railway.app
```

#### Frontend Service Variables

```env
# Backend API URL
VITE_BACKEND_URL=https://your-backend.up.railway.app

# Environment
NODE_ENV=production
```

### Step 3: Deploy Full Stack

```bash
./railway-deploy-fullstack.sh
```

Script นี้จะ:
1. Deploy backend
2. รอให้ backend build เสร็จ
3. Deploy frontend
4. แสดงขั้นตอนถัดไป

### Step 4: Setup Database

```bash
./railway-setup-db.sh
```

### Step 5: Update URLs

หลัง deploy เสร็จ:

1. **Get URLs from Railway Dashboard**
   - Backend URL: `https://backend-production-xxxx.up.railway.app`
   - Frontend URL: `https://frontend-production-xxxx.up.railway.app`

2. **Update Backend Variables**
   ```bash
   railway variables --service backend set BACKEND_URL="<backend-url>"
   railway variables --service backend set FRONTEND_URL="<frontend-url>"
   railway variables --service backend set CORS_ORIGIN="<frontend-url>"
   ```

3. **Update Frontend Variables**
   ```bash
   railway variables --service frontend set VITE_BACKEND_URL="<backend-url>"
   ```

4. **Restart Services**
   - Railway จะ restart อัตโนมัติ

### Step 6: Verify

```bash
# Test backend
curl https://your-backend.up.railway.app/health

# Test frontend
curl https://your-frontend.up.railway.app
```

---

## 📁 Project Structure

```
DueTracker/
├── backend/                    # Backend service
│   ├── src/                   # Source code
│   ├── prisma/                # Database schema
│   ├── package.json
│   ├── nixpacks.toml          # Backend build config
│   └── .railwayignore
│
├── frontend/                   # Frontend service
│   ├── src/                   # React components
│   ├── public/                # Static assets
│   ├── package.json
│   ├── nixpacks.toml          # Frontend build config
│   ├── .railwayignore
│   └── .env.railway.example
│
├── railway-deploy-fullstack.sh # Full stack deployment
├── railway-set-env.sh          # Environment setup
├── railway-setup-db.sh         # Database setup
└── FULLSTACK_DEPLOYMENT.md     # This file
```

---

## 🔧 Configuration Files

### Backend Configuration

**`backend/nixpacks.toml`**
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "openssl"]

[phases.install]
cmds = ["npm ci --production=false"]

[phases.build]
cmds = [
  "npx prisma generate",
  "npm run build"
]

[start]
cmd = "npm start"
```

### Frontend Configuration

**`frontend/nixpacks.toml`**
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run preview -- --host 0.0.0.0 --port $PORT"
```

**`frontend/package.json`** (updated)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite preview --host 0.0.0.0 --port $PORT",
    "preview": "vite preview"
  }
}
```

---

## 🌐 Service Communication

### Frontend → Backend

Frontend เชื่อมต่อกับ Backend ผ่าน:

```typescript
// frontend/src/shared/lib/api-client.ts
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

### CORS Configuration

Backend ต้องอนุญาต Frontend domain:

```typescript
// backend/src/app.ts
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
});
```

---

## 🔄 Deployment Workflows

### Initial Deployment

```bash
# 1. Setup environment
./railway-set-env.sh

# 2. Deploy full stack
./railway-deploy-fullstack.sh

# 3. Setup database
./railway-setup-db.sh

# 4. Update URLs (manual in Railway Dashboard)

# 5. Verify
curl https://your-backend.up.railway.app/health
curl https://your-frontend.up.railway.app
```

### Update Backend Only

```bash
# Deploy backend
railway up --service backend

# Or use script
./railway-deploy.sh
```

### Update Frontend Only

```bash
# Deploy frontend
railway up --service frontend
```

### Update Both

```bash
./railway-deploy-fullstack.sh
```

---

## 🐛 Troubleshooting

### Frontend Can't Connect to Backend

**Problem**: CORS errors or connection refused

**Solution**:
1. Check `VITE_BACKEND_URL` in frontend variables
2. Check `CORS_ORIGIN` in backend variables
3. Verify both services are running
4. Check Railway logs

```bash
# Check backend logs
railway logs --service backend

# Check frontend logs
railway logs --service frontend
```

### Frontend Shows Blank Page

**Problem**: Build errors or missing environment variables

**Solution**:
1. Check build logs in Railway Dashboard
2. Verify `VITE_BACKEND_URL` is set
3. Check browser console for errors
4. Rebuild frontend

```bash
railway up --service frontend
```

### Backend Database Connection Error

**Problem**: Can't connect to PostgreSQL

**Solution**:
1. Check `DATABASE_URL` is set (auto-generated)
2. Verify PostgreSQL service is running
3. Check Railway service connections

### API Calls Return 404

**Problem**: Frontend calling wrong backend URL

**Solution**:
1. Verify `VITE_BACKEND_URL` matches backend URL
2. Check API endpoints in frontend code
3. Verify backend routes are correct

---

## 📊 Monitoring

### Health Checks

**Backend**:
```bash
curl https://your-backend.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-11T...",
  "database": "connected",
  "redis": "connected"
}
```

**Frontend**:
```bash
curl https://your-frontend.up.railway.app
```

Expected: HTML page

### Logs

```bash
# Backend logs
railway logs --service backend --follow

# Frontend logs
railway logs --service frontend --follow

# All services
railway logs --follow
```

### Metrics

Check Railway Dashboard:
- CPU usage
- Memory usage
- Network traffic
- Request count

---

## 🔐 Security Checklist

- [ ] Generate new JWT secrets for production
- [ ] Set strong ENCRYPTION_KEY
- [ ] Configure CORS_ORIGIN correctly
- [ ] Use HTTPS only (Railway default)
- [ ] Change default admin passwords
- [ ] Enable rate limiting (already configured)
- [ ] Review environment variables
- [ ] Set up monitoring alerts

---

## 💰 Cost Optimization

### Railway Pricing

- **Free Tier**: $5 credit/month
- **Hobby Plan**: $5/month

### Optimization Tips

1. **Use Shared Resources**
   - Shared PostgreSQL (cheaper than dedicated)
   - Shared Redis

2. **Scale Appropriately**
   - Start with 1 replica per service
   - Scale up only when needed

3. **Monitor Usage**
   - Check Railway Dashboard regularly
   - Set up usage alerts

4. **Optimize Builds**
   - Use build cache
   - Minimize dependencies

---

## 📚 Additional Resources

### Documentation
- [Railway Docs](https://docs.railway.app)
- [Vite Docs](https://vitejs.dev)
- [Fastify Docs](https://www.fastify.io)
- [Prisma Docs](https://www.prisma.io)

### Scripts Reference
- `railway-deploy-fullstack.sh` - Deploy both services
- `railway-set-env.sh` - Setup environment
- `railway-setup-db.sh` - Setup database
- `railway-health-check.sh` - Health check

---

## 🎯 Quick Commands

```bash
# Deploy full stack
./railway-deploy-fullstack.sh

# Deploy backend only
railway up --service backend

# Deploy frontend only
railway up --service frontend

# Setup database
./railway-setup-db.sh

# View logs
railway logs --service backend
railway logs --service frontend

# View variables
railway variables --service backend
railway variables --service frontend

# Restart service
# Go to Railway Dashboard → Service → Settings → Restart
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Railway account created
- [ ] Railway CLI installed
- [ ] All services created in Railway
- [ ] Environment variables prepared

### Deployment
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Database schema pushed
- [ ] Data seeded
- [ ] URLs updated in variables

### Post-Deployment
- [ ] Backend health check passing
- [ ] Frontend accessible
- [ ] API calls working
- [ ] Authentication working
- [ ] Database queries working
- [ ] Redis cache working

### Security
- [ ] Secrets generated and set
- [ ] CORS configured correctly
- [ ] Default passwords changed
- [ ] HTTPS enabled (Railway default)

---

**🎉 Your Full Stack App is Live!**

*Backend + Frontend deployed and connected on Railway*
