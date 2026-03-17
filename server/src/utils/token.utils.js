import jwt from "jsonwebtoken";

export const generateAccessToken = (user, extraClaims = {}) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      ...(extraClaims && typeof extraClaims === "object" ? extraClaims : {}),
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );
};

export const generateRefreshToken = (user) => {
  const refreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET;
  return jwt.sign(
    {
      id: user._id,
    },
    refreshSecret,
    { expiresIn: "7d" },
  );
};

export const generateToken = (user, extraClaims = {}) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      ...(extraClaims && typeof extraClaims === "object" ? extraClaims : {}),
    },
    process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
  );
};
