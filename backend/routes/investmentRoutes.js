// ======================================================
// TESLA WEALTH — INVESTMENT ROUTES
// User Investments + Admin Investment Management
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
// VALIDATE ROUTE HANDLERS AT STARTUP
// ======================================================

function requireHandler(controller, functionName, controllerName) {
    const handler = controller[functionName];

    if (typeof handler !== "function") {
        throw new Error(
            `[TESLA WEALTH] Missing controller function: ` +
            `${controllerName}.${functionName}. ` +
            `Check the controller exports before starting the server.`
        );
    }

    return handler;
}

function requireMiddleware(middleware, middlewareName) {
    if (typeof middleware !== "function") {
        throw new Error(
            `[TESLA WEALTH] Invalid middleware: ${middlewareName}`
        );
    }

    return middleware;
}

requireMiddleware(auth, "authMiddleware");
requireMiddleware(admin, "adminMiddleware");

// Investment controller handlers
const userDashboard = requireHandler(
    investmentController,
    "userDashboard",
    "investmentController"
);

const getPlans = requireHandler(
    investmentController,
    "getPlans",
    "investmentController"
);

const purchasePlan = requireHandler(
    investmentController,
    "purchasePlan",
    "investmentController"
);

const myInvestments = requireHandler(
    investmentController,
    "myInvestments",
    "investmentController"
);

const distributeDailyIncome = requireHandler(
    investmentController,
    "distributeDailyIncome",
    "investmentController"
);

const getAllPurchaseHistory = requireHandler(
    investmentController,
    "getAllPurchaseHistory",
    "investmentController"
);

// Purchase request controller handlers
const getUserInvestmentSettings = requireHandler(
    investmentPurchaseController,
    "getUserInvestmentSettings",
    "investmentPurchaseController"
);

const updateUserInvestmentSettings = requireHandler(
    investmentPurchaseController,
    "updateUserInvestmentSettings",
    "investmentPurchaseController"
);

const getPurchaseRequests = requireHandler(
    investmentPurchaseController,
    "getPurchaseRequests",
    "investmentPurchaseController"
);

const approvePurchaseRequest = requireHandler(
    investmentPurchaseController,
    "approvePurchaseRequest",
    "investmentPurchaseController"
);

const rejectPurchaseRequest = requireHandler(
    investmentPurchaseController,
    "rejectPurchaseRequest",
    "investmentPurchaseController"
);

// Additional admin controller handlers
const getGlobalInvestmentSettings = requireHandler(
    investmentPurchaseController,
    "getGlobalInvestmentSettings",
    "investmentPurchaseController"
);

const updateGlobalInvestmentSettings = requireHandler(
    investmentPurchaseController,
    "updateGlobalInvestmentSettings",
    "investmentPurchaseController"
);

const getPlanSettings = requireHandler(
    investmentPurchaseController,
    "getPlanSettings",
    "investmentPurchaseController"
);

const updatePlanSettings = requireHandler(
    investmentPurchaseController,
    "updatePlanSettings",
    "investmentPurchaseController"
);

const getInvestmentRestrictions = requireHandler(
    investmentPurchaseController,
    "getInvestmentRestrictions",
    "investmentPurchaseController"
);

const updateInvestmentRestrictions = requireHandler(
    investmentPurchaseController,
    "updateInvestmentRestrictions",
    "investmentPurchaseController"
);

const getAdminActivity = requireHandler(
    investmentPurchaseController,
    "getAdminActivity",
    "investmentPurchaseController"
);

// ======================================================
// USER — INVESTMENT DASHBOARD
// GET /api/investment/dashboard
// ======================================================

router.get(
    "/dashboard",
    auth,
    userDashboard
);

// ======================================================
// USER — AVAILABLE INVESTMENT PLANS
// GET /api/investment/plans
// ======================================================

router.get(
    "/plans",
    auth,
    getPlans
);

// ======================================================
// USER — PURCHASE INVESTMENT PLAN
// POST /api/investment/purchase
// ======================================================

router.post(
    "/purchase",
    auth,
    purchasePlan
);

// ======================================================
// USER — MY INVESTMENTS
// GET /api/investment/my
// ======================================================

router.get(
    "/my",
    auth,
    myInvestments
);

// ======================================================
// ADMIN — PROCESS DAILY INCOME
// POST /api/investment/daily-income
// ======================================================

router.post(
    "/daily-income",
    auth,
    admin,
    distributeDailyIncome
);

// ======================================================
// ADMIN — PURCHASE HISTORY
// GET /api/investment/admin/purchase-history
// ======================================================

router.get(
    "/admin/purchase-history",
    auth,
    admin,
    getAllPurchaseHistory
);

// ======================================================
// ADMIN — USER INVESTMENT SETTINGS
// ======================================================

router.get(
    "/admin/users/:userId/settings",
    auth,
    admin,
    getUserInvestmentSettings
);

router.patch(
    "/admin/users/:userId/settings",
    auth,
    admin,
    updateUserInvestmentSettings
);

// ======================================================
// ADMIN — PURCHASE REQUESTS
// ======================================================

router.get(
    "/admin/purchase-requests",
    auth,
    admin,
    getPurchaseRequests
);

router.post(
    "/admin/purchase-requests/:requestId/approve",
    auth,
    admin,
    approvePurchaseRequest
);

router.post(
    "/admin/purchase-requests/:requestId/reject",
    auth,
    admin,
    rejectPurchaseRequest
);

// ======================================================
// ADMIN — GLOBAL INVESTMENT SETTINGS
// ======================================================

router.get(
    "/admin/settings",
    auth,
    admin,
    getGlobalInvestmentSettings
);

router.patch(
    "/admin/settings",
    auth,
    admin,
    updateGlobalInvestmentSettings
);

// ======================================================
// ADMIN — INVESTMENT HISTORY
// ======================================================

router.get(
    "/admin/history",
    auth,
    admin,
    getAllPurchaseHistory
);

// ======================================================
// ADMIN — PLAN SETTINGS
// ======================================================

router.get(
    "/admin/plans/settings",
    auth,
    admin,
    getPlanSettings
);

router.patch(
    "/admin/plans/:planId/settings",
    auth,
    admin,
    updatePlanSettings
);

// ======================================================
// ADMIN — INVESTMENT RESTRICTIONS
// ======================================================

router.get(
    "/admin/restrictions",
    auth,
    admin,
    getInvestmentRestrictions
);

router.patch(
    "/admin/restrictions",
    auth,
    admin,
    updateInvestmentRestrictions
);

// ======================================================
// ADMIN — ACTIVITY LOG
// ======================================================

router.get(
    "/admin/activity",
    auth,
    admin,
    getAdminActivity
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;