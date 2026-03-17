import React from "react";
import {
  MessageCircle,
  Send,
  Activity,
  Shield,
  Paperclip,
  Smile,
  Ellipsis,
  Inbox,
  Clock3,
  ChevronLeft,
  PencilLine,
  Trash2,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import UserAvatar from "../ui/UserAvatar";
import ErrorBox from "../ui/ErrorBox";

const normalizeId = (value) => (value ? String(value) : "");

const InboxChatPanel = ({
  activeChatPartner,
  currentMessages,
  currentUserId,
  currentUser,
  messagesEndRef,
  input,
  setInput,
  handleSend,
  handleSendAttachments,
  handleAddEmoji,
  isPartnerTyping,
  onTypingChange,
  onEditMessage,
  onDeleteMessage,
  activeConversation = null,
  composerDisabled = false,
  composerPlaceholder = "Type a message...",
  isMobileView = false,
  onBack,
  embedded = false,
  composerError = "",
  onComposerError,
}) => {
  const fileInputRef = React.useRef(null);
  const actionMenuRef = React.useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [openMenuId, setOpenMenuId] = React.useState(null);

  React.useEffect(() => {
    if (!openMenuId) return undefined;

    const handlePointerDown = (event) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  const formatMessageTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const visitorInfo = activeConversation?.metadata?.visitorInfo || {};
  const visitorDepartment =
    String(
      activeConversation?.department || activeConversation?.metadata?.department || "",
    ).trim();
  const visitorCountry = String(visitorInfo?.country || "").trim();
  const visitorIp = String(visitorInfo?.ip || "").trim();
  const visitorPageUrl = String(visitorInfo?.pageUrl || "").trim();
  const visitorLanguage = String(visitorInfo?.language || "").trim();
  const hasVisitorInfo = Boolean(
    visitorDepartment ||
      visitorCountry ||
      visitorIp ||
      visitorPageUrl ||
      visitorLanguage,
  );

  if (!activeChatPartner) {
    return (
      <div
        className={`flex flex-1 min-h-0 flex-col items-center justify-center p-12 text-center ${
          embedded
            ? ""
            : "rounded-[30px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.94))] shadow-[0_20px_48px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(3,17,38,0.94))]"
        }`}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
          <Inbox size={36} />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
          Select a conversation
        </h2>
        <p className="max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Choose a conversation from the left to reply to visitors, review the
          latest messages, and keep support moving.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live inbox ready
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
        embedded
          ? "h-full bg-transparent"
          : "max-h-screen rounded-[30px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.95))] shadow-[0_20px_48px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(3,17,38,0.94))]"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/70 px-4 py-4 sm:px-6 dark:border-slate-800/80">
        <div className="flex min-w-0 items-center gap-3">
          {isMobileView ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Back to conversations"
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}
          <UserAvatar
            name={activeChatPartner.name}
            src={activeChatPartner.profilePictureUrl}
            sizeClass="w-11 h-11"
            textClass="text-lg"
            className="rounded-2xl"
            fallbackClassName="bg-emerald-600 text-white"
          />
          <div>
            <h2 className="truncate font-semibold text-slate-950 dark:text-slate-50">
              {activeChatPartner.name}
            </h2>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {activeChatPartner.role === "owner" ? (
                <>
                  <Shield
                    size={10}
                    className="text-emerald-600 dark:text-emerald-300"
                  />
                  Team Channel
                </>
              ) : (
                <>
                  <Activity size={10} className="text-emerald-500" />
                  Live Visitor
                </>
              )}
            </p>
          </div>
        </div>

        <div className={`items-center gap-2 ${isMobileView ? "hidden" : "hidden md:flex"}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <Clock3 size={12} />
            Real-time chat
          </div>
        </div>
      </div>

      {hasVisitorInfo ? (
        <div className="shrink-0 border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 text-[11px] font-medium text-slate-600 sm:px-6 dark:border-slate-800/80 dark:bg-slate-900/45 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {visitorDepartment ? (
              <span>Department: {visitorDepartment}</span>
            ) : null}
            {visitorCountry ? <span>Country: {visitorCountry}</span> : null}
            {visitorLanguage ? <span>Language: {visitorLanguage}</span> : null}
            {visitorIp ? <span>IP: {visitorIp}</span> : null}
            {visitorPageUrl ? (
              <a
                href={visitorPageUrl}
                target="_blank"
                rel="noreferrer"
                className="max-w-[280px] truncate text-emerald-700 underline dark:text-emerald-300"
                title={visitorPageUrl}
              >
                Page: {visitorPageUrl}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_30%),linear-gradient(180deg,rgba(248,250,252,0.84),rgba(241,245,249,0.42))] p-4 custom-scrollbar sm:p-6 dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.24),rgba(2,6,23,0.06))]">
        {currentMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-slate-400 shadow-sm dark:bg-slate-900">
              <MessageCircle size={36} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              Start the conversation
            </h3>
            <p className="max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
              Send a quick reply, share guidance, or attach files from the
              composer below.
            </p>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {currentMessages.map((msg, i) => {
              const mine = normalizeId(msg.senderId) === currentUserId;
              const messageMenuId = msg._id || i;
              return (
                <div
                  key={messageMenuId}
                  className={`flex items-end gap-3 ${mine ? "flex-row-reverse" : "flex-row"}`}
                >
                  <UserAvatar
                    name={mine ? currentUser?.name : activeChatPartner.name}
                    src={
                      mine
                        ? currentUser?.profilePictureUrl
                        : activeChatPartner.profilePictureUrl
                    }
                    sizeClass="w-8 h-8"
                    textClass="text-[10px]"
                    className="shrink-0 rounded-xl"
                    fallbackClassName={
                      mine
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    }
                  />
                  <div
                    className={`flex max-w-[88%] flex-col sm:max-w-[75%] ${
                      mine ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 ${
                        mine ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {mine ? (
                        <div
                          ref={openMenuId === messageMenuId ? actionMenuRef : null}
                          className="relative mt-1 shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((prev) =>
                                prev === messageMenuId ? null : messageMenuId,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                            aria-label="Message actions"
                          >
                            <Ellipsis size={15} />
                          </button>

                          {openMenuId === messageMenuId ? (
                            <div className="absolute bottom-10 right-0 z-20 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white/98 p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/96">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEditMessage && onEditMessage(msg);
                                }}
                              >
                                <PencilLine size={14} />
                                Edit message
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onDeleteMessage && onDeleteMessage(msg);
                                }}
                              >
                                <Trash2 size={14} />
                                Delete message
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div
                        className={`min-w-[88px] rounded-[18px] border px-4 py-3 text-sm leading-6 shadow-sm ${
                          mine
                            ? "rounded-br-sm border-emerald-500 bg-emerald-600 text-white shadow-[0_14px_30px_rgba(16,185,129,0.18)]"
                            : "rounded-bl-sm border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950/75 dark:text-white"
                        }`}
                      >
                        <p className="wrap-break-word whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        {Array.isArray(msg.attachments) &&
                          msg.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.attachments.map((att, index) => {
                                const key = `${att?.url || "att"}-${index}`;
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
                                        className="max-h-48 rounded-xl border border-white/20 object-cover"
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
                                    className={`block rounded-xl px-3 py-2 text-xs underline break-all ${
                                      mine
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    }`}
                                  >
                                    {att?.name || "Attachment"}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      <span>
                        {msg.senderName ||
                          (mine ? "You" : activeChatPartner.name)}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span>
                        {formatMessageTime(msg.createdAt || msg.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
        {isPartnerTyping && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {activeChatPartner?.name || "User"} is typing...
          </p>
        )}
      </div>

      <div className="relative border-t border-slate-200/70 bg-white/95 p-3 dark:border-slate-800/80 dark:bg-slate-950/85 sm:p-4">
        {composerError ? (
          <ErrorBox
            error={composerError}
            className="mb-3 border-red-200/60 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10"
          />
        ) : null}
        {showEmojiPicker && (
          <div className="absolute right-6 bottom-[88px] z-20">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                if (handleAddEmoji) {
                  handleAddEmoji(emojiData.emoji || "");
                }
                setShowEmojiPicker(false);
              }}
              height={360}
              width={320}
              lazyLoadEmojis
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const maxBytes = 25 * 1024 * 1024;
            const oversized = files.find((file) => file.size > maxBytes);
            if (oversized) {
              if (typeof onComposerError === "function") {
                onComposerError(
                  `File too large: ${oversized.name}. Max allowed size is 25MB.`,
                );
              }
              e.target.value = "";
              return;
            }
            if (
              files.length > 0 &&
              typeof handleSendAttachments === "function"
            ) {
              handleSendAttachments(files);
            }
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-2 rounded-[24px] border border-slate-200 bg-slate-50/90 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/85">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={composerDisabled}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white hover:text-slate-900 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white hover:text-slate-900 active:scale-95 sm:flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title="Open emoji picker"
          >
            <Smile size={16} />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              className="w-full border-0 bg-transparent px-2 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder={composerPlaceholder}
              value={input}
              disabled={composerDisabled}
              onChange={(e) => {
                setInput(e.target.value);
                if (typeof onComposerError === "function") {
                  onComposerError("");
                }
                if (onTypingChange) {
                  onTypingChange(e.target.value.trim().length > 0);
                }
              }}
              onBlur={() => onTypingChange && onTypingChange(false)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || composerDisabled}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboxChatPanel;

