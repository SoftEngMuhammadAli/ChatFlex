import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import FAQManagementPage from "../pages/super-admin/FAQManagementPage";

const AppFaq = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "owner" || role === "admin" || role === "super-admin") {
    return <FAQManagementPage />;
  }

  return <Navigate to="/app" replace />;
};

export default AppFaq;
