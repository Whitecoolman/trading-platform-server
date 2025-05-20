const prisma = require("../config/prisma");
const axios = require("axios");
require("dotenv").config();

async function DefineURL(accountType) {
  let baseURL = "";
  if (accountType == "DEMO") {
    baseURL = process.env.TRADELOCKER_DEMO_BASE_URL;
  } else {
    baseURL = process.env.TRADELOCKER_LIVE_BASE_URL;
  }
  return baseURL;
}

async function LoginAccount(req, res) {
  try {
    const { email, password, server, accountType } = req.body;
    const baseURL = await DefineURL(accountType);
    const authResponse = await axios.post(
      `${baseURL}/auth/jwt/token`,
      {
        email,
        password,
        server,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const accessToken = authResponse.data.accessToken;
    const refreshToken = authResponse.data.refreshToken;
    res.status(200).json({
      status: 200,
      data: {
        accessToken,
        refreshToken,
        user: {
          email,
          server,
          accountType,
        },
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: "Login info is not correct!",
    });
  }
}

async function GetAllAccounts(req, res) {
  try {
    const { accessToken, accountType } = req.body;
    const baseURL = await DefineURL(accountType);
    console.log("------ok------>");
    const response = await axios.get(`${baseURL}/auth/jwt/all-accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const accounts = response.data;
    res.status(200).json({
      status: "success",
      data: { accounts },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function GetAccountInfo(req, res) {
  try {
    const { accessToken, accountType, accountId, accNum } = req.body;
    const baseURL = await DefineURL(accountType);
    console.log("--------ok1--------1")
    const response = await axios.get(
      `${baseURL}/trade/accounts/${accountId}/state`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          accNum: accNum,
          "Content-Type": "application-json",
        },
      }
    );
    console.log("-----ok2-----------2");

    const state = response.data.d.accountDetailsData;
    let info = {};
    if (state) {
      info = {
        accountId,
        accNum,
        balance: state[0],
        projectedBalance: state[1],
        availableFunds: state[2],
        blockedBalance: state[3],
        cashBalance: state[4],
        unsettledCash: state[5],
        withdrawalAvailable: state[6],
        stocksValue: state[7],
        optionValue: state[8],
        initialMarginReq: state[9],
        maintMarginReq: state[10],
        marginWarningLevel: state[11],
        blockedForStocks: state[12],
        stockOrdersReq: state[13],
        stopOutLevel: state[14],
        warningMarginReq: state[15],
        marginBeforeWarning: state[16],
        todayGross: state[17],
        todayNet: state[18],
        todayFees: state[19],
        todayVolume: state[20],
        todayTradesCount: state[21],
        openGrossPnL: state[22],
        openNetPnL: state[23],
        positionsCount: state[24],
        ordersCount: state[25],
      };
    }
    res.status(200).json({
      status: "success",
      data: info,
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

async function RefreshAuth(req, res) {
  try {
    const { refreshToken, accountType } = req.body;
    const baseURL = await DefineURL(accountType);
    const authResponse = await axios.post(
      `${baseURL}/auth/jwt/refresh`,
      {
        refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const newAccessToken = authResponse.data.accessToken;
    const newRefreshToken = authResponse.data.refreshToken;
    res.status(200).json({
      status: "success",
      data: {
        newAccessToken,
        newRefreshToken,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}
module.exports = {
  LoginAccount,
  GetAllAccounts,
  RefreshAuth,
  GetAccountInfo,
};
