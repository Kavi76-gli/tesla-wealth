
const mongoose = require("mongoose");


// =====================================================
// REFERRAL SCHEMA
// =====================================================

const referralSchema = new mongoose.Schema(
    {

        // =================================================
        // PERSON WHO INVITED
        // =================================================

        referrer: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "User",

            required: true,

            index: true

        },


        // =================================================
        // PERSON WHO JOINED
        // =================================================

        referredUser: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "User",

            required: true,

            index: true,

            unique: true

        },


        // =================================================
        // REFERRAL CODE USED
        // =================================================

        referralCode: {

            type: String,

            required: true,

            trim: true

        },


        // =================================================
        // WELCOME BONUS
        // New user receives ₹12
        // =================================================

        welcomeBonus: {

            type: Number,

            default: 12,

            min: 0

        },


        // =================================================
        // TOTAL COMMISSION
        // Total 5% earned by referrer
        // =================================================

        totalCommission: {

            type: Number,

            default: 0,

            min: 0

        },


        // =================================================
        // QUALIFYING DEPOSITS
        // Number of approved deposits
        // from this referred user
        // =================================================

        qualifyingDeposits: {

            type: Number,

            default: 0,

            min: 0

        },


        // =================================================
        // STATUS
        // =================================================

        status: {

            type: String,

            enum: [
                "Pending",
                "Completed",
                "Cancelled"
            ],

            default: "Pending",

            index: true

        },


        // =================================================
        // COMPLETED DATE
        // =================================================

        completedAt: {

            type: Date,

            default: null

        }

    },

    {

        timestamps: true

    }

);


// =====================================================
// REFERRER + REFERRED USER INDEX
// =====================================================

referralSchema.index({

    referrer: 1,

    referredUser: 1

});


// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
    mongoose.model(
        "Referral",
        referralSchema
    );

