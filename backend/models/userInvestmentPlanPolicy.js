
// ======================================================
// TESLA WEALTH — PER-USER INVESTMENT PLAN POLICY
// ======================================================

const mongoose = require("mongoose");

const userInvestmentPlanPolicySchema = new mongoose.Schema(
    {
        // User receiving the individual policy.
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // Plan to which this policy applies.
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
            index: true
        },

        // Whether this user may purchase this plan.
        purchaseEnabled: {
            type: Boolean,
            default: true
        },

        // null = inherit the effective global/plan approval mode.
        approvalMode: {
            type: String,
            enum: ["automatic", "manual", null],
            default: null
        },

        // 0 = no additional user-specific limit.
        // Global and plan limits still apply.
        maxActiveInvestments: {
            type: Number,
            default: 0,
            min: 0,
            max: 10000,
            validate: {
                validator: Number.isInteger,
                message: "The active investment limit must be a whole number."
            }
        },

        // null = inherit the effective global/plan rule.
        allowRepurchaseAfterCompletion: {
            type: Boolean,
            default: null
        },

        // Optional expiry for this user's additional policy.
        expiresAt: {
            type: Date,
            default: null
        },

        // Explanation displayed to the user when applicable.
        restrictionNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        // Administrator who last updated this policy.
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// One policy per user and plan.
userInvestmentPlanPolicySchema.index(
    { user: 1, plan: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "UserInvestmentPlanPolicy",
    userInvestmentPlanPolicySchema
);

