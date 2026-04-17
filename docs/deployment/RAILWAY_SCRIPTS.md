# 🛠️ Railway Scripts Reference

รวม scripts ทั้งหมดสำหรับ Railway deployment

## 📜 Available Scripts

### 🚀 Deployment Scripts

#### `./railway-deploy.sh`
Deploy code ขึ้น Railway

```bash
./railway-deploy.sh
```

**ทำอะไร:**
- ติดตั้ง Railway CLI (ถ้ายังไม่มี)
- Login และ link project
- Deploy code ขึ้น Railway
- รอให้ build เสร็จ

**เมื่อไหร่ใช้:**
- Deploy ครั้งแรก
- Update code
- Redeploy หลังแก้ไข

---

#### `./railway-setup-db.sh`
Setup database และ seed ข้อมูล (ครบวงจร)

```bash
./railway-setup-db.sh
```

**ทำอะไร:**
1. Generate Prisma Client
2. Push database schema
3. Seed admin user
4. Seed production data

**เมื่อไหร่ใช้:**
- หลัง deploy ครั้งแรก
- Reset database
- Setup database ใหม่

---

#### `./railway-db-push.sh`
Push database schema เฉพาะ (ไม่ seed)

```bash
./railway-db-push.sh
```

**ทำอะไร:**
- Push Prisma schema ไปยัง database
- ไม่ seed ข้อมูล

**เมื่อไหร่ใช้:**
- แก้ไข schema
- Sync schema กับ database
- ไม่ต้องการ seed ข้อมูลใหม่

---

#### `./railway-migrate.sh`
Run Prisma migrations (แทน db push)

```bash
./railway-migrate.sh
```

**ทำอะไร:**
- Run `prisma migrate deploy`
- Apply migrations จาก `prisma/migrations/`

**เมื่อไหร่ใช้:**
- ใช้ migrations แทน db push
- Production deployment ที่ต้องการ migration history

---

#### `./railway-seed.sh`
Seed ข้อมูลเฉพาะ (ไม่ push schema)

```bash
./railway-seed.sh
```

**ทำอะไร:**
1. Seed admin user
2. Seed production data

**เมื่อไหร่ใช้:**
- Database มี schema แล้ว
- ต้องการ seed ข้อมูลใหม่
- Reset data เฉพาะ

---

### 🛠️ Configuration Scripts

#### `./railway-set-env.sh` ⭐ NEW!
Set all environment variables automatically

```bash
./railway-set-env.sh
```

**ทำอะไร:**
- Generate secrets อัตโนมัติ
- Set LINE credentials
- Set email configuration
- Set URLs
- Set environment

**เมื่อไหร่ใช้:**
- Setup environment ครั้งแรก (แนะนำ)
- ต้องการ setup ทุกอย่างพร้อมกัน
- ไม่อยากทำทีละขั้นตอน

---

#### `./generate-secrets.sh`
สร้าง production secrets

```bash
./generate-secrets.sh
```

**ทำอะไร:**
- สร้าง JWT_SECRET
- สร้าง JWT_REFRESH_SECRET
- สร้าง SESSION_SECRET
- สร้าง ENCRYPTION_KEY

**เมื่อไหร่ใช้:**
- ก่อน deploy ครั้งแรก
- Rotate secrets
- สร้าง secrets ใหม่

---

#### `./railway-env-setup.sh`
Setup environment variables

```bash
./railway-env-setup.sh
```

**ทำอะไร:**
- Set LINE environment variables
- Set ค่าต่างๆ ใน Railway

**เมื่อไหร่ใช้:**
- Setup environment ครั้งแรก
- Update environment variables

---

#### `./railway-update-urls.sh`
Update URLs หลัง deploy

```bash
./railway-update-urls.sh
```

**ทำอะไร:**
- Set BACKEND_URL
- Set FRONTEND_URL
- Set CORS_ORIGIN

**เมื่อไหร่ใช้:**
- หลัง deploy ครั้งแรก
- เปลี่ยน domain
- Update URLs

---

### 🏥 Monitoring Scripts

#### `./railway-health-check.sh`
ตรวจสอบสถานะระบบ

```bash
./railway-health-check.sh
```

**ทำอะไร:**
- Test /health endpoint
- Check database connection
- Check Redis connection
- Test API endpoints

**เมื่อไหร่ใช้:**
- หลัง deploy
- Verify deployment
- Troubleshooting

---

## 🔄 Typical Workflows

### First Time Deployment

```bash
# 1. Generate secrets
./generate-secrets.sh

# 2. Copy secrets to Railway Dashboard
# (Manual step in Railway UI)

# 3. Deploy code
./railway-deploy.sh

# 4. Setup database
./railway-setup-db.sh

# 5. Update URLs
./railway-update-urls.sh

# 6. Health check
./railway-health-check.sh
```

### Update Code

```bash
# 1. Make changes
git add .
git commit -m "Update features"

# 2. Deploy
./railway-deploy.sh

# 3. Verify
./railway-health-check.sh
```

### Update Schema

```bash
# 1. Edit schema.prisma

# 2. Push schema
./railway-db-push.sh

# 3. Verify
railway logs --service backend
```

### Reset Database

```bash
# 1. Push schema (with --accept-data-loss)
./railway-db-push.sh

# 2. Seed data
./railway-seed.sh

# 3. Verify
./railway-health-check.sh
```

### Rotate Secrets

```bash
# 1. Generate new secrets
./generate-secrets.sh

# 2. Update in Railway Dashboard
# (Manual step)

# 3. Restart service
# (Automatic after variable change)

# 4. Verify
./railway-health-check.sh
```

## 🎯 Quick Reference

| Task | Script |
|------|--------|
| Deploy code | `./railway-deploy.sh` |
| Setup DB (first time) | `./railway-setup-db.sh` |
| Update schema | `./railway-db-push.sh` |
| Seed data | `./railway-seed.sh` |
| Generate secrets | `./generate-secrets.sh` |
| Update URLs | `./railway-update-urls.sh` |
| Health check | `./railway-health-check.sh` |
| View logs | `railway logs --service backend` |
| View variables | `railway variables --service backend` |

## 🐛 Troubleshooting

### Script Permission Denied

```bash
chmod +x railway-*.sh generate-secrets.sh
```

### Railway CLI Not Found

```bash
npm i -g @railway/cli
```

### Login Failed

```bash
railway logout
railway login
```

### Link Failed

```bash
railway unlink
railway link
```

### Build Failed

```bash
# Check logs
railway logs --service backend

# Try manual build
railway run --service backend npm run build
```

## 📚 Additional Resources

- [Quick Start Guide](./QUICK_START.md)
- [Full Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Generate Secrets Guide](./GENERATE_SECRETS.md)

---

**Happy Scripting! 🎉**
