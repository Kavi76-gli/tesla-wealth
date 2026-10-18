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