const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },


    category: {
    type: String,
    enum: ["starter", "pro", "elite"],
    required: true,
    default: "starter",
    index: true
},
    image: {
        type: String,
        default: ""
    },

    price: {
        type: Number,
        required: true
    },

    dailyIncome: {
        type: Number,
        required: true
    },

    days: {
        type: Number,
        required: true
    },

    totalIncome: {
        type: Number,
        required: true
    },

    status: {
        type: Boolean,
        default: true
    },

    sortOrder: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports =
    mongoose.model("Plan", planSchema);