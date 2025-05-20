const prisma = require("../config/prisma");
const MetaApi = require("metaapi.cloud-sdk");
const mt4_symbols = require("../config/symbols");
const bcrypt = require("bcryptjs");
const axios = require("axios");

require("dotenv").config;

const connectionMarketOrder = new Map();
async function Connection(accountId) {
  console.log("🔹 Step 1: Checking MetaAPI Token");
  const metaapi = new MetaApi.default(process.env.METAAPI_TOKEN);
  console.log("🔹 Step 2: Preparing Account Data");
  const account = await metaapi.metatraderAccountApi.getAccount(accountId);

  if (account.connectionStatus == "DISCONNECTED") {
    await account.deploy();
    console.log("💥 disconnected with account!");
    await account.waitConnected();
  }
  console.log("🔹 Step 3: Get MetaTrader Account");
  const connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized();
  return connection;
}

async function GetConnectionFromMap(accountId) {
  let connection = {};
  const connectionKey = `${accountId}`;
  if (connectionMarketOrder.has(connectionKey)) {
    connection = connectionMarketOrder.get(connectionKey);
  } else {
    connection = await Connection(accountId);
    connectionMarketOrder.set(connectionKey, connection);
  }
  return connection;
}

async function DefineURL(accountType) {
  let baseURL = "";
  if (accountType == "DEMO") {
    baseURL = process.env.TRADELOCKER_DEMO_BASE_URL;
  } else {
    baseURL = process.env.TRADELOCKER_LIVE_BASE_URL;
  }
  return baseURL;
}

async function GetSymbols(req, res) {
  try {
    const { platform } = req.body;
    let result = {};
    if (platform == "mt4") {
      result = mt4_symbols;
    } else {
      result = [];
    }
    res.status(200).json({
      status: "success",
      code: 200,
      data: {
        result,
      },
    });
  } catch (err) {
    console.error("❌ Getting symbols is failed", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message: err.message || "Internal Server Error",
    });
  }
}

//----------------------------✨Market Order✨------------------------//

