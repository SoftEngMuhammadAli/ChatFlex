import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import SuperAdminBillingPage from "../pages/super-admin/BillingPage";

const AppBilling = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "owner" || role === "super-admin") {
    return <SuperAdminBillingPage />;
  }

  return <Navigate to="/app" replace />;
};

export default AppBilling;
