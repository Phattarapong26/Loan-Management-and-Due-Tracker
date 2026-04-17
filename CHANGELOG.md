# Changelog

## [2.0.0] - 2026-04-16

### 🎉 Major Restructure - Separated Frontend, Backend, and Deployment

#### ✨ Added
- **New folder structure** - แยก Backend, Frontend, Deployment ชัดเจน
- **deployment/** - โฟลเดอร์รวม deployment configurations
  - `deployment/railway/` - Railway deployment scripts & configs
  - `deployment/docker/` - Docker configurations
- **docs/** - โฟลเดอร์รวมเอกสารทั้งหมด
  - `docs/deployment/` - Deployment guides
  - `docs/setup/` - Setup & configuration guides
  - `docs/guides/` - User guides & tutorials
- **README files** - เพิ่ม README ในทุกโฟลเดอร์หลัก
  - `backend/README.md` - Backend documentation
  - `frontend/README.md` - Frontend documentation
  - `deployment/README.md` - Deployment documentation
  - `docs/README.md` - Documentation index
- **Environment examples**
  - `backend/.env.example` - Backend environment template
  - `frontend/.env.example` - Frontend environment template
- **Docker Compose** - `deployment/docker/docker-compose.yml` สำหรับ local development
- **Documentation**
  - `PROJECT_STRUCTURE.md` - โครงสร้างโปรเจคใหม่
  - `MIGRATION_GUIDE.md` - คู่มือการย้ายโครงสร้าง
  - `CHANGELOG.md` - บันทึกการเปลี่ยนแปลง

#### 📦 Moved
- **Railway files** - ย้ายจาก root ไปยัง `deployment/railway/`
  - `railway-*.sh` scripts
  - `railway.toml`, `railway-fullstack.toml`
  - `Procfile`, `nixpacks.toml`
  - `.env.railway.example`, `.railwayignore`
- **Docker files** - ย้ายจาก root ไปยัง `deployment/docker/`
  - `Dockerfile` (root level)
  - `.dockerignore` (root level)
- **Documentation** - ย้ายจาก root ไปยัง `docs/`
  - Deployment guides → `docs/deployment/`
  - Setup guides → `docs/setup/`
  - User guides → `docs/guides/`
- **Scripts** - ย้ายไปยัง `deployment/railway/scripts/`
  - `generate-secrets.sh`
  - `test-railway-setup.sh`

#### 🔄 Changed
- **Root README.md** - อัพเดทให้สะท้อนโครงสร้างใหม่
- **Project structure** - แยกส่วนชัดเจนขึ้น
  - Backend มีเฉพาะ backend code
  - Frontend มีเฉพาะ frontend code
  - Deployment แยกออกมาต่างหาก
  - Documentation รวมอยู่ที่เดียว

#### ✅ Benefits
1. **แยกส่วนชัดเจน** - Backend, Frontend, Deployment ไม่ปนกัน
2. **Deploy ง่าย** - Deploy แต่ละส่วนแยกอิสระได้
3. **Maintain ง่าย** - หาไฟล์ง่าย รู้ว่าอะไรอยู่ที่ไหน
4. **Scale ง่าย** - แต่ละส่วน scale แยกกันได้
5. **CI/CD ง่าย** - Setup pipeline แยกกันได้
6. **Team Work ง่าย** - Frontend/Backend dev ทำงานแยกกันได้

#### 🔧 Migration Required
- อัพเดท scripts ที่อ้างอิง railway-*.sh
- อัพเดท CI/CD pipelines
- อัพเดท documentation links
- ดู [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) สำหรับรายละเอียด

---

## [1.0.0] - 2026-02-20

### Initial Release
- Backend API with Fastify + TypeScript
- Frontend with React + Vite
- Database with Prisma + PostgreSQL
- LINE OA Integration
- Authentication & Authorization
- Loan Management System
- Payment Tracking
- Report Generation
