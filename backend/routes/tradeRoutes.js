const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const {
startTrade,
getActiveTrade,
getTradeHistory
} = require("../controllers/tradeController");

// =====================================================
// START DEMO TRADE
// =====================================================

router.post(
"/start",
authMiddleware,
startTrade
);

// =====================================================
// GET ACTIVE TRADE
// =====================================================

router.get(
"/active",
authMiddleware,
getActiveTrade
);

// =====================================================
// GET TRADE HISTORY
// =====================================================

router.get(
"/history",
authMiddleware,
getTradeHistory
);

module.exports = router;
