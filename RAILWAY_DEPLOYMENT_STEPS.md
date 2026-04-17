# 🚂 Railway Deployment - Step by Step

คู่มือ deploy แบบ 2 ขั้นตอน (เพราะต้องรอ URL ก่อน)

---

## 📋 Overview

```
Step 1: Deploy ครั้งแรก → ได้ URL
Step 2: อัพเดท URL variables → Deploy อีกครั้ง
```

---

## 🚀 Step 1: First Deployment (ได้ URL)

### 1.1 Push Code to GitHub

```bash
# ตรวจสอบว่าแก้ .env แล้ว (ยกเว้น URL ที่ยังไม่มี)
git status

# Add & Commit
git add .
git commit -m "feat: ready for railway deployment"

# Push
git push origin main
```

### 1.2 Setup Railway Project

```bash
# Install Railway CLI (ถ้ายังไม่มี)
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Link to project
railway link
```

### 1.3 Add PostgreSQL Service

**ใน Railway Dashboard:**
1. เปิด project
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. รอจน PostgreSQL พร้อม
4. จะได้ `DATABASE_URL` อัตโนมัติ

### 1.4 Add Backend Service

**ใน Railway Dashboard:**
1. Click **"+ New"** → **"GitHub Repo"**
2. เลือก repository ของคุณ
3. ตั้งค่า:
   - **Name**: `backend`
   - **Root Directory**: `backend`
   - **Build Command**: (ปล่อยว่าง - ใช้จาก package.json)
   - **Start Command**: (ปล่อยว่าง - ใช้จาก package.json)

4. ไปที่ **Variables** tab เพิ่ม:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=${{PORT}}

# Secrets (ใส่ค่าจริงที่ generate แล้ว)
JWT_SECRET=your-generated-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret
SESSION_SECRET=your-generated-session-secret
ENCRYPTION_KEY=your-generated-encryption-key

# LINE (ใส่ค่าจริง)
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret
LINE_OA_ID=@your-oa-id

# URLs (ใส่ชั่วคราว - จะแก้ทีหลัง)
BACKEND_URL=https://temp-backend.railway.app
FRONTEND_URL=https://temp-frontend.railway.app
CORS_ORIGIN=https://temp-frontend.railway.app
```

5. Click **"Deploy"**

### 1.5 Add Frontend Service

**ใน Railway Dashboard:**
1. Click **"+ New"** → **"GitHub Repo"**
2. เลือก repository เดียวกัน
3. ตั้งค่า:
   - **Name**: `frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: (ปล่อยว่าง)
   - **Start Command**: (ปล่อยว่าง)

4. ไปที่ **Variables** tab เพิ่ม:

```env
NODE_ENV=production
PORT=${{PORT}}

# URLs (ใส่ชั่วคราว - จะแก้ทีหลัง)
VITE_API_URL=https://temp-backend.railway.app
VITE_BACKEND_URL=https://temp-backend.railway.app
```

5. Click **"Deploy"**

### 1.6 รอ Deployment เสร็จ

```bash
# ดู deployment status
railway status

# ดู logs
railway logs --service backend
railway logs --service frontend
```

### 1.7 บันทึก URLs

หลัง deploy เสร็จ จะได้ URLs:

```
Backend:  https://backend-production-xxxx.up.railway.app
Frontend: https://frontend-production-yyyy.up.railway.app
```

**📝 บันทึก URLs เหล่านี้!**

---

## 🔄 Step 2: Update URLs & Redeploy

### 2.1 Update Backend Variables

**ใน Railway Dashboard → Backend Service → Variables:**

แก้ไข:
```env
BACKEND_URL=https://backend-production-xxxx.up.railway.app
FRONTEND_URL=https://frontend-production-yyyy.up.railway.app
CORS_ORIGIN=https://frontend-production-yyyy.up.railway.app
```

Click **"Save"** → Railway จะ redeploy อัตโนมัติ

### 2.2 Update Frontend Variables

**ใน Railway Dashboard → Frontend Service → Variables:**

แก้ไข:
```env
VITE_API_URL=https://backend-production-xxxx.up.railway.app
VITE_BACKEND_URL=https://backend-production-xxxx.up.railway.app
```

Click **"Save"** → Railway จะ redeploy อัตโนมัติ

### 2.3 Run Database Migrations

**หลัง Backend redeploy เสร็จ:**

```bash
# เข้าไปใน Backend service
railway run --service backend npm run prisma:migrate

# Seed admin user
railway run --service backend npm run seed:admin
```

หรือใน Railway Dashboard:
1. เปิด Backend service
2. ไปที่ **Settings** → **Deploy**
3. เพิ่ม **Deploy Command**: `npm run prisma:migrate && npm run seed:admin`

