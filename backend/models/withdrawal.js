"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;


// ======================================================
// CONSTANTS
// ======================================================

const WITHDRAWAL_STATUSES = [
    "Pending",
    "Approved",
    "Rejected",
    "Processing",
    "Completed"
];

const PAYMENT_METHODS = [
    "UPI",
    "Bank"
];

const REFUND_STATUSES = [
    "Not Required",
    "Pending",
    "Completed",
    "Failed"
];

const PAYOUT_STATUSES = [
    "Not Started",
    "Processing",
    "Paid",
    "Failed"
];

const ADMIN_HISTORY_ACTIONS = [
    "Created",
    "Approved",
    "Rejected",
    "Refunded",
    "Processing",
    "Completed",
    "Payout Initiated",
    "Payout Failed",
    "Other"
];


// ======================================================
// PAYMENT DETAILS
// ======================================================

const paymentDetailsSchema = new Schema({

    upiId: {
        type: String,
        trim: true,
        default: ""
    },

    accountHolder: {
        type: String,
        trim: true,
        default: ""
    },

    bankName: {
        type: String,
        trim: true,
        default: ""
    },

    accountNumber: {
        type: String,
        trim: true,
        default: ""
    },

    ifsc: {
        type: String,
        trim: true,
        uppercase: true,
        default: ""
    }

}, {
    _id: false
});


// ======================================================
// WITHDRAWAL REVIEW
// ======================================================

const reviewSchema = new Schema({

    status: {
        type: String,
        enum: [
            "Not Required",
            "Pending Review",
            "Under Review",
            "Resolved"
        ],
        default: "Not Required"
    },

    walletBalanceSnapshot: {
        type: Number,
        min: 0,
        default: 0
    },

    withdrawableEarningsSnapshot: {
        type: Number,
        min: 0,
        default: 0
    }

}, {
    _id: false
});


// ======================================================
// PAYOUT DETAILS
// ======================================================

const payoutSchema = new Schema({

    status: {
        type: String,
        enum: PAYOUT_STATUSES,
        default: "Not Started"
    },

    transactionReference: {
        type: String,
        trim: true,
        default: ""
    },

    paymentNote: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000
    },

    initiatedAt: {
        type: Date,
        default: null
    },

    completedAt: {
        type: Date,
        default: null
    }

}, {
    _id: false
});


// ======================================================
// REFUND DETAILS
// ======================================================

const refundSchema = new Schema({

    status: {
        type: String,
        enum: REFUND_STATUSES,
        default: "Not Required"
    },

    amount: {
        type: Number,
        min: 0,
        default: 0
    },

    transactionReference: {
        type: String,
        trim: true,
        default: ""
    },

    reason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 2000
    },

    refundedAt: {
        type: Date,
        default: null
    }

}, {
    _id: false
});


// ======================================================
// ADMIN HISTORY
// ======================================================

const adminHistorySchema = new Schema({

    action: {
        type: String,
        enum: ADMIN_HISTORY_ACTIONS,
        required: true
    },

    note: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000
    },

    admin: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

}, {
    _id: true
});


// ======================================================
// MAIN WITHDRAWAL SCHEMA
// ======================================================

const withdrawalSchema = new Schema({

    // ==============================================
    // USER
    // ==============================================

    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },


    // ==============================================
    // WITHDRAWAL AMOUNT
    // ==============================================

    amount: {
        type: Number,
        required: true,
        min: 500
    },

    // 3% platform fee

    platformFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },

    platformFeePercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 3
    },

    // Amount user receives after platform fee

    netAmount: {
        type: Number,
        required: true,
        min: 0
    },

    currency: {
        type: String,
        uppercase: true,
        trim: true,
        default: "INR"
    },


    // ==============================================
    // PAYMENT METHOD
    // ==============================================

    paymentMethod: {
        type: String,
        enum: PAYMENT_METHODS,
        required: true
    },

    paymentDetails: {
        type: paymentDetailsSchema,
        required: true,
        default: () => ({})
    },


    // ==============================================
    // WITHDRAWAL STATUS
    // ==============================================

    status: {
        type: String,
        enum: WITHDRAWAL_STATUSES,
        default: "Pending",
        index: true
    },


    // ==============================================
    // REVIEW INFORMATION
    // ==============================================

    review: {
        type: reviewSchema,
        default: () => ({})
    },


    // ==============================================
    // PAYOUT INFORMATION
    // ==============================================

    payout: {
        type: payoutSchema,
        default: () => ({})
    },


    // ==============================================
    // REFUND INFORMATION
    // ==============================================

    refund: {
        type: refundSchema,
        default: () => ({})
    },


    // ==============================================
    // ADMIN REMARK
    // ==============================================

    remark: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000
    },


    // Internal admin rejection reason.
    // This is not the user's withdrawal restriction alert.

    rejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000
    },


    // ==============================================
    // ADMIN PROCESSING
    // ==============================================

    adminProcessedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    processedAt: {
        type: Date,
        default: null
    },


    // ==============================================
    // ADMIN ACTIVITY HISTORY
    // ==============================================

    adminHistory: {
        type: [adminHistorySchema],
        default: []
    }

}, {

    timestamps: true,

    minimize: false,

    versionKey: "__v"

});


// ======================================================
// INDEXES
// ======================================================

withdrawalSchema.index({
    user: 1,
    createdAt: -1
});

withdrawalSchema.index({
    status: 1,
    createdAt: -1
});

withdrawalSchema.index({
    user: 1,
    status: 1,
    createdAt: -1
});


// ======================================================
// VIRTUAL: USER-FACING STATUS
// ======================================================

withdrawalSchema.virtual("displayStatus").get(function () {

    switch (this.status) {

        case "Completed":
            return "Completed";

        case "Rejected":
            return "Rejected";

        case "Approved":

            return (
                this.payout &&
                this.payout.status === "Paid"
            )
                ? "Completed"
                : "Approved";

        case "Processing":
            return "Processing";

        case "Pending":
        default:
            return "Pending";

    }

});


// ======================================================
// JSON OUTPUT
// ======================================================

withdrawalSchema.set("toJSON", {
    virtuals: true
});

withdrawalSchema.set("toObject", {
    virtuals: true
});


// ======================================================
// MODEL EXPORT
// ======================================================

const Withdrawal =
    mongoose.models.Withdrawal ||
    mongoose.model("Withdrawal", withdrawalSchema);

module.exports = Withdrawal;