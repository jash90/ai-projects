# AI Projects

A production-ready, full-stack AI-powered development platform that revolutionizes how developers collaborate with AI. Built with modern web technologies, featuring advanced AI agents, real-time collaboration, comprehensive project management, and native mobile/PWA support.

## 🎯 Key Features

### 🤖 **Advanced AI Integration**
- **Dynamic Model Management**: Automatic synchronization of OpenAI and Anthropic models with real-time status monitoring
- **Multi-Provider Support**: Seamless integration with OpenAI GPT models and Anthropic Claude models
- **Intelligent Agent System**: Specialized AI agents with distinct personalities and capabilities
- **Real-time Chat**: WebSocket-powered conversations with typing indicators and message history
- **Context-Aware AI**: Project files automatically included in AI conversations for enhanced context
- **Token Usage Tracking**: Comprehensive monitoring of AI API usage and costs per project and agent
- **Token Limit Management**: Admin-configurable global and per-user token limits with automatic enforcement
- **Streaming Responses**: Real-time AI response streaming for better user experience

### 📁 **Project Management**
- **Multi-Project Support**: Create and manage unlimited projects with dedicated contexts
- **Advanced File Management**: Upload, preview, and organize project files with support for 20+ file types
- **Project-Specific Agents**: Each project can have its own AI agent configuration
- **Conversation History**: Persistent chat history per project and agent combination with full CRUD operations
- **Real-time Collaboration**: Live updates across all connected clients via WebSocket
- **File Search & Organization**: Full-text search across project files with type filtering
- **Project Analytics**: Usage statistics and insights per project

### 🔒 **Enterprise-Grade Security & Admin**
- **JWT Authentication**: Secure token-based auth with automatic refresh and blacklisting
- **Role-Based Access Control (RBAC)**: Admin and user roles with comprehensive authorization
- **Admin Panel**: Complete admin dashboard with user management, token limits, and system statistics
- **Token Limit Enforcement**: Robust client-side and server-side token limit blocking with real-time validation
- **User Management**: Admin can manage users, set individual token limits, and monitor usage
- **Activity Logging**: Comprehensive audit trail of admin actions and system events
- **Rate Limiting**: Generous, configurable request limits with Redis-backed storage (2000-5000 requests per 15 minutes)
- **Error Handling**: Structured error responses with user-friendly messages and proper HTTP status codes
- **Input Validation**: Comprehensive request validation using Joi schemas
- **Security Headers**: Helmet.js integration for secure HTTP headers
- **CORS Protection**: Configurable cross-origin request handling
- **File Upload Security**: MIME type validation and size limits (10MB max)
- **Session Management**: Secure session handling with Redis storage

### 📱 **Mobile-First & PWA Experience**
- **Progressive Web App (PWA)**: Full PWA support with offline capabilities and native app installation
- **Mobile-Optimized UI**: Touch-friendly interface with proper touch targets (44px minimum)
- **Responsive Design**: Mobile-first design that scales beautifully from phone to desktop
- **Offline Support**: Service worker with intelligent caching strategies for offline functionality
- **Native Features**: Web Share API, push notifications, fullscreen mode, and haptic feedback
- **Touch Gestures**: Swipe navigation, pull-to-refresh, and touch-optimized interactions
- **Mobile Navigation**: Bottom tab navigation and slide-out menus optimized for thumb navigation
- **Safe Area Support**: Proper handling of notched devices and status bars
- **App Installation**: Smart install prompts and PWA installation management

### 🎨 **Modern User Experience**
- **Landing Page**: Beautiful, conversion-optimized landing page with features showcase
- **Dark/Light Mode**: System-aware theme switching with persistent preferences
- **Real-time Updates**: Live notifications and status updates via Socket.IO
- **Drag & Drop**: Intuitive file upload with visual feedback and progress indicators
- **Smooth Animations**: Hardware-accelerated transitions and micro-interactions
- **Advanced Components**: Custom UI components with accessibility support
- **Toast Notifications**: Real-time feedback with react-hot-toast integration
- **User Settings**: Comprehensive settings page for profile, security, preferences, and usage
- **Mobile Chat Interface**: Touch-optimized chat with auto-resize, character counter, and keyboard handling

