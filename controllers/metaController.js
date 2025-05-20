// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const axios = require("axios");
const prisma = require("../config/prisma");
const MetaApi = require("metaapi.cloud-sdk");
const checkPayment = require("./webhookController")
require("dotenv").config();
let connections = [];

async function Connection(accountId) {
  console.log("🔹 Step 1: Checked MetaAPI Token");
  const metaapi = new MetaApi.default(process.env.METAAPI_TOKEN);
  console.log("🔹 Step 2: Prepared Account Data");
  const account = await metaapi.metatraderAccountApi.getAccount(accountId);
  console.log("🔹 Step 3: Get MetaTrader Account");
  console.log("account connect status  1---->", account.connectionStatus);
  await account.deploy();
  await account.waitConnected();
  console.log("account connect status  2---->", account.connectionStatus);
  const connection = account.getRPCConnection();
  console.log("🔹 Step 4: Connect to MetaTrader Account");
  await connection.connect();
  console.log("🔹 Step 5: RPC connect");
  await connection.waitSynchronized();
  console.log("🔹 Step 6: wait synchronized");
  return connection;
}

function generateBrokerName(serverName) {
  if (serverName.includes("ICMarkets")) {
    return "ICMarkets";
  } else if (serverName.includes("OANDA")) {
    return "OANDA";
  } else if (serverName.includes("FXCM")) {
    return "FXCM";
  } else if (serverName.includes("Pepperstone")) {
    return "Pepperstone";
  } else if (serverName.includes("XM")) {
    return "XM";
  }

  return "Unknown Broker"; // Default return value if no match is found
}

async function CreateAccount(req, res) {
  try {
    let newAccount = {};
    const { email, login, password, server, platform, whopToken } = req.body;
    if (!["mt4", "mt5"].includes(platform)) {
      return res
        .status(400)
        .json({ error: "❌Invalid platform. Use 'mt4' or 'mt5'." });
    }
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: existingUser.id },
    });
    const existingAccountCount = await prisma.mTAccount.count({
      where: { userId: existingUser.id },
    });
    if (Number(existingPayment.accountCount) <= Number(existingAccountCount)) {
      return res.status(400).json({
        error: "Account Count limit reached. Please upgrade your plan.",
      });
    }
    const confirmPayment = await checkPayment(existingPayment.product_id, whopToken);
    if (confirmPayment.hasAccess === false) {
      return res.status(400).json({
        error: "Payment confirmation failed. Please check your payment status.",
      });
    }
    const currentDate = new Date().toISOString().split("T")[0];
    const metaapi = new MetaApi.default(process.env.METAAPI_TOKEN);
    console.log("🔹 Step 1: Checking Account Data");

    let accounts =
      await metaapi.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();
    let existedAccount = accounts.find(
      (acc) => acc.login === login && acc.type.startsWith("cloud")
    );
    if (!existedAccount) {
      const accountData = {
        name: `${generateBrokerName(
          server
        )}-${platform.toUpperCase()}-[${currentDate}]`,
        type: "cloud",
        login,
        platform,
        password,
        server,
        region: "new-york",
        manualTrades: true,
        metastatsApiEnabled: true,
        magic: 0,
        keywords: ["Raw Trading Ltd"],
        quoteStreamingIntervalInSeconds: 2.5,
        reliability: "regular",
      };
      const account = await metaapi.metatraderAccountApi.createAccount(
        accountData
      );
      console.log("✅ Account Created Successfully:", account.id);
      newAccount = await prisma.mTAccount.create({
        data: {
          userId: existingUser.id,
          accountId: account.id,
          brokerName: generateBrokerName(account.server),
          accountName: account.name,
          platform: platform,
          server: account.server,
          login: account.login,
          password: password,
        },
      });
    } else {
      const existingAccount = await prisma.mTAccount.findFirst({
        where: { login: login },
      });
      if (existingAccount) {
        return res.status(400).json({ error: "User already has this account" });
      }
      newAccount = await prisma.mTAccount.create({
        data: {
          userId: existingUser.id,
          accountId: existedAccount.id,
          brokerName: generateBrokerName(server),
          accountName: existedAccount.name,
          platform,
          server,
          login,
          password,
        },
      });
    }
    return res.status(200).json({
      status: "success",
      code: 200,
      data: { newAccount },
    });
  } catch (err) {
    console.error("❌ Error Creating MetaTrader Account:", err);

    // Handle API-specific errors
    if (err.details) {
      if (err.details.code === "E_SRV_NOT_FOUND") {
        return res.status(400).json({
          error: "Server not found. Please check your broker's server name.",
        });
      } else if (err.details.code === "E_AUTH") {
        return res.status(401).json({
          error: "Authentication failed. Check your login credentials.",
        });
      } else if (err.details.code === "E_RESOURCE_SLOTS") {
        return res.status(429).json({
          error: "Resource slot limit exceeded. Upgrade your MetaAPI plan.",
        });
      }
    }

    // Handle ForbiddenError specifically
    if (
      err.name === "ForbiddenError" &&
      err.message.includes(
        "To allow high reliability please top up your account"
      )
    ) {
      return res.status(403).json({
        status: "error",
        code: 403,
        message:
          "Account creation failed. Please upgrade your MetaAPI plan to allow for high reliability accounts.",
      });
    }

    return res.status(500).json({
      status: "error",
      code: 500,
      message: err.message,
    });
  }
}

