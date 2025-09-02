#!/bin/sh

# Start script for Railway deployment

echo "🚀 Starting Claude Projects Clone on Railway..."

# Set default port if not provided
export PORT=${PORT:-3000}

echo "📡 Port: $PORT"
echo "🗄️ Database: $DATABASE_URL"
echo "🔄 Redis: $REDIS_URL"

# Update nginx configuration with actual port
sed -i "s/\$PORT/$PORT/g" /etc/nginx/nginx.conf

# Start nginx in background
echo "🌐 Starting Nginx..."
nginx &

# Wait for nginx to start
sleep 2

# Start the backend application
echo "🔧 Starting Backend..."
cd /app/backend

# Run database migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "📊 Running database migrations..."
    # Add migration command here if you have one
    # pnpm run migrate
fi

# Start the backend server
NODE_ENV=production node dist/index.js &

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is healthy
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo "🎉 Application started successfully!"
echo "🌐 Frontend: http://localhost:$PORT"
echo "🔧 Backend: http://localhost:$PORT/api"

# Keep the container running
wait
