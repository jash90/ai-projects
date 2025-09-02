# Railway Environment Variables Guide

## 🔧 **Problem: Docker nie widzi zmiennych z Railway**

Railway automatycznie ustawia zmienne środowiskowe w kontenerze, ale lokalnie musisz je skonfigurować ręcznie.

## 📋 **Wymagane zmienne środowiskowe**

### **Backend Variables:**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
REDIS_URL=redis://host:port
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.sass,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.yaml,.yml,.xml,.sql,.sh,.bash,.dockerfile,.gitignore,.env.example
CORS_ORIGIN=https://your-domain.railway.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
ADMIN_EMAIL=your-email@example.com
DEFAULT_TOKEN_LIMIT_GLOBAL=1000000
DEFAULT_TOKEN_LIMIT_MONTHLY=100000
LOG_LEVEL=info
```

### **Frontend Variables (Vite):**
```bash
VITE_API_URL=https://your-backend.railway.app/api
VITE_WS_URL=wss://your-backend.railway.app
API_URL=https://your-backend.railway.app/api
WS_URL=wss://your-backend.railway.app
```

## 🚀 **Rozwiązania**

### **1. Lokalne testowanie z Railway zmiennymi**

Stwórz plik `.env` w root directory:

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://claude_user:claude_password@localhost:5432/claude_projects
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
CORS_ORIGIN=http://localhost:3000
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

### **2. Docker z zmiennymi środowiskowymi**

```bash
# Uruchom z plikiem .env
docker run --env-file .env -p 8080:80 claude-projects-nginx

# Lub przekaż zmienne bezpośrednio
docker run \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@host:port/db" \
  -e JWT_SECRET="your-secret" \
  -e OPENAI_API_KEY="sk-your-key" \
  -e ANTHROPIC_API_KEY="sk-ant-your-key" \
  -p 8080:80 \
  claude-projects-nginx
```

### **3. Docker Compose z zmiennymi**

Stwórz `docker-compose.override.yml`:

```yaml
version: '3.8'
services:
  app:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://claude_user:claude_password@host.docker.internal:5432/claude_projects
      - REDIS_URL=redis://host.docker.internal:6379
      - JWT_SECRET=your-super-secret-jwt-key-here
      - OPENAI_API_KEY=sk-your-openai-api-key-here
      - ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
      - CORS_ORIGIN=http://localhost:8080
```

### **4. Sprawdź zmienne w Railway**

1. **Przez Railway Dashboard:**
   - Idź do swojego projektu na Railway
   - Kliknij na "Variables" tab
   - Sprawdź jakie zmienne są ustawione

2. **Przez Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway variables
   ```

### **5. Debug zmiennych w kontenerze**

Dodaj do `start.sh` w Dockerfile:

```bash
echo "🔍 Environment Variables Debug:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..." # Show first 20 chars
echo "JWT_SECRET: ${JWT_SECRET:+SET}" # Show if set
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+SET}"
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+SET}"
```

## ⚠️ **Częste problemy**

1. **Brak DATABASE_URL** - Railway automatycznie ustawia jeśli masz PostgreSQL service
2. **Brak REDIS_URL** - Railway automatycznie ustawia jeśli masz Redis service  
3. **Błędny CORS_ORIGIN** - Musi być ustawiony na domenę Railway
4. **Brak API keys** - Musisz dodać OPENAI_API_KEY i ANTHROPIC_API_KEY w Railway

## 🎯 **Szybkie rozwiązanie**

1. Stwórz `.env` z zmiennymi z Railway
2. Uruchom: `docker run --env-file .env -p 8080:80 claude-projects-nginx`
3. Sprawdź logi: `docker logs <container-id>`
