# Claude Projects Clone

A production-ready, full-stack AI-powered project management platform that replicates and extends Claude Projects functionality with advanced AI agents, real-time chat, dynamic model management, and comprehensive project collaboration tools.

## 🎯 Key Features

### 🤖 **Advanced AI Integration**
- **Dynamic Model Management**: Automatic synchronization of OpenAI and Anthropic models
- **Custom AI Models**: Support for latest models including GPT-5, Claude Opus 4.1, and more
- **Intelligent Agent System**: 5 specialized AI agents with distinct personalities and capabilities
- **Real-time Chat**: WebSocket-powered conversations with typing indicators and message history
- **Context-Aware AI**: Project files automatically included in AI conversations for enhanced context

### 📁 **Project Management**
- **Multi-Project Support**: Create and manage unlimited projects with dedicated contexts
- **File Management**: Upload, preview, and organize project files (text, markdown, code)
- **Project-Specific Agents**: Each project can have its own AI agent configuration
- **Conversation History**: Persistent chat history per project and agent combination
- **Real-time Collaboration**: Live updates across all connected clients

### 🔒 **Enterprise-Grade Security**
- **JWT Authentication**: Secure token-based auth with automatic refresh
- **Rate Limiting**: Configurable request limits with Redis-backed storage
- **Input Validation**: Comprehensive request validation using Joi schemas
- **Security Headers**: Helmet.js integration for secure HTTP headers
- **CORS Protection**: Configurable cross-origin request handling

### 🎨 **Modern User Experience**
- **Responsive Design**: Mobile-first UI that works on all devices
- **Dark/Light Mode**: System-aware theme switching
- **Real-time Updates**: Live notifications and status updates
- **Drag & Drop**: Intuitive file upload with visual feedback
- **Smooth Animations**: Framer Motion powered transitions
- **Monaco Editor**: Advanced code editing capabilities

### ⚡ **High Performance**
- **Optimized Queries**: Efficient database operations with indexing
- **Redis Caching**: Fast session storage and rate limiting
- **Lazy Loading**: Components loaded on-demand for faster initial loads
- **Connection Pooling**: Efficient database connection management
- **Background Processing**: Non-blocking AI model synchronization

## 🛠️ Tech Stack

### Frontend Architecture
```typescript
React 18 + TypeScript          // Component framework with strict typing
Vite                          // Lightning-fast build tool and dev server
Tailwind CSS                  // Utility-first styling with custom design system
Zustand                       // Lightweight state management
TanStack Query               // Server state management and caching
Socket.io Client             // Real-time bidirectional communication
React Hook Form + Zod        // Type-safe form validation
Framer Motion                // Smooth animations and transitions
React Router v6              // Modern routing with data loading
Lucide React                 // Beautiful icon library
```

### Backend Architecture
```typescript
Node.js 18+ + Express        // Server runtime and web framework
TypeScript                   // Static type checking
PostgreSQL 15                // Primary database with JSONB support
Redis 7                      // Session storage, caching, and rate limiting
Socket.io                    // WebSocket server with authentication
Winston                      // Structured logging with rotation
JWT                          // Authentication with refresh tokens
Multer                       // File upload handling
Joi                          // Request validation schemas
Helmet + CORS                // Security middleware
```

### AI & ML Integration
```typescript
OpenAI SDK v4.20.1          // GPT models integration
Anthropic SDK v0.60.0       // Claude models integration
Dynamic Model Management     // Auto-sync latest models
Custom Model Lists          // Support for unreleased models
Context-Aware Processing    // Project files in AI conversations
```

### DevOps & Infrastructure
```yaml
Docker + Docker Compose     # Containerization and orchestration
pnpm Workspaces            # Monorepo dependency management
Jest + Supertest           # Comprehensive testing suite
ESLint + Prettier          # Code quality and formatting
GitHub Actions Ready       # CI/CD pipeline configuration
Health Checks              # Container and service monitoring
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **pnpm 8+** (install with `corepack enable pnpm`)
- **Docker & Docker Compose** (for containerized setup)
- **Git** (for version control)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd claude-projects-clone

# Install all dependencies
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

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.py,.java,.cpp,.go,.rs,.php,.rb,.swift,.yaml,.yml,.xml,.sql,.sh,.bash

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# AI Provider API Keys
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Logging
LOG_LEVEL=info
```

