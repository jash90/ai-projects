#!/bin/bash

# Setup script for Claude Projects Clone
set -e

echo "🚀 Setting up Claude Projects Clone..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files from examples
echo "🔧 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "📝 Created backend/.env from example"
else
    echo "📝 backend/.env already exists"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "📝 Created frontend/.env from example"
else
    echo "📝 frontend/.env already exists"
fi

# Create uploads directory
mkdir -p backend/uploads
echo "📁 Created uploads directory"

# Create logs directory
mkdir -p backend/logs
echo "📁 Created logs directory"

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 Quick Start:"
echo "1. Start the databases:"
echo "   docker-compose up postgres redis -d"
echo ""
echo "2. Seed the database:"
echo "   cd backend && npm run db:seed"
echo ""
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "4. Open your browser to:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "📖 For more details, see the README.md file"