import React from "react";
import { Bot, User, MoreVertical } from "lucide-react";

const MessageList = ({
  messages,
  activeTab,
  currentUserId = "",
  messagesEndRef,
  typingLabel = "",
  onEditMessage,
  onDeleteMessage,
}) => {
  const [openMenuId, setOpenMenuId] = React.useState(null);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {messages.length === 0 && activeTab === "ai" && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/10">
            <Bot size={40} />
          </div>
          <h3 className="text-2xl font-black text-text-primary mb-2">
            AI Assistant is Ready
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm">
            Ask anything from data analysis to creative writing. I'm here to
            amplify your productivity.
          </p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const senderId = msg?.senderId ? String(msg.senderId) : "";
        const isOutgoing =
          activeTab === "team"
            ? senderId
              ? senderId === currentUserId
              : msg.senderType === "visitor"
            : msg.senderType === "visitor";

        return (
          <div
            key={msg._id || msg.id || idx}
            className={`flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-300 ${
              isOutgoing ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${
                isOutgoing
                  ? "bg-primary"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
              }`}
            >
              {isOutgoing ? (
                <User size={16} />
              ) : activeTab === "ai" ? (
                <Bot size={16} className="text-primary" />
              ) : (
                <User size={16} className="text-gray-400 dark:text-slate-500" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${
                isOutgoing ? "items-end" : "items-start"
              }`}
            >
              {activeTab === "team" && !isOutgoing && msg.senderName && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1 ml-1">
                  {msg.senderName}
                </span>
              )}

              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOutgoing
                    ? "bg-primary text-white rounded-tr-none shadow-md shadow-primary/10"
                    : "bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-tl-none"
                }`}
              >
                {activeTab === "team" && isOutgoing && (
                  <div className="mb-2 flex justify-end">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === (msg._id || idx) ? null : msg._id || idx,
                          )
                        }
                        className="rounded p-1 hover:bg-white/20 dark:hover:bg-white/10"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenuId === (msg._id || idx) && (
                        <div className="absolute right-0 z-20 mt-1 w-28 rounded-lg border border-black/10 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 text-xs text-slate-700 dark:text-slate-200 shadow-lg">
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => {
                              setOpenMenuId(null);
                              onEditMessage && onEditMessage(msg);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              onDeleteMessage && onDeleteMessage(msg);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {msg.content}
                {Array.isArray(msg.attachments) &&
                  msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((att, attIndex) => {
                        const key = `${att?.url || "att"}-${attIndex}`;
                        const isImage =
                          typeof att?.type === "string" &&
                          att.type.startsWith("image/");
                        if (isImage && att?.url) {
                          return (
                            <a
                              key={key}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={att.url}
                                alt={att?.name || "attachment"}
                                className="max-h-56 rounded-xl border border-black/10 object-cover"
                              />
                            </a>
                          );
                        }
                        return (
                          <a
                            key={key}
                            href={att?.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`block text-xs underline break-all rounded-md px-2 py-1 ${
                              isOutgoing
                                ? "bg-white/20 text-white"
                                : "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200"
                            }`}
                          >
                            {att?.name || "Attachment"}
                          </a>
                        );
                      })}
                    </div>
                  )}
              </div>

              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  options: { hour12: true },
                }) === "Invalid Date"
                  ? ""
                  : new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      options: { hour12: true },
                    })}
              </div>
            </div>
          </div>
        );
      })}

      {activeTab === "team" && typingLabel && (
        <div className="text-xs font-semibold text-primary px-1">
          {typingLabel}
        </div>
      )}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};

export default MessageList;
