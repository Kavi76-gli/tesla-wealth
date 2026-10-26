
// ======================================================
// TESLA WEALTH — INVESTMENT ADMIN ACTIVITY LOG
// ======================================================

const mongoose = require("mongoose");

const investmentAdminActivitySchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        action: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        target: {
            type: String,
            default: "",
            trim: true,
            maxlength: 200
        },

        targetId: {
            type: String,
            default: "",
            trim: true,
            maxlength: 100
        },

        details: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000
        },

        result: {
            type: String,
            enum: ["Success", "Failed"],
            default: "Success"
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

investmentAdminActivitySchema.index({
    createdAt: -1,
    _id: -1
});

module.exports = mongoose.model(
    "InvestmentAdminActivity",
    investmentAdminActivitySchema
);

