const express = require("express");

const {
    LoginAccount,
    GetAllAccounts,
    GetAllAccounts2
} = require("../controllers/acttraderController");

const router = express.Router();

router.post("/login", LoginAccount);
router.post("/all-accounts", GetAllAccounts);

module.exports = router;