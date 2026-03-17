export function renderHeader(options) {
  const logoUrl = String(options?.logoUrl || "").trim();
  const safeLogoUrl = logoUrl.replace(/"/g, "&quot;");

  return `
    <div class="cfw-header">
      <div class="cfw-header-row">
        <div class="cfw-header-brand">
          ${
            safeLogoUrl
              ? `
            <img
              src="${safeLogoUrl}"
              alt="Widget logo"
              class="cfw-header-logo"
              onerror="this.style.display='none';"
            />
          `
              : ""
          }
          <p class="cfw-header-title">${options.title}</p>
        </div>
        <div class="cfw-header-actions">
          <button type="button" class="cfw-mini-btn cfw-mini-icon cfw-js-home-back cfw-hidden" aria-label="Back to Home">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <button type="button" class="cfw-mini-btn cfw-mini-icon cfw-js-settings" aria-label="Settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <button type="button" class="cfw-mini-btn cfw-mini-icon cfw-js-header-close" aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      <p class="cfw-header-sub cfw-js-header-sub">${options.welcomeMessage}</p>
      <div class="cfw-chat-mode-row">
        <span class="cfw-status-indicator cfw-js-status-indicator"></span>
        <p class="cfw-chat-mode cfw-js-chat-mode"></p>
      </div>
    </div>
  `;
}
