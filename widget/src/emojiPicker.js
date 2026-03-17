import { createElement } from "react";
import { createRoot } from "react-dom/client";
import EmojiPicker from "emoji-picker-react";

const pickerRoots = new WeakMap();

export function mountEmojiPicker(container, onSelect) {
  if (!container) return;
  let root = pickerRoots.get(container);
  if (!root) {
    root = createRoot(container);
    pickerRoots.set(container, root);
  }

  root.render(
    createElement(EmojiPicker, {
      width: "100%",
      height: 280,
      lazyLoadEmojis: true,
      skinTonesDisabled: false,
      previewConfig: { showPreview: false },
      onEmojiClick: (emojiData) => {
        const emoji = String(emojiData?.emoji || "");
        if (emoji && typeof onSelect === "function") {
          onSelect(emoji);
        }
      },
    }),
  );
}

export function unmountEmojiPicker(container) {
  if (!container) return;
  const root = pickerRoots.get(container);
  if (!root) return;
  root.unmount();
  pickerRoots.delete(container);
}
