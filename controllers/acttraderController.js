const prisma = require("../config/prisma")
const axios = require("axios");
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
      const baseURL = await DefineURL(accountType);
      const authResponse = await axios.get(
        `${baseURL}/auth/jwt/token`,
        {
          username,
          password
        },
        {
          headers : {
            "Content-Type" : "application/json"
          }
        }
      );
      const accessToken = authResponse.data.accessToken;
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
      const {accessToken, accessType} = req.body;
      const baseURL = await DefineURL(accessType);
      console.log("-------ok------>");
      const response =  await axios.get(`${baseURL}/auth/jwt/all-accounts`, {
        headers : {
          Authorization : `Bearer ${accessToken}`,
          "Content-Type" : "application/json"
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
