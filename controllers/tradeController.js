const { json } = require("body-parser");
const prisma = require("../config/prisma");
const MetaStats = require("metaapi.cloud-sdk").MetaStats;
const MetaApi = require("metaapi.cloud-sdk").default;
const axios = require("axios");
require("dotenv").config;

const api = new MetaApi(process.env.METAAPI_TOKEN);
const metaStats = new MetaStats(process.env.METAAPI_TOKEN);
let account;
const connectionTrade = new Map();
async function DefineURL(accountType) {
  let baseURL = "";
  if (accountType == "DEMO") {
    baseURL = process.env.TRADELOCKER_DEMO_BASE_URL;
  } else {
    baseURL = process.env.TRADELOCKER_LIVE_BASE_URL;
  }
  return baseURL;
}

async function GetAccount(accountId) {
  account = await api.metatraderAccountApi.getAccount(accountId);
  if (account.state !== "DEPLOYED") {
    await account.deploy();
  } else {
    console.log("Account already deployed");
  }
  console.log(
    "Waiting for API server to connect to broker (may take couple of minutes)"
  );
  console.log("--------------->", account.connectionStatus);
  if (account.connectionStatus !== "CONNECTED") {
    await account.waitConnected();
  }
}

async function Connection(accountId) {
  console.log("🔹 Step 1: Checking MetaAPI Token");
  console.log("🔹 Step 2: Preparing Account Data");
  const account = await api.metatraderAccountApi.getAccount(accountId);
  console.log("webhook cron connection status--->", account.connectionStatus);
  if (account.connectionStatus == "DISCONNECTED") {
    await account.deploy();
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
  if (connectionTrade.has(connectionKey)) {
    connection = connectionTrade.get(connectionKey);
  } else {
    connection = await Connection(accountId);
    connectionTrade.set(connectionKey, connection);
  }
  return connection;
}

async function GetTrades(req, res) {
  try {
    const { accountId, email } = req.body;
    await GetAccount(accountId);
    const currentDate = new Date();
    const formattedDate = currentDate
      .toISOString()
      .replace("T", " ")
      .slice(0, 23);

    const startDate = "2025-01-01 00:00:00.000";

    const result = await metaStats.getAccountTrades(
      accountId,
      startDate,
      formattedDate
    );
    const filteredData = await result.filter(
      (item) => item.type !== "DEAL_TYPE_BALANCE"
    );

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (!existingUser) {
      return res.status(404).json("User is not found");
    }
    const tradesData = filteredData.map((item) => ({
      userId: existingUser.id,
      accountId: accountId,
      closePrice: item.closePrice,
      closeTime: item.closeTime,
      gain: item.gain,
      marketValue: item.marketValue,
      openPrice: item.openPrice,
      openTime: item.openTime,
      pips: item.pips,
      positionId: item.positionId,
      profit: item.profit,
      success: item.success,
      symbol: item.symbol,
      type: item.type,
      volume: item.volume,
    }));
    await prisma.trades.createMany({
      data: tradesData,
      skipDuplicates: true, // Skip existing data based on unique constraints
    });
    const trades = await prisma.trades.findMany({
      where: {
        userId: existingUser.id,
        accountId: accountId,
      },
    });
    console.log("statistics of trades", trades);
    res.status(200).json({
      status: "success",
      data: {
        trades,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve trades",
    });
  }
}

async function GetMetaTrades(req, res) {
  try {
    const { accountId } = req.body;
    const connection = await GetConnectionFromMap(accountId);
    const positions = await connection.getPositions();
    const orders = await connection.getOrders();
    const deals = await connection.getDealsByTimeRange(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date()
    );
    const filteredPositions = await Promise.all(
      positions.map(async (position) => {
        const time = await formatDate(position.time);
        const webhookName = await getWebhookName(position.clientId);
        return {
          id: position.id,
          type: position.type === "POSITION_TYPE_BUY" ? "BUY" : "SELL",
          symbol: position.symbol,
          openPrice: position.openPrice,
          currentPrice: position.currentPrice,
          volume: position.volume,
          profit: position.profit,
          time,
          webhookName,
        };
      })
    );
    res.status(200).json({
      status: "success",
      data: {
        filteredPositions,
        orders,
        deals,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function GetTradeLockerTrades(req, res) {
  try {
    const { accessToken, accountId, accNum, accountType } = req.body;
    console.log("****************", accountId, accNum, accountType);

    const baseURL = await DefineURL(accountType);
    const resOrdersHistory = await axios.get(
      `${baseURL}/trade/accounts/${accountId}/ordersHistory`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          accNum: accNum,
        },
      }
    );
    const response = resOrdersHistory.data.d.ordersHistory;
    if (!Array.isArray(response)) {
      throw new Error("Invalid response format from API");
    }
    const uniqueInstrumentIds = new Set();
    response.forEach((order) => {
      if (order[1]) {
        // Assuming order[1] is the tradableInstrumentId
        uniqueInstrumentIds.add(order[1]);
      }
    });
    const symbolMap = new Map();

    for (const instrumentId of uniqueInstrumentIds) {
      try {
        const symbol = await GetSymbolFromTradableInstrumentId(
          accessToken,
          accNum,
          accountType,
          instrumentId
        );
        symbolMap.set(instrumentId, symbol);

        if (uniqueInstrumentIds.size > 5) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(
          `Error fetching symbol for instrument ID ${instrumentId}:`,
          error
        );
        symbolMap.set(instrumentId, `Unknown-${instrumentId}`);
      }
    }

    const formattedHistoryOrders = response.map((order) => {
      const instrumentId = order[1];
      return {
        id: order[0],
        symbol: symbolMap.get(instrumentId) || `Unknown-${instrumentId}`,
        routeId: order[2],
        qty: order[3],
        side: order[4],
        type: order[5],
        status: order[6],
        filledQty: order[7],
        avgPrice: order[8],
        price: order[9],
        stopPrice: order[10],
        validity: order[11],
        expireDate: order[12],
        createdDate: order[13],
        lastModified: order[14],
        isOpen: order[15],
        positionId: order[16],
        stopLoss: order[17],
        stopLossType: order[18],
        takeProfit: order[19],
        takeProfitType: order[20],
        strategyId: order[21],
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        ordersHistory: formattedHistoryOrders,
      },
    });
  } catch (err) {
    console.error("Error fetching trade history:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch trade history. Check token or API response.",
    });
  }
}

async function GetSymbolFromTradableInstrumentId(
  accessToken,
  accNum,
  accountType,
  tradableInstrumentId
) {
  const baseURL = await DefineURL(accountType);
  const response = await axios.get(
    `${baseURL}/trade/instruments/${tradableInstrumentId}?routeId=${429}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accNum: accNum,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.d.name;
}

async function GetTotalTradesStats(req, res) {
  try {
    const { accountId } = req.body;
    await GetAccount(accountId);
    const result = await metaStats.getMetrics(accountId);
    const totalProfit = result.profit;
    const averageProfit = result.averageWin;
    const totalTrades = result.trades;
    const avgTradeDuration = result.averageTradeLengthInMilliseconds;
    const totalLots = result.lots;
    const bestTrade = result.bestTrade;
    const worstTrade = result.worstTrade;
    const averageByCurrency = await calculateAverageRRRatioByCurrency(
      result.monthlyAnalytics
    );
    const averageRRRatio = await calculateAverageRRRatioByMonth(
      averageByCurrency
    );
    const winRate = (result.wonTrades * 100) / result.trades;
    const lossRate = (result.lostTrades * 100) / result.trades;
    const wonTrades = result.wonTrades;
    const lostTrades = result.lostTrades;
    const profitFactor = result.profitFactor;
    const cagr = result.cagr;
    const riskScore = result.wonTrades > result.lostTrades ? "High" : "Low";
    const maxDrawdown = result.maxDrawdown;
    const sharpeRatio = result.sharpeRatio;
    const sortinoRatio = result.sortinoRatio;
    const winLossRatio = result.wonTrades / result.lostTrades;
    const recoveryFactor = result.profit / result.maxDrawdown;
    const avgPositionSize = result.lots;
    const marginLevel = result.marginLevel;
    const freeMargin = result.freeMargin;
    const marginUsage = result.margin;

    const currentDate = new Date();
    const currentMonthDate = new Date(currentDate);
    const currentMonth = await convertDate(currentMonthDate);
    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonth = await convertDate(lastMonthDate);
    console.log("Current Month:", currentMonth);
    console.log("Last Month:", lastMonth);

    const calendarTotalStats = await calculateCalendarTotalStats(
      result.monthlyAnalytics,
      currentMonth,
      lastMonth
    );
    res.status(200).json({
      status: "success",
      data: {
        totalProfit,
        averageProfit,
        totalTrades,
        avgTradeDuration,
        totalLots,
        bestTrade,
        worstTrade,
        averageRRRatio,
        currentMonthProfit: calendarTotalStats.currentMonthProfit,
        currentMonthLots: calendarTotalStats.currentMonthLots,
        currentMonthTrades: calendarTotalStats.currentMonthTrades,
        profitPercent: calendarTotalStats.profitPercent,
        lotsPercent: calendarTotalStats.lotsPercent,
        tradesPercent: calendarTotalStats.tradesPercent,
        winRate,
        lossRate,
        wonTrades,
        lostTrades,
        profitFactor,
        cagr,
        riskScore,
        maxDrawdown,
        sharpeRatio,
        sortinoRatio,
        winLossRatio,
        recoveryFactor,
        avgPositionSize,
        marginLevel,
        freeMargin,
        marginUsage,
      },
    });
  } catch (err) {
    console.log("Error!", err);
  }
}

// --------------------functions---------------//

async function calculateAverageRRRatioByCurrency(data) {
  return data.map((month) => {
    const totalRewardToRiskRatio = month.currencies.reduce(
      (sum, currency) => sum + currency.rewardToRiskRatio,
      0
    );
    const average = totalRewardToRiskRatio / month.currencies.length;
    return { date: month.date, averageRewardToRiskRatio: average };
  });
}

async function calculateAverageRRRatioByMonth(data) {
  const average =
    data.reduce((sum, item) => sum + item.averageRewardToRiskRatio, 0) /
    data.length;
  return average;
}

async function GetCalendarTradesStats(req, res) {
  try {
    const { currentDate, accountId } = req.body;
    const convertedDate = await convertDate(currentDate);
    console.log("----calendar Trades Stats----->", convertedDate);
    const existingTrades = await prisma.trades.findMany({
      where: {
        accountId,
      },
    });
    const filteredTrades = existingTrades.filter((entry) => {
      const closeDate = new Date(entry.closeTime);
      return closeDate.toISOString().startsWith(convertedDate);
    });
    const monthStats = await calculateMonthStats(filteredTrades);
    res.status(200).json({
      status: "success",
      data: { monthStats },
    });
  } catch (err) {
    console.log(err);
  }
}

async function convertDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const formattedDate = `${year}-${month}`;
  return formattedDate;
}

async function calculateMonthStats(trades) {
  const monthStats = {};

  trades.forEach((trade) => {
    const closeTime = new Date(trade.closeTime);
    const day = closeTime.getDate();

    if (!monthStats[day]) {
      monthStats[day] = {
        trades: 0,
        profit: 0,
        winCount: 0,
        bestTrade: -Infinity,
        worstTrade: Infinity,
      };
    }

    monthStats[day].trades += 1;
    monthStats[day].profit += trade.profit;

    if (trade.success === "won") {
      monthStats[day].winCount += 1;
    }

    if (trade.profit > monthStats[day].bestTrade) {
      monthStats[day].bestTrade = trade.profit;
    }
    if (trade.profit < monthStats[day].worstTrade) {
      monthStats[day].worstTrade = trade.profit;
    }
  });

  for (const day in monthStats) {
    const dayStats = monthStats[day];
    dayStats.winRate = Math.round((dayStats.winCount / dayStats.trades) * 100);
    delete dayStats.winCount;
  }

  return monthStats;
}

async function calculateCalendarTotalStats(data, currentMonth, lastMonth) {
  let currentMonthProfit = 0,
    currentMonthLots = 0,
    currentMonthTrades = 0,
    lastMonthProfit = 0,
    lastMonthLots = 0,
    lastMonthTrades = 0;
  console.log("-----calendar------", data, currentMonth, lastMonth);
  await data.forEach((item) => {
    if (item.date == currentMonth) {
      currentMonthProfit = item.profit;
      currentMonthLots = item.lots;
      currentMonthTrades = item.trades;
    }
    if (item.date == lastMonth) {
      lastMonthProfit = item.profit;
      lastMonthLots = item.lots;
      lastMonthTrades = item.trades;
    }
  });
  const profitPercent =
    ((currentMonthProfit - lastMonthProfit) * 100) / Math.abs(lastMonthProfit);
  const lotsPercent =
    ((currentMonthLots - lastMonthLots) * 100) / Math.abs(lastMonthLots);
  const tradesPercent =
    ((currentMonthTrades - lastMonthTrades) * 100) / Math.abs(lastMonthTrades);
  return {
    currentMonthProfit,
    currentMonthLots,
    currentMonthTrades,
    profitPercent,
    lotsPercent,
    tradesPercent,
  };
}

async function formatDate(isoString) {
  const date = new Date(isoString);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function getWebhookName(str) {
  const match = str.match(/_(\d+)_/);
  let id = match && match[1];
  const existingWebhook = await prisma.webhook.findFirst({
    where: {
      id: Number(id),
    },
  });
  if (!existingWebhook) {
    return "unknown webhook";
  }
  return existingWebhook.webhookName;
}
module.exports = {
  GetTrades,
  GetMetaTrades,
  GetTradeLockerTrades,
  GetTotalTradesStats,
  GetCalendarTradesStats,
};
