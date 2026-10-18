// ======================================================
// SERVER.JS
// TIRUPATI / BITCOIN INVESTMENT BACKEND
// ======================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cron = require("node-cron");

// ======================================================
// CONFIG
// ======================================================

const connectDB =
    require("./config/db");

// ======================================================
// SERVICES
// ======================================================

const {
    processDailyIncome
} = require("./services/investmentService");

// ======================================================
// LOAD ENVIRONMENT VARIABLES
// ======================================================

dotenv.config();

// ======================================================
// FRONTEND PATH
// ======================================================

const frontendPath =
    path.join(
        __dirname,
        "../frontend"
    );

// ======================================================
// CONNECT DATABASE
// ======================================================

connectDB();

// ======================================================
// EXPRESS APP
// ======================================================

const app =
    express();

// ======================================================
// CORS
// ======================================================
// ======================================================
// CORS
// ======================================================

const allowedOrigins = [

    "http://localhost:5500",

    "http://127.0.0.1:5500",

    "https://shakshiselkande.online",

    "https://www.shakshiselkande.online",

    "https://tesla-wealth.onrender.com"

];


app.use(
    cors({

        origin: function (
            origin,
            callback
        ) {

            // ------------------------------------------
            // No Origin
            // ------------------------------------------

            if (!origin) {

                return callback(
                    null,
                    true
                );

            }


            // ------------------------------------------
            // Allowed Origin
            // ------------------------------------------

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {

                return callback(
                    null,
                    true
                );

            }


            // ------------------------------------------
            // Blocked Origin
            // ------------------------------------------

            console.log(
                "❌ CORS BLOCKED:",
                origin
            );


            return callback(
                new Error(
                    "Not allowed by CORS"
                )
            );

        },

        credentials: true

    })
);

// ======================================================
// BODY PARSER
// ======================================================

app.use(
    express.json({
        limit: "2mb"
    })
);

app.use(
    express.urlencoded({

        extended: true,

        limit: "2mb"

    })
);

// ======================================================
// FRONTEND STATIC FILES
// ======================================================
//
// This automatically serves:
//
// /auth.html
// /home.html
// /investments.html
// /withdraw.html
// /profile.html
//
// etc.
//
// IMPORTANT:
// Do NOT use app.get("*.html") with
// the current Express/router version.
// ======================================================

app.use(
    express.static(
        frontendPath
    )
);

// ======================================================
// UPLOADS
// ======================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);

// ======================================================
// API ROUTES
// ======================================================

// ======================================================
// AUTH
// ======================================================

app.use(
    "/api/auth",
    require(
        "./routes/authRoutes"
    )
);

// ======================================================
// INVEST
// ======================================================

app.use(
    "/api/invest",
    require(
        "./routes/investRoutes"
    )
);

// ======================================================
// PLANS
// ======================================================

app.use(
    "/api/plans",
    require(
        "./routes/planRoutes"
    )
);

// ======================================================
// INVESTMENT
// ======================================================

app.use(
    "/api/investment",
    require(
        "./routes/investmentRoutes"
    )
);

// ======================================================
// DEPOSIT
// ======================================================

app.use(
    "/api/deposit",
    require(
        "./routes/depositRoutes"
    )
);

// ======================================================
// TRANSACTIONS
// ======================================================

app.use(
    "/api/transactions",
    require(
        "./routes/transactionRoutes"
    )
);

// ======================================================
// WITHDRAWALS
// ======================================================

app.use(
    "/api/withdrawals",
    require(
        "./routes/withdrableRoutes"
    )
);

// ======================================================
// REFERRAL
// ======================================================

app.use(
    "/api/referral",
    require(
        "./routes/referralRoutes"
    )
);


// ======================================================
// DEMO TRADING
// ======================================================

app.use(
"/api/trades",
require(
"./routes/tradeRoutes"
)
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
    "/health",
    (req, res) => {

        res.status(200).json({

            success: true,

            message:
                "Server is healthy.",

            time:
                new Date().toISOString()

        });

    }
);

// ======================================================
// API STATUS
// ======================================================

app.get(
    "/api",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Investment API is running.",

            server:
                "Render",

            time:
                new Date().toISOString()

        });

    }
);

// ======================================================
// FRONTEND ROOT
// ======================================================
//
// Opening:
//
// https://your-domain.com/
//
// will open auth.html
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "splash.html"
            )
        );

    }
);

// ======================================================
// API 404 HANDLER
// ======================================================
//
// IMPORTANT:
// This must come AFTER all API routes.
// ======================================================

app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({

            success: false,

            message:
                "API route not found.",

            path:
                req.originalUrl

        });

    }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "================================"
        );

        console.error(
            "GLOBAL SERVER ERROR"
        );

        console.error(
            error
        );

        console.error(
            "================================"
        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Internal server error."

        });

    }
);

// ======================================================
// DAILY INCOME CRON
// ======================================================
//
// Runs every 5 minutes.
//
// The service itself decides whether an
// investment is actually due.
//
// Therefore this does NOT pay income
// every 5 minutes.
//
// Example:
//
// Purchase:
// 10:30 AM
//
// Due:
// Next day around 10:30 AM
//
// Cron:
// Checks every 5 minutes
// ======================================================

cron.schedule(
    "*/5 * * * *",
    async () => {

        console.log(
            "================================"
        );

        console.log(
            "⏰ INVESTMENT INCOME CHECK"
        );

        console.log(
            new Date().toISOString()
        );

        console.log(
            "================================"
        );

        try {

            const result =
                await processDailyIncome();

            console.log(
                "✅ DAILY INCOME CHECK COMPLETE"
            );

            console.log(
                "Processed:",
                result?.processed ?? 0
            );

            console.log(
                "Skipped:",
                result?.skipped ?? 0
            );

        }

        catch (error) {

            console.error(
                "❌ DAILY INCOME CRON ERROR:",
                error
            );

        }

    }
);

// ======================================================
// SERVER
// ======================================================

const PORT =
    Number(
        process.env.PORT
    ) || 5000;

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================"
        );

        console.log(
            "🚀 SERVER STARTED"
        );

        console.log(
            `PORT: ${PORT}`
        );

        console.log(
            `FRONTEND: ${frontendPath}`
        );

        console.log(
            "DAILY INCOME CRON: Every 5 minutes"
        );

        console.log(
            "================================"
        );

    }
);