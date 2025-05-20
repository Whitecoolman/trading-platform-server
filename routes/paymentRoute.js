const express = require("express");
const { UpdatePayment, CheckPayment } = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authenticate");

const router = express.Router();

router.post("/update", authMiddleware, UpdatePayment);
router.post("/check", authMiddleware, CheckPayment);

module.exports = router;
