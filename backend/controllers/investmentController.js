const User = require("../models/user");
const Plan = require("../models/plan");
const Investment = require("../models/investment");
const Transaction = require("../models/transaction");

const {
    processDailyIncome
} = require("../services/investmentService");


console.log(
    "========== INVESTMENT MODEL FIELDS =========="
);

console.log(
    Object.keys(Investment.schema.paths)
);

console.log(
    "=============================================="
);
// ======================================================
// HELPER - GET AUTHENTICATED USER ID
// ======================================================

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?._id ||
        req.user?.userId ||
        req.userId ||
        null
    );

}

// ======================================================
// GET ALL ACTIVE PLANS
// ======================================================

exports.getPlans = async (req, res) => {

    try {

        const plans = await Plan.find({

            status: true

        }).sort({

            sortOrder: 1

        });


        return res.json({

            success: true,

            plans

        });


    } catch (error) {

        console.error(
            "GET INVESTMENT PLANS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};






// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

// ======================================================
// INVESTMENT CONTROLLER
// ======================================================





// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

exports.purchasePlan = async (req, res) => {

    try {

        console.log("================================");
        console.log("PURCHASE INVESTMENT");
        console.log("================================");

        console.log("BODY:", req.body);
        console.log("USER:", req.user);


        // ==================================================
        // USER ID
        // ==================================================

        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        // ==================================================
        // PLAN ID
        // ==================================================

        const {
            planId
        } = req.body || {};


        if (!planId) {

            return res.status(400).json({

                success: false,

                message:
                    "Investment plan is required."

            });

        }


        // ==================================================
        // FIND USER
        // ==================================================

        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        // ==================================================
        // CHECK BLOCKED USER
        // ==================================================

        if (
            user.isBlocked === true
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        // ==================================================
        // FIND PLAN
        // ==================================================

        const plan =
            await Plan.findById(planId);


        if (!plan) {

            return res.status(404).json({

                success: false,

                message:
                    "Investment plan not found."

            });

        }


        // ==================================================
        // PLAN STATUS
        // ==================================================

        if (
            plan.status !== true
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This investment plan is currently unavailable."

            });

        }


        // ==================================================
        // PLAN VALUES
        // ==================================================

        const amount =
            Number(plan.price);


        const dailyIncome =
            Number(plan.dailyIncome);


        const duration =
            Number(plan.days);


        // ==================================================
        // TOTAL INCOME
        //
        // Always calculate from daily income × days.
        // ==================================================

        const totalIncome =
            dailyIncome * duration;


        // ==================================================
        // VALIDATE AMOUNT
        // ==================================================

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid investment amount."

            });

        }


        // ==================================================
        // VALIDATE DAILY INCOME
        // ==================================================

        if (
            !Number.isFinite(dailyIncome) ||
            dailyIncome <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid daily income."

            });

        }


        // ==================================================
        // VALIDATE DURATION
        // ==================================================

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid investment duration."

            });

        }


        // ==================================================
        // WALLET
        // ==================================================

        const currentBalance =
            Number(user.balance || 0);


        console.log(
            "Wallet Before:",
            currentBalance
        );

        console.log(
            "Investment Amount:",
            amount
        );


        // ==================================================
        // CHECK BALANCE
        // ==================================================

        if (
            currentBalance < amount
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Insufficient wallet balance. Required ₹${amount}, available ₹${currentBalance}.`

            });

        }


        // ==================================================
        // EXACT PURCHASE TIME
        // ==================================================

        const purchaseTime =
            new Date();


        // ==================================================
        // CREATE INVESTMENT
        // ==================================================

        const investment =
            await Investment.create({

                user:
                    user._id,

                plan:
                    plan._id,

                planName:
                    plan.name,

                image:
                    plan.image || "",

                amount:
                    amount,

                dailyIncome:
                    dailyIncome,

                duration:
                    duration,

                totalIncome:
                    totalIncome,

                earned:
                    0,

                remainingDays:
                    duration,

                purchaseDate:
                    purchaseTime,

                // IMPORTANT:
                // First income will be exactly
                // 24 hours after purchase.

                lastIncomeDate:
                    null,

                completedDate:
                    null,

                status:
                    "Running"

            });


        // ==================================================
        // DEDUCT WALLET
        // ==================================================

        user.balance =
            currentBalance - amount;


        // ==================================================
        // ACTIVE INVESTMENTS
        // ==================================================

        user.activeInvestments =
            Number(
                user.activeInvestments || 0
            ) + 1;


        // ==================================================
        // DAILY YIELD
        // ==================================================

        user.dailyYield =
            Number(
                user.dailyYield || 0
            ) + dailyIncome;


        // ==================================================
        // SAVE USER
        // ==================================================

        await user.save();


        // ==================================================
        // CREATE TRANSACTION
        // ==================================================

        const txId =
            "INV" +
            Date.now() +
            Math.floor(
                100 +
                Math.random() * 900
            );


        const transaction =
            await Transaction.create({

                userId:
                    user._id,

                txId:
                    txId,

                type:
                    "Investment",

                amount:
                    -amount,

                description:
                    `${plan.name} investment purchased.`

            });


        // ==================================================
        // NEXT INCOME TIME
        // ==================================================

        const nextIncomeDate =
            new Date(
                purchaseTime.getTime() +
                24 * 60 * 60 * 1000
            );


        // ==================================================
        // LOG
        // ==================================================

        console.log(
            "================================"
        );

        console.log(
            "INVESTMENT CREATED:",
            investment._id
        );

        console.log(
            "PURCHASE TIME:",
            purchaseTime
        );

        console.log(
            "NEXT INCOME:",
            nextIncomeDate
        );

        console.log(
            "WALLET AFTER:",
            user.balance
        );

        console.log(
            "================================"
        );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Investment purchased successfully.",

            investment,

            transaction,

            incomeSchedule: {

                purchaseDate:
                    purchaseTime,

                firstIncomeDate:
                    nextIncomeDate,

                dailyIncome:
                    dailyIncome,

                duration:
                    duration,

                totalIncome:
                    totalIncome

            },

            user: {

                balance:
                    user.balance,

                activeInvestments:
                    user.activeInvestments,

                dailyYield:
                    user.dailyYield

            }

        });

    }

    catch (error) {

        console.error(
            "PURCHASE PLAN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to purchase investment."

        });

    }

};


// ======================================================
// DISTRIBUTE DAILY INCOME
// ======================================================
//
// This calls investmentService.
//
// The service checks:
//
// purchaseDate + 24 hours
//
// OR
//
// lastIncomeDate + 24 hours
//
// ======================================================

exports.distributeDailyIncome = async (
    req,
    res
) => {

    try {

        console.log(
            "================================"
        );

        console.log(
            "MANUAL DAILY INCOME TRIGGER"
        );

        console.log(
            "================================"
        );


        const result =
            await processDailyIncome();


        return res.json({

            success: true,

            message:
                "Daily income check completed.",

            processed:
                result.processed,

            skipped:
                result.skipped

        });

    }

    catch (error) {

        console.error(
            "DAILY INCOME CONTROLLER ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Daily income processing failed."

        });

    }

};


// ======================================================
// GET MY INVESTMENTS
// ======================================================

exports.myInvestments = async (req, res) => {

    try {

        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const investments =
            await Investment.find({

                user: userId

            })
            .populate(
                "plan",
                "name image price dailyIncome days totalIncome"
            )
            .sort({

                createdAt: -1

            });


        return res.json({

            success: true,

            investments

        });


    } catch (error) {

        console.error(
            "MY INVESTMENTS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// ======================================================
// USER INVESTMENT DASHBOARD
// ======================================================

exports.userDashboard = async (req, res) => {

    try {

        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        // ------------------------------------------------
        // USER
        // ------------------------------------------------

        const user =
            await User.findById(userId)
                .select("-password");


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        // ------------------------------------------------
        // ACTIVE INVESTMENTS
        // ------------------------------------------------

        const investments =
            await Investment.find({

                user: userId,

                status: "Running"

            });


        // ------------------------------------------------
        // CALCULATIONS
        // ------------------------------------------------

        const totalInvestment =
            investments.reduce(

                (sum, item) =>
                    sum + Number(item.amount || 0),

                0

            );


        const dailyIncome =
            investments.reduce(

                (sum, item) =>
                    sum + Number(item.dailyIncome || 0),

                0

            );


        const totalEarned =
            investments.reduce(

                (sum, item) =>
                    sum + Number(item.earned || 0),

                0

            );


        // ------------------------------------------------
        // RESPONSE
        // ------------------------------------------------

        return res.json({

            success: true,

            user,

            dashboard: {

                wallet:
                    Number(user.balance || 0),

                activePlans:
                    investments.length,

                totalInvestment,

                dailyIncome,

                totalEarned

            }

        });


    } catch (error) {

        console.error(
            "USER DASHBOARD ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ======================================================
// ADMIN - ALL PURCHASE HISTORY
// ======================================================

// ======================================================
// ADMIN - ALL PURCHASE HISTORY
// ======================================================

exports.getAllPurchaseHistory = async (req, res) => {

    try {

        console.log("================================");
        console.log("ADMIN PURCHASE HISTORY");
        console.log("================================");


        const investments = await Investment.find()

            .populate(
                "user",
                "name phone balance"
            )

            .populate(
                "plan",
                "name price dailyIncome days totalIncome image"
            )

            .sort({
                purchaseDate: -1
            });


        return res.status(200).json({

            success: true,

            count: investments.length,

            investments

        });


    } catch (error) {

        console.error(
            "ADMIN PURCHASE HISTORY ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};