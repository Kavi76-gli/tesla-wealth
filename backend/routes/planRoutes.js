const express = require("express");

const router = express.Router();


// ==========================================
// CONTROLLERS
// ==========================================

const planController =
    require("../controllers/planController");


// ==========================================
// MIDDLEWARE
// ==========================================

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");


// ==========================================
// GET ALL PLANS
// ==========================================

router.get(
    "/",
    planController.getPlans
);


// ==========================================
// ADMIN - CREATE PLAN
// ==========================================

router.post(
    "/",
    auth,
    admin,
    upload.single("image"),
    planController.createPlan
);


// ==========================================
// ADMIN - UPDATE PLAN
// ==========================================

router.put(
    "/:id",
    auth,
    admin,
    upload.single("image"),
    planController.updatePlan
);


// ==========================================
// ADMIN - DELETE PLAN
// ==========================================

router.delete(
    "/:id",
    auth,
    admin,
    planController.deletePlan
);


module.exports = router;