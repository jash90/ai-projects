# Claude Projects Clone

A production-ready, full-stack web application that replicates Claude Projects functionality with AI agents, project management, and real-time chat capabilities.

## 🎯 Features

- **🚀 Project Management**: Create and manage multiple projects with dedicated contexts and custom instructions
- **🤖 AI Agents**: 5 specialized AI agents (General Assistant, Code Expert, Research Analyst, Creative Writer, Business Consultant)
- **💬 Real-time Chat**: WebSocket-powered chat with typing indicators and message history
- **📁 File Management**: Upload, preview, and organize project files with drag-and-drop support
- **🔒 Secure Authentication**: JWT-based auth with token refresh and rate limiting
- **🎨 Modern UI**: Responsive React interface with dark/light mode and smooth animations
- **⚡ High Performance**: Optimized with caching, lazy loading, pagination, and compression
- **🐳 Docker Ready**: Complete containerization with production-ready configurations

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript and strict type checking
- **Vite** for lightning-fast development and optimized builds
- **Tailwind CSS** with custom design system and dark mode
- **Zustand** for lightweight, scalable state management
- **TanStack Query** for server state management and caching
- **Socket.io Client** for real-time bidirectional communication
- **React Hook Form + Zod** for type-safe form validation
- **Framer Motion** for smooth animations and transitions

### Backend
- **Node.js 18+** with Express and TypeScript
- **PostgreSQL 15** with optimized queries and indexing
- **Redis 7** for session storage, caching, and rate limiting
- **Socket.io** for WebSocket support with authentication
- **JWT** with refresh tokens and blacklisting
- **Multer + Sharp** for file uploads and image processing
- **Winston** for structured logging with rotation
- **Helmet + CORS** for security headers and protection

### DevOps & Infrastructure
- **Docker & Docker Compose** for containerization
- **Nginx** reverse proxy with gzip and security headers
- **Health checks** and graceful shutdown handling
- **Environment-based configuration** for all deployments

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (install with `npm install -g pnpm` or `corepack enable pnpm`)
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd claude-projects-clone
   ```

2. **Install dependencies**
   ```bash
   pnpm run install:all
   ```

3. **Start with Docker (Recommended)**
   ```bash
   pnpm run docker:up
   ```
   
   Or start services individually:
   ```bash
   # Start databases
   docker-compose up postgres redis -d
   
   # Start development servers
   pnpm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env)**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://claude_user:claude_password@localhost:5432/claude_projects
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Architecture

```
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API and WebSocket services
│   │   ├── store/         # State management
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── ...
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── ...
└── docker-compose.yml # Container orchestration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Chat
- `GET /api/projects/:id/messages` - Get chat history
- `POST /api/projects/:id/messages` - Send message
- WebSocket events for real-time messaging

### Files
- `POST /api/projects/:id/files` - Upload file
- `GET /api/projects/:id/files` - List project files
- `GET /api/files/:id` - Download/view file
- `DELETE /api/files/:id` - Delete file

### Agents
- `GET /api/agents` - List available agents
- `PUT /api/projects/:id/agent` - Set project agent

## Development

### Database Operations
```bash
pnpm run db:migrate  # Run database migrations
pnpm run db:seed     # Seed database with sample data
```

### Build for Production
```bash
pnpm run build       # Build both frontend and backend
pnpm start          # Start production server
```

### Docker Operations
```bash
pnpm run docker:up    # Start all services
pnpm run docker:down  # Stop all services
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details