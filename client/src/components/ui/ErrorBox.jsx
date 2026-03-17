import React from "react";
import { AlertCircle } from "lucide-react";

const ErrorBox = ({ error, className = "" }) => {
  if (!error) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-[20px] border border-red-200/70 bg-red-50/85 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-400/18 dark:bg-red-500/10 dark:text-red-300 ${className}`}
    >
      <AlertCircle size={18} className="shrink-0" />
      <span>{error}</span>
    </div>
  );
};

export default ErrorBox;
