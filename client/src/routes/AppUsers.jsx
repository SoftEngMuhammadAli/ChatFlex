import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import UsersPage from "../pages/users/UsersPage";
import UsersManagementPage from "../pages/super-admin/users/UsersManagementPage";

const AppUsers = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "super-admin") return <UsersManagementPage />;
  if (role === "owner" || role === "admin") return <UsersPage />;

  return <Navigate to="/app" replace />;
};

export default AppUsers;