async function GetAccountInfo(req, res) {
  try {
    const { accountId } = req.body;

    const existConnection = connections.find(
      (connect) => connect.accountId === accountId
    );
    let connection;

    if (existConnection) {
      console.log("existConnection.accountId", existConnection.accountId);
      connection = existConnection.connection;
    } else {
      connection = await Connection(accountId);
      connections.push({ accountId, connection });
    }

    // Get account information
    const accountInformation = await connection.getAccountInformation();
    console.log("✅ Get account information successfully:", accountInformation);

    return res.status(200).json({
      status: "success",
      code: 200,
      data: { accountInformation },
    });
  } catch (err) {
    console.error("❌ Getting information failed:", err);

    // Return a more specific error message if available
    return res.status(500).json({
      status: "error",
      code: 500,
      message: err.message || "Internal Server Error",
    });
  }
}

async function GetAccounts(req, res) {
  try {
    const { email } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: {
        MTAccount: true,
      },
    });
    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    const accounts = await prisma.mTAccount.findMany({
      where: { userId: existingUser.id },
      select: {
        accountId: true,
        accountName: true,
        platform: true,
        server: true,
        login: true,
        password: true,
      },
    });
    console.log("✅ Meta account was successfully discovered.");
    res.status(200).json({
      status: "Success",
      message: "Meta Accounts are found successfully",
      data: {
        accounts,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: err.message || "Internal Server Error",
    });
  }
}

async function DeleteAccount(req, res) {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Account ID is required.",
    });
  }
  const metaapi = new MetaApi.default(process.env.METAAPI_TOKEN);
  const account = await metaapi.metatraderAccountApi.getAccount(accountId);
  await account.remove();
  const deletedAccount = await prisma.mTAccount.delete({
    where: { accountId: accountId },
    select: {
      accountId: true,
      accountName: true,
      platform: true,
      server: true,
      login: true,
    },
  });

  return res.status(200).json({
    status: "success",
    code: 200,
    data: { deletedAccount },
  });
}

async function UpdateAccount(req, res) {
  const { name, accountId, password, server } = req.body;
  if (!accountId) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Account ID is required.",
    });
  }
  try {
    const metaapi = new MetaApi.default(process.env.METAAPI_TOKEN);
    const account = await metaapi.metatraderAccountApi.getAccount(accountId);
    await account.update({
      name: name,
      password: password,
      server: server,
      quoteStreamingIntervalInSeconds: 2.5,
    });
    console.log("✅ Meta account is updated successfully!");
    const updatedAccount = await prisma.mTAccount.update({
      where: { accountId: accountId },
      data: { accountName: name },
      select: {
        accountId: true,
        accountName: true,
        platform: true,
        server: true,
        login: true,
      },
    });
    res.status(200).json({
      status: "success",
      code: 200,
      data: { updatedAccount },
    });
  } catch (err) {
    console.error("Error updating Meta Account:", err);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  CreateAccount,
  GetAccountInfo,
  GetAccounts,
  DeleteAccount,
  UpdateAccount,
};
