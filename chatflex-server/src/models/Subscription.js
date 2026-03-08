const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true
    },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    stripePriceId: { type: String, default: null },
    plan: { type: String, enum: ["starter", "team", "pro", "enterprise"], default: "starter" },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "canceled", "incomplete", "unpaid", "none"],
      default: "none"
    },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
