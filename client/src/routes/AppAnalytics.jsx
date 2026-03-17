import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import SuperAdminAnalyticsPage from "../pages/super-admin/AnalyticsPage";

const AppAnalytics = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "owner" || role === "admin" || role === "super-admin") {
    return <SuperAdminAnalyticsPage />;
  }

  return <Navigate to="/app" replace />;
};

export default AppAnalytics;
