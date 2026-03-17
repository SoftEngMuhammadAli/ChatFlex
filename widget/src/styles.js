export const WIDGET_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

  .cfw-root {
    position: fixed;
    z-index: 2147483000;
    font-family: 'Outfit', sans-serif;
    color: var(--cfw-text);
    --cfw-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --cfw-shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .cfw-root.cfw-right { right: 20px; bottom: 20px; }
  .cfw-root.cfw-left { left: 20px; bottom: 20px; }

  .cfw-fab {
    width: 56px;
    height: 56px;
    border-radius: 999px;
    border: none;
    background: var(--cfw-primary);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(var(--cfw-primary-rgb), 0.35);
    transition: all 0.25s ease;
    position: relative;
    overflow: visible;
  }

  .cfw-fab:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 12px 24px rgba(var(--cfw-primary-rgb), 0.45);
  }

  .cfw-fab:active { transform: scale(0.95); }
  .cfw-fab-chat-wrap {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .cfw-fab-logo {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    object-fit: cover;
    object-position: center;
    background: rgba(255, 255, 255, 0.12);
    display: block;
  }
  .cfw-fab-chat-icon {
    width: 24px;
    height: 24px;
    display: block;
  }

  .cfw-fab-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: #ef4444;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #ffffff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
    z-index: 2;
    box-sizing: border-box;
  }

  .cfw-panel {
    position: absolute;
    bottom: 84px;
    width: var(--cfw-width, 310px);
    height: var(--cfw-height, 520px);
    max-height: calc(100vh - 120px);
    background: var(--cfw-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: var(--cfw-shadow-lg);
    transition: all 0.25s ease;
    opacity: 0;
    transform: translateY(20px) scale(0.96);
    pointer-events: none;
    transform-origin: bottom right;
  }

  .cfw-left .cfw-panel { left: 0; transform-origin: bottom left; }
  .cfw-right .cfw-panel { right: 0; transform-origin: bottom right; }

  .cfw-panel.cfw-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .cfw-header {
    padding: 14px 14px 12px;
    background: var(--cfw-primary);
    color: #fff;
    position: relative;
  }

  .cfw-header-row { display: flex; justify-content: space-between; align-items: center; }
  .cfw-header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    max-width: calc(100% - 84px);
  }
  .cfw-header-logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    object-fit: cover;
    object-position: center;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }
  .cfw-header-title { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; }
  .cfw-header-sub { margin: 10px 0 0; opacity: 0.92; font-size: 12px; font-weight: 500; }
  .cfw-chat-mode-row {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cfw-status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
  }
  .cfw-chat-mode {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    opacity: 0.92;
  }
  .cfw-mini-btn {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    padding: 0;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cfw-mini-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .cfw-mini-btn:active { transform: translateY(1px); }
  .cfw-mini-icon {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .cfw-header-actions { display: flex; gap: 6px; }

  .cfw-settings {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
  }

  .cfw-settings-top {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }

  .cfw-settings-back {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    color: #1e293b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cfw-settings-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }

  .cfw-tabbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 14px 18px;
  }

  .cfw-tab {
    border: 1px solid rgba(15, 23, 42, 0.1);
    background: rgba(255, 255, 255, 0.9);
    color: #334155;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 6px;
    cursor: pointer;
  }

  .cfw-tab.is-active {
    background: rgba(var(--cfw-primary-rgb), 0.15);
    border-color: rgba(var(--cfw-primary-rgb), 0.35);
    color: #0f172a;
  }

  .cfw-settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 20px 20px;
  }

  .cfw-settings-content,
  .cfw-messages {
    scrollbar-width: thin;
    scrollbar-color: rgba(var(--cfw-primary-rgb), 0.55) rgba(148, 163, 184, 0.2);
  }

  .cfw-settings-content::-webkit-scrollbar,
  .cfw-messages::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .cfw-settings-content::-webkit-scrollbar-track,
  .cfw-messages::-webkit-scrollbar-track {
    background: rgba(148, 163, 184, 0.16);
    border-radius: 999px;
  }

  .cfw-settings-content::-webkit-scrollbar-thumb,
  .cfw-messages::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      rgba(var(--cfw-primary-rgb), 0.62),
      rgba(var(--cfw-primary-rgb), 0.82)
    );
    border-radius: 999px;
  }

  .cfw-settings-content::-webkit-scrollbar-thumb:hover,
  .cfw-messages::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      rgba(var(--cfw-primary-rgb), 0.78),
      rgba(var(--cfw-primary-rgb), 0.95)
    );
  }

  .cfw-settings-panel { animation: cfw-fade-in 0.18s ease-out; }

  .cfw-settings-label {
    margin: 12px 0 6px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cfw-settings-value {
    margin: 0;
    padding: 10px 12px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 600;
    word-break: break-word;
  }

  .cfw-settings-input {
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.15);
    border-radius: 10px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 600;
    outline: none;
    transition: all 0.2s;
    font-family: inherit;
  }

  .cfw-settings-input:focus {
    border-color: var(--cfw-primary);
    box-shadow: 0 0 0 2px rgba(var(--cfw-primary-rgb), 0.1);
  }

  .cfw-settings-input[readonly] {
    background: #f8fafc;
    color: #475569;
    cursor: default;
  }

  .cfw-settings-input:disabled {
    opacity: 1;
    background: #f1f5f9;
    color: #475569;
    cursor: not-allowed;
  }

  .cfw-settings-help {
    margin: 6px 0 0;
    color: #475569;
    font-size: 13px;
    line-height: 1.45;
  }

  .cfw-settings-action {
    border: 1px solid rgba(var(--cfw-primary-rgb), 0.35);
    background: rgba(var(--cfw-primary-rgb), 0.12);
    color: #0f172a;
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    width: 100%;
    margin-top: 12px;
  }

  .cfw-faq-search-wrap {
    padding: 0 0 12px;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 10;
  }

  .cfw-faq-search {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 10px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: all 0.2s;
  }

  .cfw-faq-search:focus {
    border-color: var(--cfw-primary);
    box-shadow: 0 0 0 2px rgba(var(--cfw-primary-rgb), 0.1);
  }

  .cfw-faq-item {
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 12px;
    background: #fff;
    margin-bottom: 8px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .cfw-faq-item:hover {
    border-color: rgba(var(--cfw-primary-rgb), 0.2);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .cfw-faq-q {
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    padding: 14px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s;
  }

  .cfw-faq-q.is-active {
    color: var(--cfw-primary);
  }

  .cfw-faq-icon {
    transition: transform 0.2s ease;
    opacity: 0.5;
  }

  .cfw-faq-q.is-active .cfw-faq-icon {
    transform: rotate(180deg);
    opacity: 1;
  }

  .cfw-faq-a {
    padding: 0;
    color: #334155;
    font-size: 13px;
    line-height: 1.5;
    border-top: 1px solid rgba(15, 23, 42, 0.04);
    background: #fcfcfc;
  }

  .cfw-faq-a-inner {
    padding: 12px 14px;
  }

  @keyframes cfw-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cfw-messages {
    flex: 1;
    padding: 14px;
    overflow-y: auto;
    background: #f6f6f6;
    color: var(--cfw-text);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cfw-row {
    display: flex;
    width: 100%;
    align-items: flex-start;
    gap: 8px;
  }

  .cfw-bubble {
    display: inline-block;
    width: fit-content;
    max-width: 88%;
    min-width: 78px;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.45;
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .cfw-msg-menu {
    position: relative;
    flex: 0 0 auto;
  }
  .cfw-msg-action-btn {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.92);
    color: #64748b;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
  }
  .cfw-msg-action-btn:hover {
    border-color: rgba(148, 163, 184, 0.34);
    background: #ffffff;
    color: #0f172a;
  }
  .cfw-msg-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    bottom: auto;
    z-index: 12;
    min-width: 148px;
    border-radius: 14px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
    overflow: hidden;
    padding: 6px;
  }
  .cfw-msg-dropdown.cfw-open-up {
    top: auto;
    bottom: calc(100% + 6px);
  }
  .cfw-msg-dropdown-item {
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    padding: 9px 10px;
    font-size: 12px;
    font-weight: 700;
    color: #334155;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 10px;
  }
  .cfw-msg-dropdown-item:hover { background: #f8fafc; }
  .cfw-msg-dropdown-item.is-danger { color: #dc2626; }
  .cfw-msg-dropdown-item.is-danger:hover { background: #fff1f2; }

  .cfw-row.me { justify-content: flex-end; }
  .cfw-row.me .cfw-msg-menu {
    order: 2;
    align-self: flex-start;
    margin-top: 2px;
  }
  .cfw-row.me .cfw-bubble {
    background: var(--cfw-primary);
    color: #fff;
    border-radius: 8px;
    border-bottom-right-radius: 4px;
  }

  .cfw-row.other .cfw-bubble {
    background: #fff;
    color: #1e293b;
    border: 1px solid rgba(0,0,0,0.05);
    border-bottom-left-radius: 3px;
  }

  .cfw-footer {
    padding: 10px 12px;
    background: #f3f3f3;
    border-top: 1px solid rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  .cfw-footer-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cfw-pending-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .cfw-pending-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    border: 1px solid rgba(var(--cfw-primary-rgb), 0.25);
    background: rgba(var(--cfw-primary-rgb), 0.08);
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 11px;
    color: #1e293b;
  }
  .cfw-pending-thumb {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    object-fit: cover;
    display: block;
  }
  .cfw-pending-name {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .cfw-pending-remove {
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }
  .cfw-pending-remove:hover { color: #0f172a; }
  .cfw-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 999px;
    padding: 0 10px;
    background: #fff;
    min-height: 38px;
  }

  .cfw-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--cfw-text);
    padding: 10px 0;
    font-size: 13px;
    outline: none;
    transition: all 0.2s;
  }

  .cfw-input:focus {
    box-shadow: none;
  }
  .cfw-input-icons { display: flex; gap: 4px; color: #a3a3a3; align-items: center; }
  .cfw-input-btn {
    border: none;
    background: transparent;
    color: #a3a3a3;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-radius: 6px;
    transition: all 0.2s;
  }
  .cfw-input-btn:hover { background: #f1f5f9; color: #64748b; }

  .cfw-emoji-picker {
    position: absolute;
    bottom: 60px;
    left: 12px;
    right: 12px;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    z-index: 100;
    min-height: 292px;
    overflow: hidden;
  }


  .cfw-send {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--cfw-primary);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .cfw-send:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(var(--cfw-primary-rgb), 0.26);
  }
  .cfw-send:active { transform: scale(0.95); }

  .cfw-note {
    padding: 7px 10px 9px;
    font-size: 9px;
    font-weight: 700;
    text-align: center;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: #f3f3f3;
  }
  .cfw-welcome-card {
    border-radius: 12px;
    background: #f6f6f6;
    padding: 4px 0;
  }
  .cfw-welcome-title {
    margin: 2px 0 0;
    text-align: center;
    font-size: 30px;
    line-height: 1;
    font-weight: 700;
    color: #202124;
  }
  .cfw-welcome-sub {
    margin: 6px 0 12px;
    text-align: center;
    font-size: 13px;
    color: #666;
  }
  .cfw-welcome-cta {
    width: 100%;
    border: none;
    border-radius: 10px;
    background: var(--cfw-primary);
    color: #fff;
    height: 42px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.16);
  }
  .cfw-suggested-label {
    margin: 18px 0 8px;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #949494;
    font-weight: 700;
  }
  .cfw-suggested-list { display: grid; gap: 8px; }
  .cfw-suggested-item {
    width: 100%;
    text-align: left;
    border: 1px solid #e7e7e7;
    border-radius: 10px;
    background: #fff;
    padding: 11px 12px;
    font-size: 14px;
    color: #2f2f2f;
    cursor: pointer;
  }

  .cfw-faq-quickreply-list { display: grid; gap: 6px; }

  .cfw-faq-quickreply-btn {
    width: 100%;
    text-align: left;
    border: 1px solid rgba(var(--cfw-primary-rgb), 0.2);
    border-radius: 10px;
    background: rgba(var(--cfw-primary-rgb), 0.04);
    padding: 10px 12px;
    font-size: 13px;
    color: #1e293b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: all 0.2s;
    font-family: inherit;
  }

  .cfw-faq-quickreply-btn:hover {
    background: rgba(var(--cfw-primary-rgb), 0.1);
    border-color: rgba(var(--cfw-primary-rgb), 0.4);
  }

  .cfw-faq-qr-q {
    flex: 1;
    font-weight: 600;
  }

  .cfw-faq-followup {
    margin-top: 12px;
    padding: 14px;
    border-radius: 14px;
    background: rgba(var(--cfw-primary-rgb), 0.04);
    border: 1px solid rgba(var(--cfw-primary-rgb), 0.12);
  }

  .cfw-faq-followup-text {
    margin: 0 0 10px;
    font-size: 13px;
    color: #475569;
    text-align: center;
  }

  .cfw-faq-followup-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .cfw-faq-followup-btn {
    padding: 9px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all 0.2s;
    text-align: center;
  }

  .cfw-faq-followup-btn.is-secondary {
    background: #fff;
    color: #334155;
    border: 1px solid rgba(0,0,0,0.1);
  }

  .cfw-faq-followup-btn.is-secondary:hover {
    background: #f1f5f9;
  }

  .cfw-faq-followup-btn.is-primary {
    background: var(--cfw-primary);
    color: #fff;
  }

  .cfw-faq-followup-btn.is-primary:hover {
    opacity: 0.9;
  }

  .cfw-faq-more-list {
    display: grid;
    gap: 6px;
    border-top: 1px solid rgba(0,0,0,0.06);
    padding-top: 10px;
    margin-top: 4px;
  }

  /* Attachment Menu */
  .cfw-attachment-menu {
    position: absolute;
    bottom: 60px;
    right: 50px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 101;
    min-width: 180px;
    animation: cfw-fade-in 0.2s ease-out;
  }
  .cfw-attachment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    width: 100%;
    text-align: left;
    font-family: inherit;
  }
  .cfw-attachment-item:hover { background: #f1f5f9; }
  .cfw-attach-icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  /* Pre-Chat Form */
  .cfw-pre-chat-form {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    background: #fff;
    overflow-y: auto;
  }
  .cfw-pre-chat-title {
    margin: 0 0 20px;
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.4;
  }
  .cfw-form { display: flex; flex-direction: column; gap: 16px; }
  .cfw-field-wrap { display: flex; flex-direction: column; gap: 6px; }
  .cfw-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .cfw-field-input {
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
    font-family: inherit;
    background: #f8fafc;
  }
  .cfw-field-input:focus { border-color: var(--cfw-primary); background: #fff; box-shadow: 0 0 0 3px rgba(var(--cfw-primary-rgb), 0.1); }
  .cfw-pre-chat-submit {
    margin-top: 10px;
    padding: 14px;
    background: var(--cfw-primary);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(var(--cfw-primary-rgb), 0.2);
  }
  .cfw-pre-chat-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(var(--cfw-primary-rgb), 0.3); }

  /* Message Attachments */
  .cfw-attachment-msg {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }
  .cfw-attachment-preview {
    max-width: 100%;
    max-height: 200px;
    border-radius: 10px;
    cursor: pointer;
    object-fit: cover;
    display: block;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .cfw-attachment-file {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(0,0,0,0.05);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s;
  }
  .cfw-attachment-file:hover { background: rgba(0,0,0,0.08); }
  .me .cfw-attachment-file { background: rgba(255,255,255,0.15); color: #fff; }
  .me .cfw-attachment-file:hover { background: rgba(255,255,255,0.22); }
  .cfw-file-info { display: flex; flex-direction: column; gap: 2px; }
  .cfw-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
  .cfw-file-size { font-size: 10px; opacity: 0.7; font-weight: 500; }

  /* Message Content Extras */
  .cfw-msg-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 10px;
    font-weight: 600;
    opacity: 0.6;
  }
  .me .cfw-msg-meta { justify-content: flex-end; color: rgba(255, 255, 255, 0.9); }
  .other .cfw-msg-meta { color: #64748b; }

  .cfw-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: rgba(0,0,0,0.05);
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* Inline Editing */
  .cfw-edit-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .cfw-edit-input {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    min-height: 60px;
    resize: none;
  }
  .cfw-edit-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .cfw-edit-btn {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    font-family: inherit;
  }
  .cfw-edit-btn.is-save { background: #fff; color: var(--cfw-primary); }
  .cfw-edit-btn.is-cancel { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.4); }

  /* Delete Confirmation Card */
  .cfw-confirm-card {
    background: #fff;
    border: 1px solid #fee2e2;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.08);
    margin: 8px 0;
    animation: cfw-fade-in 0.2s ease-out;
  }
  .cfw-confirm-text { margin: 0 0 12px; font-size: 13px; color: #1e293b; font-weight: 600; text-align: center; }
  .cfw-confirm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .cfw-confirm-btn { padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; font-family: inherit; text-align: center; }
  .cfw-confirm-btn.is-danger { background: #ef4444; color: #fff; }
  .cfw-confirm-btn.is-secondary { background: #f1f5f9; color: #475569; }

  /* Typing Indicator Animation */
  .cfw-typing-dots {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 12px;
    padding: 0 4px;
  }
  .cfw-typing-dot {
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    animation: cfw-typing-bounce 1.4s infinite ease-in-out both;
  }
  .cfw-typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .cfw-typing-dot:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes cfw-typing-bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  /* Improved Welcome Card */
  .cfw-welcome-card {
    border: 1px solid rgba(0,0,0,0.06);
    background: #fff;
    border-radius: 16px;
    padding: 24px 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    margin: 10px 0;
  }
  .cfw-welcome-title { font-size: 26px; margin-bottom: 4px; }
  .cfw-welcome-sub { font-size: 14px; margin-bottom: 20px; color: #64748b; }

  /* Mobile Improvements */
  @media (max-width: 500px) {
    .cfw-root { left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; }
    .cfw-fab { display: none; }
    .cfw-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100% !important;
      height: 100% !important;
      max-height: 100vh;
      border-radius: 0;
      border: none;
      transform: none !important;
    }
    .cfw-visible { display: flex !important; }
    .cfw-header { padding-top: env(safe-area-inset-top, 20px); }
  }

  .cfw-hidden { display: none !important; }
`;
