# DueTracker 2026

ระบบติดตามหนี้สินและการจัดการสินเชื่อ

## 📁 โครงสร้างโปรเจค

```
project-root/
├── backend/              # Backend API (Node.js + Express + Prisma)
├── frontend/             # Frontend Web App (React + Vite + TypeScript)
├── deployment/           # Deployment configurations
│   ├── railway/         # Railway deployment scripts & configs
│   └── docker/          # Docker configurations
└── docs/                # Documentation
    ├── deployment/      # Deployment guides
    ├── setup/           # Setup & configuration guides
    └── guides/          # User guides & tutorials
```

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📚 Documentation

- **Setup Guides**: `docs/setup/`
- **Deployment**: `docs/deployment/`
- **User Guides**: `docs/guides/`

## 🧪 Testing Before Deployment

**⚠️ สำคัญ: ทดสอบก่อน deploy จริง!**

### Quick Test (แนะนำ)
```bash
# ทดสอบด้วย Docker Compose
./deployment/docker/test-local.sh
```

### Full Testing Guide
ดู [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) สำหรับคำแนะนำทดสอบแบบละเอียด

## 🔧 Deployment

### Railway
```bash
cd deployment/railway
./railway-deploy-fullstack.sh
```

### Docker
```bash
cd deployment/docker
docker-compose up -d
```

## 📝 Environment Variables

ดูตัวอย่างไฟล์ environment:
- Backend: `backend/.env.example`
- Frontend: `frontend/.env.railway.example`
- Railway: `deployment/railway/.env.railway.example`

## 🏗️ Technology Stack

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- TypeScript

### Frontend
- React 18
- Vite
- TypeScript
- TailwindCSS
- Shadcn/ui

## 📄 License

Private Project
