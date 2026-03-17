import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Menu, X } from "lucide-react";

import { selectUser, setSessionUser } from "../../features/auth/authSlice";
import { fetchCurrentUserProfile } from "../../features/user/userSlice";
import {
  updateMemberStatusLocal,
  fetchTeamMembers,
  setOnlineUsersLocal,
  setPresenceSnapshotLocal,
} from "../../features/team/teamSlice";

import socket from "../../api/socket";
import Sidebar from "./Sidebar";
import UserAvatar from "../ui/UserAvatar";

const PAGE_LABELS = {
  app: "Dashboard",
  inbox: "Inbox",
  team: "Team",
  users: "Users",
  settings: "Settings",
  widget: "Widget",
  widgets: "Widgets",
  analytics: "Analytics",
  billing: "Billing",
};

const getRouteLabel = (pathname = "") => {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  if (normalized.includes("/widget-editor/")) return "Widget Editor";
  const segment = normalized.split("/").filter(Boolean).pop() || "app";
  if (PAGE_LABELS[segment]) return PAGE_LABELS[segment];
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const DashboardLayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const currentUser = useSelector(selectUser);
  const currentUserId = String(currentUser?.id || currentUser?._id || "");

  const pageLabel = useMemo(
    () => getRouteLabel(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;

    dispatch(fetchCurrentUserProfile())
      .unwrap()
      .then((profile) => {
        if (cancelled || !profile) return;
        dispatch(setSessionUser(profile));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentUserId, dispatch]);

  useEffect(() => {
    if (!currentUserId) return;

    dispatch(fetchTeamMembers());

    socket.connect();

    const onConnect = () => {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        "";
      socket.emit("join", {
        userId: currentUserId,
        token,
      });
    };

    const handleStatusChange = ({ userId, status }) => {
      dispatch(updateMemberStatusLocal({ userId, status }));
    };

    const handleOnlineUsersList = (onlineUsers) => {
      dispatch(setOnlineUsersLocal(onlineUsers));
    };

    const handlePresenceSnapshot = (snapshot) => {
      dispatch(setPresenceSnapshotLocal(snapshot));
    };

    socket.on("connect", onConnect);
    socket.on("user_status_change", handleStatusChange);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("presence_snapshot", handlePresenceSnapshot);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("user_status_change", handleStatusChange);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("presence_snapshot", handlePresenceSnapshot);
    };
  }, [currentUserId, dispatch]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen]);

  return (
    <div className="relative min-h-screen overflow-x-hidden theme-app">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-16 h-80 w-80 rounded-full bg-sky-400/8 blur-3xl" />
        <div className="absolute top-24 right-0 h-72 w-72 rounded-full bg-emerald-400/8 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="hidden lg:block fixed left-0 top-0 h-screen w-[280px] z-30">
          <Sidebar />
        </div>

        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 lg:hidden ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onNavigate={() => setIsMobileSidebarOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 lg:pl-[280px]">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/76 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/72">
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 shadow-sm lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  {isMobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                </button>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    ChatFlex Workspace
                  </p>
                  <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-[1.45rem]">
                    {pageLabel}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 px-2 py-1.5 shadow-sm">
                  <UserAvatar
                    name={currentUser?.name}
                    src={currentUser?.profilePictureUrl}
                    sizeClass="h-8 w-8"
                    textClass="text-xs"
                    className="rounded-lg"
                    fallbackClassName="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {currentUser?.name || "User"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {String(currentUser?.role || "member").replace("-", " ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 pb-6 md:pb-8">
            <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 md:px-6 md:pt-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
