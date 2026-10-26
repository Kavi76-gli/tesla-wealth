// =====================================================
// USER MODEL
// =====================================================

const mongoose = require("mongoose");


// =====================================================
// USER SCHEMA
// =====================================================

const UserSchema =
    new mongoose.Schema({

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

            required: true

        },


        profileImage: {

            type: String,

            default: ""

        },


        // ==============================================
        // FIREBASE PHONE AUTH
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
        // M-PIN
        // ==============================================

        // NEVER store the actual M-PIN.
        // Only the bcrypt hash is stored.

        mpinHash: {

            type: String,

            default: null

        },


        mpinSet: {

            type: Boolean,

            default: false

        },


        mpinFailedAttempts: {

            type: Number,

            default: 0

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
        // REFERRAL
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

            default: 0

        },


        referralEarnings: {

            type: Number,

            default: 0

        },


        // ==============================================
        // WALLET
        // ==============================================

        balance: {

            type: Number,

            default: 0

        },

// ======================================================
// DEPOSIT FUNDS AVAILABLE FOR INVESTMENT ONLY
// ======================================================

investableDepositBalance: {
    type: Number,
    default: 0,
    min: 0
},
        earnings: {

            type: Number,

            default: 0

        },


        withdrawableEarnings: {
    type: Number,
    default: 0
},
        totalDeposit: {

            type: Number,

            default: 0

        },


        totalWithdraw: {

            type: Number,

            default: 0

        },

        // ==============================================
        // ADMIN-CONTROLLED INVESTMENT SETTINGS
        // ==============================================

        // Controls whether this user may request new investments.
        investmentPurchaseEnabled: {
            type: Boolean,
            default: true
        },

        // Automatic processing or manual admin approval.
        investmentApprovalMode: {
            type: String,
            enum: ["automatic", "manual"],
            default: "automatic"
        },

        // Maximum number of simultaneously running investments.
        // Zero means no active investments are permitted.
        maxActiveInvestments: {
            type: Number,
            default: 10,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: "Maximum active investments must be a whole number."
            }
        },

        // Optional explanation shown when purchases are restricted.
        investmentPurchaseNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },
        // ==============================================
        // INVESTMENT
        // ==============================================

        activeInvestments: {

            type: Number,

            default: 0

        },


        dailyYield: {

            type: Number,

            default: 0

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

    }, {

        timestamps: true

    });


// =====================================================
// EXPORT
// =====================================================

module.exports =
    mongoose.model(
        "User",
        UserSchema
    );