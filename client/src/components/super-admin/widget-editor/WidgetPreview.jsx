import React from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  MoreHorizontal,
  X,
  Send,
  Paperclip,
  Smile,
  ChevronRight,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { THEME_COLORS } from "../../../styles/globalThemeTokens";
import {
  clampWidgetDimension,
  resolveWidgetDisplayTitle,
} from "../../../utils/widgetConfig";

const WidgetPreview = ({ form, device, setDevice, onReset }) => {
  const [showForm, setShowForm] = React.useState(false);
  const [chatStarted, setChatStarted] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [formValues, setFormValues] = React.useState({});
  const [formErrors, setFormErrors] = React.useState({});
  const [messages, setMessages] = React.useState([
    { id: 1, role: "bot", text: "Hello! ??", type: "text" },
  ]);

  const suggestedMessages = React.useMemo(
    () =>
      (Array.isArray(form.suggestedMessages) ? form.suggestedMessages : [])
        .map((item) => ({
          message: String(
            typeof item === "string"
              ? item
              : item?.message || item?.text || item?.question || "",
          ).trim(),
          answer: String(
            typeof item === "string" ? "" : item?.answer || item?.reply || "",
          ).trim(),
        }))
        .filter((item) => item.message),
    [form.suggestedMessages],
  );
  const publishedFaqItems = React.useMemo(
    () =>
      (Array.isArray(form.faqItems) ? form.faqItems : [])
        .map((item) => ({
          question: String(item?.question || "").trim(),
          answer: String(item?.answer || "").trim(),
          status: String(item?.status || "published")
            .trim()
            .toLowerCase(),
        }))
        .filter(
          (item) =>
            item.question && item.answer && item.status !== "unpublished",
        ),
    [form.faqItems],
  );

  const devices = [
    { id: "desktop", icon: Monitor, label: "Desktop" },
    { id: "tablet", icon: Tablet, label: "Tablet" },
    { id: "mobile", icon: Smartphone, label: "Mobile" },
  ];
  const previewWidgetHeight = clampWidgetDimension("height", form.height);
  const previewWidgetWidth = clampWidgetDimension("width", form.width);
  const previewShellWidth =
    device === "desktop" ? 800 : device === "tablet" ? 600 : 340;
  const previewShellBaseHeight =
    device === "desktop" ? 620 : device === "tablet" ? 560 : 620;
  const previewShellHeight = Math.max(
    previewWidgetHeight + 120,
    previewShellBaseHeight,
  );

  const handleStartConversation = () => {
    if (form.preChatForm?.enabled) {
      setFormValues({});
      setFormErrors({});
      setShowForm(true);
    } else {
      setChatStarted(true);
      setMessages([
        {
          id: Date.now(),
          role: "bot",
          text:
            form.welcomeMessage !== undefined
              ? form.welcomeMessage
              : "Hi there! Tell us what you need and we will connect you to the right specialist.",
          type: "text",
        },
      ]);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const fields = Array.isArray(form.preChatForm?.fields)
      ? form.preChatForm.fields
      : [];
    const nextErrors = {};
    const allowedEmail = String(form.allowedUserEmail || "")
      .trim()
      .toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let submittedEmail = "";

    fields.forEach((field, index) => {
      const key = `field_${index}`;
      const value = String(formValues[key] || "").trim();
      const label = String(field?.label || "")
        .trim()
        .toLowerCase();
      const isEmailField =
        String(field?.type || "").toLowerCase() === "email" ||
        label.includes("email");

      if (field?.required && !value) {
        nextErrors[key] = `${field?.label || "Field"} is required.`;
        return;
      }
      if (isEmailField && value && !emailRegex.test(value)) {
        nextErrors[key] = "Please enter a valid email address.";
        return;
      }
      if (isEmailField && value) {
        submittedEmail = value.toLowerCase();
      }
    });

    if (allowedEmail) {
      if (!submittedEmail) {
        nextErrors.form = "Email is required for this widget.";
      } else if (submittedEmail !== allowedEmail) {
        nextErrors.form = "This email is not allowed for this widget.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    setShowForm(false);
    setChatStarted(true);
    setMessages([
      {
        id: Date.now(),
        role: "bot",
        text: "Thanks for introducing yourself! How can I help?",
        type: "text",
      },
    ]);
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      role: "user",
      text: inputValue,
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setShowEmojiPicker(false);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: "This is a preview response. Your message has been received!",
          type: "text",
        },
      ]);
    }, 1000);
  };

  const handleSuggestedMessageClick = (item) => {
    const prompt = String(item?.message || "").trim();
    if (!prompt) return;

    const reply =
      String(item?.answer || "").trim() ||
      "Thanks for your message. A support agent will assist you shortly.";

    setShowForm(false);
    setChatStarted(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        text: prompt,
        type: "text",
      },
      {
        id: Date.now() + 1,
        role: "bot",
        text: reply,
        type: "text",
      },
    ]);
  };
  const handleFaqMessageClick = (item) => {
    const question = String(item?.question || "").trim();
    if (!question) return;
    const answer = String(item?.answer || "").trim() || "No answer available.";

    setShowForm(false);
    setChatStarted(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        text: question,
        type: "text",
      },
      {
        id: Date.now() + 1,
        role: "bot",
        text: answer,
        type: "text",
      },
    ]);
  };

  const handleEmojiClick = (emoji) => {
    setInputValue((prev) => prev + emoji);
  };

  const handleFileUpload = () => {
    const mockFileName = "document.pdf";
    const newMessage = {
      id: Date.now(),
      role: "user",
      text: mockFileName,
      type: "file",
    };
    setMessages((prev) => [...prev, newMessage]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: `I've received your file: ${mockFileName}`,
          type: "text",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col theme-surface-muted relative overflow-hidden">
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Live Preview
        </span>

        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              className={`p-2 rounded-lg transition-all ${
                device === d.id
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
              title={d.label}
            >
              <d.icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowForm(false);
              setChatStarted(false);
              setFormValues({});
              setFormErrors({});
              setMessages([
                { id: 1, role: "bot", text: "Hello! ??", type: "text" },
              ]);
              onReset();
            }}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors"
            title="Reset to factory defaults"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 flex items-center justify-center overflow-auto custom-scrollbar">
        <div
          className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-500 relative overflow-hidden flex flex-col"
          style={{
            width: `${previewShellWidth}px`,
            height: `${previewShellHeight}px`,
          }}
        >
          <div className="h-10 bg-slate-50/50 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="ml-4 h-4 w-40 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700" />
          </div>

          <div className="flex-1 bg-slate-50/30 dark:bg-slate-900/40 p-8 relative">
            <div
              className={`absolute bottom-6 w-[320px] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col group animate-in slide-in-from-bottom-8 duration-700 transition-all ${
                form.position === "left" ? "left-6" : "right-6"
              }`}
              style={{
                height: `${previewWidgetHeight}px`,
                width: `${previewWidgetWidth}px`,
                backgroundColor: form.backgroundColor || THEME_COLORS.bgWhite,
              }}
            >
              <div
                className="p-5 flex flex-col gap-2 shrink-0"
                style={{
                  backgroundColor: form.brandColor,
                  color: form.textColor,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(showForm || chatStarted) && (
                      <button
                        onClick={() => {
                          setShowForm(false);
                          setChatStarted(false);
                          setFormValues({});
                          setFormErrors({});
                        }}
                        className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                      >
                        <ChevronRight size={18} className="rotate-180" />
                      </button>
                    )}
                    {form.logoUrl && (
                      <img
                        src={form.logoUrl}
                        alt="Brand"
                        className="w-8 h-8 rounded-lg object-cover bg-white/10"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    )}
                    <h4 className="font-bold text-lg leading-tight">
                      {resolveWidgetDisplayTitle(form)}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <MoreHorizontal size={18} />
                    <X
                      size={18}
                      className="cursor-pointer"
                      onClick={() => {
                        setShowForm(false);
                        setChatStarted(false);
                        setFormValues({});
                        setFormErrors({});
                      }}
                    />
                  </div>
                </div>
                {!showForm && !chatStarted && (
                  <p className="text-sm font-medium opacity-90 leading-snug">
                    {form.welcomeMessage !== undefined
                      ? form.welcomeMessage
                      : "Hi there! Tell us what you need and we will connect you to the right specialist."}
                  </p>
                )}
              </div>

              <div
                className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar flex flex-col"
                style={{
                  backgroundColor: form.backgroundColor || THEME_COLORS.bgWhite,
                }}
              >
                {showForm ? (
                  <form
                    onSubmit={handleFormSubmit}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4"
                  >
                    <div className="text-center space-y-1 mb-2">
                      <h5 className="text-sm font-bold text-slate-800">
                        Introduce yourself
                      </h5>
                      <p className="text-[10px] font-medium text-slate-400">
                        Please fill out the form below to start chatting.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(form.preChatForm?.fields || []).map((field, i) => (
                        <div key={i} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            {field.label}
                            {field.required && (
                              <span className="text-rose-500">*</span>
                            )}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              value={formValues[`field_${i}`] || ""}
                              onChange={(e) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [`field_${i}`]: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none resize-none"
                              placeholder={field.placeholder}
                              required={field.required}
                              rows={2}
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={formValues[`field_${i}`] || ""}
                              onChange={(e) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [`field_${i}`]: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          )}
                          {formErrors[`field_${i}`] && (
                            <p className="text-[10px] font-semibold text-rose-600">
                              {formErrors[`field_${i}`]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {formErrors.form && (
                      <p className="text-[10px] font-semibold text-rose-600">
                        {formErrors.form}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-[1.02] shadow-lg"
                      style={{
                        backgroundColor: form.brandColor,
                        color: form.textColor,
                      }}
                    >
                      Start Chatting
                    </button>
                  </form>
                ) : chatStarted ? (
                  <div className="flex-1 flex flex-col gap-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[85%] p-3 rounded-2xl text-[11px] font-medium animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                          msg.role === "user"
                            ? "self-end bg-emerald-600 text-white rounded-br-none shadow-sm shadow-emerald-500/20"
                            : "self-start bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200"
                        }`}
                        style={
                          msg.role === "user"
                            ? {
                                backgroundColor: form.brandColor,
                                color: form.textColor,
                              }
                            : {}
                        }
                      >
                        {msg.type === "file" ? (
                          <div className="flex items-center gap-2">
                            <Paperclip size={12} />
                            <span className="underline cursor-pointer">
                              {msg.text}
                            </span>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-1">
                      <h5 className="text-sm font-bold text-slate-800">
                        Hello! How Are You?
                      </h5>
                      <p className="text-[11px] font-medium text-slate-400">
                        {form.subtitle !== undefined
                          ? form.subtitle
                          : "Most first responses arrive in under 5 minutes during business hours"}
                      </p>
                    </div>

                    <button
                      onClick={handleStartConversation}
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                      style={{
                        backgroundColor: form.brandColor,
                        color: form.textColor,
                      }}
                    >
                      <Send size={14} /> Start Conversation
                    </button>

                    {form.autoReplySuggestions !== false &&
                      suggestedMessages.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Suggested Auto Replies
                          </p>
                          <div className="space-y-2">
                            {suggestedMessages.map((item, i) => (
                              <div
                                key={i}
                                onClick={() =>
                                  handleSuggestedMessageClick(item)
                                }
                                className="p-3.5 bg-black/5 rounded-2xl border border-black/5 hover:bg-black/10 transition-colors cursor-pointer group/item"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1">
                                    <p className="text-[11px] font-semibold text-slate-700">
                                      {item.message}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-500">
                                      {item.answer
                                        ? item.answer.length > 90
                                          ? `${item.answer.slice(0, 90)}...`
                                          : item.answer
                                        : "Auto reply will be shown when this message is selected."}
                                    </p>
                                  </div>
                                  <ChevronRight
                                    size={14}
                                    className="mt-0.5 shrink-0 text-slate-300 group-hover/item:text-slate-500 transition-colors"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {form.showFaqs !== false &&
                      publishedFaqItems.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            FAQ Topics
                          </p>
                          <div className="space-y-2">
                            {publishedFaqItems.slice(0, 3).map((item, i) => (
                              <div
                                key={`preview-faq-${i}`}
                                onClick={() => handleFaqMessageClick(item)}
                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group/item"
                              >
                                <span className="truncate pr-3">
                                  {item.question}
                                </span>
                                <ChevronRight
                                  size={14}
                                  className="shrink-0 text-slate-300 group-hover/item:text-slate-500 transition-colors"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>

              {(chatStarted || (!showForm && !chatStarted)) && (
                <div
                  className="p-4 border-t border-black/5 shrink-0 relative"
                  style={{
                    backgroundColor:
                      form.backgroundColor || THEME_COLORS.bgWhite,
                  }}
                >
                  {showEmojiPicker && (
                    <div className="absolute bottom-[calc(100%+10px)] right-4 z-20">
                      <EmojiPicker
                        onEmojiClick={(emojiData) =>
                          handleEmojiClick(emojiData.emoji || "")
                        }
                        height={360}
                        width={320}
                        lazyLoadEmojis
                      />
                    </div>
                  )}

                  <form
                    onSubmit={
                      chatStarted
                        ? handleSendMessage
                        : (e) => e.preventDefault()
                    }
                    className="bg-black/5 rounded-xl px-4 py-3 flex items-center gap-3 border border-black/5"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        chatStarted
                          ? "Type a message..."
                          : "Introduce yourself first"
                      }
                      disabled={!chatStarted}
                      className="bg-transparent border-none outline-none text-[11px] font-medium text-slate-600 flex-1 placeholder:text-slate-400"
                    />
                    <div className="flex items-center gap-2 text-slate-400">
                      {form.showEmojis && (
                        <Smile
                          size={16}
                          className={`cursor-pointer transition-colors ${showEmojiPicker ? "text-emerald-500" : "hover:text-slate-600"}`}
                          onClick={() =>
                            chatStarted && setShowEmojiPicker(!showEmojiPicker)
                          }
                        />
                      )}
                      {form.allowFileUploads && (
                        <Paperclip
                          size={16}
                          className="cursor-pointer hover:text-slate-600 transition-colors"
                          onClick={() => chatStarted && handleFileUpload()}
                        />
                      )}
                      {chatStarted && inputValue.trim() && (
                        <button
                          type="submit"
                          className="text-emerald-500 hover:text-emerald-600"
                        >
                          <Send size={16} />
                        </button>
                      )}
                    </div>
                  </form>
                  <p className="text-center text-[8px] font-bold text-slate-300 mt-2 uppercase tracking-tight">
                    Powered by ChatFlex
                  </p>
                </div>
              )}
            </div>

            <div
              className={`absolute bottom-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-all duration-500 cursor-pointer ${
                form.position === "left" ? "left-6" : "right-6"
              }`}
              style={{ backgroundColor: form.brandColor }}
            >
              <MoreHorizontal size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
