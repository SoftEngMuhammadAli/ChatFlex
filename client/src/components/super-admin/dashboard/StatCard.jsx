import React from "react";
import { TrendingUp } from "lucide-react";

const COLOR_STYLES = {
  indigo: {
    orb: "bg-indigo-500/10 dark:bg-indigo-400/15",
    iconWrap:
      "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  },
  cyan: {
    orb: "bg-cyan-500/10 dark:bg-cyan-400/15",
    iconWrap:
      "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  },
  emerald: {
    orb: "bg-emerald-500/10 dark:bg-emerald-400/15",
    iconWrap:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  amber: {
    orb: "bg-amber-500/10 dark:bg-amber-400/15",
    iconWrap:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
};

const StatCard = ({ label, value, sub, icon, color = "indigo" }) => {
  const palette = COLOR_STYLES[color] || COLOR_STYLES.indigo;

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:shadow-slate-950/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className={`absolute -right-5 -top-5 w-24 h-24 rounded-full ${palette.orb} group-hover:scale-125 transition-transform duration-500`} />

      <div className="relative z-10 space-y-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${palette.iconWrap} transition-colors`}>
          {icon ? React.createElement(icon, { size: 28 }) : null}
        </div>

        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {label}
          </p>

          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter mt-1">
              {value || 0}
            </h3>

            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp size={12} />
              +4%
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            {sub}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
