#!/bin/bash

# Railway Quick Start Script
# This script helps you deploy Claude Projects Clone to Railway quickly

set -e  # Exit on any error

echo "🚀 Claude Projects Clone - Railway Quick Start"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not found${NC}"
        echo ""
        echo "Please install Railway CLI first:"
        echo -e "${BLUE}npm install -g @railway/cli${NC}"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
    echo -e "${GREEN}✅ Railway CLI found${NC}"
}

# Check if logged in to Railway
check_railway_auth() {
    if ! railway whoami &> /dev/null; then
        echo -e "${YELLOW}🔑 Please login to Railway first${NC}"
        echo ""
        railway login
        echo ""
    fi
    
    local user=$(railway whoami 2>/dev/null | head -n 1)
    echo -e "${GREEN}✅ Logged in as: $user${NC}"
}

# Check if we're in the right directory
check_project_directory() {
    if [[ ! -f "package.json" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
        echo -e "${RED}❌ This doesn't look like the Claude Projects Clone directory${NC}"
        echo "Please run this script from the project root directory."
        exit 1
    fi
    echo -e "${GREEN}✅ Project directory verified${NC}"
}

# Test local build
test_local_build() {
    echo ""
    echo -e "${BLUE}🔨 Testing local build...${NC}"
    
    if pnpm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Local build successful${NC}"
    else
        echo -e "${RED}❌ Local build failed${NC}"
        echo "Please fix build errors before deploying:"
        pnpm run build
        exit 1
    fi
}

# Create Railway project
create_railway_project() {
    echo ""
    echo -e "${BLUE}🚢 Creating Railway project...${NC}"
    
    # Check if already in a Railway project
    if railway status &> /dev/null; then
        echo -e "${YELLOW}⚠️  Already in a Railway project${NC}"
        local project_info=$(railway status 2>/dev/null | head -n 1)
        echo "Current project: $project_info"
        
        read -p "Continue with this project? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Exiting..."
            exit 0
        fi
    else
        read -p "Enter project name (default: claude-projects-clone): " project_name
        project_name=${project_name:-claude-projects-clone}
        
        if railway create "$project_name"; then
            echo -e "${GREEN}✅ Railway project created: $project_name${NC}"
        else
            echo -e "${RED}❌ Failed to create Railway project${NC}"
            exit 1
        fi
    fi
}

# Guide user through database setup
setup_databases() {
    echo ""
    echo -e "${BLUE}🗄️  Database Setup${NC}"
    echo ""
    echo "You need to add PostgreSQL and Redis services to your Railway project:"
    echo ""
    echo "1. Go to: https://railway.app/dashboard"
    echo "2. Select your project"
    echo "3. Click 'Add Service' → 'Database' → 'PostgreSQL'"
    echo "4. Click 'Add Service' → 'Database' → 'Redis'"
    echo ""
    
    read -p "Press Enter when you've added both databases..." -r
    echo -e "${GREEN}✅ Databases setup complete${NC}"
}

# Guide user through environment variables
setup_environment_variables() {
    echo ""
    echo -e "${BLUE}⚙️  Environment Variables Setup${NC}"
    echo ""
    echo "You need to set up environment variables in Railway:"
    echo ""
    echo "1. Go to your Railway project dashboard"
    echo "2. Click on the main service (not the databases)"
    echo "3. Go to 'Variables' tab"
    echo "4. Add the following variables:"
    echo ""
    echo -e "${YELLOW}Required Variables:${NC}"
    echo "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
    echo "REDIS_URL=\${{Redis.REDIS_URL}}"
    echo "NODE_ENV=production"
    echo ""
    echo -e "${YELLOW}Generate secure JWT secrets (32+ characters):${NC}"
    echo "JWT_SECRET=your-super-secure-jwt-secret-32-chars-min"
    echo "JWT_REFRESH_SECRET=your-super-secure-refresh-secret-32-chars-min"
    echo ""
    echo -e "${YELLOW}Add your API keys:${NC}"
    echo "OPENAI_API_KEY=sk-your-openai-api-key"
    echo "ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "ADMIN_EMAIL=your-email@domain.com"
    echo "MAX_FILE_SIZE=52428800"
    echo "LOG_LEVEL=info"
    echo "DEFAULT_TOKEN_LIMIT_GLOBAL=1000000"
    echo "DEFAULT_TOKEN_LIMIT_MONTHLY=100000"
    echo "RUN_MIGRATIONS=true"
    echo ""
    
    read -p "Press Enter when you've set up all environment variables..." -r
    echo -e "${GREEN}✅ Environment variables setup complete${NC}"
}

# Deploy to Railway
deploy_to_railway() {
    echo ""
    echo -e "${BLUE}🚀 Deploying to Railway...${NC}"
    
    if railway up; then
        echo ""
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        
        # Get the domain
        local domain=$(railway domain 2>/dev/null | grep -E 'https?://' | head -n 1)
        if [[ -n "$domain" ]]; then
            echo ""
            echo -e "${GREEN}🌐 Your app is available at:${NC}"
            echo -e "${BLUE}$domain${NC}"
            echo ""
            echo -e "${GREEN}🔧 API Health Check:${NC}"
            echo -e "${BLUE}$domain/api/health${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        echo ""
        echo "Check the logs for more information:"
        echo -e "${BLUE}railway logs${NC}"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    echo ""
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    
    local domain=$(railway domain 2>/dev/null | grep -E 'https?://' | head -n 1)
    if [[ -n "$domain" ]]; then
        echo "Testing health endpoint..."
        
        if curl -s -f "$domain/api/health" > /dev/null; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check failed - app may still be starting${NC}"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}📊 Monitor your deployment:${NC}"
    echo -e "${BLUE}railway logs --follow${NC}"
}

# Show next steps
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Test your application thoroughly"
    echo "2. Set up custom domain (optional)"
    echo "3. Configure monitoring and alerts"
    echo "4. Set up backups (Railway handles this automatically)"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "• Full guide: ./RAILWAY.md"
    echo "• Deployment checklist: ./DEPLOYMENT_CHECKLIST.md"
    echo ""
    echo -e "${BLUE}🛠️  Useful Commands:${NC}"
    echo "• View logs: railway logs"
    echo "• Open dashboard: railway open"
    echo "• Check status: railway status"
    echo ""
    echo "Happy coding! 🚀"
}

# Main execution
main() {
    echo "Starting Railway deployment process..."
    echo ""
    
    check_project_directory
    check_railway_cli
    check_railway_auth
    test_local_build
    create_railway_project
    setup_databases
    setup_environment_variables
    
    if deploy_to_railway; then
        verify_deployment
        show_next_steps
    else
        echo ""
        echo -e "${RED}Deployment failed. Please check the errors above and try again.${NC}"
        echo ""
        echo "For help, check:"
        echo "• Railway logs: railway logs"
        echo "• Documentation: ./RAILWAY.md"
        echo "• Deployment checklist: ./DEPLOYMENT_CHECKLIST.md"
        exit 1
    fi
}

# Run the main function
main "$@"
