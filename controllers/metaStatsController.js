const prisma = require("../config/prisma");
const MetaStats = require("metaapi.cloud-sdk").MetaStats;
const MetaApi = require("metaapi.cloud-sdk").default;
const { startOfWeek, startOfMonth, startOfYear, format } = require("date-fns");
require("dotenv").config;

const api = new MetaApi(process.env.METAAPI_TOKEN);
const metaStats = new MetaStats(process.env.METAAPI_TOKEN);
let account;

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

async function GetTotalStats(req, res) {
  try {
    const { accountId } = req.body;

    await GetAccount(accountId);
    const result = await metaStats.getMetrics(accountId);
    // console.log("Statistics of meta account", result);
    const balance = result.balance;
    const equity = result.equity;
    const profit = result.profit;
    const todayWinRate =
      result?.periods?.today?.wonTradesPercentDifference || 0;
    const totalTrades = result.trades;
    const winTrades = result.wonTrades;
    const avgHoldTime =
      (result?.monthlyAnalytics[0]?.currencies[0]
        .averageHoldingTimeLongsInMilliseconds +
        result?.monthlyAnalytics[0]?.currencies[0]
          .averageHoldingTimeShortsInMilliseconds) /
      2;
    const successRate = result.wonTradesPercent;

    const data = {
      balance,
      equity,
      profit,
      todayWinRate,
      totalTrades,
      winTrades,
      avgHoldTime,
      successRate,
    };
    res.status(200).json({
      status: "success",
      data: {
        data,
      },
    });
  } catch (err) {
    console.log("Error!", err);
  }
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
    console.log("Error!", err);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve trades.",
    });
  }
}

async function GetVisualStats(req, res) {
  try {
    const { accountId } = req.body;
    await GetAccount(accountId);
    const result = await metaStats.getMetrics(accountId);
    const won_lost = [
      {
        name: "wonTradesPercent",
        value: result?.wonTradesPercent,
      },
      {
        name: "lostTradesPercent",
        value: result?.lostTradesPercent,
      },
    ];
    const trades_by_week = await ByWeekDay(result?.closeTradesByWeekDay);
    const trades_by_hour = await TradesByHour(result?.openTradesByHour);
    res.status(200).json({
      status: "success",
      data: {
        won_lost,
        trades_by_week,
        trades_by_hour,
      },
    });
  } catch (err) {
    console.log("Get data is failed", err);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve trades.",
    });
  }
}

async function GetVisualTrades(req, res) {
  try {
    const { email, index, accountId } = req.body;

    console.log("-------0000000---------->", email, index, accountId);
    // Find the user based on email
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User is not found" });
    }

    // Get the current date (today)
    const currentDate = new Date();

    // Set the start date based on the selected index
    let startDate;
    switch (index) {
      case "week":
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start of the week (Monday)
        break;
      case "month":
        startDate = startOfMonth(currentDate); // Start of the month
        break;
      case "year":
        startDate = startOfYear(currentDate); // Start of the year
        break;
      default:
        return res.status(400).json({
          error: "Invalid index type. Must be 'week', 'month', or 'year'.",
        });
    }

    // Use the current date as the end date
    const endDate = currentDate;

    // Retrieve trades based on userId, accountId, and date range
    const trades = await prisma.trades.findMany({
      where: {
        userId: existingUser.id,
        accountId: accountId,
        closeTime: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
    });

    const getDateGroup = (date) => {
      return format(new Date(date), "yyyy-MM-dd"); // Returns the date in YYYY-MM-DD format
    };

    // Group the trades and calculate the total profit and loss for each day
    const groupedTrades = trades.reduce((acc, trade) => {
      const groupKey = getDateGroup(trade.closeTime); // Group by date

      if (!acc[groupKey]) {
        acc[groupKey] = { date: groupKey, profit: 0, loss: 0 };
      }

      // Add profit or loss based on success
      if (trade.success === "won") {
        acc[groupKey].profit += trade.profit; // Add profit when "won"
      } else if (trade.success === "lost") {
        acc[groupKey].loss += trade.profit; // Add loss when "lost"
      }

      return acc;
    }, {});

    // Convert the grouped data into an array and sort by date
    const finalResult = Object.values(groupedTrades).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.status(200).json({
      status: "success",
      data: {
        finalResult,
      },
    });
  } catch (err) {
    console.log("Get the trades is failed", err);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
}

async function ByWeekDay(closeTradesByWeekDay) {
  const weekDayMapping = {
    1: "Sun",
    2: "Mon",
    3: "Tue",
    4: "Wed",
    5: "Thu",
    6: "Fri",
    7: "Sat",
  };
  const data = [
    { name: "Sun", lostProfit: 0, wonProfit: 0 },
    { name: "Mon", lostProfit: 0, wonProfit: 0 },
    { name: "Tue", lostProfit: 0, wonProfit: 0 },
    { name: "Wed", lostProfit: 0, wonProfit: 0 },
    { name: "Thu", lostProfit: 0, wonProfit: 0 },
    { name: "Fri", lostProfit: 0, wonProfit: 0 },
    { name: "Sat", lostProfit: 0, wonProfit: 0 },
  ];
  closeTradesByWeekDay?.forEach((entry) => {
    const dayName = weekDayMapping[entry.day]; // Get the day name from mapping
    const index = data.findIndex((item) => item.name === dayName); // Find the index of the day in the array
    if (index !== -1) {
      data[index].lostProfit = entry.lostProfit; // Set the lost profit for the specific day
      data[index].wonProfit = entry.wonProfit; // Set the won profit for the specific day
    }
  });
  return data;
}

async function TradesByHour(tradesByHour) {
  const hours = Array.from({ length: 24 }, (_, i) => i + 1);
  const result = hours.map((hour) => {
    const hourData = tradesByHour.find((d) => d.hour === hour);
    return {
      hour: hour.toString(),
      lostProfit:
        hourData && hourData.lostProfit !== undefined ? hourData.lostProfit : 0,
      wonProfit:
        hourData && hourData.wonProfit !== undefined ? hourData.wonProfit : 0,
    };
  });
  // return result.filter((item) => item.lostProfit !== 0 || item.wonProfit !== 0);
  return result;
}

module.exports = {
  GetTotalStats,
  GetTrades,
  GetVisualStats,
  GetVisualTrades,
};