async function CreateBasicWebhook(req, res) {
  try {
    const {
      email,
      webhookName,
      webhookMode,
      symbol,
      orderDirection,
      orderType,
      volume,
      stopLoss_pips,
      takeProfit_pips,
      openPrice_pips,
      stopLimit_pips,
      trailingStopLoss,
      modifyType,
      moveStopLoss_pips,
      moveTakeProfit_pips,
      partialClose,
      allTrades,
      whopToken,
    } = req.body;
    console.log("volume----------->", volume);
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser)
      return res
        .status(404)
        .json({ status: "error", message: "User is not found" });
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: existingUser.id },
    });
    const existingWebhookCount = await prisma.webhook.count({
      where: { userId: existingUser.id },
    });
    const confirmPayment = await checkPayment(
      existingPayment.product_id,
      whopToken
    );
    if (confirmPayment.hasAccess == false) {
      return res
        .status(403)
        .json({ status: "error", message: "Payment is required" });
    }
    const webhookCount = await defineWebhookCount(existingPayment.role);
    console.log(
      "confirm user------>",
      confirmPayment.hasAccess,
      webhookCount,
      existingWebhookCount
    );
    if (existingWebhookCount.accountCount == 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Please subscribe to a plan" });
    } else if (existingWebhookCount >= webhookCount) {
      return res.status(404).json({
        status: "error",
        message: `Please upgrade ${existingPayment.role.toLowerCase()} plan`,
      });
    }
    const webhookFilter = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
      orderDirection,
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: webhookFilter,
    });

    if (existingWebhook)
      return res
        .status(404)
        .json({ status: "error", message: "Webhook already exists" });

    const hashedWebhook = (
      await bcrypt.hash(
        `${email}-${webhookName}-${webhookMode}-${symbol}-${orderDirection}`,
        10
      )
    ).slice(0, 15);

    const newWebhook = await prisma.webhook.create({
      data: {
        userId: existingUser.id,
        webhookName,
        webhookMode,
        symbol,
        orderDirection,
        orderType,
        volume: parseFloat(volume),
        stopLoss_pips: parseFloat(stopLoss_pips),
        takeProfit_pips: parseFloat(takeProfit_pips),
        openPrice_pips: parseFloat(openPrice_pips),
        stopLimit_pips: parseFloat(stopLimit_pips),
        trailingStopLoss: parseFloat(trailingStopLoss),
        modifyType,
        moveStopLoss_pips: parseFloat(moveStopLoss_pips),
        moveTakeProfit_pips: parseFloat(moveTakeProfit_pips),
        partialClose: parseFloat(partialClose),
        allTrades,
        hashedWebhook,
      },
    });
    res.status(200).json({
      status: "success",
      code: 200,
      message: "New basic webhook created",
      data: { newWebhook },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
}

async function CreatePremiumWebhook(req, res) {
  try {
    const {
      email,
      webhookName,
      webhookMode,
      symbol,
      orderDirection,
      orderType,
      volume,
      multiTakeProfit_pips,
      stopLoss_pips,
      trailingDistance_pips,
      activationTrigger_pips,
      timeBasedExitMinute,
      breakenEvenSetting_pips,
      whopToken,
    } = req.body;
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser)
      return res
        .status(404)
        .json({ status: "error", message: "User is not found" });
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: existingUser.id },
    });
    const existingWebhookCount = await prisma.webhook.count({
      where: { userId: existingUser.id },
    });
    const confirmPayment = await checkPayment(
      existingPayment.product_id,
      whopToken
    );
    if (confirmPayment.hasAccess == false) {
      return res
        .status(403)
        .json({ status: "error", message: "Payment is required" });
    }
    const webhookCount = await defineWebhookCount(existingPayment.role);
    if (existingWebhookCount.accountCount == 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Please subscribe to a plan" });
    } else if (existingWebhookCount >= webhookCount) {
      return res.status(404).json({
        status: "error",
        message: `Please upgrade ${existingPayment.role.toLowerCase()} plan`,
      });
    }
    const takeProfits = multiTakeProfit_pips.split(",").map(Number);
    console.log("takeProfits----------->", takeProfits);
    const webhookFilter = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
      orderDirection,
      orderType,
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: webhookFilter,
    });
    if (existingWebhook) {
      return res
        .status(404)
        .json({ status: "error", message: "Webhook already exists" });
    }
    const hashedWebhook = (
      await bcrypt.hash(`${email}-${webhookName}-${webhookMode}-${symbol}`, 10)
    ).slice(0, 15);
    console.log("hashedWebhook----------->", hashedWebhook);

    const newWebhook = await prisma.webhook.create({
      data: {
        userId: existingUser.id,
        webhookName,
        webhookMode,
        symbol,
        orderDirection,
        orderType,
        volume: parseFloat(volume),
        multiTakeProfits_pips: takeProfits,
        stopLoss_pips: parseFloat(stopLoss_pips),
        trailingDistance_pips: parseFloat(trailingDistance_pips),
        activationTrigger_pips: parseFloat(activationTrigger_pips),
        timeBasedExitMinute: parseFloat(timeBasedExitMinute),
        breakenEvenSetting_pips: parseFloat(breakenEvenSetting_pips),
        hashedWebhook,
      },
    });
    res.status(200).json({
      status: "success",
      code: 200,
      message: "New premium webhook created",
      data: { newWebhook },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
}

async function CreateAdvancedWebhook(req, res) {
  try {
    const { email, webhookName, webhookMode, symbol, volume, whopToken } =
      req.body;
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser)
      return res
        .status(404)
        .json({ status: "error", message: "User is not found" });
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: existingUser.id },
    });
    const existingWebhookCount = await prisma.webhook.count({
      where: { userId: existingUser.id },
    });
    const confirmPayment = await checkPayment(
      existingPayment.product_id,
      whopToken
    );
    if (confirmPayment.hasAccess == false) {
      return res
        .status(403)
        .json({ status: "error", message: "Payment is required" });
    }
    const webhookCount = await defineWebhookCount(existingPayment.role);
    if (existingWebhookCount.accountCount == 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Please subscribe to a plan" });
    } else if (existingWebhookCount >= webhookCount) {
      return res.status(404).json({
        status: "error",
        message: `Please upgrade ${existingPayment.role.toLowerCase()} plan`,
      });
    }
    const webhookFilter = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: webhookFilter,
    });
    if (existingWebhook) {
      return res
        .status(404)
        .json({ status: "error", message: "Webhook already exists" });
    }
    const hashedWebhook = (
      await bcrypt.hash(`${email}-${webhookName}-${webhookMode}-${symbol}`, 10)
    ).slice(0, 15);
    const newWebhook = await prisma.webhook.create({
      data: {
        userId: existingUser.id,
        webhookName,
        webhookMode,
        symbol,
        volume: parseFloat(volume),
        hashedWebhook,
      },
    });
    res.status(200).json({
      status: "success",
      code: 200,
      message: "New advanced webhook created",
      data: { newWebhook },
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
}

async function ConnectWebhook(req, res) {
  try {
    let updatedWebhook = {};
    const {
      email,
      accountId,
      webhookName,
      webhookMode,
      symbol,
      appName,
      accNum,
      accountType,
      refreshToken,
    } = req.body;
    console.log("---req.body----->", req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    const webhookFilter = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: webhookFilter,
    });
    let accountId_m = existingWebhook.accountId_m,
      accountId_t = existingWebhook.accountId_t;
    if (appName == "MetaTrader") {
      accountId_m = accountId;
    } else if (appName == "TradeLocker") {
      accountId_t = accountId;
    }

    if (appName == "MetaTrader") {
      const existingAccount = await prisma.mTAccount.findFirst({
        where: {
          accountId: accountId_m,
        },
      });
      if (!existingAccount)
        return res
          .status(404)
          .json({ status: "error", message: "This account is not found" });
      await GetConnectionFromMap(accountId_m);
    }
    updatedWebhook = await prisma.webhook.update({
      where: {
        id: existingWebhook.id,
      },
      data: {
        accountId_m,
        accountId_t,
        connectionStatus: true,
        isActive: true,
        appName,
        accNum,
        accountType,
        refreshToken,
      },
      select: {
        id: true,
        accountId_m: true,
        accountId_t: true,
        webhookName: true,
        symbol: true,
        webhookMode: true,
        connectionStatus: true,
        orderDirection: true,
        orderType: true,
        isActive: true,
        isPublic: true,
        tradeExecutionTime: true,
        volume: true,
        stopLoss_pips: true,
        takeProfit_pips: true,
        openPrice_pips: true,
        stopLimit_pips: true,
        trailingStopLoss: true,
        modifyType: true,
        moveStopLoss_pips: true,
        moveTakeProfit_pips: true,
        partialClose: true,
        allTrades: true,
        appName: true,
        multiTakeProfits_pips: true,
        trailingDistance_pips: true,
        activationTrigger_pips: true,
        timeBasedExitMinute: true,
        breakenEvenSetting_pips: true,
        hashedWebhook: true,
      },
    });

    res.status(200).json({
      status: "success",
      code: 200,
      data: { updatedWebhook },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function UpdateBasicWebhook(req, res) {
  try {
    const {
      email,
      webhookName,
      webhookMode,
      symbol,
      webhookName_new,
      symbol_new,
      orderDirection_new,
      orderType_new,
      volume_new,
      stopLoss_pips_new,
      takeProfit_pips_new,
      openPrice_new,
      stopLimit_new,
      trailingStopLoss_new,
      modifyType_new,
      moveStopLoss_pips_new,
      moveTakeProfit_pips_new,
      partialClose_new,
      allTrades_new,
    } = req.body;

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    const whereCondition = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
    };

    const existingWebhook = await prisma.webhook.findFirst({
      where: whereCondition,
    });
    if (!existingWebhook)
      return res
        .status(404)
        .json({ status: "error", message: "Webhook not found" });

    const updateData = {
      webhookName: webhookName_new,
      symbol: symbol_new,
      volume: parseFloat(volume_new),
      ...(webhookMode === "basic" && {
        orderDirection: orderDirection_new,
        orderType: orderType_new,
        stopLoss_pips: parseFloat(stopLoss_pips_new),
        takeProfit_pips: parseFloat(takeProfit_pips_new),
        openPrice_pips: parseFloat(openPrice_new),
        stopLimit_pips: parseFloat(stopLimit_new),
        trailingStopLoss: parseFloat(trailingStopLoss_new),
        modifyType: modifyType_new,
        moveStopLoss_pips: parseFloat(moveStopLoss_pips_new),
        moveTakeProfit_pips: parseFloat(moveTakeProfit_pips_new),
        partialClose: parseFloat(partialClose_new),
        allTrades: allTrades_new,
      }),
    };

    const updatedWebhook = await prisma.webhook.update({
      where: { id: existingWebhook.id },
      data: updateData,
      select: {
        id: true,
        accountId_m: true,
        accountId_t: true,
        webhookName: true,
        symbol: true,
        webhookMode: true,
        connectionStatus: true,
        orderDirection: true,
        orderType: true,
        isActive: true,
        isPublic: true,
        tradeExecutionTime: true,
        volume: true,
        stopLoss_pips: true,
        takeProfit_pips: true,
        openPrice_pips: true,
        stopLimit_pips: true,
        trailingStopLoss: true,
        modifyType: true,
        moveStopLoss_pips: true,
        moveTakeProfit_pips: true,
        partialClose: true,
        allTrades: true,
        appName: true,
        hashedWebhook: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: { updatedWebhook },
      message: "Basic Webhook is updated",
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "The update failed" });
  }
}

async function UpdatePremiumWebhook(req, res) {
  try {
    const {
      email,
      webhookName,
      webhookMode,
      symbol,
      webhookName_new,
      symbol_new,
      volume_new,
      multiTakeProfit_pips_new,
      stopLoss_pips_new,
      trailingDistance_pips_new,
      activationTrigger_pips_new,
      timeBasedExitMinute_new,
      breakenEvenSetting_pips_new,
    } = req.body;

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    const whereCondition = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
    };

    const existingWebhook = await prisma.webhook.findFirst({
      where: whereCondition,
    });
    if (!existingWebhook)
      return res
        .status(404)
        .json({ status: "error", message: "Webhook not found" });

    const updateData = {
      webhookName: webhookName_new,
      symbol: symbol_new,
      volume: parseFloat(volume_new),
      multiTakeProfits_pips: multiTakeProfit_pips_new.split(",").map(Number),
      stopLoss_pips: parseFloat(stopLoss_pips_new),
      trailingDistance_pips: parseFloat(trailingDistance_pips_new),
      activationTrigger_pips: parseFloat(activationTrigger_pips_new),
      timeBasedExitMinute: parseFloat(timeBasedExitMinute_new),
      breakenEvenSetting_pips: parseFloat(breakenEvenSetting_pips_new),
    };

    const updatedWebhook = await prisma.webhook.update({
      where: { id: existingWebhook.id },
      data: updateData,
      select: {
        id: true,
        accountId_m: true,
        accountId_t: true,
        webhookName: true,
        symbol: true,
        webhookMode: true,
        connectionStatus: true,
        orderDirection: true,
        orderType: true,
        isActive: true,
        isPublic: true,
        tradeExecutionTime: true,
        volume: true,
        stopLoss_pips: true,
        takeProfit_pips: true,
        openPrice_pips: true,
        stopLimit_pips: true,
        trailingStopLoss: true,
        modifyType: true,
        moveStopLoss_pips: true,
        moveTakeProfit_pips: true,
        partialClose: true,
        allTrades: true,
        appName: true,
        multiTakeProfits_pips: true,
        trailingDistance_pips: true,
        activationTrigger_pips: true,
        timeBasedExitMinute: true,
        breakenEvenSetting_pips: true,
        hashedWebhook: true,
      },
    });
    res.status(200).json({
      status: "success",
      data: { updatedWebhook },
      message: "Premium webhook is udpated",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

async function UpdateAdvancedWebhook(req, res) {
  try {
    const {
      email,
      webhookName,
      webhookMode,
      symbol,
      webhookName_new,
      symbol_new,
      volume_new,
    } = req.body;
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    const whereCondition = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: whereCondition,
    });
    if (!existingWebhook)
      return res
        .status(404)
        .json({ status: "error", message: "webhook not found" });
    const updateData = {
      webhookName: webhookName_new,
      symbol: symbol_new,
      volume: parseFloat(volume_new),
    };
    const updatedWebhook = await prisma.webhook.update({
      where: { id: existingWebhook.id },
      data: updateData,
      select: {
        id: true,
        accountId_m: true,
        accountId_t: true,
        webhookName: true,
        symbol: true,
        webhookMode: true,
        connectionStatus: true,
        orderDirection: true,
        orderType: true,
        isActive: true,
        isPublic: true,
        tradeExecutionTime: true,
        volume: true,
        stopLoss_pips: true,
        takeProfit_pips: true,
        openPrice_pips: true,
        stopLimit_pips: true,
        trailingStopLoss: true,
        modifyType: true,
        moveStopLoss_pips: true,
        moveTakeProfit_pips: true,
        partialClose: true,
        allTrades: true,
        appName: true,
        multiTakeProfits_pips: true,
        trailingDistance_pips: true,
        activationTrigger_pips: true,
        timeBasedExitMinute: true,
        breakenEvenSetting_pips: true,
        hashedWebhook: true,
      },
    });
    res.status(200).json({
      status: "success",
      data: { updatedWebhook },
      message: "Advanced Webhook is updated",
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function OpenBasicTrade(req, res) {
  try {
    const {
      email,
      webhookName,
      symbol,
      orderDirection,
      orderType,
      webhookMode,
      accessToken,
      accountType,
      actionType,
      allTrades,
      trailingStopLoss,
    } = req.body;
    let result = {};
    const currentDate = new Date();
    let updatedWebhook = {};
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        userId: existingUser.id,
        webhookName,
        webhookMode,
        symbol,
        orderDirection,
        orderType,
      },
    });

    if (actionType == "create") {
      if (existingWebhook.accountId_m) {
        let accountId = existingWebhook.accountId_m;
        const connection = await GetConnectionFromMap(accountId);

        const symbolInfo = await getSymbolInfoMetaTrader(connection, symbol);
        let ask = symbolInfo.ask;
        let bid = symbolInfo.bid;
        let marketPrice = symbolInfo.marketPrice;
        let pips = symbolInfo.pips;
        let lotSize = Number(existingWebhook.volume);
        const tradeParams = await getTradeParamstMetaTrader(
          orderDirection,
          orderType,
          ask,
          bid,
          pips,
          marketPrice,
          existingWebhook.openPrice_pips,
          existingWebhook.stopLimit_pips,
          existingWebhook.stopLoss_pips,
          existingWebhook.takeProfit_pips
        );

        let stopLoss = tradeParams.stopLoss;
        let takeProfit = tradeParams.takeProfit;
        let openPrice = tradeParams.openPrice;
        let stopLimit = tradeParams.stopLimit;

        result = await createOrderMetaTrader(
          orderDirection,
          orderType,
          connection,
          symbol,
          lotSize,
          stopLoss,
          takeProfit,
          openPrice,
          stopLimit,
          existingWebhook.id,
          trailingStopLoss,
          existingWebhook.trailingStopLoss
        );
        console.log("🎈success! metatrader");
      }
      if (existingWebhook.accountId_t) {
        const baseURL = await DefineURL(accountType);
        console.log("---actionType---tradelocker---->", actionType);
        const instrument = await getInstrumentTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          accessToken,
          existingWebhook.accNum,
          symbol
        );
        const tradableInstrumentId = instrument.tradableInstrumentId;

        let routeIdInfo = "";
        let routeIdTrade = "";
        let routes = {};
        routes = instrument.routes;
        if (routes) {
          routeIdInfo = routes.find((route) => route.type === "INFO").id;
          routeIdTrade = routes.find((route) => route.type === "TRADE").id;
        }
        console.log(
          "tradelocker instrument",
          routeIdInfo,
          tradableInstrumentId
        );
        const quotes = await getQuotesTradelocker(
          baseURL,
          routeIdInfo,
          tradableInstrumentId,
          accessToken,
          existingWebhook.accNum
        );
        console.log("tradelocker ask bid---->", quotes.ask, quotes.bid);
        const ask = quotes.ask;
        const bid = quotes.bid;
        let pips = await getInstrumentInfoTradelocker(
          baseURL,
          tradableInstrumentId,
          routeIdInfo,
          accessToken,
          existingWebhook.accNum
        );
        if (webhookMode == "basic") {
          let stopLoss = 0,
            takeProfit = 0;
          let lotSize = Number(existingWebhook.volume);
          if (orderDirection == "buy") {
            stopLoss = ask - existingWebhook.stopLoss_pips * pips;
            takeProfit = ask + existingWebhook.takeProfit_pips * pips;
          } else {
            stopLoss = bid + existingWebhook.stopLoss_pips * pips;
            takeProfit = bid - existingWebhook.takeProfit_pips * pips;
          }
          result = await createOrderTradelocker(
            baseURL,
            existingWebhook.accountId_t,
            lotSize,
            routeIdTrade,
            orderDirection,
            stopLoss,
            takeProfit,
            trailingStopLoss,
            existingWebhook.trailingStopLoss,
            tradableInstrumentId,
            accessToken,
            existingWebhook.accNum
          );
          console.log("🎈success! tradelocker");
        }
      }
      updatedWebhook = await openTradeUpdatedWebhook(
        currentDate,
        existingWebhook
      );
      res.status(200).json({
        status: "success",
        code: 200,
        message: `${String(
          orderType
        ).toUpperCase()} Order (Metatrader, Tradelocker) has been executed`,
        data: { updatedWebhook },
      });
    } else if (actionType == "modify") {
      if (existingWebhook.accountId_m) {
        let accountId = existingWebhook.accountId_m;
        const connection = await GetConnectionFromMap(accountId);
        try {
          const symInfo = await connection.getSymbolSpecification(symbol);
          const type = existingWebhook.modifyType;
          const movePips =
            type == "TakeProfit"
              ? existingWebhook.moveTakeProfit_pips
              : existingWebhook.moveStopLoss_pips;
          const positions = await getPositionsMetaTrader(
            connection,
            allTrades,
            orderDirection
          );
          for (const position of positions) {
            const stopLoss =
              orderDirection == "buy"
                ? position.currentPrice - movePips * symInfo.tickSize
                : position.currentPrice + movePips * symInfo.tickSize;
            const takeProfit =
              orderDirection == "sell"
                ? position.currentPrice + movePips * symInfo.tickSize
                : position.currentPrice - movePips * symInfo.tickSize;
            position.name == symbol &&
              (await connection.modifyPosition(
                position.id,
                type == "TakeProfit" ? position.stopLoss : stopLoss,
                type == "TakeProfit" ? takeProfit : position.takeProfit
              ));
          }
          return res.status(200).json({
            status: "success",
            code: 200,
            message: "Modify order (Metatrader) has been executed",
          });
        } catch (error) {
          console.error("Error procesing modify order:", error);
          return res.status(500).json({
            status: "error",
            code: 500,
            message: error.message,
          });
        }
      }
      if (existingWebhook.accountId_t) {
        const baseURL = await DefineURL(accountType);
        console.log("---actionType---tradelocker---->", actionType);
        const instrument = await getInstrumentTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          accessToken,
          existingWebhook.accNum,
          symbol
        );
        const tradableInstrumentId = instrument.tradableInstrumentId;
        console.log(
          "tradelocker--modify---accountId--->",
          existingWebhook.accountId_t
        );
        const type = existingWebhook.modifyType;
        const positions = await getPositionsTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          accessToken,
          existingWebhook.accNum,
          tradableInstrumentId
        );
        let stopLoss = 0,
          takeProfit = 0;
        if (!allTrades) {
          positions = positions.filter(
            (position) => position[3] == orderDirection
          );
        }
        for (const position of positions) {
          const tickSize = await getInstrumentInfoTradelocker(
            baseURL,
            position[1],
            position[2],
            accessToken,
            existingWebhook.accNum
          );
          console.log("-tradelocker ticksize---->", tickSize);
          if (position[3] == "buy") {
            type == "TakeProfit"
              ? (stopLoss =
                  Number(Number(position[5])) -
                  existingWebhook.stopLoss_pips * tickSize)
              : (stopLoss =
                  Number(position[5]) -
                  existingWebhook.moveStopLoss_pips * tickSize);
            type == "TakeProfit"
              ? (takeProfit =
                  Number(position[5]) +
                  existingWebhook.moveTakeProfit_pips * tickSize)
              : (takeProfit =
                  Number(position[5]) +
                  existingWebhook.takeProfit_pips * tickSize);
          } else {
            type == "TakeProfit"
              ? (stopLoss =
                  Number(position[5]) +
                  existingWebhook.stopLoss_pips * tickSize)
              : (stopLoss =
                  Number(position[5]) +
                  existingWebhook.moveStopLoss_pips * tickSize);
            type == "TakeProfit"
              ? (takeProfit =
                  Number(position[5]) -
                  existingWebhook.moveTakeProfit_pips * tickSize)
              : (takeProfit =
                  Number(position[5]) -
                  existingWebhook.takeProfit_pips * tickSize);
          }
          await modifyOrderTradelocker(
            baseURL,
            position[0],
            stopLoss,
            takeProfit,
            0,
            accessToken,
            existingWebhook.accNum
          );
        }
        res.status(200).json({
          status: "success",
          message: "Modify order (Tradelocker) has been executed",
        });
      }
    } else if (actionType == "close") {
      if (existingWebhook.accountId_m) {
        let accountId = existingWebhook.accountId_m;
        const connection = await GetConnectionFromMap(accountId);

        console.log("allTrades----->", allTrades);
        if (allTrades) {
          try {
            await connection.closePositionsBySymbol(symbol);
          } catch (error) {
            console.error("Error closing positions:", error);
            return res.status(500).json({
              status: "error",
              code: 500,
              message: error.message,
            });
          }
        } else {
          try {
            const positionType =
              orderDirection == "buy"
                ? "POSITION_TYPE_BUY"
                : "POSITION_TYPE_SELL";
            const positions = await connection.getPositions();
            const partialClose = existingWebhook.partialClose / 100;
            const filteredPositions = await positions.filter(
              (item) => item.type === positionType
            );
            console.log("filtered positions----->", filteredPositions);
            for (const position of filteredPositions) {
              try {
                await connection.closePositionPartially(
                  position.id,
                  position.volume * partialClose
                );
              } catch (error) {
                console.error(`Error closing position ${position.id}:`, error);
                return res.status(500).json({
                  status: "error",
                  message: `${position.id}: ${error.message}`,
                });
              }
            }
            return res.status(200).json({
              status: "success",
              code: 200,
              message: "Close order (Metatrader) has been executed",
            });
          } catch (error) {
            console.error("Error procesing close order:", error);
            return res.status(500).json({
              status: "error",
              code: 500,
              message: error.message,
            });
          }
        }
      }
      if (existingWebhook.accountId_t) {
        const baseURL = await DefineURL(accountType);
        console.log("---actionType---tradelocker---->", actionType);
        const instrument = await getInstrumentTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          accessToken,
          existingWebhook.accNum,
          symbol
        );
        const tradableInstrumentId = instrument.tradableInstrumentId;

        const positions = await getPositionsTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          accessToken,
          existingWebhook.accNum,
          tradableInstrumentId
        );
        if (!allTrades) {
          positions = positions.filter(
            (position) => position[3] === orderDirection
          );
        }
        for (const position of positions) {
          const lotSize = !allTrades
            ? (position[4] * existingWebhook.partialClose) / 100
            : position[4];
          const response = await closeOrderTradelocker(
            baseURL,
            existingWebhook.accountId_t,
            accessToken,
            existingWebhook.accNum,
            tradableInstrumentId,
            lotSize
          );
          console.log(response.data.s);
        }
        res.status(200).json({
          status: "success",
          message: "Close order (Tradelocker) has been executed",
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function OpenAdvancedTrade(req, res) {
  try {
    const {
      email,
      accountId,
      webhookName,
      webhookMode,
      symbol,
      messageData,
      allTrades,
    } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        userId: existingUser.id,
        accountId,
        webhookName,
        webhookMode,
        symbol,
      },
    });
    if (!existingWebhook)
      return res
        .status(404)
        .json({ status: "error", message: "webhook is not found" });
    console.log("-------messageData------>", messageData);
    const extractedData = await parseMessageDataMetaTrader(messageData);
    console.log("------extractedData------>", extractedData);
    const currentDate = new Date();
    if (existingWebhook.appName == "MetaTrader") {
      const connection = await GetConnectionFromMap(accountId);
      if (extractedData.ACTION_TYPE == "create") {
        console.log("✅ ok1---------->");
        const symbolInfo = await getSymbolInfoMetaTrader(connection, symbol);
        let ask = symbolInfo.ask;
        let bid = symbolInfo.bid;
        let marketPrice = symbolInfo.marketPrice;
        let pips = symbolInfo.pips;
        let lotSize = Number(existingWebhook.volume);
        let openPrice_pips = Number(extractedData.OPEN_PRICE) || 0;
        let stopLimit_pips = Number(extractedData.STOP_LIMIT_PRICE) || 0;
        let stopLoss_pips = Number(extractedData.STOP_LOSS);
        let takeProfit_pips = Number(extractedData.TAKE_PROFIT);
        console.log(
          "✅ ok2---------->",
          ask,
          bid,
          marketPrice,
          pips,
          lotSize,
          openPrice_pips,
          stopLimit_pips,
          stopLoss_pips,
          takeProfit_pips
        );

        const tradeParams = await getTradeParamstMetaTrader(
          extractedData.ORDER_DIRECTION,
          extractedData.ORDER_TYPE,
          ask,
          bid,
          pips,
          marketPrice,
          openPrice_pips,
          stopLimit_pips,
          stopLoss_pips,
          takeProfit_pips
        );
        let stopLoss = tradeParams.stopLoss;
        let takeProfit = tradeParams.takeProfit;
        let openPrice = tradeParams.openPrice;
        let stopLimit = tradeParams.stopLimit;
        console.log(
          "✅ ok3---------->",
          stopLoss,
          takeProfit,
          openPrice,
          stopLimit
        );
        result = await createOrderMetaTrader(
          extractedData.ORDER_DIRECTION,
          extractedData.ORDER_TYPE,
          connection,
          symbol,
          lotSize,
          stopLoss,
          takeProfit,
          openPrice,
          stopLimit,
          existingWebhook.id,
          true,
          Number(extractedData.TRAILING_STOP_LOSS)
        );
        updatedWebhook = await openTradeUpdatedWebhook(
          currentDate,
          existingWebhook,
          result
        );
        res.status(200).json({
          status: "success",
          message: `${String(
            extractedData.ORDER_TYPE
          ).toUpperCase()} Order has been executed`,
        });
      } else if (extractedData.ACTION_TYPE == "modify") {
        try {
          const symInfo = await connection.getSymbolSpecification(symbol);
          const type = extractedData.MODIFY_TYPE;
          const movePips = extractedData.MOVE_PIPS;
          const orderDirection = extractedData.ORDER_DIRECTION;
          const positions = await getPositionsMetaTrader(
            connection,
            allTrades,
            orderDirection
          );
          for (const position of positions) {
            const stopLoss =
              orderDirection == "buy"
                ? position.currentPrice - movePips * symInfo.tickSize
                : position.currentPrice + movePips * symInfo.tickSize;
            const takeProfit =
              orderDirection == "sell"
                ? position.currentPrice + movePips * symInfo.tickSize
                : position.currentPrice - movePips * symInfo.tickSize;
            position.name == symbol &&
              (await connection.modifyPosition(
                position.id,
                type == "TakeProfit" ? position.stopLoss : stopLoss,
                type == "TakeProfit" ? takeProfit : position.takeProfit
              ));
          }
          return res.status(200).json({
            status: "success",
            code: 200,
            message: "Modify order has been executed",
          });
        } catch (error) {
          console.error("Error processing modify order:", error);
          return res.status(500).json({
            status: "error",
            code: 500,
            message: error.message,
          });
        }
      } else if (extractedData.ACTION_TYPE == "close") {
        if (allTrades) {
          try {
            await connection.closePositionsBySymbol(symbol);
          } catch (error) {
            console.error("Error closing positions:", error);
            return res.status(500).json({
              status: "error",
              code: 500,
              message: error.message,
            });
          }
        } else {
          try {
            const orderDirection = extractedData.ORDER_DIRECTION;
            const positions = await getPositionsMetaTrader(
              connection,
              allTrades,
              orderDirection
            );
            const partialClose = Number(extractedData.PARTIAL_CLOSE) / 100;
            for (const position of positions) {
              try {
                await connection.closePositionPartially(
                  position.id,
                  position.volume * partialClose
                );
              } catch (error) {
                return res.status(500).json({
                  status: "error",
                  message: `${position.id}: ${error.message}`,
                });
              }
            }
          } catch (error) {
            console.log("Error processing close order:", error);
            return res.status(500).json({
              status: "error",
              code: 500,
              message: error.message,
            });
          }
        }
      }
    } else {
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function GetWebhooks(req, res) {
  try {
    const { email } = req.body;
    console.log("💔 email webhook", email);
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const existingWebhooks = await prisma.webhook.findMany({
      where: { userId: existingUser.id },
      select: {
        id: true,
        accountId_m: true,
        accountId_t: true,
        webhookName: true,
        symbol: true,
        webhookMode: true,
        connectionStatus: true, //common params
        orderDirection: true, //basic params
        orderType: true,
        isActive: true,
        isPublic: true,
        tradeExecutionTime: true,
        volume: true,
        stopLoss_pips: true,
        takeProfit_pips: true,
        openPrice_pips: true,
        stopLimit_pips: true,
        trailingStopLoss: true,
        modifyType: true,
        moveStopLoss_pips: true,
        moveTakeProfit_pips: true,
        partialClose: true,
        allTrades: true,
        appName: true,
        multiTakeProfits_pips: true, //premium params
        trailingDistance_pips: true,
        activationTrigger_pips: true,
        timeBasedExitMinute: true,
        breakenEvenSetting_pips: true,
        hashedWebhook: true,
      },
    });
    res.status(200).json({
      status: "success",
      code: 200,
      data: { existingWebhooks },
    });
  } catch (err) {
    console.log("Getting Webhooks is failed!", err);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

async function DeleteWebhook(req, res) {
  try {
    const { email, webhookName, orderDirection, symbol, webhookMode } =
      req.body;
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User is not found" });
    }
    const webhookFilter = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
      ...(webhookMode === "basic" ? { orderDirection } : {}),
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: webhookFilter,
    });
    if (!existingWebhook) {
      return res
        .status(404)
        .json({ status: "error", message: "Webhook not found" });
    }
    const deletedWebhook = await prisma.webhook.delete({
      where: { id: existingWebhook.id },
    });
    res.status(200).json({
      status: "success",
      data: {
        deletedWebhook,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Deletion failed" });
  }
}

async function DisconnectWebhook(req, res) {
  try {
    let connection = {};
    const { email, webhookName, webhookMode, symbol, orderDirection, appName } =
      req.body;
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    const webhookFilter = {
      userId: existingUser.id,
      webhookName,
      webhookMode,
      symbol,
      ...(webhookMode == "basic" ? { orderDirection } : {}),
    };
    const existingWebhook = await prisma.webhook.findFirst({
      where: webhookFilter,
    });
    let accountId_m = existingWebhook.accountId_m;
    let accountId_t = existingWebhook.accountId_t;
    if (appName == "MetaTrader") {
      accountId_m = "";
    } else if (appName == "TradeLocker") {
      accountId_t = "";
    }
    console.log("existing----->", appName, accountId_m, accountId_t);
    let connectionStatus = !accountId_m && !accountId_t ? false : true;
    const updatedWebhook = await prisma.webhook.update({
      where: {
        id: existingWebhook.id,
      },
      data: {
        accountId_m,
        accountId_t,
        connectionStatus,
        isActive: false,
        isPublic: false,
        appName: "",
        accNum: "",
      },
      select: {
        id: true,
        accountId_m: true,
        accountId_t: true,
        webhookName: true,
        symbol: true,
        webhookMode: true,
        connectionStatus: true,
        orderDirection: true,
        orderType: true,
        isActive: true,
        isPublic: true,
        tradeExecutionTime: true,
        volume: true,
        stopLoss_pips: true,
        takeProfit_pips: true,
        openPrice_pips: true,
        stopLimit_pips: true,
        trailingStopLoss: true,
        modifyType: true,
        moveStopLoss_pips: true,
        moveTakeProfit_pips: true,
        partialClose: true,
        allTrades: true,
        appName: true,
        multiTakeProfits_pips: true,
        trailingDistance_pips: true,
        activationTrigger_pips: true,
        timeBasedExitMinute: true,
        breakenEvenSetting_pips: true,
        hashedWebhook: true,
      },
    });
    if (appName == "MetaTrader") {
      const connectionKey = `${accountId_m}`;
      if (connectionMarketOrder.has(connectionKey)) {
        connection = await connectionMarketOrder.get(connectionKey);
        await connection.close();
        connectionMarketOrder.delete(connectionKey);
      }
    }
    res.status(200).json({
      status: "success",
      message: "Disconnect successfully!",
      data: { updatedWebhook },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Disconnection is failed",
    });
  }
}

//------------------------Metatrader Function---------------------------------//
async function openTradeUpdatedWebhook(currentDate, existingWebhook) {
  const updatedWebhook = await prisma.webhook.update({
    where: {
      id: existingWebhook.id,
    },
    data: {
      tradeStartTime: currentDate,
    },
    select: {
      id: true,
      accountId_m: true,
      accountId_t: true,
      webhookName: true,
      symbol: true,
      webhookMode: true,
      connectionStatus: true,
      orderDirection: true,
      orderType: true,
      isActive: true,
      isPublic: true,
      tradeExecutionTime: true,
      volume: true,
      stopLoss_pips: true,
      takeProfit_pips: true,
      openPrice_pips: true,
      stopLimit_pips: true,
      trailingStopLoss: true,
      modifyType: true,
      moveStopLoss_pips: true,
      moveTakeProfit_pips: true,
      partialClose: true,
      allTrades: true,
      appName: true,
      multiTakeProfits_pips: true,
      trailingDistance_pips: true,
      activationTrigger_pips: true,
      timeBasedExitMinute: true,
      breakenEvenSetting_pips: true,
      hashedWebhook: true,
    },
  });
  return updatedWebhook;
}

async function createOrderMetaTrader(
  orderDirection,
  orderType,
  connection,
  symbol,
  lotSize,
  stopLoss,
  takeProfit,
  openPrice,
  stopLimit,
  webhookId,
  trailingStopLoss,
  trailingStopLossValue
) {
  let result = {};
  console.log(
    "metatrader ok4------------->",
    orderDirection,
    orderType,
    symbol,
    lotSize,
    stopLoss,
    takeProfit,
    openPrice,
    stopLimit,
    webhookId,
    trailingStopLoss,
    trailingStopLossValue
  );
  if (orderDirection == "buy") {
    if (orderType == "market") {
      result = await connection.createMarketBuyOrder(
        symbol,
        lotSize,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_1`,
        },
        {
          trailingStopLoss: {
            distance: {
              distance: trailingStopLoss ? trailingStopLossValue : 0,
              units: "RELATIVE_POINTS",
            },
          },
        }
      );
    } else if (orderType == "stop") {
      result = await connection.createStopBuyOrder(
        symbol,
        lotSize,
        openPrice,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_1`,
        }
      );
    } else if (orderType == "limit") {
      result = await connection.createLimitBuyOrder(
        symbol,
        lotSize,
        openPrice,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_1`,
        }
      );
    } else {
      console.log("ok3-------->", openPrice, stopLimit);
      result = await connection.createStopLimitBuyOrder(
        symbol,
        lotSize,
        openPrice,
        stopLimit,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_1`,
        }
      );
    }
  } else {
    if (orderType == "market") {
      result = await connection.createMarketSellOrder(
        symbol,
        lotSize,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_2`,
        },
        {
          trailingStopLoss: {
            distance: {
              distance: trailingStopLoss ? trailingStopLossValue : 0,
              units: "RELATIVE_POINTS",
            },
          },
        }
      );
    } else if (orderType == "stop") {
      result = await connection.createStopSellOrder(
        symbol,
        lotSize,
        openPrice,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_2`,
        }
      );
    } else if (orderType == "limit") {
      result = await connection.createLimitSellOrder(
        symbol,
        lotSize,
        openPrice,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_1`,
        }
      );
    } else {
      console.log("ok3-------->", openPrice, stopLimit);
      result = await connection.createStopLimitSellOrder(
        symbol,
        lotSize,
        openPrice,
        stopLimit,
        stopLoss,
        takeProfit,
        {
          clientId: `MB_${String(webhookId)}_1`,
        }
      );
    }
  }
  return result;
}

async function parseMessageDataMetaTrader(messageData) {
  const regex = /(\w+)={(.*?)}/g;
  let match;
  const extractedData = {};

  while ((match = regex.exec(messageData)) !== null) {
    extractedData[match[1]] = match[2];
  }

  return extractedData;
}

async function getSymbolInfoMetaTrader(connection, symbol) {
  const symPriceReq = connection.getSymbolPrice(symbol);
  const symInfoReq = connection.getSymbolSpecification(symbol);
  const [symPrice, symInfo] = await Promise.all([symPriceReq, symInfoReq]);
  if (symPrice?.error) {
    return {
      error: symPrice.error.error,
      message: symPrice.error.message,
    };
  }
  if (symInfo?.error) {
    return { error: symInfo.error.error, message: symInfo.error.message };
  }
  let ask = symPrice.ask;
  let bid = symPrice.bid;
  let marketPrice = (symPrice.ask + symPrice.bid) / 2;
  let pips = symInfo.tickSize;
  return { ask, bid, marketPrice, pips };
}

async function getTradeParamstMetaTrader(
  orderDirection,
  orderType,
  ask,
  bid,
  pips,
  marketPrice,
  openPrice_pips,
  stopLimit_pips,
  stopLoss_pips,
  takeProfit_pips
) {
  let stopLoss = 0,
    takeProfit = 0,
    openPrice = 0,
    stopLimit = 0;
  if (orderDirection == "buy") {
    stopLoss = ask - stopLoss_pips * pips;
    takeProfit = ask + takeProfit_pips * pips;
    if (orderType == "stop") {
      openPrice = marketPrice + openPrice_pips * pips;
    } else if (orderType == "limit") {
      openPrice = marketPrice - openPrice_pips * pips;
    } else {
      openPrice = marketPrice + openPrice_pips * pips;
      stopLimit = openPrice - stopLimit_pips * pips;
    }
  } else {
    stopLoss = bid + stopLoss_pips * pips;
    takeProfit = bid - takeProfit_pips * pips;
    if (orderType == "stop") {
      openPrice = marketPrice - openPrice_pips * pips;
    } else if (orderType == "limit") {
      openPrice = marketPrice + openPrice_pips * pips;
    } else {
      openPrice = marketPrice - openPrice_pips * pips;
      stopLimit = openPrice + openPrice_pips * pips;
    }
  }
  return { stopLoss, takeProfit, openPrice, stopLimit };
}

async function defineWebhookCount(role) {
  if (role == "Basic") {
    return 1;
  } else if (role == "Premium") {
    return 3;
  } else if (role == "Advanced") {
    return 10;
  } else if (role == "Lifetime Partner") {
    return 10000;
  }
}

async function checkPayment(product_id, whopToken) {
  try {
    console.log("check-req-body-------🎈", product_id, whopToken);
    const response = await axios.get(
      `https://access.api.whop.com/check/${product_id}`,
      {
        headers: {
          Authorization: `Bearer ${whopToken}`,
        },
      }
    );
    console.log("check-response------->", response.data);
    return { hasAccess: response.data.access };
  } catch (err) {
    console.log(err.message);
    return err.message;
  }
}

async function getPositionsMetaTrader(connection, allTrades, orderDirection) {
  let positions = await connection.getPositions();
  if (!allTrades) {
    const positionType =
      orderDirection === "buy" ? "POSITION_TYPE_BUY" : "POSITION_TYPE_SELL";
    positions = positions.filter((pos) => pos.type === positionType);
  }
  return positions;
}
// ------------------------TradeLocker Function------------------------------//

async function getPositionsTradelocker(
  baseURL,
  accountId,
  accessToken,
  accNum,
  tradableInstrumentId
) {
  const reqPositions = await axios.get(
    `${baseURL}/trade/accounts/${accountId}/positions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum,
        "Content-Type": "application/json",
      },
    }
  );
  const positions = reqPositions.data.d.positions;
  const result = await positions.filter(
    (position) => position[1] === tradableInstrumentId
  );
  return result;
}

async function createOrderTradelocker(
  baseURL,
  accountId,
  lotSize,
  routeIdTrade,
  orderDirection,
  stopLoss,
  takeProfit,
  trailingStopLoss,
  trailingStopLossValue,
  tradableInstrumentId,
  accessToken,
  accNum
) {
  const result = await axios.post(
    `${baseURL}/trade/accounts/${accountId}/orders`,
    {
      price: 0,
      qty: lotSize,
      routeId: routeIdTrade,
      side: orderDirection,
      strategyId: "tradelocker",
      stopLoss: stopLoss,
      stopLossType: "absolute",
      stopPrice: 0,
      takeProfit: takeProfit,
      takeProfitType: "absolute",
      trStopOffset: trailingStopLoss ? trailingStopLossValue : 0,
      tradableInstrumentId: tradableInstrumentId,
      type: "market",
      validity: "IOC",
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum,
        "Content-Type": "application/json",
      },
    }
  );
  return result;
}

async function getInstrumentTradelocker(
  baseURL,
  accountId,
  accessToken,
  accNum,
  symbol
) {
  const resInstruments = await axios.get(
    `${baseURL}/trade/accounts/${accountId}/instruments`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum: accNum,
        "Content-Type": "application/json",
      },
    }
  );
  const instruments = resInstruments.data.d.instruments;
  const instrument = await instruments.find((item) => item.name === symbol);
  return instrument;
}

async function getInstrumentInfoTradelocker(
  baseURL,
  tradableInstrumentId,
  routeIdInfo,
  accessToken,
  accNum
) {
  const resInstrumentInfo = await axios.get(
    `${baseURL}/trade/instruments/${tradableInstrumentId}?routeId=${routeIdInfo}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum,
        "Content-Type": "application/json",
      },
    }
  );
  return resInstrumentInfo.data.d.tickSize[0].tickSize;
}

async function getQuotesTradelocker(
  baseURL,
  routeIdInfo,
  tradableInstrumentId,
  accessToken,
  accNum
) {
  const resQuotes = await axios.get(
    `${baseURL}/trade/quotes?routeId=${routeIdInfo}&tradableInstrumentId=${tradableInstrumentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum,
        "Content-Type": "application/json",
      },
    }
  );
  const ask = resQuotes.data.d.ap;
  const bid = resQuotes.data.d.bp;

  return { ask, bid };
}

async function modifyOrderTradelocker(
  baseURL,
  positionId,
  stopLoss,
  takeProfit,
  trailingOffset,
  accessToken,
  accNum
) {
  console.log("--------modify----->", stopLoss, takeProfit);
  await axios.patch(
    `${baseURL}/trade/positions/${positionId}`,
    {
      stopLoss,
      takeProfit,
      trailingOffset,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum,
        "Content-Type": "application/json",
      },
    }
  );
}

async function closeOrderTradelocker(
  baseURL,
  accountId,
  accessToken,
  accNum,
  tradableInstrumentId,
  lotSize
) {
  await axios.delete(
    `${baseURL}/trade/accounts/${accountId}/positions?tradableInstrumentId=${tradableInstrumentId}`,
    {
      qty: lotSize,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum,
        "Content-Type": "application/json",
      },
    }
  );
}

async function getAccessToken(baseURL, refreshToken) {
  const resAccessToken = await axios.post(`${baseURL}/auth/jwt/refresh`, {
    refreshToken,
  });
  const accessToken_r = resAccessToken.data.accessToken;
  const refreshToken_r = resAccessToken.data.refreshToken;
  return {
    accessToken: accessToken_r,
    refreshToken: refreshToken_r,
  };
}

module.exports = {
  GetSymbols,

  CreateBasicWebhook,
  CreatePremiumWebhook,
  CreateAdvancedWebhook,
  GetWebhooks,
  DeleteWebhook,
  DisconnectWebhook,
  ConnectWebhook,
  UpdateBasicWebhook,
  UpdatePremiumWebhook,
  UpdateAdvancedWebhook,
  OpenBasicTrade,
  OpenAdvancedTrade,
  checkPayment,
  //connection
  Connection,
  GetConnectionFromMap,
  //metatrader function
  getSymbolInfoMetaTrader,
  getTradeParamstMetaTrader,
  createOrderMetaTrader,
  getPositionsMetaTrader,
  //tradelocker function
  getInstrumentTradelocker,
  getQuotesTradelocker,
  getInstrumentInfoTradelocker,
  createOrderTradelocker,
  getAccessToken,
  DefineURL,
  getPositionsTradelocker,
  modifyOrderTradelocker,
  closeOrderTradelocker,

  openTradeUpdatedWebhook,
};
