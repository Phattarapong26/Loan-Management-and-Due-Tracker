# โครงสร้างโปรเจค DueTracker 2026

## 📁 โครงสร้างหลัก

```
DueTracker2026/
│
├── backend/                    # 🔧 Backend API Service
│   ├── src/                   # Source code
│   ├── prisma/                # Database schema & migrations
│   ├── scripts/               # Utility scripts
│   ├── assets/                # Static assets (fonts, images)
│   ├── database/              # Database documentation
│   ├── database-exports/      # Database backups
│   ├── docs/                  # Backend documentation
│   ├── Dockerfile             # Backend Docker config
│   ├── package.json           # Backend dependencies
│   └── tsconfig.json          # TypeScript config
│
├── frontend/                   # 🎨 Frontend Web Application
│   ├── src/                   # Source code
│   ├── public/                # Public assets
│   ├── scripts/               # Build scripts
│   ├── Dockerfile             # Frontend Docker config
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── tailwind.config.ts     # Tailwind CSS config
│
├── deployment/                 # 🚀 Deployment Configurations
│   ├── railway/               # Railway platform
│   │   ├── scripts/          # Deployment scripts
│   │   ├── railway.toml      # Railway config
│   │   ├── Procfile          # Process config
│   │   └── *.sh              # Shell scripts
│   └── docker/                # Docker deployment
│       ├── docker-compose.yml
│       ├── Dockerfile
│       └── README.md
│
├── docs/                       # 📚 Documentation
│   ├── deployment/            # Deployment guides
│   ├── setup/                 # Setup guides
│   │   ├── ENV_SETUP_GUIDE.md
│   │   ├── GENERATE_SECRETS.md
│   │   └── QUICK_START.md
│   └── guides/                # User guides
│       └── README_FULLSTACK.md
│
├── .gitignore                 # Git ignore rules
└── README.md                  # Main documentation

```

## 🎯 แยกส่วนชัดเจน

### ✅ Backend (`backend/`)
- **ไม่มี** frontend code
- **ไม่มี** deployment scripts ที่ไม่เกี่ยวข้อง
- มีเฉพาะ backend-specific files
- Deploy แยกอิสระได้

### ✅ Frontend (`frontend/`)
- **ไม่มี** backend code
- **ไม่มี** database files
- มีเฉพาะ frontend-specific files
- Deploy แยกอิสระได้

### ✅ Deployment (`deployment/`)
- รวม deployment configs ทั้งหมด
- แยกตาม platform (Railway, Docker)
- Scripts สำหรับ automation
- **ไม่ปน** กับ source code

### ✅ Documentation (`docs/`)
- เอกสารทั้งหมดอยู่ที่เดียว
- แยกตามหมวดหมู่ชัดเจน
- ง่ายต่อการค้นหา

## 🚀 การ Deploy

### Deploy Backend เท่านั้น
```bash
cd backend
# Railway
railway up

# Docker
docker build -t backend .
docker run -p 3000:3000 backend
```

### Deploy Frontend เท่านั้น
```bash
cd frontend
# Railway
railway up

# Docker
docker build -t frontend .
docker run -p 5173:5173 frontend
```

### Deploy ทั้งระบบ
```bash
# Railway
cd deployment/railway
./railway-deploy-fullstack.sh

# Docker
cd deployment/docker
docker-compose up -d
```

## 📦 Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start dev server
npm run build        # Build for production
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
```

## 🌐 Environment Variables

### Backend
สร้างไฟล์ `backend/.env`:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
```

### Frontend
สร้างไฟล์ `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_LINE_LIFF_ID=...
```

### Railway
ดูตัวอย่างใน `deployment/railway/.env.railway.example`

## 📖 เอกสารเพิ่มเติม

- [Quick Start Guide](docs/setup/QUICK_START.md)
- [Environment Setup](docs/setup/ENV_SETUP_GUIDE.md)
- [Railway Deployment](deployment/railway/README.md)
- [Docker Deployment](deployment/docker/README.md)
- [Fullstack Guide](docs/guides/README_FULLSTACK.md)

## ✨ ข้อดีของโครงสร้างใหม่

1. **แยกส่วนชัดเจน** - Backend, Frontend, Deployment แยกกันสมบูรณ์
2. **Deploy ง่าย** - Deploy แต่ละส่วนแยกอิสระได้
3. **Maintain ง่าย** - หาไฟล์ง่าย รู้ว่าอะไรอยู่ที่ไหน
4. **Scale ง่าย** - แต่ละส่วน scale แยกกันได้
5. **CI/CD ง่าย** - Setup pipeline แยกกันได้
6. **Team Work ง่าย** - Frontend/Backend dev ทำงานแยกกันได้

## 🔄 Migration จากโครงสร้างเก่า

ถ้ามี scripts หรือ configs ที่อ้างอิงถึง path เก่า ต้องอัพเดท:

**เก่า:**
```bash
./railway-deploy.sh
```

**ใหม่:**
```bash
./deployment/railway/railway-deploy.sh
```

**เก่า:**
```bash
docker-compose up
```

**ใหม่:**
```bash
cd deployment/docker
docker-compose up
```