### ⚡ **High Performance**
- **Optimized Database**: PostgreSQL with JSONB support and efficient indexing
- **Redis Caching**: Fast session storage, rate limiting, and caching layer
- **Code Splitting**: Automatic chunk splitting for optimal loading performance
- **Connection Pooling**: Efficient database connection management
- **Background Processing**: Non-blocking AI model synchronization
- **TanStack Query**: Advanced server state management with caching and background updates
- **Service Worker**: Intelligent caching with network-first and cache-first strategies
- **Mobile Performance**: Optimized for mobile devices with efficient touch handling and animations

## 🛠️ Tech Stack

### Frontend Architecture
```typescript
React 18 + TypeScript          // Component framework with strict typing
Vite 4.5                      // Lightning-fast build tool and dev server  
Tailwind CSS 3.3             // Utility-first styling with custom design system
Zustand 4.4                   // Lightweight state management with specialized stores
TanStack Query 5.8           // Server state management and caching
Socket.io Client 4.7         // Real-time bidirectional communication
React Hook Form 7.47 + Zod   // Type-safe form validation
React Router v6.17           // Modern routing with data loading
Lucide React 0.288           // Beautiful icon library
React Dropzone 14.2          // File upload with drag & drop
React Markdown 9.0           // Markdown rendering with syntax highlighting
PWA Features                 // Service Worker, Web Share API, offline support
```

### Backend Architecture
```typescript
Node.js 18+ + Express 4.18   // Server runtime and web framework
TypeScript 5.2               // Static type checking with strict mode
PostgreSQL 15                // Primary database with JSONB support
Redis 7                      // Session storage, caching, and rate limiting
Socket.io 4.7                // WebSocket server with authentication
Winston 3.11                 // Structured logging with rotation
JWT 9.0                      // Authentication with refresh tokens
Multer 1.4.5                 // File upload handling with security
Joi 17.11                    // Request validation schemas
Helmet 7.0 + CORS 2.8        // Security middleware
Bcrypt 2.4                   // Password hashing
UUID 9.0                     // Unique identifier generation
```

### AI & ML Integration
```typescript
OpenAI SDK v4.20.1          // GPT models integration with streaming
Anthropic SDK v0.60.0       // Claude models integration
Dynamic Model Management     // Auto-sync latest models from providers
Token Usage Tracking        // Comprehensive cost monitoring
Context-Aware Processing    // Project files in AI conversations
Streaming Responses         // Real-time AI response delivery
Custom Agent Personalities  // Specialized AI agents with unique traits
```

### Mobile & PWA Technologies
```typescript
Service Workers             // Offline support and background sync
Web App Manifest           // PWA installation and app metadata
Web Share API              // Native sharing capabilities
Touch Events               // Optimized touch and gesture handling
Intersection Observer      // Efficient scroll and visibility detection
ResizeObserver            // Responsive layout adjustments
IndexedDB                 // Offline data storage
Push Notifications        // Background notifications (ready)
```

### DevOps & Infrastructure
```yaml
Docker + Docker Compose     # Containerization with health checks
pnpm Workspaces 8+         # Monorepo dependency management
Jest 29.7 + Supertest 7.1  # Comprehensive testing suite
ESLint 8.52 + Prettier     # Code quality and formatting
TypeScript Strict Mode     # Enhanced type safety
Nodemon + tsx              # Development hot-reloading
Health Checks              # Container and service monitoring
```

## 🚀 Quick Start

### Option 1: Deploy to Railway (Recommended)

The fastest way to get your application online:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Run the quick start script
./railway-quickstart.sh
```

Or deploy manually:
```bash
# Login to Railway
railway login

# Create project and deploy
railway create claude-projects-clone
railway up
```

📚 **Full Railway guide**: [RAILWAY.md](./RAILWAY.md)  
🔧 **Railway fixes**: [RAILWAY_FIXED.md](./RAILWAY_FIXED.md)  
✅ **Deployment checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

### Option 2: Local Development

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **pnpm 8+** (install with `npm install -g pnpm` or `corepack enable pnpm`)
- **Docker & Docker Compose** (for containerized setup)
- **Git** (for version control)
- **OpenAI API Key** (for GPT models)
- **Anthropic API Key** (for Claude models)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd claude-projects-clone

# Run automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or install manually
pnpm run install:all
```

### 2. Environment Configuration

Create `.env` files with your configuration:

