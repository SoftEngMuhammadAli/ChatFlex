const express = require("express");
const auth = require("../middleware/auth");
const {
  register,
  login,
  me,
  requestEmailVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  oauthLogin
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/oauth", oauthLogin);
router.post("/verify-email/request", requestEmailVerification);
router.post("/verify-email/confirm", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", auth, me);

module.exports = router;
