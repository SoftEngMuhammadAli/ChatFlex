import React from "react";
import { Mail, Circle, Pencil, Trash2, Send } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";

const TeamMemberCard = ({
  member,
  onEdit,
  onDelete,
  onResendInvite,
  isActionLoading = false,
}) => {
  const status = member.status || "offline";
  const normalizedStatus = status.toLowerCase();

  const invitationStatus = String(
    member.invitationStatus ||
      (member.emailVerified === false ? "pending" : "approved"),
  ).toLowerCase();

  const isInvitePending = invitationStatus === "pending";

  const hasInvitationLifecycle = Boolean(
    member.invitationSentAt ||
    member.invitationAcceptedAt ||
    invitationStatus === "pending",
  );

  const isOnline =
    normalizedStatus === "active" || normalizedStatus === "online";
  const isBusy = normalizedStatus === "busy";
  const departments = Array.isArray(member?.departments)
    ? member.departments.filter(Boolean)
    : [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-6 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={member.name}
            src={member.profilePictureUrl}
            sizeClass="w-12 h-12"
            className="rounded-lg"
            fallbackClassName="bg-emerald-100 text-emerald-600"
          />

          <div>
            <h3 className="font-medium text-slate-800 dark:text-slate-100">
              {member.name || "Unnamed"}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              {member.role}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : isBusy
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          <Circle size={8} fill="currentColor" />
          {status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-5">
        <Mail size={14} />
        <span className="truncate">{member.email || "No email"}</span>
      </div>

      {departments.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {departments.map((department) => (
            <span
              key={`${member?._id || member?.id || "member"}-${department}`}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
            >
              {department}
            </span>
          ))}
        </div>
      ) : null}

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        {hasInvitationLifecycle ? (
          <p
            className={`text-xs font-medium ${
              isInvitePending
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isInvitePending
              ? "Invitation sent - waiting for teammate to accept and join"
              : "Invitation accepted - Team member is added in Workspace"}
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Team availability is managed from this roster.
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        {isInvitePending && (
          <button
            type="button"
            onClick={() => onResendInvite?.(member)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <Send size={12} />
            Resend Invite
          </button>
        )}

        <button
          type="button"
          onClick={() => onEdit?.(member)}
          disabled={isActionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <Pencil size={12} />
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete?.(member)}
          disabled={isActionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default TeamMemberCard;
