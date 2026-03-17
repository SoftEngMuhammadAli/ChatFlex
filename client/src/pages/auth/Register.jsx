import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import {
  register,
  selectAuthError,
  selectAuthLoading,
  selectAuthSuccess,
  selectVerificationRequired,
} from "../../features/auth/authSlice";
import AuthShell from "../../components/auth/AuthShell";
import CustomLoader from "../../components/ui/Loader";
import ErrorBox from "../../components/ui/ErrorBox";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const successMessage = useSelector(selectAuthSuccess);
  const verificationRequired = useSelector(selectVerificationRequired);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await dispatch(register(formData));

    if (result.meta.requestStatus === "fulfilled") {
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    }
  };

  return (
    <AuthShell
      heroTitle="Build a support workspace with its own point of view."
      heroDescription="Create your account, launch a sharper operation, and move conversations, automation, and team visibility into one responsive system."
      heroPoints={[
        "Distinct workspace design and behavior",
        "Role-based access for growing teams",
        "AI-assisted support without losing control",
      ]}
      cardTitle="Create account"
      cardDescription="Set up your account and start shaping a faster, more deliberate customer support workflow."
      footer={
        <div className="text-center">
          {verificationRequired && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Verification pending. Check your inbox.
            </p>
          )}
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Already have an account?
            <Link
              to="/login"
              className="ml-1 font-bold text-primary hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      }
    >
      <ErrorBox error={error} className="mb-5" />

      {successMessage && (
        <div className="mb-5 flex items-center gap-3 rounded-[20px] border border-emerald-200/70 bg-emerald-50/85 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <ShieldCheck size={18} />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <div className="relative">
            <User
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              className="theme-auth-input py-3.5 pl-11 pr-4 text-sm outline-none"
            />
          </div>
        </div>

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
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create a secure password"
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
              Create Account
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="rounded-[22px] border border-slate-200/70 bg-white/45 px-4 py-4 text-xs leading-6 text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-300">
          <p className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
            Account creation keeps your workspace ready for verification and immediate setup.
          </p>
        </div>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
