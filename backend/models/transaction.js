const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    txId: {
        type: String,
        required: true,
        unique: true
    },

    type: {
        type: String,
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    description: {
        type: String,
        default: ""
    }

}, {
    timestamps: true
});

module.exports =
    mongoose.model(
        "Transaction",
        transactionSchema
    );