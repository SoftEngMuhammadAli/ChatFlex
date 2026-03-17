import { Billing } from "../models/billing.model.js";
import { PricingPlan } from "../models/pricingPlan.model.js";
import { User } from "../models/user.model.js";
import { Workspace } from "../models/workspace.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import Stripe from "stripe";

const resolveClientUrl = () =>
  process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
};

const TRIAL_DAYS = Math.max(1, Number(process.env.TRIAL_DAYS || 14));

const ACTIVE_BILLING_STATUSES = new Set(["active", "purchased", "trialing"]);

const getDefaultPlan = async () =>
  PricingPlan.findOne({ isActive: true }).sort({ priceMonthly: 1, createdAt: 1 });

const toSafeLimit = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const applyPlanToWorkspace = async ({ userId, planId, unsuspend = false }) => {
  if (!userId || !planId) return null;

  const [plan, user] = await Promise.all([
    PricingPlan.findById(planId).lean(),
    User.findById(userId).select("workspaceId").lean(),
  ]);

  const workspaceId = String(user?.workspaceId || "").trim();
  if (!plan || !workspaceId) return null;

  const update = {
    plan: String(plan.name || "").trim().toLowerCase() || "starter",
    limits: {
      conversationsPerMonth: toSafeLimit(
        plan?.limits?.conversationsPerMonth,
        50000,
      ),
      aiTokens: toSafeLimit(plan?.limits?.aiTokens, 5000000),
      agentSeats: toSafeLimit(plan?.limits?.agentSeats, 5),
    },
  };

  if (unsuspend) {
    update.status = "active";
    update.suspension = {
      isSuspended: false,
      reason: "",
      suspendedAt: null,
      suspendedBy: null,
      unsuspendedAt: new Date(),
    };
  }

  return Workspace.findByIdAndUpdate(workspaceId, update, { new: true });
};

const ensureBillingWithTrial = async (user) => {
  let billing = await Billing.findOne({ user: user._id }).populate("currentPlan");
  if (billing) return billing;

  const defaultPlan = await getDefaultPlan();
  if (!defaultPlan) return null;

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const created = await Billing.create({
    user: user._id,
    currentPlan: defaultPlan._id,
    status: "trialing",
    billingCycle: "monthly",
    trialStartedAt,
    trialEndsAt,
    trialConsumed: false,
    nextBillingDate: trialEndsAt,
  });

  await applyPlanToWorkspace({
    userId: user._id,
    planId: defaultPlan._id,
    unsuspend: true,
  });

  billing = await Billing.findById(created._id).populate("currentPlan");
  return billing;
};

const applyTrialLifecycleIfNeeded = async (billing) => {
  if (!billing) return null;
  if (String(billing.status || "") !== "trialing") return billing;

  const trialEndsAt = billing.trialEndsAt ? new Date(billing.trialEndsAt) : null;
  if (!trialEndsAt || Number.isNaN(trialEndsAt.getTime())) return billing;
  if (trialEndsAt.getTime() > Date.now()) return billing;

  const updated = await Billing.findByIdAndUpdate(
    billing._id,
    {
      status: "pending_payment",
      trialConsumed: true,
      nextBillingDate: trialEndsAt,
    },
    { new: true },
  ).populate("currentPlan");

  return updated || billing;
};

const activateBillingAndWorkspace = async ({
  userId,
  planId,
  stripeCustomerId = "",
  stripeSubscriptionId = "",
  stripeCheckoutSessionId = "",
}) => {
  if (!userId || !planId) return null;

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const billing = await Billing.findOneAndUpdate(
    { user: userId },
    {
      currentPlan: planId,
      status: "active",
      billingCycle: "monthly",
      purchasedAt: new Date(),
      nextBillingDate,
      stripeCustomerId: String(stripeCustomerId || ""),
      stripeSubscriptionId: String(stripeSubscriptionId || ""),
      stripeCheckoutSessionId: String(stripeCheckoutSessionId || ""),
      trialConsumed: true,
      suspendedAt: null,
      suspensionReason: "",
    },
    { upsert: true, new: true },
  ).populate("currentPlan");

  await applyPlanToWorkspace({ userId, planId, unsuspend: true });

  return billing;
};

