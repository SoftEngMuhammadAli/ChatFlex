// Auto-init loader: configure through data-* attributes on this script tag.
(function () {
  function currentScript() {
    return document.currentScript || document.getElementById("chatflex-loader");
  }

  function readBool(value, fallback) {
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
  }

  function renderLoaderError(message) {
    var node = document.createElement("div");
    node.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 12px;border-radius:10px;background:#7f1d1d;color:#fee2e2;font:12px/1.35 system-ui,Segoe UI,Arial,sans-serif;max-width:320px;box-shadow:0 10px 25px rgba(2,6,23,.3)";
    node.textContent = "ChatFlex loader error: " + message;
    document.body.appendChild(node);
  }

  async function getResolvedApiKey(apiHost, script) {
    // PRD-aligned: data-key is the workspace/project key (apiKey).
    // Backward compatible: data-api-key is also accepted.
    var explicitKey =
      script.getAttribute("data-key") ||
      script.getAttribute("data-api-key") ||
      window.CHATFLEX_API_KEY ||
      "";
    var autoResolve = readBool(script.getAttribute("data-auto-key"), false);

    if (explicitKey && !autoResolve) {
      return explicitKey;
    }

    try {
      var res = await fetch(
        apiHost.replace(/\/+$/, "") + "/api/v1/widget/public-meta",
      );
      var json = await res.json();
      return json?.data?.widgetApiKey || explicitKey;
    } catch (_e) {
      return explicitKey;
    }
  }

  async function boot() {
    var script = currentScript();
    if (!script) return;

    var apiHost =
      script.getAttribute("data-api-host") ||
      window.CHATFLEX_API_HOST ||
      window.location.origin;

    var apiKey = await getResolvedApiKey(apiHost, script);
    if (!apiKey) {
      renderLoaderError("Missing data-key (or auto key lookup failed).");
      return;
    }

    var widgetScript = document.createElement("script");
    widgetScript.src =
      apiHost.replace(/\/+$/, "") +
      "/widget/chatflex-widget.js?t=" +
      new Date().getTime();
    widgetScript.async = true;
    widgetScript.onload = function () {
      if (!window.ChatFlexWidget) {
        renderLoaderError("Widget script loaded but API object missing.");
        return;
      }
      window.ChatFlexWidget.init({
        apiHost: apiHost,
        apiKey: apiKey,
        title: script.getAttribute("data-title") || undefined,
        subtitle: script.getAttribute("data-subtitle") || undefined,
        position: script.getAttribute("data-position") || undefined,
        welcomeMessage: script.getAttribute("data-welcome") || undefined,
        logoUrl: script.getAttribute("data-logo") || undefined,
        showEmojis: readBool(script.getAttribute("data-emojis"), undefined),
        allowFileUploads: readBool(
          script.getAttribute("data-file-uploads"),
          undefined,
        ),
        allowVisitorPositionToggle: readBool(
          script.getAttribute("data-allow-position-toggle"),
          true,
        ),
      });
    };
    widgetScript.onerror = function () {
      renderLoaderError("Could not load /widget/chatflex-widget.js");
    };
    document.head.appendChild(widgetScript);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      boot().catch(function (error) {
        renderLoaderError(error?.message || "Unknown loader failure");
      });
    });
    return;
  }
  boot().catch(function (error) {
    renderLoaderError(error?.message || "Unknown loader failure");
  });
})();
