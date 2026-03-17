import React, { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  exportAnalyticsCsv,
  fetchAnalyticsSummary,
  fetchAnalyticsTimeSeries,
  selectAnalyticsCsvExportLoading,
  selectAnalyticsError,
  selectAnalyticsLoading,
  selectAnalyticsPoints,
  selectAnalyticsSummary,
} from "../../features/analytics/analyticsSlice";

const METRIC_CARDS = [
  { key: "totalUsers", label: "Total Users" },
  { key: "activeUsers", label: "Active Users" },
  { key: "totalConversations", label: "Conversations" },
  { key: "totalMessages", label: "Messages" },
  { key: "firstResponseTimeSeconds", label: "First Response (s)" },
  { key: "resolutionTimeSeconds", label: "Resolution Time (s)" },
  { key: "peakHourUtc", label: "Peak Hour (UTC)" },
  { key: "aiDeflectionRate", label: "AI Deflection %" },
  { key: "csatAverage", label: "CSAT Avg" },
  { key: "leadConversionRate", label: "Lead Conversion %" },
];

const LIVE_REFRESH_MS = 10000;

const SuperAdminAnalyticsPage = () => {
  const dispatch = useDispatch();
  const summary = useSelector(selectAnalyticsSummary);
  const points = useSelector(selectAnalyticsPoints);
  const loading = useSelector(selectAnalyticsLoading);
  const csvExportLoading = useSelector(selectAnalyticsCsvExportLoading);
  const error = useSelector(selectAnalyticsError);

  const [days, setDays] = useState(14);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = useMemo(() => {
    const params = { days };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [days, startDate, endDate]);

  useEffect(() => {
    dispatch(fetchAnalyticsSummary(queryParams));
    dispatch(fetchAnalyticsTimeSeries(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      dispatch(fetchAnalyticsSummary(queryParams));
      dispatch(fetchAnalyticsTimeSeries(queryParams));
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [dispatch, queryParams]);

  const handleRefresh = () => {
    dispatch(fetchAnalyticsSummary(queryParams));
    dispatch(fetchAnalyticsTimeSeries(queryParams));
  };

  const handleExport = async () => {
    const csv = await dispatch(exportAnalyticsCsv(queryParams)).unwrap();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "analytics-timeseries.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="theme-page animate-in fade-in duration-500 pb-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
            loading
              ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              loading ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          {loading ? "Loading" : "Ready"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={csvExportLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            <Download size={16} />
            {csvExportLoading ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value || 14))}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        {METRIC_CARDS.map((card) => (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">
              {Number(summary?.[card.key] || 0).toLocaleString()}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Agent Performance
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar smart-x-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Agent
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Messages
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Resolved
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Avg First Response (s)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Avg Resolution (s)
                </th>
              </tr>
            </thead>
            <tbody>
              {(summary?.agentPerformance || []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    No agent performance data available yet.
                  </td>
                </tr>
              ) : (
                (summary?.agentPerformance || []).map((agent) => (
                  <tr
                    key={agent.agentId}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {agent.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(agent.totalMessages || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(agent.resolvedConversations || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(agent.avgFirstResponseSeconds || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(agent.avgResolutionSeconds || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Time Series
          </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar smart-x-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Conversations
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Resolved
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Messages
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  AI Messages
                </th>
              </tr>
            </thead>
            <tbody>
              {(points || []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    No data points in selected range.
                  </td>
                </tr>
              ) : (
                (points || []).map((point) => (
                  <tr
                    key={point.date}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {point.date}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(point.conversations || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(point.resolvedConversations || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(point.messages || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {Number(point.aiMessages || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminAnalyticsPage;