/**
 * CREATE BILLING (manual fallback)
 */
export const createBillingStatus = catchAsyncHandler(async (req, res) => {
  const { currentPlan, status, nextBillingDate, billingCycle } = req.body;

  const plan = await PricingPlan.findById(currentPlan);
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Invalid pricing plan",
    });
  }

  const existing = await Billing.findOne({ user: req.user._id });

  const payload = {
    currentPlan,
    status: status || "trialing",
    billingCycle: billingCycle || "monthly",
    nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : new Date(),
  };

  const billing = existing
    ? await Billing.findByIdAndUpdate(existing._id, payload, { new: true })
    : await Billing.create({
        user: req.user._id,
        ...payload,
      });

  res.status(existing ? 200 : 201).json({
    success: true,
    message: existing
      ? "Billing updated successfully"
      : "Billing created successfully",
    data: billing,
  });
});

/**
 * GET MY BILLING
 */
export const getBillingStatus = catchAsyncHandler(async (req, res) => {
  if (String(req.user?.role || "") === "super-admin") {
    const billing = await Billing.findOne({ user: req.user._id }).populate(
      "currentPlan",
    );
    return res.status(200).json({
      success: true,
      data: billing || null,
    });
  }

  let billing = await ensureBillingWithTrial(req.user);
  billing = await applyTrialLifecycleIfNeeded(billing);

  if (
    billing?.currentPlan?._id &&
    ACTIVE_BILLING_STATUSES.has(String(billing.status || ""))
  ) {
    await applyPlanToWorkspace({
      userId: req.user._id,
      planId: billing.currentPlan._id,
      unsuspend: true,
    });
  }

  return res.status(200).json({
    success: true,
    data: billing || null,
  });
});

/**
 * UPDATE BILLING
 */
export const updateBillingStatus = catchAsyncHandler(async (req, res) => {
  const billing = await Billing.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!billing) {
    return res.status(404).json({
      success: false,
      message: "Billing not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Billing updated",
    data: billing,
  });
});

/**
 * DELETE BILLING
 */
export const deleteBillingStatus = catchAsyncHandler(async (req, res) => {
  await Billing.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Billing deleted",
  });
});

/**
 * START / RESTART FREE TRIAL
 */
export const startFreeTrial = catchAsyncHandler(async (req, res) => {
  const requestedPlanId = String(req.body?.planId || "").trim();
  const plan = requestedPlanId
    ? await PricingPlan.findById(requestedPlanId)
    : await getDefaultPlan();

  if (!plan || !plan.isActive) {
    return res.status(404).json({
      success: false,
      message: "Pricing plan not found",
    });
  }

  const existing = await Billing.findOne({ user: req.user._id });
  if (existing && existing.trialConsumed === true) {
    return res.status(409).json({
      success: false,
      message: "Free trial has already been consumed for this account",
    });
  }

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const billing = await Billing.findOneAndUpdate(
    { user: req.user._id },
    {
      currentPlan: plan._id,
      status: "trialing",
      billingCycle: "monthly",
      trialStartedAt,
      trialEndsAt,
      nextBillingDate: trialEndsAt,
      trialConsumed: false,
      suspendedAt: null,
      suspensionReason: "",
    },
    { upsert: true, new: true },
  ).populate("currentPlan");

  await applyPlanToWorkspace({
    userId: req.user._id,
    planId: plan._id,
    unsuspend: true,
  });

  return res.status(200).json({
    success: true,
    message: "Free trial started successfully",
    data: billing,
  });
});

/**
 * CREATE STRIPE CHECKOUT SESSION
 */
