import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { MailCheck, ShieldCheck } from "lucide-react";
import axiosInstance from "../../api/axios";
import AuthShell from "../../components/auth/AuthShell";
import ErrorBox from "../../components/ui/ErrorBox";
import { setAuthSession } from "../../features/auth/authSlice";

const AcceptTeamInvite = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const token = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return String(query.get("token") || "").trim();
  }, [location.search]);

  const [loading, setLoading] = useState(Boolean(token));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteDetails, setInviteDetails] = useState(null);
  const [form, setForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setLoading(false);
        setError("Invitation token is missing.");
        return;
      }

      try {
        const { data } = await axiosInstance.get("/auth/team-invite/details", {
          params: { token },
        });
        const details = data?.data || null;
        setInviteDetails(details);
        setForm((prev) => ({
          ...prev,
          name: String(details?.name || ""),
        }));
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Invalid or expired invitation link. Please request a new invite.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !inviteDetails) return;

    const trimmedName = String(form.name || "")
      .trim()
      .replace(/\s+/g, " ");
    const requiresPasswordSetup = Boolean(inviteDetails.requiresPasswordSetup);

    if (requiresPasswordSetup) {
      if (!form.password || form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setError("");
    setSubmitting(true);

    try {
      const payload = {
        token,
        ...(trimmedName ? { name: trimmedName } : {}),
        ...(requiresPasswordSetup ? { password: form.password } : {}),
      };

      const { data } = await axiosInstance.post("/auth/team-invite/accept", payload);
      const sessionToken = String(data?.token || "").trim();
      const sessionUser = data?.user || null;

      if (sessionToken || sessionUser) {
        dispatch(
          setAuthSession({
            token: sessionToken,
            user: sessionUser,
          }),
        );
      }

      setSuccess(data?.message || "Invitation accepted successfully.");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 700);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to accept invitation. Please request a new invite.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requiresPasswordSetup = Boolean(inviteDetails?.requiresPasswordSetup);

  return (
    <AuthShell
      heroTitle="Team onboarding should feel intentional."
      heroDescription="Accept invitations, provision access, and drop people into the right workspace without making the first step feel generic."
      heroPoints={[
        "Workspace-aware invitation acceptance",
        "Optional password setup for first-time access",
        "Fast redirect into the product after success",
      ]}
      cardTitle="Team invitation"
      cardDescription="Review the invitation details and join the workspace."
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
      {loading && (
        <p className="mb-5 rounded-[20px] border border-slate-200/80 bg-white/55 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-200">
          Loading invitation details...
        </p>
      )}

      {!loading && inviteDetails && (
        <div className="mb-6 rounded-[24px] border border-slate-200/80 bg-white/55 p-4 text-sm leading-7 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-300">
          <p>
            <span className="font-semibold">Workspace:</span>{" "}
            {inviteDetails.workspaceName || "Workspace"}
          </p>
          <p>
            <span className="font-semibold">Role:</span>{" "}
            {String(inviteDetails.role || "member").toUpperCase()}
          </p>
          <p>
            <span className="font-semibold">Email:</span>{" "}
            {inviteDetails.email || "-"}
          </p>
        </div>
      )}

      {!loading && success && (
        <div className="mb-6 flex items-center gap-3 rounded-[20px] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <ShieldCheck size={18} />
          {success} Redirecting...
        </div>
      )}

      {!loading && (
        <ErrorBox error={error} className="mb-6 items-start" />
      )}

      {!loading && inviteDetails && !success && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
              className="theme-auth-input px-4 py-3.5 text-sm outline-none"
            />
          </div>

          {requiresPasswordSetup && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Create Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  className="theme-auth-input px-4 py-3.5 text-sm outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  minLength={6}
                  required
                  className="theme-auth-input px-4 py-3.5 text-sm outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="theme-primary-button w-full rounded-[18px] px-4 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Accepting invitation..."
              : requiresPasswordSetup
                ? "Create Account & Join Workspace"
                : "Accept Invitation & Sign In"}
          </button>
        </form>
      )}

      {!loading && !inviteDetails && !error && (
        <div className="rounded-[22px] border border-slate-200/80 bg-white/55 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <MailCheck size={18} className="mt-1 shrink-0 text-primary" />
            <p>This invitation could not be resolved yet. Check the token and try again.</p>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default AcceptTeamInvite;
