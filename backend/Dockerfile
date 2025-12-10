# =============================================================================
# Stage 1: Builder - Install dependencies and build
# =============================================================================
FROM node:18-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY shared-types/package.json ./shared-types/

# Install all workspace dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared-types/ ./shared-types/
COPY backend/ ./backend/

# Build shared-types first, then backend
WORKDIR /app/shared-types
RUN pnpm run build

WORKDIR /app/backend
RUN pnpm run build

# =============================================================================
# Stage 2: Production Dependencies - Minimal node_modules
# =============================================================================
FROM node:18-alpine AS deps

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY shared-types/package.json ./shared-types/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# =============================================================================
# Stage 3: Production Runner - Minimal runtime image
# =============================================================================
FROM node:18-alpine AS runner

# Install only runtime dependencies (curl for health checks, chromium for puppeteer)
RUN apk add --no-cache curl chromium dumb-init

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Set production environment
ENV NODE_ENV=production
# Railway 512MB optimization: 400MB heap + 16MB semi-space + memory optimization
ENV NODE_OPTIONS="--max-old-space-size=400 --max-semi-space-size=16 --optimize-for-size"

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy built artifacts from builder stage
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/shared-types/dist ./shared-types/dist
COPY --from=builder /app/shared-types/package.json ./shared-types/

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
