const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");

const investmentController = require("../controllers/investmentController");


// User Dashboard
router.get(
    "/dashboard",
    auth,
    investmentController.userDashboard
);

// All Plans
router.get(
    "/plans",
    auth,
    investmentController.getPlans
);

// Purchase Plan
router.post(
    "/purchase",
    auth,
    investmentController.purchasePlan
);

// My Investments
router.get(
    "/my",
    auth,
    investmentController.myInvestments
);

// ==========================================
// DAILY INCOME
// ==========================================

router.post(
    "/daily-income",
    auth,
    admin,
    investmentController.distributeDailyIncome
);



// ======================================================
// ADMIN - PURCHASE HISTORY
// ======================================================

router.get(
    "/admin/purchase-history",
    auth,
    admin,
    investmentController.getAllPurchaseHistory
);

module.exports = router;