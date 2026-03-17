import React from "react";
import { Users, Cpu, MessageSquare, Activity } from "lucide-react";
import StatCard from "./StatCard";

const StatsGrid = ({ summary }) => {
  const tokenFormatted = summary?.aiTokensUsed?.toLocaleString() || "0";

  const userActivityRate =
    summary?.totalUsers > 0
      ? ((summary?.activeUsers / summary?.totalUsers) * 100).toFixed(1)
      : "0";

  const stats = [
    {
      label: "Total Users",
      value: summary?.totalUsers,
      sub: `${userActivityRate}% Active`,
      icon: Users,
      color: "indigo",
    },
    {
      label: "AI Tokens",
      value: tokenFormatted,
      sub: "Global usage",
      icon: Cpu,
      color: "cyan",
    },
    {
      label: "Conversations",
      value: summary?.totalConversations,
      sub: "All time",
      icon: MessageSquare,
      color: "emerald",
    },
    {
      label: "Avg Messages",
      value: Math.round(
        summary?.totalMessages / (summary?.totalConversations || 1),
      ),
      sub: "Per session",
      icon: Activity,
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
};

export default StatsGrid;
