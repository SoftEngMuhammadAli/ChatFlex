import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import {
  login,
  resendVerification,
  selectAuthError,
  selectAuthLoading,
  selectInvitationRequired,
  selectVerificationRequired,
  selectAuthSuccess,
} from "../../features/auth/authSlice";

import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import GitHubAuthButton from "../../components/auth/GitHubAuthButton";
import { githubOAuthCodeLogin } from "../../features/auth/oAuthSlice";
import AuthShell from "../../components/auth/AuthShell";
import CustomLoader from "../../components/ui/Loader";
import ErrorBox from "../../components/ui/ErrorBox";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const invitationRequired = useSelector(selectInvitationRequired);
  const verificationRequired = useSelector(selectVerificationRequired);
  const successMessage = useSelector(selectAuthSuccess);

  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = String(params.get("code") || "").trim();
    if (!code) return;

    const runGitHubCallback = async () => {
      try {
        await dispatch(githubOAuthCodeLogin(code)).unwrap();
        window.history.replaceState({}, document.title, "/login");
        navigate("/");
      } catch (error) {
        console.error("GitHub login failed:", error);
      }
    };

    runGitHubCallback();
  }, [dispatch, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await dispatch(login(formData));

    if (result.meta.requestStatus === "fulfilled") {
      navigate("/");
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) return;
    await dispatch(resendVerification(formData.email));
  };

  return (
    <AuthShell
      heroTitle="Operate support like a control room."
      heroDescription="One workspace for live conversations, team visibility, and the parts of customer support that should never feel fragmented."
      heroPoints={[
        "Live inbox with real-time coordination",
        "Role-aware operations across the workspace",
        "Automation and human support in one surface",
      ]}
      cardTitle="Welcome back"
      cardDescription="Sign in to enter your workspace, monitor conversations, and keep the team in sync."
      footer={
        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?
          <Link
            to="/register"
            className="ml-1 font-bold text-primary hover:underline"
          >
            Create account
          </Link>
        </p>
      }
    >
      <ErrorBox error={error} className="mb-5" />

      {successMessage && (
        <div className="mb-5 flex items-center gap-3 rounded-[20px] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <ShieldCheck size={18} />
          {successMessage}
        </div>
      )}

      {verificationRequired && (
        <div className="mb-5 rounded-[20px] border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-300/18 dark:bg-amber-500/10 dark:text-amber-200">
          <p>Email verification is required before login.</p>
          <button
            type="button"
            onClick={handleResendVerification}
            className="mt-2 text-xs font-bold underline underline-offset-4"
          >
            Resend verification email
          </button>
        </div>
      )}

      {invitationRequired && (
        <div className="mb-5 rounded-[20px] border border-sky-200/70 bg-sky-50/90 px-4 py-3 text-sm font-semibold text-sky-800 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-200">
          <p>
            Team invitation is pending. Open your invitation email and accept the
            invite link first.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="theme-auth-input py-3.5 pl-11 pr-4 text-sm outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className="theme-auth-input py-3.5 pl-11 pr-12 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="theme-primary-button flex w-full items-center justify-center gap-2 rounded-[18px] px-4 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <CustomLoader iconOnly={true} className="h-5 w-5 border-2 border-white/35 border-t-white" />
          ) : (

            <>
              Sign In
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-slate-300/70 dark:bg-slate-700/80" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Alternative access
          </span>
          <div className="h-px flex-1 bg-slate-300/70 dark:bg-slate-700/80" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <GoogleAuthButton />
          <GitHubAuthButton />
        </div>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
