const jwt = require("jsonwebtoken");

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      workspaceId: user.workspaceId,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

module.exports = { signToken };
