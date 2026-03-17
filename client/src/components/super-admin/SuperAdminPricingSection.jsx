import React from "react";
import { Crown } from "lucide-react";

const SuperAdminPricingSectionV2 = ({
  pricingStatus,
  pricingPlans,
  currentPlanId = "",
  actionLoading = false,
  selectedPlanId = "",
  purchasedPlanId = "",
  onSelectPlan,
}) => {
  const formatLimit = (value) =>
    value === "unlimited" ? "Unlimited" : String(value ?? "");
  const gridColsClass =
    pricingPlans.length >= 4
      ? "lg:grid-cols-4"
      : pricingPlans.length === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-2";

  return (
    <section className="theme-pricing-shell relative rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Pricing Service
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {pricingStatus}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Crown size={16} className="text-amber-500" />
          Realtime Billing View
        </div>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6 items-stretch`}
      >
        {pricingPlans.length > 0 ? (
          pricingPlans.map((plan, index) => {
            const planId = String(plan._id || plan.id || "");
            const isFeatured = index === 1;
            const isCurrentPlan = String(currentPlanId) === planId;
            const isSelected = String(selectedPlanId) === planId;
            const isPurchased = String(purchasedPlanId) === planId;

            return (
              <div
                key={planId}
                className={`
                  group relative rounded-2xl border p-6 transition-all duration-300 h-full flex flex-col
                  bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1
                  ${
                    isCurrentPlan
                      ? "border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-500/20"
                      : isFeatured
                        ? "border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800"
                  }
                `}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-4 px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {plan.name}
                </h3>

                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    /month
                  </span>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />

                <ul className="mt-1 space-y-2 text-sm text-slate-600 dark:text-slate-300 flex-1">
                  {(Array.isArray(plan.features) && plan.features.length > 0
                    ? plan.features
                    : [
                        `${formatLimit(plan?.limits?.agentSeats)} agent seats`,
                        `${formatLimit(plan?.limits?.conversationsPerMonth)} chats/mo`,
                        `${formatLimit(plan?.limits?.aiTokens)} AI tokens`,
                      ]
                  ).map((feature) => (
                    <li key={`${planId}-${feature}`} className="leading-6">
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-1">
                  {isCurrentPlan || isPurchased ? (
                    <span
                      className={`inline-flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold ${
                        isPurchased
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      }`}
                    >
                      {isPurchased ? "Purchased" : "Current Plan"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onSelectPlan && onSelectPlan(plan)}
                      className={`w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                      } disabled:opacity-60`}
                    >
                      {actionLoading
                        ? "Processing..."
                        : isSelected
                          ? "Selected"
                          : "Select Package"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Pricing plans not available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default SuperAdminPricingSectionV2;
