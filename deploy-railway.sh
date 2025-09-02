#!/bin/bash

# Railway Deployment Script
echo "🚀 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔑 Please login to Railway first:"
    echo "railway login"
    exit 1
fi

# Build the project locally (optional check)
echo "🔨 Testing local build..."
if pnpm run build; then
    echo "✅ Local build successful"
else
    echo "❌ Local build failed. Please fix errors before deploying."
    exit 1
fi

# Deploy to Railway
echo "🚢 Deploying to Railway..."
if railway up; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your app should be available at:"
    railway domain
    echo ""
    echo "📊 Monitor your deployment:"
    echo "railway logs --follow"
else
    echo "❌ Deployment failed. Check the logs:"
    echo "railway logs"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up your environment variables in Railway dashboard"
echo "2. Configure your custom domain (optional)"
echo "3. Set up monitoring and alerts"
echo ""
echo "📚 Full documentation: ./RAILWAY.md"
