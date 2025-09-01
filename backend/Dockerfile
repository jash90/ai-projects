FROM node:18-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["pnpm", "start"]