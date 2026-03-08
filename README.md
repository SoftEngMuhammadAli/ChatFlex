# ChatFlex MERN MVP

This repository contains a MERN stack implementation starter for the ChatFlex PRD:

- `chatflex-server`: Node.js + Express + MongoDB + Socket.IO backend
- `chatflex-client`: React (Vite) dashboard frontend

## Implemented MVP Modules

- Auth + workspace onboarding
- Multi-tenant workspace scoping through JWT
- Role-based access (`owner`, `admin`, `agent`, `viewer`)
- Conversation inbox (open/pending/resolved)
- Real-time updates with Socket.IO
- FAQ CRUD + public FAQ endpoint
- Basic analytics summary
- Billing plans + usage endpoint (Stripe checkout stub)
- Workspace settings for widget + AI mode

## Tech Stack

- MongoDB + Mongoose
- Express REST APIs
- React + React Router
- Node.js runtime
- Socket.IO for real-time messaging

## Quick Start

1. Install dependencies from repo root:

```bash
npm install
```

2. Configure environment files:

- Copy `chatflex-server/.env.example` to `chatflex-server/.env`
- Copy `chatflex-client/.env.example` to `chatflex-client/.env`

3. Run server + client:

```bash
npm run dev
```

Server: `http://localhost:5000`  
Client: `http://localhost:5173`

## API Base

- Base URL: `http://localhost:5000/api`
- Health check: `GET /api/health`

## Notes

- OAuth, email verification, Stripe webhook verification, AI provider integration, and advanced automations are scaffold-ready but not fully implemented in this starter.
- Public widget endpoints are available:
  - `POST /api/conversations/public/:workspaceId`
  - `POST /api/conversations/public/:workspaceId/:conversationId/messages`
