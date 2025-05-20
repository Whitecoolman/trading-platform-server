const express = require("express");
const {
  UpdateProfile,
  GetProfile,
  UploadImage,
} = require("../controllers/profileController");

const router = express.Router();

router.post("/update", UpdateProfile);
router.post("/get", GetProfile);
router.post("/upload-image", UploadImage);

module.exports = router;
