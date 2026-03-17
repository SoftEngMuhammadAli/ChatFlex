import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Bot,
  Clock3,
  PlayCircle,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import {
  clearAutomationMessages,
  createAutomationRule,
  createCannedResponse,
  createWorkflowTask,
  deleteAutomationRule,
  deleteCannedResponse,
  fetchAutomationRules,
  fetchCannedResponses,
  fetchWorkflowTasks,
  processWorkflowTasksNow,
  selectAutomationActionLoading,
  selectAutomationCannedLoading,
  selectAutomationCannedResponses,
  selectAutomationError,
  selectAutomationProcessLoading,
  selectAutomationRules,
  selectAutomationRulesLoading,
  selectAutomationSuccess,
  selectAutomationTasksLoading,
  selectAutomationTestResult,
  selectAutomationWorkflowTasks,
  testAutomationRules,
  updateAutomationRule,
  updateCannedResponse,
} from "../../features/automation/automationSlice";

const parseJsonInput = (value, fallback = {}) => {
  const text = String(value || "").trim();
  if (!text) return { value: fallback, error: "" };
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: fallback, error: "JSON must be an object" };
    }
    return { value: parsed, error: "" };
  } catch {
    return { value: fallback, error: "Invalid JSON format" };
  }
};

const AutomationPage = () => {
  const dispatch = useDispatch();
  const rules = useSelector(selectAutomationRules);
  const cannedResponses = useSelector(selectAutomationCannedResponses);
  const workflowTasks = useSelector(selectAutomationWorkflowTasks);
  const rulesLoading = useSelector(selectAutomationRulesLoading);
  const cannedLoading = useSelector(selectAutomationCannedLoading);
  const tasksLoading = useSelector(selectAutomationTasksLoading);
  const actionLoading = useSelector(selectAutomationActionLoading);
  const processLoading = useSelector(selectAutomationProcessLoading);
  const successMessage = useSelector(selectAutomationSuccess);
  const error = useSelector(selectAutomationError);
  const testResult = useSelector(selectAutomationTestResult);

  const [ruleForm, setRuleForm] = useState({
    name: "",
    trigger: "visitor_message",
    priority: 100,
    conditionsJson: "{}",
    actionsJson: `{
  "assignMode": "department-round-robin",
  "addTags": ["new"],
  "setSlaMinutes": 30,
  "createReminderMinutesBefore": 5
}`,
  });
  const [cannedForm, setCannedForm] = useState({
    title: "",
    body: "",
    category: "General",
    shortcut: "",
  });
  const [taskForm, setTaskForm] = useState({
    taskType: "notification-reminder",
    conversationId: "",
    minutesFromNow: 10,
    payloadJson: `{"message":"Follow up with assignee"}`,
  });
  const [testForm, setTestForm] = useState({
    trigger: "manual",
    conversationId: "",
    senderType: "visitor",
    messageContent: "",
  });
  const [localError, setLocalError] = useState("");

  const sortedRules = useMemo(
    () =>
      [...(Array.isArray(rules) ? rules : [])].sort(
        (a, b) => Number(a?.priority || 100) - Number(b?.priority || 100),
      ),
    [rules],
  );

  const sortedTasks = useMemo(
    () =>
      [...(Array.isArray(workflowTasks) ? workflowTasks : [])].sort(
        (a, b) => new Date(a?.dueAt || 0).getTime() - new Date(b?.dueAt || 0).getTime(),
      ),
    [workflowTasks],
  );

  const refreshAll = () => {
    dispatch(fetchAutomationRules());
    dispatch(fetchCannedResponses());
    dispatch(fetchWorkflowTasks({ limit: 150 }));
  };

  useEffect(() => {
    refreshAll();
    return () => {
      dispatch(clearAutomationMessages());
    };
  }, [dispatch]);

  const handleCreateRule = async (event) => {
    event.preventDefault();
    const conditions = parseJsonInput(ruleForm.conditionsJson, {});
    const actions = parseJsonInput(ruleForm.actionsJson, {});
    if (conditions.error || actions.error) {
      setLocalError(
        conditions.error || actions.error || "Invalid JSON payload for rule",
      );
      return;
    }
    if (!String(ruleForm.name || "").trim()) {
      setLocalError("Rule name is required");
      return;
    }

    try {
      await dispatch(
        createAutomationRule({
          name: String(ruleForm.name || "").trim(),
          trigger: ruleForm.trigger,
          priority: Number(ruleForm.priority || 100),
          conditions: conditions.value,
          actions: actions.value,
        }),
      ).unwrap();

      setRuleForm((prev) => ({ ...prev, name: "" }));
      setLocalError("");
    } catch (submitError) {
      setLocalError(String(submitError || "Failed to create automation rule"));
    }
  };

  const handleCreateCanned = async (event) => {
    event.preventDefault();
    if (!String(cannedForm.title || "").trim() || !String(cannedForm.body || "").trim()) {
      setLocalError("Canned response title and body are required");
      return;
    }
    try {
      await dispatch(
        createCannedResponse({
          title: cannedForm.title.trim(),
          body: cannedForm.body.trim(),
          category: cannedForm.category.trim() || "General",
          shortcut: cannedForm.shortcut.trim(),
        }),
      ).unwrap();
      setCannedForm({ title: "", body: "", category: "General", shortcut: "" });
      setLocalError("");
    } catch (submitError) {
      setLocalError(String(submitError || "Failed to create canned response"));
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    const payload = parseJsonInput(taskForm.payloadJson, {});
    if (payload.error) {
      setLocalError(payload.error);
      return;
    }
    try {
      await dispatch(
        createWorkflowTask({
          taskType: taskForm.taskType,
          conversationId: String(taskForm.conversationId || "").trim(),
          minutesFromNow: Number(taskForm.minutesFromNow || 5),
          payload: payload.value,
        }),
      ).unwrap();
      setTaskForm((prev) => ({ ...prev, conversationId: "" }));
      setLocalError("");
      dispatch(fetchWorkflowTasks({ limit: 150 }));
    } catch (submitError) {
      setLocalError(String(submitError || "Failed to create workflow task"));
    }
  };

  const handleRunTest = async () => {
    await dispatch(
      testAutomationRules({
        trigger: testForm.trigger,
        conversationId: String(testForm.conversationId || "").trim(),
        senderType: testForm.senderType,
        message: { content: testForm.messageContent || "" },
      }),
    );
  };

  return (
    <div className="theme-page pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Automation and Workflows
        </div>
        <button
          type="button"
          onClick={refreshAll}
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Auto-Assign and Auto-Tag Rules
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {rulesLoading ? "Loading..." : `${sortedRules.length} rules`}
          </span>
        </div>

        <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={ruleForm.name}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Rule name"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            value={ruleForm.trigger}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, trigger: event.target.value }))
            }
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="conversation_created">conversation_created</option>
            <option value="visitor_message">visitor_message</option>
            <option value="agent_message">agent_message</option>
            <option value="conversation_resolved">conversation_resolved</option>
            <option value="sla_due">sla_due</option>
            <option value="manual">manual</option>
          </select>
          <input
            type="number"
            min={1}
            max={1000}
            value={ruleForm.priority}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, priority: event.target.value }))
            }
            placeholder="Priority"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={actionLoading}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Plus size={14} />
            Create Rule
          </button>
          <textarea
            value={ruleForm.conditionsJson}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, conditionsJson: event.target.value }))
            }
            rows={6}
            className="md:col-span-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono"
          />
          <textarea
            value={ruleForm.actionsJson}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, actionsJson: event.target.value }))
            }
            rows={6}
            className="md:col-span-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono"
          />
        </form>

        <div className="mt-4 space-y-2">
          {sortedRules.map((rule) => (
            <div
              key={String(rule?._id || rule?.id)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {rule?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Trigger: {rule?.trigger} | Priority: {Number(rule?.priority || 100)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(
                        updateAutomationRule({
                          id: String(rule?._id || ""),
                          updates: { enabled: rule?.enabled !== true },
                        }),
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {rule?.enabled === false ? "Enable" : "Disable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(deleteAutomationRule(String(rule?._id || "")))}
                    className="rounded-lg border border-rose-300 dark:border-rose-500/30 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300"
                  >
                    <Trash2 size={12} className="inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
            Rules Test Runner
          </p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              value={testForm.trigger}
              onChange={(event) =>
                setTestForm((prev) => ({ ...prev, trigger: event.target.value }))
              }
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs"
            >
              <option value="manual">manual</option>
              <option value="visitor_message">visitor_message</option>
              <option value="agent_message">agent_message</option>
              <option value="conversation_created">conversation_created</option>
              <option value="conversation_resolved">conversation_resolved</option>
            </select>
            <input
              value={testForm.conversationId}
              onChange={(event) =>
                setTestForm((prev) => ({ ...prev, conversationId: event.target.value }))
              }
              placeholder="Conversation ID (optional)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs"
            />
            <input
              value={testForm.messageContent}
              onChange={(event) =>
                setTestForm((prev) => ({ ...prev, messageContent: event.target.value }))
              }
              placeholder="Message content"
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleRunTest}
              className="rounded-lg bg-indigo-700 px-2 py-1.5 text-xs font-bold text-white hover:bg-indigo-800"
            >
              Run Test
            </button>
          </div>
          {testResult ? (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          ) : null}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Canned Responses and Macros
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {cannedLoading ? "Loading..." : `${cannedResponses.length} responses`}
          </span>
        </div>
        <form onSubmit={handleCreateCanned} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            value={cannedForm.title}
            onChange={(event) =>
              setCannedForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Title"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={cannedForm.category}
            onChange={(event) =>
              setCannedForm((prev) => ({ ...prev, category: event.target.value }))
            }
            placeholder="Category"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={cannedForm.shortcut}
            onChange={(event) =>
              setCannedForm((prev) => ({ ...prev, shortcut: event.target.value }))
            }
            placeholder="/shortcut"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={cannedForm.body}
            onChange={(event) =>
              setCannedForm((prev) => ({ ...prev, body: event.target.value }))
            }
            placeholder="Message body"
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={actionLoading}
            className="md:col-span-5 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Bot size={14} />
            Save Canned Response
          </button>
        </form>
        <div className="mt-3 space-y-2">
          {cannedResponses.map((item) => (
            <div
              key={String(item?._id || item?.id)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item?.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item?.shortcut || "-"} | {item?.category || "General"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(
                        updateCannedResponse({
                          id: String(item?._id || ""),
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
                    onClick={() => dispatch(deleteCannedResponse(String(item?._id || "")))}
                    className="rounded-lg border border-rose-300 dark:border-rose-500/30 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                {item?.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Workflow Tasks, SLA Timers and Reminder Notifications
          </h2>
          <button
            type="button"
            onClick={() =>
              dispatch(processWorkflowTasksNow()).then(() =>
                dispatch(fetchWorkflowTasks({ limit: 150 })),
              )
            }
            disabled={processLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 disabled:opacity-60"
          >
            <PlayCircle size={14} />
            {processLoading ? "Processing..." : "Process Due Now"}
          </button>
        </div>
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <select
            value={taskForm.taskType}
            onChange={(event) =>
              setTaskForm((prev) => ({ ...prev, taskType: event.target.value }))
            }
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          >
            <option value="notification-reminder">notification-reminder</option>
            <option value="sla-reminder">sla-reminder</option>
            <option value="escalation-check">escalation-check</option>
            <option value="post-resolution-followup">post-resolution-followup</option>
            <option value="daily-digest">daily-digest</option>
          </select>
          <input
            value={taskForm.conversationId}
            onChange={(event) =>
              setTaskForm((prev) => ({ ...prev, conversationId: event.target.value }))
            }
            placeholder="Conversation ID (optional)"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={taskForm.minutesFromNow}
            onChange={(event) =>
              setTaskForm((prev) => ({ ...prev, minutesFromNow: event.target.value }))
            }
            placeholder="Minutes"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            value={taskForm.payloadJson}
            onChange={(event) =>
              setTaskForm((prev) => ({ ...prev, payloadJson: event.target.value }))
            }
            placeholder='Payload JSON {"message":"..."}'
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={actionLoading}
            className="md:col-span-5 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Clock3 size={14} />
            Create Task
          </button>
        </form>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 pr-3">Attempts</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {tasksLoading ? (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-500">
                    Loading workflow tasks...
                  </td>
                </tr>
              ) : sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-500">
                    No workflow tasks queued.
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => (
                  <tr
                    key={String(task?._id || task?.id)}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-3">{task?.taskType}</td>
                    <td className="py-2 pr-3">{task?.status}</td>
                    <td className="py-2 pr-3">
                      {task?.dueAt ? new Date(task.dueAt).toLocaleString() : "-"}
                    </td>
                    <td className="py-2 pr-3">{Number(task?.attempts || 0)}</td>
                    <td className="py-2">{String(task?.lastError || "-")}</td>
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

export default AutomationPage;
