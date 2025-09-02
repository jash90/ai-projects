# Frontend Dockerfile - Standalone Frontend Deployment

This Dockerfile is designed for standalone frontend deployment, separate from the main backend+nginx setup.

## Use Cases

- **Separate frontend hosting** (Vercel, Netlify, etc.)
- **Frontend-only deployments** with external backend
- **Development/testing** of frontend in isolation
- **Microservices architecture** with separate frontend/backend containers

## Configuration

### 1. Standalone Frontend (No Backend Proxy)

The default configuration serves only static files without backend proxy:

```bash
# Build and run standalone frontend
cd frontend
docker build -t claude-projects-frontend .
docker run -p 3000:80 claude-projects-frontend
```

### 2. Frontend with External Backend Proxy

To proxy API calls to an external backend, uncomment and configure the proxy sections in `nginx.conf`:

```nginx
# Uncomment these lines in frontend/nginx.conf
location /api {
    proxy_pass http://your-backend-url:3001;
    # ... rest of proxy configuration
}

location /socket.io {
    proxy_pass http://your-backend-url:3001;
    # ... rest of proxy configuration
}
```

### 3. Environment Variables

For external backend configuration, you can use environment variables:

```bash
# Set backend URL
docker run -p 3000:80 \
  -e BACKEND_URL=https://your-backend.railway.app \
  claude-projects-frontend
```

## Differences from Main Dockerfile

| Feature | Main Dockerfile | Frontend Dockerfile |
|---------|----------------|-------------------|
| **Backend** | ✅ Included | ❌ External only |
| **Nginx** | ✅ Included | ✅ Included |
| **API Proxy** | ✅ Internal (127.0.0.1:3001) | ❌ External only |
| **Use Case** | Full-stack deployment | Frontend-only deployment |
| **Railway** | ✅ Recommended | ❌ Use main instead |

## Railway Deployment

**⚠️ Important**: For Railway deployment, use the **main Dockerfile** in the root directory, not this frontend Dockerfile.

The main Dockerfile includes both backend and nginx in one container, which is optimized for Railway's deployment model.

## Development

```bash
# Build frontend only
cd frontend
docker build -t claude-frontend .

# Run with external backend
docker run -p 3000:80 \
  -e BACKEND_URL=http://localhost:3001 \
  claude-frontend

# Access frontend
open http://localhost:3000
```

## Production Considerations

1. **CORS**: Ensure your backend has CORS configured for your frontend domain
2. **Environment Variables**: Set `VITE_API_URL` to point to your backend
3. **SSL**: Use HTTPS in production
4. **CDN**: Consider using a CDN for static assets
5. **Health Checks**: The container includes health checks on port 80
