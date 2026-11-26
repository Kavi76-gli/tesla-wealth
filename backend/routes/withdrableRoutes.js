"use strict";

const express = require("express");

const router = express.Router();

const withdrawalController =
    require("../controllers/withdrableController");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");


// ======================================================
// USER WITHDRAWAL ROUTES
// ======================================================

// Create withdrawal
router.post(
    "/create",
    auth,
    withdrawalController.createWithdrawal
);


// Get logged-in user's withdrawals
router.get(
    "/my",
    auth,
    withdrawalController.getMyWithdrawals
);


// ======================================================
// ADMIN WITHDRAWAL ROUTES
// ======================================================

// Get all withdrawal requests
router.get(
    "/admin/all",
    auth,
    admin,
    withdrawalController.getAllWithdrawals
);


// Approve withdrawal
router.patch(
    "/admin/approve/:id",
    auth,
    admin,
    withdrawalController.approveWithdrawal
);


// Reject withdrawal with separate reason and alert
router.patch(
    "/admin/reject/:id",
    auth,
    admin,
    withdrawalController.rejectWithdrawal
);


// ======================================================
// ADMIN - USER WITHDRAWAL PERMISSION CONTROL
// ======================================================

// Enable withdrawals for a user
router.patch(
    "/admin/users/:userId/enable",
    auth,
    admin,
    withdrawalController.enableUserWithdrawal
);


// Disable withdrawals for a user
router.patch(
    "/admin/users/:userId/disable",
    auth,
    admin,
    withdrawalController.disableUserWithdrawal
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;