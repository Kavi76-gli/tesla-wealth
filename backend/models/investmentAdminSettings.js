
// ======================================================
// TESLA WEALTH — GLOBAL INVESTMENT ADMIN SETTINGS
// ======================================================

const mongoose = require("mongoose");

const investmentAdminSettingsSchema = new mongoose.Schema(
    {
        // Keep exactly one global settings document.
        key: {
            type: String,
            default: "global",
            unique: true,
            immutable: true,
            required: true
        },

        investmentPurchaseEnabled: {
            type: Boolean,
            default: true
        },

        investmentApprovalMode: {
            type: String,
            enum: ["automatic", "manual"],
            default: "automatic"
        },

        maxActiveInvestments: {
            type: Number,
            default: 10,
            min: 0,
            max: 10000,
            validate: Number.isInteger
        },

        investmentPurchaseNote: {
            type: String,
            default: "",
            maxlength: 500,
            trim: true
        },

        maxActivePerPlan: {
            type: Number,
            default: 0,
            min: 0,
            max: 10000,
            validate: Number.isInteger
        },

        allowRepurchaseAfterCompletion: {
            type: Boolean,
            default: true
        },

        restrictionNote: {
            type: String,
            default: "",
            maxlength: 1000,
            trim: true
        },

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

module.exports = mongoose.model(
    "InvestmentAdminSettings",
    investmentAdminSettingsSchema
);

