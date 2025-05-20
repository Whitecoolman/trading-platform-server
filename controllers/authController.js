const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const prisma = require("../config/prisma");
require("dotenv").config();
const frontend_url = process.env.FRONTEND_URL;

const signToken = (user, picture) => {
  const payload = {
    id: user.id,
    email: user.email,
    picture: picture,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "10d",
  });
};
// Configure your email transport
const transporter = nodemailer.createTransport({
  service: "gmail", // or another email service
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

async function WhopAuth(req, res) {
  try {
    const { code, client_id, client_secret, redirect_url } = req.body;
    console.log("🎈 req body --------->", req.body);
    const tokenResponse = await axios.post(
      "https://api.whop.com/v5/oauth/token",
      {
        code,
        client_id,
        client_secret,
        redirect_uri: redirect_url,
      }
    );
    console.log("🎈🎈token response--->", tokenResponse.data.access_token);
    let access_token = "";
    if (tokenResponse) {
      access_token = tokenResponse.data.access_token;
    }
    console.log("🎈🎈🎈🎈🎈🎈🎈🎈", access_token);
    const userInfoResponse = await axios.get("https://api.whop.com/v5/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    console.log("🎈🎈🎈user info response---->", userInfoResponse.data);
    const existingUser = await prisma.user.findFirst({
      where: {
        email: userInfoResponse.data.email,
      },
    });
    if (existingUser) {
      const jwtToken = signToken(existingUser, existingUser.picture);
      return res.json({
        message: "login",
        jwtToken,
        whopToken: access_token,
        data: { existingUser },
      });
    }
    const newProfile = await prisma.profile.create({ data: {} });
    const newUser = await prisma.user.create({
      data: {
        email: userInfoResponse.data.email,
        picture: userInfoResponse.data.profile_pic_url,
        profileId: newProfile.id,
      },
    });
    const registeredUser = await prisma.user.findFirst({
      where: {
        email: userInfoResponse.data.email,
      },
    });
    console.log("registered---🎈🎈🎈🎈🎈🎈🎈", registeredUser);
    await prisma.payment.create({
      data: {
        userId: registeredUser.id,
        role: "",
        accountCount: 0,
      },
    });

    const jwtToken = signToken(newUser, newUser.picture);
    // Optionally exclude the password field
    newUser.password = undefined;

    res.status(200).json({
      message: "singnup",
      jwtToken,
      whopToken: access_token,
      data: { newUser },
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      status: "error",
      code: 500,
      message: err.message,
    });
  }
}


// Google Auth
async function GoogleAuth(req, res) {
  try {
    const { access_token } = req.body;
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      }
    );

    if (response.status !== 200) {
      return res.status(400).json({
        status: "error",
        message: "Failed to fetch user data from Google",
      });
    }

    const userInfo = response.data;

    if (!userInfo || !userInfo.email) {
      return res.status(400).json({
        status: "error",
        message: "Invalid token or user data not found",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: userInfo.email },
    });

    if (existingUser) {
      const token = signToken(existingUser, existingUser.picture);
      return res.json({ message: "login", token, data: { existingUser } });
    }

    // Create new profile and user if not found
    const newProfile = await prisma.profile.create({ data: {} });
    const newUser = await prisma.user.create({
      data: {
        email: userInfo.email,
        picture: userInfo.picture,
        profileId: newProfile.id,
      },
    });

    const token = signToken(newUser, newUser.picture);

    // Optionally exclude the password field
    newUser.password = undefined;

    res.status(200).json({
      message: "success",
      token,
      data: { newUser },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      code: 500,
      data: [],
      message: "Internal Server Error",
    });
  }
}

// Register
async function Register(req, res) {
  const { email, password } = req.body;
  console.log(email, password, "body");
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: "failed",
        message: "It seems you already have an account, please log in instead.",
      });
    }

    // Hash the password and create a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newProfile = await prisma.profile.create({ data: {} });
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, profileId: newProfile.id },
    });
    const { password: _, ...user_data } = newUser;
    const token = jwt.sign(newUser, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_TIMEOUT,
    });
    res.status(200).json({
      status: "success",
      token,
      data: [user_data],
      message:
        "Thank you for registering with us. Your account has been successfully created.",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

// Login
async function Login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return res.status(401).json({
        status: "failed",
        message:
          "Invalid email or password. Please try again with the correct credentials.",
      });
    }
    console.log("🎈email-password----------->", email, password);
    if (!user.password) {
      return res.status(401).json({
        status: "failed",
        message:
          "This account was created using Google authentication. Please log in using Google.",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "failed",
        message:
          "Invalid email or password. Please try again with the correct credentials.",
      });
    }

    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_TIMEOUT,
    });
    const { password: _, ...user_data } = user;

    res.status(200).json({
      status: "success",
      token,
      data: [user_data],
      message: "You have successfully logged in.",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

//Logout
async function Logout(req, res) {
  try {
    const authHeader = req.headers["cookie"];
    if (!authHeader) return res.sendStatus(204);

    const cookie = authHeader.split("=")[1];
    const accessToken = cookie.split(";")[0];

    // Blacklist the token
    await pool.query("INSERT INTO blacklist (token) VALUES ($1)", [
      accessToken,
    ]);

    res.setHeader("Clear-Site-Data", '"cookies"');
    res.status(200).json({ message: "You are logged out!" });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

// Forgot Password
async function ForgotPassword(req, res) {
  try {
    const { email } = req.body;

    // Query to find the user by email
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = userResult.rows[0]; // Access the first row

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Generate a password reset token
    const token = crypto.randomBytes(20).toString("hex");
    const resetPasswordExpires = Date.now() + 3600000; // 1 hour

    // Update the user with the reset token and expiration
    await pool.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
      [token, resetPasswordExpires, user.id]
    );

    // Send email with the reset link
    const resetUrl = `http://${frontend_url}/auth/reset-password/${token}`;
    await transporter.sendMail({
      from: '"Meet Astro Team" <bentan010918@gmail.com>', // Correct format
      to: email,
      subject: "Password Reset",
      html: `Click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a>`,
    });

    res.send("Password reset link sent to your email");
  } catch (error) {
    console.error("Error sending email:", error.message); // Improved error logging
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Resets the user's password.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function ResetPassword(req, res) {
  try {
    const { token, password } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
      [token]
    );

    if (user.rows.length === 0)
      return res.status(400).send("Invalid or expired token");

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
      [hashedPassword, user.rows[0].id]
    );

    res.send("Password has been reset");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
}

// Exporting the functions for use in other modules
module.exports = {
  GoogleAuth,
  WhopAuth,
  Register,
  Login,
  Logout,
  ForgotPassword,
  ResetPassword,
};
