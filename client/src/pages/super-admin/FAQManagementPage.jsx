import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Download, Search, Upload, Plus, X } from "lucide-react";
import FAQForm from "../../components/super-admin/faq-management/FAQForm";
import FAQList from "../../components/super-admin/faq-management/FAQList";
import {
  clearFaqMessages,
  createFaq,
  deleteFaq,
  exportFaqCsv,
  fetchFaqVersions,
  fetchFaqs,
  importFaqCsv,
  selectFaqCsvLoading,
  selectFaqVersionsById,
  selectFaqVersionsLoadingById,
  selectFaqs,
  selectFaqsActionLoading,
  selectFaqsError,
  selectFaqsLoading,
  selectFaqsSuccess,
  updateFaq,
} from "../../features/faqs/faqSlice";

const emptyFormState = {
  question: "",
  answer: "",
  category: "",
  status: "published",
};

const sortByOrder = (a, b) => {
  const aOrder = Number(a?.order || 0);
  const bOrder = Number(b?.order || 0);
  if (aOrder !== bOrder) return aOrder - bOrder;
  return String(a?._id || "").localeCompare(String(b?._id || ""));
};

const FAQManagementPage = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const faqs = useSelector(selectFaqs);
  const loading = useSelector(selectFaqsLoading);
  const actionLoading = useSelector(selectFaqsActionLoading);
  const csvLoading = useSelector(selectFaqCsvLoading);
  const error = useSelector(selectFaqsError);
  const successMessage = useSelector(selectFaqsSuccess);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [editingFaqId, setEditingFaqId] = useState("");
  const [formData, setFormData] = useState(emptyFormState);
  const [versionsFaqId, setVersionsFaqId] = useState("");

  const versions = useSelector((state) => selectFaqVersionsById(state, versionsFaqId));
  const versionsLoading = useSelector((state) =>
    selectFaqVersionsLoadingById(state, versionsFaqId),
  );

  useEffect(() => {
    dispatch(fetchFaqs());
    return () => {
      dispatch(clearFaqMessages());
    };
  }, [dispatch]);

  const categories = useMemo(() => {
    const set = new Set();
    faqs.forEach((faq) => {
      const value = String(faq?.category || "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    const query = String(searchQuery || "").trim().toLowerCase();
    return [...faqs]
      .sort(sortByOrder)
      .filter((faq) => {
        const status = String(faq?.status || "published");
        const category = String(faq?.category || "").trim();

        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (categoryFilter !== "all" && category !== categoryFilter) return false;

        if (!query) return true;
        return (
          String(faq?.question || "").toLowerCase().includes(query) ||
          String(faq?.answer || "").toLowerCase().includes(query) ||
          category.toLowerCase().includes(query)
        );
      });
  }, [faqs, searchQuery, statusFilter, categoryFilter]);

  const openCreateModal = () => {
    setMode("create");
    setEditingFaqId("");
    setFormData(emptyFormState);
    setIsFormOpen(true);
  };

  const openEditModal = (faq) => {
    setMode("edit");
    setEditingFaqId(String(faq?._id || ""));
    setFormData({
      question: String(faq?.question || ""),
      answer: String(faq?.answer || ""),
      category: String(faq?.category || ""),
      status: String(faq?.status || "published"),
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingFaqId("");
    setFormData(emptyFormState);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (mode === "create") {
      await dispatch(createFaq(formData)).unwrap();
      closeFormModal();
      return;
    }

    if (!editingFaqId) return;
    await dispatch(updateFaq({ id: editingFaqId, updates: formData })).unwrap();
    closeFormModal();
  };

  const handleDelete = async (faqId) => {
    if (!faqId) return;
    const confirmed = window.confirm("Delete this FAQ?");
    if (!confirmed) return;
    await dispatch(deleteFaq(faqId)).unwrap();
  };

  const handleExportCsv = async () => {
    const csv = await dispatch(exportFaqCsv()).unwrap();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "faqs.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      await dispatch(importFaqCsv(content)).unwrap();
      await dispatch(fetchFaqs());
    } finally {
      event.target.value = "";
    }
  };

  const handleViewVersions = async (faq) => {
    const faqId = String(faq?._id || "");
    if (!faqId) return;
    setVersionsFaqId(faqId);
    await dispatch(fetchFaqVersions(faqId));
  };

  const closeVersions = () => {
    setVersionsFaqId("");
  };

  return (
    <div className="theme-page animate-in fade-in duration-500 pb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          FAQ Management
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsv}
          />
          <button
            type="button"
            onClick={handleImportClick}
            disabled={csvLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <Upload size={14} />
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={csvLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
          >
            <Plus size={14} />
            Add FAQ
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search FAQs..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <FAQList
        faqs={filteredFaqs}
        expandedId={expandedId}
        onToggle={(faqId) => setExpandedId((prev) => (prev === faqId ? null : faqId))}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onVersions={handleViewVersions}
        isLoading={loading}
      />

      <FAQForm
        isOpen={isFormOpen}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        formData={formData}
        onChange={handleFormChange}
        isSubmitting={actionLoading}
        mode={mode}
      />

      {versionsFaqId ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                FAQ Version History
              </h3>
              <button
                type="button"
                onClick={closeVersions}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto custom-scrollbar p-5 space-y-3">
              {versionsLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Loading versions...
                </p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No versions available.
                </p>
              ) : (
                versions
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={`${entry.version}-${index}`}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Version {Number(entry.version || 1)}
                          {entry.isCurrent ? " (Current)" : ""}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(entry.changedAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {entry.question}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {entry.answer}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Category: {entry.category || "General"} | Status:{" "}
                        {String(entry.status || "published")}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FAQManagementPage;