**Backend Environment** (`backend/.env`):
```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
DATABASE_URL=postgres://claude_user:claude_password@localhost:5432/claude_projects

# Redis Configuration
REDIS_URL=redis://localhost:6379

# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Admin Configuration
ADMIN_EMAIL=your-admin-email@example.com
DEFAULT_TOKEN_LIMIT_GLOBAL=100000
DEFAULT_TOKEN_LIMIT_MONTHLY=50000

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

**Frontend Environment** (`frontend/.env`):
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# App Configuration
VITE_APP_NAME=AI Projects
VITE_APP_VERSION=1.0.0

# PWA Configuration
VITE_PWA_NAME=AI Projects
VITE_PWA_SHORT_NAME=AI Projects
VITE_PWA_DESCRIPTION=AI-powered development platform
```

### 3. Development Setup

**Option A: Docker Compose (Recommended)**
```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Admin: http://localhost:3000/admin (after creating admin user)
```

**Option B: Local Development**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Install dependencies
pnpm run install:all

# Run database migrations
cd backend && pnpm run migrate

# Start development servers
pnpm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### 4. Initial Setup

1. **Create Admin User**:
   ```bash
   # The first user registered with ADMIN_EMAIL becomes admin
   # Or run migration to promote existing user
   cd backend && pnpm run migrate
   ```

2. **Access Admin Panel**:
   - Navigate to `/admin` after logging in as admin
   - Configure global token limits
   - Manage users and monitor usage

3. **Install as PWA**:
   - Visit the site on mobile or desktop
   - Look for install prompts in browser
   - Add to home screen for native app experience

## 📱 Mobile & PWA Features

### Progressive Web App Capabilities
- **Offline Functionality**: Work without internet connection using cached data
- **App Installation**: Install directly from browser with native app experience
- **Push Notifications**: Background notifications (infrastructure ready)
- **Background Sync**: Queue actions when offline, sync when back online
- **Native Sharing**: Share projects using device's native share sheet
- **Fullscreen Mode**: Immersive experience without browser UI
- **Splash Screen**: Custom loading screen during app startup

### Mobile-Optimized Interface
- **Touch Navigation**: Bottom tab bar and slide-out menus
- **Gesture Support**: Swipe navigation and touch-friendly interactions
- **Responsive Chat**: Mobile-optimized chat interface with keyboard handling
- **File Management**: Touch-friendly file actions with action sheets
- **Safe Areas**: Proper handling of device notches and home indicators
- **Haptic Feedback**: Vibration feedback for user interactions

### Mobile-First Components
```typescript
// Mobile Navigation with bottom tabs
<MobileNavigation onNewProject={handleNewProject} />

// Touch-optimized file actions
<MobileFileActions 
  file={file}
  onEdit={handleEdit}
  onDownload={handleDownload}
  onShare={handleShare}
/>

// PWA features integration
const { isOffline, canInstall, install, share } = usePWAFeatures();
```

## 🔧 API Reference

### Authentication Endpoints
```typescript
POST   /api/auth/register     // User registration
POST   /api/auth/login        // User login  
POST   /api/auth/logout       // User logout
POST   /api/auth/refresh      // Token refresh
GET    /api/auth/verify       // Token verification
GET    /api/auth/me           // Get current user
```

### Project Management
```typescript
GET    /api/projects          // Get user projects
POST   /api/projects          // Create new project
GET    /api/projects/:id      // Get project details
PUT    /api/projects/:id      // Update project
DELETE /api/projects/:id      // Delete project
POST   /api/projects/:id/files // Upload project file
GET    /api/projects/:id/files // Get project files
```

### AI Chat & Agents
```typescript
GET    /api/agents            // Get available agents
POST   /api/agents            // Create custom agent
GET    /api/agents/:id        // Get agent details
PUT    /api/agents/:id        // Update agent
DELETE /api/agents/:id        // Delete agent
POST   /api/chat              // Send chat message
GET    /api/conversations/:id // Get conversation history
DELETE /api/conversations/:id // Clear conversation
```

### Admin Panel (Admin Only)
```typescript
GET    /api/admin/stats       // Get system statistics
GET    /api/admin/users       // Get all users
GET    /api/admin/users/:id/stats // Get user statistics
PUT    /api/admin/users/:id/status // Toggle user status
PUT    /api/admin/users/:id/limits // Update user token limits
GET    /api/admin/limits      // Get global token limits
PUT    /api/admin/limits      // Update global token limits
GET    /api/admin/activity    // Get admin activity log
```

