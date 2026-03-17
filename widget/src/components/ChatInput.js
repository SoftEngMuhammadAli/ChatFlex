export function renderChatInput(options = {}) {
  const showEmojis = options.showEmojis !== false;
  const allowUploads = options.allowFileUploads !== false;

  return `
    <div class="cfw-footer">
      <div class="cfw-pending-list cfw-js-pending-attachments cfw-hidden"></div>
      <div class="cfw-footer-main">
        <div class="cfw-input-wrap">
          <input type="text" class="cfw-input" placeholder="Type a message...">
          <div class="cfw-input-icons">
            ${
              showEmojis
                ? `
              <button type="button" class="cfw-input-btn cfw-js-emoji-trigger" title="Add emoji">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </button>
            `
                : ""
            }
            ${
              allowUploads
                ? `
              <button type="button" class="cfw-input-btn cfw-js-upload-trigger" title="Upload file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>
              <input type="file" class="cfw-js-file-input cfw-hidden" multiple>
            `
                : ""
            }
          </div>
        </div>
        <button type="button" class="cfw-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      <div class="cfw-emoji-picker cfw-hidden cfw-js-emoji-picker-host"></div>
    </div>
  `;
}
