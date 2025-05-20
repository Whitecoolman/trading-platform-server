const jwt = require("jsonwebtoken");
require('dotenv').config()

const authMiddleware = async (req, res, next) => {
  try {
    console.log('req.headers.authorization :>> ', req.headers.authorization);
    // Get the token from the headers
    const token = req.headers.authorization?.split(" ")[1]; // Bearer token
    if (!token) {
      return res.status(401).json({
        status: "failed",
        message: "Access denied. No token provided.",
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure you have a JWT_SECRET in your .env file
    req.user = decoded;

    // Call the next middleware or route handler
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token.",
    });
  }
};

module.exports = { authMiddleware };
