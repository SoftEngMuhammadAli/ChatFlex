import { Edit3, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getWidgetTemplateId } from "../../utils/widgetConfig";

const WidgetTemplateCard = ({ widget, onCopyScript, onDeleteScript }) => {
  const navigate = useNavigate();
  const widgetId = getWidgetTemplateId(widget);

  return (
    <article
      key={widgetId}
      className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {widget.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {widget.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(`/app/widget-editor/${widgetId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 shadow-sm shadow-emerald-700/20"
          >
            <Settings2 size={13} />
            {/* Edit Widget */}
            Edit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1 space-y-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Position</span>
          <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
            {widget.position}
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Size</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {widget.width} x {widget.height}
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Brand</span>
          <span className="flex max-w-full items-center gap-2 font-medium text-slate-900 dark:text-slate-100 break-all">
            <span
              className="inline-block h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600"
              style={{ backgroundColor: widget.brandColor }}
            />
            {widget.brandColor}
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">
            Allowed User
          </span>
          <span className="ml-2 max-w-full break-all font-medium text-slate-900 dark:text-slate-100 text-right">
            {widget.allowedUserEmail || "Any"}
          </span>
        </div>

        <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {widget.welcomeMessage}
        </div>
      </div>

      {/* Buttons (Now Properly at Bottom) */}
      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
        <button
          onClick={() => onCopyScript(widget)}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Copy Script
        </button>

        <button
          onClick={() => onDeleteScript(widget)}
          className="flex-1 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>
    </article>
  );
};

export default WidgetTemplateCard;
