
// ======================================================
// TESLA WEALTH — INVESTMENT ROUTES
// USER INVESTMENTS + ADMIN PURCHASE MANAGEMENT
// ======================================================

const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const investmentController = require(
    "../controllers/investmentController"
);

const investmentPurchaseController = require(
    "../controllers/investmentPurchaseController"
);

// ======================================================
// USER — INVESTMENT DASHBOARD
// GET /api/investment/dashboard
// ======================================================

router.get(
    "/dashboard",
    auth,
    investmentController.userDashboard
);

// ======================================================
// USER — ALL INVESTMENT PLANS
// GET /api/investment/plans
// ======================================================

router.get(
    "/plans",
    auth,
    investmentController.getPlans
);

// ======================================================
// USER — PURCHASE PLAN
// POST /api/investment/purchase
// ======================================================

router.post(
    "/purchase",
    auth,
    investmentController.purchasePlan
);

// ======================================================
// USER — MY INVESTMENTS
// GET /api/investment/my
// ======================================================

router.get(
    "/my",
    auth,
    investmentController.myInvestments
);

// ======================================================
// ADMIN — DISTRIBUTE DAILY INCOME
// POST /api/investment/daily-income
// ======================================================

router.post(
    "/daily-income",
    auth,
    admin,
    investmentController.distributeDailyIncome
);

// ======================================================
// ADMIN — INVESTMENT PURCHASE HISTORY
// GET /api/investment/admin/purchase-history
// ======================================================

router.get(
    "/admin/purchase-history",
    auth,
    admin,
    investmentController.getAllPurchaseHistory
);

// ======================================================
// ADMIN — GET USER INVESTMENT SETTINGS
// GET /api/investment/admin/users/:userId/settings
// ======================================================

router.get(
    "/admin/users/:userId/settings",
    auth,
    admin,
    investmentPurchaseController.getUserInvestmentSettings
);

// ======================================================
// ADMIN — UPDATE USER INVESTMENT SETTINGS
// PATCH /api/investment/admin/users/:userId/settings
// ======================================================

router.patch(
    "/admin/users/:userId/settings",
    auth,
    admin,
    investmentPurchaseController.updateUserInvestmentSettings
);

// ======================================================
// ADMIN — LIST INVESTMENT PURCHASE REQUESTS
// GET /api/investment/admin/purchase-requests
//
// Optional query:
// ?status=Pending&page=1&limit=20
// ======================================================

router.get(
    "/admin/purchase-requests",
    auth,
    admin,
    investmentPurchaseController.getPurchaseRequests
);

// ======================================================
// ADMIN — APPROVE INVESTMENT PURCHASE REQUEST
// POST /api/investment/admin/purchase-requests/:requestId/approve
// ======================================================

router.post(
    "/admin/purchase-requests/:requestId/approve",
    auth,
    admin,
    investmentPurchaseController.approvePurchaseRequest
);

// ======================================================
// ADMIN — REJECT INVESTMENT PURCHASE REQUEST
// POST /api/investment/admin/purchase-requests/:requestId/reject
// ======================================================

router.post(
    "/admin/purchase-requests/:requestId/reject",
    auth,
    admin,
    investmentPurchaseController.rejectPurchaseRequest
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;

