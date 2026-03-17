import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import chatReducer from "../features/chat/chatSlice";
import teamReducer from "../features/team/teamSlice";
import userReducer from "../features/user/userSlice";
import adminUsersReducer from "../features/adminUsers/adminUsersSlice";
import billingReducer from "../features/billing/billingSlice";
import superAdminReducer from "../features/superAdmin/superAdminSlice";
import analyticsReducer from "../features/analytics/analyticsSlice";
import widgetSettingsReducer from "../features/widgetSettings/widgetSettingsSlice";
import superAdminWidgetsReducer from "../features/superAdminWidgets/superAdminWidgetsSlice";
import faqReducer from "../features/faqs/faqSlice";
import automationReducer from "../features/automation/automationSlice";
import integrationReducer from "../features/integrations/integrationSlice";

export const store = configureStore({
  reducer: {
    // Auth Reducer
    auth: authReducer,
    // Chat Reducer
    chat: chatReducer,
    // Team Reducer
    team: teamReducer,
    // User Reducer
    user: userReducer,
    // Admin User Management
    adminUsers: adminUsersReducer,
    // Billing
    billing: billingReducer,
    // Super Admin
    superAdmin: superAdminReducer,
    // Analytics
    analytics: analyticsReducer,
    // Widget settings
    widgetSettings: widgetSettingsReducer,
    // Super admin widgets
    superAdminWidgets: superAdminWidgetsReducer,
    // FAQs
    faqs: faqReducer,
    // Automation and workflows
    automation: automationReducer,
    // Integrations
    integrations: integrationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
