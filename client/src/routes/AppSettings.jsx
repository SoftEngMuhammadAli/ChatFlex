import React from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import OwnerSettingsPage from "../pages/settings/OwnerSettingsPage";
import AdminSettingsPage from "../pages/settings/AdminSettingsPage";
import AgentSettingsPage from "../pages/settings/AgentSettingsPage";
import SuperAdminSettingsPage from "../pages/settings/SuperAdminSettingsPage";

const AppSettings = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "super-admin") return <SuperAdminSettingsPage />;
  if (role === "admin") return <AdminSettingsPage />;
  if (role === "agent") return <AgentSettingsPage />;

  return <OwnerSettingsPage />;
};

export default AppSettings;
