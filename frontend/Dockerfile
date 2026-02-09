FROM node:18-alpine as builder

ARG VITE_API_URL
ARG VITE_WS_URL

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

# Copy shared-types source and build it
COPY shared-types/ ./shared-types/
WORKDIR /app/shared-types
RUN pnpm run build

# Copy frontend source and build it
WORKDIR /app
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN VITE_API_URL=${VITE_API_URL} VITE_WS_URL=${VITE_WS_URL} pnpm run build

# Production stage - nginx
FROM nginx:alpine

RUN apk add --no-cache curl

# Copy built application from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration as template (BACKEND_URL will be substituted at runtime)
COPY --from=builder /app/frontend/nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy entrypoint script
COPY --from=builder /app/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80 || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
