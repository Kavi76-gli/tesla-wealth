const express = require('express');
const router = express.Router();
const investController = require('../controllers/investController');
const authMiddleware = require('../middleware/authMiddleware');
// @route   GET api/invest/details
// @desc    Get user balance, active investments, and transactions
router.get('/details', authMiddleware, investController.getUserDetails);
// @route   POST api/invest/purchase
// @desc    Purchase/rent an agricultural lease plan
router.post('/purchase', authMiddleware, investController.purchasePlan);
// @route   POST api/invest/simulate-ticks
// @desc    Admin shortcut to simulate daily yield payouts
router.post('/simulate-ticks', investController.simulateYieldTicks);
module.exports = router;