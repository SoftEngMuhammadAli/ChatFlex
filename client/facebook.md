# Facebook Login Setup and Integration Guide (ChatFlex)

This guide explains how to create a Facebook app, generate keys, and integrate Facebook OAuth with this codebase.

## 1. Current ChatFlex Flow (What already exists)

ChatFlex already has Facebook OAuth wired:

- Frontend button loads Facebook JS SDK and calls `FB.login(...)`
  - File: `chatflex-client/src/components/auth/FacebookAuthButton.jsx`
  - Sends `scope: "email,public_profile"`
- Frontend sends Facebook `accessToken` to backend:
  - `POST /api/v1/oauth/facebook`
  - File: `chatflex-client/src/features/auth/oAuthSlice.jsx`
- Backend validates token via Graph API and logs user in/creates user:
  - File: `chatflex-server/src/controllers/oAuth.controller.js`

## 2. Create Facebook App in Meta Developer Dashboard

1. Go to `https://developers.facebook.com/` and sign in.
2. Open **My Apps** -> **Create App**.
3. Choose an app type that supports Facebook Login (commonly Consumer/Business based on dashboard options shown).
4. Add the **Facebook Login** product to your app.
5. In **Settings -> Basic**, note:
   - `App ID`
   - `App Secret` (click Show and copy securely)

## 3. Configure App Settings (Dashboard)

In Meta app settings, configure at least:

1. **App Domains**
   - Local: `localhost`
   - Production: your real domain (for example `app.example.com`)
2. **Website platform**
   - Site URL for local frontend (for example `http://localhost:5173`)
   - Production frontend URL (`https://yourdomain.com`)
3. **Facebook Login settings** (if shown in your dashboard)
   - Enable client OAuth login
   - Enable web OAuth login
   - Use strict mode for redirect URIs
   - Add Valid OAuth Redirect URIs if you use redirect flow

Note: this project currently uses popup/token flow from JS SDK, not a server redirect callback route.

## 4. Add Environment Variables

### Server: `chatflex-server/.env`

```env
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
CLIENT_URL=http://localhost:5173
```

Important:

- Keep `FACEBOOK_APP_SECRET` only on server.
- Never expose app secret in client code.

### Client: `chatflex-client/.env`

```env
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_API_URL=http://localhost:5000/api/v1
```

Important:

- `VITE_FACEBOOK_APP_ID` is safe to expose.
- Restart dev servers after env changes.

## 5. Local Integration Steps

1. Start backend:
   - `cd chatflex-server`
   - `npm install`
   - `npm run dev`
2. Start frontend:
   - `cd chatflex-client`
   - `npm install`
   - `npm run dev`
3. Open login page and click **Facebook**.
4. On success, frontend stores JWT and user in localStorage.
5. Backend also sets `accessToken` cookie.

## 6. How Backend Validation Works

In `oAuth.controller.js`, backend does:

1. Reads `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`.
2. Calls `https://graph.facebook.com/debug_token` to verify:
   - token is valid
   - token belongs to expected `app_id`
3. Calls `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)`.
4. Creates/updates user and returns ChatFlex JWT token.

If `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` are missing, strict `debug_token` validation is skipped, so keep both set in production.

## 7. Production Go-Live Checklist

1. Set app to **Live** mode in Meta dashboard.
2. Add production domain(s) in app settings.
3. Use HTTPS for frontend and backend.
4. Set `CLIENT_URL` to production dashboard URL.
5. Keep `NODE_ENV=production` so secure cookie behavior is applied.
6. Add required legal URLs in Meta dashboard (privacy policy, terms, data deletion instructions) for approval/live requirements.
7. Test with a non-admin/non-developer Facebook account after go-live.

## 8. Common Errors and Fixes

1. `VITE_FACEBOOK_APP_ID is missing`
   - Add `VITE_FACEBOOK_APP_ID` in `chatflex-client/.env`.
2. `Invalid Facebook token`
   - Token expired or invalid app config; verify app ID/secret and app mode.
3. `Facebook token audience mismatch`
   - Frontend app ID and backend `FACEBOOK_APP_ID` are not the same app.
4. `Facebook account email is required...`
   - User denied `email` permission or account has no accessible email.
5. Popup opens but login fails silently
   - Check browser popup blocking and domain settings in Meta dashboard.

## 9. Minimal API Contract

- Endpoint: `POST /api/v1/oauth/facebook`
- Request body:

```json
{
  "accessToken": "facebook_user_access_token"
}
```

- Success response: `200` with ChatFlex JWT and user payload.

## 10. Security Recommendations

1. Keep app secret only in server env.
2. Always validate token with `debug_token` in production.
3. Keep OAuth scopes minimal (`email,public_profile` is already minimal here).
4. Rotate app secret immediately if leaked.
