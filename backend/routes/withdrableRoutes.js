const express = require("express");

const router = express.Router();

const withdrawalController =
    require("../controllers/withdrableController");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");


// ======================================================
// USER ROUTES
// ======================================================

// Create withdrawal
router.post(
    "/create",
    auth,
    withdrawalController.createWithdrawal
);


// My withdrawals
router.get(
    "/my",
    auth,
    withdrawalController.getMyWithdrawals
);


// ======================================================
// ADMIN ROUTES
// ======================================================

// All withdrawals
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


// Reject withdrawal
router.patch(
    "/admin/reject/:id",
    auth,
    admin,
    withdrawalController.rejectWithdrawal
);


module.exports = router;