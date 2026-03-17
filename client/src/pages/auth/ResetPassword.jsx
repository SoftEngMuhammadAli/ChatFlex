import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, LockKeyhole } from "lucide-react";
import {
  resetPassword,
  selectAuthError,
  selectAuthLoading,
  selectAuthSuccess,
} from "../../features/auth/authSlice";
import AuthShell from "../../components/auth/AuthShell";
import ErrorBox from "../../components/ui/ErrorBox";

const ResetPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const successMessage = useSelector(selectAuthSuccess);

  const [newPassword, setNewPassword] = useState("");

  const token = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("token") || "";
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await dispatch(resetPassword({ token, newPassword }));

    if (result.meta.requestStatus === "fulfilled") {
      navigate("/login");
    }
  };

  return (
    <AuthShell
      heroTitle="Reset access without breaking momentum."
      heroDescription="Choose a new password and return to the workspace with the same support context intact."
      heroPoints={[
        "Short recovery path with explicit validation",
        "Secure token-based reset flow",
        "Responsive handoff back to login",
      ]}
      cardTitle="Reset password"
      cardDescription="Set a new password to restore access to your workspace."
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
      {!token && (
        <p className="mb-5 rounded-[20px] border border-red-200/70 bg-red-50/85 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-400/18 dark:bg-red-500/10 dark:text-red-300">
          Missing reset token. Request a new password reset link.
        </p>
      )}

      <ErrorBox error={error} className="mb-5" />

      {successMessage && (
        <p className="mb-5 rounded-[20px] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            New Password
          </label>
          <div className="relative">
            <LockKeyhole
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="password"
              className="theme-auth-input py-3.5 pl-11 pr-4 text-sm outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={6}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="theme-primary-button flex w-full items-center justify-center gap-2 rounded-[18px] px-4 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset Password"}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
