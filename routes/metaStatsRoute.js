const express = require("express");

const {
  GetTotalStats,
  GetTrades,
  GetVisualStats,
  GetVisualTrades,
} = require("../controllers/metaStatsController.js");

const router = express.Router();

router.post("/total-stats", GetTotalStats);
router.post("/trades", GetTrades);
router.post("/visual-stats", GetVisualStats)
router.post("/visual-trades", GetVisualTrades);

module.exports = router;
