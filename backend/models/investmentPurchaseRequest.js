// ======================================================
// TESLA WEALTH — INVESTMENT PURCHASE REQUEST MODEL
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// CONSTANTS
// ======================================================

const REQUEST_STATUSES = [
    "Pending",
    "Approved",
    "Rejected",
    "Cancelled"
];

const APPROVAL_MODES = [
    "automatic",
    "manual"
];

// ======================================================
// INVESTMENT PURCHASE REQUEST SCHEMA
// ======================================================

const investmentPurchaseRequestSchema = new mongoose.Schema(
    {
        // ==============================================
        // USER WHO REQUESTED THE INVESTMENT
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
        // PLAN DETAILS AT REQUEST TIME
        // These preserve the original request information.
        // ==============================================

        planName: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 150
        },

        requestedAmount: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isFinite,
                message: "Requested amount must be a valid number."
            }
        },

        // ==============================================
        // REQUEST STATUS
        // ==============================================

        status: {
            type: String,
            enum: {
                values: REQUEST_STATUSES,
                message: "Invalid investment request status."
            },
            default: "Pending",
            required: true,
            index: true
        },

        // ==============================================
        // APPROVAL MODE AT REQUEST TIME
        // ==============================================

        approvalMode: {
            type: String,
            enum: {
                values: APPROVAL_MODES,
                message: "Approval mode must be automatic or manual."
            },
            default: "manual",
            required: true
        },

        // ==============================================
        // ADMINISTRATOR REVIEW
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
        // RESULTING INVESTMENT RECORD
        // ==============================================

        investment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Investment",
            default: null
        },

        // ==============================================
        // RESULTING TRANSACTION RECORD
        // ==============================================

        transaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            default: null
        },

        // ==============================================
        // PROCESSING INFORMATION
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
        timestamps: true,
        versionKey: false
    }
);

// ======================================================
// INDEXES
// ======================================================

// User's purchase requests, newest first.
investmentPurchaseRequestSchema.index({
    user: 1,
    createdAt: -1
});

// Admin review queue.
investmentPurchaseRequestSchema.index({
    status: 1,
    createdAt: -1
});

// Requests associated with a particular plan.
investmentPurchaseRequestSchema.index({
    user: 1,
    plan: 1,
    status: 1
});

// Administrator review history.
investmentPurchaseRequestSchema.index({
    reviewedBy: 1,
    reviewedAt: -1
});

// ======================================================
// VALIDATION
// ======================================================

// Prevent an invalid review date from being saved.
investmentPurchaseRequestSchema.pre("validate", function () {
    if (this.reviewedAt && Number.isNaN(this.reviewedAt.getTime())) {
        this.invalidate(
            "reviewedAt",
            "The administrator review date is invalid."
        );
    }

    if (this.processedAt && Number.isNaN(this.processedAt.getTime())) {
        this.invalidate(
            "processedAt",
            "The request processing date is invalid."
        );
    }
});

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model(
    "InvestmentPurchaseRequest",
    investmentPurchaseRequestSchema
);