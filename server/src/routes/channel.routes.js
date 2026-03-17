import express from "express";
import {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
  verifyMessengerWebhook,
  receiveMessengerWebhook,
  sendMetaMessage,
} from "../controllers/channel.controller.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Meta webhooks (public endpoints used by providers)
router.get("/whatsapp/:integrationId/webhook", verifyWhatsAppWebhook);
router.post("/whatsapp/:integrationId/webhook", receiveWhatsAppWebhook);

router.get("/facebook-messenger/:integrationId/webhook", verifyMessengerWebhook);
router.post("/facebook-messenger/:integrationId/webhook", receiveMessengerWebhook);

// Sending messages from dashboard (auth required)
router.post("/meta/:integrationId/send", checkAuth, sendMetaMessage);

export default router;

