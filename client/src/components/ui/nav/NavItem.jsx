import React from "react";
import { NavLink, useLocation } from "react-router-dom";

export const NavItem = ({ item, onClick }) => {
  const location = useLocation();

  const isActive = item.end
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-semibold transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10 text-slate-900 dark:text-slate-100 border border-emerald-100/80 dark:border-emerald-500/25"
          : "text-slate-600 dark:text-slate-300 border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100"
      }`}
    >
      {/* Active indicator */}
      <span
        className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full ${
          isActive ? "bg-emerald-500" : "opacity-0"
        }`}
      />

      <item.icon
        size={20}
        className={`${
          isActive
            ? "text-emerald-600 dark:text-emerald-300"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      />

      <span className="ml-2">{item.name}</span>
    </NavLink>
  );
};
