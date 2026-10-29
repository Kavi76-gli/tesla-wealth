
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
        // Investment plan controlled by this permission.
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: true
        },

        // Whether this user can purchase this plan.
        enabled: {
            type: Boolean,
            default: true
        },

        // Maximum lifetime purchases of this plan.
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

        // Optional explanation shown when purchasing is restricted.
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

        // Store only the bcrypt hash, never the actual M-PIN.

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
        // WALLET BALANCE
        // ==============================================

        // Main wallet balance maintained by wallet routes.
        balance: {
            type: Number,
            default: 0,
            min: 0
        },

        // Approved deposit funds eligible for investment.
        // This balance is separate from withdrawable earnings.
        investableDepositBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        // Accumulated earnings recorded on the user account.
        earnings: {
            type: Number,
            default: 0,
            min: 0
        },

        // Investment earnings explicitly eligible for withdrawal.
        withdrawableEarnings: {
            type: Number,
            default: 0,
            min: 0
        },

        // Total approved deposits.
        totalDeposit: {
            type: Number,
            default: 0,
            min: 0
        },

        // Total completed withdrawals.
        totalWithdraw: {
            type: Number,
            default: 0,
            min: 0
        },

        // ==============================================
        // ADMIN-CONTROLLED INVESTMENT SETTINGS
        // ==============================================

        // Controls whether the user can purchase investments.
        investmentPurchaseEnabled: {
            type: Boolean,
            default: true
        },

        // Retained for compatibility with existing settings.
        // The purchase controller can continue using automatic
        // purchases without introducing manual approval requests.
        investmentApprovalMode: {
            type: String,
            enum: ["automatic", "manual"],
            default: "automatic"
        },

        // Maximum simultaneously running investments.
        // Zero means no running investments are permitted.
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

        // Optional account-wide purchase restriction message.
        investmentPurchaseNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },

        // ==============================================
        // INDIVIDUAL INVESTMENT PLAN PERMISSIONS
        // ==============================================

        // Admin can control each user's access to each plan.
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
// INDEXES
// =====================================================

// Support admin searches by name and phone.
// Phone already has a unique index; this additional index
// supports queries that filter or sort by name.
UserSchema.index({
    name: 1
});

// Support admin queries for investment permission settings.
UserSchema.index({
    investmentPurchaseEnabled: 1
});

// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
    mongoose.models.User ||
    mongoose.model("User", UserSchema);

