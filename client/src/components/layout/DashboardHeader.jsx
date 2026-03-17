import React from "react";
import { Circle } from "lucide-react";

const DashboardHeader = ({
  title,
  subtitle,
  statusLabel = "Active",
  children,
  divider = true,
}) => {
  return (
    <div className="mb-8 mt-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
        {/* Left Section */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {statusLabel && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-xs font-medium rounded-sm border border-emerald-200 dark:border-emerald-500/30">
              <Circle size={8} fill="currentColor" className="animate-pulse" />
              {statusLabel}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Optional Divider */}
      {divider && (
        <div className="mt-6 border-b border-slate-200 dark:border-slate-800" />
      )}
    </div>
  );
};

export default DashboardHeader;
