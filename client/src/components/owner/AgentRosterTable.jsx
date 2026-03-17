import React from "react";
import { MessageSquare, MoreHorizontal, Circle } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";

const AgentRosterTable = ({ agents, handleChat }) => {
  const rosterMembers = Array.isArray(agents) ? agents : [];

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Team Roster
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar smart-x-scroll">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr className="text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wide">
              <th className="px-6 py-4 text-left font-medium">Member</th>
              <th className="px-6 py-4 text-left font-medium">Status</th>
              <th className="px-6 py-4 text-center font-medium">Load</th>
              <th className="px-6 py-4 text-right font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rosterMembers.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-16 text-center text-slate-400 dark:text-slate-500"
                >
                  No team members synchronized
                </td>
              </tr>
            ) : (
              rosterMembers.map((agent) => {
                const isActive =
                  agent.status === "active" || agent.status === "online";
                const isBusy = agent.status === "busy";

                return (
                  <tr
                    key={agent._id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {/* Agent Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={agent.name}
                          src={agent.profilePictureUrl}
                          sizeClass="w-9 h-9"
                          textClass="text-sm"
                          className="rounded-lg"
                          fallbackClassName="bg-emerald-100 text-emerald-600"
                        />

                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-45">
                            {agent.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-45">
                              {agent.email}
                            </p>
                            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                              {agent.role || "member"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : isBusy
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        <Circle size={8} fill="currentColor" />
                        {agent.status || "offline"}
                      </span>
                    </td>

                    {/* Load */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-xs font-medium ${
                          isBusy
                            ? "text-amber-600"
                            : isActive
                              ? "text-emerald-600"
                              : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {isBusy ? "Optimized" : isActive ? "Ready" : "Idle"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleChat(agent)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                        >
                          <MessageSquare size={15} />
                        </button>

                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentRosterTable;
