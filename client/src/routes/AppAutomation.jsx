import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import AutomationPage from "../pages/super-admin/AutomationPage";

const AppAutomation = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "owner" || role === "admin" || role === "super-admin") {
    return <AutomationPage />;
  }

  return <Navigate to="/app" replace />;
};

export default AppAutomation;
