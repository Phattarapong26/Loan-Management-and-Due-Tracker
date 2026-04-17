# 📚 Documentation Index

รวมเอกสารทั้งหมดของโปรเจค DueTracker 2026

## 🚀 เริ่มต้นใช้งาน

| เอกสาร | คำอธิบาย | สำหรับใคร |
|--------|----------|-----------|
| [README.md](README.md) | ภาพรวมโปรเจค | ทุกคน |
| [READY_TO_DEPLOY.md](READY_TO_DEPLOY.md) | 🔥 พร้อม deploy หรือยัง? | ทุกคน |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | คู่มือสำหรับ developers | Developers |
| [docs/setup/QUICK_START.md](docs/setup/QUICK_START.md) | เริ่มต้นอย่างรวดเร็ว | ทุกคน |

## 📁 โครงสร้างโปรเจค

| เอกสาร | คำอธิบาย |
|--------|----------|
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | โครงสร้างโปรเจคใหม่ |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | คู่มือการย้ายโครงสร้าง |
| [CHANGELOG.md](CHANGELOG.md) | บันทึกการเปลี่ยนแปลง |

## 🔧 Backend

| เอกสาร | คำอธิบาย |
|--------|----------|
| [backend/README.md](backend/README.md) | Backend documentation |
| [backend/.env.example](backend/.env.example) | Environment variables template |
| [backend/database/database.dbml](backend/database/database.dbml) | Database schema |

### Backend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run prisma:migrate` - Run migrations
- `npm run seed:admin` - Seed admin user

## 🎨 Frontend

| เอกสาร | คำอธิบาย |
|--------|----------|
| [frontend/README.md](frontend/README.md) | Frontend documentation |
| [frontend/.env.example](frontend/.env.example) | Environment variables template |

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linter

## 🚀 Deployment

| เอกสาร | คำอธิบาย |
|--------|----------|
| [READY_TO_DEPLOY.md](READY_TO_DEPLOY.md) | 🔥 Checklist ก่อน deploy |
| [RAILWAY_DEPLOYMENT_STEPS.md](RAILWAY_DEPLOYMENT_STEPS.md) | Railway step-by-step |
| [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) | Pre-deployment checklist |
| [deployment/README.md](deployment/README.md) | Deployment overview |
| [deployment/railway/README.md](deployment/railway/README.md) | Railway deployment |
| [deployment/docker/README.md](deployment/docker/README.md) | Docker deployment |

### Railway Deployment
```bash
cd deployment/railway
./railway-deploy-fullstack.sh
```

### Docker Deployment
```bash
cd deployment/docker
docker-compose up -d
```

## 📖 Setup & Configuration

| เอกสาร | คำอธิบาย |
|--------|----------|
| [docs/setup/ENV_SETUP_GUIDE.md](docs/setup/ENV_SETUP_GUIDE.md) | Environment setup |
| [docs/setup/GENERATE_SECRETS.md](docs/setup/GENERATE_SECRETS.md) | Generate secrets |
| [docs/setup/QUICK_START.md](docs/setup/QUICK_START.md) | Quick start guide |

## 📚 User Guides

| เอกสาร | คำอธิบาย |
|--------|----------|
| [docs/guides/README_FULLSTACK.md](docs/guides/README_FULLSTACK.md) | Fullstack development guide |
| [docs/README.md](docs/README.md) | Documentation overview |

## 🗄️ Database

### Schema & Migrations
- Schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Seed scripts: `backend/prisma/seed*.ts`

### Database Commands
```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Reset database
npm run prisma:reset

# Seed database
npm run seed:admin
npm run seed:complete-system
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm run test                  # All tests
npm run test:unit            # Unit tests
npm run test:integration     # Integration tests
npm run test:coverage        # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test                 # Run tests
npm run test:watch          # Watch mode
```

## 🐳 Docker

### Docker Compose
```bash
cd deployment/docker

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Services
```bash
# Backend
docker-compose up backend

# Frontend
docker-compose up frontend

# Database
docker-compose up postgres
```

## 🔐 Security

### Environment Variables
- **Backend**: `backend/.env.example`
- **Frontend**: `frontend/.env.example`
- **Railway**: `deployment/railway/.env.railway.example`

### Generate Secrets
```bash
cd deployment/railway/scripts
./generate-secrets.sh
```

## 📊 Monitoring & Performance

### Backend Monitoring
```bash
cd backend
npm run monitor              # Monitor performance
npm run db:check-indexes     # Check database indexes
npm run db:check-orphans     # Check orphan data
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check DATABASE_URL in .env
# Make sure PostgreSQL is running
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>
```

#### Prisma Client Error
```bash
cd backend
npm run prisma:generate
```

#### Module Not Found
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support & Resources

### Internal Documentation
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Deployment README](deployment/README.md)
- [Developer Guide](DEVELOPER_GUIDE.md)

### External Resources
- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)

## 🗺️ Quick Navigation

### For Developers
1. [Developer Guide](DEVELOPER_GUIDE.md) - เริ่มต้นที่นี่
2. [Backend README](backend/README.md) - Backend development
3. [Frontend README](frontend/README.md) - Frontend development
4. [Project Structure](PROJECT_STRUCTURE.md) - เข้าใจโครงสร้าง

### For DevOps
1. [Deployment README](deployment/README.md) - Deployment overview
2. [Railway Guide](deployment/railway/README.md) - Railway deployment
3. [Docker Guide](deployment/docker/README.md) - Docker deployment
4. [Migration Guide](MIGRATION_GUIDE.md) - Migration from old structure

### For Project Managers
1. [README](README.md) - Project overview
2. [Changelog](CHANGELOG.md) - What's changed
3. [Project Structure](PROJECT_STRUCTURE.md) - How it's organized

## 📝 Documentation Checklist

เมื่อเพิ่มเอกสารใหม่:
- [ ] เพิ่มลิงก์ใน DOCUMENTATION_INDEX.md
- [ ] เพิ่มใน README ของโฟลเดอร์ที่เกี่ยวข้อง
- [ ] ใช้ภาษาที่เข้าใจง่าย
- [ ] ใส่ตัวอย่าง code
- [ ] อัพเดท CHANGELOG.md

## 🎯 Next Steps

1. อ่าน [README.md](README.md) เพื่อเข้าใจภาพรวม
2. ตาม [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) เพื่อ setup environment
3. อ่าน [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) เพื่อเข้าใจโครงสร้าง
4. เริ่มพัฒนา! 🚀

---

**Last Updated**: 2026-04-16
**Version**: 2.0.0
