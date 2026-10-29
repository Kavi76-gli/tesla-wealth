
// ======================================================
// TESLA WEALTH — INVESTMENT ROUTES
// User Investments + Admin Investment Management
// Automatic Purchases + Per-User Plan Permissions
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
// VALIDATE MIDDLEWARE
// ======================================================

function requireMiddleware(middleware, middlewareName) {
    if (typeof middleware !== "function") {
        throw new Error(
            `[TESLA WEALTH] Invalid middleware: ${middlewareName}`
        );
    }

    return middleware;
}

// ======================================================
// VALIDATE CONTROLLER HANDLERS
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

requireMiddleware(auth, "authMiddleware");
requireMiddleware(admin, "adminMiddleware");

// ======================================================
// USER INVESTMENT CONTROLLER HANDLERS
// ======================================================

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

// ======================================================
// ADMIN INVESTMENT CONTROLLER HANDLERS
// ======================================================

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

const searchInvestmentUsers = requireHandler(
    investmentPurchaseController,
    "searchInvestmentUsers",
    "investmentPurchaseController"
);

const getUserPlanPermissions = requireHandler(
    investmentPurchaseController,
    "getUserPlanPermissions",
    "investmentPurchaseController"
);

const updateUserPlanPermission = requireHandler(
    investmentPurchaseController,
    "updateUserPlanPermission",
    "investmentPurchaseController"
);

// Optional handler: only register the endpoint if the controller
// exports removeUserPlanPermission.
const removeUserPlanPermission =
    typeof investmentPurchaseController.removeUserPlanPermission === "function"
        ? investmentPurchaseController.removeUserPlanPermission
        : null;

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
//
// Purchases are handled automatically by purchasePlan.
// Per-user restrictions and plan limits must be enforced
// inside the controller before completing the purchase.
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
// ADMIN — PROCESS DAILY INVESTMENT INCOME
// POST /api/investment/daily-income
// ======================================================

router.post(
    "/daily-income",
    auth,
    admin,
    distributeDailyIncome
);

// ======================================================
// ADMIN — ALL INVESTMENT PURCHASE HISTORY
// GET /api/investment/admin/purchase-history
// ======================================================

router.get(
    "/admin/purchase-history",
    auth,
    admin,
    getAllPurchaseHistory
);

// Legacy-compatible admin history endpoint.
// GET /api/investment/admin/history
router.get(
    "/admin/history",
    auth,
    admin,
    getAllPurchaseHistory
);

// ======================================================
// ADMIN — SEARCH USERS BY NAME OR PHONE
// GET /api/investment/admin/users/search?q=...
// ======================================================

router.get(
    "/admin/users/search",
    auth,
    admin,
    searchInvestmentUsers
);

// ======================================================
// ADMIN — INDIVIDUAL USER INVESTMENT SETTINGS
// GET /api/investment/admin/users/:userId/settings
// PATCH /api/investment/admin/users/:userId/settings
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
// ADMIN — GET INDIVIDUAL USER PLAN PERMISSIONS
// GET /api/investment/admin/users/:userId/plan-permissions
// ======================================================

router.get(
    "/admin/users/:userId/plan-permissions",
    auth,
    admin,
    getUserPlanPermissions
);

// ======================================================
// ADMIN — UPDATE INDIVIDUAL USER PLAN PERMISSION
// PATCH /api/investment/admin/users/:userId/plans/:planId/permission
// ======================================================

router.patch(
    "/admin/users/:userId/plans/:planId/permission",
    auth,
    admin,
    updateUserPlanPermission
);

// ======================================================
// ADMIN — REMOVE INDIVIDUAL USER PLAN PERMISSION
//
// DELETE /api/investment/admin/users/:userId/plans/:planId/permission
//
// This endpoint is available only if the controller exports
// removeUserPlanPermission.
// ======================================================

if (removeUserPlanPermission) {
    router.delete(
        "/admin/users/:userId/plans/:planId/permission",
        auth,
        admin,
        removeUserPlanPermission
    );
}

// ======================================================
// ADMIN — GLOBAL INVESTMENT SETTINGS
// GET    /api/investment/admin/settings
// PATCH  /api/investment/admin/settings
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
// ADMIN — GLOBAL PLAN SETTINGS
// GET /api/investment/admin/plans/settings
// PATCH /api/investment/admin/plans/:planId/settings
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
// GET /api/investment/admin/restrictions
// PATCH /api/investment/admin/restrictions
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
// ADMIN — INVESTMENT ADMIN ACTIVITY LOG
// GET /api/investment/admin/activity
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