**Frontend Environment** (`frontend/.env`):
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Optional: Analytics and monitoring
VITE_APP_VERSION=1.0.0
VITE_BUILD_DATE=2024-01-01
```

### 3. Choose Your Setup Method

#### Option A: Docker (Recommended for Production)
```bash
# Start all services with Docker
pnpm run docker:up

# View logs
docker-compose logs -f

# Stop all services
pnpm run docker:down
```

#### Option B: Development Mode
```bash
# Start databases only
docker-compose up postgres redis -d

# Run database migrations and seeding
pnpm run db:migrate
pnpm run db:seed

# Start both frontend and backend in development mode
pnpm run dev
```

#### Option C: Manual Setup
```bash
# Start backend
cd backend
pnpm run dev

# In another terminal, start frontend
cd frontend
pnpm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs (coming soon)

## 📖 Usage Guide

### Creating Your First Project
1. **Register/Login**: Create an account or sign in
2. **New Project**: Click "New Project" and provide name/description
3. **Select Agent**: Choose from 5 specialized AI agents
4. **Upload Files**: Add project files for AI context (optional)
5. **Start Chatting**: Begin conversations with your AI agent

### AI Agents Available
1. **General Assistant** - Versatile helper for any task
2. **Code Expert** - Programming and technical problem-solving
3. **Research Analyst** - Data analysis and research tasks
4. **Creative Writer** - Content creation and storytelling
5. **Business Consultant** - Strategy and business advice

### Advanced Features
- **Multi-Model Support**: Switch between different AI models
- **Context Preservation**: Conversations maintain project context
- **File Integration**: Upload files that AI can reference
- **Real-time Sync**: Changes appear instantly across devices
- **Export Conversations**: Download chat history for records

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Pages    │  │ Components  │  │     Stores          │  │
│  │             │  │             │  │ (Zustand)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Hooks    │  │   Services  │  │   TanStack Query    │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                 HTTP API   WebSocket   │
                    │         │         │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Middleware  │  │     Services        │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Models    │  │   Utils     │  │   Socket Handler    │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              PostgreSQL    Redis    AI APIs
                    │         │         │
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Redis    │  │    AI Providers     │  │
│  │   Database  │  │   Cache     │  │ OpenAI + Anthropic  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📡 API Reference

### Authentication Endpoints
```http
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User authentication
POST   /api/auth/refresh      # Refresh JWT token
POST   /api/auth/logout       # Logout and blacklist token
```

### Project Management
```http
GET    /api/projects          # List user projects
POST   /api/projects          # Create new project
GET    /api/projects/:id      # Get project details
PUT    /api/projects/:id      # Update project
DELETE /api/projects/:id      # Delete project
```

### AI Models & Agents
```http
GET    /api/models            # List all available AI models
GET    /api/models/providers/status  # Get provider status
GET    /api/models/providers/:provider  # Get models by provider
POST   /api/models/sync       # Manually sync models
GET    /api/agents            # List available agents
POST   /api/agents            # Create custom agent
```

### Chat & Conversations
```http
GET    /api/projects/:projectId/agents/:agentId/conversations  # Get conversation
POST   /api/projects/:projectId/agents/:agentId/chat          # Send message
GET    /api/conversations/:id/messages                        # Get message history
```

### File Management
```http
GET    /api/projects/:id/files     # List project files
POST   /api/projects/:id/files     # Upload project file
GET    /api/files/:id              # Get file content
PUT    /api/files/:id              # Update file
DELETE /api/files/:id              # Delete file
```

