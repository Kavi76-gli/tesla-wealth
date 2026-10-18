const mongoose = require("mongoose");

// ==========================================
// INVESTMENT SCHEMA
// ==========================================

const investmentSchema = new mongoose.Schema({

    // ==========================================
    // USER
    // ==========================================

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // ==========================================
    // PLAN
    // ==========================================

    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
        required: true,
        index: true
    },

    // ==========================================
    // PLAN SNAPSHOT
    // ==========================================

    planName: {
        type: String,
        required: true,
        trim: true
    },

    image: {
        type: String,
        default: ""
    },

    // ==========================================
    // AMOUNT
    // ==========================================

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    // ==========================================
    // DAILY INCOME
    // ==========================================

    dailyIncome: {
        type: Number,
        required: true,
        min: 0
    },

    // ==========================================
    // DURATION
    // ==========================================

    duration: {
        type: Number,
        required: true,
        min: 1
    },

    // ==========================================
    // TOTAL INCOME
    // ==========================================

    totalIncome: {
        type: Number,
        required: true,
        min: 0
    },

    // ==========================================
    // EARNED
    // ==========================================

    earned: {
        type: Number,
        default: 0,
        min: 0
    },

    // ==========================================
    // REMAINING DAYS
    // ==========================================

    remainingDays: {
        type: Number,
        required: true,
        min: 0
    },

    // ==========================================
    // PURCHASE DATE
    // ==========================================

    purchaseDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    // ==========================================
    // LAST INCOME
    // ==========================================

    lastIncomeDate: {
        type: Date,
        default: null
    },

    // ==========================================
    // COMPLETED DATE
    // ==========================================

    completedDate: {
        type: Date,
        default: null
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
        type: String,

        enum: [
            "Running",
            "Completed",
            "Cancelled"
        ],

        default: "Running",

        index: true
    }

}, {
    timestamps: true
});

// ==========================================
// INDEX
// ==========================================

investmentSchema.index({
    user: 1,
    status: 1
});

// ==========================================
// EXPORT
// ==========================================

module.exports =
    mongoose.model("Investment", investmentSchema);