# 🔧 Environment Variables Setup Guide

คู่มือการตั้งค่า Environment Variables สำหรับ Railway

---

## 🎯 Quick Setup (แนะนำ)

### Option 1: Automatic Setup (ง่ายที่สุด)

```bash
./railway-set-env.sh
```

Script นี้จะทำทุกอย่างให้อัตโนมัติ:
- ✅ Generate secrets ใหม่ทั้งหมด
- ✅ Set LINE OA credentials
- ✅ Set email configuration
- ✅ Set URLs
- ✅ Set environment

**ใช้เวลาแค่ 1 นาที!**

---

## 📋 Option 2: Manual Setup

### Step 1: Generate Secrets

```bash
./generate-secrets.sh
```

Output:
```
JWT_SECRET=abc123...
JWT_REFRESH_SECRET=def456...
SESSION_SECRET=ghi789...
ENCRYPTION_KEY=jkl012...
```

### Step 2: Copy to Railway

ไปที่ Railway Dashboard → Backend Service → Variables

#### A. Secrets (จาก generate-secrets.sh)
```env
JWT_SECRET=<paste_from_generate_secrets>
JWT_REFRESH_SECRET=<paste_from_generate_secrets>
SESSION_SECRET=<paste_from_generate_secrets>
ENCRYPTION_KEY=<paste_from_generate_secrets>
```

#### B. LINE OA Configuration
```env
LINE_OA_ID=@186krrbq
LINE_CHANNEL_ACCESS_TOKEN=tUW8OkX4MbZ2ObcNReV8U+Rls3umowBFcteq0qT4cc6HwuJ+pWBL6cqbbAl3vE1H09Hnv+rd14YjHZXyI2Xv5lHDgFZ37fh9LLxkyx4mhDp7UyV/XRvdSHUPCF0PRjvRhVw7pPa0pM8ZlIuS8zD1sQdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=aee13b8ce5206c3531278dd9ce0ad347
```

#### C. Environment
```env
NODE_ENV=production
```

#### D. URLs (อัพเดทหลัง deploy ครั้งแรก)
```env
BACKEND_URL=https://backend-production-c6a3.up.railway.app
FRONTEND_URL=https://code-companion-b30f2741-production.up.railway.app
CORS_ORIGIN=https://code-companion-b30f2741-production.up.railway.app
```

#### E. Email Configuration (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=mulamedlab@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=mulamedlab@gmail.com
RESEND_API_KEY=re_gFhfDtue_KjBw89HX31RVM4hCa43BX39f
```

---

## 📊 Environment Variables Reference

### 🔐 Security Variables (Required)

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `JWT_SECRET` | JWT signing secret | `./generate-secrets.sh` |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | `./generate-secrets.sh` |
| `SESSION_SECRET` | Session encryption secret | `./generate-secrets.sh` |
| `ENCRYPTION_KEY` | Data encryption key | `./generate-secrets.sh` |

### 📱 LINE OA Variables (Required)

| Variable | Description | Value |
|----------|-------------|-------|
| `LINE_OA_ID` | LINE Official Account ID | `@186krrbq` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token | See `.env.railway.example` |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | See `.env.railway.example` |

### 🌐 URL Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_URL` | Backend service URL | `https://your-backend.up.railway.app` |
| `FRONTEND_URL` | Frontend service URL | `https://your-frontend.up.railway.app` |
| `CORS_ORIGIN` | CORS allowed origin | Same as `FRONTEND_URL` |

### 🗄️ Database Variables (Auto-generated)

| Variable | Description | Source |
|----------|-------------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Railway PostgreSQL service |
| `REDIS_URL` | Redis connection string | Railway Redis service |
| `PORT` | Application port | Railway platform |

### 📧 Email Variables (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `465` |
| `SMTP_USER` | SMTP username | `your_email@gmail.com` |
| `SMTP_PASS` | SMTP password | Gmail App Password |
| `SMTP_FROM` | Email sender address | `your_email@gmail.com` |
| `RESEND_API_KEY` | Resend API key (alternative) | From Resend dashboard |

### 🔧 Other Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `NODE_ENV` | Node environment | `production` |

---

## 🔄 Update URLs After First Deploy

หลังจาก deploy ครั้งแรก ต้องอัพเดท URLs:

### Option A: Automatic
```bash
./railway-update-urls.sh
```

### Option B: Manual
1. ไปที่ Railway Dashboard
2. Copy Backend URL
3. Copy Frontend URL
4. Update variables:
   - `BACKEND_URL`
   - `FRONTEND_URL`
   - `CORS_ORIGIN`

---

## 🛠️ Available Scripts

### Set All Variables (Automatic)
```bash
./railway-set-env.sh
```
- Generate secrets
- Set all variables
- One command setup

### Generate Secrets Only
```bash
./generate-secrets.sh
```
- Generate JWT_SECRET
- Generate JWT_REFRESH_SECRET
- Generate SESSION_SECRET
- Generate ENCRYPTION_KEY

### Set LINE Variables Only
```bash
./railway-env-setup.sh
```
- Set LINE_OA_ID
- Set LINE_CHANNEL_ACCESS_TOKEN
- Set LINE_CHANNEL_SECRET

### Update URLs Only
```bash
./railway-update-urls.sh
```
- Update BACKEND_URL
- Update FRONTEND_URL
- Update CORS_ORIGIN

---

## ✅ Verification

### Check Variables
```bash
railway variables --service backend
```

### Check Specific Variable
```bash
railway variables --service backend | grep JWT_SECRET
```

### Test Configuration
```bash
./railway-health-check.sh
```

---

## 🔒 Security Best Practices

### 1. Generate New Secrets
- ⚠️ **Never reuse secrets** from development
- ⚠️ **Always generate new** for production
- ⚠️ Use `./generate-secrets.sh`

### 2. Protect Secrets
- ⚠️ **Never commit** secrets to Git
- ⚠️ **Never share** secrets in plain text
- ⚠️ Use password manager to store

### 3. Rotate Regularly
- 🔄 Change secrets every 3-6 months
- 🔄 Change immediately if leaked
- 🔄 Use `./generate-secrets.sh` to rotate

### 4. Limit Access
- 👥 Only give access to necessary team members
- 👥 Use Railway's team permissions
- 👥 Audit access regularly

---

## 🐛 Troubleshooting

### Variables Not Set
```bash
# Check if logged in
railway whoami

# Re-link project
railway link

# Try setting again
./railway-set-env.sh
```

### Wrong Values
```bash
# View current values
railway variables --service backend

# Update specific variable
railway variables --service backend set KEY="value"
```

### Service Not Restarting
```bash
# Manually restart
# Go to Railway Dashboard → Backend → Settings → Restart
```

### Can't Find Service
```bash
# List all services
railway service

# Link to correct service
railway link
```

---

## 📚 Additional Resources

- [Railway Variables Docs](https://docs.railway.app/develop/variables)
- [Generate Secrets Guide](./GENERATE_SECRETS.md)
- [Deployment Guide](./RAILWAY_DEPLOYMENT.md)

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Set all variables | `./railway-set-env.sh` |
| Generate secrets | `./generate-secrets.sh` |
| Set LINE only | `./railway-env-setup.sh` |
| Update URLs | `./railway-update-urls.sh` |
| View variables | `railway variables --service backend` |
| Set one variable | `railway variables --service backend set KEY="value"` |

---

**🔐 Keep your secrets safe! Never commit them to Git!**
