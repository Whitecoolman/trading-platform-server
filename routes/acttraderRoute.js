const express = require("express");

const {
    LoginAccount,
    GetAllAccounts,
} = require("../controllers/acttraderController");

const router = express.Router();

router.post("/login", LoginAccount);
router.post("/all-accounts", GetAllAccounts);

module.exports = router;