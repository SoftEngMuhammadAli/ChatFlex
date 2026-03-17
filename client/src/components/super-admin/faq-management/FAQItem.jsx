import React from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  GripVertical,
  History,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const FAQItem = ({
  faq,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onVersions,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border ${isDragging ? "border-emerald-500 shadow-md" : "border-slate-200 dark:border-slate-800"} bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors`}
    >
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer group hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
        onClick={onToggle}
      >
        <div
          {...attributes}
          {...listeners}
          className="mr-3 cursor-grab text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">
            {faq.question}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {faq.category ? `Category: ${faq.category} - ` : ""}
            <span
              className={`font-medium ${faq.status === "published" ? "text-emerald-600" : "text-amber-500"}`}
            >
              {faq.status === "published" ? "Published" : "Draft"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(faq);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVersions?.(faq);
            }}
            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            title="Version history"
          >
            <History size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(faq._id);
            }}
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-300 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
          {isExpanded ? (
            <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {faq.answer}
        </div>
      )}
    </div>
  );
};

export default FAQItem;
