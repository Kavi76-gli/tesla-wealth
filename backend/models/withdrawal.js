const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
    {

        // ==========================================
        // USER
        // ==========================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        // ==========================================
        // GROSS WITHDRAWAL AMOUNT
        // ==========================================

        amount: {
            type: Number,
            required: true,
            min: 1
        },


        // ==========================================
        // PLATFORM FEE
        // ==========================================

        platformFee: {
            type: Number,
            default: 0,
            min: 0
        },

        platformFeePercent: {
            type: Number,
            default: 3,
            min: 0
        },


        // ==========================================
        // NET PAYOUT
        // ==========================================

        netAmount: {
            type: Number,
            default: 0,
            min: 0
        },


        // ==========================================
        // PAYMENT METHOD
        // ==========================================

        paymentMethod: {
            type: String,
            enum: ["UPI", "Bank"],
            required: true
        },


        // ==========================================
        // PAYMENT DETAILS
        // ==========================================

        paymentDetails: {

            upiId: {
                type: String,
                default: ""
            },

            accountHolder: {
                type: String,
                default: ""
            },

            bankName: {
                type: String,
                default: ""
            },

            accountNumber: {
                type: String,
                default: ""
            },

            ifscCode: {
                type: String,
                default: ""
            }

        },


        // ==========================================
        // STATUS
        // ==========================================

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Rejected"
            ],
            default: "Pending",
            index: true
        },


        // ==========================================
        // ADMIN REMARK
        // ==========================================

        remark: {
            type: String,
            default: ""
        },


        // ==========================================
        // REJECTION REASON
        // ==========================================

        rejectionReason: {
            type: String,
            default: ""
        },


        // ==========================================
        // PROCESSED DATE
        // ==========================================

        processedAt: {
            type: Date,
            default: null
        }

    },
    {
        timestamps: true
    }
);


module.exports = mongoose.model(
    "Withdrawal",
    withdrawalSchema
);