import React, { useEffect, useState } from "react";

const CustomLoader = ({
  message = "Loading your workspace...",
  fullPage = true,
  iconOnly = false,
  className = "",
}) => {
  const [displayText, setDisplayText] = useState("");

  // Typing animation
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayText(message.slice(0, index));
      index++;

      if (index > message.length) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [message]);

  if (iconOnly) {
    return (
      <div className={`relative ${className}`}>
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 animate-ping"></span>
        <span className="relative block h-5 w-5 rounded-full bg-emerald-500"></span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        fullPage && !className.includes("min-h") ? "min-h-[400px]" : ""
      } ${className}`}
    >
      {/* Loader */}
      <div className="relative mb-6">
        {/* Outer pulse */}
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 animate-ping"></span>

        {/* Main circle */}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
          <span className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
        </span>
      </div>

      {/* Typing Text */}
      {message && (
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
          {displayText}
          <span className="animate-pulse ml-1">|</span>
        </p>
      )}
    </div>
  );
};

export default CustomLoader;
