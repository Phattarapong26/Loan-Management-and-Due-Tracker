# ✅ Railway Deployment Checklist

## 📋 Pre-Deployment

### 1. Railway Account Setup
- [ ] สมัครบัญชี Railway (https://railway.app)
- [ ] ติดตั้ง Railway CLI: `npm i -g @railway/cli`
- [ ] Login: `railway login`

### 2. Create Railway Project
- [ ] สร้าง New Project ใน Railway Dashboard
- [ ] เพิ่ม PostgreSQL service
- [ ] เพิ่ม Redis service
- [ ] สร้าง Backend service (Empty Service)

### 3. Environment Variables Setup

ใน Railway Dashboard > Backend Service > Variables:

#### Required Variables (Auto-generated)
- [ ] `DATABASE_URL` - จาก PostgreSQL service
- [ ] `REDIS_URL` - จาก Redis service
- [ ] `PORT` - Railway จะกำหนดให้

#### Required Variables (Manual)
```env
# LINE OA
LINE_OA_ID=@186krrbq
LINE_CHANNEL_ACCESS_TOKEN=<your_token>
LINE_CHANNEL_SECRET=<your_secret>

# JWT & Security (Generate new for production!)
JWT_SECRET=<generate_64_char_random>
JWT_REFRESH_SECRET=<generate_64_char_random>
SESSION_SECRET=<generate_64_char_random>
ENCRYPTION_KEY=<generate_32_char_random>

# Environment
NODE_ENV=production
```

#### Optional Variables
```env
# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<your_email>
SMTP_PASS=<app_password>
SMTP_FROM=<your_email>
RESEND_API_KEY=<your_key>
```

#### URLs (Set after first deploy)
```env
BACKEND_URL=https://<your-backend>.up.railway.app
FRONTEND_URL=https://<your-frontend>.up.railway.app
CORS_ORIGIN=https://<your-frontend>.up.railway.app
```

## 🚀 Deployment Steps

### Step 1: Deploy Code
```bash
./railway-deploy.sh
```
- [ ] Script completes successfully
- [ ] Build finishes in Railway Dashboard
- [ ] Service is running

### Step 2: Setup Database
```bash
./railway-setup-db.sh
```
- [ ] Prisma client generated
- [ ] Schema pushed to database
- [ ] Data seeded successfully

### Step 3: Verify Deployment
```bash
# Check health endpoint
curl https://<your-backend>.up.railway.app/health

# Check logs
railway logs --service backend
```
- [ ] Health check returns 200 OK
- [ ] No errors in logs
- [ ] Database connection successful
- [ ] Redis connection successful

## 🔐 Post-Deployment Security

### 1. Change Default Passwords
Login and change passwords for:
- [ ] admin@smebank.com (default: Admin@123)
- [ ] manager@smebank.com (default: Manager@123)
- [ ] officer@smebank.com (default: Officer@123)

### 2. Verify Security Settings
- [ ] CORS_ORIGIN set correctly
- [ ] JWT secrets are unique (not from .env.example)
- [ ] ENCRYPTION_KEY is unique
- [ ] Rate limiting is working
- [ ] HTTPS is enabled (Railway default)

### 3. LINE OA Configuration
- [ ] Update LINE OA webhook URL to Railway URL
- [ ] Test LINE login flow
- [ ] Verify Rich Menu displays correctly

## 📊 Monitoring Setup

### 1. Railway Dashboard
- [ ] Check Metrics tab for resource usage
- [ ] Set up usage alerts (if needed)
- [ ] Monitor deployment history

### 2. Application Logs
```bash
# Real-time logs
railway logs --service backend --follow

# Recent logs
railway logs --service backend --tail 100
```

### 3. Health Checks
- [ ] `/health` endpoint responding
- [ ] Database queries working
- [ ] Redis cache working
- [ ] Background jobs running

## 🧪 Testing

### 1. API Endpoints
```bash
# Health check
curl https://<your-backend>.up.railway.app/health

# Login
curl -X POST https://<your-backend>.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smebank.com","password":"Admin@123"}'
```

### 2. Database
- [ ] Can create records
- [ ] Can read records
- [ ] Can update records
- [ ] Can delete records
- [ ] Relationships working

### 3. Background Jobs
- [ ] Session cleanup running
- [ ] PDF cleanup running
- [ ] Rich Menu sync running
- [ ] Payment sync running

## 🔄 Continuous Deployment

### Option 1: GitHub Integration (Recommended)
1. [ ] Connect Railway to GitHub repository
2. [ ] Select branch to deploy (e.g., main)
3. [ ] Enable auto-deploy on push
4. [ ] Test by pushing a commit

### Option 2: Manual Deploy
```bash
# After making changes
git add .
git commit -m "Update features"
./railway-deploy.sh
```

## 🐛 Troubleshooting

### Build Fails
```bash
# Check build logs
railway logs --service backend

# Try manual build
railway run --service backend npm run build
```

### Database Connection Error
```bash
# Verify DATABASE_URL
railway variables --service backend | grep DATABASE_URL

# Test connection
railway run --service backend npx prisma db pull
```

### Redis Connection Error
```bash
# Verify REDIS_URL
railway variables --service backend | grep REDIS_URL

# Restart Redis service in Dashboard
```

### Application Crashes
```bash
# Check logs
railway logs --service backend --tail 200

# Check resource usage in Dashboard
# Might need to upgrade plan if out of memory
```

## 📈 Performance Optimization

### 1. Database
- [ ] Indexes are created (check schema.prisma)
- [ ] Connection pooling configured
- [ ] Query performance monitored

### 2. Redis Cache
- [ ] Cache hit rate is good
- [ ] TTL values appropriate
- [ ] Memory usage acceptable

### 3. Application
- [ ] Response times < 200ms
- [ ] No memory leaks
- [ ] CPU usage reasonable
- [ ] Background jobs not blocking

## 💰 Cost Management

### Railway Free Tier
- $5 credit/month
- Shared resources

### Optimization Tips
- [ ] Use shared PostgreSQL (not dedicated)
- [ ] Use shared Redis
- [ ] Monitor usage in Dashboard
- [ ] Scale down if not in use
- [ ] Consider Hobby plan ($5/month) for production

## 📚 Documentation

- [ ] Update README with production URLs
- [ ] Document environment variables
- [ ] Document deployment process
- [ ] Document rollback procedure
- [ ] Document monitoring setup

## 🆘 Emergency Procedures

### Rollback Deployment
1. Go to Railway Dashboard
2. Select Backend service
3. Go to Deployments tab
4. Click on previous working deployment
5. Click "Redeploy"

### Database Backup
```bash
# Export database
railway run --service backend npx prisma db pull

# Or use Railway's backup feature in Dashboard
```

### Emergency Contacts
- Railway Status: https://status.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app

## ✅ Final Verification

- [ ] All services running
- [ ] Health checks passing
- [ ] No errors in logs
- [ ] Database accessible
- [ ] Redis accessible
- [ ] API endpoints working
- [ ] Authentication working
- [ ] LINE integration working
- [ ] Background jobs running
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Documentation updated
- [ ] Team notified

---

**🎉 Deployment Complete!**

Next steps:
1. Monitor logs for first 24 hours
2. Test all critical features
3. Set up alerts for errors
4. Plan for scaling if needed
