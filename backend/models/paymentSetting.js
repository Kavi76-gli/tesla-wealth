const mongoose = require("mongoose");

const paymentSettingSchema = new mongoose.Schema({

    companyName: {
        type: String,
        default: "Investment Company"
    },

    paymentType: {
        type: String,
        enum: ["UPI", "BANK", "BOTH"],
        default: "UPI"
    },

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
    },

    qrImage: {
        type: String,
        default: ""
    },

    minimumDeposit: {
        type: Number,
        default: 100
    },

    maximumDeposit: {
        type: Number,
        default: 100000
    },

    depositInstruction: {
        type: String,
        default: "After payment upload screenshot and UTR number."
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("PaymentSetting", paymentSettingSchema);