const crypto = require("crypto");

const createOneTimeToken = (ttlMinutes = 30) => {
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return { plainToken, tokenHash, expiresAt };
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports = {
  createOneTimeToken,
  hashToken
};
