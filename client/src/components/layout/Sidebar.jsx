import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MessageSquare, X, Radio, ArrowUpRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import LogoutButton from "../ui/LogoutButton";
import { logout, selectUser } from "../../features/auth/authSlice";
import { stopWorkspaceImpersonation } from "../../features/superAdmin/superAdminSlice";
import UserAvatar from "../ui/UserAvatar";
import { getNavItemsByRole } from "../ui/nav/NavConfig";
import { NavItem } from "../ui/nav/NavItem";
import ThemeToggleButton from "../ui/ThemeToggleButton";

const Sidebar = ({ className = "", onNavigate }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  const [logoutOpen, setLogoutOpen] = useState(false);

  const navItems = getNavItemsByRole(user?.role);

  const openLogoutDialog = () => setLogoutOpen(true);
  const closeLogoutDialog = () => setLogoutOpen(false);

  const confirmLogout = () => {
    dispatch(logout());
    setLogoutOpen(false);
    navigate("/login");
  };

  const handleStopImpersonation = async () => {
    try {
      await dispatch(stopWorkspaceImpersonation()).unwrap();
      navigate("/app", { replace: true });
    } catch (_error) {
      // Keep current session if stop fails.
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setLogoutOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace("-", " ")
    : "User";

  return (
    <>
      <aside
        className={`h-screen shrink-0 overflow-hidden md:sticky md:top-0 ${className}`}
      >
        <div className="theme-shell-panel flex h-full flex-col rounded-none border-r border-l-0 border-y-0 px-4 py-4 md:rounded-none md:px-5 md:py-5">
          <div className="theme-sidebar-brand relative overflow-hidden rounded-md p-4 shadow-sm">
            <div className="theme-sidebar-brand-glow absolute right-0 top-0 h-24 w-24 rounded-md blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="theme-sidebar-brand-icon flex h-11 w-11 items-center justify-center rounded-md">
                  <MessageSquare size={18} />
                </div>

                <div className="min-w-0">
                  <p className="theme-sidebar-brand-title truncate text-[20px] font-bold tracking-tight">
                    ChatFlex
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-slate-200/80 dark:bg-slate-800/80"></div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar smart-y-scroll px-1 py-5">
            <div className="space-y-2">
              {navItems.map((item) => (
                <NavItem key={item.name} item={item} onClick={onNavigate} />
              ))}
            </div>
          </nav>

          <div className="space-y-3 border-t border-slate-200/80 px-1 pt-4 dark:border-slate-800/80">
            <ThemeToggleButton className="w-full !justify-center !px-4 !py-3 !text-xs !font-bold" />

            <div className="rounded-[24px] border border-slate-200/80 bg-white/60 p-3 dark:border-slate-700/80 dark:bg-slate-900/38">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={user?.name}
                  src={user?.profilePictureUrl}
                  sizeClass="h-11 w-11"
                  textClass="text-sm"
                  className="rounded-[16px] border border-white/60 dark:border-white/6"
                  fallbackClassName="bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                    {user?.name || "User"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.email || roleLabel}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Sign out"
                  onClick={openLogoutDialog}
                  className="rounded-[16px] p-2.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                >
                  <LogOut size={18} />
                </button>
              </div>

              {user?.isImpersonating ? (
                <button
                  type="button"
                  onClick={handleStopImpersonation}
                  className="mt-3 w-full rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                >
                  Exit Impersonation
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      {logoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirm Logout
              </h3>

              <button
                type="button"
                onClick={closeLogoutDialog}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to sign out?
            </p>

            <LogoutButton
              closeLogoutDialog={closeLogoutDialog}
              confirmLogout={confirmLogout}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
