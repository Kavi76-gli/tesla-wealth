"use strict";

const mongoose = require("mongoose");
const crypto = require("crypto");

const Trade = require("../models/Trade");
const User = require("../models/user");
const Transaction = require("../models/transaction");

// ======================================================
// TESLA WEALTH - REAL WALLET TRADE CONTROLLER
// ======================================================

// ======================================================
// CONFIGURATION
// ======================================================

const MARKET_SYMBOL = "BTCUSDT";

const MARKET_ASSET = "BTC/USD";

const BINANCE_PRICE_URL =
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";

const ALLOWED_DURATIONS = [
    30,
    60,
    180,
    300
];

const HISTORY_LIMIT = 50;

const PRICE_TIMEOUT = 8000;

const MIN_TRADE_AMOUNT = 1;

const MAX_TRADE_AMOUNT = 100000000;

// Fixed payout configuration.

const PAYOUT_MULTIPLIER = 2;

const PLATFORM_FEE_PERCENT = 3;


// ======================================================
// MONEY HELPERS
// ======================================================

function roundMoney(value) {

    return Math.round(
        (Number(value) + Number.EPSILON) * 100
    ) / 100;

}


// ======================================================
// TRANSACTION ID GENERATOR
// ======================================================

function generateTransactionId() {

    return (
        "TW-" +
        Date.now() +
        "-" +
        crypto.randomBytes(5).toString("hex").toUpperCase()
    );

}


// ======================================================
// CREATE TRANSACTION RECORD
// ======================================================

async function createLedgerEntry(
    data,
    session
) {

    const transaction = new Transaction({

        userId: data.userId,

        txId: generateTransactionId(),

        type: data.type,

        category: "TRADING",

        amount: roundMoney(data.amount),

        balanceBefore: roundMoney(data.balanceBefore),

        balanceAfter: roundMoney(data.balanceAfter),

        status: "COMPLETED",

        referenceType: "TRADE",

        referenceId: data.tradeId,

        idempotencyKey: data.idempotencyKey,

        description: data.description,

        metadata: data.metadata || {}

    });

    await transaction.save({
        session
    });

    return transaction;

}


// ======================================================
// GET REAL BTC MARKET PRICE
// ======================================================

async function getBTCPrice() {

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        PRICE_TIMEOUT
    );

    try {

        const response = await fetch(
            BINANCE_PRICE_URL,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                signal: controller.signal
            }
        );

        if (!response.ok) {

            throw new Error(
                `Market provider returned HTTP ${response.status}`
            );

        }

        const data = await response.json();

        const price = Number(data.price);

        if (
            !Number.isFinite(price) ||
            price <= 0 ||
            data.symbol !== MARKET_SYMBOL
        ) {

            throw new Error(
                "Invalid BTC market price received."
            );

        }

        return {

            price,

            symbol: MARKET_SYMBOL,

            asset: MARKET_ASSET,

            source: "BINANCE",

            timestamp: new Date()

        };

    }

    finally {

        clearTimeout(timeout);

    }

}


// ======================================================
// CALCULATE TRADE RESULT
// ======================================================

function calculateTradeResult(
    direction,
    entryPrice,
    exitPrice,
    amount
) {

    let result = "DRAW";

    if (exitPrice > entryPrice) {

        result =
            direction === "BUY"
                ? "WIN"
                : "LOSS";

    }

    else if (exitPrice < entryPrice) {

        result =
            direction === "SELL"
                ? "WIN"
                : "LOSS";

    }

    // --------------------------------------------------
    // FIXED PAYOUT CALCULATION
    // --------------------------------------------------

    let grossPayout = 0;

    let platformFee = 0;

    let netPayout = 0;

    let profit = 0;

    if (result === "WIN") {

        grossPayout = roundMoney(
            amount * PAYOUT_MULTIPLIER
        );

        platformFee = roundMoney(
            grossPayout *
            PLATFORM_FEE_PERCENT / 100
        );

        netPayout = roundMoney(
            grossPayout - platformFee
        );

        // Net profit after returning the original stake.

        profit = roundMoney(
            netPayout - amount
        );

    }

    else if (result === "LOSS") {

        grossPayout = 0;

        platformFee = 0;

        netPayout = 0;

        profit = roundMoney(-amount);

    }

    else {

        // DRAW: refund original stake.

        grossPayout = amount;

        platformFee = 0;

        netPayout = amount;

        profit = 0;

    }

    return {

        result,

        grossPayout,

        platformFee,

        netPayout,

        profit

    };

}