### User Settings (Authenticated Users)
```typescript
GET    /api/settings/profile  // Get user profile
PUT    /api/settings/profile  // Update profile
PUT    /api/settings/password // Change password
GET    /api/settings/preferences // Get user preferences
PUT    /api/settings/preferences // Update preferences
GET    /api/settings/usage    // Get personal usage statistics
```

### Debug Endpoints (Development/Testing)
```typescript
GET    /api/debug/user-status        // Get detailed user status and capabilities
POST   /api/debug/test-token-limit   // Test token limit checking with specified tokens
GET    /api/debug/test-ai-service    // Check AI service connectivity and configuration
POST   /api/debug/reset-user-usage/:userId // Reset user token usage (admin only)
```

### Real-time WebSocket Events
```typescript
// Client to Server
'join-project'        // Join project room
'leave-project'       // Leave project room
'chat-message'        // Send chat message
'typing-start'        // Start typing indicator
'typing-stop'         // Stop typing indicator

// Server to Client
'project-updated'     // Project data changed
'new-message'         // New chat message
'user-typing'         // User typing status
'file-uploaded'       // New file uploaded
'agent-status'        // Agent availability change
```

## 🏗️ Architecture

### Frontend Architecture
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, etc.)
│   ├── chat/           # Chat-related components
│   ├── files/          # File management components
│   ├── agents/         # AI agent components
│   ├── projects/       # Project management components
│   ├── admin/          # Admin panel components
│   └── layouts/        # Layout components
├── pages/              # Page components
│   ├── LandingPage.tsx # Marketing landing page
│   ├── DashboardPage.tsx # Main dashboard
│   ├── ProjectPage.tsx # Project workspace
│   ├── AdminPage.tsx   # Admin panel
│   └── SettingsPage.tsx # User settings
├── stores/             # Zustand state management
│   ├── authStore.ts    # Authentication state
│   ├── projectStore.ts # Project management
│   ├── agentStore.ts   # AI agents state
│   ├── conversationStore.ts # Chat state
│   ├── fileStore.ts    # File management
│   ├── adminStore.ts   # Admin panel state
│   └── uiStore.ts      # UI preferences
├── hooks/              # Custom React hooks
│   ├── useSocket.ts    # WebSocket integration
│   ├── usePWAFeatures.ts # PWA functionality
│   └── useAuth.ts      # Authentication helpers
├── lib/                # Utilities and configurations
├── types/              # TypeScript type definitions
└── utils/              # Helper functions and PWA utilities
```

### Backend Architecture
```
src/
├── controllers/        # Request handlers
├── middleware/         # Express middleware
│   ├── auth.ts        # Authentication middleware
│   ├── adminAuth.ts   # Admin authorization
│   ├── validation.ts  # Request validation
│   └── rateLimiting.ts # Rate limiting
├── models/            # Database models
├── routes/            # API route definitions
│   ├── auth.ts       # Authentication routes
│   ├── projects.ts   # Project management
│   ├── admin.ts      # Admin panel API
│   ├── settings.ts   # User settings API
│   └── chat.ts       # Chat and AI routes
├── services/          # Business logic
│   ├── aiService.ts  # AI integration
│   ├── socketService.ts # WebSocket handling
│   └── uploadService.ts # File upload
├── database/          # Database configuration
│   └── migrations/    # Database migrations
├── utils/             # Utilities and helpers
└── types/             # TypeScript definitions
```

### Database Schema
```sql
-- Core Tables
users                  # User accounts and profiles
projects              # Project information
agents                # AI agent configurations
conversations         # Chat conversations
messages              # Individual chat messages
files                 # Project file metadata
token_usage          # AI usage tracking

-- Admin & Management
global_token_limits   # System-wide token limits
admin_activity_log   # Admin action audit trail
user_management_view # Admin dashboard view

-- Indexes for Performance
idx_users_email       # Fast user lookup
idx_projects_user_id  # User's projects
idx_messages_conversation # Chat history
idx_token_usage_user  # Usage statistics
```

## 🎨 UI/UX Design System

### Design Principles
- **Mobile-First**: Every component designed for mobile, enhanced for desktop
- **Touch-Friendly**: Minimum 44px touch targets throughout the app
- **Accessibility**: WCAG 2.1 compliant with proper ARIA labels
- **Performance**: Hardware-accelerated animations and smooth interactions
- **Consistency**: Unified design language across all platforms

### Component System
```typescript
// Button variants with mobile optimization
<Button size="lg" className="touch-target">Primary Action</Button>
<Button variant="outline" size="sm">Secondary</Button>

