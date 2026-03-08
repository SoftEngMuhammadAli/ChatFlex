const Stripe = require("stripe");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Subscription = require("../models/Subscription");

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const plans = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 9,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
    limits: { conversationsPerMonth: 500, aiTokensPerMonth: 100000, agentSeats: 1, knowledgeSources: 20 }
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_TEAM || "",
    limits: { conversationsPerMonth: 5000, aiTokensPerMonth: 1000000, agentSeats: 5, knowledgeSources: 100 }
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    limits: { conversationsPerMonth: 20000, aiTokensPerMonth: 5000000, agentSeats: 9999, knowledgeSources: 500 }
  }
];

const priceToPlan = new Map(
  plans
    .filter((plan) => plan.stripePriceId)
    .map((plan) => [plan.stripePriceId, plan.id])
);

const normalizeStripeStatus = (status) => {
  const allowed = new Set(["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"]);
  return allowed.has(status) ? status : "none";
};

const resolvePlanFromPriceId = (priceId) => {
  return priceToPlan.get(priceId) || "starter";
};

const getPlans = async (_req, res) => {
  return res.json(plans);
};

const getUsage = async (req, res, next) => {
  try {
    const workspaceId = req.user.workspaceId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [workspace, subscription, conversationsUsed, seatsUsed] = await Promise.all([
      Workspace.findById(workspaceId),
      Subscription.findOne({ workspaceId }),
      Conversation.countDocuments({
        workspaceId,
        createdAt: { $gte: monthStart, $lt: monthEnd }
      }),
      User.countDocuments({
        workspaceId,
        role: { $in: ["owner", "admin", "agent"] },
        status: { $ne: "suspended" }
      })
    ]);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    return res.json({
      plan: subscription?.plan || workspace.plan,
      subscription: {
        status: subscription?.status || "none",
        stripeCustomerId: subscription?.stripeCustomerId || null,
        stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
        currentPeriodEnd: subscription?.currentPeriodEnd || null
      },
      conversations: {
        used: conversationsUsed,
        limit: workspace.limits.conversationsPerMonth
      },
      seats: {
        used: seatsUsed,
        limit: workspace.limits.agentSeats
      },
      aiTokens: {
        used: 0,
        limit: workspace.limits.aiTokensPerMonth
      },
      knowledgeSources: {
        used: 0,
        limit: workspace.limits.knowledgeSources
      }
    });
  } catch (error) {
    return next(error);
  }
};

const createCheckoutSession = async (req, res, next) => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ message: "priceId is required" });
    }

    if (!stripe) {
      return res.status(501).json({ message: "Stripe is not configured" });
    }

    const workspace = await Workspace.findById(req.user.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const owner = await User.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    let existingSubscription = await Subscription.findOne({
      workspaceId: req.user.workspaceId
    });

    let customerId = existingSubscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: owner.email,
        name: workspace.name,
        metadata: {
          workspaceId: String(workspace._id),
          workspaceSlug: workspace.slug
        }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/billing/success`,
      cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
      metadata: {
        workspaceId: String(workspace._id),
        selectedPriceId: priceId
      }
    });

    if (!existingSubscription) {
      existingSubscription = await Subscription.create({
        workspaceId: workspace._id,
        stripeCustomerId: customerId,
        plan: resolvePlanFromPriceId(priceId),
        status: "incomplete"
      });
    } else if (!existingSubscription.stripeCustomerId) {
      existingSubscription.stripeCustomerId = customerId;
      existingSubscription.plan = resolvePlanFromPriceId(priceId);
      existingSubscription.status = "incomplete";
      await existingSubscription.save();
    }

    return res.status(201).json({ url: session.url });
  } catch (error) {
    return next(error);
  }
};

const syncSubscriptionFromStripe = async (subscription) => {
  const workspaceId = subscription.metadata?.workspaceId;
  if (!workspaceId) {
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan = resolvePlanFromPriceId(priceId);
  const status = normalizeStripeStatus(subscription.status);

  await Subscription.findOneAndUpdate(
    { workspaceId },
    {
      workspaceId,
      stripeCustomerId: subscription.customer || null,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null
    },
    { upsert: true, new: true }
  );

  const planConfig = plans.find((item) => item.id === plan);
  if (planConfig) {
    await Workspace.findByIdAndUpdate(workspaceId, {
      $set: {
        plan,
        limits: planConfig.limits
      }
    });
  }
};

const stripeWebhook = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(501).json({ message: "Stripe is not configured" });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ message: "Missing stripe webhook signature configuration" });
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscriptionFromStripe(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionFromStripe(event.data.object);
        break;
      }
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPlans,
  getUsage,
  createCheckoutSession,
  stripeWebhook
};
