# Dockerfile - poprawiony dla Railway
FROM node:18-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install ALL dependencies (including dev) for building
RUN pnpm install

# Copy source code
COPY . .

# Build backend and frontend
RUN cd backend && pnpm run build
RUN cd frontend && pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

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

# Create uploads directory
RUN mkdir -p /tmp/uploads

# Expose port
EXPOSE ${PORT:-3001}

# Start the server with migrations
CMD ["node", "backend/start-prod.js"]