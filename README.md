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

ปัญหา (Pain Point): ธุรกิจ SME และเจ้าหน้าที่สินเชื่อมักได้รับข้อมูลทางการเงินเป็นไฟล์ Excel ที่รูปแบบไม่สม่ำเสมอ (เช่น merged cells, ตารางหลายชุด, ชื่อคอลัมน์ไม่คงที่) ทำให้การประเมินเครดิตต้องใช้การแปลงข้อมูลและตรวจสอบด้วยคนจำนวนมาก เกิดความล่าช้า และเพิ่มความเสี่ยงจากข้อมูลขาดหรือผิดพลาดในการตัดสินใจอนุมัติและการเบิกจ่ายเงิน

แนวทางของระบบ: ระบบนี้ออกแบบมาเพื่อแปลง Excel ให้เป็นข้อมูลเชิงโครงสร้างแบบ deterministic (อาศัยกฎและ parser ที่อ่านได้จากโค้ด ไม่พึ่งพิง AI สำหรับโครงสร้างหลัก) โดยมีชั้นจั��การ merged-cells, ตรวจ��ับตารางแบบไดนามิก, แมป sheet ตาม configuration และรัน parser ย่อยเพื่อแปลงเป็นโครงสร้างกลาง (เช่น ParsedBusinessProfile / ParsedExcelData) จากนั้นตรวจสอบคุณภาพข้อมูล (confidence), เติมข้อมูลเสริมจาก credit bureau/statement, คำนวณ DSCR/score และขับเคลื่อน workflow การอนุมัติ → สร้าง transaction การเบิกจ่ายภายใน serializable DB transaction ก่อนส่งคำสั่งชำระเงินจริง

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

## 🏗️ System Architecture & Data Flow (อธิบายจากการอ่านโค้ด)

ภาพรวมการทำงาน (Data Flow) ที่ได้จากการอ่านโค้ดในโปรเจกต์:

1. รับไฟล์ Excel (Buffer) แล้วอ่านด้วย exceljs-adapter (backend/src/core/utils/exceljs-adapter.ts) → แปลงเป็น WorkBook/WorkSheet (2D array) พร้อมข้อมูล merged ranges
2. ทำ pre-processing โดยเติมค่าใน merged cells (fillMergedCells) เพื่อป้องกันการสูญหายของค่าเมื่อแปลงเป็น JSON
3. ตรวจจับตารางและ header แบบไดนามิก (excel-table-detector) เพื่อหา header row, ขอบเขตของ���้อมูล และ closing rows เช่น รวม/ยอดรวม
4. แมปชื่อ sheet ไปยังชนิดเอกสารด้วย SHEET_CONFIGS (helpers/excel-sheet-config.ts) เช่น loan_application, financial_statement, tax_certificate
5. เรียก parser เฉพาะด้าน (parsers/extended) เช่น parseFinancialStatements, parseVATRecords, parseCreditBureauReports, parseBankStatements, parseDSCR เพื่อแปลงตารางเป็นโครงสร้างข้อมูลกลาง (ParsedBusinessProfile / ParsedExcelData)
6. ประเมินคุณภาพการแยกข้อมูลด้วย calculateConfidence (helpers/excel-parser-confidence.ts) แล้วเก็บ warnings / missing fields
7. บันทึกผลลัพธ์เชิงโครงสร้างลงฐานข้อมูล (Prisma/PostgreSQL) พร้อม transactional logic (approval/disbursement ใช้ serializable transaction เพื่อป้องกัน race condition และ duplicate disbursement)
8. ใช้ Redis สำหรับ caching (query/session) และ Bull/BullMQ สำหรับ background jobs (เช่น NPL detection ทุก 15 นาที, daily penalty run)
9. เมื่อผ่���นเกณฑ์อนุมัติ: สร้างรายการเบิกจ่ายภายใน transaction เดียว → trigger notification (LINE OA) → เรียก API การชำระเงิน/ระบบบัญชีภายนอกเพื่อทำการโอนหรือออกบันทึกจ่าย

---

### Excel-parsed Data Structures (13 ส่วน — แมปจาก interfaces/parsers ในโค้ด)

