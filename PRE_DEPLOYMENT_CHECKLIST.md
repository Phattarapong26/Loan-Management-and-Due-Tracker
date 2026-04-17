# ✅ Pre-Deployment Checklist

คู่มือตรวจสอบก่อน deploy ขึ้น Railway เพื่อป้องกันปัญหา

---

## 🎯 กลยุทธ์การทดสอบ

### แนวทางที่แนะนำ: **ทดสอบ Local ก่อน → Deploy**

```
1. ทดสอบ Docker Local ✅
2. แก้ไขปัญหาที่พบ ✅
3. Commit & Push to Git ✅
4. Deploy to Railway ✅
```

**เหตุผล:**
- 🔍 หาปัญหาได้เร็วกว่า
- 💰 ประหยัดเวลาและ Railway credits
- 🛡️ ลดความเสี่ยง production issues
- 🐛 Debug ง่ายกว่าบน local

---

## 📋 Phase 1: ทดสอบ Local (แนะนำ)

### 1.1 ทดสอบ Backend แยก

```bash
cd backend

# 1. ติดตั้ง dependencies
npm install

# 2. Setup environment
cp .env.example .env
# แก้ไข .env:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/duetracker
# JWT_SECRET=test-secret-key-local
# ... (ใส่ค่าทดสอบ)

# 3. Start PostgreSQL (ถ้ายังไม่มี)
# Option A: Docker
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=duetracker \
  -p 5432:5432 \
  postgres:15-alpine

# Option B: Local PostgreSQL
# brew install postgresql@15
# brew services start postgresql@15

# 4. Run migrations
npm run prisma:generate
npm run prisma:migrate

# 5. Seed database
npm run seed:admin

# 6. Start backend
npm run dev

# 7. ทดสอบ API
curl http://localhost:3000/health
# ควรได้ response: {"status":"ok"}
```

**✅ Checklist Backend:**
- [ ] Backend start สำเร็จ
- [ ] Database connection สำเร็จ
- [ ] Migrations รันสำเร็จ
- [ ] Seed data สำเร็จ
- [ ] API endpoints ตอบกลับได้
- [ ] ไม่มี error ใน console

### 1.2 ทดสอบ Frontend แยก

```bash
cd frontend

# 1. ติดตั้ง dependencies
npm install

# 2. Setup environment
cp .env.example .env
# แก้ไข .env:
# VITE_API_URL=http://localhost:3000

# 3. Start frontend
npm run dev

# 4. เปิดเบราว์เซอร์
# http://localhost:5173
```

**✅ Checklist Frontend:**
- [ ] Frontend start สำเร็จ
- [ ] เชื่อมต่อ backend ได้
- [ ] Login ได้
- [ ] แสดงข้อมูลได้
- [ ] ไม่มี error ใน console

### 1.3 ทดสอบด้วย Docker Compose (แนะนำมาก!)

```bash
cd deployment/docker

# 1. Build และ start ทุก services
docker-compose up --build

# รอจนทุก services พร้อม (ประมาณ 1-2 นาที)

# 2. ตรวจสอบ services
docker-compose ps
# ควรเห็น 3 services: postgres, backend, frontend (all healthy)

# 3. ตรวจสอบ logs
docker-compose logs backend
docker-compose logs frontend

# 4. ทดสอบ endpoints
curl http://localhost:3000/health
curl http://localhost:5173

# 5. เปิดเบราว์เซอร์ทดสอบ
# http://localhost:5173
```

**✅ Checklist Docker:**
- [ ] ทุก containers start สำเร็จ
- [ ] Health checks ผ่านทั้งหมด
- [ ] Backend เชื่อมต่อ database ได้
- [ ] Frontend เชื่อมต่อ backend ได้
- [ ] Login และใช้งานได้ปกติ
- [ ] ไม่มี error ใน logs

### 1.4 ทดสอบ Production Build

```bash
# Backend
cd backend
npm run build
npm start
# ควร start สำเร็จ

# Frontend
cd frontend
npm run build
npm run preview
# ควร start สำเร็จ
```

**✅ Checklist Build:**
- [ ] Backend build สำเร็จ
- [ ] Frontend build สำเร็จ
- [ ] Production mode ทำงานได้
- [ ] ไม่มี build errors

---

## 📋 Phase 2: เตรียม Railway Deployment

### 2.1 ตรวจสอบ Railway Configuration Files

```bash
# ตรวจสอบว่ามีไฟล์เหล่านี้
ls deployment/railway/railway.toml
ls deployment/railway/railway-fullstack.toml
ls deployment/railway/Procfile
ls deployment/railway/nixpacks.toml
ls backend/Dockerfile
ls frontend/Dockerfile
```

