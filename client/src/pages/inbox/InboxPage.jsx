import React, { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../api/socket";
import axiosInstance from "../../api/axios";
import { selectUser } from "../../features/auth/authSlice";
import {
  fetchDirectMessages,
  fetchDirectMessageUsers,
  setActiveDirectUser,
  addMessage,
  fetchConversations,
  fetchUnreadDirectCounts,
  setUnreadCounts,
  editDirectMessage,
  deleteDirectMessage,
  updateMessageLocal,
  deleteMessageLocal,
} from "../../features/chat/chatSlice";
import {
  fetchTeamMembers,
  updateMemberStatusLocal,
} from "../../features/team/teamSlice";
import InboxConversationList from "../../components/inbox/InboxConversationList";
import InboxChatPanel from "../../components/inbox/InboxChatPanel";
import {
  notifyMessageReceived,
  notifyMessageSent,
} from "../../utils/chatFeedback";

const normalizeId = (value) => (value ? String(value) : "");

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
};

const getVisitorFallbackName = (idValue = "") => {
  const normalized = normalizeId(idValue);
  if (!normalized) return "Visitor";
  return `Visitor ${normalized.slice(-4)}`;
};

const getVisitorDisplayName = (conversation, fallbackId = "") => {
  const metadata = conversation?.metadata || {};
  const resolved = pickFirstNonEmpty(
    metadata?.name,
    metadata?.Name,
    metadata?.full_name,
    metadata?.fullName,
    metadata?.visitorName,
  );
  if (resolved) return resolved;

  const fallbackFromConversation = normalizeId(
    conversation?.visitorId || conversation?.visitorUserId,
  );
  return getVisitorFallbackName(fallbackFromConversation || fallbackId);
};

const DESKTOP_BREAKPOINT = 768;

const InboxPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
  const { members } = useSelector((state) => state.team);
  const {
    conversations,
    directUsers,
    messages: currentMessages,
    directMessagesByUser,
    unreadCountsByUser,
    activeDirectUserId,
    latestMessageByUser,
  } = useSelector((state) => state.chat);

  const currentUserId = normalizeId(currentUser?.id || currentUser?._id);
  const [input, setInput] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [activeConversationId, setActiveConversationId] = useState("");
  const [composerError, setComposerError] = useState("");
  const [conversationFilters, setConversationFilters] = useState({
    status: "",
    assignedTo: "",
    tags: "",
    department: "",
    dateFrom: "",
    dateTo: "",
  });
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });
  const messagesEndRef = useRef(null);
  const typingStopTimeoutRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  const owner = members?.find((m) => m.role === "owner");
  const ownerId = normalizeId(owner?._id);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    dispatch(fetchTeamMembers());
    dispatch(fetchUnreadDirectCounts());
    dispatch(fetchDirectMessageUsers());
  }, [dispatch]);

  const conversationQueryParams = useMemo(() => {
    const params = {};
    if (conversationFilters.status) {
      params.status = conversationFilters.status;
    }
    if (conversationFilters.assignedTo) {
      params.assignedTo = conversationFilters.assignedTo;
    }
    if (conversationFilters.tags) {
      params.tags = conversationFilters.tags;
    }
    if (conversationFilters.department) {
      params.department = conversationFilters.department;
    }
    if (conversationFilters.dateFrom) {
      params.dateFrom = conversationFilters.dateFrom;
    }
    if (conversationFilters.dateTo) {
      params.dateTo = conversationFilters.dateTo;
    }
    const trimmedQuery = String(sidebarQuery || "").trim();
    if (trimmedQuery) {
      params.query = trimmedQuery;
    }
    return params;
  }, [conversationFilters, sidebarQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchConversations(conversationQueryParams));
    }, 220);
    return () => clearTimeout(timer);
  }, [dispatch, conversationQueryParams]);

  useEffect(() => {
    if (!currentUserId) return;
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      "";
    socket.emit("join", { userId: currentUserId, token });
  }, [currentUserId]);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      const senderId = normalizeId(msg.senderId);
      const receiverId = normalizeId(msg.receiverId);
      const peerUserId =
        senderId === currentUserId
          ? receiverId
          : senderId || normalizeId(msg.visitorId);

      if (peerUserId) {
        dispatch(
          addMessage({
            message: msg,
            userId: peerUserId,
            currentUserId,
          }),
        );
      }

      if (senderId && senderId !== currentUserId) {
        notifyMessageReceived(
          msg?.senderName || "New message",
          msg?.content || "You received a new message.",
        );
      }

      dispatch(fetchConversations(conversationQueryParams));
      dispatch(fetchDirectMessageUsers());
    };

    const handleUnreadCounts = (payload) => {
      dispatch(setUnreadCounts(payload));
    };

    const handleMessageUpdated = (payload) => {
      dispatch(updateMessageLocal(payload));
    };

    const handleMessageDeleted = (payload) => {
      dispatch(deleteMessageLocal(payload));
    };

    const handleStatusChange = ({ userId, status }) => {
      dispatch(updateMemberStatusLocal({ userId, status }));
    };

    const handleTypingStatus = (payload) => {
      const participants = (payload?.participants || []).map(normalizeId);
      if (
        !participants.includes(currentUserId) ||
        !participants.includes(activeDirectUserId)
      ) {
        return;
      }

      const senderId = normalizeId(payload.userId);
      if (typingTimeoutsRef.current[senderId]) {
        clearTimeout(typingTimeoutsRef.current[senderId]);
        delete typingTimeoutsRef.current[senderId];
      }

      setTypingUsers((prev) => {
        const next = { ...prev };
        if (payload.isTyping) {
          next[senderId] = true;
          typingTimeoutsRef.current[senderId] = setTimeout(() => {
            setTypingUsers((current) => {
              const cloned = { ...current };
              delete cloned[senderId];
              return cloned;
            });
            delete typingTimeoutsRef.current[senderId];
          }, 3500);
        } else {
          delete next[senderId];
        }
        return next;
      });
    };

    socket.on("new_private_message", handleNewMessage);
    socket.on("message_sent", handleNewMessage);
    socket.on("user_status_change", handleStatusChange);
    socket.on("typing_status_change", handleTypingStatus);
    socket.on("unread_counts", handleUnreadCounts);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("new_private_message", handleNewMessage);
      socket.off("message_sent", handleNewMessage);
      socket.off("user_status_change", handleStatusChange);
      socket.off("typing_status_change", handleTypingStatus);
      socket.off("unread_counts", handleUnreadCounts);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [dispatch, currentUserId, activeDirectUserId, conversationQueryParams]);

  const handleSelectChat = (targetId) => {
    const normalizedTargetId = normalizeId(targetId);
    if (!normalizedTargetId) return;

    const matchedConversation = conversations.find((conv) => {
      const threadId = normalizeId(conv?.visitorUserId || conv?.visitorId);
      return threadId === normalizedTargetId;
    });

    setTypingUsers({});
    setActiveConversationId(normalizeId(matchedConversation?._id));
    dispatch(setActiveDirectUser(normalizedTargetId));
    dispatch(fetchDirectMessages(normalizedTargetId));
    socket.emit("mark_thread_read", { otherUserId: normalizedTargetId });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSend = async () => {
    if (!input.trim() || !activeDirectUserId) return;
    const conversationId = normalizeId(activeConversation?._id) || undefined;

    socket.emit("typing_stop", {
      senderId: currentUserId,
      receiverId: activeDirectUserId,
    });

    socket.emit("private_message", {
      senderId: currentUserId,
      senderName: currentUser?.name || "Agent",
      receiverId: activeDirectUserId,
      content: input,
      role: currentUser?.role || "agent",
      conversationId,
    });

    notifyMessageSent();
    setInput("");
  };

  const handleSendAttachments = async (files) => {
    if (!activeDirectUserId || !Array.isArray(files) || files.length === 0) {
      return;
    }

    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) {
          setComposerError(
            `File too large: ${file.name}. Max allowed size is 25MB.`,
          );
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await axiosInstance.post("/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const payload = data?.data;
        if (payload?.url) {
          uploaded.push({
            url: payload.url,
            type: payload.type || file.type,
            name: payload.name || file.name,
            size: payload.size || file.size,
          });
        }
      }

      if (uploaded.length === 0) return;

      const content =
        uploaded.length === 1
          ? `[File: ${uploaded[0].name}]`
          : `[Files: ${uploaded.length}]`;
      const conversationId = normalizeId(activeConversation?._id) || undefined;

      socket.emit("private_message", {
        senderId: currentUserId,
        senderName: currentUser?.name || "Agent",
        receiverId: activeDirectUserId,
        content,
        attachments: uploaded,
        role: currentUser?.role || "agent",
        conversationId,
      });
    } catch (error) {
      setComposerError(
        error?.response?.data?.message ||
          error?.message ||
          "Attachment upload failed. Please try again.",
      );
    }
  };

  const handleTypingChange = (isTyping) => {
    if (!activeDirectUserId) return;

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    socket.emit(isTyping ? "typing_start" : "typing_stop", {
      senderId: currentUserId,
      receiverId: activeDirectUserId,
    });

    if (isTyping) {
      typingStopTimeoutRef.current = setTimeout(() => {
        socket.emit("typing_stop", {
          senderId: currentUserId,
          receiverId: activeDirectUserId,
        });
      }, 1200);
    }
  };

  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
    };
  }, []);

  const handleAddEmoji = (emoji) => {
    setInput((prev) => `${prev}${emoji}`);
  };

  const handleEditMessage = async (msg) => {
    const messageId = normalizeId(msg?._id);
    if (!messageId) return;
    const current = String(msg?.content || "");
    const updated = window.prompt("Edit message", current);
    if (updated === null) return;
    if (!String(updated).trim()) return;
    await dispatch(
      editDirectMessage({ messageId, content: String(updated).trim() }),
    );
  };

  const handleDeleteMessage = async (msg) => {
    const messageId = normalizeId(msg?._id);
    if (!messageId) return;
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;
    await dispatch(deleteDirectMessage({ messageId }));
  };

  const threadConversationMap = useMemo(() => {
    const map = new Map();
    (conversations || []).forEach((conv) => {
      const threadId = normalizeId(conv?.visitorUserId || conv?.visitorId);
      if (!threadId) return;
      const existing = map.get(threadId);
      if (!existing) {
        map.set(threadId, conv);
        return;
      }
      const existingTime = new Date(existing?.lastMessageAt || 0).getTime();
      const candidateTime = new Date(conv?.lastMessageAt || 0).getTime();
      if (candidateTime > existingTime) {
        map.set(threadId, conv);
      }
    });
    return map;
  }, [conversations]);

  const orderedThreads = useMemo(() => {
    const base = Array.from(threadConversationMap.entries()).map(
      ([threadId, conv]) => ({
        id: threadId,
        name: getVisitorDisplayName(conv, threadId),
        avatar: conv?.metadata?.profilePictureUrl || "",
        lastMessageAt: conv?.lastMessageAt,
      }),
    );

    const hasIncomingUnread = base.some(
      (thread) =>
        Number(unreadCountsByUser?.[normalizeId(thread?.id)] || 0) > 0,
    );

    const sorted = hasIncomingUnread
      ? [...base].sort((a, b) => {
          const aId = normalizeId(a?.id);
          const bId = normalizeId(b?.id);
          const aUnread = Number(unreadCountsByUser?.[aId] || 0);
          const bUnread = Number(unreadCountsByUser?.[bId] || 0);
          if (aUnread !== bUnread) return bUnread - aUnread;
          const aTime = new Date(a?.lastMessageAt || 0).getTime();
          const bTime = new Date(b?.lastMessageAt || 0).getTime();
          return bTime - aTime;
        })
      : [...base].sort((a, b) => {
          const aTime = new Date(a?.lastMessageAt || 0).getTime();
          const bTime = new Date(b?.lastMessageAt || 0).getTime();
          return bTime - aTime;
        });

    return sorted;
  }, [threadConversationMap, unreadCountsByUser]);

  const filteredThreads = useMemo(() => {
    const query = String(sidebarQuery || "")
      .trim()
      .toLowerCase();
    if (!query) return orderedThreads;

    return orderedThreads.filter((thread) => {
      const name = String(thread?.name || "").toLowerCase();
      const id = String(thread?.id || "").toLowerCase();
      return name.includes(query) || id.includes(query);
    });
  }, [orderedThreads, sidebarQuery]);

  const activeConversation = (() => {
    if (activeConversationId) {
      const selected = conversations.find(
        (item) => normalizeId(item?._id) === activeConversationId,
      );
      if (selected) return selected;
    }

    const activeId = normalizeId(activeDirectUserId);
    if (!activeId) return null;
    return threadConversationMap.get(activeId) || null;
  })();

  useEffect(() => {
    if (!isDesktop || activeDirectUserId) return;
    const firstThread = filteredThreads[0] || orderedThreads[0];
    const firstId = normalizeId(firstThread?.id);
    if (!firstId) return;
    dispatch(setActiveDirectUser(firstId));
    dispatch(fetchDirectMessages(firstId));
  }, [
    filteredThreads,
    orderedThreads,
    activeDirectUserId,
    dispatch,
    isDesktop,
  ]);

  const handleBackToThreads = () => {
    setTypingUsers({});
    setActiveConversationId("");
    dispatch(setActiveDirectUser(""));
  };

  const activeChatPartner = useMemo(() => {
    if (activeDirectUserId === ownerId) return owner;

    if (activeConversation) {
      const idToReturn = normalizeId(
        activeConversation?.visitorUserId || activeConversation?.visitorId,
      );
      return {
        _id: idToReturn,
        name: getVisitorDisplayName(activeConversation, idToReturn),
        profilePictureUrl:
          activeConversation?.metadata?.profilePictureUrl || "",
        role: "visitor",
        status: "active",
      };
    }

    const activeMember = (members || []).find(
      (member) => normalizeId(member?._id || member?.id) === activeDirectUserId,
    );
    if (activeMember) {
      return {
        _id: normalizeId(activeMember._id || activeMember.id),
        name: activeMember.name || activeMember.email || "User",
        profilePictureUrl: activeMember.profilePictureUrl || "",
        role: activeMember.role || "user",
        status: activeMember.status || "active",
      };
    }

    const dmUser = (directUsers || []).find(
      (user) => normalizeId(user?._id || user?.id) === activeDirectUserId,
    );
    if (dmUser) {
      return {
        _id: normalizeId(dmUser._id || dmUser.id),
        name:
          dmUser.name ||
          dmUser.email ||
          `User ${String(activeDirectUserId).slice(-4)}`,
        profilePictureUrl: dmUser.profilePictureUrl || "",
        role: dmUser.role || "user",
        status: dmUser.status || "active",
      };
    }

    return null;
  }, [
    activeDirectUserId,
    ownerId,
    owner,
    activeConversation,
    members,
    directUsers,
  ]);

  const showMobileChat = !isDesktop && Boolean(activeDirectUserId);
  const showSidebar = isDesktop || !showMobileChat;
  const showChat = isDesktop || showMobileChat;

  return (
    <div className="flex flex-col h-dvh min-h-0 animate-in fade-in duration-700">
      {isDesktop ? (
        <div className="relative flex flex-1 min-h-0 overflow-hidden rounded-md border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,250,252,0.95))] shadow-[0_20px_48px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(3,17,38,0.94))]">
          {/* Sidebar */}
          <aside className="w-[360px] shrink-0 h-full min-h-0 border-r-2 border-slate-200/80 dark:border-slate-800/80">
            <InboxConversationList
              owner={owner}
              ownerId={ownerId}
              activeDirectUserId={activeDirectUserId}
              handleSelectChat={handleSelectChat}
              threads={filteredThreads}
              unreadCountsByUser={unreadCountsByUser}
              latestMessageByUser={latestMessageByUser}
              directMessagesByUser={directMessagesByUser}
              currentUserId={currentUserId}
              sidebarQuery={sidebarQuery}
              setSidebarQuery={setSidebarQuery}
              totalThreadCount={orderedThreads.length}
              conversationFilters={conversationFilters}
              onConversationFilterChange={(key, value) =>
                setConversationFilters((prev) => ({ ...prev, [key]: value }))
              }
              agentOptions={(members || []).filter((member) =>
                ["owner", "admin", "agent"].includes(
                  String(member?.role || "").toLowerCase(),
                ),
              )}
              embedded
            />
          </aside>

          {/* Main Content */}
          <div className="min-w-0 flex-1 min-h-0 h-full overflow-hidden">
            <InboxChatPanel
              activeChatPartner={activeChatPartner}
              currentMessages={currentMessages}
              currentUserId={currentUserId}
              currentUser={currentUser}
              messagesEndRef={messagesEndRef}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              handleSendAttachments={handleSendAttachments}
              handleAddEmoji={handleAddEmoji}
              isPartnerTyping={Boolean(
                activeDirectUserId && typingUsers[activeDirectUserId],
              )}
              onTypingChange={handleTypingChange}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              activeConversation={activeConversation}
              embedded
              composerError={composerError}
              onComposerError={setComposerError}
            />
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 min-h-0 gap-4 overflow-hidden flex-col">
          {showSidebar ? (
            <aside className="w-full min-h-0 flex-1">
              <InboxConversationList
                owner={owner}
                ownerId={ownerId}
                activeDirectUserId={activeDirectUserId}
                handleSelectChat={handleSelectChat}
                threads={filteredThreads}
                unreadCountsByUser={unreadCountsByUser}
                latestMessageByUser={latestMessageByUser}
                directMessagesByUser={directMessagesByUser}
                currentUserId={currentUserId}
                sidebarQuery={sidebarQuery}
                setSidebarQuery={setSidebarQuery}
                totalThreadCount={orderedThreads.length}
                conversationFilters={conversationFilters}
                onConversationFilterChange={(key, value) =>
                  setConversationFilters((prev) => ({ ...prev, [key]: value }))
                }
                agentOptions={(members || []).filter((member) =>
                  ["owner", "admin", "agent"].includes(
                    String(member?.role || "").toLowerCase(),
                  ),
                )}
              />
            </aside>
          ) : null}

          {showChat ? (
            <div className="min-h-0 flex-1">
              <InboxChatPanel
                activeChatPartner={activeChatPartner}
                currentMessages={currentMessages}
                currentUserId={currentUserId}
                currentUser={currentUser}
                messagesEndRef={messagesEndRef}
                input={input}
                setInput={setInput}
                handleSend={handleSend}
                handleSendAttachments={handleSendAttachments}
                handleAddEmoji={handleAddEmoji}
                isPartnerTyping={Boolean(
                  activeDirectUserId && typingUsers[activeDirectUserId],
                )}
                onTypingChange={handleTypingChange}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                activeConversation={activeConversation}
                isMobileView
                onBack={handleBackToThreads}
                composerError={composerError}
                onComposerError={setComposerError}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InboxPage;
