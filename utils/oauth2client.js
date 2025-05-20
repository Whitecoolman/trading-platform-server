const { google } = require("googleapis");
const dotenv = require("dotenv");
dotenv.config();

/**
 * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI
 * from the client_secret.json file. To get these credentials for your application, visit
 * https://console.cloud.google.com/apis/credentials.
 */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

console.log(
  "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  :>> ",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "postmessage"
);

console.log("oauth2Client :>> ", oauth2Client);

module.exports = oauth2Client;
