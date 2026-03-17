import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import CustomLoader from "../components/ui/Loader";

const LoginPage = lazy(() => import("../pages/auth/Login"));
const RegisterPage = lazy(() => import("../pages/auth/Register"));
const VerifyEmail = lazy(() => import("../pages/auth/VerifyEmail"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPassword"));
const AcceptTeamInvite = lazy(() => import("../pages/team/AcceptTeamInvite"));
const RoleBasedRoutingAccess = lazy(() => import("./RoleBaseRoutingAccess"));
const DashboardLayout = lazy(
  () => import("../components/layout/DashboardLayout"),
);
const InboxPage = lazy(() => import("../pages/inbox/InboxPage"));
const WidgetEditorPage = lazy(() => import("../pages/widget/WidgetEditorPage"));
const WidgetsPage = lazy(() => import("../pages/widget/WidgetsPage"));
const AppHome = lazy(() => import("./AppHome"));
const AppUsers = lazy(() => import("./AppUsers"));
const AppSettings = lazy(() => import("./AppSettings"));
const AppAnalytics = lazy(() => import("./AppAnalytics"));
const AppBilling = lazy(() => import("./AppBilling"));
const AppFaq = lazy(() => import("./AppFaq"));
const AppAutomation = lazy(() => import("./AppAutomation"));
const AppIntegrations = lazy(() => import("./AppIntegrations"));
const TeamPage = lazy(() => import("../pages/team/TeamPage"));

const RouteFallback = () => (
  <CustomLoader fullPage={true} />
);

const lazyElement = (element) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

const MainRouteIndex = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={lazyElement(<LoginPage />)} />
        <Route path="/register" element={lazyElement(<RegisterPage />)} />
        <Route path="/verify-email" element={lazyElement(<VerifyEmail />)} />
        <Route
          path="/team-invite/accept"
          element={lazyElement(<AcceptTeamInvite />)}
        />
        <Route
          path="/forgot-password"
          element={lazyElement(<ForgotPasswordPage />)}
        />
        <Route
          path="/reset-password"
          element={lazyElement(<ResetPasswordPage />)}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              {lazyElement(<RoleBasedRoutingAccess />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>{lazyElement(<DashboardLayout />)}</ProtectedRoute>
          }
        >
          <Route index element={lazyElement(<AppHome />)} />
          <Route
            path="inbox"
            element={
              <ProtectedRoute
                allowedRoles={["owner", "admin", "agent", "super-admin"]}
              >
                {lazyElement(<InboxPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="team"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<TeamPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<AppUsers />)}
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={lazyElement(<AppSettings />)} />
          <Route
            path="widget"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<WidgetsPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="widgets"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<WidgetsPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="widget-editor/:id"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<WidgetEditorPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="analytics"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<AppAnalytics />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="faqs"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<AppFaq />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="automation"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<AppAutomation />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="integrations"
            element={
              <ProtectedRoute allowedRoles={["owner", "admin", "super-admin"]}>
                {lazyElement(<AppIntegrations />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="billing"
            element={
              <ProtectedRoute allowedRoles={["owner", "super-admin"]}>
                {lazyElement(<AppBilling />)}
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="/chat" element={<Navigate to="/app" replace />} />
        <Route path="/team" element={<Navigate to="/app/team" replace />} />
        <Route path="/dashboard/*" element={<Navigate to="/app" replace />} />
        <Route path="/agent/*" element={<Navigate to="/app/inbox" replace />} />
        <Route path="/admin/*" element={<Navigate to="/app" replace />} />
        <Route path="/super-admin/*" element={<Navigate to="/app" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouteIndex;
