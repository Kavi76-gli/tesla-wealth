"use strict";

const mongoose = require("mongoose");

// ======================================================
// TESLA WEALTH - REAL WALLET TRADING MODEL
// ======================================================

const TradeSchema = new mongoose.Schema(
    {
        // ==============================================
        // USER
        // ==============================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // ==============================================
        // MARKET INFORMATION
        // ==============================================

        asset: {
            type: String,
            default: "BTC/USD",
            trim: true,
            uppercase: true,
            required: true
        },

        marketSymbol: {
            type: String,
            default: "BTCUSDT",
            trim: true,
            uppercase: true
        },

        priceSource: {
            type: String,
            default: "BINANCE",
            enum: ["BINANCE"]
        },

        // ==============================================
        // TRADE DETAILS
        // ==============================================

        direction: {
            type: String,
            enum: ["BUY", "SELL"],
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 1
        },

        // ==============================================
        // ENTRY PRICE
        // ==============================================

        entryPrice: {
            type: Number,
            required: true,
            min: 0.00000001
        },

        entryPriceTimestamp: {
            type: Date,
            required: true
        },

        // ==============================================
        // EXIT PRICE
        // ==============================================

        exitPrice: {
            type: Number,
            default: null,
            min: 0
        },

        exitPriceTimestamp: {
            type: Date,
            default: null
        },

        // ==============================================
        // TRADE DURATION
        // ==============================================

        duration: {
            type: Number,
            required: true,
            enum: [30, 60, 180, 300]
        },

        // ==============================================
        // TRADE STATUS
        // ==============================================

        status: {
            type: String,

            enum: [
                "ACTIVE",
                "COMPLETED",
                "CANCELLED",
                "FAILED"
            ],

            default: "ACTIVE",
            index: true
        },

        // ==============================================
        // TRADE RESULT
        // ==============================================

        result: {
            type: String,

            enum: [
                "WIN",
                "LOSS",
                "DRAW",
                null
            ],

            default: null
        },

        // ==============================================
        // PROFIT / LOSS
        // ==============================================

        // Net profit after platform fee.

        profit: {
            type: Number,
            default: 0
        },

        // ==============================================
        // FIXED PAYOUT CONFIGURATION
        // ==============================================

        payoutMultiplier: {
            type: Number,
            default: 2,
            min: 1
        },

        platformFeePercentage: {
            type: Number,
            default: 3,
            min: 0,
            max: 100
        },

        // ==============================================
        // PAYOUT ACCOUNTING
        // ==============================================

        // Example:
        // Stake: ₹50
        // Gross payout: ₹100
        // Platform fee: ₹3
        // Net payout: ₹97

        grossPayout: {
            type: Number,
            default: 0,
            min: 0
        },

        platformFee: {
            type: Number,
            default: 0,
            min: 0
        },

        netPayout: {
            type: Number,
            default: 0,
            min: 0
        },

        // ==============================================
        // TRADE TIMING
        // ==============================================

        startTime: {
            type: Date,
            default: Date.now,
            required: true
        },

        endTime: {
            type: Date,
            required: true
        },

        completedAt: {
            type: Date,
            default: null
        },

        // ==============================================
        // SETTLEMENT INFORMATION
        // ==============================================

        settlementAttempts: {
            type: Number,
            default: 0,
            min: 0
        },

        settlementError: {
            type: String,
            default: "",
            maxlength: 1000
        },

        settlementReference: {
            type: String,
            default: null
        },

        // ==============================================
        // TRADING MODE
        // ==============================================

        // Existing DEMO records remain supported.
        // New real-wallet trades use REAL.

        tradingMode: {
            type: String,

            enum: [
                "DEMO",
                "REAL"
            ],

            default: "REAL"
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

// User trade history

TradeSchema.index({
    user: 1,
    createdAt: -1
});


// Find active trades

TradeSchema.index({
    user: 1,
    status: 1
});


// Find trades awaiting expiry

TradeSchema.index({
    status: 1,
    endTime: 1
});


// ======================================================
// ONE ACTIVE TRADE PER USER
// ======================================================

// Prevents a user from starting multiple active trades.

TradeSchema.index(
    {
        user: 1
    },
    {
        unique: true,

        partialFilterExpression: {
            status: "ACTIVE"
        },

        name: "one_active_trade_per_user"
    }
);


// ======================================================
// TRADE VALIDATION MIDDLEWARE
// ======================================================

TradeSchema.pre("validate", function () {

    // ----------------------------------------------
    // Validate start and end time
    // ----------------------------------------------

    if (
        this.startTime &&
        this.endTime &&
        new Date(this.endTime).getTime() <=
        new Date(this.startTime).getTime()
    ) {

        this.invalidate(
            "endTime",
            "Trade end time must be after start time."
        );

    }


    // ----------------------------------------------
    // Validate exit price
    // ----------------------------------------------

    if (
        this.exitPrice !== undefined &&
        this.exitPrice !== null &&
        (
            !Number.isFinite(Number(this.exitPrice)) ||
            Number(this.exitPrice) <= 0
        )
    ) {

        this.invalidate(
            "exitPrice",
            "Exit price must be greater than zero."
        );

    }


    // ----------------------------------------------
    // Validate payout accounting
    // ----------------------------------------------

    const payoutFields = [
        "grossPayout",
        "platformFee",
        "netPayout"
    ];

    for (const field of payoutFields) {

        const value = Number(this[field]);

        if (
            !Number.isFinite(value) ||
            value < 0
        ) {

            this.invalidate(
                field,
                `${field} must be a valid non-negative amount.`
            );

        }

    }


    // ----------------------------------------------
    // Validate payout multiplier
    // ----------------------------------------------

    if (
        !Number.isFinite(Number(this.payoutMultiplier)) ||
        this.payoutMultiplier < 1
    ) {

        this.invalidate(
            "payoutMultiplier",
            "Invalid payout multiplier."
        );

    }


    // ----------------------------------------------
    // Validate platform fee
    // ----------------------------------------------

    if (
        !Number.isFinite(Number(this.platformFeePercentage)) ||
        this.platformFeePercentage < 0 ||
        this.platformFeePercentage > 100
    ) {

        this.invalidate(
            "platformFeePercentage",
            "Platform fee must be between 0 and 100."
        );

    }

});


// ======================================================
// EXPORT MODEL
// ======================================================

module.exports =
    mongoose.models.Trade ||
    mongoose.model("Trade", TradeSchema);