---

## ✅ Step 3: Verify Deployment

### 3.1 Test Backend

```bash
# ใช้ URL จริงที่ได้
curl https://backend-production-xxxx.up.railway.app/health

# ควรได้: {"status":"ok"}
```

### 3.2 Test Frontend

เปิดเบราว์เซอร์:
```
https://frontend-production-yyyy.up.railway.app
```

ทดสอบ:
- [ ] หน้าเว็บโหลดได้
- [ ] Login ได้
- [ ] ไม่มี CORS errors
- [ ] ดึงข้อมูลจาก backend ได้

### 3.3 Check Logs

```bash
# Backend logs
railway logs --service backend

# Frontend logs  
railway logs --service frontend

# ตรวจสอบว่าไม่มี critical errors
```

---

## 🐛 Troubleshooting

### Issue 1: CORS Error

**สาเหตุ:** CORS_ORIGIN ไม่ตรงกับ Frontend URL

**แก้ไข:**
```bash
# ตรวจสอบ Backend variables
railway variables --service backend

# แก้ไข CORS_ORIGIN ให้ตรงกับ Frontend URL
```

### Issue 2: Backend ไม่เชื่อม Database

**สาเหตุ:** DATABASE_URL ผิด

**แก้ไข:**
```bash
# ตรวจสอบว่า PostgreSQL service รันอยู่
railway status --service postgres

# ตรวจสอบ DATABASE_URL
railway variables --service backend
# ต้องเป็น: ${{Postgres.DATABASE_URL}}
```

### Issue 3: Frontend ไม่เชื่อม Backend

**สาเหตุ:** VITE_API_URL ผิด

**แก้ไข:**
```bash
# ตรวจสอบ Frontend variables
railway variables --service frontend

# แก้ไข VITE_API_URL ให้ตรงกับ Backend URL
```

### Issue 4: Migration Failed

**แก้ไข:**
```bash
# Run migrations manual
railway run --service backend npm run prisma:generate
railway run --service backend npm run prisma:migrate

# ถ้ายังไม่ได้ ลอง reset (ระวัง!)
railway run --service backend npm run prisma:reset
```

---

## 📝 Checklist

### Before First Deploy
- [ ] Code push to GitHub แล้ว
- [ ] .env files แก้แล้ว (ยกเว้น URLs)
- [ ] Secrets generate แล้ว
- [ ] LINE credentials พร้อม

### After First Deploy
- [ ] Backend deploy สำเร็จ
- [ ] Frontend deploy สำเร็จ
- [ ] บันทึก URLs แล้ว

### After Update URLs
- [ ] Backend variables อัพเดทแล้ว
- [ ] Frontend variables อัพเดทแล้ว
- [ ] Redeploy สำเร็จ
- [ ] Migrations รันแล้ว
- [ ] Seed data แล้ว

### Final Testing
- [ ] Backend API ตอบกลับได้
- [ ] Frontend โหลดได้
- [ ] Login ทำงานได้
- [ ] ไม่มี CORS errors
- [ ] ไม่มี critical errors ใน logs

---

## 💡 Tips

### ✅ ควรทำ
- ✅ บันทึก URLs ทันทีที่ได้
- ✅ ตรวจสอบ logs หลัง deploy
- ✅ ทดสอบทุก features หลัง deploy
- ✅ Backup database ก่อน run migrations

### ❌ ไม่ควรทำ
- ❌ ลืมอัพเดท URLs หลัง deploy ครั้งแรก
- ❌ ใช้ temp URLs ต่อไป
- ❌ Deploy โดยไม่ตรวจสอบ logs
- ❌ Run migrations โดยไม่ backup

---

## 🎯 Quick Commands

```bash
# ดู status
railway status

# ดู logs
railway logs --service backend
railway logs --service frontend

# ดู variables
railway variables --service backend
railway variables --service frontend

# Run command
railway run --service backend npm run prisma:migrate
railway run --service backend npm run seed:admin

# Restart service
railway restart --service backend
railway restart --service frontend
```

---

## 📞 Need Help?

หากพบปัญหา:
1. ดู logs: `railway logs --service <service-name>`
2. ตรวจสอบ variables: `railway variables --service <service-name>`
3. ดู [Railway Documentation](https://docs.railway.app/)
4. ดู [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)

---

## ✨ Summary

**2-Step Deployment:**
1. **Deploy ครั้งแรก** → ได้ URLs
2. **อัพเดท URLs** → Redeploy

**ใช้เวลา:** ประมาณ 15-20 นาที

**พร้อม Deploy แล้ว!** 🚀
