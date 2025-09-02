# Dockerfile - poprawiony dla Railway
FROM node:18-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

# Copy workspace and nx config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml nx.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install ALL dependencies (including dev) for building
RUN pnpm install

# Copy source code
COPY . .

# Build using Nx for better caching and parallelization
RUN pnpm exec nx run-many -t build

# Production stage with nginx
FROM nginx:alpine AS production

# Install Node.js for backend
RUN apk add --no-cache nodejs npm

# Install pnpm via npm
RUN npm install -g pnpm@8.15.4

WORKDIR /app

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install only production dependencies (skip postinstall)
RUN pnpm install --prod --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy production scripts and database files
COPY backend/start-prod.js ./backend/
COPY backend/migrate-prod.js ./backend/
COPY backend/src/database ./backend/src/database

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create uploads directory
RUN mkdir -p /tmp/uploads

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting backend server..."' >> /app/start.sh && \
    echo 'cd /app && RUN_MIGRATIONS=false node backend/start-prod.js &' >> /app/start.sh && \
    echo 'echo "⏳ Waiting for backend to start..."' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "🌐 Starting nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 80

# Start both backend and nginx
CMD ["/app/start.sh"]