import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Layers, Plus, Palette } from "lucide-react";
import { selectUser } from "../../features/auth/authSlice";
import {
  clearSuperAdminWidgetsMessages,
  createSuperAdminWidget,
  fetchSuperAdminWidgets,
  generateSuperAdminWidgetScript,
  selectSuperAdminWidgets,
  selectSuperAdminWidgetsActionLoading,
  selectSuperAdminWidgetsError,
  selectSuperAdminWidgetsLoading,
  selectSuperAdminWidgetsSuccess,
  updateSuperAdminWidget,
  deleteSuperAdminWidget,
} from "../../features/superAdminWidgets/superAdminWidgetsSlice";
import WidgetTemplateCard from "../../components/super-admin/WidgetTemplateCard";
import {
  defaultWidgetTemplateForm,
  getWidgetTemplateId,
} from "../../utils/widgetConfig";
import CustomLoader from "../../components/ui/Loader";
import { TEMPLATE_LIBRARY } from "../../utils/widgetTemplates";

const WidgetsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sessionUser = useSelector(selectUser);
  const role = String(sessionUser?.role || "").toLowerCase();
  const isSuperAdmin = role === "super-admin";

  const widgets = useSelector(selectSuperAdminWidgets);
  const loading = useSelector(selectSuperAdminWidgetsLoading);
  const actionLoading = useSelector(selectSuperAdminWidgetsActionLoading);
  const error = useSelector(selectSuperAdminWidgetsError);
  const success = useSelector(selectSuperAdminWidgetsSuccess);

  const [activeTab, setActiveTab] = useState("widgets");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    TEMPLATE_LIBRARY[0]?.id || "",
  );
  const [selectedWidgetId, setSelectedWidgetId] = useState("");

  useEffect(() => {
    dispatch(fetchSuperAdminWidgets());
  }, [dispatch]);

  const selectedTemplate = useMemo(
    () =>
      TEMPLATE_LIBRARY.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId],
  );

  const handleAddWidget = async () => {
    dispatch(clearSuperAdminWidgetsMessages());
    const name = window.prompt("Enter Widget Name:", "New Widget");
    if (!name) return;

    try {
      const result = await dispatch(
        createSuperAdminWidget({ ...defaultWidgetTemplateForm, name }),
      ).unwrap();

      if (result?._id) {
        navigate(`/app/widget-editor/${result._id}`);
      }
    } catch (_error) {
      console.error("Widget creation failed", _error);
    }
  };

  const handleCopyScript = async (widget) => {
    try {
      const script = await dispatch(
        generateSuperAdminWidgetScript(getWidgetTemplateId(widget)),
      ).unwrap();

      if (!script) return;

      await navigator.clipboard.writeText(script);
      dispatch(clearSuperAdminWidgetsMessages());
      window.alert("Widget script copied to clipboard.");
    } catch (_error) {
      console.error("Failed to copy widget script", _error);
    }
  };

  const handleDeleteScript = async (widget) => {
    if (!window.confirm("Are you sure you want to delete this widget?")) return;

    try {
      await dispatch(
        deleteSuperAdminWidget(getWidgetTemplateId(widget)),
      ).unwrap();

      dispatch(clearSuperAdminWidgetsMessages());
    } catch (_error) {
      console.error("Failed to delete widget", _error);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !selectedWidgetId) return;

    const targetWidget = widgets.find(
      (item) => getWidgetTemplateId(item) === String(selectedWidgetId),
    );

    if (!targetWidget) return;

    const updates = {
      ...targetWidget,
      brandColor: selectedTemplate.brandColor,
      position: selectedTemplate.position,
      title: selectedTemplate.title,
      subtitle: selectedTemplate.subtitle,
      welcomeMessage: selectedTemplate.welcomeMessage,
      width: selectedTemplate.width,
      height: selectedTemplate.height,
      textColor: selectedTemplate.textColor,
      backgroundColor: selectedTemplate.backgroundColor,
    };

    try {
      await dispatch(
        updateSuperAdminWidget({
          id: selectedWidgetId,
          updates,
        }),
      ).unwrap();

      window.alert("Template applied to widget.");
    } catch (_error) {
      console.error("Failed to apply template", _error);
    }
  };

  return (
    <div className="theme-page animate-in fade-in duration-500">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Script Embed
        </div>
        <button
          onClick={handleAddWidget}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Add Widget
        </button>
      </div>
      {isSuperAdmin ? (
        <div className="mb-2 flex w-fit items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => setActiveTab("widgets")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg ${
              activeTab === "widgets"
                ? "bg-emerald-700 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Widgets
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg ${
              activeTab === "templates"
                ? "bg-emerald-700 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Templates
          </button>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
        <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
          Use the widget card <strong>Copy Script</strong> button, then paste
          the snippet into your website HTML.
        </p>
      </div>
      {/* Alerts */}
      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}
      {/* Widgets Tab */}
      {activeTab === "widgets" || !isSuperAdmin ? (
        <>
          {loading ? (
            <CustomLoader message="Loading Widgets..." />
          ) : widgets.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-12 text-center">
              <Layers
                className="mx-auto text-slate-400 dark:text-slate-500"
                size={32}
              />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                No widgets created yet.
              </p>
            </div>
          ) : (
            <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
              {widgets.map((widget) => (
                <WidgetTemplateCard
                  key={getWidgetTemplateId(widget)}
                  widget={widget}
                  onCopyScript={handleCopyScript}
                  onDeleteScript={handleDeleteScript}
                />
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Template Grid */}
          <div className="xl:col-span-2 grid grid-cols-1 2xl:grid-cols-2 gap-5">
            {TEMPLATE_LIBRARY.map((template) => {
              const isSelected = template.id === selectedTemplateId;

              return (
                <article
                  key={template.id}
                  className={`rounded-2xl border p-5 bg-white dark:bg-slate-900 shadow-sm ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {template.name}
                    </h3>

                    <button
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        isSelected
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {template.description || "No description available."}
                  </p>

                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-slate-200 dark:border-slate-700"
                        style={{ backgroundColor: template.brandColor }}
                      />
                      {template.brandColor}
                    </span>

                    <span>
                      {template.width} x {template.height}
                    </span>

                    <span className="capitalize">{template.position}</span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Apply Panel */}
          <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm h-fit">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-emerald-600" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Apply Template to Widget
              </h4>
            </div>

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Pick a template and target widget.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={selectedWidgetId}
                onChange={(e) => setSelectedWidgetId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">Select widget</option>
                {widgets.map((widget) => (
                  <option
                    key={getWidgetTemplateId(widget)}
                    value={getWidgetTemplateId(widget)}
                  >
                    {widget.name}
                  </option>
                ))}
              </select>

              <button
                disabled={
                  actionLoading || !selectedTemplate || !selectedWidgetId
                }
                onClick={handleApplyTemplate}
                className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold py-2.5 disabled:opacity-50"
              >
                {actionLoading ? "Applying..." : "Apply Template"}
              </button>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
};

export default WidgetsPage;
