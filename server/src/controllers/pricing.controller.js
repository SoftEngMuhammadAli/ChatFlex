import { PricingPlan } from "../models/pricingPlan.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";

const PHASE_ONE_DEFAULT_PLANS = [
  {
    name: "Starter",
    priceMonthly: 9,
    phase: "phase_1",
    limits: {
      websites: 1,
      agentSeats: 1,
      conversationsPerMonth: 500,
      aiTokens: 100000,
    },
    features: ["FAQ support"],
    isActive: true,
  },
  {
    name: "Team",
    priceMonthly: 49,
    phase: "phase_1",
    limits: {
      websites: 1,
      agentSeats: 5,
      conversationsPerMonth: 5000,
      aiTokens: 1000000,
    },
    features: ["Hybrid AI", "Analytics", "Automation rules"],
    isActive: true,
  },
  {
    name: "Pro",
    priceMonthly: 99,
    phase: "phase_1",
    limits: {
      websites: "unlimited",
      agentSeats: "unlimited",
      conversationsPerMonth: 25000,
      aiTokens: 5000000,
    },
    features: ["Multi-channel", "Advanced analytics", "SLA rules"],
    isActive: true,
  },
];

const ensurePhaseOnePlans = async () => {
  const existingCount = await PricingPlan.countDocuments({ isActive: true });
  if (existingCount > 0) return;
  await PricingPlan.insertMany(PHASE_ONE_DEFAULT_PLANS);
};

/**
 * CREATE PLAN
 */
export const createPricingPlan = catchAsyncHandler(async (req, res) => {
  const plan = await PricingPlan.create(req.body);

  if (!plan) {
    return res.status(400).json({
      success: false,
      message: "Failed to create pricing plan",
    });
  }

  return res.status(201).json({
    success: true,
    message: "Pricing plan created successfully",
    data: plan,
  });
});

/**
 * GET ALL PLANS
 */
export const getPricingPlans = catchAsyncHandler(async (_req, res) => {
  await ensurePhaseOnePlans();
  const plans = await PricingPlan.find({ isActive: true });

  if (!plans) {
    return res.status(404).json({
      success: false,
      message: "Pricing plans not found",
    });
  }

  return res.status(200).json({
    success: true,
    count: plans.length,
    data: plans,
  });
});

/**
 * GET SINGLE PLAN
 */
export const getPricingPlanById = catchAsyncHandler(async (req, res) => {
  const plan = await PricingPlan.findById(req.params.id);

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Pricing plan not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: plan,
  });
});

/**
 * UPDATE PLAN
 */
export const updatePricingPlan = catchAsyncHandler(async (req, res) => {
  const plan = await PricingPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Pricing plan not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Pricing plan updated",
    data: plan,
  });
});

/**
 * DELETE PLAN (Soft delete)
 */
export const deletePricingPlan = catchAsyncHandler(async (req, res) => {
  const plan = await PricingPlan.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Pricing plan not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Pricing plan deactivated",
  });
});