### WebSocket Events
```javascript
// Client to Server
'join-project'        // Join project room
'send-message'        // Send chat message
'typing-start'        // Start typing indicator
'typing-stop'         // Stop typing indicator

// Server to Client
'new-message'         // New message received
'message-history'     // Historical messages
'user-typing'         // User typing status
'connection-status'   // Connection updates
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run backend tests only
cd backend && pnpm test

# Run tests with coverage
cd backend && pnpm test --coverage

# Run specific test suites
cd backend && pnpm test --testNamePattern="Database"
```

### Test Structure
```
backend/src/__tests__/
├── core/                    # Core functionality tests
│   ├── database.test.ts
│   ├── environment.test.ts
│   └── testHelpers.test.ts
├── models/                  # Database model tests
│   ├── Project.basic.test.ts
│   └── Conversation.basic.test.ts
├── routes/                  # API endpoint tests
│   └── auth.test.ts
├── services/                # Service layer tests
│   └── aiService.test.ts
└── utils/                   # Utility function tests
    └── testHelpers.ts
```

## 🚀 Deployment

### Production Build
```bash
# Build both frontend and backend
pnpm run build

# Start production server
pnpm start
```

### Docker Production
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# Scale services (optional)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=postgres://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-secret-min-32-characters
OPENAI_API_KEY=your-production-openai-key
ANTHROPIC_API_KEY=your-production-anthropic-key
CORS_ORIGIN=https://yourdomain.com
```

## 🔧 Development

### Project Structure
```
claude-projects-clone/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Database models and schemas
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── __tests__/      # Test suites
│   ├── dist/               # Compiled JavaScript
│   ├── uploads/            # File upload storage
│   └── logs/               # Application logs
├── frontend/               # React TypeScript application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand state management
│   │   ├── lib/            # Utility libraries
│   │   └── types/          # TypeScript definitions
│   ├── dist/               # Production build
│   └── public/             # Static assets
├── scripts/                # Utility scripts
└── docker-compose.yml      # Container orchestration
```

### Database Schema
```sql
-- Core Tables
users              # User accounts and authentication
projects           # Project information and settings
agents             # AI agent configurations
ai_models          # Available AI models from providers

-- Content Tables
conversations      # Chat conversations (JSONB messages)
project_files      # Project file metadata and content
uploaded_files     # Binary file uploads

-- System Tables
user_sessions      # Active user sessions
rate_limits        # API rate limiting data
```

### Adding New Features

1. **Backend API Endpoint**:
```typescript
// backend/src/routes/newFeature.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  // Implementation
});

export default router;
```

2. **Frontend API Client**:
```typescript
// frontend/src/lib/api.ts
export const newFeatureApi = {
  getData: () => apiClient.get<ApiResponse<DataType>>('/new-feature'),
  // More methods...
};
```

3. **State Management**:
```typescript
// frontend/src/stores/newFeatureStore.ts
import { create } from 'zustand';

interface NewFeatureState {
  data: DataType[];
  // More state...
}

export const useNewFeatureStore = create<NewFeatureState>((set) => ({
  data: [],
  // More methods...
}));
```

### Code Quality Standards
- **TypeScript Strict Mode**: All code uses strict TypeScript
- **ESLint + Prettier**: Automated code formatting and linting
- **Conventional Commits**: Structured commit messages
- **Test Coverage**: Aim for >80% test coverage
- **Documentation**: JSDoc comments for all public APIs

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style Guidelines
- Use **TypeScript** for all new code
- Follow **React** best practices and hooks patterns
- Write **tests** for new functionality
- Update **documentation** for API changes
- Use **conventional commits** for commit messages

### Reporting Issues
- Use the issue template
- Include steps to reproduce
- Provide environment details
- Add relevant logs or screenshots

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and API
- **Anthropic** for Claude models and API
- **React Team** for the amazing framework
- **Vercel** for Vite and development tools
- **PostgreSQL** and **Redis** communities

---

**Built with ❤️ using modern web technologies and AI integration**

For more information, visit our [documentation](docs/) or join our [community discussions](https://github.com/your-repo/discussions).