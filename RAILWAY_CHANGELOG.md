# 🔧 Railway Deployment - Lista Poprawek

## ✅ Wprowadzone Zmiany

### 📦 **Konfiguracja Projektu**

#### 1. `railway.json`
```diff
- "builder": "DOCKERFILE"
+ "builder": "NIXPACKS"
+ "buildCommand": "pnpm install && pnpm run build"
+ "startCommand": "pnpm run start:prod"
```

#### 2. `package.json` (root)
```diff
+ "start:prod": "cd backend && NODE_ENV=production node dist/index.js"
+ "postinstall": "pnpm run build"
+ "engines": {
+   "node": ">=18.0.0",
+   "pnpm": ">=8.0.0"
+ }
```

#### 3. `backend/package.json`
```diff
+ "start:prod": "NODE_ENV=production node start-prod.js"
+ "migrate": "tsx src/database/migrate.ts"
- "postinstall": "pnpm run migrate"  # USUNIĘTO - powodowało błędy build
```

### 🔧 **Backend Poprawki**

#### 4. Port Configuration (`backend/src/index.ts`)
```diff
- server.listen(config.port, () => {
+ const PORT = parseInt(process.env.PORT || config.port.toString(), 10);
+ server.listen(PORT, '0.0.0.0', () => {
```

#### 5. Static Files Serving (`backend/src/index.ts`)
```diff
+ // Serwuj statyczne pliki frontend w produkcji
+ if (process.env.NODE_ENV === 'production') {
+   const path = require('path');
+   app.use(express.static(path.join(__dirname, '../../frontend/dist')));
+   app.get('*', (req, res, next) => {
+     if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
+       return next();
+     }
+     res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
+   });
+ }
```

#### 6. Upload Path (`backend/src/utils/config.ts`)
```diff
- upload_path: process.env.UPLOAD_PATH || './uploads'
+ upload_path: process.env.UPLOAD_PATH || '/tmp/uploads'
```

### 📁 **Nowe Pliki Konfiguracyjne**

#### 7. `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "pnpm"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm run build"]

[start]
cmd = "pnpm run start:prod"
```

#### 8. `Procfile` (alternatywa)
```
web: cd backend && NODE_ENV=production node dist/index.js
```

#### 9. `backend/start-prod.js` (NOWY)
```javascript
// Skrypt startowy z automatycznymi migracjami
// Uruchamia migrate-prod.js przed startem serwera
// Obsługuje błędy migracji gracefully
```

#### 10. `backend/migrate-prod.js` (NOWY)
```javascript
// Migracje w pure Node.js (bez tsx dependency)
// Kompatybilne z Railway production environment
// Używa PostgreSQL Pool bezpośrednio
```

### 🌍 **Environment Variables**

#### 9. Zaktualizowane `railway.env.example`
```env
# WAŻNE - Railway automatycznie ustawia PORT
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-32-chars-min
ADMIN_EMAIL=your-email@example.com
DEFAULT_TOKEN_LIMIT_GLOBAL=100000
DEFAULT_TOKEN_LIMIT_MONTHLY=50000
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://your-app.up.railway.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
LOG_LEVEL=info
RUN_MIGRATIONS=true
```

## 🎯 **Kluczowe Różnice vs Poprzednia Konfiguracja**

| Aspekt            | Poprzednio           | Teraz                        |
| ----------------- | -------------------- | ---------------------------- |
| **Builder**       | Dockerfile           | Nixpacks                     |
| **Port**          | Statyczny 3001       | `process.env.PORT`           |
| **Frontend**      | Nginx container      | Serwowane przez backend      |
| **Uploads**       | `./uploads`          | `/tmp/uploads`               |
| **Start Command** | `./start-railway.sh` | `pnpm run start:prod`        |
| **Migracje**      | Manualne             | Automatyczne (`postinstall`) |

## 🚀 **Korzyści z Poprawek**

### ✅ **Prostsze Wdrożenie**
- Jeden kontener zamiast multi-stage Docker build
- Nixpacks automatycznie wykrywa pnpm monorepo
- Mniej plików konfiguracyjnych do zarządzania

### ✅ **Lepsza Kompatybilność z Railway**
- Automatyczne wykrywanie portu
- Ephemeral filesystem dla uploadów
- Natywne wsparcie dla Node.js + pnpm

### ✅ **Automatyzacja**
- Automatyczne migracje przy deploymencie
- Automatyczne budowanie frontend i backend
- Automatyczne serwowanie statycznych plików

### ✅ **Łatwiejsze Debugowanie**
- Pojedynczy proces do monitorowania
- Prostsze logi (backend + frontend w jednym miejscu)
- Mniej moving parts

## 🔄 **Migration Path**

Jeśli masz już wdrożoną aplikację na Railway:

1. **Zaktualizuj kod** z tymi poprawkami
2. **Usuń stare zmienne** (`PORT` - Railway ustawi automatycznie)
3. **Dodaj nowe zmienne** (z `railway.env.example`)
4. **Push do GitHub** - Railway automatycznie wdroży
5. **Sprawdź logi** pod kątem błędów

## 🐛 **Najczęstsze Problemy i Rozwiązania**

### Problem: "Port already in use"
**Rozwiązanie:** Usuń zmienną `PORT` z Railway Dashboard

### Problem: "Frontend nie ładuje się"
**Rozwiązanie:** Sprawdź czy `NODE_ENV=production` jest ustawione

### Problem: "Database connection failed"
**Rozwiązanie:** Sprawdź czy `DATABASE_URL=${{Postgres.DATABASE_URL}}`

### Problem: "File upload errors"
**Rozwiązanie:** Ustaw `UPLOAD_PATH=/tmp/uploads`

## 📊 **Testowanie**

Po wdrożeniu sprawdź:

- ✅ `https://your-app.railway.app/api/health` (200 OK)
- ✅ `https://your-app.railway.app` (React app loads)
- ✅ Login/Register functionality
- ✅ AI Chat functionality
- ✅ File upload (pamiętaj o ephemeral filesystem)

---

## 🎉 **Podsumowanie**

Te poprawki rozwiązują główne problemy z wdrożeniem na Railway:
- ✅ Monorepo compatibility
- ✅ Port configuration
- ✅ Static files serving
- ✅ Upload path
- ✅ Environment variables
- ✅ Automatic migrations

## 🔧 **Rozwiązane Problemy Build**

### ❌ Problem: `tsx: not found` podczas `postinstall`
```
backend postinstall: > tsx src/database/migrate.ts
backend postinstall: sh: tsx: not found
```
**✅ Rozwiązanie:**
- Usunięto `postinstall` hook z `backend/package.json`
- Stworzono `migrate-prod.js` w pure Node.js
- Migracje uruchamiają się teraz w `start:prod`

### ❌ Problem: `packageManager` warning
```
! The local project doesn't define a 'packageManager' field
```
**✅ Rozwiązanie:**
- Dodano `"packageManager": "pnpm@8.15.4"` w głównym `package.json`

### ❌ Problem: `--frozen-lockfile` conflicts
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile"
```
**✅ Rozwiązanie:**
- Zmieniono `nixpacks.toml`: `pnpm install` (bez --frozen-lockfile)

### ❌ Problem: `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` (Runtime)
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```
**✅ Rozwiązanie:**
```javascript
// backend/src/index.ts
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Railway)
}
```
- Railway używa proxy i wysyła nagłówek `X-Forwarded-For`
- Express musi wiedzieć, że może ufać proxy dla rate limiting

Aplikacja powinna teraz działać płynnie na Railway! 🚀
