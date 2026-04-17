# ⚡ Quick Reference Card

คู่มืออ้างอิงด่วนสำหรับโปรเจค DueTracker 2026

---

## 📁 โครงสร้าง

```
DueTracker2026/
├── backend/          # Backend API
├── frontend/         # Frontend Web
├── deployment/       # Deploy configs
└── docs/            # Documentation
```

---

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Docker
```bash
cd deployment/docker
docker-compose up -d
```

---

## 📝 Common Commands

### Backend
```bash
npm run dev              # Dev server
npm run build            # Build
npm run test             # Tests
npm run prisma:migrate   # Migrate DB
npm run seed:admin       # Seed admin
```

### Frontend
```bash
npm run dev              # Dev server
npm run build            # Build
npm run test             # Tests
npm run lint             # Lint
```

### Database
```bash
cd backend
npm run prisma:studio    # Open Studio
npm run prisma:reset     # Reset DB
npm run db:check-indexes # Check indexes
```

---

## 🚀 Deployment

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

---

## 📚 Documentation

| เอกสาร | คำอธิบาย |
|--------|----------|
| [README.md](README.md) | ภาพรวม |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | คู่มือ dev |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | โครงสร้าง |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | คู่มือย้าย |

---

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

---

## 🐛 Troubleshooting

### Port in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Prisma error
```bash
npm run prisma:generate
```

### Module not found
```bash
rm -rf node_modules
npm install
```

---

## 📞 Support

- 💬 Slack: #duetracker-dev
- 📧 Email: dev-team@company.com
- 📚 Docs: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

## 🔗 Quick Links

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Deployment Guide](deployment/README.md)
- [Full Documentation](DOCUMENTATION_INDEX.md)

---

**Version**: 2.0.0 | **Updated**: 2026-04-16
