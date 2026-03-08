import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  analyticsApi,
  billingApi,
  conversationApi,
  faqApi,
  workspaceApi
} from "../services/api";

const DashboardPage = () => {
  const { user, workspace, logout, setWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState("inbox");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [faqs, setFaqs] = useState([]);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "general" });

  const [analytics, setAnalytics] = useState(null);
  const [usage, setUsage] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    brandColor: workspace?.settings?.brandColor || "#0F766E",
    welcomeMessage: workspace?.settings?.welcomeMessage || "Hi, how can we help you today?",
    widgetPosition: workspace?.settings?.widgetPosition || "right",
    aiMode: workspace?.settings?.aiMode || "hybrid"
  });

  const selectedConversation = useMemo(
    () => conversations.find((c) => c._id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [workspaceRes, usersRes, convRes, faqRes, analyticsRes, usageRes] = await Promise.all([
        workspaceApi.get(),
        workspaceApi.users(),
        conversationApi.list(),
        faqApi.list(),
        analyticsApi.summary(),
        billingApi.usage()
      ]);

      setWorkspace(workspaceRes.data);
      setUsers(usersRes.data);
      setConversations(convRes.data);
      setFaqs(faqRes.data);
      setAnalytics(analyticsRes.data);
      setUsage(usageRes.data);
      setSettingsForm({
        brandColor: workspaceRes.data.settings.brandColor,
        welcomeMessage: workspaceRes.data.settings.welcomeMessage,
        widgetPosition: workspaceRes.data.settings.widgetPosition,
        aiMode: workspaceRes.data.settings.aiMode
      });

      if (convRes.data.length > 0) {
        setSelectedConversationId((prev) => prev || convRes.data[0]._id);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const { data } = await conversationApi.getOne(conversationId);
      setMessages(data.messages);
    } catch (_error) {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadConversationMessages(selectedConversationId);
  }, [selectedConversationId]);

  const sendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedConversationId) return;

    await conversationApi.addMessage(selectedConversationId, {
      senderType: "agent",
      content: trimmed
    });

    setMessageInput("");
    await loadConversationMessages(selectedConversationId);
  };

  const updateConversationStatus = async (conversationId, status) => {
    await conversationApi.update(conversationId, { status });
    await loadDashboard();
  };

  const addFaq = async (event) => {
    event.preventDefault();
    if (!faqForm.question || !faqForm.answer) return;
    await faqApi.create(faqForm);
    setFaqForm({ question: "", answer: "", category: "general" });
    const { data } = await faqApi.list();
    setFaqs(data);
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const { data } = await workspaceApi.updateSettings(settingsForm);
    setWorkspace(data);
  };

  if (loading) return <div className="screen-center">Loading dashboard...</div>;

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <h2>{workspace?.name || "Workspace"}</h2>
        <p>{user?.email}</p>
        <nav>
          {["inbox", "faq", "analytics", "billing", "settings"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="content">
        {error && <div className="error-text">{error}</div>}

        {activeTab === "inbox" && (
          <section className="panel grid-2">
            <div className="list-pane">
              <h3>Conversations ({conversations.length})</h3>
              {conversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={
                    selectedConversationId === conversation._id
                      ? "conversation-item active"
                      : "conversation-item"
                  }
                  onClick={() => setSelectedConversationId(conversation._id)}
                >
                  <strong>{conversation.visitor?.name || "Visitor"}</strong>
                  <span>{conversation.status}</span>
                </div>
              ))}
            </div>

            <div className="chat-pane">
              {selectedConversation ? (
                <>
                  <div className="chat-header">
                    <h3>{selectedConversation.visitor?.name || "Visitor"}</h3>
                    <div className="chat-actions">
                      <button onClick={() => updateConversationStatus(selectedConversation._id, "open")}>
                        Open
                      </button>
                      <button onClick={() => updateConversationStatus(selectedConversation._id, "pending")}>
                        Pending
                      </button>
                      <button onClick={() => updateConversationStatus(selectedConversation._id, "resolved")}>
                        Resolve
                      </button>
                    </div>
                  </div>

                  <div className="messages">
                    {messages.map((message) => (
                      <div key={message._id} className={`msg ${message.senderType}`}>
                        <small>{message.senderType}</small>
                        <p>{message.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="composer">
                    <input
                      placeholder="Type reply..."
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") sendMessage();
                      }}
                    />
                    <button onClick={sendMessage}>Send</button>
                  </div>
                </>
              ) : (
                <div>Select a conversation</div>
              )}
            </div>
          </section>
        )}

        {activeTab === "faq" && (
          <section className="panel">
            <h3>FAQ Automation</h3>
            <form className="faq-form" onSubmit={addFaq}>
              <input
                placeholder="Question"
                value={faqForm.question}
                onChange={(event) => setFaqForm((prev) => ({ ...prev, question: event.target.value }))}
              />
              <input
                placeholder="Answer"
                value={faqForm.answer}
                onChange={(event) => setFaqForm((prev) => ({ ...prev, answer: event.target.value }))}
              />
              <input
                placeholder="Category"
                value={faqForm.category}
                onChange={(event) => setFaqForm((prev) => ({ ...prev, category: event.target.value }))}
              />
              <button type="submit">Add FAQ</button>
            </form>
            <div className="faq-list">
              {faqs.map((faq) => (
                <div key={faq._id} className="faq-item">
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                  <small>
                    {faq.category} | {faq.status} | v{faq.version}
                  </small>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "analytics" && (
          <section className="panel stats-grid">
            <div className="stat-card">
              <h4>Total Chats</h4>
              <p>{analytics?.totalChats ?? 0}</p>
            </div>
            <div className="stat-card">
              <h4>Open</h4>
              <p>{analytics?.openChats ?? 0}</p>
            </div>
            <div className="stat-card">
              <h4>Pending</h4>
              <p>{analytics?.pendingChats ?? 0}</p>
            </div>
            <div className="stat-card">
              <h4>Resolved</h4>
              <p>{analytics?.resolvedChats ?? 0}</p>
            </div>
          </section>
        )}

        {activeTab === "billing" && (
          <section className="panel">
            <h3>Billing & Usage</h3>
            <p>Plan: {usage?.plan || "starter"}</p>
            <p>
              Conversations: {usage?.conversations?.used || 0}/{usage?.conversations?.limit || 0}
            </p>
            <p>
              Seats: {usage?.seats?.used || 0}/{usage?.seats?.limit || 0}
            </p>
            <p>
              AI Tokens: {usage?.aiTokens?.used || 0}/{usage?.aiTokens?.limit || 0}
            </p>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="panel">
            <h3>Widget + AI Settings</h3>
            <form className="settings-form" onSubmit={saveSettings}>
              <label>Brand Color</label>
              <input
                type="color"
                value={settingsForm.brandColor}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, brandColor: event.target.value }))}
              />
              <label>Welcome Message</label>
              <input
                value={settingsForm.welcomeMessage}
                onChange={(event) =>
                  setSettingsForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))
                }
              />
              <label>Widget Position</label>
              <select
                value={settingsForm.widgetPosition}
                onChange={(event) =>
                  setSettingsForm((prev) => ({ ...prev, widgetPosition: event.target.value }))
                }
              >
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
              <label>AI Mode</label>
              <select
                value={settingsForm.aiMode}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, aiMode: event.target.value }))}
              >
                <option value="disabled">Disabled</option>
                <option value="faq-first">FAQ First</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <button type="submit">Save Settings</button>
            </form>

            <div className="snippet-box">
              <h4>Install Script Snippet</h4>
              <code>{`<script src="https://cdn.chatflex.com/widget.js" data-key="${workspace?._id || "PROJECT_KEY"}"></script>`}</code>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
