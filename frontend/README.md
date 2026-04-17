# Frontend Web Application

Frontend web application สำหรับระบบติดตามหนี้สินและการจัดการสินเชื่อ

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Shadcn/ui + Radix UI
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **Charts**: Chart.js + Recharts
- **Icons**: Lucide React + Ant Design Icons

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (default: http://localhost:3000)

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

### 3. Start Development Server
```bash
npm run dev
```

Application จะรันที่ `http://localhost:5173`

## 📝 Available Scripts

### Development
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run build:dev        # Build for development
npm run preview          # Preview production build
npm run start            # Start production server (for Railway)
```

### Code Quality
```bash
npm run lint             # Run ESLint
```

### Testing
```bash
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Shadcn/ui components
│   │   └── ...          # Feature components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   ├── styles/          # Global styles
│   ├── App.tsx          # Main App component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── scripts/             # Build scripts
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## 🎨 UI Components

โปรเจคใช้ [Shadcn/ui](https://ui.shadcn.com/) components:

### Available Components
- Accordion, Alert Dialog, Avatar
- Button, Badge, Card
- Checkbox, Combobox, Command
- Dialog, Dropdown Menu
- Form, Input, Label
- Select, Slider, Switch
- Table, Tabs, Toast
- Tooltip, ... และอื่นๆ

### Adding New Components
```bash
npx shadcn-ui@latest add [component-name]
```

## 🔐 Environment Variables

ดูตัวอย่างใน `.env.example`

### Required Variables
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)
- `VITE_BACKEND_URL` - Backend URL (same as API_URL)

### Optional Variables
- `VITE_LINE_LIFF_ID` - LINE LIFF ID
- `VITE_ENABLE_DEBUG` - Enable debug mode
- `VITE_ENABLE_MOCK_DATA` - Enable mock data

**⚠️ Important**: All `VITE_` prefixed variables are exposed to the browser. Do not put sensitive data in these variables.

## 🎯 Features

### Authentication
- Login / Logout
- JWT token management
- Protected routes
- Role-based access control

### Dashboard
- Overview statistics
- Charts and graphs
- Recent activities
- Quick actions

### Loan Management
- Loan list and details
- Create/Edit loans
- Payment tracking
- Interest calculation

### Customer Management
- Customer list and profiles
- Customer documents
- Transaction history

### Reports
- Financial reports
- Payment reports
- Export to Excel
- Print functionality

## 🔧 Configuration

### Vite Configuration
แก้ไขใน `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

### Tailwind Configuration
แก้ไขใน `tailwind.config.ts`:
```typescript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Custom theme
    }
  }
}
```

## 🧪 Testing

### Run Tests
```bash
npm run test
```

### Watch Mode
```bash
npm run test:watch
```

### Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   └── utils/
```

## 🐳 Docker

### Build Image
```bash
docker build -t frontend .
```

### Run Container
```bash
docker run -p 5173:5173 --env-file .env frontend
```

### Using Docker Compose
```bash
cd ../deployment/docker
docker-compose up frontend
```

## 🚀 Deployment

### Railway
```bash
cd ../deployment/railway
# Deploy frontend
railway up
```

### Build for Production
```bash
npm run build
```

Output จะอยู่ใน `dist/` folder

### Preview Production Build
```bash
npm run preview
```

## 📱 Responsive Design

Application รองรับ:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large Desktop (1440px+)

## 🎨 Theming

### Light/Dark Mode
Application รองรับ light และ dark mode:
```typescript
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()
setTheme('dark') // or 'light'
```

### Custom Colors
แก้ไขใน `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      primary: {...},
      secondary: {...}
    }
  }
}
```

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Change port in vite.config.ts or use:
npm run dev -- --port 3001
```

### API Connection Error
```bash
# Check VITE_API_URL in .env
# Make sure backend is running
```

### Build Error
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Query Documentation](https://tanstack.com/query)

## 📖 More Documentation

- [Component Guide](docs/components.md)
- [API Integration](docs/api-integration.md)
- [Deployment Guide](../deployment/README.md)

## 📄 License

Private Project
