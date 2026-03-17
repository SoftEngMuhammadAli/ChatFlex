# ChatFlex Client

React + Redux dashboard for ChatFlex.

## Stack

- React 19 + Vite
- Redux Toolkit
- React Router
- Socket.io client
- Axios (with auth interceptors)

## Run

```bash
npm install
npm run dev
```

## Environment

- `VITE_API_URL=http://localhost:5000/api/v1`

## App Routing (Current)

- `/login`, `/register`
- `/dashboard/*` for `owner` and `admin`
- `/agent/*` for `agent`
- `/admin/*` for `admin`

Role resolution is handled in `src/App.jsx` using `selectUser()` and `selectIsAuthenticated()`.

## Realtime Design

### Socket client

- `src/api/socket.js`
- Uses `VITE_API_URL` and strips `/api/v1` to connect Socket.io base URL.

### Presence lifecycle

- `src/layouts/DashboardLayout.jsx`
- On connect: emits `join` with `{ userId, workspaceId }`
- Listens for `user_status_change` and `online_users_list`
- Updates Redux team state via `teamSlice`

### Direct messaging

- `src/pages/chat/ChatConsole.jsx`
- `src/pages/agent/AgentDashboard.jsx`
- Listens to `new_private_message` and `message_sent`
- Uses `chatSlice.directMessagesByUser` for per-user message threads

## API client behavior

### Axios

- `src/api/axios.js`
- Adds `Authorization: Bearer <token>` if token exists in localStorage.
- On 401, attempts `POST /auth/refresh-token`.
- If refresh fails: clears auth state and redirects to `/login`.

## Store Layout

- `auth`: login, register, session state
- `chat`: AI + direct messaging state
- `team`: team members + online users
- `user`: user profile/admin helper state
- `adminUsers`: admin user management state

## Main Pages

- `OwnerDashboard`
- `ChatConsole` (AI + human tabs)
- `Team`
- `AgentDashboard`
- `AdminDashboard`
- `UsersList`