// Mobile-optimized navigation
<MobileNavigation showAdminLink={user?.role === 'admin'} />

// Touch-friendly form inputs
<Input className="input-mobile" placeholder="Touch-optimized input" />

// Responsive layout utilities
<div className="container-mobile">
  <div className="grid-mobile gap-4">
    <Card className="card-mobile">Content</Card>
  </div>
</div>
```

### Theme System
```css
/* CSS Custom Properties for theming */
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 96%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

.dark {
  --primary: 217.2 91.2% 59.8%;
  --secondary: 217.2 32.6% 17.5%;
  /* ... dark mode values */
}
```

## 🧪 Testing & Debugging

### Test Coverage
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests (if implemented)
npm run test:e2e

# Token limit blocking tests
npm run test:token-limits

# Debug token limit calculations
npm run debug:token-limits

# Check specific user account
npm run check:user user@example.com

# Inspect test database contents
npm run inspect:test-db
```

### Testing Strategy
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoint and database testing  
- **Component Tests**: React component behavior testing
- **E2E Tests**: Full user workflow testing (ready for implementation)
- **Token Limit Tests**: Comprehensive test suite for token limit enforcement with 7 scenarios
- **User Account Debugging**: Tools to analyze user accounts and diagnose issues
- **Test Database**: Isolated test database with automatic cleanup for safe testing

### Debug Tools & Endpoints

#### Production Debug Endpoints (Authenticated)
```bash
# Get detailed user status and token limits
GET /api/debug/user-status

# Test token limit checking
POST /api/debug/test-token-limit
{
  "tokens_to_use": 1000
}

# Check AI service connectivity  
GET /api/debug/test-ai-service

# Reset user token usage (admin only)
POST /api/debug/reset-user-usage/:userId
```

#### Development Scripts
```bash
# Analyze specific user account
npm run check:user test1234@gmail.com

# Test token limit blocking with 7 comprehensive scenarios
npm run test:token-limits

# Debug token calculations step-by-step
npm run debug:token-limits

# Inspect test database contents
npm run inspect:test-db
```

## 🔧 Recent Improvements

### Token Limit System Overhaul (Latest)
- **Fixed Critical Bug**: Resolved string concatenation issue in token limit calculations that was preventing proper enforcement
- **Comprehensive Testing**: Added 7-scenario test suite covering all token limit edge cases with 100% success rate
- **Enhanced Error Handling**: Structured error responses with specific HTTP status codes (402 for token limits, 429 for rate limits)
- **Debug Tools**: Complete set of debugging tools for analyzing user accounts and token usage
- **Client-Side Validation**: Pre-flight token limit checking to prevent unnecessary API calls
- **Real-Time Feedback**: Token limit banner with progress indicators and status messages

### Error Handling & User Experience
- **Structured Error System**: Custom error classes with user-friendly messages and metadata
- **Smart Error Display**: Frontend automatically formats technical errors into readable messages
- **Rate Limit Separation**: Clear distinction between rate limits (429) and token limits (402)
- **Graceful Degradation**: Proper fallbacks when services are unavailable

### Testing & Quality Assurance
- **Test Database**: Isolated test environment with automatic data cleanup
- **User Account Analysis**: Tools to diagnose account issues and token usage patterns
- **Comprehensive Coverage**: Token limit enforcement tested across all scenarios
- **Production Debugging**: Safe debugging endpoints for troubleshooting live issues

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### Token Limit Issues
```bash
# Check if user can send messages
npm run check:user user@example.com

# Test token limit enforcement
npm run test:token-limits

# Debug token calculations
npm run debug:token-limits
```

**Symptoms**: User can't send messages, seeing "limit exceeded" errors
**Solutions**:
1. Check user's current token usage and limits
2. Verify user account is active
3. Ensure user has AI agents created in their projects
4. Reset token usage if needed (admin only)

#### Chat Not Working
**Symptoms**: Messages not sending, "Failed to send message" errors
**Common Causes**:
1. **No AI Agents**: User needs to create AI agents in their projects
2. **Token Limits**: Check if user has exceeded their limits
3. **API Keys**: Verify OpenAI/Anthropic API keys are configured
4. **Rate Limits**: Check if rate limits are being hit

