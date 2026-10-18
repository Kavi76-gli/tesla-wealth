const express = require("express");

const router = express.Router();


// ==========================================
// CONTROLLER
// ==========================================

const transactionController =
    require("../controllers/transactionsController");


// ==========================================
// MIDDLEWARE
// ==========================================

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");


// ==========================================
// USER - MY TRANSACTIONS
// ==========================================

router.get(
    "/my",
    auth,
    transactionController.getMyTransactions
);


// ==========================================
// USER - SINGLE TRANSACTION
// ==========================================

router.get(
    "/:id",
    auth,
    transactionController.getTransactionById
);


// ==========================================
// ADMIN - ALL TRANSACTIONS
// ==========================================

router.get(
    "/admin/all",
    auth,
    admin,
    transactionController.getAllTransactions
);


module.exports = router;