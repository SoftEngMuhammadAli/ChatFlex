import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import SuperAdminPricingSection from "../../components/super-admin/SuperAdminPricingSection";
import {
  createStripeCheckoutSession,
  fetchBillingStatus,
  fetchPricingPlans,
  startBillingTrial,
  selectBilling,
  selectBillingLoading,
  selectBillingPlans,
  selectBillingError,
  verifyStripeCheckoutSession,
} from "../../features/billing/billingSlice";
import ErrorBox from "../../components/ui/ErrorBox";

const SuperAdminBillingPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const billing = useSelector(selectBilling);
  const pricingPlans = useSelector(selectBillingPlans);
  const loading = useSelector(selectBillingLoading);
  const billingError = useSelector(selectBillingError);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [step, setStep] = useState("select_plan");
  const [paymentMethodType, setPaymentMethodType] = useState("card");
  const [localError, setLocalError] = useState("");
  const isCheckoutCancelled = searchParams.get("checkout") === "cancel";

  const currentPlanId = billing?.currentPlan?._id || billing?.currentPlan || "";
  const isTrialing = String(billing?.status || "") === "trialing";
  const trialEndsAt = billing?.trialEndsAt
    ? new Date(billing.trialEndsAt).toLocaleDateString()
    : "";
  const canStartTrial = !billing || (!billing?.trialConsumed && !isTrialing);
  const purchasedPlanId =
    billing?.status === "purchased" || billing?.status === "active"
      ? currentPlanId
      : "";
  const selectedPlan = useMemo(
    () =>
      pricingPlans.find(
        (plan) => String(plan._id || plan.id || "") === selectedPlanId,
      ),
    [pricingPlans, selectedPlanId],
  );

  useEffect(() => {
    dispatch(fetchBillingStatus());
    dispatch(fetchPricingPlans());
  }, [dispatch]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout !== "success" || !sessionId) return;

    dispatch(verifyStripeCheckoutSession(sessionId))
      .unwrap()
      .then((result) => {
        if (result?.paid) {
          setStep("select_plan");
          setSelectedPlanId("");
          setLocalError("");
          dispatch(fetchBillingStatus());
        } else {
          setLocalError("Payment is not completed yet.");
        }
      })
      .catch((errorMessage) => {
        setLocalError(errorMessage || "Unable to verify payment.");
      })
      .finally(() => {
        searchParams.delete("checkout");
        searchParams.delete("session_id");
        setSearchParams(searchParams, { replace: true });
      });
  }, [dispatch, searchParams, setSearchParams]);

  const handleRefresh = () => {
    dispatch(fetchBillingStatus());
    dispatch(fetchPricingPlans());
  };

  const handleSelectPlan = (plan) => {
    const planId = String(plan?._id || plan?.id || "");
    if (!planId) return;
    setSelectedPlanId(planId);
    setStep("payment_method");
    setLocalError("");
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlanId) {
      setLocalError("Please select a package first.");
      return;
    }

    try {
      const payload = await dispatch(
        createStripeCheckoutSession({
          planId: selectedPlanId,
          paymentMethodType,
        }),
      ).unwrap();

      const checkoutUrl = payload?.checkoutUrl;
      if (!checkoutUrl) {
        setLocalError("Checkout URL is missing.");
        return;
      }
      window.location.href = checkoutUrl;
    } catch (errorMessage) {
      setLocalError(errorMessage || "Failed to start checkout.");
    }
  };

  return (
    <div className="theme-page animate-in fade-in duration-500 pb-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {billing?.status || "No Plan"}
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <SuperAdminPricingSection
        pricingStatus={billing?.status || "No active subscription"}
        pricingPlans={pricingPlans}
        currentPlanId={currentPlanId}
        selectedPlanId={selectedPlanId}
        purchasedPlanId={purchasedPlanId}
        actionLoading={loading}
        onSelectPlan={handleSelectPlan}
      />
      <section className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isTrialing
                ? `Free trial active${trialEndsAt ? ` until ${trialEndsAt}` : ""}`
                : billing?.trialConsumed
                  ? "Free trial already used"
                  : "You can start a free trial before subscribing"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(startBillingTrial(selectedPlanId || undefined))}
            disabled={loading || !canStartTrial}
            className="rounded-xl border border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 disabled:opacity-50"
          >
            Start Free Trial
          </button>
        </div>
      </section>
      {step === "payment_method" ? (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Payment Method
            </h3>
            <button
              type="button"
              onClick={() => setStep("select_plan")}
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Back to Packages
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/70">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Selected Package:{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {selectedPlan?.name || "N/A"}
              </span>{" "}
              ({selectedPlan ? `$${selectedPlan.priceMonthly}/month` : ""})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: "card",
                label: "Card",
                description: "Visa, Mastercard, Amex via Stripe Checkout",
              },
              {
                id: "us_bank_account",
                label: "US Bank Account",
                description: "Pay with linked US bank account",
              },
            ].map((method) => {
              const isActive = paymentMethodType === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethodType(method.id)}
                  className={`text-left rounded-2xl border p-4 transition ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {method.label}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {method.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? "Processing..." : "Confirm & Pay"}
            </button>
          </div>
        </section>
      ) : null}
      <ErrorBox error={billingError} className="mt-4" />
      <ErrorBox error={localError} className="mt-4" />
      {isCheckoutCancelled ? (
        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
          Payment was cancelled. You can try again.
        </p>
      ) : null}
    </div>
  );
};

export default SuperAdminBillingPage;

