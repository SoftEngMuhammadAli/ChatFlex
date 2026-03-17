import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import { Navigate } from "react-router-dom";

const RoleBasedRoutingAccess = () => {
  const user = useSelector(selectUser);
  if (!user?.role) {
    return <Navigate to="/login" />;
  }
  const role = String(user.role || "").toLowerCase();
  if (role === "agent") return <Navigate to="/app/inbox" replace />;
  if (role === "viewer") return <Navigate to="/app/settings" replace />;
  return <Navigate to="/app" replace />;
};

export default RoleBasedRoutingAccess;
