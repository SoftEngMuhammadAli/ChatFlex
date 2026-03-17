import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import OwnerHomePage from "../pages/home/OwnerHomePage";
import SuperAdminHomePage from "../pages/home/SuperAdminHomePage";

const AppHome = () => {
  const user = useSelector(selectUser);
  const role = String(user?.role || "").toLowerCase();

  if (role === "super-admin") return <SuperAdminHomePage />;
  if (role === "admin") return <Navigate to="/app/users" replace />;
  if (role === "owner") return <OwnerHomePage />;
  if (role === "agent") return <Navigate to="/app/inbox" replace />;
  if (role === "viewer") return <Navigate to="/app/settings" replace />;

  return <Navigate to="/login" replace />;
};

export default AppHome;