// ======================================================
// SETTLE ONE EXPIRED TRADE
// ======================================================

async function settleOneTrade(
    trade,
    market
) {

    const session =
        await mongoose.startSession();

    let settled = false;

    try {

        await session.withTransaction(async () => {

            const completedAt = new Date();

            // --------------------------------------------------
            // ATOMIC TRADE COMPLETION
            // --------------------------------------------------

            const updatedTrade =
                await Trade.findOneAndUpdate(

                    {
                        _id: trade._id,

                        status: "ACTIVE",

                        endTime: {
                            $lte: completedAt
                        }

                    },

                    {

                        $set: {

                            exitPrice: market.price,

                            exitPriceTimestamp:
                                market.timestamp,

                            status: "COMPLETED",

                            completedAt,

                            settlementReference:
                                `REAL-${trade._id}`,

                            settlementError: ""

                        },

                        $inc: {

                            settlementAttempts: 1

                        }

                    },

                    {

                        new: true,

                        session,

                        runValidators: true

                    }

                );

            // Another process may already have settled it.

            if (!updatedTrade) {

                return;

            }

            // --------------------------------------------------
            // CALCULATE RESULT
            // --------------------------------------------------

            const calculation =
                calculateTradeResult(

                    updatedTrade.direction,

                    updatedTrade.entryPrice,

                    market.price,

                    updatedTrade.amount

                );

            // --------------------------------------------------
            // SAVE FINAL TRADE RESULT
            // --------------------------------------------------

            updatedTrade.result =
                calculation.result;

            updatedTrade.profit =
                calculation.profit;

            await updatedTrade.save({
                session
            });

            // --------------------------------------------------
            // PROCESS USER WALLET
            // --------------------------------------------------

            if (
                calculation.result === "WIN" ||
                calculation.result === "DRAW"
            ) {

                const creditAmount =
                    calculation.netPayout;

                const creditedUser =
                    await User.findByIdAndUpdate(

                        updatedTrade.user,

                        {

                            $inc: {
                                balance: creditAmount
                            }

                        },

                        {

                            new: true,

                            session,

                            runValidators: true

                        }

                    );

                if (!creditedUser) {

                    throw new Error(
                        "User wallet not found during settlement."
                    );

                }

                const balanceAfterCredit =
                    roundMoney(creditedUser.balance);

                const balanceBeforeCredit =
                    roundMoney(
                        balanceAfterCredit - creditAmount
                    );

                // --------------------------------------------------
                // RECORD WINNING PAYOUT OR DRAW REFUND
                // --------------------------------------------------

                await createLedgerEntry(

                    {

                        userId: updatedTrade.user,

                        tradeId: updatedTrade._id,

                        type:
                            calculation.result === "WIN"
                                ? "TRADE_PAYOUT"
                                : "TRADE_REFUND",

                        amount: creditAmount,

                        balanceBefore:
                            balanceBeforeCredit,

                        balanceAfter:
                            balanceAfterCredit,

                        idempotencyKey:
                            `trade:${updatedTrade._id}:payout`,

                        description:
                            calculation.result === "WIN"
                                ? "Winning trade payout."
                                : "Draw trade stake refund.",

                        metadata: {

                            result: calculation.result,

                            tradeAmount:
                                updatedTrade.amount,

                            grossPayout:
                                calculation.grossPayout,

                            platformFee:
                                calculation.platformFee,

                            netPayout:
                                calculation.netPayout

                        }

                    },

                    session

                );

                // --------------------------------------------------
                // DEDUCT PLATFORM FEE
                // --------------------------------------------------

                if (
                    calculation.result === "WIN" &&
                    calculation.platformFee > 0
                ) {

                    const feeAmount =
                        calculation.platformFee;

                    const userAfterFee =
                        await User.findOneAndUpdate(

                            {

                                _id: updatedTrade.user,

                                balance: {
                                    $gte: feeAmount
                                }

                            },

                            {

                                $inc: {
                                    balance: -feeAmount
                                }

                            },

                            {

                                new: true,

                                session

                            }

                        );

                    if (!userAfterFee) {

                        throw new Error(
                            "Unable to deduct platform fee."
                        );

                    }

                    const balanceAfterFee =
                        roundMoney(userAfterFee.balance);

                    const balanceBeforeFee =
                        roundMoney(
                            balanceAfterFee + feeAmount
                        );

                    await createLedgerEntry(

                        {

                            userId: updatedTrade.user,

                            tradeId: updatedTrade._id,

                            type: "TRADE_PLATFORM_FEE",

                            amount: -feeAmount,

                            balanceBefore:
                                balanceBeforeFee,

                            balanceAfter:
                                balanceAfterFee,

                            idempotencyKey:
                                `trade:${updatedTrade._id}:fee`,

                            description:
                                "3% platform fee on winning trade payout.",

                            metadata: {

                                grossPayout:
                                    calculation.grossPayout,

                                feePercentage:
                                    PLATFORM_FEE_PERCENT,

                                platformFee:
                                    feeAmount,

                                netPayout:
                                    calculation.netPayout

                            }

                        },

                        session

                    );

                }

            }

            // LOSS:
            // The original stake was already deducted.
            // No additional wallet credit is made.

            settled = true;

        });

        return settled;

    }

    finally {

        await session.endSession();

    }

}


