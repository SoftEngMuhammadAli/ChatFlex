export function renderFab(primaryColor, logoUrl = "") {
  const safeLogoUrl = String(logoUrl || "")
    .trim()
    .replace(/"/g, "&quot;");
  const hasLogo = Boolean(safeLogoUrl);

  return `
    <button class="cfw-fab">
      <span class="cfw-fab-badge cfw-hidden cfw-js-fab-badge">0</span>
      <span class="cfw-js-icon-chat cfw-fab-chat-wrap">
        ${
          hasLogo
            ? `
          <img
            src="${safeLogoUrl}"
            alt="Open chat"
            class="cfw-fab-logo cfw-js-fab-logo"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
        `
            : ""
        }
        <svg class="cfw-fab-chat-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="${hasLogo ? "display:none;" : ""}filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12))">
          <path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
        </svg>
      </span>
      <svg class="cfw-js-icon-close cfw-hidden" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
}
