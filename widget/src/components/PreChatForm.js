export function renderPreChatForm(fields = [], onSubmit, options = {}) {
  const container = document.createElement("div");
  container.className = "cfw-pre-chat-form";
  const restrictedEmail = String(
    options.restrictedEmail || options.lockedEmail || "",
  )
    .trim()
    .toLowerCase();
  const requireEmail = Boolean(options.requireEmail) || Boolean(restrictedEmail);

  const title = document.createElement("h3");
  title.className = "cfw-pre-chat-title";
  title.textContent = "Welcome! Please fill in your details to start.";
  container.appendChild(title);

  const form = document.createElement("form");
  form.className = "cfw-form";
  form.noValidate = true;
  const fieldBindings = [];
  const normalizedFields = Array.isArray(fields) ? fields : [];

  const summaryError = document.createElement("p");
  summaryError.className = "cfw-settings-help";
  summaryError.style.margin = "0 0 12px";
  summaryError.style.color = "#dc2626";
  summaryError.style.display = "none";
  form.appendChild(summaryError);

  normalizedFields.forEach((field, index) => {
    const fieldWrap = document.createElement("div");
    fieldWrap.className = "cfw-field-wrap";

    const label = document.createElement("label");
    label.className = "cfw-label";
    label.textContent = field.label + (field.required ? " *" : "");
    fieldWrap.appendChild(label);

    const labelKey = String(field.label || "")
      .trim()
      .toLowerCase();
    const isEmailField =
      field.type === "email" ||
      labelKey === "email" ||
      labelKey === "email address" ||
      labelKey.includes("email");
    const isNameField = labelKey === "name" || labelKey.includes("full name");
    const isPhoneField = labelKey === "phone" || labelKey.includes("phone");

    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
    } else if (field.type === "select") {
      input = document.createElement("select");
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = field.placeholder || "Select";
      input.appendChild(placeholderOption);
      const options = Array.isArray(field.options) ? field.options : [];
      options.forEach((option) => {
        const optionValue = String(
          option?.value || option?.key || option?.label || "",
        )
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-");
        const optionLabel = String(option?.label || option?.name || "")
          .trim();
        if (!optionValue || !optionLabel) return;
        const node = document.createElement("option");
        node.value = optionValue;
        node.textContent = optionLabel;
        input.appendChild(node);
      });
    } else {
      input = document.createElement("input");
      input.type = isEmailField ? "email" : field.type;
    }

    input.className = "cfw-field-input";
    input.name = `field_${index}`;
    input.placeholder = field.placeholder || "";
    input.autocomplete = isEmailField ? "email" : "off";
    input.required = field.required;
    fieldWrap.appendChild(input);

    const error = document.createElement("p");
    error.className = "cfw-settings-help";
    error.style.color = "#dc2626";
    error.style.marginTop = "6px";
    error.style.display = "none";
    fieldWrap.appendChild(error);

    fieldBindings.push({
      field,
      input,
      error,
      index,
      isEmailField,
      isNameField,
      isPhoneField,
    });
    form.appendChild(fieldWrap);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "cfw-pre-chat-submit";
  submitBtn.textContent = "Start Conversation";
  if (normalizedFields.length === 0) {
    submitBtn.disabled = true;
    submitBtn.title = "Pre-chat form is not configured";
  }
  form.appendChild(submitBtn);

  if (normalizedFields.length === 0) {
    summaryError.textContent =
      "Pre-chat form is enabled but has no configured fields.";
    summaryError.style.display = "block";
  }

  const resetErrors = () => {
    summaryError.textContent = "";
    summaryError.style.display = "none";
    fieldBindings.forEach(({ input, error }) => {
      input.removeAttribute("aria-invalid");
      input.style.borderColor = "";
      error.textContent = "";
      error.style.display = "none";
    });
  };

  const setFieldError = (binding, message) => {
    binding.input.setAttribute("aria-invalid", "true");
    binding.input.style.borderColor = "#dc2626";
    binding.error.textContent = message;
    binding.error.style.display = "block";
  };

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  const isValidName = (value) => {
    const normalized = String(value || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!normalized) return false;
    const letterCount = (normalized.match(/[A-Za-z]/g) || []).length;
    if (letterCount < 3) return false;
    return /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/.test(normalized);
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    resetErrors();
    const formData = new FormData(form);
    const data = {};
    let firstInvalidInput = null;
    let hasErrors = false;

    let firstEmailBinding = null;
    fieldBindings.forEach(
      ({ field, input, index, isEmailField, isNameField, isPhoneField }, bindingIndex) => {
        const rawValue = formData.get(`field_${index}`);
        const value =
          typeof rawValue === "string"
            ? rawValue.trim()
            : rawValue;

        if (field.required && !value) {
          hasErrors = true;
          setFieldError(
            fieldBindings[bindingIndex],
            `${field.label || "This field"} is required.`,
          );
          if (!firstInvalidInput) firstInvalidInput = input;
        } else if (isEmailField && value && !isValidEmail(value)) {
          hasErrors = true;
          setFieldError(
            fieldBindings[bindingIndex],
            "Please enter a valid email address.",
          );
          if (!firstInvalidInput) firstInvalidInput = input;
        } else if (isNameField && value && !isValidName(value)) {
          hasErrors = true;
          setFieldError(
            fieldBindings[bindingIndex],
            "Please enter a valid name (at least 3 letters).",
          );
          if (!firstInvalidInput) firstInvalidInput = input;
        }

        const labelKey = String(field.label || "").trim();
        const normalizedKey = labelKey.toLowerCase().replace(/\s+/g, "_");
        if (labelKey) data[labelKey] = value;
        if (normalizedKey) data[normalizedKey] = value;
        if (isEmailField && value) data.email = value;
        if (isNameField && value) data.name = value;
        if (isPhoneField && value) data.phone = value;
        if (!firstEmailBinding && isEmailField) {
          firstEmailBinding = fieldBindings[bindingIndex];
        }
      },
    );

    if (requireEmail && !data.email) {
      hasErrors = true;
      if (firstEmailBinding) {
        setFieldError(firstEmailBinding, "Email is required.");
        if (!firstInvalidInput) firstInvalidInput = firstEmailBinding.input;
      }
      summaryError.textContent = "Email is required before starting chat.";
      summaryError.style.display = "block";
    }

    if (restrictedEmail && data.email && data.email.toLowerCase() !== restrictedEmail) {
      hasErrors = true;
      if (firstEmailBinding) {
        setFieldError(firstEmailBinding, "This email is not allowed for this widget.");
        if (!firstInvalidInput) firstInvalidInput = firstEmailBinding.input;
      }
      summaryError.textContent = "Please enter an allowed email address.";
      summaryError.style.display = "block";
    }

    if (hasErrors) {
      if (!summaryError.textContent) {
        summaryError.textContent =
          "Please complete required fields before starting chat.";
        summaryError.style.display = "block";
      }
      if (firstInvalidInput) firstInvalidInput.focus();
      return;
    }

    onSubmit(data);
  };

  container.appendChild(form);
  return container;
}
