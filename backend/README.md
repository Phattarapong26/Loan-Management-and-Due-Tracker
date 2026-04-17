# Backend API

Backend service สำหรับระบบติดตามหนี้สินและการจัดการสินเชื่อ

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Fastify
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Queue**: BullMQ + Redis
- **Authentication**: JWT
- **Validation**: Zod

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis (optional, for queue)
- npm or yarn

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# แก้ไขค่าใน .env ตามความเหมาะสม
```

### 3. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run seed:admin
```

### 4. Start Development Server
```bash
npm run dev
```

Server จะรันที่ `http://localhost:3000`

## 📝 Available Scripts

### Development
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run start            # Start production server
```

### Database
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:reset     # Reset database
npm run prisma:seed      # Seed database
```

### Seeding
```bash
npm run seed:admin                # Seed admin user only
npm run seed:complete-system      # Seed complete system
npm run seed:production-2025      # Seed production data
npm run seed:loan-products        # Seed loan products
npm run seed:interest-rates       # Seed interest rates
npm run seed:branch-locations     # Seed branch locations
```

### Testing
```bash
npm run test                      # Run all tests
npm run test:watch                # Run tests in watch mode
npm run test:coverage             # Run tests with coverage
npm run test:unit                 # Run unit tests only
npm run test:integration          # Run integration tests
npm run test:worst-case           # Run worst-case scenarios
npm run test:real-world           # Run real-world scenarios
```

### Database Management
```bash
npm run db:reset                  # Reset database
npm run db:check-orphans          # Check orphan data
npm run db:check-indexes          # Check database indexes
npm run db:add-indexes            # Add missing indexes
npm run db:export-schema          # Export database schema
npm run db:er-diagram             # Generate ER diagram
```

### Performance
```bash
npm run monitor                   # Monitor performance
npm run monitor:fast              # Monitor with 2s interval
npm run monitor:slow              # Monitor with 10s interval
npm run performance:test          # Test performance setup
```

### Rich Menu (LINE)
```bash
npm run rich-menu:init            # Initialize rich menus
npm run rich-menu:upload          # Upload rich menu images
npm run rich-menu:verify          # Verify production ready
npm run rich-menu:reset           # Reset rich menus
npm run rich-menu:delete-all      # Delete all rich menus
```

### Code Quality
```bash
npm run lint                      # Run ESLint
npm run format                    # Format code with Prettier
```

### Docker
```bash
npm run docker:up                 # Start Docker containers
npm run docker:down               # Stop Docker containers
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   └── server.ts         # Main server file
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Database migrations
│   └── seed*.ts          # Seed scripts
├── scripts/              # Utility scripts
├── assets/               # Static assets
├── database/             # Database documentation
├── docs/                 # Documentation
├── Dockerfile            # Docker configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## 🔐 Environment Variables

ดูตัวอย่างใน `.env.example`

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret key
- `JWT_REFRESH_SECRET` - JWT refresh secret key
- `SESSION_SECRET` - Session secret key
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE channel access token
- `LINE_CHANNEL_SECRET` - LINE channel secret

### Optional Variables
- `REDIS_URL` - Redis connection string
- `SMTP_*` - Email configuration
- `PORT` - Server port (default: 3000)

## 🔧 Database Schema

ดู database schema ใน `prisma/schema.prisma`

### Main Tables
- `User` - ผู้ใช้งานระบบ
- `Customer` - ลูกค้า
- `Loan` - สินเชื่อ
- `Payment` - การชำระเงิน
- `Invoice` - ใบแจ้งหนี้
- `LoanProduct` - ผลิตภัณฑ์สินเชื่อ
- `InterestRate` - อัตราดอกเบี้ย
- `Branch` - สาขา

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Specific Tests
```bash
npm run test:unit                 # Unit tests
npm run test:integration          # Integration tests
npm run test:worst-case           # Worst-case scenarios
npm run test:real-world           # Real-world scenarios
```

### Test Coverage
```bash
npm run test:coverage
```

## 📊 Monitoring

### Performance Monitoring
```bash
npm run monitor
```

### Database Monitoring
```bash
npm run db:check-indexes
npm run db:check-orphans
```

## 🐳 Docker

### Build Image
```bash
docker build -t backend .
```

### Run Container
```bash
docker run -p 3000:3000 --env-file .env backend
```

### Using Docker Compose
```bash
cd ../deployment/docker
docker-compose up backend
```

## 🚀 Deployment

### Railway
```bash
cd ../deployment/railway
./railway-deploy.sh
```

### Manual Deployment
```bash
# Build
npm run build

# Run migrations
npm run prisma:migrate

# Start server
npm start
```

## 📚 API Documentation

API endpoints:
- `GET /health` - Health check
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/users` - Get users
- `GET /api/loans` - Get loans
- `POST /api/loans` - Create loan
- ... (ดูเพิ่มเติมใน API documentation)

## 🔍 Troubleshooting

### Database Connection Error
```bash
# Check DATABASE_URL in .env
# Make sure PostgreSQL is running
```

### Prisma Client Error
```bash
npm run prisma:generate
```

### Migration Error
```bash
npm run prisma:reset
npm run prisma:migrate
```

## 📖 More Documentation

- [Database Schema](database/database.dbml)
- [API Documentation](docs/)
- [Deployment Guide](../deployment/README.md)

## 📄 License

Private Project