**✅ Checklist Config Files:**
- [ ] railway.toml มีอยู่
- [ ] Procfile มีอยู่
- [ ] Dockerfile ทั้ง 2 ตัวมีอยู่
- [ ] .railwayignore มีอยู่

### 2.2 ตรวจสอบ Environment Variables

สร้างไฟล์เก็บ environment variables สำหรับ Railway:

```bash
cd deployment/railway

# ดู template
cat .env.railway.example

# สร้างไฟล์จริง (ไม่ commit!)
cp .env.railway.example .env.railway.production

# แก้ไขค่าจริง:
# - JWT_SECRET (generate ใหม่)
# - LINE_CHANNEL_ACCESS_TOKEN (ของจริง)
# - LINE_CHANNEL_SECRET (ของจริง)
# - SMTP credentials (ถ้าใช้)
```

**✅ Checklist Environment:**
- [ ] มี .env.railway.production
- [ ] Generate secrets ใหม่แล้ว
- [ ] LINE credentials ถูกต้อง
- [ ] SMTP/Email config ถูกต้อง (ถ้าใช้)

### 2.3 Generate Secrets

```bash
cd deployment/railway/scripts

# Generate secrets ใหม่
./generate-secrets.sh

# จะได้ secrets ใหม่ เก็บไว้ใช้ตอน setup Railway
```

**✅ Checklist Secrets:**
- [ ] JWT_SECRET (64 bytes)
- [ ] JWT_REFRESH_SECRET (64 bytes)
- [ ] SESSION_SECRET (64 bytes)
- [ ] ENCRYPTION_KEY (32 bytes)

---

## 📋 Phase 3: Setup Railway

### 3.1 สร้าง Railway Project

```bash
# 1. Install Railway CLI (ถ้ายังไม่มี)
npm install -g @railway/cli

# 2. Login
railway login

# 3. สร้าง project ใหม่
railway init

# 4. Link project
railway link
```

### 3.2 เพิ่ม Services

**ใน Railway Dashboard:**

1. **เพิ่ม PostgreSQL**
   - Add Service → Database → PostgreSQL
   - จะได้ DATABASE_URL อัตโนมัติ

2. **เพิ่ม Redis (Optional)**
   - Add Service → Database → Redis
   - จะได้ REDIS_URL อัตโนมัติ

3. **เพิ่ม Backend Service**
   - Add Service → GitHub Repo
   - เลือก repo ของคุณ
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`

4. **เพิ่ม Frontend Service**
   - Add Service → GitHub Repo
   - เลือก repo เดียวกัน
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Start Command: `npm run start`

### 3.3 ตั้งค่า Environment Variables

**Backend Service Variables:**
```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<from-generate-secrets>
JWT_REFRESH_SECRET=<from-generate-secrets>
SESSION_SECRET=<from-generate-secrets>
ENCRYPTION_KEY=<from-generate-secrets>
LINE_CHANNEL_ACCESS_TOKEN=<your-line-token>
LINE_CHANNEL_SECRET=<your-line-secret>
FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
BACKEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGIN=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
```

**Frontend Service Variables:**
```env
NODE_ENV=production
VITE_API_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}
VITE_BACKEND_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}
```

**✅ Checklist Railway Setup:**
- [ ] PostgreSQL service สร้างแล้ว
- [ ] Backend service สร้างแล้ว
- [ ] Frontend service สร้างแล้ว
- [ ] Environment variables ตั้งค่าครบ
- [ ] Service references ถูกต้อง (${{...}})

---

## 📋 Phase 4: Deploy to Railway

### 4.1 Push to Git

```bash
# 1. ตรวจสอบว่าไฟล์ที่ไม่ควร commit ถูก ignore
git status

# 2. Add files
git add .

# 3. Commit
git commit -m "feat: restructure project for deployment"

# 4. Push
git push origin main
```

### 4.2 Deploy

Railway จะ auto-deploy เมื่อ push ไป GitHub

หรือ deploy manual:
```bash
cd deployment/railway
./railway-deploy-fullstack.sh
```

### 4.3 Run Migrations

```bash
# เข้าไปใน Backend service terminal บน Railway Dashboard
# หรือใช้ CLI:

railway run --service backend npm run prisma:migrate
railway run --service backend npm run seed:admin
```

**✅ Checklist Deployment:**
- [ ] Backend deploy สำเร็จ
- [ ] Frontend deploy สำเร็จ
- [ ] Migrations รันสำเร็จ
- [ ] Seed data สำเร็จ
- [ ] Services ทั้งหมด healthy

---

## 📋 Phase 5: ทดสอบ Production

### 5.1 ทดสอบ Backend

```bash
# ดู URL จาก Railway Dashboard
BACKEND_URL="https://your-backend.railway.app"

# ทดสอบ health check
curl $BACKEND_URL/health

# ทดสอบ login
curl -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

