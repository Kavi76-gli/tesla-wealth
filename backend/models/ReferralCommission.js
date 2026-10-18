
const mongoose = require("mongoose");


// =====================================================
// REFERRAL COMMISSION SCHEMA
// =====================================================

const referralCommissionSchema =
    new mongoose.Schema(

        {

            // =============================================
            // REFERRAL RECORD
            // =============================================

            referral: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Referral",

                required: true,

                index: true

            },


            // =============================================
            // REFERRER
            // =============================================

            referrer: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                required: true,

                index: true

            },


            // =============================================
            // REFERRED USER
            // =============================================

            referredUser: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                required: true,

                index: true

            },


            // =============================================
            // DEPOSIT
            // One commission per deposit
            // =============================================

            deposit: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Deposit",

                required: true,

                unique: true,

                index: true

            },


            // =============================================
            // ORIGINAL DEPOSIT AMOUNT
            // =============================================

            depositAmount: {

                type: Number,

                required: true,

                min: 0

            },


            // =============================================
            // COMMISSION RATE
            // =============================================

            commissionRate: {

                type: Number,

                default: 5,

                min: 0,

                max: 100

            },


            // =============================================
            // COMMISSION AMOUNT
            // =============================================

            commissionAmount: {

                type: Number,

                required: true,

                min: 0

            },


            // =============================================
            // STATUS
            // =============================================

            status: {

                type: String,

                enum: [
                    "Credited",
                    "Failed"
                ],

                default: "Credited",

                index: true

            }

        },

        {

            timestamps: true

        }

    );


// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
    mongoose.model(
        "ReferralCommission",
        referralCommissionSchema
    );

