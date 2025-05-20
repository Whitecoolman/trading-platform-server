const express = require("express");
const validate = require("../middleware/validate.js");
const { check } = require("express-validator");
const {
  Register,
  Login,
  GoogleAuth,
  ForgotPassword,
  ResetPassword,
  WhopAuth,
} = require("../controllers/authController.js");

const router = express.Router();

router.post(
  "/register",
  check("email")
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
  check("password")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Must be at least 8 chars long"),
  validate,
  Register
);
router.post(
  "/login",
  check("email")
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
  check("password").not().isEmpty(),
  validate,
  Login
);
router.post("/google", GoogleAuth);
router.post("/whop", WhopAuth);
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password", ResetPassword);

module.exports = router;