// ======================================================
// SETTLE EXPIRED TRADES
// ======================================================

async function settleExpiredTrades() {

    const now = new Date();

    const expiredTrades =
        await Trade.find({

            status: "ACTIVE",

            tradingMode: "REAL",

            endTime: {
                $lte: now
            }

        })
        .sort({
            endTime: 1
        })
        .limit(100)
        .lean();

    if (!expiredTrades.length) {

        return {

            processed: 0,

            failed: 0

        };

    }

    let processed = 0;

    let failed = 0;

    // --------------------------------------------------
    // GET VERIFIED MARKET PRICE
    // --------------------------------------------------

    let market;

    try {

        market = await getBTCPrice();

    }

    catch (error) {

        console.error(
            "TRADE MARKET ERROR:",
            error.message
        );

        await Trade.updateMany(

            {

                _id: {
                    $in: expiredTrades.map(
                        trade => trade._id
                    )
                },

                status: "ACTIVE"

            },

            {

                $inc: {
                    settlementAttempts: 1
                },

                $set: {

                    settlementError:
                        "Market price temporarily unavailable."

                }

            }

        );

        return {

            processed: 0,

            failed: expiredTrades.length

        };

    }

    // --------------------------------------------------
    // PROCESS EACH TRADE
    // --------------------------------------------------

    for (const trade of expiredTrades) {

        try {

            const wasSettled =
                await settleOneTrade(
                    trade,
                    market
                );

            if (wasSettled) {

                processed++;

            }

        }

        catch (error) {

            failed++;

            console.error(

                "REAL TRADE SETTLEMENT ERROR:",

                trade._id,

                error.message

            );

            await Trade.updateOne(

                {

                    _id: trade._id,

                    status: "ACTIVE"

                },

                {

                    $inc: {
                        settlementAttempts: 1
                    },

                    $set: {

                        settlementError:
                            String(error.message).substring(0, 1000)

                    }

                }

            ).catch(() => {});

        }

    }

    return {

        processed,

        failed

    };

}


// ======================================================
// START REAL WALLET TRADE
// ======================================================

