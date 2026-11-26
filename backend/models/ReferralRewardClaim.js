"use strict";

const mongoose = require("mongoose");

const referralRewardClaimSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    reward: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ReferralReward",
        required: true
    },

    milestone: {
        type: Number,
        required: true
    },

    teamCountAtClaim: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: [
            "Pending",
            "Approved",
            "Rejected",
            "Rewarded"
        ],
        default: "Pending",
        index: true
    },

    adminNote: {
        type: String,
        default: ""
    },

    issuedReward: {
        type: {
            type: String,
            enum: [
                "cash",
                "vip_plan",
                "custom",
                "badge"
            ],
            default: null
        },

        title: {
            type: String,
            default: ""
        },

        description: {
            type: String,
            default: ""
        },

        amount: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    reviewedAt: {
        type: Date,
        default: null
    },

    issuedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

// One claim per user per milestone.
referralRewardClaimSchema.index(
    {
        user: 1,
        reward: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "ReferralRewardClaim",
    referralRewardClaimSchema
);