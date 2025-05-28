const prisma = require("../config/prisma")
const axios = require("axios");
const DigestClient = require('digest-fetch');
const { tradehistoryacttrader } = require("./webhookController");

require("dotenv").config();


async function DefineURL(accountType) {
  let baseURL = "";
  if (accountType == "DEMO") {
    baseURL = process.env.ACTTRADER_DEMO_BASE_URL;
  } else {
    baseURL = process.env.ACTTRADER_LIVE_BASE_URL;
  }
  return baseURL;
}

async function LoginAccount(req, res) {
  try {
    const { username, password, accountType } = req.body;
    console.log("😀", req.body);
    const client = new DigestClient(username, password);
    const baseURL = await DefineURL(accountType);
    console.log("😀", `${baseURL}/auth/token`);
    const options = {
      method: 'GET',
    };
    const response = await client.fetch(`${baseURL}/auth/token`, options);
    const authResponse = await response.json();
    console.log("Auth response:", authResponse.result);
    const accessToken = authResponse.result;

    res.status(200).json({
      status: 200,
      message: "ok!",
      data: {
        accessToken,
        user: {
          username,
          accountType
        }
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: "Login info is not correct!"
    })
  }
}

async function GetAllAccounts(req, res) {
  try {
    const {accessToken,accountType} = req.body;
    const baseURL = await DefineURL(accountType);
    console.log("😗", `${baseURL}/account/accounts`, "    ", accessToken);
    const response = await axios.get(`${baseURL}/account/accounts`, {
      params: {
        token: accessToken
      }
    });
    console.log("🙄", response.data);
    const accounts = response.data;
    res.status(200).json({
      status: "success",
      data: { accounts }
    })
  }
  catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    })
  }
}


module.exports = {
  LoginAccount,
  GetAllAccounts,
};
