# Stripe Integration Usage (ChatFlex)

This document explains how the Stripe billing flow is wired in this codebase.

## What Is Implemented

- Package selection in Billing UI.
- Step 2 payment method screen (Card / US Bank Account).
- Stripe Checkout session creation on confirm.
- Redirect to Stripe hosted checkout.
- Return to Billing page after payment.
- Checkout verification API call.
- Selected plan status updated to `purchased` after successful payment.

## Backend Changes

### Files

- `chatflex-server/src/controllers/billing.controller.js`
- `chatflex-server/src/routes/billing.routes.js`
- `chatflex-server/src/models/billing.model.js`

### New API Endpoints

- `POST /api/v1/billing/checkout/session`
  - Auth required.
  - Body:
    - `planId` (required)
    - `paymentMethodType` (`card` or `us_bank_account`)
  - Response:
    - `sessionId`
    - `checkoutUrl`

- `GET /api/v1/billing/checkout/session/:sessionId/verify`
  - Auth required.
  - Verifies Stripe session ownership and payment status.
  - On `payment_status === "paid"`:
    - upserts user billing record,
    - sets:
      - `currentPlan`,
      - `status: "purchased"`,
      - `purchasedAt`,
      - `nextBillingDate`,
      - Stripe ids.

### Billing Model

`Billing.status` now supports:

- `active`
- `past_due`
- `canceled`
- `trialing`
- `pending_payment`
- `purchased`

Additional fields:

- `stripeCustomerId`
- `stripeCheckoutSessionId`
- `purchasedAt`

## Frontend Changes

### Files

- `chatflex-client/src/pages/super-admin/BillingPage.jsx`
- `chatflex-client/src/features/billing/billingSlice.jsx`
- `chatflex-client/src/components/super-admin/SuperAdminPricingSectionV2.jsx`

### UI Flow

1. User opens Billing page and sees plans.
2. User clicks `Select Package`.
3. UI navigates to payment method section.
4. User chooses payment method and clicks `Confirm & Pay`.
5. Frontend calls `POST /billing/checkout/session`.
6. Browser redirects to Stripe Checkout URL.
7. Stripe redirects back to:
   - success: `/super-admin/billing?checkout=success&session_id=...`
   - cancel: `/super-admin/billing?checkout=cancel`
8. On success redirect, frontend calls verify endpoint.
9. If paid, billing in Redux updates and selected plan appears as `Purchased`.

## Required Environment Variables

In server env:

- `STRIPE_SECRET_KEY=sk_...`
- `CLIENT_URL=http://localhost:5173` (or your frontend origin)

Optional alternative for frontend origin:

- `FRONTEND_URL=...`

## Where To Find Stripe API Keys

1. Log in to Stripe Dashboard: `https://dashboard.stripe.com`
2. Open `Developers` in the left sidebar.
3. Click `API keys`.
4. Copy:
   - `Publishable key` (starts with `pk_...`) for frontend Stripe SDK use.
   - `Secret key` (starts with `sk_...`) for backend only.
5. Put only secret key in server env:
   - `STRIPE_SECRET_KEY=sk_test_...` (test mode)
   - switch to `sk_live_...` only for production.

Important:

- Never expose `sk_...` in frontend code.
- Keep Stripe dashboard mode aligned with your key type:
  - Test mode keys with test payments.
  - Live mode keys with real payments.

## How To Use In This Project

1. Add env variables in server `.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `CLIENT_URL=http://localhost:5173`
2. Start server and client.
3. In Billing page:
   - Select a package.
   - Pick payment method.
   - Click `Confirm & Pay`.
4. Complete payment on Stripe Checkout.
5. On return, app verifies checkout and updates billing status to `purchased`.

## How Purchased State Is Decided

- Purchased state is tied to Billing record:
  - current plan id = purchased plan id
  - billing status = `purchased`
- Billing page reads this from:
  - `GET /api/v1/billing/billing`

## Notes

- Checkout verification is currently done after redirect from frontend.
- For production-grade reliability, add Stripe webhook handling for `checkout.session.completed` as an additional server-side source of truth.
