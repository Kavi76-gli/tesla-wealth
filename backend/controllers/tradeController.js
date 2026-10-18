const Trade = require("../models/Trade");

// =====================================================
// START TRADE
// =====================================================

exports.startTrade = async (req, res) => {


try {

    const {
        direction,
        amount,
        entryPrice,
        duration,
        asset
    } = req.body;


    // =====================================================
    // VALIDATE TRADE DIRECTION
    // =====================================================

    if (
        direction !== "BUY" &&
        direction !== "SELL"
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid trade direction."

        });

    }


    // =====================================================
    // VALIDATE TRADE AMOUNT
    // =====================================================

    const tradeAmount =
        Number(amount);


    if (
        !Number.isFinite(tradeAmount) ||
        tradeAmount <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid trade amount."

        });

    }


    // =====================================================
    // VALIDATE ENTRY PRICE
    // =====================================================

    const price =
        Number(entryPrice);


    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid entry price."

        });

    }


    // =====================================================
    // VALIDATE DURATION
    // =====================================================

    const tradeDuration =
        Number(duration);


    const allowedDurations = [

        30,
        60,
        180,
        300

    ];


    if (
        !allowedDurations.includes(
            tradeDuration
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid trade duration."

        });

    }


    // =====================================================
    // CHECK ACTIVE TRADE
    // =====================================================

    const existingTrade =
        await Trade.findOne({

            user:
                req.user._id,

            status:
                "ACTIVE"

        });


    if (existingTrade) {

        return res.status(400).json({

            success: false,

            message:
                "You already have an active trade."

        });

    }


    // =====================================================
    // CREATE TRADE TIME
    // =====================================================

    const startTime =
        new Date();


    const endTime =
        new Date(

            startTime.getTime() +
            (tradeDuration * 1000)

        );


    // =====================================================
    // CREATE TRADE
    // =====================================================

    const trade =
        await Trade.create({

            user:
                req.user._id,

            asset:
                asset || "BTC/USD",

            direction:
                direction,

            amount:
                tradeAmount,

            entryPrice:
                price,

            duration:
                tradeDuration,

            status:
                "ACTIVE",

            result:
                null,

            profit:
                0,

            startTime:
                startTime,

            endTime:
                endTime

        });


    // =====================================================
    // SUCCESS RESPONSE
    // =====================================================

    return res.status(201).json({

        success:
            true,

        message:
            "Demo trade started successfully.",

        trade: {

            id:
                trade._id,

            asset:
                trade.asset,

            direction:
                trade.direction,

            amount:
                trade.amount,

            entryPrice:
                trade.entryPrice,

            duration:
                trade.duration,

            status:
                trade.status,

            startTime:
                trade.startTime,

            endTime:
                trade.endTime

        }

    });

}

catch (error) {

    console.error(

        "START TRADE ERROR:",
        error

    );


    return res.status(500).json({

        success:
            false,

        message:
            "Unable to start trade."

    });

}


};

// =====================================================
// GET ACTIVE TRADE
// =====================================================

exports.getActiveTrade = async (req, res) => {


try {

    const trade =
        await Trade.findOne({

            user:
                req.user._id,

            status:
                "ACTIVE"

        })
        .sort({

            createdAt:
                -1

        });


    return res.status(200).json({

        success:
            true,

        trade:
            trade || null

    });

}

catch (error) {

    console.error(

        "GET ACTIVE TRADE ERROR:",
        error

    );


    return res.status(500).json({

        success:
            false,

        message:
            "Unable to load active trade."

    });

}


};

// =====================================================
// GET TRADE HISTORY
// =====================================================

exports.getTradeHistory = async (req, res) => {


try {

    const trades =
        await Trade.find({

            user:
                req.user._id

        })
        .sort({

            createdAt:
                -1

        })
        .limit(50);


    return res.status(200).json({

        success:
            true,

        count:
            trades.length,

        trades:
            trades

    });

}

catch (error) {

    console.error(

        "GET TRADE HISTORY ERROR:",
        error

    );


    return res.status(500).json({

        success:
            false,

        message:
            "Unable to load trade history."

    });

}


};
