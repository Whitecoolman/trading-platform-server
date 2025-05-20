const prisma = require("../config/prisma");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to store images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (extname && mimeType) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
}).single("image");

async function UpdateProfile(req, res) {
  const {
    email,
    name,
    bio,
    tradingViewAccount,
    twitterAccount,
    youtubeChannel,
    youtubeUserName,
    websiteURL,
    publicUserName,
    publicRole,
  } = req.body;


  try {
    // Find the user by email
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: existingUser.profileId },
      data: {
        name: name,
        bio: bio,
        tradingViewAccount: tradingViewAccount,
        twitterAccount: twitterAccount,
        youtubeChannel: youtubeChannel,
        youtubeUserName: youtubeUserName,
        websiteURL: websiteURL,
        publicUserName: publicUserName,
        publicRole: publicRole,
      },
    });

    console.log("Profile updated successfully");

    res.status(200).json({
      status: "Success",
      message: "Profile updated successfully",
      data: {
        email: email,
        updatedProfile,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}
async function GetProfile(req, res) {
  const { email } = req.body;
  try {
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: {
        profile: true,
      },
    });
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    const profile = await prisma.profile.findFirst({
      where: { id: existingUser.profileId },
    });
    const { password: _, ...user_data } = existingUser;
    res.status(200).json({
      status: "Success",
      message: "Profile found successfully",
      data: {
        email: email,
        user: user_data,
        profile,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}
async function UploadImage(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        status: "error",
        message: err.message,
      });
    }

    const { email } = req.body;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }

    try {
      // Find the user by email
      const existingUser = await prisma.user.findFirst({
        where: { email },
        include: { profile: true },
      });

      if (!existingUser) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }
      // Update the profile image in the database
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          picture: `/uploads/${req.file.filename}`,
        },
      });
      res.status(200).json({
        status: "Success",
        message: "Image uploaded successfully",
        data: {
          user: existingUser,
          picture: updatedUser.picture,
        },
      });
    } catch (err) {
      console.error("Error uploading image:", err);
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  });
}
module.exports = {
  UpdateProfile,
  GetProfile,
  UploadImage,
};
