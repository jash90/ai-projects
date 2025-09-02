# Railway NGINX Template - Optimized for Railway deployment
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built frontend files to nginx html directory
COPY frontend/dist /usr/share/nginx/html

# Copy backend files for API serving
COPY backend/dist /app/backend/dist
COPY backend/start-prod.js /app/backend/
COPY backend/migrate-prod.js /app/backend/
COPY backend/src/database /app/backend/src/database

# Install Node.js for backend API
RUN apk add --no-cache nodejs npm

# Install pnpm
RUN npm install -g pnpm@8.15.4

# Copy package files for backend dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml /app/
COPY backend/package.json /app/backend/

# Install backend dependencies
WORKDIR /app
RUN pnpm install --prod --ignore-scripts

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting backend API server..."' >> /app/start.sh && \
    echo 'cd /app && RUN_MIGRATIONS=false node backend/start-prod.js &' >> /app/start.sh && \
    echo 'echo "⏳ Waiting for backend to start..."' >> /app/start.sh && \
    echo 'sleep 3' >> /app/start.sh && \
    echo 'echo "🌐 Starting nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port 80 (Railway will handle port mapping)
EXPOSE 80

# Start both services
CMD ["/app/start.sh"]
