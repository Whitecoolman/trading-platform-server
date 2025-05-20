const express = require("express");

const {
  LoginAccount,
  GetAllAccounts,
  RefreshAuth,
  GetAccountInfo,
} = require("../controllers/tradelockerController.js");

const router = express.Router();

router.post("/login", LoginAccount);
router.post("/all-accounts", GetAllAccounts);
router.post("/refresh", RefreshAuth);
router.post("/info", GetAccountInfo);

module.exports = router;
