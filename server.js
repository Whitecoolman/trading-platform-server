const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
dotenv.config();

const { authMiddleware } = require("./middleware/authenticate");
const { errorHandler } = require("./middleware/errorHandler");

const authRoute = require("./routes/authRoute");
const profileRoute = require("./routes/profileRoute");
const metaRoute = require("./routes/metaRoute");
const webhookRoute = require("./routes/webhookRoute");
const metaStatsRoute = require("./routes/metaStatsRoute");
const tradeRoute = require("./routes/tradeRoute");
const alertRoute = require("./routes/alertRoute");
const tradelockerRoute = require("./routes/tradelockerRoute");
const paymentRoute = require("./routes/paymentRoute");
const swaggerDocument = require("./swagger/swagger.json");
const { Server } = require("socket.io");
const WebSocket = require("ws");

const port = process.env.PORT || 5000;
const base_url = process.env.BASE_URL;
const streamingApiKey = process.env.STREAMING_API_KEY;

if (!streamingApiKey || !base_url) {
  console.error("Required environment variables are missing!");
  process.exit(1); // Exit if critical env vars are missing
}

const app = express();

// Swagger definition
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware
app.use(helmet());
app.use(bodyParser.json());
app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  cors({
    origin: "*",
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(errorHandler);

// Create the /check-server route
app.get("/check-server", (req, res) => {
  console.log("Server is running!");
  res.status(200).send("Server is running");
});

// Function to send request to the /check-server endpoint
const sendRequestToServer = async () => {
  try {
    await axios.get(`${base_url}/check-server`);
  } catch (error) {
    console.error("Error sending request:", error.message);
  }
};

setInterval(sendRequestToServer, 180000);

app.use("/api/auth", authRoute);
app.use("/api/profile", authMiddleware, profileRoute);
app.use("/api/meta", authMiddleware, metaRoute);
app.use("/api/webhook", authMiddleware, webhookRoute);
app.use("/api/metaStats", authMiddleware, metaStatsRoute);
app.use("/api/trade", authMiddleware, tradeRoute);
app.use("/api/alert", alertRoute);
app.use("/api/tradelocker", authMiddleware, tradelockerRoute);
app.use("/api/payment", authMiddleware, paymentRoute);

app.use("/", express.static(path.join(__dirname, "uploads")));

// Symbols to subscribe to trademade.com
const symbols = [
  "EURUSD",
  "XPDUSD",
  "EURGBP",
  "GBPUSD",
  "USDCAD",
  "AUDUSD",
  "EURAUD",
  "NZDUSD",
  "USDHKD",
  "XPTUSD",
];
let global = symbols.map((symbol) => ({
  symbol: symbol,
  bid: 0,
  ask: 0,
  prevBid: 0,
  prevAsk: 0,
}));
const reconnectInterval = 1000 * 10;
const connectToWebSocket = () => {
  const ws = new WebSocket("wss://marketdata.tradermade.com/feedadv");
  ws.on("open", function open() {
    console.log("WebSocket connection established.");
    ws.send(
      `{\"userKey\":\"${
        process.env.STREAMING_API_KEY
      }\", \"symbol\":\"${symbols.join(",")}\"}`
    );
  });
  ws.on("close", function close() {
    console.log(
      `WebSocket closed. Reconnecting in ${reconnectInterval / 1000}s...`
    );
    setTimeout(connectToWebSocket, reconnectInterval);
  });
  ws.on("message", (event) => {
    try {
      const data = event.toString();
      if (data === "Connected") {
        console.log("WebSocket connected successfully");
        return;
      }
      if (data === "User Key Used to many times") {
        console.error(
          "WebSocket API key limit exceeded:",
          process.env.STREAMING_API_KEY
        );
        return;
      }
      const parsedData = JSON.parse(data);
      const symbolIndex = global.findIndex(
        (item) => item.symbol === parsedData.symbol
      );
      if (symbolIndex !== -1) {
        const newGlobalData = [...global];
        const item = newGlobalData[symbolIndex];
        item.prevBid = item.bid;
        item.prevAsk = item.ask;
        item.bid = parsedData.bid;
        item.ask = parsedData.ask;
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  });

  ws.on("error", function error(err) {
    console.error("WebSocket error:", err);
  });
};
connectToWebSocket();

app.get("/api/symbols/price", (req, res) => {
  try {
    res.json(global); // Return the global variable containing all symbol data
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching global data", error: error.message });
  }
});

// Create HTTP server and integrate socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // Allow only this origin
    methods: ["GET", "POST"],
  },
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Attach io instance to app for use in routes
app.set("io", io);

// Replace app.listen with server.listen
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = { app, io };
