"use strict";

const mongoose = require("mongoose");

// =====================================================
// TESLA WEALTH - TRANSACTION MODEL
// Wallet Ledger + Trading + Investment + Deposit
// =====================================================

const transactionSchema = new mongoose.Schema(
    {
        // =============================================
        // USER
        // =============================================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // =============================================
        // UNIQUE TRANSACTION ID
        // =============================================

        txId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        // =============================================
        // TRANSACTION TYPE
        // =============================================

        type: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        // =============================================
        // TRANSACTION CATEGORY
        // =============================================

        category: {
            type: String,
            enum: [
                "DEPOSIT",
                "WITHDRAWAL",
                "INVESTMENT",
                "TRADING",
                "REFUND",
                "REFERRAL",
                "GST",
                "OTHER"
            ],
            default: "OTHER",
            index: true
        },

        // =============================================
        // TRANSACTION AMOUNT
        // =============================================

        // Negative = debit
        // Positive = credit

        amount: {
            type: Number,
            required: true,

            validate: {
                validator: function (value) {
                    return (
                        Number.isFinite(value) &&
                        Math.abs(value) <= 100000000000
                    );
                },

                message: "Invalid transaction amount."
            }
        },

        // =============================================
        // WALLET BALANCE BEFORE TRANSACTION
        // =============================================

        balanceBefore: {
            type: Number,
            default: null,
            min: 0
        },

        // =============================================
        // WALLET BALANCE AFTER TRANSACTION
        // =============================================

        balanceAfter: {
            type: Number,
            default: null,
            min: 0
        },

        // =============================================
        // TRANSACTION STATUS
        // =============================================

        status: {
            type: String,

            enum: [
                "PENDING",
                "COMPLETED",
                "FAILED",
                "REVERSED"
            ],

            default: "COMPLETED",
            index: true
        },

        // =============================================
        // REFERENCE INFORMATION
        // =============================================

        referenceType: {
            type: String,
            enum: [
                "TRADE",
                "INVESTMENT",
                "DEPOSIT",
                "WITHDRAWAL",
                "REFERRAL",
                "GST",
                "OTHER",
                null
            ],
            default: null
        },

        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        // =============================================
        // IDEMPOTENCY PROTECTION
        // =============================================

        // A unique key prevents duplicate transaction
        // processing when a request is retried.

        idempotencyKey: {
            type: String,
            default: undefined,
            trim: true,
            maxlength: 200
        },

        // =============================================
        // DESCRIPTION
        // =============================================

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000
        },

        // =============================================
        // ADDITIONAL AUDIT INFORMATION
        // =============================================

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },

    {
        timestamps: true,
        versionKey: false
    }
);

// =====================================================
// INDEXES
// =====================================================

// User transaction history

transactionSchema.index({
    userId: 1,
    createdAt: -1
});

// Transaction type filtering

transactionSchema.index({
    userId: 1,
    type: 1,
    createdAt: -1
});

// Category filtering

transactionSchema.index({
    userId: 1,
    category: 1,
    createdAt: -1
});

// Trade and other reference lookup

transactionSchema.index({
    referenceType: 1,
    referenceId: 1
});

// Unique idempotency protection

transactionSchema.index(
    {
        idempotencyKey: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            idempotencyKey: {
                $type: "string"
            }
        }
    }
);

// =====================================================
// VALIDATION
// =====================================================

transactionSchema.pre("validate", function () {

    if (
        this.balanceBefore !== null &&
        this.balanceBefore !== undefined &&
        (
            !Number.isFinite(this.balanceBefore) ||
            this.balanceBefore < 0
        )
    ) {
        this.invalidate(
            "balanceBefore",
            "Invalid previous wallet balance."
        );
    }

    if (
        this.balanceAfter !== null &&
        this.balanceAfter !== undefined &&
        (
            !Number.isFinite(this.balanceAfter) ||
            this.balanceAfter < 0
        )
    ) {
        this.invalidate(
            "balanceAfter",
            "Invalid updated wallet balance."
        );
    }

});

// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
    mongoose.models.Transaction ||
    mongoose.model("Transaction", transactionSchema);