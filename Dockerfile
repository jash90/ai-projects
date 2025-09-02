# Railway NGINX Template - Optimized for Railway deployment
# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

# Copy workspace and nx config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml nx.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build both frontend and backend
RUN pnpm exec nx run-many -t build

# Production stage
FROM nginx:alpine AS production

# Install Node.js for backend API
RUN apk add --no-cache nodejs npm

# Install pnpm
RUN npm install -g pnpm@8.15.4

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built frontend files to nginx html directory
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy backend files for API serving
COPY --from=builder /app/backend/dist /app/backend/dist
COPY backend/start-prod.js /app/backend/
COPY backend/migrate-prod.js /app/backend/
COPY backend/src/database /app/backend/src/database

# Copy package files for backend dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml /app/
COPY backend/package.json /app/backend/

# Install backend dependencies
WORKDIR /app
RUN pnpm install --prod --ignore-scripts

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting backend API server..."' >> /app/start.sh && \
    echo 'echo "🔍 Environment Variables Debug:"' >> /app/start.sh && \
    echo 'echo "NODE_ENV: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "PORT: $PORT"' >> /app/start.sh && \
    echo 'echo "DATABASE_URL: ${DATABASE_URL:+SET}"' >> /app/start.sh && \
    echo 'echo "REDIS_URL: ${REDIS_URL:+SET}"' >> /app/start.sh && \
    echo 'echo "JWT_SECRET: ${JWT_SECRET:+SET}"' >> /app/start.sh && \
    echo 'echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+SET}"' >> /app/start.sh && \
    echo 'echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+SET}"' >> /app/start.sh && \
    echo 'echo "CORS_ORIGIN: $CORS_ORIGIN"' >> /app/start.sh && \
    echo 'cd /app && RUN_MIGRATIONS=false node backend/start-prod.js &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo 'echo "⏳ Waiting for backend to start..."' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "🔍 Checking if backend is still running..."' >> /app/start.sh && \
    echo 'if kill -0 $BACKEND_PID 2>/dev/null; then' >> /app/start.sh && \
    echo '  echo "✅ Backend is running (PID: $BACKEND_PID)"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "❌ Backend stopped, restarting..."' >> /app/start.sh && \
    echo '  cd /app && RUN_MIGRATIONS=false node backend/start-prod.js &' >> /app/start.sh && \
    echo '  sleep 3' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "🌐 Starting nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port 80 (Railway will handle port mapping)
EXPOSE 80

# Start both services
CMD ["/app/start.sh"]