export const createStripeCheckoutSession = catchAsyncHandler(
  async (req, res) => {
    const { planId, paymentMethodType } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const plan = await PricingPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Pricing plan not found",
      });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message:
          "Stripe is not configured. Add STRIPE_SECRET_KEY in server env.",
      });
    }

    const amount = Math.round(Number(plan.priceMonthly || 0) * 100);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan amount",
      });
    }

    const selectedMethod =
      paymentMethodType === "us_bank_account" ? "us_bank_account" : "card";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: [selectedMethod],
      line_items: [
        {
          price: plan.stripePriceId || undefined,
          // Fallback to price_data if no stripePriceId is set (for testing)
          ...(!plan.stripePriceId && {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              recurring: { interval: "month" },
              product_data: {
                name: `${plan.name} Plan`,
                description: "ChatFlex monthly subscription",
              },
            },
          }),
          quantity: 1,
        },
      ],
      metadata: {
        userId: String(req.user._id),
        planId: String(plan._id),
      },
      success_url: `${resolveClientUrl()}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${resolveClientUrl()}/app/billing?checkout=cancel`,
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    });
  },
);

/**
 * CREATE STRIPE CUSTOMER PORTAL SESSION
 */
export const createPortalSession = catchAsyncHandler(async (req, res) => {
  const billing = await Billing.findOne({ user: req.user._id });

  if (!billing || !billing.stripeCustomerId) {
    return res.status(400).json({
      success: false,
      message: "No active Stripe customer found. Please purchase a plan first.",
    });
  }

  const stripe = getStripeClient();
  if (!stripe)
    return res.status(500).json({ success: false, message: "Stripe error" });

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${resolveClientUrl()}/app/billing`,
  });

  res.status(200).json({
    success: true,
    data: { url: session.url },
  });
});

/**
 * STRIPE WEBHOOK HANDLER
 */
export const handleStripeWebhook = catchAsyncHandler(async (req, res) => {
  const stripe = getStripeClient();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !sig || !webhookSecret) {
    console.error("❌ Stripe Webhook Configuration Missing");
    return res.status(400).send("Webhook configuration missing");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Stripe Event Received: ${event.type}`);

  // Handle various event types
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = String(session?.metadata?.userId || "").trim();
      const planId = String(session?.metadata?.planId || "").trim();

      if (userId && planId) {
        await activateBillingAndWorkspace({
          userId,
          planId,
          stripeCustomerId: String(session?.customer || ""),
          stripeSubscriptionId: String(session?.subscription || ""),
          stripeCheckoutSessionId: String(session?.id || ""),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await Billing.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { status: "canceled" },
      );
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const billing = await Billing.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          {
            status: "active",
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            suspendedAt: null,
            suspensionReason: "",
          },
          { new: true },
        ).populate("currentPlan");

        if (billing?.user && billing?.currentPlan?._id) {
          await applyPlanToWorkspace({
            userId: billing.user,
            planId: billing.currentPlan._id,
            unsuspend: true,
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await Billing.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        { status: "past_due" },
      );
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * VERIFY CHECKOUT SESSION + MARK PLAN AS PURCHASED
 */
export const verifyStripeCheckoutSession = catchAsyncHandler(
  async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe error",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const isPaid =
      session.payment_status === "paid" || session.status === "complete";

    let billing = await Billing.findOne({ user: req.user._id }).populate(
      "currentPlan",
    );

    if (isPaid) {
      const metadataPlanId = String(session.metadata?.planId || "");
      const metadataUserId = String(session.metadata?.userId || "");
      const targetUserId =
        metadataUserId && metadataUserId === String(req.user._id)
          ? req.user._id
          : req.user._id;

      if (metadataPlanId) {
        billing = await activateBillingAndWorkspace({
          userId: targetUserId,
          planId: metadataPlanId,
          stripeCustomerId: String(session.customer || ""),
          stripeSubscriptionId: String(session.subscription || ""),
          stripeCheckoutSessionId: String(session.id || ""),
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        paid: isPaid,
        status: session.status,
        billing,
      },
    });
  },
);
