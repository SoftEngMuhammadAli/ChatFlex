import mongoose from "mongoose";

const billingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricingPlan",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "pending_payment",
        "purchased",
        "suspended",
      ],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly"],
      default: "monthly",
    },
    stripeCustomerId: {
      type: String,
      default: "",
    },
    stripeSubscriptionId: {
      type: String,
      default: "",
    },
    stripeCheckoutSessionId: {
      type: String,
      default: "",
    },
    purchasedAt: {
      type: Date,
      default: null,
    },
    trialStartedAt: {
      type: Date,
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    trialConsumed: {
      type: Boolean,
      default: false,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: "",
    },
    nextBillingDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const Billing = mongoose.model("Billing", billingSchema);
