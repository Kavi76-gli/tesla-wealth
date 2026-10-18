const mongoose = require("mongoose");

const TradeSchema = new mongoose.Schema({


// =====================================================
// USER
// =====================================================

user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
},


// =====================================================
// MARKET
// =====================================================

asset: {
    type: String,
    default: "BTC/USD"
},


// =====================================================
// TRADE DETAILS
// =====================================================

direction: {
    type: String,
    enum: ["BUY", "SELL"],
    required: true
},

amount: {
    type: Number,
    required: true,
    min: 1
},

entryPrice: {
    type: Number,
    required: true
},

exitPrice: {
    type: Number,
    default: null
},


// =====================================================
// DURATION
// =====================================================

duration: {
    type: Number,
    required: true
},


// =====================================================
// STATUS
// =====================================================

status: {
    type: String,
    enum: ["ACTIVE", "COMPLETED"],
    default: "ACTIVE",
    index: true
},


// =====================================================
// RESULT
// =====================================================

result: {
    type: String,
    enum: ["WIN", "LOSS", "DRAW", null],
    default: null
},

profit: {
    type: Number,
    default: 0
},


// =====================================================
// TIME
// =====================================================

startTime: {
    type: Date,
    default: Date.now
},

endTime: {
    type: Date,
    required: true
}


}, {
timestamps: true
});

module.exports =
mongoose.model(
"Trade",
TradeSchema
);
