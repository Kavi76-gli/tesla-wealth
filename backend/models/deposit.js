const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    utr: {
        type: String,
        required: true
    },

    screenshot: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
investableDepositBalance: {
    type: Number,
    default: 0,
    min: 0
},
    remark: {
        type: String,
        default: ""
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Deposit", depositSchema);