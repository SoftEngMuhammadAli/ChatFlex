import mongoose from "mongoose";

const limitsSchema = new mongoose.Schema(
  {
    websites: {
      // number | "unlimited"
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    agentSeats: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    conversationsPerMonth: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    aiTokens: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
);

const pricingPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    priceMonthly: {
      type: Number,
      required: true,
      min: 0,
    },
    limits: {
      type: limitsSchema,
      required: true,
    },
    features: {
      type: [String],
      default: [],
    },
    phase: {
      type: String,
      enum: ["phase_1", "phase_2"],
      default: "phase_1",
    },
    stripePriceId: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const PricingPlan = mongoose.model("PricingPlan", pricingPlanSchema);
