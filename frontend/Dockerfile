# Frontend Dockerfile - Standalone frontend deployment
FROM node:18-alpine as builder

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package*.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration for standalone frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80 || exit 1

# Create startup script with environment variable checks
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting Frontend Container..."' >> /app/start.sh && \
    echo 'echo "🔍 Environment Variables Debug:"' >> /app/start.sh && \
    echo 'echo "VITE_API_URL: $VITE_API_URL"' >> /app/start.sh && \
    echo 'echo "API_URL: $API_URL"' >> /app/start.sh && \
    echo 'echo "NODE_ENV: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "PORT: $PORT"' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo 'echo "🌐 Starting nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start with custom script
CMD ["/app/start.sh"]
