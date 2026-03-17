# ChatFlex Analytics Logic (Current Implementation)

This file documents the analytics behavior implemented in the current codebase.

## 1. Endpoints and Access

- Backend routes: `server/src/routes/analytics.routes.js`
- Mounted under: `/api/v1/analytics` via `server/src/routes/index.js`
- Endpoints:
  - `GET /summary`
  - `GET /timeseries?days=<n>`
- Auth:
  - Both routes require `checkAuth` + role middleware.
  - Allowed roles: `owner`, `admin`, `super-admin`.
- Scope rules in controller (`server/src/controllers/analytics.controller.js`):
  - `super-admin`: global analytics (all workspaces).
  - all other roles: workspace-scoped analytics using `req.user.workspaceId`.
  - if non-super-admin has no workspace id: `400 Workspace is required for analytics`.

## 2. Summary Metrics (`GET /summary`)

### 2.1 Counting logic

`getAnalyticsSummary` returns:

- `totalUsers`
- `activeUsers`
- `totalConversations`
- `totalChats` (alias of `totalConversations`)
- `totalMessages`
- `aiTokensUsed`
- `conversationsThisMonth`
- `firstResponseTimeSeconds`
- `agentPerformance`

Data sources:

- `User`, `Conversation`, `Message`, `Usage` models.
- `super-admin`: queries global counts and `Usage` with scope in `["global", "user", "workspace"]`.
- workspace roles: counts are filtered by `workspaceId`; usage is collected from:
  - `Usage.workspaceId == req.user.workspaceId`
  - OR `Usage.userId` in users of that workspace

Usage totals are computed by summing every matched usage document:

- `aiTokensUsed = sum(usage.aiTokensUsed)`
- `conversationsThisMonth = sum(usage.conversationsThisMonth)`

### 2.2 Agent performance logic

`buildAgentPerformance` works as follows:

1. Load all conversations in scope (`_id`, `assignedTo`, `status`).
2. Load all messages for those conversation ids (plus workspace filter for non-super-admin), sorted by `conversationId` then `createdAt`.
3. For each conversation:
   - Track first visitor timestamp (`senderType === "visitor"`).
   - Track first agent/owner message after that visitor message (`senderType === "agent" || "owner"`).
   - Add response delta (ms) to that sender's `firstResponsesMs`.
4. For every agent/owner message, increment sender `totalMessages`.
5. For resolved conversations (`status === "resolved"`), increment `resolvedConversations` for `assignedTo`.
6. Hydrate agent details from `User` (`name`, `email`, `role`), then sort by `totalMessages` descending.

Per-agent output fields:

- `agentId`
- `name`
- `email`
- `role`
- `totalMessages`
- `resolvedConversations`
- `avgFirstResponseSeconds` (rounded)

Overall first response card:

- `firstResponseTimeSeconds` is the average of per-agent averages where value > 0.
- This is not weighted by number of conversations.

## 3. Time Series (`GET /timeseries`)

`getAnalyticsTimeSeries`:

- Accepts `days` query param.
- Clamps to `1..90`; defaults to `14`.
- Creates daily buckets from start date to today:
  - each point: `{ date, messages, conversations }`
- Counts docs created on/after start date:
  - `Message.createdAt`
  - `Conversation.createdAt`
- Returns:
  - `days`
  - `points[]`

## 4. Frontend Data Flow

Redux slice: `client/src/features/analytics/analyticsSlice.jsx`

- Async thunks:
  - `fetchAnalyticsSummary()`
  - `fetchAnalyticsTimeSeries(days)`
- State:
  - `summary`, `points`, `days`
  - `loadingSummary`, `loadingSeries`, `error`

Analytics page: `client/src/pages/super-admin/AnalyticsPage.jsx`

- Loads summary on mount.
- Auto-refreshes summary every 10s when tab is visible.
- Renders:
  - top metric cards
  - agent performance table
- Does not request/use timeseries points.

Home dashboard: `client/src/pages/home/SuperAdminHomePage.jsx`

- On mount and every 10s (visible tab), requests:
  - billing status
  - pricing plans
  - analytics summary
  - analytics timeseries with `days=7`
- Current dashboard widgets use summary data; timeseries is fetched but not displayed in this page.

## 5. Important Implementation Notes

- `activeUsers` counts statuses in `["online", "busy", "active"]`, while `User` schema enum is `["online", "offline", "busy"]`. This now counts online + busy users and still tolerates legacy `"active"` values.
- `totalChats` is intentionally duplicated from `totalConversations` for UI compatibility.
- Resolved credit depends on `conversation.assignedTo`; resolved conversations without an assignee are not counted for any agent.
