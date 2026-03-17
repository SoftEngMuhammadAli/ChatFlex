import { Usage, Workspace } from "../models/index.js";
import { Billing } from "../models/billing.model.js";

const DEFAULT_LIMITS = {
  conversationsPerMonth: 50000,
  aiTokens: 5000000,
};

const getUsageForRequest = async (req) =>
  Usage.findOneAndUpdate(
    req.user?.workspaceId
      ? { workspaceId: req.user.workspaceId }
      : { userId: req.user._id },
    {
      $setOnInsert: req.user?.workspaceId
        ? { workspaceId: req.user.workspaceId, scope: "workspace" }
        : { userId: req.user._id, scope: "user" },
    },
    { upsert: true, new: true },
  );

const getLimits = async (req) => {
  const billing = await Billing.findOne({ user: req.user._id }).populate(
    "currentPlan",
  );

  const activeStatuses = new Set(["active", "purchased", "trialing"]);
  const planLimits = billing?.currentPlan?.limits;
  if (planLimits && activeStatuses.has(String(billing?.status || ""))) {
    return {
      conversationsPerMonth: Number(
        planLimits.conversationsPerMonth ||
          DEFAULT_LIMITS.conversationsPerMonth,
      ),
      aiTokens: Number(planLimits.aiTokens || DEFAULT_LIMITS.aiTokens),
    };
  }

  const workspaceId = String(req.user?.workspaceId || "").trim();
  if (workspaceId) {
    const workspace = await Workspace.findById(workspaceId).select("limits");
    const workspaceLimits = workspace?.limits || {};
    return {
      conversationsPerMonth: Number(
        workspaceLimits.conversationsPerMonth ||
          DEFAULT_LIMITS.conversationsPerMonth,
      ),
      aiTokens: Number(workspaceLimits.aiTokens || DEFAULT_LIMITS.aiTokens),
    };
  }

  return DEFAULT_LIMITS;
};

const suspendWorkspaceAndBilling = async (req, reason) => {
  const workspaceId = String(req.user?.workspaceId || "").trim();
  if (workspaceId) {
    await Workspace.findByIdAndUpdate(workspaceId, {
      status: "suspended",
      suspension: {
        isSuspended: true,
        reason: String(reason || "").trim(),
        suspendedAt: new Date(),
        suspendedBy: req.user?._id || null,
      },
    });
  }

  await Billing.findOneAndUpdate(
    { user: req.user?._id },
    {
      status: "suspended",
      suspendedAt: new Date(),
      suspensionReason: String(reason || "").trim(),
    },
  );
};

export const checkPlanLimits = (type) => {
  return async (req, res, next) => {
    if (String(req.user?.role || "") === "super-admin") {
      return next();
    }

    const usage = await getUsageForRequest(req);
    const limits = await getLimits(req);

    if (
      type === "conversation" &&
      usage.conversationsThisMonth >= limits.conversationsPerMonth
    ) {
      const reason = `Conversation limit reached (${limits.conversationsPerMonth}/month)`;
      await suspendWorkspaceAndBilling(req, reason);
      return res.status(403).json({
        message: `${reason}. Workspace has been suspended until plan upgrade.`,
        workspaceSuspended: true,
      });
    }

    if (type === "ai" && usage.aiTokensUsed >= limits.aiTokens) {
      const reason = `AI token limit reached (${limits.aiTokens}/month)`;
      await suspendWorkspaceAndBilling(req, reason);
      return res.status(403).json({
        message: `${reason}. Workspace has been suspended until plan upgrade.`,
        workspaceSuspended: true,
      });
    }

    next();
  };
};
