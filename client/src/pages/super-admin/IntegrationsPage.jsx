import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, RefreshCcw, Send, Trash2 } from "lucide-react";
import {
  clearIntegrationMessages,
  createIntegration,
  deleteIntegration,
  fetchIntegrations,
  selectIntegrations,
  selectIntegrationsActionLoading,
  selectIntegrationsError,
  selectIntegrationsLoading,
  selectIntegrationsSuccess,
  selectIntegrationTestResultMap,
  testIntegration,
  updateIntegration,
} from "../../features/integrations/integrationSlice";

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const IntegrationsPage = () => {
  const dispatch = useDispatch();
  const items = useSelector(selectIntegrations);
  const loading = useSelector(selectIntegrationsLoading);
  const actionLoading = useSelector(selectIntegrationsActionLoading);
  const error = useSelector(selectIntegrationsError);
  const successMessage = useSelector(selectIntegrationsSuccess);
  const testResultsById = useSelector(selectIntegrationTestResultMap);

  const [form, setForm] = useState({
    name: "",
    type: "generic-webhook",
    endpointUrl: "",
    eventsCsv: "new_message,conversation_resolved,lead_converted",
    secret: "",
    token: "",
    phoneNumberId: "",
    pageId: "",
    department: "",
    zendeskSubdomain: "",
    zendeskEmail: "",
  });
  const [localError, setLocalError] = useState("");
  const [testEventById, setTestEventById] = useState({});

  const isMetaChannel = (type) =>
    type === "whatsapp" || type === "facebook-messenger";

  const isProviderNative = (type) =>
    isMetaChannel(type) || type === "hubspot" || type === "zendesk";

  const sortedItems = useMemo(
    () =>
      [...(Array.isArray(items) ? items : [])].sort(
        (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
      ),
    [items],
  );

  useEffect(() => {
    dispatch(fetchIntegrations());
    return () => {
      dispatch(clearIntegrationMessages());
    };
  }, [dispatch]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const name = String(form.name || "").trim();
    if (!name) {
      setLocalError("Integration name is required");
      return;
    }
    const type = String(form.type || "").trim();
    if (!isProviderNative(type) && !String(form.endpointUrl || "").trim()) {
      setLocalError("Endpoint URL is required");
      return;
    }
    try {
      await dispatch(
        createIntegration({
          name,
          type,
          endpointUrl: String(form.endpointUrl || "").trim(),
          events: parseCsv(form.eventsCsv),
          secret: String(form.secret || "").trim(),
          token: String(form.token || "").trim(),
          settings: {
            ...(type === "whatsapp"
              ? { phoneNumberId: String(form.phoneNumberId || "").trim() }
              : {}),
            ...(type === "facebook-messenger"
              ? { pageId: String(form.pageId || "").trim() }
              : {}),
            ...(String(form.department || "").trim()
              ? { department: String(form.department || "").trim() }
              : {}),
            ...(type === "zendesk"
              ? {
                  subdomain: String(form.zendeskSubdomain || "").trim(),
                  email: String(form.zendeskEmail || "").trim(),
                }
              : {}),
          },
          enabled: true,
        }),
      ).unwrap();
      setForm((prev) => ({
        ...prev,
        name: "",
        endpointUrl: "",
        secret: "",
        token: "",
        phoneNumberId: "",
        pageId: "",
        department: "",
        zendeskSubdomain: "",
        zendeskEmail: "",
      }));
      setLocalError("");
    } catch (submitError) {
      setLocalError(String(submitError || "Failed to create integration"));
    }
  };

  const handleTest = (item) => {
    const id = String(item?._id || "");
    if (!id) return;
    dispatch(
      testIntegration({
        id,
        event: String(testEventById[id] || "integration_test").trim() || "integration_test",
        payload: {
          message: "Manual integration test",
          source: "dashboard",
        },
      }),
    );
  };

  return (
    <div className="theme-page pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Integrations and Webhooks
        </div>
        <button
          type="button"
          onClick={() => dispatch(fetchIntegrations())}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          <RefreshCcw size={14} />
          Refresh
        </button>
      </div>

      {localError || error ? (
        <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {localError || error}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-100">
          Add Integration
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Name"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          >
            <option value="generic-webhook">generic-webhook</option>
            <option value="slack">slack</option>
            <option value="hubspot">hubspot</option>
            <option value="salesforce">salesforce</option>
            <option value="zendesk">zendesk</option>
            <option value="whatsapp">whatsapp</option>
            <option value="facebook-messenger">facebook-messenger</option>
          </select>
          <input
            value={form.endpointUrl}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, endpointUrl: event.target.value }))
            }
            placeholder={
              isProviderNative(form.type)
                ? "Not required for this provider"
                : "https://example.com/webhook"
            }
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={form.eventsCsv}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, eventsCsv: event.target.value }))
            }
            placeholder="new_message,conversation_resolved"
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={form.secret}
            onChange={(event) => setForm((prev) => ({ ...prev, secret: event.target.value }))}
            placeholder={
              isMetaChannel(form.type) ? "Verify token (Meta)" : "Secret (optional)"
            }
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={form.token}
            onChange={(event) => setForm((prev) => ({ ...prev, token: event.target.value }))}
            placeholder={
              form.type === "hubspot"
                ? "HubSpot private app token"
                : form.type === "zendesk"
                  ? "Zendesk API token"
                  : isMetaChannel(form.type)
                    ? "Access token (Meta)"
                    : "Token (optional)"
            }
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          {form.type === "whatsapp" ? (
            <input
              value={form.phoneNumberId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phoneNumberId: event.target.value }))
              }
              placeholder="WhatsApp phone number ID"
              className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
          ) : null}
          {form.type === "facebook-messenger" ? (
            <input
              value={form.pageId}
              onChange={(event) => setForm((prev) => ({ ...prev, pageId: event.target.value }))}
              placeholder="Facebook Page ID"
              className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
          ) : null}
          {isMetaChannel(form.type) ? (
            <input
              value={form.department}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, department: event.target.value }))
              }
              placeholder="Department routing key (optional)"
              className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
          ) : null}
          {form.type === "zendesk" ? (
            <>
              <input
                value={form.zendeskSubdomain}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, zendeskSubdomain: event.target.value }))
                }
                placeholder="Zendesk subdomain (e.g. acme)"
                className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                value={form.zendeskEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, zendeskEmail: event.target.value }))
                }
                placeholder="Zendesk agent email"
                className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </>
          ) : null}
          <button
            type="submit"
            disabled={actionLoading}
            className="md:col-span-6 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Plus size={14} />
            Save Integration
          </button>
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Configured Integrations
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {loading ? "Loading..." : `${sortedItems.length} configured`}
          </span>
        </div>
        <div className="space-y-3">
          {sortedItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
              No integrations configured.
            </div>
          ) : (
            sortedItems.map((item) => {
              const id = String(item?._id || "");
              const testResult = testResultsById[id] || {
                loading: false,
                result: null,
                error: null,
              };
              const webhookPath =
                item?.type === "whatsapp"
                  ? `/api/channels/whatsapp/${id}/webhook`
                  : item?.type === "facebook-messenger"
                    ? `/api/channels/facebook-messenger/${id}/webhook`
                    : "";

              return (
                <div
                  key={id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item?.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item?.type} | {item?.endpointUrl}
                      </p>
                      {webhookPath ? (
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Webhook URL: <span className="font-mono">{webhookPath}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            updateIntegration({
                              id,
                              updates: { enabled: item?.enabled !== true },
                            }),
                          )
                        }
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {item?.enabled === false ? "Enable" : "Disable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(deleteIntegration(id))}
                        className="rounded-lg border border-rose-300 dark:border-rose-500/30 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300"
                      >
                        <Trash2 size={12} className="inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      value={testEventById[id] || ""}
                      onChange={(event) =>
                        setTestEventById((prev) => ({
                          ...prev,
                          [id]: event.target.value,
                        }))
                      }
                      placeholder="Test event (e.g. new_message)"
                      className="md:col-span-3 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleTest(item)}
                      disabled={testResult?.loading}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-700 px-2 py-1.5 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
                    >
                      <Send size={12} />
                      {testResult?.loading ? "Testing..." : "Test"}
                    </button>
                  </div>

                  {testResult?.error ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                      {testResult.error}
                    </p>
                  ) : null}
                  {testResult?.result ? (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100">
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default IntegrationsPage;
