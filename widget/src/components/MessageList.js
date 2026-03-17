export function renderMessageList() {
  return `<div class="cfw-messages"></div>`;
}

export function renderMessageItem(msg, isVisitor, actions = {}) {
  const row = document.createElement("div");
  row.className = "cfw-row " + (isVisitor ? "me" : "other");

  if (isVisitor && msg?._id) {
    const menuWrap = document.createElement("div");
    menuWrap.className = "cfw-msg-menu";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cfw-msg-action-btn";
    trigger.setAttribute("aria-label", "Message actions");
    trigger.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="5" r="1"></circle>
        <circle cx="12" cy="19" r="1"></circle>
      </svg>
    `;
    menuWrap.appendChild(trigger);

    const dropdown = document.createElement("div");
    dropdown.className = "cfw-msg-dropdown cfw-hidden";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "cfw-msg-dropdown-item";
    editBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
      </svg>
      <span>Edit message</span>
    `;
    editBtn.onclick = () => {
      dropdown.classList.add("cfw-hidden");
      if (typeof actions.onEdit === "function") actions.onEdit(msg);
    };
    dropdown.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "cfw-msg-dropdown-item is-danger";
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M19 6l-1 14H6L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
      </svg>
      <span>Delete message</span>
    `;
    deleteBtn.onclick = () => {
      dropdown.classList.add("cfw-hidden");
      if (typeof actions.onDeleteRequest === "function") actions.onDeleteRequest(msg);
    };
    dropdown.appendChild(deleteBtn);

    trigger.onclick = (event) => {
      event.stopPropagation();
      const willOpen = dropdown.classList.contains("cfw-hidden");
      document.querySelectorAll(".cfw-msg-dropdown").forEach((menu) => {
        menu.classList.add("cfw-hidden");
        menu.classList.remove("cfw-open-up");
      });
      if (willOpen) {
        dropdown.classList.remove("cfw-hidden");

        const scroller = row.closest(".cfw-messages");
        if (scroller) {
          const triggerRect = trigger.getBoundingClientRect();
          const scrollerRect = scroller.getBoundingClientRect();
          const menuHeight = dropdown.offsetHeight || 110;
          const spaceBelow = scrollerRect.bottom - triggerRect.bottom;
          const spaceAbove = triggerRect.top - scrollerRect.top;
          const shouldOpenUp =
            spaceBelow < menuHeight + 10 && spaceAbove > spaceBelow;
          dropdown.classList.toggle("cfw-open-up", shouldOpenUp);
        }
      }
    };

    menuWrap.appendChild(dropdown);
    row.appendChild(menuWrap);
  }

  if (isVisitor && msg.isEditing) {
    const editWrap = document.createElement("div");
    editWrap.className = "cfw-edit-wrap";
    
    const textarea = document.createElement("textarea");
    textarea.className = "cfw-edit-input";
    textarea.value = msg.content || "";
    editWrap.appendChild(textarea);
    
    const actionsRow = document.createElement("div");
    actionsRow.className = "cfw-edit-actions";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cfw-edit-btn is-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => actions.onCancelEdit(msg);
    actionsRow.appendChild(cancelBtn);
    
    const saveBtn = document.createElement("button");
    saveBtn.className = "cfw-edit-btn is-save";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => actions.onSaveEdit(msg, textarea.value);
    actionsRow.appendChild(saveBtn);
    
    editWrap.appendChild(actionsRow);
    const bubble = document.createElement("div");
    bubble.className = "cfw-bubble";
    bubble.appendChild(editWrap);
    row.appendChild(bubble);
  } else if (isVisitor && msg.confirmDelete) {
    const confirmCard = document.createElement("div");
    confirmCard.className = "cfw-confirm-card";
    
    const text = document.createElement("p");
    text.className = "cfw-confirm-text";
    text.textContent = "Delete this message?";
    confirmCard.appendChild(text);
    
    const confirmActions = document.createElement("div");
    confirmActions.className = "cfw-confirm-actions";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cfw-confirm-btn is-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => actions.onCancelDelete(msg);
    confirmActions.appendChild(cancelBtn);
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "cfw-confirm-btn is-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => actions.onConfirmDelete(msg);
    confirmActions.appendChild(deleteBtn);
    
    confirmCard.appendChild(confirmActions);
    row.appendChild(confirmCard);
  } else {
    // Normal Bubble Rendering
    const bubble = document.createElement("div");
    bubble.className = "cfw-bubble";

    const textContent = String(msg.content || "").trim();
    if (textContent) {
      const text = document.createElement("div");
      text.className = "cfw-message-text";
      text.textContent = textContent;
      bubble.appendChild(text);
    }

    if (msg.attachments && msg.attachments.length > 0) {
      const attWrap = document.createElement("div");
      attWrap.className = "cfw-attachment-msg";

      msg.attachments.forEach((att) => {
        const isImage = att.type?.startsWith("image/");

        if (isImage) {
          const img = document.createElement("img");
          img.src = att.url;
          img.className = "cfw-attachment-preview";
          img.onclick = () => window.open(att.url, "_blank");
          attWrap.appendChild(img);
        } else {
          const fileLink = document.createElement("a");
          fileLink.href = att.url;
          fileLink.target = "_blank";
          fileLink.className = "cfw-attachment-file";

          const fileIcon = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
          `;

          fileLink.innerHTML = `
            ${fileIcon}
            <div class="cfw-file-info">
              <div class="cfw-file-name" title="${att.name}">${att.name || "File"}</div>
              <div class="cfw-file-size">${att.size ? (att.size / 1024).toFixed(1) + " KB" : ""}</div>
            </div>
          `;
          attWrap.appendChild(fileLink);
        }
      });

      bubble.appendChild(attWrap);
    }

    const meta = document.createElement("div");
    meta.className = "cfw-msg-meta";
    const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
    meta.textContent = timeStr;
    bubble.appendChild(meta);

    if (!isVisitor) {
      const avatar = document.createElement("img");
      avatar.className = "cfw-avatar";
      avatar.src = msg.senderAvatar || "https://ui-avatars.com/api/?name=Agent&background=random";
      avatar.onerror = () => { avatar.src = "https://ui-avatars.com/api/?name=Agent&background=random"; };
      row.appendChild(avatar);
    }

    row.appendChild(bubble);
  }

  return row;
}

