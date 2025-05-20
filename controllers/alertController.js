const prisma = require("../config/prisma");
const MetaApi = require("metaapi.cloud-sdk");
const axios = require("axios");
const {
  GetConnectionFromMap,
  getSymbolInfoMetaTrader,
  getTradeParamstMetaTrader,
  createOrderMetaTrader,
  getPositionsMetaTrader,
  getInstrumentTradelocker,
  getQuotesTradelocker,
  getInstrumentInfoTradelocker,
  createOrderTradelocker,
  getAccessToken,
  DefineURL,
  getPositionsTradelocker,
  modifyOrderTradelocker,
  closeOrderTradelocker,
} = require("../controllers/webhookController.js");
const { parse } = require("path");
require("dotenv").config();

//------------------------Alert Function---------------------------------//
async function OpenTradeByAlert(req, res) {
  try {
    const { hashedWebhook } = req.params;
    const alertMessage = req.body;
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        hashedWebhook,
      },
    });
    const existingUser = await prisma.user.findFirst({
      where: {
        id: existingWebhook.userId,
      },
    });
    if (!existingWebhook) {
      return res.status(404).json({
        status: "error",
        message: "Webhook not found",
      });
    }
    const io = req.app.get("io");

    const newAlert = await prisma.alert.create({
      data: {
        userId: existingWebhook.userId,
        orderType: existingWebhook.orderType,
        webhookName: existingWebhook.webhookName,
        webhookMode: existingWebhook.webhookMode,
        symbol: existingWebhook.symbol,
        volume: existingWebhook.volume,
        appName: existingWebhook.appName,
        messageData: alertMessage,
      },
    });
    io.emit(`${existingUser.email}_new`, newAlert);
    console.log("existingWebhook", hashedWebhook);
    let result = {};
    if (existingWebhook.webhookMode == "basic") {
      result = await OpenBasicTradeByWebhook(hashedWebhook);
    } else if (existingWebhook.webhookMode == "premium") {
      result = await OpenPremiumTradeByWebhook(hashedWebhook);
    } else if (existingWebhook.webhookMode == "advanced") {
      result = await OpenAdvancedTradeByWebhook(hashedWebhook, alertMessage);
    }
    if (result) {
      const updatedAlert = await prisma.alert.update({
        where: { id: newAlert.id },
        data: {
          positionId_m: result.positionId_m,
          positionId_t: result.positionId_t,
          tradeStartTime: result.tradeStartTime,
        },
        select: {
          id: true,
          userId: true,
          orderType: true,
          webhookName: true,
          webhookMode: true,
          symbol: true,
          volume: true,
          appName: true,
          messageData: true,
          positionId_m: true,
          positionId_t: true,
          tradeStartTime: true,
        },
      });
      console.log("🛑 request tradingview Body:", updatedAlert);
      io.emit(`${existingUser.email}_update`, updatedAlert);

      res.status(200).json({
        status: "success",
      });
    }
  } catch (err) {
    console.log("error", err);
  }
}

