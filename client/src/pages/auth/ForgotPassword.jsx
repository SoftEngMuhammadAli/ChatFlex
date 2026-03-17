import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, KeyRound } from "lucide-react";

import {
  forgotPassword,
  selectAuthError,
  selectAuthLoading,
  selectAuthSuccess,
} from "../../features/auth/authSlice";
import AuthShell from "../../components/auth/AuthShell";
import ErrorBox from "../../components/ui/ErrorBox";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const successMessage = useSelector(selectAuthSuccess);

  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
  };

  return (
    <AuthShell
      heroTitle="Recovery should feel controlled, not confusing."
      heroDescription="Send a reset link, restore access, and get your team back into the workspace without friction."
      heroPoints={[
        "Straightforward recovery for workspace accounts",
        "Clear states for email delivery and retry",
        "Responsive access flow across devices",
      ]}
      cardTitle="Forgot password"
      cardDescription="Enter your email address and we’ll send a secure reset link."
      footer={
        <div className="text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Back to Login
          </Link>
        </div>
      }
    >
      <ErrorBox error={error} className="mb-5" />

      {successMessage && (
        <div className="mb-5 rounded-[20px] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <KeyRound
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              className="theme-auth-input py-3.5 pl-11 pr-4 text-sm outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="theme-primary-button flex w-full items-center justify-center gap-2 rounded-[18px] px-4 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Reset Link"}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