exports.startTrade = async (req, res) => {

    let session;

    try {

        const userId = req.user._id;

        const {

            direction,

            amount,

            duration

        } = req.body;


        // --------------------------------------------------
        // VALIDATE DIRECTION
        // --------------------------------------------------

        if (
            !["BUY", "SELL"].includes(direction)
        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid trade direction."

            });

        }


        // --------------------------------------------------
        // VALIDATE AMOUNT
        // --------------------------------------------------

        const tradeAmount = Number(amount);

        if (

            !Number.isFinite(tradeAmount) ||

            tradeAmount < MIN_TRADE_AMOUNT ||

            tradeAmount > MAX_TRADE_AMOUNT ||

            !Number.isSafeInteger(
                Math.round(tradeAmount * 100)
            )

        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid trade amount."

            });

        }


        // --------------------------------------------------
        // VALIDATE DURATION
        // --------------------------------------------------

        const tradeDuration = Number(duration);

        if (
            !ALLOWED_DURATIONS.includes(
                tradeDuration
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid duration. Allowed: 30, 60, 180 or 300 seconds."

            });

        }


        // --------------------------------------------------
        // SETTLE PREVIOUS EXPIRED TRADES
        // --------------------------------------------------

        await settleExpiredTrades();


        // --------------------------------------------------
        // CHECK EXISTING ACTIVE TRADE
        // --------------------------------------------------

        const existingTrade =
            await Trade.findOne({

                user: userId,

                status: "ACTIVE"

            }).lean();

        if (existingTrade) {

            return res.status(409).json({

                success: false,

                message:
                    "You already have an active trade.",

                trade: existingTrade

            });

        }


        // --------------------------------------------------
        // GET SERVER-SIDE BTC PRICE
        // --------------------------------------------------

        let market;

        try {

            market = await getBTCPrice();

        }

        catch (error) {

            console.error(
                "BTC PRICE ERROR:",
                error.message
            );

            return res.status(503).json({

                success: false,

                message:
                    "Live BTC market price is temporarily unavailable."

            });

        }


        // --------------------------------------------------
        // TRADE TIMING
        // --------------------------------------------------

        const startTime = new Date();

        const endTime = new Date(

            startTime.getTime() +
            tradeDuration * 1000

        );


        // --------------------------------------------------
        // ATOMIC WALLET DEDUCTION + TRADE CREATION
        // --------------------------------------------------

        session = await mongoose.startSession();

        let createdTrade;

        let walletBalance;

        await session.withTransaction(async () => {

            // --------------------------------------------------
            // DEDUCT STAKE ONLY IF BALANCE IS SUFFICIENT
            // --------------------------------------------------

            const updatedUser =
                await User.findOneAndUpdate(

                    {

                        _id: userId,

                        balance: {
                            $gte: tradeAmount
                        }

                    },

                    {

                        $inc: {
                            balance: -tradeAmount
                        }

                    },

                    {

                        new: true,

                        session

                    }

                );

            if (!updatedUser) {

                const userExists =
                    await User.exists({
                        _id: userId
                    }).session(session);

                if (!userExists) {

                    throw new Error(
                        "USER_NOT_FOUND"
                    );

                }

                throw new Error(
                    "INSUFFICIENT_BALANCE"
                );

            }

            walletBalance =
                roundMoney(updatedUser.balance);

            const balanceBefore =
                roundMoney(
                    walletBalance + tradeAmount
                );


            // --------------------------------------------------
            // CREATE REAL TRADE
            // --------------------------------------------------

            const trade = new Trade({

                user: userId,

                asset: MARKET_ASSET,

                marketSymbol: MARKET_SYMBOL,

                priceSource: market.source,

                direction,

                amount: tradeAmount,

                entryPrice: market.price,

                entryPriceTimestamp:
                    market.timestamp,

                exitPrice: null,

                exitPriceTimestamp: null,

                duration: tradeDuration,

                status: "ACTIVE",

                result: null,

                profit: 0,

                startTime,

                endTime,

                tradingMode: "REAL"

            });

            await trade.save({
                session
            });

            createdTrade = trade;


            // --------------------------------------------------
            // SAVE STAKE DEDUCTION TRANSACTION
            // --------------------------------------------------

            await createLedgerEntry(

                {

                    userId,

                    tradeId: trade._id,

                    type: "TRADE_STAKE",

                    amount: -tradeAmount,

                    balanceBefore,

                    balanceAfter: walletBalance,

                    idempotencyKey:
                        `trade:${trade._id}:stake`,

                    description:
                        `${direction} BTC trade stake deducted.`,

                    metadata: {

                        direction,

                        amount: tradeAmount,

                        duration: tradeDuration,

                        entryPrice: market.price,

                        tradingMode: "REAL"

                    }

                },

                session

            );

        });


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Real wallet trade started successfully.",

            walletBalance,

            trade: {

                id: createdTrade._id,

                asset: createdTrade.asset,

                marketSymbol:
                    createdTrade.marketSymbol,

                direction:
                    createdTrade.direction,

                amount:
                    createdTrade.amount,

                entryPrice:
                    createdTrade.entryPrice,

                entryPriceTimestamp:
                    createdTrade.entryPriceTimestamp,

                duration:
                    createdTrade.duration,

                status:
                    createdTrade.status,

                startTime:
                    createdTrade.startTime,

                endTime:
                    createdTrade.endTime,

                tradingMode:
                    createdTrade.tradingMode

            }

        });

    }

    catch (error) {

        console.error(
            "START REAL TRADE ERROR:",
            error
        );

        if (
            error.message === "INSUFFICIENT_BALANCE"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Insufficient wallet balance to start this trade."

            });

        }

        if (
            error.message === "USER_NOT_FOUND"
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }

        if (
            error.code === 11000
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "You already have an active trade."

            });

        }

        return res.status(500).json({

            success: false,

            message:
                "Unable to start trade. Your wallet was not charged unless the trade was successfully created."

        });

    }

    finally {

        if (session) {

            await session.endSession();

        }

    }

};


