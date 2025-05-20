const express = require("express");

const {
  GetTrades,
  GetMetaTrades,
  GetTradeLockerTrades,
  GetTotalTradesStats,
  GetCalendarTradesStats,
} = require("../controllers/tradeController.js");

const router = express.Router();

router.post("/meta/trades", GetTrades);
router.post("/meta/getTrades", GetMetaTrades);
router.post("/tradelocker/getTrades", GetTradeLockerTrades);
router.post("/meta/totalTradesStats", GetTotalTradesStats);
router.post("/meta/calendarTradesStats", GetCalendarTradesStats)

module.exports = router;
