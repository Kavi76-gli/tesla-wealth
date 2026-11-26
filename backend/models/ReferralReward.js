"use strict";

const mongoose = require("mongoose");

const referralRewardSchema = new mongoose.Schema({

    milestone: {
        type: Number,
        required: true,
        min: 1,
        unique: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    badge: {
        type: String,
        default: "🏆"
    },

    description: {
        type: String,
        default: ""
    },

    rewardType: {
        type: String,
        enum: ["badge", "admin_choice"],
        default: "badge"
    },

    enabled: {
        type: Boolean,
        default: true
    },

    sortOrder: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

referralRewardSchema.index({
    enabled: 1,
    milestone: 1
});

module.exports = mongoose.model(
    "ReferralReward",
    referralRewardSchema
);