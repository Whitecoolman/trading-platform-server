const express = require("express");
const validate = require("../middleware/validate.js");
const { check } = require("express-validator");

const {
  CreateAccount,
  GetAccountInfo,
  GetAccounts,
  DeleteAccount,
  UpdateAccount,
} = require("../controllers/metaController.js");

const router = express.Router();

router.post("/create-account", CreateAccount);
router.post("/get-accountInfo", GetAccountInfo);
router.post("/get-accounts", GetAccounts);
router.post("/delete-account", DeleteAccount);
router.post("/update-account", UpdateAccount);

module.exports = router;