#### Database Connection Issues
```bash
# Check database connectivity
npm run db:migrate

# Reset test database
npm run inspect:test-db
```

#### Performance Issues
```bash
# Check service health
curl http://localhost:3001/api/health

# Monitor token usage
GET /api/debug/user-status
```

### Debug Workflow
1. **Identify Issue**: Use debug endpoints to gather information
2. **Analyze Data**: Check user status, token limits, and usage patterns
3. **Test Specific Scenarios**: Use test scripts to reproduce issues
4. **Apply Fixes**: Update limits, reset usage, or fix configuration
5. **Verify Resolution**: Re-run tests to confirm fixes

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Build Docker images
docker-compose -f docker-compose.prod.yml build
```

### Environment Variables for Production
```env
# Backend Production
NODE_ENV=production
DATABASE_URL=your-production-db-url
REDIS_URL=your-production-redis-url
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-domain.com

# Frontend Production  
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com
```

### PWA Deployment Checklist
- ✅ HTTPS enabled (required for PWA)
- ✅ Web App Manifest configured
- ✅ Service Worker registered
- ✅ Icons for all device sizes (72px to 512px)
- ✅ Offline functionality tested
- ✅ Install prompts working
- ✅ Push notification infrastructure ready

## 🔧 Configuration

### Backend Configuration (`backend/src/utils/config.ts`)
```typescript
export const config = {
  server: {
    port: process.env.PORT || 3001,
    cors_origin: process.env.CORS_ORIGIN || "http://localhost:3000"
  },
  database: {
    url: process.env.DATABASE_URL || "postgres://claude_user:claude_password@localhost:5432/claude_projects"
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379"
  },
  ai: {
    openai_api_key: process.env.OPENAI_API_KEY,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    default_token_limit_global: parseInt(process.env.DEFAULT_TOKEN_LIMIT_GLOBAL || "100000"),
    default_token_limit_monthly: parseInt(process.env.DEFAULT_TOKEN_LIMIT_MONTHLY || "50000")
  },
  upload: {
    path: process.env.UPLOAD_PATH || "./uploads",
    max_file_size: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
    allowed_types: [".txt", ".md", ".json", ".js", ".ts", ".py", ".java", ".cpp", ".c", ".html", ".css", ".scss", ".yaml", ".yml", ".xml", ".csv", ".log", ".env", ".gitignore", ".dockerfile"]
  },
  rate_limiting: {
    window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000")
  }
};
```

### PWA Configuration (`frontend/public/manifest.json`)
```json
{
  "name": "AI Projects - AI Development Platform",
  "short_name": "AI Projects",
  "description": "Collaborate with AI agents to build amazing projects",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png", 
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "New Project",
      "url": "/dashboard?action=new-project",
      "icons": [{"src": "/icons/shortcut-new-project.png", "sizes": "96x96"}]
    }
  ]
}
```

## 🚀 Advanced Usage

### Custom AI Agent Creation
```typescript
// Create specialized agents for different tasks
const agents = {
  codeReviewer: {
    name: "Code Review Expert",
    description: "Specialized in code analysis and security review",
    personality: "analytical",
    model_id: "gpt-4-turbo-preview",
    system_prompt: `You are a senior code reviewer with expertise in security, performance, and best practices. Focus on providing specific, actionable feedback.`
  },
  
  documentationWriter: {
    name: "Documentation Specialist", 
    description: "Expert in technical writing and documentation",
    personality: "helpful",
    model_id: "claude-3-sonnet-20240229",
    system_prompt: `You are a technical writing expert who creates clear, comprehensive documentation. Focus on user experience and clarity.`
  }
};
```

### WebSocket Integration
```typescript
// Frontend WebSocket usage with authentication
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: { token: authToken },
  transports: ['websocket', 'polling']
});

// Project collaboration
socket.emit('join-project', { projectId });
socket.on('new-message', (message) => {
  // Handle real-time messages
});

// Typing indicators
socket.emit('typing-start', { projectId, agentId });
socket.on('user-typing', ({ userId, isTyping }) => {
  // Show typing indicator
});
```

### PWA Features Integration
```typescript
// Use PWA features in your components
import { usePWAFeatures } from '@/hooks/usePWAFeatures';

