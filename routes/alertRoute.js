const express = require("express");
const {
  OpenTradeByAlert,
  GetAllAlerts,
  UpdateAlert,
} = require("../controllers/alertController");
const router = express.Router();

router.post("/:hashedWebhook", OpenTradeByAlert);
router.post("/get/allAlerts", GetAllAlerts);
router.post("/update/alert", UpdateAlert);

module.exports = router;