### 5.2 ทดสอบ Frontend

```bash
# เปิดเบราว์เซอร์
FRONTEND_URL="https://your-frontend.railway.app"

# ทดสอบ:
# 1. หน้าเว็บโหลดได้
# 2. Login ได้
# 3. ดึงข้อมูลจาก backend ได้
# 4. ไม่มี CORS errors
```

### 5.3 ตรวจสอบ Logs

```bash
# Backend logs
railway logs --service backend

# Frontend logs
railway logs --service frontend

# Database logs
railway logs --service postgres
```

**✅ Checklist Production:**
- [ ] Backend ตอบกลับได้
- [ ] Frontend โหลดได้
- [ ] Login ทำงานได้
- [ ] API calls ทำงานได้
- [ ] ไม่มี CORS errors
- [ ] ไม่มี critical errors ใน logs

---

## 🐛 Common Issues & Solutions

### Issue 1: Database Connection Failed
```bash
# ตรวจสอบ DATABASE_URL
railway variables --service backend

# ตรวจสอบว่า PostgreSQL service รันอยู่
railway status --service postgres
```

### Issue 2: CORS Errors
```bash
# ตรวจสอบ CORS_ORIGIN และ FRONTEND_URL
# ต้องตรงกับ domain จริงของ frontend
```

### Issue 3: Build Failed
```bash
# ดู build logs
railway logs --service backend

# ตรวจสอบ:
# - Dependencies ครบไหม
# - Build command ถูกต้องไหม
# - Environment variables ครบไหม
```

### Issue 4: Migration Failed
```bash
# Run migrations manual
railway run --service backend npm run prisma:migrate

# หรือ reset database (ระวัง!)
railway run --service backend npm run prisma:reset
```

---

## 📊 Recommended Testing Flow

### 🥇 แนวทางที่ดีที่สุด (Best Practice)

```
1. ✅ ทดสอบ Backend Local
2. ✅ ทดสอบ Frontend Local
3. ✅ ทดสอบ Docker Compose Local (สำคัญมาก!)
4. ✅ แก้ไขปัญหาที่พบ
5. ✅ ทดสอบ Production Build Local
6. ✅ Commit & Push to Git
7. ✅ Setup Railway Services
8. ✅ Deploy to Railway
9. ✅ Run Migrations
10. ✅ ทดสอบ Production
```

### ⚡ แนวทางเร็ว (Quick Deploy)

```
1. ✅ ทดสอบ Backend Local
2. ✅ ทดสอบ Frontend Local
3. ✅ Commit & Push to Git
4. ✅ Deploy to Railway
5. ⚠️ แก้ไขปัญหาบน Railway (ช้ากว่า)
```

---

## 💡 Tips

### ✅ ควรทำ
- ✅ ทดสอบ Docker Compose ก่อน deploy
- ✅ Generate secrets ใหม่สำหรับ production
- ✅ ใช้ environment variables แทน hardcode
- ✅ ตรวจสอบ logs หลัง deploy
- ✅ Backup database ก่อน run migrations

### ❌ ไม่ควรทำ
- ❌ Deploy โดยไม่ทดสอบ local
- ❌ ใช้ secrets เดียวกับ development
- ❌ Commit .env files ที่มี secrets จริง
- ❌ Run migrations โดยไม่ backup
- ❌ ใช้ default passwords

---

## 📞 Need Help?

หากพบปัญหา:
1. ดู logs: `railway logs --service <service-name>`
2. ตรวจสอบ environment variables
3. ทดสอบ local ด้วย Docker Compose
4. ดู [Railway Documentation](https://docs.railway.app/)
5. ติดต่อทีม DevOps

---

## ✅ Final Checklist

ก่อน deploy production:

### Local Testing
- [ ] Backend ทำงานได้บน local
- [ ] Frontend ทำงานได้บน local
- [ ] Docker Compose ทำงานได้
- [ ] Production build สำเร็จ
- [ ] ไม่มี errors ใน console/logs

### Railway Setup
- [ ] PostgreSQL service สร้างแล้ว
- [ ] Backend service สร้างแล้ว
- [ ] Frontend service สร้างแล้ว
- [ ] Environment variables ตั้งค่าครบ
- [ ] Secrets generate ใหม่แล้ว

### Deployment
- [ ] Code push to Git แล้ว
- [ ] Deploy สำเร็จ
- [ ] Migrations รันแล้ว
- [ ] Seed data แล้ว
- [ ] ทดสอบ production แล้ว

### Production Testing
- [ ] Backend API ตอบกลับได้
- [ ] Frontend โหลดได้
- [ ] Login ทำงานได้
- [ ] ไม่มี CORS errors
- [ ] ไม่มี critical errors

---

**พร้อม Deploy แล้ว! 🚀**
