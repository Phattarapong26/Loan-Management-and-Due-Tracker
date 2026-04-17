<div align="center">

# 🏦 SME D BANK — Loan Management System

**Enterprise-grade loan management platform for SME banking operations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📌 Overview

A full-stack loan management system built for SME banking, handling the complete lifecycle of loan applications — from customer onboarding and credit assessment to disbursement, repayment tracking, and NPL management.

> **Built with production-grade architecture**: role-based access control, real-time notifications via LINE OA, automated penalty calculation, Redis caching, and comprehensive security middleware.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **Multi-role Auth** | Admin / Branch Manager / Loan Officer with JWT + session management |
| 📋 **Loan Lifecycle** | Application → Approval → Disbursement → Repayment → NPL |
| 💰 **DSCR Calculator** | Debt Service Coverage Ratio with real-time financial analysis |
| 📊 **Dynamic Dashboards** | Role-specific dashboards with live KPIs and charts |
| 🔔 **LINE OA Integration** | Push notifications to customers and staff via LINE Official Account |
| 📄 **Document AI** | Excel/PDF parsing with AI-extracted business profile data |
| ⚖️ **Penalty Engine** | Automated daily penalty calculation with compound interest support |
| 🛡️ **Security Layer** | SSRF/XSS/SQL injection detection, rate limiting, IP blocking |
| 📈 **Reports & Analytics** | NPL ratio, DPD buckets, officer performance, branch summary |
| 🏢 **Multi-branch** | Branch isolation with cross-branch admin visibility |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20 + Fastify (high-performance HTTP framework)
- **Language**: TypeScript
- **ORM**: Prisma + PostgreSQL 15
- **Cache**: Redis 7 (query caching, session store)
- **Auth**: JWT (access + refresh tokens) + bcrypt
- **Queue**: Bull (background jobs)
- **Security**: Custom threat detection middleware (XSS, SQLi, SSRF, RFI)

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (server state) + React Context
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation

### Infrastructure
- **Containerization**: Docker + Docker Compose (4 containers)
- **Deployment**: Railway (cloud PaaS)
- **Database**: PostgreSQL with Prisma migrations
- **CI/CD**: GitHub → Railway auto-deploy

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│              React 18 + Vite + TypeScript                │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                  Fastify API Server                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Auth/RBAC  │  │  Business    │  │   Security    │  │
│  │  Middleware │  │  Logic Layer │  │   Scanner     │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
┌──────────▼──────┐  ┌────────▼────────┐
│   PostgreSQL 15  │  │    Redis 7      │
│   (Prisma ORM)   │  │  (Cache/Queue)  │
└──────────────────┘  └─────────────────┘
```

---

## 🚀 Quick Start (Docker)

```bash
# Clone
git clone https://github.com/Phattarapong26/Loan-Management-and-Due-Tracker.git
cd Loan-Management-and-Due-Tracker

# Start all 4 containers
cd deployment/docker
docker-compose up -d

# Seed database
docker exec duetracker-backend npx tsx prisma/seed-complete-system-2025.ts

# Access
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

**Default credentials after seed:**
| Role | Email | Password |
|------|-------|----------|
| Admin | phattarapong.phe@gmail.com | 1234567890 |
| Manager | dearnull88@gmail.com | manager123 |
| Officer | drpattarapong66@gmail.com | officer123 |

---

## 📁 Project Structure

```
├── backend/                  # Fastify API server
│   ├── src/
│   │   ├── modules/          # Feature modules (loans, customers, payments...)
│   │   ├── core/             # Middleware, utils, config
│   │   ├── jobs/             # Background schedulers
│   │   └── routes/           # Route registration
│   └── prisma/               # Schema + migrations + seed scripts
│
├── frontend/                 # React application
│   └── src/
│       ├── features/         # Feature-based modules
│       ├── shared/           # Reusable components, hooks, utils
│       └── app/              # App entry, routing
│
└── deployment/
    ├── docker/               # Docker Compose (local dev)
    └── railway/              # Railway deployment configs
```

---

## 🔒 Security Highlights

- **Threat Detection**: Real-time scanning for XSS, SQL injection, SSRF, RFI, command injection
- **Rate Limiting**: Per-endpoint rate limits with auto IP blocking after brute force
- **Encryption**: AES-256-GCM for sensitive data (Thai ID, tax ID, phone numbers)
- **Session Management**: Sliding sessions with refresh token rotation
- **RBAC**: Fine-grained permissions per role with branch isolation

---

## 📊 Business Logic Highlights

- **Loan Approval**: Serializable transaction to prevent race conditions on budget reservation
- **Penalty Calculation**: DAILY/PERCENTAGE/FIXED_AMOUNT rules with compound interest for NPL (≥90 days)
- **NPL Detection**: Auto-escalation when `overdueDays ≥ 90`, synced every 15 minutes
- **DSCR**: Net Operating Income / Debt Service with real-time validation
- **Disbursement**: Single auto-create inside transaction (prevents duplicate disbursements)

---

## 👨‍💻 Developer

**Phattarapong** — Full-Stack Developer

Built this system end-to-end: database schema design, REST API, React frontend, Docker setup, security middleware, and production deployment on Railway.

---

<div align="center">
<sub>SME D BANK Loan Management System — Production Ready 🚀</sub>
</div>
