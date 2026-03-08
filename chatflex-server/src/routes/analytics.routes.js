const express = require("express");
const auth = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const { getSummary } = require("../controllers/analytics.controller");

const router = express.Router();

router.get("/summary", auth, allowRoles("owner", "admin"), getSummary);

module.exports = router;