function ProjectActions({ project }) {
  const { share, install, canInstall, isOffline } = usePWAFeatures();
  
  const handleShare = async () => {
    await share({
      title: `AI Projects - ${project.name}`,
      text: project.description,
      url: window.location.href
    });
  };
  
  const handleInstall = async () => {
    const success = await install();
    if (success) {
      // App installed successfully
    }
  };
  
  return (
    <div>
      <Button onClick={handleShare}>Share Project</Button>
      {canInstall && (
        <Button onClick={handleInstall}>Install App</Button>
      )}
      {isOffline && <Badge>Offline Mode</Badge>}
    </div>
  );
}
```

### Mobile-Optimized File Upload
```typescript
// Touch-friendly file upload with progress
import { useDropzone } from 'react-dropzone';

function MobileFileUpload({ projectId }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      for (const file of files) {
        await uploadFile(file, projectId, {
          onProgress: (progress) => {
            // Update progress indicator
          }
        });
      }
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });
  
  return (
    <div 
      {...getRootProps()} 
      className="touch-target border-dashed border-2 p-8 text-center rounded-lg"
    >
      <input {...getInputProps()} />
      <p>Tap to select files or drag and drop</p>
    </div>
  );
}
```

### Admin Panel Integration
```typescript
// Admin functionality with proper authorization
import { useAdminStore } from '@/stores/adminStore';

function AdminDashboard() {
  const { 
    stats, 
    users, 
    updateUserLimits, 
    toggleUserStatus 
  } = useAdminStore();
  
  const handleUpdateLimits = async (userId: string, limits: TokenLimits) => {
    await updateUserLimits(userId, limits);
    // Show success message
  };
  
  return (
    <div className="admin-dashboard">
      <AdminStats stats={stats} />
      <UserManagement 
        users={users}
        onUpdateLimits={handleUpdateLimits}
        onToggleStatus={toggleUserStatus}
      />
    </div>
  );
}
```

## 📊 Monitoring & Analytics

### Built-in Analytics
- **User Engagement**: Track active users, session duration, feature usage
- **AI Usage**: Monitor token consumption, model performance, cost tracking
- **Performance**: Response times, error rates, system health
- **Mobile Metrics**: PWA installation rates, offline usage, mobile performance

### Health Checks
```bash
# Check service health
curl http://localhost:3001/health

# Check database connectivity
curl http://localhost:3001/health/db

# Check Redis connectivity  
curl http://localhost:3001/health/redis

# Check AI service availability
curl http://localhost:3001/health/ai
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper tests
4. Ensure mobile compatibility and PWA functionality
5. Run the test suite (`pnpm run test`)
6. Commit with conventional commits (`git commit -m 'feat: add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint + Prettier**: Automated code formatting and linting
- **Conventional Commits**: Structured commit messages for better changelog
- **Mobile-First**: All new features must be mobile-optimized
- **PWA Compliance**: Maintain offline functionality and native app features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** and **Anthropic** for AI model APIs
- **React** and **Node.js** communities for excellent tooling
- **Tailwind CSS** for the utility-first CSS framework
- **Socket.IO** for real-time communication
- **Vite** and **Vercel** for development tools
- **PostgreSQL** and **Redis** communities
- **PWA** community for progressive web app standards

---

## 🔧 Configuration Reference

### Complete Environment Variables

**Backend (.env)**
```env
# Server
NODE_ENV=development|production
PORT=3001

# Database
DATABASE_URL=postgres://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Admin
ADMIN_EMAIL=admin@example.com
DEFAULT_TOKEN_LIMIT_GLOBAL=100000
DEFAULT_TOKEN_LIMIT_MONTHLY=50000

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**
```env
# API
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# App
VITE_APP_NAME=AI Projects
VITE_APP_VERSION=1.0.0

# PWA
VITE_PWA_NAME=AI Projects
VITE_PWA_SHORT_NAME=AI Projects
VITE_PWA_DESCRIPTION=AI-powered development platform
VITE_PWA_THEME_COLOR=#3b82f6
VITE_PWA_BACKGROUND_COLOR=#ffffff
```

---

**Built with ❤️ using modern web technologies, AI integration, and mobile-first design**

For support, feature requests, or contributions, please visit our [GitHub repository](https://github.com/your-username/ai-projects-platform).

**Experience the future of AI-powered development - install as a PWA and take your projects anywhere! 🚀📱**
