import React from "react";
import { Inbox, Search } from "lucide-react";
import UserAvatar from "../ui/UserAvatar";

const normalizeId = (value) => (value ? String(value) : "");

const InboxConversationList = ({
  owner,
  ownerId,
  activeDirectUserId,
  handleSelectChat,
  threads,
  unreadCountsByUser,
  latestMessageByUser,
  directMessagesByUser,
  currentUserId,
  sidebarQuery,
  setSidebarQuery,
  totalThreadCount = 0,
  conversationFilters = {},
  onConversationFilterChange,
  agentOptions = [],
  embedded = false,
}) => {
  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getPreview = (chatTargetId) => {
    const latest = latestMessageByUser[chatTargetId];
    if (latest?.content) {
      const senderLabel =
        normalizeId(latest.senderId) === normalizeId(currentUserId)
          ? "You"
          : latest.senderName || "Visitor";
      return `${senderLabel}: ${latest.content}`;
    }

    const cachedThread = directMessagesByUser[chatTargetId] || [];
    const lastMessage = cachedThread[cachedThread.length - 1];
    if (lastMessage?.content) {
      const senderLabel =
        normalizeId(lastMessage.senderId) === normalizeId(currentUserId)
          ? "You"
          : lastMessage.senderName || "Visitor";
      return `${senderLabel}: ${lastMessage.content}`;
    }

    return "No messages yet";
  };

  const getUnread = (chatTargetId) =>
    Number(unreadCountsByUser?.[chatTargetId] || 0);

  const renderUnread = (chatTargetId) => {
    if (getUnread(chatTargetId) <= 0) return null;

    return (
      <span className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
        {getUnread(chatTargetId)}
      </span>
    );
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${
        embedded
          ? "bg-transparent"
          : "max-h-screen rounded-[28px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(3,17,38,0.94))]"
      }`}
    >
      <div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-800/80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
              Conversations
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {totalThreadCount} open
          </div>
        </div>

        <div className="relative mt-4">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={sidebarQuery}
            onChange={(event) => setSidebarQuery(event.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-2xl border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={conversationFilters.status || ""}
            onChange={(event) =>
              onConversationFilterChange &&
              onConversationFilterChange("status", event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
          <input
            type="text"
            value={conversationFilters.department || ""}
            onChange={(event) =>
              onConversationFilterChange &&
              onConversationFilterChange("department", event.target.value)
            }
            placeholder="Department"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          />
          <select
            value={conversationFilters.assignedTo || ""}
            onChange={(event) =>
              onConversationFilterChange &&
              onConversationFilterChange("assignedTo", event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          >
            <option value="">All agents</option>
            {(agentOptions || []).map((agent) => (
              <option
                key={normalizeId(agent?._id || agent?.id)}
                value={normalizeId(agent?._id || agent?.id)}
              >
                {agent?.name || agent?.email || "Agent"}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={conversationFilters.tags || ""}
            onChange={(event) =>
              onConversationFilterChange &&
              onConversationFilterChange("tags", event.target.value)
            }
            placeholder="Tags (comma)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          />
          <input
            type="date"
            value={conversationFilters.dateFrom || ""}
            onChange={(event) =>
              onConversationFilterChange &&
              onConversationFilterChange("dateFrom", event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          />
          <input
            type="date"
            value={conversationFilters.dateTo || ""}
            onChange={(event) =>
              onConversationFilterChange &&
              onConversationFilterChange("dateTo", event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-3 custom-scrollbar">
        {owner && ownerId && ownerId !== normalizeId(currentUserId) && (
          <section className="space-y-2">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Priority
            </p>
            <button
              onClick={() => handleSelectChat(ownerId)}
              className={`w-full rounded-2xl border p-3 text-left transition-all ${
                activeDirectUserId === ownerId
                  ? "border-emerald-300 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,118,110,0.08))] shadow-[0_14px_32px_rgba(16,185,129,0.12)] dark:border-emerald-500/40 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(14,116,144,0.08))]"
                  : "border-slate-200 bg-white/75 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/45 dark:hover:border-slate-700 dark:hover:bg-slate-950/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={owner?.name}
                  src={owner?.profilePictureUrl}
                  sizeClass="w-11 h-11"
                  textClass="text-sm"
                  className="rounded-2xl"
                  fallbackClassName={
                    activeDirectUserId === ownerId
                      ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/10 text-amber-500"
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {owner?.name || "Team Owner"}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Team
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {getPreview(ownerId)}
                  </p>
                </div>
                {renderUnread(ownerId)}
              </div>
            </button>
          </section>
        )}

        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-5 py-12 text-center dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <Inbox size={24} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              No conversations yet
            </p>
            <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500 dark:text-slate-400">
              New visitor conversations will appear here as soon as messages
              arrive.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const chatTargetId = normalizeId(thread.id);
            const isActive = activeDirectUserId === chatTargetId;

            return (
              <button
                key={chatTargetId}
                onClick={() => handleSelectChat(chatTargetId)}
                className={`w-full rounded-2xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-emerald-300 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(14,116,144,0.08))] shadow-[0_14px_32px_rgba(16,185,129,0.10)] dark:border-emerald-500/40 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(14,116,144,0.08))]"
                    : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-950/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={thread.name}
                    src={thread.avatar}
                    sizeClass="w-11 h-11"
                    textClass="text-sm"
                    className="rounded-2xl"
                    fallbackClassName="bg-emerald-500/10 text-emerald-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {thread.name || `Visitor ${chatTargetId.slice(-4)}`}
                      </p>
                      <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {formatTime(thread.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {getPreview(chatTargetId)}
                    </p>
                  </div>
                  {renderUnread(chatTargetId)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InboxConversationList;
