import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCcw, ShieldAlert, UserRoundCog } from "lucide-react";

import HeroSection from "../../components/super-admin/dashboard/HeroSection";
import StatsGrid from "../../components/super-admin/dashboard/StatsGrid";
import ErrorToast from "../../components/super-admin/dashboard/ErrorToast";

import {
  fetchBillingStatus,
  fetchPricingPlans,
} from "../../features/billing/billingSlice";

import {
  fetchAnalyticsSummary,
  fetchAnalyticsTimeSeries,
  selectAnalyticsSummary,
  selectAnalyticsError,
} from "../../features/analytics/analyticsSlice";

import {
  fetchGlobalModelConfig,
  fetchSuperAdminWorkspaces,
  scanWorkspaceAbuse,
  selectGlobalModelConfig,
  selectGlobalModelError,
  selectGlobalModelLoading,
  selectGlobalModelSaving,
  selectImpersonationError,
  selectImpersonationLoading,
  selectSuperAdminWorkspaceActionLoading,
  selectSuperAdminWorkspaceError,
  selectSuperAdminWorkspaceLoading,
  selectSuperAdminWorkspaceMeta,
  selectSuperAdminWorkspaces,
  startWorkspaceImpersonation,
  updateGlobalModelConfig,
  updateWorkspaceSuspension,
} from "../../features/superAdmin/superAdminSlice";

const LIVE_REFRESH_MS = 10000;

