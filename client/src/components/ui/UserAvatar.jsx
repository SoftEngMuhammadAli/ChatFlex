import React from "react";

const getInitial = (name) => {
  const value = String(name || "").trim();
  return value ? value.charAt(0).toUpperCase() : "U";
};

const UserAvatar = ({
  name,
  src,
  sizeClass = "w-10 h-10",
  textClass = "text-sm",
  className = "",
  fallbackClassName = "bg-slate-100 text-slate-700",
  alt,
}) => {
  const [broken, setBroken] = React.useState(false);
  const hasImage = Boolean(src) && !broken;

  React.useEffect(() => {
    setBroken(false);
  }, [src]);

  if (hasImage) {
    return (
      <img
        src={src}
        alt={alt || name || "User avatar"}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold ${textClass} ${fallbackClassName} ${className}`}
      aria-label={alt || name || "User avatar"}
      title={name || "User"}
    >
      {getInitial(name)}
    </div>
  );
};

export default UserAvatar;