// ======================================================
// GET ACTIVE TRADE
// ======================================================

exports.getActiveTrade = async (req, res) => {

    try {

        await settleExpiredTrades();

        const trade =
            await Trade.findOne({

                user: req.user._id,

                status: "ACTIVE",

                tradingMode: "REAL"

            })
            .sort({
                createdAt: -1
            })
            .lean();

        if (!trade) {

            return res.status(200).json({

                success: true,

                trade: null

            });

        }

        const remainingTime = Math.max(

            0,

            Math.ceil(

                (
                    new Date(trade.endTime).getTime() -
                    Date.now()
                ) / 1000

            )

        );

        return res.status(200).json({

            success: true,

            trade: {

                ...trade,

                remainingTime

            }

        });

    }

    catch (error) {

        console.error(

            "GET ACTIVE TRADE ERROR:",

            error

        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load active trade."

        });

    }

};


// ======================================================
// GET TRADE HISTORY
// ======================================================

exports.getTradeHistory = async (req, res) => {

    try {

        await settleExpiredTrades();

        const trades =
            await Trade.find({

                user: req.user._id,

                tradingMode: "REAL"

            })
            .sort({

                createdAt: -1

            })
            .limit(HISTORY_LIMIT)
            .lean();

        return res.status(200).json({

            success: true,

            count: trades.length,

            trades

        });

    }

    catch (error) {

        console.error(

            "GET TRADE HISTORY ERROR:",

            error

        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load trade history."

        });

    }

};


// ======================================================
// EXPORT MARKET PRICE FUNCTION
// ======================================================

exports.getBTCPrice = getBTCPrice;


// ======================================================
// EXPORT SETTLEMENT FUNCTION
// ======================================================

exports.settleExpiredTrades =
    settleExpiredTrades;


// ======================================================
// EXPORT CALCULATION FUNCTION
// ======================================================

exports.calculateTradeResult =
    calculateTradeResult;