
// =====================================================
// TESLA WEALTH - MAIN SERVER
// =====================================================


// =====================================================
// LOAD ENVIRONMENT FIRST
// =====================================================

require("dotenv").config();


// =====================================================
// IMPORTS
// =====================================================

const express = require("express");

const cors = require("cors");

const path = require("path");

const cron = require("node-cron");

const connectDB = require("./config/db");

const {
    processDailyIncome
} = require("./services/investmentService");

const {
    settleExpiredTrades
} = require("./controllers/tradeController");


// =====================================================
// EXPRESS APP
// =====================================================

const app = express();


// =====================================================
// PORT
// =====================================================

const PORT = process.env.PORT || 5000;


// =====================================================
// CORS CONFIGURATION
// =====================================================

const allowedOrigins = [

    "http://localhost:5500",

    "http://127.0.0.1:5500",

    "http://localhost:5501",

    "http://127.0.0.1:5501",

    "https://shakshiselkande.online",

    "https://www.shakshiselkande.online",

    "https://tesla-wealth.onrender.com"

];


app.use(
    cors({

        origin: function (origin, callback) {

            // Allow requests without an Origin header,
            // such as server-to-server requests.

            if (!origin) {
                return callback(null, true);
            }


            if (allowedOrigins.includes(origin)) {

                return callback(null, true);

            }


            console.log("CORS BLOCKED:", origin);

            return callback(
                new Error("Not allowed by CORS")
            );

        },

        credentials: true

    })
);


// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}));


// =====================================================
// STATIC FRONTEND
// =====================================================

const frontendPath = path.join(
    __dirname,
    "../frontend"
);

app.use(
    express.static(frontendPath)
);


// =====================================================
// UPLOADS
// =====================================================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


// =====================================================
// API ROUTES
// =====================================================

app.use(
    "/api/auth",
    require("./routes/authRoutes")
);


app.use(
    "/api/invest",
    require("./routes/investRoutes")
);


app.use(
    "/api/plans",
    require("./routes/planRoutes")
);



app.use(
    "/api/investment",
    require("./routes/investmentRoutes")
);


app.use(
    "/api/deposit",
    require("./routes/depositRoutes")
);


app.use(
    "/api/transactions",
    require("./routes/transactionRoutes")
);


app.use(
    "/api/withdrawals",
    require("./routes/withdrableRoutes")
);


app.use(
    "/api/referral",
    require("./routes/referralRoutes")
);


app.use(
    "/api/referral-rewards",
    require("./routes/referralRewardRoutes")
);
// =====================================================
// TESLA WEALTH TRADING ROUTES
// =====================================================

app.use(
    "/api/trade",
    require("./routes/tradeRoutes")
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {

    res.status(200).json({

        success: true,

        message: "Tesla Wealth server is running",

        timestamp: new Date().toISOString()

    });

});


// =====================================================
// API INFORMATION
// =====================================================

app.get("/api", (req, res) => {

    res.json({

        success: true,

        message: "Tesla Wealth API is running",

       tradingMode: "REAL",

        endpoints: {

            auth: "/api/auth",

            investment: "/api/investment",

            deposits: "/api/deposit",

            withdrawals: "/api/withdrawals",

            referrals: "/api/referral",

           trades: "/api/trade"
        }

    });

});


// =====================================================
// ROOT PAGE
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(frontendPath, "splash.html")
    );

});


// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "API route not found",

        route: req.originalUrl

    });

});


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {

    console.error(
        "GLOBAL SERVER ERROR:",
        err
    );


    if (res.headersSent) {
        return next(err);
    }


    res.status(err.status || 500).json({

        success: false,

        message:
            err.message ||
            "Internal server error"

    });

});


// =====================================================
// CRON JOB CONTROL
// =====================================================

let investmentJob = null;

let tradeSettlementJob = null;

let isProcessingInvestment = false;

let isSettlingTrades = false;


// =====================================================
// DAILY INVESTMENT INCOME PROCESS
// =====================================================

function startInvestmentCron() {

    investmentJob = cron.schedule(

        "*/5 * * * *",

        async () => {

            if (isProcessingInvestment) {
                return;
            }

            isProcessingInvestment = true;

            try {

                console.log(
                    "INVESTMENT CRON STARTED"
                );

                await processDailyIncome();

                console.log(
                    "INVESTMENT CRON COMPLETED"
                );

            }

            catch (error) {

                console.error(
                    "INVESTMENT CRON ERROR:",
                    error
                );

            }

            finally {

                isProcessingInvestment = false;

            }

        }

    );

    console.log(
        "INVESTMENT CRON SCHEDULED"
    );

}


// =====================================================
// DEMO TRADE SETTLEMENT PROCESS
// =====================================================

function startTradeSettlementCron() {

    tradeSettlementJob = cron.schedule(

        "*/5 * * * * *",

        async () => {

            if (isSettlingTrades) {
                return;
            }

            isSettlingTrades = true;

            try {

                await settleExpiredTrades();

            }

            catch (error) {

                console.error(
                    "TRADE SETTLEMENT ERROR:",
                    error
                );

            }

            finally {

                isSettlingTrades = false;

            }

        }

    );

    console.log(
        "DEMO TRADE SETTLEMENT CRON SCHEDULED - EVERY 5 SECONDS"
    );

}


// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        console.log(
            "CONNECTING TO MONGODB..."
        );


        // Wait for database connection.

        await connectDB();


        console.log(
            "DATABASE READY"
        );


        // Start existing investment cron.

        startInvestmentCron();


        // Start demo trading settlement cron.

        startTradeSettlementCron();


        // Start Express server.

        app.listen(PORT, () => {

            console.log(
                "===================================="
            );

            console.log(
                "TESLA WEALTH SERVER STARTED"
            );

            console.log(
                `PORT: ${PORT}`
            );

            console.log(
                "DATABASE: CONNECTED"
            );

            console.log(
                "TRADING MODE: DEMO"
            );

            console.log(
                "===================================="

            );

        });

    }

    catch (error) {

        console.error(
            "SERVER STARTUP FAILED:",
            error
        );

        process.exit(1);

    }

}


// =====================================================
// RUN SERVER
// =====================================================

startServer();


// =====================================================
// EXPORT APP
// =====================================================

module.exports = app;

