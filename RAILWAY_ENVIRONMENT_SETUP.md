# 🌐 Railway Environment Variables Setup

## 🚨 **Critical Issue: App Not Responding**

If your Railway deployment is successful but not responding, it's likely due to missing or incorrect environment variables, especially CORS configuration.

## ✅ **Required Railway Environment Variables**

### **Essential Variables:**
```bash
# Database (Railway provides this automatically)
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway

# Application Port (Railway provides this automatically)
PORT=auto

# Environment
NODE_ENV=production

# CORS Configuration (CRITICAL for Railway)
CORS_ORIGIN=https://your-app-name.railway.app

# JWT Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Redis (if using Redis)
REDIS_URL=redis://...
```

### **How to Set in Railway:**
1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add each variable with its value

## 🔧 **CORS Configuration Fix**

### **Problem:**
The default CORS origin is `http://localhost:3000`, which blocks Railway requests.

### **Solution:**
Set `CORS_ORIGIN` environment variable in Railway:
```bash
CORS_ORIGIN=https://your-railway-app-name.railway.app
```

**Or for development + production:**
```bash
CORS_ORIGIN=https://your-railway-app-name.railway.app,http://localhost:3000
```

## 🧪 **Testing Your Deployment**

### **1. Check Health Endpoint:**
```bash
curl https://your-app-name.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-02T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### **2. Check CORS:**
```bash
curl -H "Origin: https://your-app-name.railway.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://your-app-name.railway.app/api/health
```

Should return CORS headers.

### **3. Check API Endpoints:**
```bash
# Test a simple API endpoint
curl https://your-app-name.railway.app/api/projects
```

## 🔍 **Debugging Steps**

### **1. Check Railway Logs:**
Look for these diagnostic messages in Railway logs:
```bash
🔌 Server will listen on PORT: [Railway PORT]
🔗 Database URL: Set
🔑 JWT Secret: Set
🚀 CORS Origin: [Your CORS setting]
📂 Loading server from: ./dist/index.js
✅ Server module loaded successfully
🔍 Testing server responsiveness on port [PORT]...
✅ Health check response: 200
🎉 Server is responding correctly!
```

### **2. Common Issues & Fixes:**

#### **Issue: CORS Errors**
```bash
# Fix: Set correct CORS_ORIGIN
CORS_ORIGIN=https://your-app-name.railway.app
```

#### **Issue: 500 Internal Server Error**
```bash
# Fix: Check DATABASE_URL and JWT_SECRET are set
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

#### **Issue: App Not Loading**
```bash
# Fix: Ensure all required environment variables are set
NODE_ENV=production
PORT=auto  # Railway sets this automatically
```

## 📋 **Environment Variables Checklist**

### **Required for Basic Functionality:**
- [x] `DATABASE_URL` (Railway auto-provides)
- [x] `PORT` (Railway auto-provides)
- [x] `NODE_ENV=production`
- [x] `CORS_ORIGIN=https://your-app.railway.app`
- [x] `JWT_SECRET=your-secure-secret`

### **Required for AI Features:**
- [x] `OPENAI_API_KEY=sk-...`
- [x] `ANTHROPIC_API_KEY=sk-ant-...`

### **Optional but Recommended:**
- [ ] `REDIS_URL` (if using Redis)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `RATE_LIMIT_MAX_REQUESTS=1000`

## 🚀 **Quick Fix Commands**

### **Set Railway Variables via CLI:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Set environment variables
railway variables set NODE_ENV=production
railway variables set CORS_ORIGIN=https://your-app.railway.app
railway variables set JWT_SECRET=your-super-secure-secret
railway variables set OPENAI_API_KEY=sk-your-key
railway variables set ANTHROPIC_API_KEY=sk-ant-your-key

# Redeploy
railway up
```

## 🎯 **Most Common Fix**

**If your app deploys but doesn't respond, 90% of the time it's CORS:**

1. **Go to Railway Dashboard**
2. **Click your service → Variables**
3. **Add:** `CORS_ORIGIN` = `https://your-app-name.railway.app`
4. **Redeploy**

Your app should start responding immediately after setting the correct CORS origin!

---

## ✅ **Final Verification**

After setting environment variables:

1. **Redeploy** your Railway app
2. **Check logs** for success messages
3. **Test health endpoint**: `curl https://your-app.railway.app/api/health`
4. **Test your frontend** accessing the API

**Your Claude Projects Clone should now be fully functional on Railway!** 🎉
