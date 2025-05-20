const express = require("express");

const {
  GetSymbols,
  CreateBasicWebhook,
  CreatePremiumWebhook,
  CreateAdvancedWebhook,
  ConnectWebhook,
  UpdateBasicWebhook,
  UpdatePremiumWebhook,
  UpdateAdvancedWebhook,
  OpenBasicTrade,
  OpenAdvancedTrade,
  GetWebhooks,
  DeleteWebhook,
  DisconnectWebhook,
} = require("../controllers/webhookController.js");

const router = express.Router();

router.post("/get-symbols", GetSymbols);

router.post("/createBasicWebhook", CreateBasicWebhook);
router.post("/createPremiumWebhook", CreatePremiumWebhook);
router.post("/createAdvancedWebhook", CreateAdvancedWebhook);
router.post("/diconnectWebhook", DisconnectWebhook);
router.post("/connectWebhook", ConnectWebhook);
router.post("/getWebhooks", GetWebhooks);
router.post("/deleteWebhook", DeleteWebhook);
router.post("/updateBasicWebhook", UpdateBasicWebhook);
router.post("/updatePremiumWebhook", UpdatePremiumWebhook);
router.post("/updateAdvancedWebhook", UpdateAdvancedWebhook);
router.post("/open-basictrade", OpenBasicTrade);
router.post("/open-advancedtrade", OpenAdvancedTrade);

module.exports = router;
