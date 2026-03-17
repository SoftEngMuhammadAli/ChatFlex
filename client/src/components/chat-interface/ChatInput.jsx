import React from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const ChatInput = ({
  input,
  setInput,
  handleSend,
  loading,
  activeTab,
  onTypingChange,
  onSendAttachments,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setInput(nextValue);
    if (onTypingChange) {
      onTypingChange(nextValue.trim().length > 0);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => `${prev}${emojiData.emoji || ""}`);
    setShowEmojiPicker(false);
  };

  return (
    <div className="relative group p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      {showEmojiPicker && (
        <div className="absolute right-4 bottom-[78px] z-20">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            height={360}
            width={320}
            lazyLoadEmojis
          />
        </div>
      )}
      <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl p-2 px-3 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all duration-300">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0 && typeof onSendAttachments === "function") {
              onSendAttachments(files);
            }
            e.target.value = "";
          }}
        />
        <textarea
          className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 custom-scrollbar max-h-40"
          placeholder={
            loading
              ? "AI is thinking..."
              : activeTab === "ai"
                ? "Ask AI anything..."
                : "Message your team..."
          }
          value={input}
          disabled={loading}
          onChange={handleChange}
          onBlur={() => onTypingChange && onTypingChange(false)}
          rows={1}
          style={{ height: "auto" }}
          onInput={(e) => {
            e.target.style.height = "auto";
            const maxHeight = 160;
            const nextHeight = Math.min(e.target.scrollHeight, maxHeight);
            e.target.style.height = `${nextHeight}px`;
            e.target.style.overflowY =
              e.target.scrollHeight > maxHeight ? "auto" : "hidden";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="flex-shrink-0 w-9 h-9 rounded-xl text-gray-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition"
          title="Emoji"
        >
          <Smile size={18} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-9 h-9 rounded-xl text-gray-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 flex items-center justify-center transition"
          title="Attach files"
        >
          <Paperclip size={18} />
        </button>

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
            input.trim() && !loading
              ? "bg-primary text-white shadow-lg shadow-primary/10 hover:bg-primary-hover"
              : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
