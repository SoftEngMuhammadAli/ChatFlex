# ChatFlex MERN MVP

This repository contains a MERN stack implementation starter for the ChatFlex PRD:

- `chatflex-server`: Node.js + Express + MongoDB + Socket.IO backend
- `chatflex-client`: React (Vite) dashboard frontend
- `chatflex-widget`: dedicated embeddable widget workspace

## Implemented MVP Modules

- Auth + workspace onboarding
- Email verification + forgot/reset password
- OAuth login endpoint scaffold (`google`/`github`)
- Multi-tenant workspace scoping through JWT
- Role-based access (`owner`, `admin`, `agent`, `viewer`)
- Conversation inbox (open/pending/resolved)
- Real-time updates with Socket.IO
- FAQ CRUD + public FAQ endpoint
- AI service endpoint (FAQ-first + hybrid OpenAI fallback)
- Basic analytics summary
- Billing plans + usage + Stripe webhook processing
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
Widget test page: `http://localhost:5000/widget-test.html`

## API Base

- Base URL: `http://localhost:5000/api`
- Health check: `GET /api/health`
- AI response: `POST /api/ai/respond`
- Conversation summary: `GET /api/ai/conversations/:conversationId/summary`

## Notes

- Configure `.env` before running OAuth, Stripe, and OpenAI-dependent features.
- Public widget endpoints are available:
  - `POST /api/conversations/public/:workspaceId`
  - `POST /api/conversations/public/:workspaceId/:conversationId/messages`
  - `GET /api/conversations/public/:workspaceId/:conversationId/messages`
