"use strict";

const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const controller = require(
    "../controllers/referralRewardController"
);


// =====================================================
// USER ROUTES
// =====================================================

router.get(
    "/my-team",
    auth,
    controller.getMyTeam
);


router.post(
    "/claim",
    auth,
    controller.claimReward
);


router.get(
    "/history",
    auth,
    controller.getMyRewardHistory
);


// =====================================================
// ADMIN ROUTES
// =====================================================

router.get(
    "/admin/milestones",
    auth,
    controller.getAdminMilestones
);


router.post(
    "/admin/milestones",
    auth,
    controller.createMilestone
);


router.patch(
    "/admin/milestones/:id",
    auth,
    controller.updateMilestone
);


router.get(
    "/admin/claims",
    auth,
    controller.getAdminClaims
);


router.patch(
    "/admin/claims/:id/review",
    auth,
    controller.reviewClaim
);


router.post(
    "/admin/claims/:id/issue",
    auth,
    controller.issueReward
);


module.exports = router;