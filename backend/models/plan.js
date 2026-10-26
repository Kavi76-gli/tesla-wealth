// ======================================================
// TESLA WEALTH — INVESTMENT PLAN MODEL
// ======================================================

const mongoose = require("mongoose");

// ======================================================
// CONSTANTS
// ======================================================

const PLAN_CATEGORIES = [
    "starter",
    "pro",
    "elite"
];

// ======================================================
// PLAN SCHEMA
// ======================================================

const planSchema = new mongoose.Schema(
    {
        // ==============================================
        // BASIC PLAN INFORMATION
        // ==============================================

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 150
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000
        },

        category: {
            type: String,
            enum: PLAN_CATEGORIES,
            required: true,
            default: "starter",
            index: true
        },

        image: {
            type: String,
            default: "",
            trim: true
        },

        // ==============================================
        // INVESTMENT AMOUNT
        // ==============================================

        price: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isFinite,
                message: "Plan price must be a valid number."
            }
        },

        // ==============================================
        // INCOME CONFIGURATION
        // ==============================================

        dailyIncome: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isFinite,
                message: "Daily income must be a valid number."
            }
        },

        days: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Plan duration must be a whole number of days."
            }
        },

        totalIncome: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isFinite,
                message: "Total income must be a valid number."
            }
        },

        // ==============================================
        // PLAN AVAILABILITY
        // Existing field retained for compatibility.
        // ==============================================

        status: {
            type: Boolean,
            default: true,
            index: true
        },

        // ==============================================
        // ADMIN INVESTMENT CONTROLS
        // ==============================================

        // Allows the administrator to stop new purchases
        // without deleting the plan or its history.

        purchaseEnabled: {
            type: Boolean,
            default: true,
            index: true
        },

        // When true, new purchases of this plan must
        // be reviewed by an administrator.

        requireManualApproval: {
            type: Boolean,
            default: false
        },

        // Maximum simultaneous active investments in
        // this particular plan for each user.
        // Zero means no additional plan-specific limit.
        // A global/user limit can still apply.

        maxActivePerUser: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: "The active investment limit must be a whole number."
            }
        },

        // Controls whether a user may purchase the same
        // plan again after their previous investment
        // in that plan has completed.

        allowRepurchaseAfterCompletion: {
            type: Boolean,
            default: true
        },

        // Optional explanation displayed when the plan
        // is restricted or unavailable.

        restrictionNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        // ==============================================
        // DISPLAY ORDER
        // ==============================================

        sortOrder: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isFinite,
                message: "Sort order must be a valid number."
            }
        }
    },
    {
        timestamps: true
    }
);

// ======================================================
// INDEXES
// ======================================================

// Retrieve enabled plans in display order.
planSchema.index({
    status: 1,
    purchaseEnabled: 1,
    sortOrder: 1
});

// Retrieve plans by category and display order.
planSchema.index({
    category: 1,
    sortOrder: 1
});

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = mongoose.model("Plan", planSchema);