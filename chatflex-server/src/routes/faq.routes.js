const express = require("express");
const auth = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const { listFaqs, createFaq, updateFaq, deleteFaq, listPublicFaqs } = require("../controllers/faq.controller");

const router = express.Router();

router.get("/", auth, listFaqs);
router.post("/", auth, allowRoles("owner", "admin"), createFaq);
router.patch("/:faqId", auth, allowRoles("owner", "admin"), updateFaq);
router.delete("/:faqId", auth, allowRoles("owner", "admin"), deleteFaq);

router.get("/public/:workspaceId", listPublicFaqs);

module.exports = router;
