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
# Set backend URLs
docker run -p 3000:80 \
  -e VITE_API_URL=http://localhost:3001/api \
  -e VITE_WS_URL=ws://localhost:3001 \
  -e API_URL=http://localhost:3001/api \
  -e WS_URL=ws://localhost:3001 \
  claude-projects-frontend
```

#### Available Environment Variables:

- **`VITE_API_URL`** - API URL for Vite build (used during build time)
- **`VITE_WS_URL`** - WebSocket URL for Vite build (used during build time)
- **`API_URL`** - API URL for nginx proxy (used at runtime)
- **`WS_URL`** - WebSocket URL for nginx proxy (used at runtime)
- **`NODE_ENV`** - Environment mode (development/production)

## Differences from Main Dockerfile

| Feature        | Main Dockerfile             | Frontend Dockerfile      |
| -------------- | --------------------------- | ------------------------ |
| **Backend**    | ✅ Included                  | ❌ External only          |
| **Nginx**      | ✅ Included                  | ✅ Included               |
| **API Proxy**  | ✅ Internal (127.0.0.1:3001) | ❌ External only          |
| **Use Case**   | Full-stack deployment       | Frontend-only deployment |
| **Production** | ✅ Recommended               | ❌ Use main instead       |

## Production Deployment

**⚠️ Important**: For production deployment, use the **main Dockerfile** in the root directory, not this frontend Dockerfile.

The main Dockerfile includes both backend and nginx in one container, which is optimized for production deployment.

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
