import { Bot } from "lucide-react";
import React from "react";

const AITypingIndicator = () => {
  return (
    <div className="px-6 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        {/* AI Avatar */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-red-500 text-white shadow-md">
          <Bot size={16} />
        </div>
        {/* Bubble */}
        <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 shadow-sm max-w-xs">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            AI is Typing...
          </div>
          {/* Typing Dots */}
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITypingIndicator;
