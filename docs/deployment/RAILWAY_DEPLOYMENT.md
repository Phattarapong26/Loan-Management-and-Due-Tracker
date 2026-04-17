# 🚂 Railway Deployment Guide

คู่มือการ deploy โปรเจกต์ขึ้น Railway แบบครบวงจร

## 📋 Prerequisites

1. บัญชี Railway (สมัครที่ https://railway.app)
2. Railway CLI (จะติดตั้งอัตโนมัติถ้ายังไม่มี)
3. Git repository ของโปรเจกต์

## 🚀 Quick Start (3 Steps)

### Step 1: สร้าง Services ใน Railway

1. ไปที่ Railway Dashboard (https://railway.app/dashboard)
2. สร้าง New Project
3. เพิ่ม Services ต่อไปนี้:
   - **PostgreSQL** (จาก Database template)
   - **Redis** (จาก Database template)
   - **Backend** (Empty Service สำหรับ deploy code)

### Step 2: Deploy Backend

```bash
# Deploy โปรเจกต์ขึ้น Railway
./railway-deploy.sh
```

Script นี้จะ:
- ติดตั้ง Railway CLI (ถ้ายังไม่มี)
- Login และ link project
- Deploy code ขึ้น Railway
- รอให้ build เสร็จ

### Step 3: Setup Database

```bash
# Setup database และ seed ข้อมูล
./railway-setup-db.sh
```

Script นี้จะ:
- Generate Prisma Client
- Push database schema
- Seed ข้อมูลเริ่มต้น (admin, products, etc.)

## ✅ เสร็จแล้ว!

ตรวจสอบว่าระบบทำงาน:

```bash
# ดู logs
railway logs --service backend

# Test health endpoint
curl https://your-app.up.railway.app/health
```

## 🔧 Environment Variables

Railway จะ auto-generate variables เหล่านี้:
- `DATABASE_URL` - จาก PostgreSQL service
- `REDIS_URL` - จาก Redis service
- `PORT` - Railway จะกำหนดให้

Variables ที่ต้องเพิ่มเอง (ใน Railway Dashboard):

```env
# LINE OA Configuration
LINE_OA_ID=@186krrbq
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here

# JWT Secrets (generate ใหม่สำหรับ production)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# URLs (จะได้หลัง deploy)
BACKEND_URL=https://your-backend.up.railway.app
FRONTEND_URL=https://your-frontend.up.railway.app
CORS_ORIGIN=https://your-frontend.up.railway.app

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
RESEND_API_KEY=your_resend_key

# Environment
NODE_ENV=production
```

## 📁 ไฟล์ที่สำคัญ

- `railway.toml` - Railway configuration
- `nixpacks.toml` - Build configuration
- `Procfile` - Start command
- `railway-deploy.sh` - Deployment script
- `railway-setup-db.sh` - Database setup script

## 🔄 Update Code

เมื่อมีการแก้ไข code:

```bash
# Commit changes
git add .
git commit -m "Update features"

# Deploy
./railway-deploy.sh
```

Railway จะ auto-deploy เมื่อ push ไป GitHub (ถ้าเชื่อม GitHub)

## 🐛 Troubleshooting

### Build Failed

```bash
# ดู build logs
railway logs --service backend

# ลอง build ใหม่
railway up --service backend
```

### Database Connection Error

```bash
# ตรวจสอบ DATABASE_URL
railway variables --service backend

# ลอง push schema ใหม่
railway run --service backend npx prisma db push
```

### Redis Connection Error

```bash
# ตรวจสอบ REDIS_URL
railway variables --service backend

# Restart Redis service ใน Railway Dashboard
```

## 📊 Monitoring

```bash
# ดู logs แบบ real-time
railway logs --service backend --follow

# ดู resource usage
# ไปที่ Railway Dashboard > Service > Metrics
```

## 🔐 Security Checklist

- [ ] เปลี่ยน JWT secrets ทั้งหมด
- [ ] เปลี่ยน ENCRYPTION_KEY
- [ ] ตั้งค่า CORS_ORIGIN ให้ถูกต้อง
- [ ] เปลี่ยน default passwords ของ admin users
- [ ] Enable Railway's built-in security features
- [ ] ตั้งค่า rate limiting (มีอยู่แล้วใน code)

## 💰 Cost Optimization

Railway ให้ free tier:
- $5 credit/month
- Hobby plan: $5/month

Tips:
- ใช้ shared PostgreSQL (ถูกกว่า dedicated)
- ใช้ shared Redis
- Scale down ถ้าไม่ได้ใช้งาน

## 📚 Additional Scripts

```bash
# Push schema เฉพาะ (ไม่ seed)
./railway-db-push.sh

# Seed เฉพาะ
./railway-seed.sh

# Setup environment variables
./railway-env-setup.sh

# Run migrations (แทน db push)
./railway-migrate.sh
```

## 🎯 Default Credentials

หลัง seed database:

```
Admin:
  Email: admin@smebank.com
  Password: Admin@123

Manager:
  Email: manager@smebank.com
  Password: Manager@123

Officer:
  Email: officer@smebank.com
  Password: Officer@123
```

**⚠️ เปลี่ยน passwords เหล่านี้ทันทีหลัง deploy!**

## 🆘 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## ✨ Tips

1. **Auto Deploy**: เชื่อม GitHub repo เพื่อ auto-deploy เมื่อ push
2. **Preview Environments**: Railway สร้าง preview environment ให้อัตโนมัติสำหรับ PR
3. **Rollback**: สามารถ rollback ไปยัง deployment ก่อนหน้าได้ใน Dashboard
4. **Custom Domain**: เพิ่ม custom domain ได้ใน Settings
5. **Monitoring**: ใช้ Railway's built-in metrics หรือเชื่อมกับ external monitoring

---

**Happy Deploying! 🚀**