const WorkspaceStatusBadge = ({ status }) => {
  const normalized = String(status || "active").toLowerCase();
  const suspended = normalized === "suspended";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        suspended
          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
          : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          suspended ? "bg-rose-500" : "bg-emerald-500"
        }`}
      />
      {suspended ? "Suspended" : "Active"}
    </span>
  );
};

const SuperAdminHomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const summary = useSelector(selectAnalyticsSummary);
  const analyticsError = useSelector(selectAnalyticsError);

  const workspaceRows = useSelector(selectSuperAdminWorkspaces);
  const workspaceMeta = useSelector(selectSuperAdminWorkspaceMeta);
  const workspaceLoading = useSelector(selectSuperAdminWorkspaceLoading);
  const workspaceActionLoading = useSelector(selectSuperAdminWorkspaceActionLoading);
  const workspaceError = useSelector(selectSuperAdminWorkspaceError);

  const modelConfig = useSelector(selectGlobalModelConfig);
  const modelLoading = useSelector(selectGlobalModelLoading);
  const modelSaving = useSelector(selectGlobalModelSaving);
  const modelError = useSelector(selectGlobalModelError);

  const impersonationLoading = useSelector(selectImpersonationLoading);
  const impersonationError = useSelector(selectImpersonationError);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const [modelDraft, setModelDraft] = useState({
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 1024,
    systemPrompt: "",
  });

  const workspaceQuery = useMemo(
    () => ({
      page,
      limit: 10,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(flaggedOnly ? { flagged: true } : {}),
    }),
    [page, search, status, flaggedOnly],
  );

  const refreshAll = useCallback(() => {
    dispatch(fetchBillingStatus());
    dispatch(fetchPricingPlans());
    dispatch(fetchAnalyticsSummary());
    dispatch(fetchAnalyticsTimeSeries(7));
    dispatch(fetchSuperAdminWorkspaces(workspaceQuery));
    dispatch(fetchGlobalModelConfig());
  }, [dispatch, workspaceQuery]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      dispatch(fetchAnalyticsSummary());
      dispatch(fetchAnalyticsTimeSeries(7));
      dispatch(fetchSuperAdminWorkspaces(workspaceQuery));
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [dispatch, workspaceQuery]);

  useEffect(() => {
    setModelDraft({
      model: String(modelConfig?.model || "gpt-4o-mini"),
      temperature: Number(modelConfig?.temperature ?? 0.3),
      maxTokens: Number(modelConfig?.maxTokens ?? 1024),
      systemPrompt: String(modelConfig?.systemPrompt || ""),
    });
  }, [modelConfig]);

  const handleScan = async (workspaceId) => {
    await dispatch(scanWorkspaceAbuse(workspaceId));
    dispatch(fetchSuperAdminWorkspaces(workspaceQuery));
  };

  const handleSuspendToggle = async (row) => {
    const isSuspended = String(row?.status || "") === "suspended";
    const nextAction = isSuspended ? "unsuspend" : "suspend";

    const reason =
      nextAction === "suspend"
        ? window.prompt("Suspension reason:", "Policy review") || ""
        : "";

    await dispatch(
      updateWorkspaceSuspension({
        workspaceId: row.workspaceId,
        action: nextAction,
        reason,
      }),
    );
    dispatch(fetchSuperAdminWorkspaces(workspaceQuery));
  };

  const handleImpersonate = async (row) => {
    const reason = window.prompt(
      "Reason for impersonation:",
      "Support investigation",
    );

    const payload = await dispatch(
      startWorkspaceImpersonation({
        workspaceId: row.workspaceId,
        reason: reason || "Support investigation",
      }),
    ).unwrap();

    if (payload?.token && payload?.user) {
      navigate("/app", { replace: true });
    }
  };

  const handleSaveModelConfig = async (event) => {
    event.preventDefault();

    await dispatch(
      updateGlobalModelConfig({
        model: String(modelDraft.model || "gpt-4o-mini").trim(),
        temperature: Number(modelDraft.temperature),
        maxTokens: Number(modelDraft.maxTokens),
        systemPrompt: String(modelDraft.systemPrompt || "").trim(),
      }),
    );
  };

  const pages = Number(workspaceMeta?.pages || 1);

  return (
    <div className="theme-page pb-16 max-w-7xl mx-auto">
      <HeroSection />

      <StatsGrid summary={summary} />

      <ErrorToast message={analyticsError} />
      <ErrorToast message={workspaceError || modelError || impersonationError} />

      <section className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Workspace Monitoring
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Abuse scanning, suspension controls, and secure impersonation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => dispatch(fetchSuperAdminWorkspaces(workspaceQuery))}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            <RefreshCcw size={15} className={workspaceLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search workspace / owner"
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          />

          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setPage(1);
              setFlaggedOnly((prev) => !prev);
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              flaggedOnly
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {flaggedOnly ? "Showing flagged" : "Flagged only"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4">Workspace</th>
                <th className="py-2 pr-4">Owner</th>
                <th className="py-2 pr-4">Usage (30d)</th>
                <th className="py-2 pr-4">Abuse</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspaceRows.length === 0 ? (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={6}>
                    {workspaceLoading ? "Loading workspaces..." : "No workspaces found"}
                  </td>
                </tr>
              ) : (
                workspaceRows.map((row) => (
                  <tr
                    key={row.workspaceId}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.name}
                      </p>
                      <p className="text-xs text-slate-500">Plan: {row.plan}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-slate-900 dark:text-slate-100">
                        {row.owner?.name || "-"}
                      </p>
                      <p className="text-xs text-slate-500">{row.owner?.email || "-"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p>
                        Conversations: {Number(row.conversations?.last30d || 0).toLocaleString()}
                      </p>
                      <p>
                        Messages: {Number(row.messages?.last30d || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">
                        Score: {Number(row.abuseMonitoring?.score || 0)}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {String(row.abuseMonitoring?.level || "low")}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <WorkspaceStatusBadge status={row.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleScan(row.workspaceId)}
                          disabled={workspaceActionLoading}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 disabled:opacity-60"
                        >
                          <AlertTriangle size={12} />
                          Scan
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSuspendToggle(row)}
                          disabled={workspaceActionLoading}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 disabled:opacity-60"
                        >
                          <ShieldAlert size={12} />
                          {String(row.status) === "suspended" ? "Unsuspend" : "Suspend"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleImpersonate(row)}
                          disabled={impersonationLoading}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 disabled:opacity-60"
                        >
                          <UserRoundCog size={12} />
                          Impersonate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            Page {Number(workspaceMeta?.page || 1)} of {pages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              disabled={page >= pages}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
          Global Model Configuration
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Platform-wide default LLM settings used by workspaces.
        </p>

        <form onSubmit={handleSaveModelConfig} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Model
            </label>
            <input
              value={modelDraft.model}
              onChange={(event) =>
                setModelDraft((prev) => ({ ...prev, model: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Temperature
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={modelDraft.temperature}
              onChange={(event) =>
                setModelDraft((prev) => ({ ...prev, temperature: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              min="64"
              max="16384"
              value={modelDraft.maxTokens}
              onChange={(event) =>
                setModelDraft((prev) => ({ ...prev, maxTokens: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              System Prompt
            </label>
            <textarea
              rows={4}
              value={modelDraft.systemPrompt}
              onChange={(event) =>
                setModelDraft((prev) => ({ ...prev, systemPrompt: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={modelLoading || modelSaving}
              className="rounded-xl bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 hover:bg-emerald-800 disabled:opacity-60"
            >
              {modelSaving ? "Saving..." : "Save Global Config"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SuperAdminHomePage;
