# ⚡ Quick Start - Railway Deployment

Deploy ใน 5 นาที! 🚀

## 📋 Before You Start

✅ มีบัญชี Railway (https://railway.app)  
✅ มี LINE OA credentials  
✅ Git repository พร้อม

## 🎯 Step-by-Step

### 1. สร้าง Railway Project (2 นาที)

1. ไปที่ https://railway.app/dashboard
2. คลิก "New Project"
3. เลือก "Empty Project"
4. เพิ่ม Services:
   - คลิก "+ New" → "Database" → "Add PostgreSQL"
   - คลิก "+ New" → "Database" → "Add Redis"
   - คลิก "+ New" → "Empty Service" → ตั้งชื่อ "backend"

### 2. Configure Environment (30 วินาที)

**Option A: Automatic (แนะนำ)**
```bash
./railway-set-env.sh
```
Script นี้จะ:
- Generate secrets อัตโนมัติ
- Set ค่าทั้งหมดใน Railway
- รวม LINE credentials

**Option B: Manual**
```bash
./generate-secrets.sh
# Copy output to Railway Dashboard
```

### 3. ตั้งค่า Environment Variables (1 นาที)

**Option A: Automatic (แนะนำ)**
```bash
./railway-set-env.sh
```
Script นี้จะตั้งค่าทุกอย่างให้อัตโนมัติ รวมถึง:
- Generate secrets ใหม่
- Set LINE credentials
- Set email configuration
- Set URLs

**Option B: Manual**

ใน Railway Dashboard → Backend Service → Variables:

**Paste secrets จาก step 2:**
- JWT_SECRET
- JWT_REFRESH_SECRET
- SESSION_SECRET
- ENCRYPTION_KEY

**เพิ่ม LINE credentials:**
```
LINE_OA_ID=@186krrbq
LINE_CHANNEL_ACCESS_TOKEN=<your_token>
LINE_CHANNEL_SECRET=<your_secret>
```

**เพิ่ม environment:**
```
NODE_ENV=production
```

### 4. Deploy! (1 นาที)

```bash
# Deploy code
./railway-deploy.sh
```

รอ build เสร็จ (ประมาณ 2-3 นาที)

### 5. Setup Database (30 วินาที)

```bash
# Setup database & seed
./railway-setup-db.sh
```

## ✅ ทดสอบ

```bash
# Get your Railway URL from dashboard
curl https://your-backend.up.railway.app/health
```

ควรได้:
```json
{
  "status": "ok",
  "timestamp": "2026-04-11T...",
  "database": "connected",
  "redis": "connected"
}
```

## 🎉 เสร็จแล้ว!

Login ด้วย:
- Email: `admin@smebank.com`
- Password: `Admin@123`

**⚠️ เปลี่ยน password ทันที!**

## 🔄 Update Code

```bash
# แก้ไข code
git add .
git commit -m "Update"

# Deploy
./railway-deploy.sh
```

## 🐛 มีปัญหา?

```bash
# ดู logs
railway logs --service backend

# ดู variables
railway variables --service backend

# Restart service
# ไปที่ Railway Dashboard → Backend → Settings → Restart
```

## 📚 เอกสารเพิ่มเติม

- [Full Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Troubleshooting](./RAILWAY_DEPLOYMENT.md#-troubleshooting)

## 🆘 ติดปัญหา?

1. ตรวจสอบ [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
2. ดู Railway logs: `railway logs --service backend`
3. ตรวจสอบ Railway Status: https://status.railway.app

---

**That's it! 🎊**

ใช้เวลาแค่ 5 นาที และระบบพร้อมใช้งาน!
