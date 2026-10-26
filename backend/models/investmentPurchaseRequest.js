// ======================================================
// TESLA WEALTH — INVESTMENT PURCHASE REQUEST MODEL
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// PURCHASE REQUEST SCHEMA
// ======================================================

const investmentPurchaseRequestSchema = new mongoose.Schema(
    {
        // ==============================================
        // USER WHO REQUESTED THE PURCHASE
        // ==============================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // ==============================================
        // REQUESTED INVESTMENT PLAN
        // ==============================================

        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
            index: true
        },

        // ==============================================
        // PLAN SNAPSHOT
        // Preserve the requested details for review.
        // The plan's current price will be rechecked
        // when the request is approved.
        // ==============================================

        planName: {
            type: String,
            required: true,
            trim: true
        },

        requestedAmount: {
            type: Number,
            required: true,
            min: 0
        },

        // ==============================================
        // REQUEST STATUS
        // ==============================================

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Rejected",
                "Cancelled"
            ],
            default: "Pending",
            required: true,
            index: true
        },

        // ==============================================
        // APPROVAL MODE AT REQUEST TIME
        // ==============================================

        approvalMode: {
            type: String,
            enum: ["automatic", "manual"],
            default: "manual",
            required: true
        },

        // ==============================================
        // ADMIN REVIEW
        // ==============================================

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        reviewedAt: {
            type: Date,
            default: null
        },

        adminNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        // ==============================================
        // RESULTING RECORDS
        // ==============================================

        investment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Investment",
            default: null
        },

        transaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            default: null
        },

        // ==============================================
        // REQUEST PROCESSING
        // ==============================================

        processedAt: {
            type: Date,
            default: null
        },

        failureReason: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        }
    },
    {
        timestamps: true
    }
);

// ======================================================
// QUERY INDEXES
// ======================================================

// Retrieve a user's requests, newest first.
investmentPurchaseRequestSchema.index({
    user: 1,
    createdAt: -1
});

// Retrieve requests awaiting administrator review.
investmentPurchaseRequestSchema.index({
    status: 1,
    createdAt: -1
});

// Retrieve requests for a particular plan and status.
investmentPurchaseRequestSchema.index({
    user: 1,
    plan: 1,
    status: 1
});

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model(
    "InvestmentPurchaseRequest",
    investmentPurchaseRequestSchema
);