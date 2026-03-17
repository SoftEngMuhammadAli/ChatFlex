export function renderFaqContainer() {
  return `<div class="cfw-faq cfw-hidden"></div>`;
}

export function renderFaqItem(faq, onSelect) {
  const row = document.createElement("div");
  row.className = "cfw-faq-item";

  const questionBtn = document.createElement("button");
  questionBtn.className = "cfw-faq-q";
  questionBtn.type = "button";
  questionBtn.innerHTML = `
    <span>${faq.question || ""}</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="cfw-faq-icon"><path d="M6 9l6 6 6-6"></path></svg>
  `;

  const answer = document.createElement("div");
  answer.className = "cfw-faq-a cfw-hidden";
  answer.innerHTML = `<div class="cfw-faq-a-inner">${faq.answer || ""}</div>`;

  questionBtn.onclick = () => {
    if (typeof onSelect === "function") {
      onSelect(faq);
      return;
    }
    const isHidden = answer.classList.contains("cfw-hidden");
    answer.classList.toggle("cfw-hidden");
    questionBtn.classList.toggle("is-active", isHidden);
  };

  row.appendChild(questionBtn);
  row.appendChild(answer);
  return row;
}
