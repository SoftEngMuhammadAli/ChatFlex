import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Users, Shield, Clock } from "lucide-react";
import { selectUser } from "../../features/auth/authSlice";
import { fetchTeamMembers } from "../../features/team/teamSlice";

// Components
import StatsCard from "../../components/ui/StatsCard";
import AgentRosterTable from "../../components/owner/AgentRosterTable";
import OwnerWelcomeBanner from "../../components/owner/OwnerWelcomeBanner";

const OwnerHomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector(selectUser);
  const { members = [] } = useSelector((state) => state.team);
  const currentUserId = String(currentUser?.id || currentUser?._id || "");

  useEffect(() => {
    dispatch(fetchTeamMembers());
  }, [dispatch]);

  const insights = useMemo(() => {
    const supportMembers = members.filter(
      (m) => m.role === "agent" || m.role === "admin" || m.role === "owner",
    );
    const activeAgents = supportMembers.filter(
      (m) => m.status === "active" || m.status === "online",
    );
    const busyAgents = supportMembers.filter((m) => m.status === "busy");
    const rosterMembers = members.filter(
      (m) => String(m._id || m.id || "") !== currentUserId,
    );

    return {
      totalMembers: members.length,
      activeAgents: activeAgents.length,
      busyAgents: busyAgents.length,
      utilization: supportMembers.length
        ? Math.round((busyAgents.length / supportMembers.length) * 100)
        : 0,
      responseSla: activeAgents.length > 0 ? "2m 18s" : "N/A",
      rosterMembers,
    };
  }, [members, currentUserId]);

  const handleChat = () => {
    navigate("/app/inbox");
  };

  return (
    <div className="theme-page animate-in fade-in duration-700 pb-10">
      <OwnerWelcomeBanner
        title={`Welcome back, ${currentUser?.name || "Owner"}`}
        description="Real-time intelligence on your support operations. Track activity, monitor performance, and coordinate your team."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Members"
          value={insights.totalMembers}
          icon={Users}
          color="sky"
          trend="+12%"
        />
        <StatsCard
          title="Active Agents"
          value={insights.activeAgents}
          icon={Shield}
          color="emerald"
          trend="Stable"
        />
        <StatsCard
          title="Busy Agents"
          value={insights.busyAgents}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Total Admins"
          value={members.filter((member) => member.role === "admin").length}
          icon={Users}
          color="indigo"
          trend="+5%"
        />
      </div>

      <AgentRosterTable
        agents={insights.rosterMembers}
        handleChat={handleChat}
      />
    </div>
  );
};

export default OwnerHomePage;
