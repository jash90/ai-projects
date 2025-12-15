FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy package.json from each workspace package
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared-types/package.json ./shared-types/

# Install all workspace dependencies
RUN pnpm install

# Copy source code for shared-types and backend (skip frontend source)
COPY shared-types/ ./shared-types/
COPY backend/ ./backend/

# Build shared-types first, then backend
WORKDIR /app/shared-types
RUN pnpm run build

WORKDIR /app/backend
RUN pnpm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the backend
CMD ["node", "dist/index.js"]
