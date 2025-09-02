# Railway NGINX Template Configuration

## Overview
This setup uses Railway's optimized NGINX template for serving static files with backend API proxy.

## Configuration Steps

### 1. Use Railway NGINX Template
- Go to [Railway NGINX Template](https://railway.com/deploy/o3MbZe)
- Click "Deploy Now"
- Connect your GitHub repository

### 2. Configure Environment Variables

Set these environment variables in Railway dashboard:

```env
# Server Configuration
NODE_ENV=production
PORT=${{PORT}}  # Railway auto-assigns this

# Database (Railway PostgreSQL)
DATABASE_URL=${{POSTGRES_URL}}  # Auto-populated by Railway PostgreSQL

# Redis (Railway Redis)
REDIS_URL=${{REDIS_URL}}  # Auto-populated by Railway Redis

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# JWT Configuration
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret

# Admin Configuration
ADMIN_EMAIL=your-admin@example.com
DEFAULT_TOKEN_LIMIT_GLOBAL=100000
DEFAULT_TOKEN_LIMIT_MONTHLY=50000

# CORS Configuration
CORS_ORIGIN=https://your-app.up.railway.app

# File Upload
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 3. File Structure for Railway Template

The Railway NGINX template expects this structure:

```
/
├── Dockerfile.railway          # Railway-optimized Dockerfile
├── nginx.railway.conf          # Railway-optimized nginx config
├── nixpacks.railway.toml       # Railway build configuration
├── frontend/dist/              # Built frontend files
└── backend/dist/               # Built backend files
```

### 4. Deploy Configuration

#### Option A: Use Railway Template (Recommended)
1. Deploy from [Railway NGINX Template](https://railway.com/deploy/o3MbZe)
2. Connect your GitHub repository
3. Railway will automatically detect the configuration

#### Option B: Manual Configuration
1. Rename files:
   ```bash
   mv Dockerfile.railway Dockerfile
   mv nginx.railway.conf nginx.conf
   mv nixpacks.railway.toml nixpacks.toml
   ```

2. Deploy to Railway

### 5. Railway Template Benefits

- ✅ **Optimized for Railway** - Uses Railway's proven nginx configuration
- ✅ **Better Performance** - Handles 10,000+ simultaneous connections
- ✅ **Memory Efficient** - Low memory overhead
- ✅ **Static File Serving** - Optimized for serving React build files
- ✅ **API Proxy** - Seamless backend API integration

### 6. Testing the Deployment

After deployment, test these endpoints:

1. **Frontend**: `https://your-app.up.railway.app/`
2. **API Health**: `https://your-app.up.railway.app/api/health`
3. **WebSocket**: `wss://your-app.up.railway.app/socket.io/`

### 7. Troubleshooting

#### Common Issues:

1. **502 Bad Gateway**
   - Check if backend is running on port 3001
   - Verify nginx proxy configuration

2. **Frontend Not Loading**
   - Ensure `frontend/dist` files are built
   - Check nginx static file serving configuration

3. **API Calls Failing**
   - Verify CORS configuration
   - Check backend environment variables

#### Debug Commands:

```bash
# Check Railway logs
railway logs

# Check environment variables
railway run env

# Test API endpoint
curl https://your-app.up.railway.app/api/health
```

### 8. Performance Optimization

The Railway NGINX template includes:

- **Gzip Compression** - Reduces file sizes
- **Static File Caching** - 1-year cache for assets
- **Security Headers** - XSS protection, content type validation
- **Rate Limiting** - Built-in request limiting
- **Connection Pooling** - Efficient connection handling

### 9. Monitoring

Railway provides built-in monitoring for:
- CPU usage
- Memory consumption
- Request count
- Error rates
- Response times

Access monitoring in Railway dashboard under your project's "Metrics" tab.

## Next Steps

1. Deploy using Railway NGINX template
2. Configure environment variables
3. Test all endpoints
4. Monitor performance in Railway dashboard
5. Set up custom domain (optional)

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [NGINX Documentation](https://nginx.org/en/docs/)
