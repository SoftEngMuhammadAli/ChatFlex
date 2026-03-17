// components/faq/FAQForm.jsx
import React from "react";
import { X } from "lucide-react";

const FAQForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onChange,
  isSubmitting,
  mode, // 'create' or 'edit'
}) => {
  if (!isOpen) return null;

  const inputCls =
    "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 transition-all";
  const labelCls =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {mode === "create" ? "Add New FAQ" : "Edit FAQ"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Question *</label>
          <input
            type="text"
            name="question"
            value={formData.question}
            onChange={onChange}
            placeholder="e.g. How do I reset my password?"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Answer *</label>
          <textarea
            name="answer"
            value={formData.answer}
            onChange={onChange}
            rows={4}
            placeholder="Provide a clear, helpful answer..."
            className={`${inputCls} resize-none`}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category (optional)</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={onChange}
              placeholder="e.g. Billing, Support..."
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={onChange}
              className={inputCls}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm disabled:opacity-60 transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create FAQ"
                : "Update FAQ"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FAQForm;
