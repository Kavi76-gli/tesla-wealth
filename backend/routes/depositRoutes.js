const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");


const depositController = require("../controllers/depositController");

// If you already have multer configured
// const upload = require("../middleware/upload");

// ==========================================
// USER ROUTES
// ==========================================

// Create Deposit
// Create Deposit
router.post(
    "/create",
    auth,
    upload.single("screenshot"),
    depositController.createDeposit
);

// My Deposits
router.get(
    "/my",
    auth,
    depositController.getMyDeposits
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// All Deposits
router.get(
    "/admin/all",
    auth,
    admin,
    depositController.getAllDeposits
);

// Approve Deposit
router.patch(
    "/admin/approve/:id",
    auth,
    admin,
    depositController.approveDeposit
);

// Reject Deposit
router.patch(
    "/admin/reject/:id",
    auth,
    admin,
    depositController.rejectDeposit
);

router.get(
    "/payment-settings",
    depositController.getPaymentSettings
);


router.put(
    "/payment-settings",
    auth,
    admin,
    upload.single("qrImage"),
    depositController.updatePaymentSettings
);

module.exports = router;