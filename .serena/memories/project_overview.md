# AI Projects Platform - Project Overview

## Purpose
A full-stack TypeScript AI Projects Platform that enables users to create projects, manage AI agents, upload files, and have conversations with AI assistants (OpenAI GPT and Anthropic Claude models).

## Tech Stack

### Backend (Node.js + TypeScript)
- **Express 4.18** with TypeScript 5.2
- **PostgreSQL** with native pg driver
- **Redis** for sessions and caching
- **Socket.io 4.7** for WebSocket communication
- **JWT authentication** with refresh tokens
- **Winston** for structured logging
- **Joi** for request validation
- **Multer** for file uploads

### Frontend (React + TypeScript)
- **React 18** with automatic JSX runtime
- **Vite 4.5** for build tooling and dev server
- **TypeScript 5.2** with strict mode
- **TailwindCSS 3.3** with custom design tokens
- **Zustand 4.4** for state management with persistence
- **TanStack Query 5.8** for server state and caching
- **Socket.io Client 4.7** for real-time communication
- **React Router 6.17** for client-side routing

### AI Integration
- **OpenAI SDK v4.20.1** for GPT models
- **Anthropic SDK v0.60.0** for Claude models
- Dynamic model management with auto-sync
- Token usage tracking and limits
- Streaming responses

## Project Structure
- **Root**: pnpm workspace with nx for task orchestration
- **Backend**: Express API server with PostgreSQL and Redis
- **Frontend**: React SPA with Vite bundling
- **Database**: PostgreSQL with structured migrations
- **Deployment**: Docker containers with nginx reverse proxy

## Key Features
- Multi-provider AI chat (OpenAI + Anthropic)
- Project-based file management
- Real-time collaboration via WebSockets
- Advanced markdown editor with math rendering
- Role-based access control with admin features
- Comprehensive token usage tracking