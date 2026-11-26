"use strict";

const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// CONTROLLER
// ======================================================

const tradeController = require("../controllers/tradeController");

const {
    startTrade,
    getActiveTrade,
    getTradeHistory,
    getBTCPrice
} = tradeController;


// ======================================================
// AUTHENTICATION
// ======================================================

// Every trading endpoint requires authentication.
// User identity must come from authMiddleware.
// Never accept a user ID from the frontend for wallet operations.

router.use(authMiddleware);


// ======================================================
// RESPONSE HEADERS
// ======================================================

// Prevent browsers and intermediaries from caching
// wallet and trading information.

router.use((req, res, next) => {

    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    next();

});


// ======================================================
// GET LIVE BTC MARKET PRICE
// ======================================================

// GET /api/trade/price
//
// Returns the latest BTC price from the backend.
// The backend is responsible for retrieving market data.

router.get(
    "/price",
    async (req, res) => {

        try {

            const market = await getBTCPrice();

            if (
                !market ||
                !Number.isFinite(Number(market.price)) ||
                Number(market.price) <= 0
            ) {

                return res.status(503).json({

                    success: false,

                    message:
                        "Live BTC market price is temporarily unavailable."

                });

            }

            return res.status(200).json({

                success: true,

                market: {

                    asset: market.asset || "BTC/USD",

                    symbol: market.symbol || "BTCUSDT",

                    price: Number(market.price),

                    source: market.source || "BINANCE",

                    timestamp: market.timestamp || new Date()

                }

            });

        }

        catch (error) {

            console.error(
                "BTC MARKET PRICE ERROR:",
                error.message
            );

            return res.status(503).json({

                success: false,

                message:
                    "Unable to retrieve the live BTC market price. Please try again."

            });

        }

    }
);


// ======================================================
// START REAL WALLET TRADE
// ======================================================

// POST /api/trade/start
//
// Expected request body:
//
// {
//     "direction": "BUY",
//     "amount": 500,
//     "duration": 30
// }
//
// Supported directions:
// BUY / SELL
//
// Supported durations:
// 30 / 60 / 180 / 300 seconds
//
// Important:
// - User must be authenticated.
// - Controller checks actual User.balance.
// - Controller deducts the stake.
// - Controller records the trade and wallet transaction.
// - Backend determines the final result.

router.post(
    "/start",
    startTrade
);


// ======================================================
// GET USER'S ACTIVE TRADE
// ======================================================

// GET /api/trade/active
//
// Returns the authenticated user's active trade.

router.get(
    "/active",
    getActiveTrade
);


// ======================================================
// GET USER'S TRADE HISTORY
// ======================================================

// GET /api/trade/history
//
// Returns the authenticated user's completed and
// other historical trades.

router.get(
    "/history",
    getTradeHistory
);


// ======================================================
// ROUTE NOT FOUND
// ======================================================

router.use(
    (req, res) => {

        return res.status(404).json({

            success: false,

            message: "Trading API endpoint not found.",

            path: req.originalUrl

        });

    }
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;