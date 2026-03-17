import {
  Home,
  MessageSquare,
  Settings,
  Users,
  PieChart,
  CreditCard,
  HelpCircle,
  Workflow,
  Plug,
} from "lucide-react";

/* ---------------------------------- */
/* Role-Based Navigation Config       */
/* ---------------------------------- */
export const getNavItemsByRole = (role) => {
  switch (role) {
    case "agent":
      return [
        { name: "Inbox", icon: MessageSquare, path: "/app/inbox", end: true },
        { name: "Settings", icon: Settings, path: "/app/settings", end: true },
      ];

    case "super-admin":
      return [
        { name: "Dashboard", icon: Home, path: "/app", end: true },
        { name: "Users", icon: Users, path: "/app/users" },
        { name: "Widgets", icon: MessageSquare, path: "/app/widgets" },
        { name: "FAQs", icon: HelpCircle, path: "/app/faqs" },
        { name: "Automation", icon: Workflow, path: "/app/automation" },
        { name: "Integrations", icon: Plug, path: "/app/integrations" },
        { name: "Analytics", icon: PieChart, path: "/app/analytics" },
        { name: "Billing", icon: CreditCard, path: "/app/billing" },
        { name: "Settings", icon: Settings, path: "/app/settings" },
      ];

    case "admin":
      return [
        { name: "Dashboard", icon: Home, path: "/app", end: true },
        { name: "Inbox", icon: MessageSquare, path: "/app/inbox" },
        { name: "Team", icon: Users, path: "/app/team" },
        { name: "Widget", icon: MessageSquare, path: "/app/widget" },
        { name: "FAQs", icon: HelpCircle, path: "/app/faqs" },
        { name: "Automation", icon: Workflow, path: "/app/automation" },
        { name: "Integrations", icon: Plug, path: "/app/integrations" },
        { name: "Analytics", icon: PieChart, path: "/app/analytics" },
        { name: "Settings", icon: Settings, path: "/app/settings" },
      ];

    case "viewer":
      return [
        { name: "Settings", icon: Settings, path: "/app/settings", end: true },
      ];

    default:
      return [
        { name: "Dashboard", icon: Home, path: "/app", end: true },
        { name: "Inbox", icon: MessageSquare, path: "/app/inbox" },
        { name: "Team", icon: Users, path: "/app/team" },
        { name: "Widget", icon: MessageSquare, path: "/app/widget" },
        { name: "FAQs", icon: HelpCircle, path: "/app/faqs" },
        { name: "Automation", icon: Workflow, path: "/app/automation" },
        { name: "Integrations", icon: Plug, path: "/app/integrations" },
        { name: "Analytics", icon: PieChart, path: "/app/analytics" },
        { name: "Billing", icon: CreditCard, path: "/app/billing" },
        { name: "Settings", icon: Settings, path: "/app/settings" },
      ];
  }
};
