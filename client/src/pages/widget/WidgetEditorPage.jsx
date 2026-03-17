import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ChevronLeft, Save } from "lucide-react";
import {
  fetchSuperAdminWidgets,
  fetchWidgetFormSubmissions,
  updateSuperAdminWidget,
  uploadWidgetLogo,
  selectSuperAdminWidgets,
  selectSuperAdminWidgetsLoading,
  selectSuperAdminWidgetsActionLoading,
  selectWidgetFormSubmissionsById,
  selectWidgetFormSubmissionsErrorById,
  selectWidgetFormSubmissionsLoadingById,
  selectWidgetFormSubmissionsMetaById,
} from "../../features/superAdminWidgets/superAdminWidgetsSlice";
import {
  getWidgetTemplateId,
  defaultWidgetTemplateForm,
  clampWidgetDimension,
  WIDGET_SIZE_LIMITS,
  sanitizeSuggestedMessages as sanitizeSuggestedMessagesFromConfig,
} from "../../utils/widgetConfig";
import CustomLoader from "../../components/ui/Loader";
import ErrorBox from "../../components/ui/ErrorBox";

import WidgetEditorSidebar from "../../components/super-admin/widget-editor/WidgetEditorSidebar";
import WidgetPreview from "../../components/super-admin/widget-editor/WidgetPreview";

const sanitizeFaqItems = (faqItems = []) =>
  (Array.isArray(faqItems) ? faqItems : [])
    .map((faq) => ({
      question: String(faq?.question || "").trim(),
      answer: String(faq?.answer || "").trim(),
      category: String(faq?.category || "General").trim() || "General",
      status:
        String(faq?.status || "published").toLowerCase() === "unpublished"
          ? "unpublished"
          : "published",
    }))
    .filter((faq) => faq.question && faq.answer);

const sanitizePreChatForm = (preChatForm) => {
  const source =
    preChatForm && typeof preChatForm === "object" ? preChatForm : {};
  const fields = Array.isArray(source.fields)
    ? source.fields
        .map((field) => ({
          label: String(field?.label || "").trim(),
          type: String(field?.type || "text").toLowerCase(),
          required: field?.required !== false,
          placeholder: String(field?.placeholder || "").trim(),
        }))
        .filter((field) => field.label)
    : [];

  return {
    enabled: Boolean(source.enabled),
    fields,
  };
};

const normalizeSuggestedMessagesForForm = (
  suggestedMessages = [],
  faqItems = [],
) => {
  const faqAnswerByQuestion = new Map(
    (Array.isArray(faqItems) ? faqItems : [])
      .map((faq) => ({
        question: String(faq?.question || "")
          .trim()
          .toLowerCase(),
        answer: String(faq?.answer || "").trim(),
      }))
      .filter((faq) => faq.question && faq.answer)
      .map((faq) => [faq.question, faq.answer]),
  );

  return sanitizeSuggestedMessagesFromConfig(suggestedMessages).map((item) => ({
    message: String(item.message || "").trim(),
    answer:
      String(item.answer || "").trim() ||
      faqAnswerByQuestion.get(
        String(item.message || "")
          .trim()
          .toLowerCase(),
      ) ||
      "",
  }));
};

const WidgetEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const widgets = useSelector(selectSuperAdminWidgets);
  const widgetsList = useMemo(
    () => (Array.isArray(widgets) ? widgets : []),
    [widgets],
  );
  const loading = useSelector(selectSuperAdminWidgetsLoading);
  const actionLoading = useSelector(selectSuperAdminWidgetsActionLoading);
  const formSubmissions = useSelector((state) =>
    selectWidgetFormSubmissionsById(state, id),
  );
  const formSubmissionsMeta = useSelector((state) =>
    selectWidgetFormSubmissionsMetaById(state, id),
  );
  const formSubmissionsLoading = useSelector((state) =>
    selectWidgetFormSubmissionsLoadingById(state, id),
  );
  const formSubmissionsError = useSelector((state) =>
    selectWidgetFormSubmissionsErrorById(state, id),
  );

  const [form, setForm] = useState(defaultWidgetTemplateForm);
  const [activeTab, setActiveTab] = useState("general");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [isDirty, setIsDirty] = useState(false);
  const [localError, setLocalError] = useState("");
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const pendingLogoPreviewRef = React.useRef("");

  const showError = (msg) => {
    setLocalError(msg);
    setTimeout(() => setLocalError(""), 5000);
  };

  const widget = useMemo(() => {
    if (!id || widgetsList.length === 0) return null;
    return widgetsList.find((w) => getWidgetTemplateId(w) === id) || null;
  }, [widgetsList, id]);

  const clearPendingLogoSelection = () => {
    if (pendingLogoPreviewRef.current) {
      URL.revokeObjectURL(pendingLogoPreviewRef.current);
      pendingLogoPreviewRef.current = "";
    }
    setPendingLogoFile(null);
  };

  useEffect(() => {
    if (!widgetsList.length) {
      dispatch(fetchSuperAdminWidgets());
    }
  }, [dispatch, widgetsList.length]);

  useEffect(() => {
    if (widget) {
      const normalizedIsLogged =
        typeof widget.isLogged === "boolean"
          ? widget.isLogged
          : Boolean(widget?.preChatForm?.enabled);
      const normalizedFaqItems = sanitizeFaqItems(
        Array.isArray(widget?.faqItems)
          ? widget.faqItems
          : defaultWidgetTemplateForm.faqItems,
      );
      const normalizedSuggestedMessages = normalizeSuggestedMessagesForForm(
        typeof widget?.suggestedMessages !== "undefined"
          ? widget.suggestedMessages
          : defaultWidgetTemplateForm.suggestedMessages,
        normalizedFaqItems,
      );

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        ...defaultWidgetTemplateForm,
        ...widget,
        width: clampWidgetDimension(
          "width",
          widget?.width ?? defaultWidgetTemplateForm.width,
        ),
        height: clampWidgetDimension(
          "height",
          widget?.height ?? defaultWidgetTemplateForm.height,
        ),
        isLogged: normalizedIsLogged,
        allowedUserEmail: "",
        autoReplySuggestions:
          typeof widget?.autoReplySuggestions === "boolean"
            ? widget.autoReplySuggestions
            : true,
        faqItems: normalizedFaqItems,
        suggestedMessages:
          normalizedSuggestedMessages.length > 0
            ? normalizedSuggestedMessages
            : defaultWidgetTemplateForm.suggestedMessages,
      });
      if (pendingLogoPreviewRef.current) {
        URL.revokeObjectURL(pendingLogoPreviewRef.current);
        pendingLogoPreviewRef.current = "";
      }
      setPendingLogoFile(null);
      setIsDirty(false);
    }
  }, [widget]);

  useEffect(
    () => () => {
      if (pendingLogoPreviewRef.current) {
        URL.revokeObjectURL(pendingLogoPreviewRef.current);
        pendingLogoPreviewRef.current = "";
      }
    },
    [],
  );

  useEffect(() => {
    if (!loading && widgetsList.length > 0 && !widget) {
      navigate("/app/widgets");
    }
  }, [loading, widgetsList.length, widget, navigate]);

  useEffect(() => {
    if (!id || activeTab !== "formData") return;
    dispatch(fetchWidgetFormSubmissions({ id }));
  }, [dispatch, id, activeTab]);

  const handleRefreshFormSubmissions = () => {
    if (!id) return;
    dispatch(fetchWidgetFormSubmissions({ id }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "logoUrl") {
      clearPendingLogoSelection();
    }

    const nextValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const nextForm = {
        ...prev,
        [name]: nextValue,
      };

      if (
        name === "preChatForm" &&
        nextValue &&
        typeof nextValue === "object"
      ) {
        nextForm.preChatForm = {
          ...(prev.preChatForm || {}),
          ...nextValue,
        };
      }

      return nextForm;
    });

    setIsDirty(true);
  };

  const handleSave = async () => {
    const widgetName = String(form.name || "").trim();
    if (!widgetName) {
      showError("Widget name is required.");
      return;
    }

    const normalizedPreChatForm = sanitizePreChatForm(form.preChatForm);
    const isAllowUserDetailsEnabled = Boolean(form.isLogged);
    const isFormBuilderEnabled = Boolean(normalizedPreChatForm.enabled);
    if (isAllowUserDetailsEnabled !== isFormBuilderEnabled) {
      if (isAllowUserDetailsEnabled) {
        showError(
          "Allow User Details is enabled. Please enable Form Builder before saving.",
        );
      } else {
        showError(
          "Form Builder is enabled. Please enable Allow User Details before saving.",
        );
      }
      return;
    }
    if (
      normalizedPreChatForm.enabled &&
      normalizedPreChatForm.fields.length === 0
    ) {
      showError(
        "Pre-chat form is enabled, but no valid fields were found. Add at least one field.",
      );
      return;
    }

    const rawFaqItems = Array.isArray(form.faqItems) ? form.faqItems : [];
    const rawSuggestedMessages = Array.isArray(form.suggestedMessages)
      ? form.suggestedMessages
      : [];
    const sanitizedSuggestedMessages =
      sanitizeSuggestedMessagesFromConfig(rawSuggestedMessages);
    if (form.autoReplySuggestions !== false) {
      const hasEmptySuggestedRow = rawSuggestedMessages.some((item) => {
        const message = String(
          typeof item === "string"
            ? item
            : item?.message || item?.text || item?.question || "",
        ).trim();
        const answer = String(
          typeof item === "string" ? "" : item?.answer || item?.reply || "",
        ).trim();
        return !message && !answer;
      });
      if (hasEmptySuggestedRow) {
        showError(
          "Remove empty suggested-message rows or fill both message and answer.",
        );
        return;
      }
      const hasInvalidSuggestedItem = rawSuggestedMessages.some((item) => {
        const message = String(
          typeof item === "string"
            ? item
            : item?.message || item?.text || item?.question || "",
        ).trim();
        const answer = String(
          typeof item === "string" ? "" : item?.answer || item?.reply || "",
        ).trim();
        return Boolean(message || answer) && (!message || !answer);
      });
      if (hasInvalidSuggestedItem) {
        showError(
          "Each suggested message must include both message and auto-reply answer.",
        );
        return;
      }
      if (sanitizedSuggestedMessages.length === 0) {
        showError(
          "Add at least one suggested message when auto-reply is enabled.",
        );
        return;
      }
      const suggestedMessageSet = new Set();
      const hasDuplicateSuggestedMessage = sanitizedSuggestedMessages.some(
        (item) => {
          const key = String(item.message || "")
            .trim()
            .toLowerCase();
          if (!key) return false;
          if (suggestedMessageSet.has(key)) return true;
          suggestedMessageSet.add(key);
          return false;
        },
      );
      if (hasDuplicateSuggestedMessage) {
        showError("Suggested messages must be unique.");
        return;
      }
    }

    if (form.showFaqs !== false) {
      const hasEmptyFaqRow = rawFaqItems.some((faq) => {
        const question = String(faq?.question || "").trim();
        const answer = String(faq?.answer || "").trim();
        return !question && !answer;
      });
      if (hasEmptyFaqRow) {
        showError("Remove empty FAQ rows or fill both question and answer.");
        return;
      }
      const hasInvalidFaqItem = rawFaqItems.some((faq) => {
        const question = String(faq?.question || "").trim();
        const answer = String(faq?.answer || "").trim();
        return Boolean(question || answer) && (!question || !answer);
      });
      if (hasInvalidFaqItem) {
        showError(
          "Each FAQ item must have both question and answer, or be removed.",
        );
        return;
      }
      const faqQuestionSet = new Set();
      const hasDuplicateFaqQuestion = rawFaqItems.some((faq) => {
        const key = String(faq?.question || "")
          .trim()
          .toLowerCase();
        if (!key) return false;
        if (faqQuestionSet.has(key)) return true;
        faqQuestionSet.add(key);
        return false;
      });
      if (hasDuplicateFaqQuestion) {
        showError("FAQ questions must be unique.");
        return;
      }
    }

    const persistableForm = { ...form };
    const widthLimits = WIDGET_SIZE_LIMITS.width;
    const heightLimits = WIDGET_SIZE_LIMITS.height;
    const rawWidth = Number(persistableForm.width);
    const rawHeight = Number(persistableForm.height);
    if (
      !Number.isFinite(rawWidth) ||
      rawWidth < widthLimits.min ||
      rawWidth > widthLimits.max
    ) {
      showError(
        `Width must be between ${widthLimits.min}px and ${widthLimits.max}px. You cannot exceed the min/max limit.`,
      );
      return;
    }
    if (
      !Number.isFinite(rawHeight) ||
      rawHeight < heightLimits.min ||
      rawHeight > heightLimits.max
    ) {
      showError(
        `Height must be between ${heightLimits.min}px and ${heightLimits.max}px. You cannot exceed the min/max limit.`,
      );
      return;
    }
    persistableForm.width = clampWidgetDimension(
      "width",
      persistableForm.width,
    );
    persistableForm.height = clampWidgetDimension(
      "height",
      persistableForm.height,
    );
    try {
      let nextLogoUrl = String(persistableForm.logoUrl || "").trim();
      if (pendingLogoFile) {
        const logoUpload = await dispatch(
          uploadWidgetLogo({ id, file: pendingLogoFile }),
        ).unwrap();
        nextLogoUrl = String(logoUpload?.logoUrl || "").trim();
      }

      const sanitizedUpdates = {
        ...persistableForm,
        name: widgetName,
        subtitle: String(persistableForm.subtitle || "").trim(),
        logoUrl: nextLogoUrl,
        isLogged: Boolean(form.isLogged),
        autoReplySuggestions: form.autoReplySuggestions !== false,
        showFaqs: form.showFaqs !== false,
        allowedUserEmail: "",
        suggestedMessages: sanitizedSuggestedMessages,
        faqItems: sanitizeFaqItems(rawFaqItems),
        preChatForm: normalizedPreChatForm,
      };

      await dispatch(
        updateSuperAdminWidget({ id, updates: sanitizedUpdates }),
      ).unwrap();
      setForm((prev) => ({ ...prev, ...sanitizedUpdates }));
      clearPendingLogoSelection();
      setIsDirty(false);
    } catch (err) {
      console.error("Save failed", err);
      showError("Failed to save changes. Please try again.");
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all settings to factory defaults?")) {
      clearPendingLogoSelection();
      setForm({
        ...defaultWidgetTemplateForm,
        name: widget?.name || defaultWidgetTemplateForm.name,
      });
      setIsDirty(true);
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Discard unsaved changes?")) {
      navigate("/app/widgets");
    }
  };

  const handleLogoUpload = (file) => {
    if (!file) return;
    clearPendingLogoSelection();
    const previewUrl = URL.createObjectURL(file);
    pendingLogoPreviewRef.current = previewUrl;
    setPendingLogoFile(file);
    setForm((prev) => ({ ...prev, logoUrl: previewUrl }));
    setIsDirty(true);
  };

  const handleDimensionBlur = (dimension) => {
    if (dimension !== "width" && dimension !== "height") return;
    const limits = WIDGET_SIZE_LIMITS[dimension];
    const rawValue = String(form?.[dimension] || "").trim();
    if (!rawValue) {
      setForm((prev) => ({
        ...prev,
        [dimension]: clampWidgetDimension(dimension, prev?.[dimension]),
      }));
      return;
    }
    const numericValue = Number(rawValue);
    if (
      Number.isFinite(numericValue) &&
      (numericValue < limits.min || numericValue > limits.max)
    ) {
      const label = dimension === "width" ? "Width" : "Height";
      showError(
        `${label} must be between ${limits.min}px and ${limits.max}px. You cannot exceed the min/max limit.`,
      );
    }
    setForm((prev) => ({
      ...prev,
      [dimension]: clampWidgetDimension(dimension, prev?.[dimension]),
    }));
  };

  const handleResetLogo = () => {
    const baselineLogoUrl = String(widget?.logoUrl || "");
    if (String(form.logoUrl || "") === baselineLogoUrl && !pendingLogoFile) {
      return;
    }
    clearPendingLogoSelection();
    setForm((prev) => ({ ...prev, logoUrl: baselineLogoUrl }));
    setIsDirty(true);
  };

  if (loading && !widget) {
    return <CustomLoader message="Loading Widget Editor..." />;
  }

  if (!widget && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-slate-500 font-medium">Widget not found.</p>
        <button
          onClick={() => navigate("/app/widgets")}
          className="text-primary font-semibold hover:underline"
        >
          Go back to widgets
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen theme-surface-muted overflow-hidden">
      {/* Header */}
      <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/app/widgets")}
            className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {form.name || "Untitled Widget"} Editor
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600 uppercase tracking-wider border border-emerald-100">
                Pro Builder
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {isDirty ? "Unsaved changes" : "All changes saved"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Discard
          </button>

          <button
            onClick={handleSave}
            disabled={actionLoading || !isDirty}
            className="px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-sm"
          >
            <Save size={14} />
            {actionLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden relative">
        {localError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
            <ErrorBox
              error={localError}
              className="shadow-xl shadow-red-500/10 pointer-events-auto"
            />
          </div>
        )}
        <WidgetEditorSidebar
          form={form}
          setForm={setForm}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          formSubmissions={formSubmissions}
          formSubmissionsMeta={formSubmissionsMeta}
          formSubmissionsLoading={formSubmissionsLoading}
          formSubmissionsError={formSubmissionsError}
          onRefreshFormSubmissions={handleRefreshFormSubmissions}
          onChange={handleChange}
          onLogoUpload={handleLogoUpload}
          onResetLogo={handleResetLogo}
          onDimensionBlur={handleDimensionBlur}
          uploadLoading={actionLoading}
          savedLogoUrl={widget?.logoUrl || ""}
        />

        <WidgetPreview
          form={form}
          device={previewDevice}
          setDevice={setPreviewDevice}
          onReset={handleReset}
        />
      </div>
    </div>
  );
};

export default WidgetEditorPage;