async function GetAllAlerts(req, res) {
  try {
    const { email } = req.body;
    console.log("email", email);
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    console.log(existingUser.id);
    const alerts = await prisma.alert.findMany({
      where: {
        userId: existingUser.id,
      },
    });
    res.status(200).json({
      status: "success",
      data: {
        alerts,
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

async function UpdateAlert(req, res) {
  try {
    const { email } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    const unviwedAlerts = await prisma.alert.findMany({
      where: {
        userId: existingUser.id,
        view: false,
      },
    });
    if (unviwedAlerts.length > 0) {
      await prisma.alert.updateMany({
        where: {
          userId: existingUser.id,
          view: false,
        },
        data: {
          view: true,
        },
      });
    }
    const alerts = await prisma.alert.findMany({
      where: {
        userId: existingUser.id,
      },
    });
    res.status(200).json({
      status: "success",
      data: {
        alerts,
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

async function OpenBasicTradeByWebhook(hashedWebhook) {
  try {
    let result_m = {};
    let result_t = {};
    const currentDate = new Date();
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        hashedWebhook,
      },
    });
    if (existingWebhook.accountId_m) {
      const connection = await GetConnectionFromMap(
        existingWebhook.accountId_m
      );
      const symbolInfo = await getSymbolInfoMetaTrader(
        connection,
        existingWebhook.symbol
      );
      let ask = symbolInfo.ask;
      let bid = symbolInfo.bid;
      let marketPrice = symbolInfo.marketPrice;
      let pips = symbolInfo.pips;
      let lotSize = Number(existingWebhook.volume);
      const tradeParams = await getTradeParamstMetaTrader(
        existingWebhook.orderDirection,
        existingWebhook.orderType,
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
      result_m = await createOrderMetaTrader(
        existingWebhook.orderDirection,
        existingWebhook.orderType,
        connection,
        existingWebhook.symbol,
        lotSize,
        stopLoss,
        takeProfit,
        openPrice,
        stopLimit,
        existingWebhook.id,
        true,
        existingWebhook.trailingStopLoss
      );
      console.log("🎈metatrader success");
    }
    if (existingWebhook.accountId_t) {
      const baseURL = await DefineURL(existingWebhook.accountType);
      const tokenResult = await getAccessToken(
        baseURL,
        existingWebhook.refreshToken
      );
      await prisma.webhook.update({
        where: {
          id: existingWebhook.id,
        },
        data: {
          refreshToken: tokenResult.refreshToken,
        },
      });
      const instrument = await getInstrumentTradelocker(
        baseURL,
        existingWebhook.accountId_t,
        tokenResult.accessToken,
        existingWebhook.accNum,
        existingWebhook.symbol
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
      console.log("tradelocker instrument", routeIdInfo, tradableInstrumentId);
      const quotes = await getQuotesTradelocker(
        baseURL,
        routeIdInfo,
        tradableInstrumentId,
        tokenResult.accessToken,
        existingWebhook.accNum
      );
      console.log("tradelocker ask bid---->", quotes.ask, quotes.bid);
      const ask = quotes.ask;
      const bid = quotes.bid;
      let pips = await getInstrumentInfoTradelocker(
        baseURL,
        tradableInstrumentId,
        routeIdInfo,
        tokenResult.accessToken,
        existingWebhook.accNum
      );
      let stopLoss = 0,
        takeProfit = 0;
      let lotSize = Number(existingWebhook.volume);
      if (existingWebhook.orderDirection == "buy") {
        stopLoss = ask - existingWebhook.stopLoss_pips * pips;
        takeProfit = ask + existingWebhook.takeProfit_pips * pips;
      } else {
        stopLoss = bid + existingWebhook.stopLoss_pips * pips;
        takeProfit = bid - existingWebhook.takeProfit_pips * pips;
      }
      result_t = await createOrderTradelocker(
        baseURL,
        existingWebhook.accountId_t,
        lotSize,
        routeIdTrade,
        existingWebhook.orderDirection,
        stopLoss,
        takeProfit,
        true,
        existingWebhook.trailingStopLoss,
        tradableInstrumentId,
        tokenResult.accessToken,
        existingWebhook.accNum
      );
      console.log("🎈tradelocker success");
    }
    return {
      positionId_m: result_m.orderId,
      positionId_t: result_t?.data?.d?.orderId,
      tradeStartTime: currentDate,
    };
  } catch (err) {
    console.log("error", err.message);
  }
}

async function OpenPremiumTradeByWebhook(hashedWebhook) {
  try {
    let result_m = {};
    let result_t = {};
    const currentDate = new Date();
    const existingWebhook = await prisma.webhook.findFirst({
      where: { hashedWebhook },
    });
    if (existingWebhook.accountId_m) {
      const connection = await GetConnectionFromMap(
        existingWebhook.accountId_m
      );
      const symbolInfo = await getSymbolInfoMetaTrader(
        connection,
        existingWebhook.symbol
      );
      let ask = symbolInfo.ask;
      let bid = symbolInfo.bid;
      let marketPrice = symbolInfo.marketPrice;
      let pips = symbolInfo.pips;
      let lotSize = Number(existingWebhook.volume);
      const tradeParams = await getMultiTradeParamsMetaTrader(
        existingWebhook.orderDirection,
        ask,
        bid,
        pips,
        marketPrice,
        existingWebhook.stopLoss_pips,
        existingWebhook.multiTakeProfits_pips,
        existingWebhook.breakenEvenSetting_pips
      );
      console.log("🎈🎈 multi trade params--->", tradeParams);
      let stopLoss = tradeParams.stopLoss;
      let multiTakeProfit = tradeParams.multiTakeProfit;
      let openPrice = tradeParams.openPrice;
      result_m = await createMultiOrderMetaTrader(
        connection,
        existingWebhook,
        lotSize,
        stopLoss,
        multiTakeProfit,
        openPrice
      );
      console.log("🎈🎈🎈🎈🎈metatrader success", result_m);
    }
    if (existingWebhook.accountId_t) {
      const baseURL = await DefineURL(existingWebhook.accountType);
      const tokenResult = await getAccessToken(
        baseURL,
        existingWebhook.refreshToken
      );
      await prisma.webhook.update({
        where: {
          id: existingWebhook.id,
        },
        data: {
          refreshToken: tokenResult.refreshToken,
        },
      });
      const instrument = await getInstrumentTradelocker(
        baseURL,
        existingWebhook.accountId_t,
        tokenResult.accessToken,
        existingWebhook.accNum,
        existingWebhook.symbol
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
      console.log("tradelocker instrument", routeIdInfo, tradableInstrumentId);
      const quotes = await getQuotesTradelocker(
        baseURL,
        routeIdInfo,
        tradableInstrumentId,
        tokenResult.accessToken,
        existingWebhook.accNum
      );
      console.log("tradelocker ask bid---->", quotes.ask, quotes.bid);
      const ask = quotes.ask;
      const bid = quotes.bid;
      let pips = await getInstrumentInfoTradelocker(
        baseURL,
        tradableInstrumentId,
        routeIdInfo,
        tokenResult.accessToken,
        existingWebhook.accNum
      );
      let stopLoss = 0;
      let multiTakeProfit = [];
      let lotSize = Number(existingWebhook.volume);
      if (existingWebhook.orderDirection == "buy") {
        stopLoss = ask - existingWebhook.stopLoss_pips * pips;
        for (let i = 0; i < existingWebhook.multiTakeProfits_pips.length; i++) {
          multiTakeProfit.push(ask + existingWebhook.multiTakeProfits_pips[i]);
        }
      } else {
        stopLoss = bid + existingWebhook.stopLoss_pips * pips;
        for (let i = 0; i < existingWebhook.multiTakeProfits_pips.length; i++) {
          multiTakeProfit.push(bid - existingWebhook.multiTakeProfits_pips[i]);
        }
      }
      result_t = await createMultiOrderTradeLocker(
        baseURL,
        existingWebhook.accountId_t,
        lotSize,
        routeIdTrade,
        existingWebhook.orderDirection,
        existingWebhook.orderType,
        stopLoss,
        multiTakeProfit,
        existingWebhook.trailingStopLoss,
        tradableInstrumentId,
        tokenResult.accessToken,
        existingWebhook.accNum,
        existingWebhook.id
      );
    }
    return {
      positionId_m: result_m.join(","),
      positionId_t: result_t.join(","),
      tradeStartTime: currentDate,
    };
  } catch (err) {
    console.log("error", err.message);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function OpenAdvancedTradeByWebhook(hashedWebhook, alertMessage) {
  try {
    let result_m = {};
    let result_t = {};
    const currentDate = new Date();
    const existingWebhook = await prisma.webhook.findFirst({
      where: { hashedWebhook },
    });
    const orderParamsFromAlert = alertMessage.match(/^\S+/);
    if (orderParamsFromAlert[0] == "MARKET-ORDER") {
      const parsedAlertMessage = await parseMarketOrder(alertMessage);
      if (existingWebhook.accountId_m) {
        const connection = await GetConnectionFromMap(
          existingWebhook.accountId_m
        );
        const symbolInfo = await getSymbolInfoMetaTrader(
          connection,
          parsedAlertMessage.symbol
        );
        let stopLoss = 0,
          takeProfit = 0;
        let ask = symbolInfo.ask;
        let bid = symbolInfo.bid;
        let pips = symbolInfo.pips;
        let lotSize = Number(existingWebhook.volume);
        if (Number(parsedAlertMessage.stopLoss_price)) {
          stopLoss = Number(parsedAlertMessage.stopLoss_price);
        } else if (Number(parsedAlertMessage.stopLoss_pips)) {
          stopLoss =
            parsedAlertMessage.type == "buy"
              ? ask - Number(parsedAlertMessage.stopLoss_pips) * pips
              : bid + Number(parsedAlertMessage.stopLoss_pips) * pips;
        }
        if (Number(parsedAlertMessage.takeProfit_price)) {
          takeProfit = Number(parsedAlertMessage.takeProfit_price);
        } else if (Number(parsedAlertMessage.takeProfit_pips)) {
          takeProfit =
            parsedAlertMessage.type == "sell"
              ? ask + Number(parsedAlertMessage.takeProfit_pips) * pips
              : bid - Number(parsedAlertMessage.takeProfit_pips) * pips;
        }
        result_m = await createMarketOrderMetaTrader(
          connection,
          parsedAlertMessage.type,
          parsedAlertMessage.symbol,
          lotSize,
          stopLoss,
          takeProfit,
          existingWebhook.id
        );
      }
      if (existingWebhook.accountId_t) {
        const baseURL = await DefineURL(existingWebhook.accountType);
        const tokenResult = await getAccessToken(
          baseURL,
          existingWebhook.refreshToken
        );
        await prisma.webhook.update({
          where: {
            id: existingWebhook.id,
          },
          data: {
            refreshToken: tokenResult.refreshToken,
          },
        });
        const instrument = await getInstrumentTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          tokenResult.accessToken,
          existingWebhook.accNum,
          parsedAlertMessage.symbol
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
          tokenResult.accessToken,
          existingWebhook.accNum
        );
        const ask = quotes.ask;
        const bid = quotes.bid;
        let pips = await getInstrumentInfoTradelocker(
          baseURL,
          tradableInstrumentId,
          routeIdInfo,
          tokenResult.accessToken,
          existingWebhook.accNum
        );
        let stopLoss = 0,
          takeProfit = 0;
        let lotSize = Number(existingWebhook.volume);
        if (parsedAlertMessage.stopLoss_price)
          stopLoss = Number(parsedAlertMessage.stopLoss_price);
        if (parsedAlertMessage.type == "buy") {
          stopLoss = ask - Number(parsedAlertMessage.stopLoss_pips) * pips;
        } else {
          stopLoss = bid + Number(parsedAlertMessage.stopLoss_pips) * pips;
        }
        if (parsedAlertMessage.takeProfit_price)
          takeProfit = Number(parsedAlertMessage.takeProfit_price);
        if (parsedAlertMessage.type == "buy") {
          takeProfit = ask + Number(parsedAlertMessage.takeProfit_pips) * pips;
        } else {
          takeProfit = bid - Number(parsedAlertMessage.takeProfit_pips) * pips;
        }
        result_t = await createOrderTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          lotSize,
          routeIdTrade,
          parsedAlertMessage.type,
          stopLoss,
          takeProfit,
          true,
          0,
          tokenResult.accessToken,
          existingWebhook.accNum
        );
      }
      return {
        positionId_m: result_m.orderId,
        positionId_t: result_t?.data?.d.orderId,
        tradeStartTime: currentDate,
      };
    } else if (orderParamsFromAlert[0] == "UPDATE-SL") {
      const parsedAlertMessage = await parseUpdateSL(alertMessage);
      if (existingWebhook.accountId_m) {
        const connection = await GetConnectionFromMap(
          existingWebhook.accountId_m
        );
        const symbolInfo = await connection.getSymbolSpecification(
          parsedAlertMessage.symbol
        );
        const positions = await getPositionsMetaTrader(
          connection,
          false,
          parsedAlertMessage.type
        );
        let stopLoss = 0;
        for (const position of positions) {
          if (position.clientId.search(parsedAlertMessage.tradeId) > 0) {
            if (parsedAlertMessage.stopLoss_price) {
              stopLoss = Number(parsedAlertMessage.stopLoss_price);
            } else {
              stopLoss =
                parsedAlertMessage.type == "buy"
                  ? position.currentPrice -
                    Number(parsedAlertMessage.stopLoss_pips) *
                      symbolInfo.tickSize
                  : position.currentPrice +
                    Number(parsedAlertMessage.stopLoss_pips) *
                      symbolInfo.tickSize;
            }
            await connection.modifyPosition(
              position.id,
              stopLoss,
              position.takeProfit
            );
          }
        }
      }
      if (existingWebhook.accountId_t) {
        const baseURL = await DefineURL(existingWebhook.accountType);
        const tokenResult = await getAccessToken(
          baseURL,
          existingWebhook.refreshToken
        );
        await prisma.webhook.update({
          where: {
            id: existingWebhook.id,
          },
          data: {
            refreshToken: tokenResult.refreshToken,
          },
        });
        const instrument = await getInstrumentTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          tokenResult.accessToken,
          existingWebhook.accNum,
          parsedAlertMessage.symbol
        );
        const tradableInstrumentId = instrument.tradableInstrumentId;
        console.log(
          "tradelocker--modify--accountId---->",
          existingWebhook.accountId_t
        );
        const positions = await getPositionsTradelocker(
          baseURL,
          existingWebhook.accountId_t,
          tokenResult.accessToken,
          existingWebhook.accNum,
          tradableInstrumentId
        );
        const filteredPositions = await positions.filter(
          (position) => position[3] == parsedAlertMessage.type
        );
        let stopLoss = 0;
        for (const position of filteredPositions) {
          const tickSize = await getInstrumentInfoTradelocker(
            baseURL,
            position[1],
            position[2],
            tokenResult.accessToken,
            existingWebhook.accNum
          );
          console.log("tradelocker ticksize---->", tickSize);
          if (position[3] == "buy") {
            stopLoss = Number(parsedAlertMessage.stopLoss_price)
              ? Number(parsedAlertMessage.stopLoss_price)
              : position[4] -
                Number(parsedAlertMessage.stopLoss_pips) * tickSize;
          } else {
            stopLoss = Number(parsedAlertMessage.stopLoss_price)
              ? Number(parsedAlertMessage.stopLoss_price)
              : position[4] +
                Number(parsedAlertMessage.stopLoss_pips) * tickSize;
          }
          console.log("tradelocker stoploss---->", stopLoss);
          /* ************************************** */
          // await modifyOrderTradelocker(baseURL, position[0], stopLoss)
          /* ************************************** */
          res.status(200).json({
            status: "success",
            message: "Modify order success!",
          });
        }
      }
    } else if (orderParamsFromAlert[0] == "CLOSE-ORDER") {
      if (existingWebhook.accountId_m) {
        try {
          const connection = await GetConnectionFromMap(
            existingWebhook.accountId_m
          );
          const parsedAlertMessage = await parseCloseOrder(alertMessage);
          if (
            Number(parsedAlertMessage.partialClose) > 0 &&
            Number(parsedAlertMessage.partialClose) < 100
          ) {
            const positions = await getPositionsMetaTrader(
              connection,
              false,
              parsedAlertMessage.type
            );
            const partialClose = Number(parsedAlertMessage.partialClose) / 100;
            for (const position of positions) {
              if (position.clientId.search(parsedAlertMessage.tradeId) > 0) {
                await connection.closePositionPartially(
                  position.id,
                  partialClose * position.volume
                );
              }
            }
          }
          return res.status(200).json({
            status: "success",
            code: 200,
          });
        } catch (err) {
          console.error("Error procesing close order:", err);
          return res.status(500).json({
            status: "error",
            message: err.message,
          });
        }
      }
      if (existingWebhook.accountId_t) {
        try {
          const baseURL = await DefineURL(existingWebhook.accountType);
          const parsedAlertMessage = await parseCloseOrder(alertMessage);
          const tokenResult = await getAccessToken(
            baseURL,
            existingWebhook.refreshToken
          );
          await prisma.webhook.update({
            where: {
              id: existingWebhook.id,
            },
            data: {
              refreshToken: tokenResult.refreshToken,
            },
          });
          const instrument = await getInstrumentTradelocker(
            baseURL,
            existingWebhook.accountId_t,
            tokenResult.accessToken,
            existingWebhook.accNum,
            parsedAlertMessage.symbol
          );
          const tradableInstrumentId = instrument.tradableInstrumentId;
          console.log(
            "tradelocker--modify--accountId---->",
            existingWebhook.accountId_t
          );
          const positions = await getPositionsTradelocker(
            baseURL,
            existingWebhook.accountId_t,
            tokenResult.accessToken,
            existingWebhook.accNum,
            tradableInstrumentId
          );
          const filteredPositions = await positions.filter(
            (position) => position[3] == parsedAlertMessage.type
          );
          for (const position of filteredPositions) {
            const lotSize =
              (position[4] * parsedAlertMessage.partialClose) / 100;
            await closeOrderTradelocker(
              baseURL,
              existingWebhook.accountId_t,
              tokenResult.accessToken,
              existingWebhook.accNum,
              tradableInstrumentId,
              lotSize
            );
          }
          return res.status(200).json({
            status: "success",
            code: 200,
            message: "close order success!",
          });
        } catch (err) {
          console.error("Error procesing close order:", eerr);
          return res.status(500).json({
            status: "error",
            message: err.message,
          });
        }
      }
    }
  } catch (err) {
    console.log("error", err.message);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}

async function getMultiTradeParamsMetaTrader(
  orderDirection,
  ask,
  bid,
  pips,
  marketPrice,
  stopLoss_pips,
  multiTakeProfits_pips,
  breakenEvenSetting_pips
) {
  let stopLoss = 0;
  let multiTakeProfit = [];
  let openPrice = 0;
  console.log("🎈multi takeprofits", multiTakeProfits_pips);
  if (orderDirection == "buy") {
    openPrice = marketPrice - pips * breakenEvenSetting_pips;
    stopLoss = ask - stopLoss_pips * pips;
    for (let i = 0; i < multiTakeProfits_pips.length; i++) {
      multiTakeProfit.push(ask + multiTakeProfits_pips[i] * pips);
    }
  } else if (orderDirection == "sell") {
    openPrice = marketPrice + pips * breakenEvenSetting_pips;
    stopLoss = bid + stopLoss_pips * pips;
    for (let i = 0; i < multiTakeProfits_pips.length; i++) {
      multiTakeProfit.push(bid - multiTakeProfits_pips[i] * pips);
    }
  }
  return {
    stopLoss,
    multiTakeProfit,
    openPrice,
  };
}

async function createMultiOrderMetaTrader(
  connection,
  existingWebhook,
  lotSize,
  stopLoss,
  multiTakeProfit,
  openPrice
) {
  let multiResult = [];
  console.log(
    "🎈🎈🎈🎈🎈🎈🎈🎈",
    existingWebhook,
    lotSize,
    stopLoss,
    multiTakeProfit,
    openPrice
  );
  if (existingWebhook.orderDirection == "buy") {
    for (let i = 0; i < multiTakeProfit.length; i++) {
      if (existingWebhook.orderType == "market") {
        const result = await connection.createMarketBuyOrder(
          existingWebhook.symbol,
          lotSize,
          stopLoss,
          multiTakeProfit[i],
          {
            clientId: `MB_${String(existingWebhook.id)}_1`,
          },
          {
            trailingStopLoss: {
              distance: {
                distance: existingWebhook.trailingDistance_pips,
                units: "RELATIVE_POINTS",
              },
            },
          }
        );
        console.log("🎈multi market order result", result);
        multiResult.push(result.orderId);
      } else if (existingWebhook.orderType == "limit") {
        const result = await connection.createLimitBuyOrder(
          existingWebhook.symbol,
          lotSize,
          openPrice,
          stopLoss,
          multiTakeProfit[i],
          {
            clientId: `LB_${String(existingWebhook.id)}_1`,
          },
          {
            expiration: {
              type: "ORDER_TIME_SPECIFIED",
              time: new Date(
                Date.now() + existingWebhook.timeBasedExitMinute * 1000
              ),
            },
          }
        );
        console.log("🎈multi limit order result", result);
        multiResult.push(result.orderId);
      } else if (existingWebhook.orderType == "stop") {
        const result = await connection.createStopBuyOrder(
          existingWebhook.symbol,
          lotSize,
          openPrice,
          stopLoss,
          multiTakeProfit[i],
          {
            clientId: `SB_${String(existingWebhook.id)}_1`,
          }
        );
        multiResult.push(result.orderId);
      }
    }
  } else {
    for (let i = 0; i < multiTakeProfit.length; i++) {
      if (existingWebhook.orderType == "market") {
        const result = await connection.createMarketSellOrder(
          existingWebhook.symbol,
          lotSize,
          stopLoss,
          multiTakeProfit[i],
          {
            clientId: `MB_${String(existingWebhook.id)}_1`,
          },
          {
            trailingStopLoss: {
              distance: {
                distance: existingWebhook.trailingDistance_pips,
                units: "RELATIVE_POINTS",
              },
            },
          }
        );
        console.log("🎈multi market order result", result);
        multiResult.push(result.orderId);
      } else if (existingWebhook.orderType == "limit") {
        const result = await connection.createLimitSellOrder(
          existingWebhook.symbol,
          lotSize,
          openPrice,
          stopLoss,
          multiTakeProfit[i],
          {
            clientId: `LB_${String(existingWebhook.id)}_1`,
          },
          {
            expiration: {
              type: "ORDER_TIME_SPECIFIED",
              time: new Date(
                Date.now() + existingWebhook.timeBasedExitMinute * 1000
              ),
            },
          }
        );
        console.log("🎈multi limit order result", result);
        multiResult.push(result.orderId);
      } else if (existingWebhook.orderType == "stop") {
        const result = await connection.createStopSellOrder(
          existingWebhook.symbol,
          lotSize,
          openPrice,
          stopLoss,
          multiTakeProfit[i],
          {
            clientId: `SB_${String(existingWebhook.id)}_1`,
          }
        );
        multiResult.push(result.orderId);
      }
    }
  }
  return multiResult;
}

async function createMultiOrderTradeLocker(
  baseURL,
  accountId_t,
  lotSize,
  routeIdTrade,
  orderDirection,
  orderType,
  stopLoss,
  multiTakeProfit,
  trailingStopLoss,
  tradableInstrumentId,
  accessToken,
  accNum,
  webhookId
) {
  let multiResult = [];
  for (let i = 0; i < multiTakeProfit.length; i++) {
    const result = await axios.post(
      `${baseURL}/trade/accounts/${accountId_t}/orders`,
      {
        price: 0,
        qty: lotSize,
        routeId: routeIdTrade,
        side: orderDirection,
        strategyId: `${webhookId}`,
        stopLoss: stopLoss,
        stopLossType: "absolute",
        stopPrice: 0,
        takeProfit: multiTakeProfit[i],
        takeProfitType: "absolute",
        trStopOffset: trailingStopLoss,
        tradableInstrumentId: tradableInstrumentId,
        type: `${orderType}`,
        validity: `${orderType == "market" ? "IOC" : "GTC"}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          accNum,
          "Content-Type": "application/json",
        },
      }
    );
    multiResult.push(result?.data?.d?.orderId);
  }
  return multiResult;
}

async function parseMarketOrder(input) {
  const result = {};
  const keyMap = {
    RISK: "risk",
    "TAKE-PROFIT": "takeProfit_pips",
    "STOP-LOSS": "stopLoss_pips",
    "TAKE-PROFIT-@": "takeProfit_price",
    "STOP-LOSS-@": "stopLoss_price",
    ID: "tradeId",
  };
  const parts = input.split(" ");
  result.command = parts[0];
  result.symbol = parts[1];
  result.type = parts[2];
  for (let i = 3; i < parts.length; i++) {
    const [key, value] = parts[i].split("=");
    if (key && value !== undefined) {
      const mappedKey = keyMap[key] || key;
      result[mappedKey] = value;
    }
  }
  return result;
}

async function parseUpdateSL(input) {
  const result = {};

  const keyMap = {
    "STOP-LOSS": "stopLoss_pips",
    "STOP-LOSS-@": "stopLoss_price",
    ID: "tradeId",
  };

  const parts = input.split(" ");

  result.command = parts[0];
  result.symbol = parts[1];
  result.type = parts[2];

  for (let i = 3; i < parts.length; i++) {
    const [key, value] = parts[i].split("=");
    if (key && value !== undefined) {
      const mappedKey = keyMap[key] || key;
      result[mappedKey] = value;
    }
  }

  return result;
}

async function parseCloseOrder(input) {
  const result = {};

  const keyMap = {
    "PARTIAL-CLOSE": "partialClose",
    ID: "tradeId",
  };

  const parts = input.split(" ");

  result.command = parts[0];
  result.symbol = parts[1];
  result.type = parts[2];

  for (let i = 3; i < parts.length; i++) {
    const [key, value] = parts[i].split("=");
    if (key && value !== undefined) {
      const mappedKey = keyMap[key] || key;
      result[mappedKey] = value;
    }
  }

  return result;
}

async function createMarketOrderMetaTrader(
  connection,
  orderDirection,
  symbol,
  lotSize,
  stopLoss,
  takeProfit,
  webhookId,
  tradeId
) {
  let result = {};
  if (orderDirection == "buy") {
    result = await connection.createMarketBuyOrder(
      symbol,
      lotSize,
      stopLoss,
      takeProfit,
      {
        clientId: `MB_${String(webhookId)}_${String(tradeId)}`,
      }
    );
  } else {
    result = await connection.createMarketSellOrder(
      symbol,
      lotSize,
      stopLoss,
      takeProfit,
      {
        clientId: `MB_${String(webhookId)}_${String(tradeId)}`,
      }
    );
  }
  return result;
}

module.exports = { OpenTradeByAlert, GetAllAlerts, UpdateAlert };