ระบบจะสกัดข้อมูลจาก Excel และแมปเป็นโครงสร้างกลางตามไฟล์ parser และ adapter ใน repository ดังนี้:

1) Company Info (companyInfo)
   - โครงสร้าง: { companyName, registrationNumber?, taxId?, registeredCapital?, paidUpCapital?, address?, phone?, email?, establishmentYear? }
   - ใช้สำหรับ KYC, การอ้างอิงลูกค้า และแสดงในรายงาน

2) Shareholders
   - โครงสร้าง: [{ name, sharePercentage, shareValue, hasSigningAuthority, conditions }]
   - ใช้ตรวจสอบผู้มีอำนาจลงนามและสัดส่วนการถือหุ้น

3) Loan Summary (loanSummary)
   - โครงสร้าง: { existingLoans: [...], newLoans: [...], totalExisting, totalNew, totalAll }
   - ใช้สรุปภาระหนี้ปัจจุบันและวงเงินที่ขอใหม่ เป็น input ให้ DSCR/credit scoring

4) Financial Statements (financialStatements / ExtendedFinancialStatement)
   - โครงสร้าง: รายการบัญชีตามปี { lineItem, year, amount, category } และฟิลด์ขยาย (revenue, ebitda, netProfit, depreciation, tax, etc.)
   - ใช้คำนวณอัตราส่วนทางการเงินและตรวจสอบความต่อเนื่องของรายได้

5) Balance Sheets (balanceSheets / ExtendedBalanceSheet)
   - โครงสร้าง: [{ period, totalAssets, totalLiabilities, equity, currentAssets?, nonCurrentAssets?, currentLiabilities?, nonCurrentLiabilities? }]
   - ใช้วิเคราะห์สภาพคล่องและความมั่นคงทางการเงิน

6) VAT / Tax Records (vatRecords / ภพ30)
   - โครงสร้าง: [{ period, companyName, taxId, salesAmount, purchaseAmount, taxWithheld, cashSales?, creditSales? }]
   - ใช้เป็น cross-check รา��ได้และประเมินภาษี

7) Credit Bureau Reports (creditBureau / creditBureauReports)
   - โครงสร้าง: { borrowerName, reportDate, totalCreditLimit, totalOutstanding, creditUtilization, nplAccounts, accounts: [...] }
   - ใช้ประกอบ scoring และตรวจจับ NPL

8) Bank Statements (bankStatements)
   - โครงสร้าง: [{ accountName, bank, accountNumber, period, openingBalance, closingBalance, totalDeposits, totalWithdrawals, balance }]
   - ใช้วิเคราะห์กระแสเงินสดจริงและเป็น input ให้ working capital / DSCR

9) Investment Structure (investmentStructure)
   - โครงสร้าง: { totalInvestment, debtToEquityRatio, items: [{ name, ownCapital, bankLoan, fundLoan, smeBank, total }], notes }
   - ใช้วิเคราะห์โครงสร้างทุน-หนี้และ covenant

10) Working Capital Analysis (workingCapitalAnalysis)
   - โครงสร้าง: { totalNeeded, additionalNeeded, receivables: { percentage, days, amount }, stock, payables: { percentage, days, amount }, existingCredit }
   - ใช้กำหนดวงเงินหมุนเวียนและระยะเวลาคืนทุน

11) Projections / Cashflow Projections (projections)
   - โครงสร้าง: { headers, revenue[], costOfSales[], grossProfit[], ebitda[], netProfit[], dscr[], debtRepayment[] }
   - ใช้ทำ stress-test และคาดการณ์ความสามารถในการชำระหนี้

12) Suppliers & Customers (suppliersAndCustomers)
   - โครงสร้าง: [{ name, type, transactionVolume, outstandingReceivableOrPayable }]
   - ใช้ประเมิน concentration risk และความเชื่อมโยงของเงินทุนหมุนเวียน

13) DSCR / Debt Service Schedule (dscr)
   - โครงสร้าง: [{ period, interestPayment, principalPayment, totalDebtService, dscrValue }]
   - ใช้เป็นเงื่อนไขอนุมัติหลักและสร้าง repayment schedule ก่อน disbursement

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
