import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { setAuthSession } from "../../features/auth/authSlice";

const useQuery = () => new URLSearchParams(useLocation().search);

const OidcCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const query = useQuery();
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const token = String(query.get("token") || "").trim();
      const returnTo = String(query.get("returnTo") || "").trim();
      if (!token) {
        setError("Missing token from SSO callback");
        return;
      }

      localStorage.setItem("accessToken", token);
      localStorage.setItem("token", token);

      try {
        const { data } = await axiosInstance.get("/users/me");
        const user = data?.data || null;
        dispatch(setAuthSession({ token, user }));
        navigate(returnTo || "/app", { replace: true });
      } catch (err) {
        setError(err?.response?.data?.message || "SSO sign-in failed");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="theme-page flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Completing SSO sign-in…
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {error ? error : "Please wait while we finish signing you in."}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
          >
            Back to login
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default OidcCallback;

