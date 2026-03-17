# ChatFlex 🚀

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green?logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black?logo=socket.io)
![Stripe](https://img.shields.io/badge/Stripe-Integration-635BFF?logo=stripe)

ChatFlex is a powerful, real-time customer communication platform crafted for modern workspaces. It brings together live conversations, automated support, and team collaboration into a single, cohesive surface.

This repository is a monorepo that houses the entire ChatFlex ecosystem:

- **`server`**: The robust Express + MongoDB backend API.
- **`client`**: The dynamic, role-based React dashboard for your team.
- **`widget`**: The embeddable React chat widget for your website visitors.

---

## ✨ Core Features

- **Multi-Tenant Workspaces**: Organize teams into isolated workspaces, each with its own API keys, brand settings, AI configurations, and limits.
- **Role-Based Access Control**: Highly granular permissions (`super-admin`, `admin`, `owner`, `agent`, `viewer`) ensuring your team only sees what they need to.
- **Real-Time Communication**: Instant messaging powered by Socket.io, featuring typing indicators, message editing/deletion, and live unread counters.
- **AI-Assisted Support**: Groq-powered AI chat with FAQ-first routing, hybrid human handoffs, and strict token usage limits.
- **Customizable Embed Widget**: Deploy a fully branded chat widget to your site via a simple script tag.
- **Comprehensive Auth**: Email/password authentication, email verification, password resets, plus Google and GitHub OAuth integrations.
- **Integrated Billing**: Built-in Stripe checkout, portal management, and webhook listeners for seamless subscription handling.

---

## 🏗️ Tech Stack

### Client (Dashboard)

- **Framework:** React 19 + Vite
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router v7
- **UI & Icons:** Lucide React, emoji-picker-react

### Server (API Engine)

- **Runtime:** Node.js (Express)
- **Database:** MongoDB (Mongoose)
- **Real-Time:** Socket.io
- **AI Integrations:** Groq SDK
- **Billing & Auth:** Stripe, JWT, bcryptjs
- **Docs:** Swagger UI

### Widget (Embed)

- **Framework:** React 19 + Vite (built as an IIFE library)
- **Styling:** Injected CSS via `vite-plugin-css-injected-by-js`

---

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed:

- Node.js (v18 or higher)
- MongoDB Database (Local or MongoDB Atlas)
- npm or yarn

### 1. Initialize the Server

```bash
cd server
npm install
npm run dev
```

### 2. Initialize the Client

```bash
cd client
npm install
npm run dev
```

### 3. Build & Run the Widget

To develop the widget locally:

```bash
cd widget
npm install
npm run dev
```

To build the deployable widget script (which gets exported to `server/public/chatflex-widget.js`):

```bash
cd widget
npm run build
```

---

## 🔐 Environment Variables

You need to correctly set up your `.env` files for both the Client and Server.

### Server (`server/.env`)

Create a `.env` file in the `server` directory.

```env
# Core Settings
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Auth
DATABASE_URL=mongodb_connection_string_here
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRES_IN=24h

# AI Configuration
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama3-8b-8192

# Billing (Stripe)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret

# Email Verification / Password Reset
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
EMAIL_FROM=support@chatflex.com
```

### Client (`client/.env`)

Create a `.env` file in the `client` directory.

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/login
```

---

## 🔌 Integrating the Widget

Once your server is running, you can drop the ChatFlex widget onto any HTML page.

### Method 1: Loader-Based Embed

Use the static loader script hosted on your server:

```html
<script
  id="chatflex-loader"
  src="http://localhost:5000/widget/chatflex-widget-loader.js"
  data-api-host="http://localhost:5000"
  data-api-key="YOUR_WIDGET_API_KEY"
  data-title="Human Support"
  data-subtitle="Chat with our team"
  data-position="right"
></script>
```

### Method 2: Template-Based Embed

Super-admins can generate secure, tokenized embed scripts directly from the Dashboard (`GET /api/v1/widget-templates/:id/script`).

---

## 📡 API Architecture & Socket Events

Local Server URL: `http://localhost:5000`
API Base URL: `/api/v1`
Interactive Swagger Docs: `http://localhost:5000/api-docs`

### Major REST Modules:

- `/auth`: Login, register, token refresh, forgot/reset password.
- `/oauth`: Social logins (Google/GitHub).
- `/tenant`: Workspace settings and team limits.
- `/chat`: Conversation handling and message fetching.
- `/widget`: Public-facing endpoints utilized by the embedded widget.
- `/billing`: Stripe pricing, subscription lookups, and webhook handlers.

### Socket Events

**Client -> Server**

- `join` | `set_presence_status` | `typing_start` | `typing_stop` | `widget_message` | `private_message` | `mark_thread_read`

**Server -> Client**

- `new_private_message` | `message_sent` | `message_updated` | `message_deleted` | `typing_status_change` | `unread_counts` | `presence_snapshot`

---

## 📚 Additional Documentation

- Checkout `chatflex-documentation.docx` for the initial Phase 1 architecture and PRD.
- Read `stripe_usage.md` for in-depth Stripe flows.
- See `facebook.md` for Facebook app integration protocols.
