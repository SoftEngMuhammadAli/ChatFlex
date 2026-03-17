import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MailCheck, AlertCircle } from "lucide-react";

import {
  verifyEmail,
  resendVerification,
  selectAuthError,
  selectAuthLoading,
  selectAuthSuccess,
} from "../../features/auth/authSlice";
import AuthShell from "../../components/auth/AuthShell";
import ErrorBox from "../../components/ui/ErrorBox";

const VerifyEmail = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const successMessage = useSelector(selectAuthSuccess);

  const query = new URLSearchParams(location.search);
  const token = query.get("token");
  const email = query.get("email") || "";

  useEffect(() => {
    if (token) {
      dispatch(verifyEmail(token));
    }
  }, [dispatch, token]);

  const handleResend = async () => {
    if (!email) return;
    dispatch(resendVerification(email));
  };

  return (
    <AuthShell
      heroTitle="Verification should be obvious and recoverable."
      heroDescription="Activate the account, resend when needed, and keep the entry flow clear for every device size."
      heroPoints={[
        "Email-based verification with explicit status",
        "Fast retry path when delivery fails",
        "Consistent handoff back into login",
      ]}
      cardTitle="Verify your email"
      cardDescription="Confirm your email address to activate your ChatFlex account."
      footer={
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Go to Login
          </Link>
          <Link to="/register" className="text-slate-500 dark:text-slate-400">
            Back to Register
          </Link>
        </div>
      }
    >
      {!token && (
        <p className="mb-5 rounded-[20px] border border-slate-200/80 bg-white/55 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-300">
          We sent a verification link to your email. Open it from your inbox to activate your account.
        </p>
      )}

      {loading && (
        <p className="mb-5 rounded-[20px] border border-slate-200/80 bg-white/55 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-200">
          Verifying token...
        </p>
      )}

      {successMessage && (
        <p className="mb-5 rounded-[20px] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </p>
      )}

      <ErrorBox error={error} className="mb-5 items-start" />

      {!token && email && (
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="theme-primary-button rounded-[18px] px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Resend verification email
        </button>
      )}

      {token && (
        <div className="rounded-[22px] border border-slate-200/80 bg-white/55 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <MailCheck size={18} className="mt-1 shrink-0 text-primary" />
            <p>The verification request is being processed. If the link has expired, return and request a fresh verification email.</p>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default VerifyEmail;
