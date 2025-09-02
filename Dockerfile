# Multi-stage Dockerfile for Railway deployment
# This builds both backend and frontend in a single container

FROM node:18-alpine AS base

# Install curl and other utilities
RUN apk add --no-cache curl

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build backend
RUN cd backend && pnpm run build

# Build frontend
RUN cd frontend && pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install nginx and curl
RUN apk add --no-cache nginx curl

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files and install only production dependencies
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package*.json ./backend/
RUN cd backend && pnpm install --prod

# Copy built backend
COPY --from=base /app/backend/dist ./backend/dist
COPY --from=base /app/backend/src/database ./backend/src/database

# Copy built frontend
COPY --from=base /app/frontend/dist ./frontend/dist

# Copy nginx configuration
COPY nginx.railway.conf /etc/nginx/nginx.conf

# Create uploads directory
RUN mkdir -p uploads

# Create startup script
COPY start-railway.sh ./
RUN chmod +x start-railway.sh

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start the application
CMD ["./start-railway.sh"]
