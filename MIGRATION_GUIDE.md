# คู่มือการย้ายโครงสร้างโปรเจค

## 🔄 การเปลี่ยนแปลง

โครงสร้างโปรเจคถูกจัดระเบียบใหม่เพื่อแยก Backend, Frontend, และ Deployment ให้ชัดเจน

## 📋 สรุปการย้ายไฟล์

### ไฟล์ Deployment
```
เก่า: ./railway-*.sh
ใหม่: ./deployment/railway/railway-*.sh

เก่า: ./railway.toml, ./railway-fullstack.toml
ใหม่: ./deployment/railway/railway.toml, ./deployment/railway/railway-fullstack.toml

เก่า: ./Procfile
ใหม่: ./deployment/railway/Procfile

เก่า: ./nixpacks.toml
ใหม่: ./deployment/railway/nixpacks.toml

เก่า: ./Dockerfile (root)
ใหม่: ./deployment/docker/Dockerfile

เก่า: ./.env.railway.example
ใหม่: ./deployment/railway/.env.railway.example
```

### ไฟล์เอกสาร
```
เก่า: ./RAILWAY_*.md, ./DEPLOYMENT_*.md
ใหม่: ./docs/deployment/

เก่า: ./ENV_SETUP_GUIDE.md, ./GENERATE_SECRETS.md, ./QUICK_START.md
ใหม่: ./docs/setup/

เก่า: ./README_FULLSTACK.md
ใหม่: ./docs/guides/README_FULLSTACK.md
```

### Scripts
```
เก่า: ./generate-secrets.sh, ./test-railway-setup.sh
ใหม่: ./deployment/railway/scripts/
```

## 🔧 อัพเดท Scripts และ Configs

### 1. อัพเดท Path ใน Scripts

ถ้ามี scripts ที่อ้างอิงถึงไฟล์เหล่านี้ ต้องอัพเดท path:

**ตัวอย่าง:**
```bash
# เก่า
source ./railway-env-setup.sh

# ใหม่
source ./deployment/railway/railway-env-setup.sh
```

### 2. อัพเดท CI/CD Pipelines

ถ้าใช้ GitHub Actions, GitLab CI, หรือ CI/CD อื่นๆ:

**GitHub Actions (เก่า):**
```yaml
- name: Deploy
  run: ./railway-deploy.sh
```

**GitHub Actions (ใหม่):**
```yaml
- name: Deploy
  run: ./deployment/railway/railway-deploy.sh
```

### 3. อัพเดท Documentation Links

ถ้ามีเอกสารที่ link ไปยังไฟล์เหล่านี้:

```markdown
# เก่า
[Deployment Guide](RAILWAY_DEPLOYMENT.md)

# ใหม่
[Deployment Guide](docs/deployment/RAILWAY_DEPLOYMENT.md)
```

### 4. อัพเดท Docker Compose

ถ้าใช้ docker-compose จาก root:

```bash
# เก่า
docker-compose up

# ใหม่
cd deployment/docker
docker-compose up
```

หรือใช้ `-f` flag:
```bash
docker-compose -f deployment/docker/docker-compose.yml up
```

## 📝 Checklist การ Migration

- [ ] อัพเดท scripts ที่อ้างอิง railway-*.sh
- [ ] อัพเดท CI/CD pipelines
- [ ] อัพเดท documentation links
- [ ] อัพเดท docker-compose commands
- [ ] อัพเดท README และ setup guides
- [ ] ทดสอบ deployment scripts
- [ ] ทดสอบ docker-compose
- [ ] แจ้งทีมเกี่ยวกับการเปลี่ยนแปลง

## 🚀 ทดสอบหลัง Migration

### 1. ทดสอบ Backend
```bash
cd backend
npm install
npm run dev
```

### 2. ทดสอบ Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. ทดสอบ Docker
```bash
cd deployment/docker
docker-compose up
```

### 4. ทดสอบ Railway Deployment
```bash
cd deployment/railway
./railway-deploy.sh
```

## ❓ คำถามที่พบบ่อย

### Q: ไฟล์เก่าหายไปไหน?
A: ไฟล์ไม่ได้หายไป แค่ย้ายไปอยู่ในโฟลเดอร์ที่เหมาะสมกว่า ดูตาราง "สรุปการย้ายไฟล์" ด้านบน

### Q: Scripts เก่ายังใช้ได้ไหม?
A: ใช้ได้ แต่ต้องเรียกจาก path ใหม่ เช่น `./deployment/railway/railway-deploy.sh`

### Q: ต้องแก้ไข .gitignore ไหม?
A: ไม่จำเป็น .gitignore ยังใช้ได้ตามเดิม

### Q: Database migrations ยังใช้ได้ไหม?
A: ใช้ได้ตามปกติ migrations อยู่ใน `backend/prisma/migrations/`

### Q: Environment variables เปลี่ยนไหม?
A: ไม่เปลี่ยน ยังใช้ตัวแปรเดิมทั้งหมด

## 📞 ติดต่อ

หากมีปัญหาหรือคำถาม:
1. ดู [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
2. ดู [docs/setup/QUICK_START.md](docs/setup/QUICK_START.md)
3. ติดต่อทีม DevOps

## ✅ ข้อดีของโครงสร้างใหม่

1. **แยกส่วนชัดเจน** - ไม่ปนกันระหว่าง Backend, Frontend, Deployment
2. **Deploy ง่ายขึ้น** - แต่ละส่วน deploy แยกอิสระได้
3. **Maintain ง่ายขึ้น** - หาไฟล์ง่าย รู้ว่าอะไรอยู่ที่ไหน
4. **Scale ง่ายขึ้น** - แต่ละส่วน scale แยกกันได้
5. **Team Work ดีขึ้น** - Frontend/Backend dev ทำงานแยกกันได้

## 🎯 Next Steps

1. อ่าน [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) เพื่อเข้าใจโครงสร้างใหม่
2. ทดสอบ development environment
3. อัพเดท CI/CD pipelines
4. แจ้งทีมเกี่ยวกับการเปลี่ยนแปลง
5. อัพเดท documentation ที่เกี่ยวข้อง
