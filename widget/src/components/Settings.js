export function renderSettingsContainer(showFaqs = true) {
  return `
    <div class="cfw-settings cfw-hidden">
      <div class="cfw-settings-top">
        <button type="button" class="cfw-settings-back cfw-js-settings-back" aria-label="Back to chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
        </button>
        <p class="cfw-settings-title">Settings</p>
      </div>
      <div class="cfw-settings-content">
        <div class="cfw-settings-panel is-active cfw-js-settings-panel" data-panel="faq">
          <p class="cfw-settings-help">${showFaqs ? "Browse FAQs or leave the current chat." : "FAQs are disabled for this widget. You can still leave the current chat."}</p>
          ${
            showFaqs
              ? `
          <div class="cfw-faq-search-wrap">
            <input type="text" class="cfw-faq-search cfw-js-faq-search" placeholder="Search for help..." />
          </div>
          <div class="cfw-settings-faq-items cfw-js-settings-faq-items"></div>
          `
              : ""
          }
          <button type="button" class="cfw-settings-action cfw-js-leave-chat">Leave Chat</button>
          <p class="cfw-settings-help">Ends current conversation and starts a new one when you send the next message.</p>
        </div>
      </div>
    </div>
  `;
}
