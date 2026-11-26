
"use strict";

// =====================================================
// TESLA WEALTH
// USER MODEL
// =====================================================

const mongoose = require("mongoose");

// =====================================================
// INDIVIDUAL INVESTMENT PLAN PERMISSION SCHEMA
// =====================================================

const InvestmentPlanPermissionSchema = new mongoose.Schema(
    {
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: true
        },

        enabled: {
            type: Boolean,
            default: true
        },

        // 0 means unlimited.
        maxLifetimePurchases: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message:
                    "Lifetime purchase limit must be a whole number."
            }
        },

        restrictionNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        }
    },
    {
        _id: true,
        timestamps: false
    }
);

// =====================================================
// USER SCHEMA
// =====================================================

const UserSchema = new mongoose.Schema(
    {
        // ==============================================
        // BASIC INFORMATION
        // ==============================================

        name: {
            type: String,
            default: "New User",
            trim: true
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },

        // Keep the password hash excluded by default.
        password: {
            type: String,
            required: true,
            select: false
        },

        profileImage: {
            type: String,
            default: ""
        },

        // ==============================================
        // FIREBASE PHONE AUTHENTICATION
        // ==============================================

        firebaseUid: {
            type: String,
            unique: true,
            sparse: true,
            default: null,
            index: true
        },

        phoneVerified: {
            type: Boolean,
            default: false
        },

        phoneVerifiedAt: {
            type: Date,
            default: null
        },

        // ==============================================
        // M-PIN SECURITY
        // ==============================================

        mpinHash: {
            type: String,
            default: null,
            select: false
        },

        mpinSet: {
            type: Boolean,
            default: false
        },

        mpinFailedAttempts: {
            type: Number,
            default: 0,
            min: 0
        },

        mpinLockedUntil: {
            type: Date,
            default: null
        },

        mpinUpdatedAt: {
            type: Date,
            default: null
        },

        // ==============================================
        // REFERRAL SYSTEM
        // ==============================================

        referralBy: {
            type: String,
            default: "31060",
            trim: true
        },

        inviteCode: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        referralCount: {
            type: Number,
            default: 0,
            min: 0
        },

        referralEarnings: {
            type: Number,
            default: 0,
            min: 0
        },

        // ==============================================
        // WALLET BALANCES
        // ==============================================

        balance: {
            type: Number,
            default: 0,
            min: 0
        },

        investableDepositBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        earnings: {
            type: Number,
            default: 0,
            min: 0
        },

        withdrawableEarnings: {
            type: Number,
            default: 0,
            min: 0
        },

        totalDeposit: {
            type: Number,
            default: 0,
            min: 0
        },

        totalWithdraw: {
            type: Number,
            default: 0,
            min: 0
        },

        // ==============================================
        // ADMIN-CONTROLLED INVESTMENT SETTINGS
        // ==============================================

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
            validate: {
                validator: Number.isInteger,
                message:
                    "Maximum active investments must be a whole number."
            }
        },

        investmentPurchaseNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },

        // ==============================================
        // INDIVIDUAL PLAN PERMISSIONS
        // ==============================================

        investmentPlanPermissions: {
            type: [InvestmentPlanPermissionSchema],
            default: []
        },

        // ==============================================
        // INVESTMENT STATISTICS
        // ==============================================

        activeInvestments: {
            type: Number,
            default: 0,
            min: 0
        },

        dailyYield: {
            type: Number,
            default: 0,
            min: 0
        },

        // ==============================================
        // ACCOUNT STATUS
        // ==============================================

        isBlocked: {
            type: Boolean,
            default: false
        },

    // ==============================================
    // WITHDRAWAL PERMISSION CONTROL
    // ==============================================

    withdrawalEnabled: {
        type: Boolean,
        default: true
    },

    withdrawalDisabledReason: {
        type: String,
        default: "",
        trim: true
    },

    withdrawalDisabledAlert: {
        type: String,
        default: ""
    },

    withdrawalDisabledAt: {
        type: Date,
        default: null
    },


        isAdmin: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// =====================================================
// PASSWORD SELECTION FOR LOGIN
// =====================================================

// The existing authController uses:
//
// User.findOne({ phone: cleanPhone })
//
// This hook explicitly includes the password hash for
// findOne queries, allowing the existing bcrypt.compare()
// call to work without changing authController.js.
//
// IMPORTANT:
// Queries using findOne() can now contain the password
// hash. Never send a raw user document to a client.
// Use a safe response object instead.

UserSchema.pre("findOne", function () {
    this.select("+password");
});

// =====================================================
// INDEXES
// =====================================================

UserSchema.index({
    name: 1
});

UserSchema.index({
    investmentPurchaseEnabled: 1
});

// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
    mongoose.models.User ||
    mongoose.model("User", UserSchema);

