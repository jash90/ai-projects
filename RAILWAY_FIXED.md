# 🚀 Railway Deployment - Poprawiona Konfiguracja

## ✅ Wprowadzone Poprawki

### 1. **Konfiguracja Monorepo (pnpm workspaces)**
- ✅ Zaktualizowano `railway.json` z NIXPACKS builder
- ✅ Dodano odpowiednie skrypty w głównym `package.json`
- ✅ Dodano `nixpacks.toml` dla Railway
- ✅ Dodano `Procfile` jako alternatywę

### 2. **Backend Poprawki**
- ✅ Poprawiono konfigurację portu dla Railway (`PORT` environment variable)
- ✅ Dodano obsługę statycznych plików frontend w produkcji
- ✅ Zmieniono ścieżkę uploadów na `/tmp/uploads` (Railway ephemeral filesystem)
- ✅ Dodano skrypty `start:prod` i `migrate`

### 3. **Konfiguracja Środowiska**
- ✅ Zaktualizowano `railway.env.example` z poprawnymi zmiennymi
- ✅ Dodano CORS_ORIGIN dla Railway domeny
- ✅ Poprawiono konfigurację rate limiting

## 🚀 Kroki Wdrażania

### Krok 1: Przygotowanie Kodu
```bash
# Upewnij się, że kod jest zaktualizowany
git add .
git commit -m "fix: Railway deployment configuration"
git push origin main
```

### Krok 2: Stworzenie Projektu Railway
1. Idź do [Railway Dashboard](https://railway.app/dashboard)
2. Kliknij "New Project" → "Deploy from GitHub repo"
3. Wybierz swoje repository
4. Wybierz branch `main`

### Krok 3: Dodanie Usług Bazy Danych

#### PostgreSQL
1. W Railway dashboard, kliknij "Add Service" → "Database" → "PostgreSQL"
2. Poczekaj na deployment
3. Sprawdź connection string w zakładce "Connect"

#### Redis
1. Kliknij "Add Service" → "Database" → "Redis"
2. Poczekaj na deployment
3. Sprawdź connection string w zakładce "Connect"

### Krok 4: Konfiguracja Zmiennych Środowiskowych

W Railway project → Main service → zakładka "Variables":

```env
# WAŻNE - Railway automatycznie ustawia PORT
NODE_ENV=production

# Database - Railway PostgreSQL (automatycznie)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis - Railway Redis (automatycznie)
REDIS_URL=${{Redis.REDIS_URL}}

# Twoje klucze API
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# JWT Secrets (wygeneruj bezpieczne 32+ znakowe stringi)
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-32-chars-min

# Admin Configuration
ADMIN_EMAIL=your-email@example.com
DEFAULT_TOKEN_LIMIT_GLOBAL=100000
DEFAULT_TOKEN_LIMIT_MONTHLY=50000

# Upload Configuration
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=10485760

# CORS - zmień na swoją domenę Railway
CORS_ORIGIN=https://your-app.up.railway.app

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info

# Optional: Auto-run migrations
RUN_MIGRATIONS=true
```

### Krok 5: Deployment
Railway automatycznie wdroży aplikację po skonfigurowaniu zmiennych środowiskowych.

**Monitorowanie:**
```bash
# Zainstaluj Railway CLI
npm install -g @railway/cli

# Zaloguj się
railway login

# Podłącz do projektu
railway link

# Sprawdź logi
railway logs --follow
```

## 🔧 Architektura Wdrożenia

```
Railway Environment
├── 🗄️ PostgreSQL Service (Database)
├── 🔄 Redis Service (Cache)
└── 🚀 Web Service (Your App)
    ├── Backend (Node.js API) - Port $PORT
    └── Frontend (Static Files) - Served by Backend
```

## ✅ Weryfikacja Wdrożenia

### 1. Health Check
- Sprawdź: `https://your-app.railway.app/api/health`
- Powinno zwrócić status 200 z informacjami o serwerze

### 2. Frontend
- Sprawdź: `https://your-app.railway.app`
- React app powinien się załadować poprawnie

### 3. API Endpoints
- Sprawdź: `https://your-app.railway.app/api/models`
- Powinno zwrócić listę dostępnych modeli AI

### 4. Database Connection
- Sprawdź logi Railway pod kątem błędów połączenia z bazą danych
- Migracje powinny uruchomić się automatycznie

## 🐛 Troubleshooting

### Problem: Build Fails
**Rozwiązanie:**
```bash
# Sprawdź logi budowania w Railway Dashboard
# Upewnij się, że pnpm-lock.yaml jest aktualny
pnpm install
git add pnpm-lock.yaml
git commit -m "update lockfile"
git push
```

### Problem: Port Issues
**Rozwiązanie:**
- Railway automatycznie ustawia zmienną `PORT`
- Nie ustawiaj zmiennej `PORT` ręcznie w Railway Dashboard
- Backend automatycznie używa `process.env.PORT`

### Problem: Database Connection
**Rozwiązanie:**
```bash
# Sprawdź czy DATABASE_URL jest poprawnie ustawiona
railway variables

# Sprawdź logi pod kątem błędów połączenia
railway logs --follow
```

### Problem: Static Files (Frontend)
**Rozwiązanie:**
- Frontend jest serwowany przez backend w trybie produkcyjnym
- Sprawdź czy build frontend zakończył się sukcesem
- Sprawdź logi pod kątem błędów ścieżek plików

### Problem: CORS Errors
**Rozwiązanie:**
```env
# Zaktualizuj CORS_ORIGIN na swoją Railway domenę
CORS_ORIGIN=https://your-actual-app-name.up.railway.app
```

### Problem: File Uploads
**Rozwiązanie:**
- Railway używa ephemeral filesystem
- Pliki są przechowywane w `/tmp/uploads`
- Pliki znikają po restarcie - rozważ zewnętrzne storage (S3, Cloudinary)

## 📊 Monitoring i Utrzymanie

### Przydatne Komendy Railway CLI
```bash
# Status projektu
railway status

# Logi w czasie rzeczywistym
railway logs --follow

# Restart serwisu
railway up --detach

# Lista zmiennych
railway variables

# Otwórz w przeglądarce
railway open
```

### Metryki do Monitorowania
- **Response Time** - API endpoints < 2s
- **Memory Usage** - Monitor for memory leaks
- **Database Connections** - Connection pool health
- **Error Rate** - 5xx errors should be < 1%

## 🎯 Następne Kroki

1. **✅ Wdrożenie zakończone** - Aplikacja działa na Railway
2. **🔧 Konfiguracja domeny** - Dodaj custom domain (opcjonalne)
3. **📊 Monitoring** - Ustaw alerty dla błędów krytycznych
4. **🔄 CI/CD** - Automatyczne wdrażanie z GitHub
5. **💾 Backup** - Railway automatycznie tworzy backupy bazy danych
6. **🚀 Skalowanie** - Railway automatycznie skaluje na podstawie ruchu

## 💰 Szacowane Koszty

Railway (pay-as-you-go):
- **Starter**: ~$5-10/miesiąc
- **Moderate usage**: ~$15-25/miesiąc  
- **Heavy usage**: ~$30-50/miesiąc

Zawiera:
- Automatyczne skalowanie
- SSL certificates
- Database hosting
- Global CDN
- 24/7 monitoring

---

## 🎉 Gotowe!

Twoja aplikacja Claude Projects Clone jest teraz gotowa do użycia na Railway!

**URL:** `https://your-app.up.railway.app`

Powodzenia! 🚀
