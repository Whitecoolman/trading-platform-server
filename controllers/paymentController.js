const prisma = require("../config/prisma");
const axios = require("axios");
require("dotenv").config();

async function UpdatePayment(req, res) {
  try {
    const { email, role, accountCount, product_id } = req.body;
    console.log("Received data:", req.body);
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });
    console.log("Existing user:", existingUser);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }
    console.log("Existing user ID:", existingUser.id);
    const paymentRecord = await prisma.payment.findFirst({
      where: { userId: existingUser.id },
    });

    if (!paymentRecord) {
      return res.status(404).json({ message: "Payment record not found." });
    }
    console.log("Payment record:", paymentRecord.id);
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        role,
        accountCount,
        product_id,
      },
    });
    return res
      .status(200)
      .json({ status: "success", message: "Payment updated successfully" });
  } catch (error) {
    console.error("Error updating payment:", error.message);
    return res.status(500).json({ message: error.message });
  }
}

async function CheckPayment(req, res) {
  try {
    const { product_id, whopToken } = req.body;
    console.log("check-req-body-------🎈", req.body);
    const response = await axios.get(
      `https://access.api.whop.com/check/${product_id}`,
      {
        headers: {
          Authorization: `Bearer ${whopToken}`,
        },
      }
    );
    res.status(200).json({
      status: "success",
      data: {
        access: response.data.access,
      },
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

module.exports = {
  UpdatePayment,
  CheckPayment,
};
