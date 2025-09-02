#!/bin/bash

# Quick Railway Environment Test Script

echo "🚀 Quick Railway Environment Test"
echo "================================="

# Check if .env exists, if not create from template
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from template..."
    cp env.template .env
    echo "✅ .env created! Please edit it with your real values."
    echo "⚠️  Especially add your OPENAI_API_KEY and ANTHROPIC_API_KEY"
    echo ""
fi

# Build and run with environment variables
echo "🐳 Building Docker image..."
docker build -t claude-railway-test .

echo "🚀 Running with Railway environment variables..."
echo "🌐 Will be available at: http://localhost:8080"
echo ""

docker run --rm \
    --name claude-railway-test \
    --env-file .env \
    -p 8080:80 \
    claude-railway-test
