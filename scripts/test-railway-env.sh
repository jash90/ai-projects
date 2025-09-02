#!/bin/bash

# Test Railway Environment Variables Script
# This script helps test the application with Railway-like environment variables

set -e

echo "🚀 Testing Railway Environment Variables"
echo "========================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env file from template..."
    
    cat > .env << EOF
# Railway Environment Variables for Local Testing
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://claude_user:claude_password@localhost:5432/claude_projects
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=7d
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.sass,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.yaml,.yml,.xml,.sql,.sh,.bash,.dockerfile,.gitignore,.env.example
CORS_ORIGIN=http://localhost:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
ADMIN_EMAIL=bartekziimny90@gmail.com
DEFAULT_TOKEN_LIMIT_GLOBAL=1000000
DEFAULT_TOKEN_LIMIT_MONTHLY=100000
LOG_LEVEL=info
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
EOF
    
    echo "✅ .env file created!"
    echo "⚠️  Please edit .env file and add your real API keys!"
    echo ""
fi

# Load environment variables
echo "📋 Loading environment variables..."
source .env

# Validate required variables
echo "🔍 Validating environment variables..."

required_vars=(
    "NODE_ENV"
    "DATABASE_URL" 
    "JWT_SECRET"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set these variables in your .env file"
    exit 1
fi

echo "✅ All required environment variables are set!"

# Check optional but important variables
echo "🔍 Checking optional variables..."

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
    echo "⚠️  OPENAI_API_KEY not set or using placeholder"
fi

if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-your-anthropic-api-key-here" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set or using placeholder"
fi

echo ""

# Build and run Docker container
echo "🐳 Building Docker image..."
docker build -t claude-projects-railway-test .

echo "🚀 Running container with Railway environment variables..."
echo "🌐 Application will be available at: http://localhost:8080"
echo "🔍 Check logs with: docker logs claude-projects-railway-test"
echo ""

# Run container with environment variables
docker run --rm \
    --name claude-projects-railway-test \
    --env-file .env \
    -p 8080:80 \
    claude-projects-railway-test

echo ""
echo "✅ Test completed!"
echo "📊 To check logs: docker logs claude-projects-railway-test"
echo "🛑 To stop: docker stop claude-projects-railway-test"
