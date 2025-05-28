const prisma = require("../config/prisma")
const axios = require("axios");
const digestClient = require("digest-auth-request");

require("dotenv").config();

async function DefineURL(accountType) {
    let baseURL = "";
    if (accountType == "DEMO"){
      baseURL = process.env.ACTTRADER_DEMO_BASE_URL;
    } else {
      baseURL = process.env.ACTTRADER_LIVE_BASE_URL;
    }
    return baseURL;
}

async function  LoginAccount(req, res) {
    try{
      const {username, password, accountType} = req.body;
      const client = new digestClient(username, password);
      const baseURL = await DefineURL(accountType);
      const authResponse = await client.request({
          url : baseURL,
          method : "Get"
    });
    console.log("authresponse", authResponse);
    authResponse = JSON.parse(authResponse);
    const accessToken = authResponse.result;
    console.log("Token : ", authResponse.result);
    res.status(200).json({
        status : 200,
        data: {
          accessToken,
          user: {
            username,
            accountType
          }
        }
      });
    } catch(err){
      console.log(err);
      res.status(500).json({
        status : "error",
        message : "Login info is not correct!"
      })
    }
}

async function GetAllAccounts(req, res) {
    try{
      const response = await axios.get(`${baseURL}/api/v2/account/accounts`, {
        params: {
          token : accessToken
        }
      });
      const accounts = response.data;
      res.status(200).json({
        status : "success",
        data : {accounts}
      })
    }
    catch(err){
      res.status(500).json({
        status : "error",
        message: err.message,
      })
    }
}


module.exports = {
  LoginAccount,
  GetAllAccounts,
};
