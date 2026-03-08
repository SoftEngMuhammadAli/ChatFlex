(function chatflexWidgetBootstrap() {
  var script = document.currentScript;
  if (!script) return;

  var workspaceId = script.getAttribute("data-key");
  if (!workspaceId) {
    console.error("ChatFlex widget: missing data-key");
    return;
  }

  var apiBase =
    script.getAttribute("data-api") ||
    script.src.replace(/\/widget\.js(\?.*)?$/, "") + "/api";
  var brandColor = script.getAttribute("data-color") || "#0F766E";
  var position = script.getAttribute("data-position") || "right";
  var welcome =
    script.getAttribute("data-welcome") || "Hi, how can we help you today?";

  var conversationId = null;

  var style = document.createElement("style");
  style.textContent =
    ".cf-launcher{position:fixed;bottom:20px;" +
    position +
    ":20px;z-index:2147483000;background:" +
    brandColor +
    ";color:#fff;border:none;border-radius:999px;padding:12px 16px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2);font-family:Arial,sans-serif}" +
    ".cf-panel{position:fixed;bottom:72px;" +
    position +
    ":20px;z-index:2147483000;width:320px;height:460px;background:#fff;border:1px solid #ddd;border-radius:12px;display:none;flex-direction:column;box-shadow:0 15px 40px rgba(0,0,0,.18);font-family:Arial,sans-serif}" +
    ".cf-header{padding:12px;background:" +
    brandColor +
    ";color:#fff;border-top-left-radius:12px;border-top-right-radius:12px;font-weight:700}" +
    ".cf-messages{flex:1;overflow:auto;padding:10px;background:#f8fafc}" +
    ".cf-msg{margin-bottom:8px;padding:8px 10px;border-radius:10px;max-width:85%;font-size:14px;line-height:1.4}" +
    ".cf-msg.visitor{background:#dbeafe;margin-left:auto}" +
    ".cf-msg.agent,.cf-msg.ai{background:#e5e7eb}" +
    ".cf-form{display:grid;gap:8px;padding:10px;border-top:1px solid #eee}" +
    ".cf-input{width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}" +
    ".cf-row{display:flex;gap:8px}" +
    ".cf-btn{padding:8px 10px;border:none;border-radius:8px;background:" +
    brandColor +
    ";color:#fff;cursor:pointer}";
  document.head.appendChild(style);

  var launcher = document.createElement("button");
  launcher.className = "cf-launcher";
  launcher.textContent = "Chat";

  var panel = document.createElement("div");
  panel.className = "cf-panel";
  panel.innerHTML =
    '<div class="cf-header">ChatFlex Support</div>' +
    '<div class="cf-messages" id="cfMessages"></div>' +
    '<div class="cf-form">' +
    '<input class="cf-input" id="cfName" placeholder="Your name" />' +
    '<input class="cf-input" id="cfEmail" placeholder="Your email (optional)" />' +
    '<div class="cf-row">' +
    '<input class="cf-input" id="cfInput" placeholder="Type your message..." />' +
    '<button class="cf-btn" id="cfSend">Send</button>' +
    "</div>" +
    "</div>";

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector("#cfMessages");
  var inputEl = panel.querySelector("#cfInput");
  var nameEl = panel.querySelector("#cfName");
  var emailEl = panel.querySelector("#cfEmail");
  var sendEl = panel.querySelector("#cfSend");

  var appendMessage = function (senderType, content) {
    var row = document.createElement("div");
    row.className = "cf-msg " + senderType;
    row.textContent = content;
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  appendMessage("agent", welcome);

  var createConversation = function (firstMessage) {
    return fetch(apiBase + "/conversations/public/" + workspaceId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor: {
          name: nameEl.value || "Visitor",
          email: emailEl.value || "",
          pageUrl: window.location.href,
        },
        initialMessage: firstMessage,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to start chat");
        return res.json();
      })
      .then(function (data) {
        conversationId = data.conversationId;
      });
  };

  var sendMessage = function () {
    var text = (inputEl.value || "").trim();
    if (!text) return;

    appendMessage("visitor", text);
    inputEl.value = "";

    if (!conversationId) {
      createConversation(text).catch(function () {
        appendMessage(
          "agent",
          "We could not connect right now. Please try again.",
        );
      });
      return;
    }

    fetch(
      apiBase +
        "/conversations/public/" +
        workspaceId +
        "/" +
        conversationId +
        "/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      },
    ).catch(function () {
      appendMessage("agent", "Message failed to send.");
    });
  };

  launcher.addEventListener("click", function () {
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
  });

  sendEl.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") sendMessage();
  });
})();
