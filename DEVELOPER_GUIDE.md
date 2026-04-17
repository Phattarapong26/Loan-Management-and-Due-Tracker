# Developer Guide

คู่มือสำหรับ developers ที่จะเริ่มพัฒนาโปรเจค DueTracker 2026

## 🎯 เริ่มต้นอย่างรวดเร็ว

### 1. Clone Repository
```bash
git clone <repository-url>
cd DueTracker2026
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# แก้ไข .env ตามความเหมาะสม
npm run prisma:generate
npm run prisma:migrate
npm run seed:admin
npm run dev
```

### 3. Setup Frontend (Terminal ใหม่)
```bash
cd frontend
npm install
cp .env.example .env
# แก้ไข .env ตามความเหมาะสม
npm run dev
```

### 4. เปิดเบราว์เซอร์
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📁 โครงสร้างโปรเจค

```
DueTracker2026/
├── backend/              # Backend API
├── frontend/             # Frontend Web App
├── deployment/           # Deployment configs
└── docs/                # Documentation
```

ดูรายละเอียดใน [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 🔧 Development Workflow

### Backend Development

#### 1. เริ่มต้น Development Server
```bash
cd backend
npm run dev
```

#### 2. Database Changes
```bash
# แก้ไข prisma/schema.prisma
npm run prisma:migrate
npm run prisma:generate
```

#### 3. เพิ่ม API Endpoint ใหม่
```typescript
// src/routes/example.ts
export default async function exampleRoutes(fastify: FastifyInstance) {
  fastify.get('/api/example', async (request, reply) => {
    return { message: 'Hello World' }
  })
}
```

#### 4. Run Tests
```bash
npm run test
npm run test:watch
```

### Frontend Development

#### 1. เริ่มต้น Development Server
```bash
cd frontend
npm run dev
```

#### 2. เพิ่ม Component ใหม่
```bash
# ใช้ Shadcn/ui
npx shadcn-ui@latest add button

# หรือสร้างเอง
mkdir src/components/MyComponent
touch src/components/MyComponent/index.tsx
```

#### 3. เพิ่ม Page ใหม่
```typescript
// src/pages/ExamplePage.tsx
export default function ExamplePage() {
  return <div>Example Page</div>
}

// src/App.tsx - เพิ่ม route
<Route path="/example" element={<ExamplePage />} />
```

#### 4. API Integration
```typescript
// src/services/api.ts
export const fetchExample = async () => {
  const response = await fetch(`${API_URL}/api/example`)
  return response.json()
}
```

## 🗄️ Database

### Schema Changes
```bash
cd backend

# 1. แก้ไข prisma/schema.prisma
# 2. สร้าง migration
npm run prisma:migrate

# 3. Generate Prisma Client
npm run prisma:generate
```

### Seed Data
```bash
# Seed admin user
npm run seed:admin

# Seed complete system
npm run seed:complete-system

# Seed specific data
npm run seed:loan-products
npm run seed:interest-rates
```

### Database Tools
```bash
# Open Prisma Studio
npm run prisma:studio

# Reset database
npm run prisma:reset

# Check database
npm run db:check-indexes
npm run db:check-orphans
```

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
npm run test

# Run specific tests
npm run test:unit
npm run test:integration

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm run test

# Watch mode
npm run test:watch
```

## 🐳 Docker Development

### Start All Services
```bash
cd deployment/docker
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services
```bash
docker-compose down
```

## 🔍 Debugging

### Backend Debugging

#### VS Code Launch Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "cwd": "${workspaceFolder}/backend",
  "console": "integratedTerminal"
}
```

#### Logs
```bash
# Backend logs มี log level
LOG_LEVEL=debug npm run dev
```

### Frontend Debugging

#### Browser DevTools
- React DevTools
- Redux DevTools (ถ้าใช้)
- Network tab สำหรับ API calls

#### Console Logs
```typescript
console.log('Debug:', data)
```

## 📝 Code Style

### Backend
- TypeScript strict mode
- ESLint configuration
- Prettier formatting

```bash
npm run lint
npm run format
```

### Frontend
- TypeScript strict mode
- ESLint configuration
- Tailwind CSS

```bash
npm run lint
```

## 🔐 Environment Variables

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

ดูตัวอย่างใน `.env.example` ของแต่ละโฟลเดอร์

## 🚀 Deployment

### Development
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Production Build
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

### Railway Deployment
```bash
cd deployment/railway
./railway-deploy-fullstack.sh
```

ดูรายละเอียดใน [deployment/README.md](deployment/README.md)

## 🐛 Common Issues

### Database Connection Error
```bash
# ตรวจสอบ DATABASE_URL
# ตรวจสอบว่า PostgreSQL รันอยู่
docker ps | grep postgres
```

### Port Already in Use
```bash
# หา process ที่ใช้ port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Prisma Client Error
```bash
npm run prisma:generate
```

### Module Not Found
```bash
# ลบ node_modules และ install ใหม่
rm -rf node_modules package-lock.json
npm install
```

## 📚 Resources

### Documentation
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Deployment Guide](deployment/README.md)
- [Project Structure](PROJECT_STRUCTURE.md)
- [Migration Guide](MIGRATION_GUIDE.md)

### External Resources
- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)

## 🤝 Contributing

### Git Workflow
```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
git add .
git commit -m "feat: add my feature"

# 3. Push to remote
git push origin feature/my-feature

# 4. Create Pull Request
```

### Commit Message Convention
```
feat: เพิ่ม feature ใหม่
fix: แก้ไข bug
docs: อัพเดทเอกสาร
style: แก้ไข code style
refactor: refactor code
test: เพิ่ม tests
chore: งานอื่นๆ
```

## 💡 Tips

1. **ใช้ TypeScript** - ใช้ type safety เต็มที่
2. **เขียน Tests** - เขียน tests สำหรับ business logic
3. **ใช้ Git** - commit บ่อยๆ ด้วย meaningful messages
4. **อ่านเอกสาร** - อ่าน README ของแต่ละโฟลเดอร์
5. **ถาม** - ถ้าไม่แน่ใจ ถามทีมก่อน

## 📞 Support

หากมีปัญหาหรือคำถาม:
1. ดู [Documentation](docs/)
2. ตรวจสอบ [Common Issues](#-common-issues)
3. ติดต่อทีม DevOps

## ✅ Checklist สำหรับ Developer ใหม่

- [ ] Clone repository
- [ ] Setup backend
- [ ] Setup frontend
- [ ] Run both services
- [ ] เข้าใจโครงสร้างโปรเจค
- [ ] อ่าน documentation
- [ ] ทดสอบ API endpoints
- [ ] ทดสอบ frontend features
- [ ] เข้าใจ git workflow
- [ ] พร้อมเริ่มพัฒนา! 🎉
