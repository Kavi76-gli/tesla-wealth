const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const referralController = require("../controllers/referralController");

// User referral information
router.get(
    "/my",
    auth,
    referralController.getMyReferral
);

// Admin referral report
router.get(
    "/admin/report",
    auth,
    referralController.getAdminReferralReport
);

module.exports = router;