# 🚀 Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code & Build
- [x] **Code is working locally** - All features tested
- [x] **TypeScript compilation passes** - No build errors
- [x] **Docker build successful** - Railway Dockerfile tested locally
- [x] **Environment variables documented** - `railway.env.example` created
- [x] **Railway configuration files** - All necessary files created

### 2. Repository Setup
- [ ] **Push to GitHub** - Ensure latest code is committed and pushed
- [ ] **Repository is public or accessible** - Railway needs access
- [ ] **Main branch is clean** - No pending changes

### 3. API Keys & Secrets
- [ ] **OpenAI API Key** - Valid and has sufficient credits
- [ ] **Anthropic API Key** - Valid and has sufficient credits  
- [ ] **JWT Secrets** - Generate secure 32+ character strings
- [ ] **Admin Email** - Set your admin email address

## 🚢 Railway Deployment Steps

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Create Project from GitHub
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Choose the main branch

### Step 4: Add Database Services

#### PostgreSQL Database
1. In Railway dashboard, click "Add Service" → "Database" → "PostgreSQL"
2. Wait for deployment to complete
3. Note the connection string from "Connect" tab

#### Redis Cache  
1. Click "Add Service" → "Database" → "Redis"
2. Wait for deployment to complete
3. Note the connection string from "Connect" tab

### Step 5: Configure Environment Variables
In your Railway project → Main service → "Variables" tab:

```env
# Required Variables
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# JWT Secrets (generate secure values)
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-32-chars-min

# AI API Keys
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Configuration
MAX_FILE_SIZE=52428800
LOG_LEVEL=info
ADMIN_EMAIL=your-email@domain.com
DEFAULT_TOKEN_LIMIT_GLOBAL=1000000
DEFAULT_TOKEN_LIMIT_MONTHLY=100000

# Optional
RUN_MIGRATIONS=true
```

### Step 6: Deploy
Railway will automatically deploy when you push to your main branch.

**Manual deployment:**
```bash
railway up
```

### Step 7: Verify Deployment
1. **Check build logs** - Ensure no errors during build
2. **Test health endpoint** - `https://your-app.railway.app/api/health`
3. **Test frontend** - Verify UI loads correctly
4. **Test authentication** - Create account and login
5. **Test AI chat** - Verify OpenAI/Anthropic integration

## 🔍 Post-Deployment Verification

### Health Checks
- [ ] **API Health** - `GET /api/health` returns 200
- [ ] **Database Connection** - No connection errors in logs
- [ ] **Redis Connection** - Cache/sessions working
- [ ] **Frontend Loading** - React app loads without errors

### Feature Testing
- [ ] **User Registration** - Can create new accounts
- [ ] **User Authentication** - Login/logout working
- [ ] **Project Creation** - Can create new projects
- [ ] **Agent Creation** - Can create AI agents
- [ ] **File Upload** - Can upload and manage files
- [ ] **AI Chat** - Both OpenAI and Anthropic models working
- [ ] **Real-time Features** - WebSocket connections working
- [ ] **Streaming Responses** - AI streaming toggle working

### Performance & Security
- [ ] **HTTPS Working** - Railway provides automatic SSL
- [ ] **Response Times** - API responses under 2 seconds
- [ ] **Memory Usage** - Monitor for memory leaks
- [ ] **Error Rates** - Check for 5xx errors

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
railway logs --service your-service-name

# Redeploy
railway redeploy
```

#### Environment Variable Issues
```bash
# List variables
railway variables

# Add missing variable
railway variables set KEY=value
```

#### Database Connection Issues
1. Verify `DATABASE_URL` is set correctly
2. Check PostgreSQL service is running
3. Review connection pool settings

#### Memory/Performance Issues
1. Monitor resource usage in Railway dashboard
2. Check for memory leaks in logs
3. Consider upgrading plan if needed

### Getting Help
- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: Create GitHub issue

## 📊 Monitoring & Maintenance

### Regular Tasks
- [ ] **Monitor logs** - Check for errors daily
- [ ] **Database backups** - Railway handles automatically
- [ ] **Update dependencies** - Monthly security updates
- [ ] **Monitor costs** - Keep track of Railway usage
- [ ] **Performance monitoring** - Response times and errors

### Scaling Considerations
- **Traffic growth** - Railway auto-scales
- **Database performance** - Monitor query performance
- **File storage** - Consider CDN for large files
- **API rate limits** - Monitor OpenAI/Anthropic usage

## 🎉 Success Criteria

Your deployment is successful when:

✅ **Build completes without errors**  
✅ **Health endpoint returns 200**  
✅ **Frontend loads and is interactive**  
✅ **Users can register and login**  
✅ **AI chat works with both providers**  
✅ **File upload and management works**  
✅ **Real-time features are functional**  
✅ **No critical errors in logs**  

---

## 🚀 Ready to Deploy?

Run the automated deployment script:
```bash
./deploy-railway.sh
```

Or follow the manual steps above for more control.

**Good luck with your deployment!** 🎊
