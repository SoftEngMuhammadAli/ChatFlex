import React from "react";
import {
  Settings2,
  Palette,
  WalletCards,
  Database,
  CircleHelp,
  MessageSquare,
  X,
  Plus,
  ImageIcon,
  Upload,
  RotateCcw,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { THEME_COLORS } from "../../../styles/globalThemeTokens";
import { WIDGET_SIZE_LIMITS } from "../../../utils/widgetConfig";
import CustomLoader from "../../ui/Loader";

const WidgetEditorSidebar = ({
  form,
  activeTab,
  setActiveTab,
  onChange,
  onLogoUpload,
  onResetLogo,
  onDimensionBlur,
  formSubmissions = [],
  formSubmissionsMeta = {},
  formSubmissionsLoading = false,
  formSubmissionsError = "",
  onRefreshFormSubmissions,
  uploadLoading = false,
  savedLogoUrl = "",
}) => {
  const isLogged = Boolean(form.isLogged);
  const isFaqEnabled = form.showFaqs !== false;
  const isAutoReplyEnabled = form.autoReplySuggestions !== false;
  const fileInputRef = React.useRef(null);
  const currentLogoUrl = String(form.logoUrl || "");
  const persistedLogoUrl = String(savedLogoUrl || "");
  const canResetLogo = currentLogoUrl !== persistedLogoUrl;
  const suggestedMessagesDraft = (Array.isArray(form.suggestedMessages)
    ? form.suggestedMessages
    : []
  ).map((item) => ({
    message: String(
      typeof item === "string"
        ? item
        : item?.message || item?.text || item?.question || "",
    ).trim(),
    answer: String(
      typeof item === "string" ? "" : item?.answer || item?.reply || "",
    ).trim(),
  }));
  const tabs = [
    { id: "general", label: "General", icon: Settings2 },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "form", label: "Form Builder", icon: WalletCards },
    { id: "formData", label: "Form Data", icon: Database },
    { id: "autoReply", label: "Auto Reply", icon: MessageSquare },
    { id: "faq", label: "FAQ Builder", icon: CircleHelp },
  ];

  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
  };

  const handleToggle = (name) => {
    onChange({
      target: {
        name,
        type: "checkbox",
        checked: !form[name],
      },
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpload) {
      onLogoUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const updateSuggestedMessages = (nextSuggestedMessages) => {
    onChange({
      target: {
        name: "suggestedMessages",
        value: nextSuggestedMessages,
      },
    });
  };

  const departmentSelection = form.departmentSelection || {
    enabled: false,
    options: [],
  };
  const departmentOptions = Array.isArray(departmentSelection.options)
    ? departmentSelection.options
    : [];

  const businessHours = form.businessHours || {
    enabled: false,
    timezone: "UTC",
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "18:00",
    autoReplyEnabled: true,
    autoReplyMessage: "",
  };

  const updateDepartmentSelection = (nextValue) => {
    onChange({
      target: {
        name: "departmentSelection",
        value: nextValue,
      },
    });
  };

  const updateBusinessHours = (nextValue) => {
    onChange({
      target: {
        name: "businessHours",
        value: nextValue,
      },
    });
  };

  return (
    <div className="w-[420px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full transition-all">
      {/* Tabs */}
      <div className="border-b border-slate-100 dark:border-slate-800 px-2 py-2">
        <div className="flex items-center gap-1 overflow-x-auto smart-x-scroll pb-1 scroll-smooth">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 py-2 rounded-xl flex items-center gap-1.5 text-[12px] font-bold whitespace-nowrap border transition-all ${
                activeTab === tab.id
                  ? "border-emerald-200 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Settings Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">
        {/* ================= GENERAL TAB ================= */}
        {activeTab === "general" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Basic Info
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Widget Name
                  </label>
                  <input
                    name="name"
                    value={form.name || ""}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    placeholder="e.g. Cheggl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subtitle
                  </label>
                  <input
                    name="subtitle"
                    value={form.subtitle || ""}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    placeholder="Most first responses arrive in under 5 minutes during business hours"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Welcome Message
                  </label>
                  <textarea
                    name="welcomeMessage"
                    value={form.welcomeMessage || ""}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"
                    placeholder="How can we help you today?"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Allow User Details
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggle("isLogged")}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                        isLogged
                          ? "bg-emerald-600"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          isLogged ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Manage visitor details separately from the pre-chat form
                    builder.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      name="width"
                      value={form.width || ""}
                      onChange={onChange}
                      onBlur={() => onDimensionBlur?.("width")}
                      min={WIDGET_SIZE_LIMITS.width.min}
                      max={WIDGET_SIZE_LIMITS.width.max}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={form.height || ""}
                      onChange={onChange}
                      onBlur={() => onDimensionBlur?.("height")}
                      min={WIDGET_SIZE_LIMITS.height.min}
                      max={WIDGET_SIZE_LIMITS.height.max}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-100 dark:bg-slate-800" />

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Functionality
              </h3>

              <div className="space-y-3">
                {[
                  {
                    id: "autoReplySuggestions",
                    label: "Auto Replies",
                    icon: MessageSquare,
                    description: "Show suggested prompts with instant answers.",
                  },
                  {
                    id: "showFaqs",
                    label: "Show FAQs",
                    icon: CircleHelp,
                    description: "Display FAQ topics in the widget.",
                  },
                  {
                    id: "allowFileUploads",
                    label: "File Uploads",
                    icon: WalletCards,
                  },
                  { id: "showEmojis", label: "Emojis", icon: Palette },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                        <item.icon size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {item.label}
                        </span>
                        {item.description && (
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                        (item.id === "autoReplySuggestions"
                          ? isAutoReplyEnabled
                          : item.id === "showFaqs"
                            ? isFaqEnabled
                          : Boolean(form[item.id]))
                          ? "bg-emerald-600"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          (item.id === "autoReplySuggestions"
                            ? isAutoReplyEnabled
                            : item.id === "showFaqs"
                              ? isFaqEnabled
                            : Boolean(form[item.id]))
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="my-8 h-px bg-slate-100 dark:bg-slate-800" />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Department Routing
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    updateDepartmentSelection({
                      ...departmentSelection,
                      enabled: !departmentSelection.enabled,
                    })
                  }
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    departmentSelection.enabled
                      ? "bg-emerald-600"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      departmentSelection.enabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Let visitors select a department before chat starts.
              </p>

              <div className="space-y-2">
                {departmentOptions.map((option, index) => (
                  <div
                    key={`dept-${index}`}
                    className="grid grid-cols-[1fr_1fr_auto_auto] gap-2"
                  >
                    <input
                      type="text"
                      value={option?.key || ""}
                      onChange={(event) => {
                        const nextOptions = [...departmentOptions];
                        nextOptions[index] = {
                          ...nextOptions[index],
                          key: event.target.value,
                        };
                        updateDepartmentSelection({
                          ...departmentSelection,
                          options: nextOptions,
                        });
                      }}
                      placeholder="key"
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={option?.label || ""}
                      onChange={(event) => {
                        const nextOptions = [...departmentOptions];
                        nextOptions[index] = {
                          ...nextOptions[index],
                          label: event.target.value,
                        };
                        updateDepartmentSelection({
                          ...departmentSelection,
                          options: nextOptions,
                        });
                      }}
                      placeholder="label"
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextOptions = departmentOptions.map((item, itemIndex) => ({
                          ...item,
                          isDefault: itemIndex === index,
                        }));
                        updateDepartmentSelection({
                          ...departmentSelection,
                          options: nextOptions,
                        });
                      }}
                      className={`rounded-lg px-2 py-1.5 text-[10px] font-bold ${
                        option?.isDefault
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOptions = [...departmentOptions];
                        nextOptions.splice(index, 1);
                        updateDepartmentSelection({
                          ...departmentSelection,
                          options: nextOptions,
                        });
                      }}
                      className="rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300 px-2 py-1.5 text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateDepartmentSelection({
                      ...departmentSelection,
                      options: [
                        ...departmentOptions,
                        {
                          key: `department-${departmentOptions.length + 1}`,
                          label: "New Department",
                          isDefault: departmentOptions.length === 0,
                        },
                      ],
                    })
                  }
                  className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Add Department
                </button>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-100 dark:bg-slate-800" />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Business Hours
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    updateBusinessHours({
                      ...businessHours,
                      enabled: !businessHours.enabled,
                    })
                  }
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    businessHours.enabled
                      ? "bg-emerald-600"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      businessHours.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={businessHours.timezone || "UTC"}
                  onChange={(event) =>
                    updateBusinessHours({
                      ...businessHours,
                      timezone: event.target.value,
                    })
                  }
                  placeholder="Timezone (e.g. UTC)"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={businessHours.startTime || "09:00"}
                    onChange={(event) =>
                      updateBusinessHours({
                        ...businessHours,
                        startTime: event.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs"
                  />
                  <input
                    type="time"
                    value={businessHours.endTime || "18:00"}
                    onChange={(event) =>
                      updateBusinessHours({
                        ...businessHours,
                        endTime: event.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => {
                  const selected = Array.isArray(businessHours.weekdays)
                    ? businessHours.weekdays.includes(index)
                    : false;
                  return (
                    <button
                      key={`weekday-${index}`}
                      type="button"
                      onClick={() => {
                        const nextWeekdays = new Set(
                          Array.isArray(businessHours.weekdays)
                            ? businessHours.weekdays
                            : [],
                        );
                        if (nextWeekdays.has(index)) {
                          nextWeekdays.delete(index);
                        } else {
                          nextWeekdays.add(index);
                        }
                        updateBusinessHours({
                          ...businessHours,
                          weekdays: Array.from(nextWeekdays).sort((a, b) => a - b),
                        });
                      }}
                      className={`rounded-lg py-1.5 text-[11px] font-bold ${
                        selected
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Auto-reply when offline
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateBusinessHours({
                        ...businessHours,
                        autoReplyEnabled: businessHours.autoReplyEnabled !== false ? false : true,
                      })
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      businessHours.autoReplyEnabled !== false
                        ? "bg-emerald-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        businessHours.autoReplyEnabled !== false
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={businessHours.autoReplyMessage || ""}
                  onChange={(event) =>
                    updateBusinessHours({
                      ...businessHours,
                      autoReplyMessage: event.target.value,
                    })
                  }
                  placeholder="Auto-reply message outside business hours"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>
            </section>
          </div>
        )}

        {/* ================= APPEARANCE TAB ================= */}
        {activeTab === "appearance" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Branding & Colors
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {["brandColor", "textColor", "backgroundColor"].map((field) => (
                  <div
                    key={field}
                    className={`space-y-1.5 ${
                      field === "backgroundColor" ? "col-span-2" : ""
                    }`}
                  >
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {field.replace("Color", " Color")}
                    </label>

                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <div className="relative w-10 h-8 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor:
                              form[field] || THEME_COLORS.slate900,
                          }}
                        />
                        <input
                          type="color"
                          name={field}
                          value={form[field] || THEME_COLORS.slate900}
                          onChange={onChange}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                          title={`Pick ${field.replace("Color", " color")}`}
                        />
                      </div>
                      <input
                        type="text"
                        value={(form[field] || "").toUpperCase()}
                        readOnly
                        className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none uppercase bg-transparent"
                        aria-label={`${field} hex value`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="my-8 h-px bg-slate-100 dark:bg-slate-800" />

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Brand Icon
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Brand icon"
                        className="w-full h-full object-cover bg-center"
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <ImageIcon
                      size={20}
                      className="text-slate-400"
                      style={{ display: form.logoUrl ? "none" : "flex" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      Widget Icon
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Displayed in widget header
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={uploadLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadLoading ? (
                    <>
                      <CustomLoader iconOnly={true} className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Upload from file
                    </>
                  )}
                </button>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Icon URL
                  </label>
                  <input
                    name="logoUrl"
                    value={form.logoUrl || ""}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    placeholder="https://example.com/icon.png"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Or enter a URL for your brand icon (PNG, JPG, SVG).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onResetLogo}
                    disabled={!canResetLogo}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={12} />
                    Reset Icon
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        target: { name: "logoUrl", value: "" },
                      })
                    }
                    disabled={!currentLogoUrl}
                    className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/20 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Remove Icon
                  </button>
                </div>
              </div>
            </section>

            <div className="my-8 h-px bg-slate-100 dark:bg-slate-800" />

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Widget Position
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {["left", "right"].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() =>
                      onChange({ target: { name: "position", value: pos } })
                    }
                    className={`px-4 py-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                      form.position === pos
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================= FORM TAB ================= */}
        {activeTab === "form" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Pre-Chat Form
              </h3>
              <button
                type="button"
                onClick={() => {
                  const currentForm = form.preChatForm || {
                    enabled: false,
                    fields: [
                      {
                        label: "Name",
                        type: "text",
                        required: true,
                        placeholder: "John Doe",
                      },
                      {
                        label: "Email",
                        type: "email",
                        required: true,
                        placeholder: "john@example.com",
                      },
                    ],
                  };
                  onChange({
                    target: {
                      name: "preChatForm",
                      value: { ...currentForm, enabled: !currentForm.enabled },
                    },
                  });
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                  form.preChatForm?.enabled
                    ? "bg-emerald-600"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    form.preChatForm?.enabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {form.preChatForm?.enabled ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  {(form.preChatForm?.fields || []).map((field, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          Field #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = [...form.preChatForm.fields];
                            newFields.splice(index, 1);
                            onChange({
                              target: {
                                name: "preChatForm",
                                value: {
                                  ...form.preChatForm,
                                  fields: newFields,
                                },
                              },
                            });
                          }}
                          className="text-rose-500 hover:text-rose-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Label
                          </label>
                          <input
                            value={field.label}
                            onChange={(e) => {
                              const newFields = [...form.preChatForm.fields];
                              newFields[index] = {
                                ...field,
                                label: e.target.value,
                              };
                              onChange({
                                target: {
                                  name: "preChatForm",
                                  value: {
                                    ...form.preChatForm,
                                    fields: newFields,
                                  },
                                },
                              });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                            placeholder="e.g. Full Name"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Type
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newFields = [...form.preChatForm.fields];
                                newFields[index] = {
                                  ...field,
                                  type: e.target.value,
                                };
                                onChange({
                                  target: {
                                    name: "preChatForm",
                                    value: {
                                      ...form.preChatForm,
                                      fields: newFields,
                                    },
                                  },
                                });
                              }}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="number">Number</option>
                              <option value="textarea">Textarea</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 pt-6">
                            <button
                              type="button"
                              onClick={() => {
                                const newFields = [...form.preChatForm.fields];
                                newFields[index] = {
                                  ...field,
                                  required: !field.required,
                                };
                                onChange({
                                  target: {
                                    name: "preChatForm",
                                    value: {
                                      ...form.preChatForm,
                                      fields: newFields,
                                    },
                                  },
                                });
                              }}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                field.required
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                              }`}
                            >
                              {field.required && (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="w-2.5 h-2.5"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              Required
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Placeholder
                          </label>
                          <input
                            value={field.placeholder || ""}
                            onChange={(e) => {
                              const newFields = [...form.preChatForm.fields];
                              newFields[index] = {
                                ...field,
                                placeholder: e.target.value,
                              };
                              onChange({
                                target: {
                                  name: "preChatForm",
                                  value: {
                                    ...form.preChatForm,
                                    fields: newFields,
                                  },
                                },
                              });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                            placeholder="e.g. Enter your name"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newFields = [
                      ...(form.preChatForm?.fields || []),
                      {
                        label: "New Field",
                        type: "text",
                        required: true,
                        placeholder: "",
                      },
                    ];
                    onChange({
                      target: {
                        name: "preChatForm",
                        value: { ...form.preChatForm, fields: newFields },
                      },
                    });
                  }}
                  className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add New Field
                </button>
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-center">
                <WalletCards
                  size={24}
                  className="mx-auto text-slate-300 mb-2"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Enable pre-chat form to collect user information before
                  starting a conversation.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= AUTO REPLY TAB ================= */}
        {activeTab === "formData" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Pre-Form Submissions
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Captured values visitors submit in the pre-chat form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRefreshFormSubmissions?.()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <RefreshCw size={12} className={formSubmissionsLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-3 text-[11px] text-slate-600 dark:text-slate-300">
              Total submissions:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {Number(formSubmissionsMeta?.total || formSubmissions.length || 0)}
              </span>
            </div>

            {formSubmissionsError ? (
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                {formSubmissionsError}
              </div>
            ) : null}

            {!form.preChatForm?.enabled ? (
              <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                <WalletCards size={22} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Pre-chat form is disabled. Enable it to collect submissions.
                </p>
              </div>
            ) : formSubmissionsLoading ? (
              <div className="py-10 flex items-center justify-center">
                <CustomLoader
                  fullPage={false}
                  message="Loading form submissions..."
                />
              </div>
            ) : Array.isArray(formSubmissions) && formSubmissions.length > 0 ? (
              <div className="space-y-3">
                {formSubmissions.map((entry, index) => {
                  const fields = Array.isArray(entry?.preChatFields)
                    ? entry.preChatFields
                    : [];
                  return (
                    <div
                      key={entry?.conversationId || `submission-${index}`}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {entry?.visitor?.name || "Anonymous Visitor"}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {entry?.visitor?.email || entry?.visitorId || "Unknown visitor"}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {entry?.status || "open"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Submitted
                          </p>
                          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 break-words">
                            {formatDateTime(entry?.createdAt)}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Department
                          </p>
                          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 break-words">
                            {entry?.department || "N/A"}
                          </p>
                        </div>
                      </div>

                      {fields.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Form Values
                          </p>
                          <div className="space-y-1.5">
                            {fields.map((field) => (
                              <div
                                key={`${entry?.conversationId || index}-${field?.key || field?.label}`}
                                className="flex items-start justify-between gap-3 p-2 rounded-lg border border-slate-100 dark:border-slate-800"
                              >
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  {field?.label || "Field"}
                                </span>
                                <span className="text-[11px] text-right text-slate-800 dark:text-slate-100 break-words">
                                  {field?.value || "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                          No pre-chat field values found for this submission.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                <Database size={22} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  No form submissions yet.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "autoReply" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Suggested Auto Replies
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure prompts and answers shown on widget home. Clicking a
                prompt sends the visitor message and instantly shows its answer.
              </p>
            </div>

            {!isAutoReplyEnabled ? (
              <div className="p-6 border border-amber-200/60 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-2xl space-y-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Auto replies are currently disabled.
                </p>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-200/90">
                  Turn on Auto Replies from the General tab to display suggested
                  prompts in the widget.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/40 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-500/20 transition-colors"
                >
                  Go to General Tab
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Suggested Messages
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      updateSuggestedMessages([
                        ...suggestedMessagesDraft,
                        { message: "", answer: "" },
                      ]);
                    }}
                    className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold hover:text-emerald-700 transition-colors uppercase tracking-wider"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {suggestedMessagesDraft.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      No suggested messages yet. Add prompts with answers for
                      instant auto-replies.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestedMessagesDraft.map((item, index) => (
                      <div
                        key={`suggested-${index}`}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            Suggestion #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextSuggestedMessages = [
                                ...suggestedMessagesDraft,
                              ];
                              nextSuggestedMessages.splice(index, 1);
                              updateSuggestedMessages(nextSuggestedMessages);
                            }}
                            className="text-rose-500 hover:text-rose-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Message
                          </label>
                          <input
                            value={item.message || ""}
                            onChange={(e) => {
                              const nextSuggestedMessages = [
                                ...suggestedMessagesDraft,
                              ];
                              nextSuggestedMessages[index] = {
                                ...item,
                                message: e.target.value,
                              };
                              updateSuggestedMessages(nextSuggestedMessages);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                            placeholder="e.g. What are your pricing plans?"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Auto-Reply Answer
                          </label>
                          <textarea
                            value={item.answer || ""}
                            onChange={(e) => {
                              const nextSuggestedMessages = [
                                ...suggestedMessagesDraft,
                              ];
                              nextSuggestedMessages[index] = {
                                ...item,
                                answer: e.target.value,
                              };
                              updateSuggestedMessages(nextSuggestedMessages);
                            }}
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none resize-none"
                            placeholder="Write the answer shown when this message is clicked."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= FAQ TAB ================= */}
        {activeTab === "faq" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                FAQ Items
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!isFaqEnabled) return;
                  const nextFaqItems = [
                    ...(Array.isArray(form.faqItems) ? form.faqItems : []),
                    {
                      question: "",
                      answer: "",
                      category: "General",
                      status: "published",
                    },
                  ];
                  onChange({
                    target: {
                      name: "faqItems",
                      value: nextFaqItems,
                    },
                  });
                }}
                disabled={!isFaqEnabled}
                className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors uppercase tracking-wider ${
                  isFaqEnabled
                    ? "text-emerald-600 hover:text-emerald-700"
                    : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                }`}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Published FAQs appear on widget home and in the FAQ tab.
            </p>

            {!isFaqEnabled && (
              <div className="p-4 rounded-2xl border border-amber-200/70 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/40">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  FAQs are hidden in widget.
                </p>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-200/90 mt-1">
                  Enable "Show FAQs" from General tab to add or edit FAQs.
                </p>
              </div>
            )}

            {(Array.isArray(form.faqItems) ? form.faqItems : []).length ===
            0 ? (
              <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No FAQ items yet. Add your first FAQ to show quick help in the
                  widget.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(form.faqItems || []).map((faq, index) => (
                  <div
                    key={`faq-${index}`}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        FAQ #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={!isFaqEnabled}
                        onClick={() => {
                          if (!isFaqEnabled) return;
                          const nextFaqItems = [...(form.faqItems || [])];
                          nextFaqItems.splice(index, 1);
                          onChange({
                            target: {
                              name: "faqItems",
                              value: nextFaqItems,
                            },
                          });
                        }}
                        className={`transition-colors ${
                          isFaqEnabled
                            ? "text-rose-500 hover:text-rose-600"
                            : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Question
                      </label>
                      <input
                        disabled={!isFaqEnabled}
                        value={faq.question || ""}
                        onChange={(e) => {
                          if (!isFaqEnabled) return;
                          const nextFaqItems = [...(form.faqItems || [])];
                          nextFaqItems[index] = {
                            ...faq,
                            question: e.target.value,
                          };
                          onChange({
                            target: {
                              name: "faqItems",
                              value: nextFaqItems,
                            },
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                        placeholder="e.g. How long does delivery take?"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Answer
                      </label>
                      <textarea
                        disabled={!isFaqEnabled}
                        value={faq.answer || ""}
                        onChange={(e) => {
                          if (!isFaqEnabled) return;
                          const nextFaqItems = [...(form.faqItems || [])];
                          nextFaqItems[index] = {
                            ...faq,
                            answer: e.target.value,
                          };
                          onChange({
                            target: {
                              name: "faqItems",
                              value: nextFaqItems,
                            },
                          });
                        }}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none resize-none"
                        placeholder="Write the answer shown to visitors."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Category
                        </label>
                        <input
                          disabled={!isFaqEnabled}
                          value={faq.category || ""}
                          onChange={(e) => {
                            if (!isFaqEnabled) return;
                            const nextFaqItems = [...(form.faqItems || [])];
                            nextFaqItems[index] = {
                              ...faq,
                              category: e.target.value,
                            };
                            onChange({
                              target: {
                                name: "faqItems",
                                value: nextFaqItems,
                              },
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                          placeholder="General"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Status
                        </label>
                        <select
                          disabled={!isFaqEnabled}
                          value={faq.status || "published"}
                          onChange={(e) => {
                            if (!isFaqEnabled) return;
                            const nextFaqItems = [...(form.faqItems || [])];
                            nextFaqItems[index] = {
                              ...faq,
                              status: e.target.value,
                            };
                            onChange({
                              target: {
                                name: "faqItems",
                                value: nextFaqItems,
                              },
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                        >
                          <option value="published">Published</option>
                          <option value="unpublished">Unpublished</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetEditorSidebar;
