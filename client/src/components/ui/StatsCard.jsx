import React from "react";
import { ArrowUpRight } from "lucide-react";

const StatsCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-400 group-hover:text-primary group-hover:border-primary/20 transition-colors">
            {Icon ? <Icon size={20} /> : null}
          </div>
          {trend && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
              {trend}
              <ArrowUpRight size={10} />
            </div>
          )}
        </div>
        <h3 className="text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
};

export default StatsCard;
