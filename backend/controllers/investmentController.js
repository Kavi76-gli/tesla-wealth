
// ======================================================
// TESLA WEALTH
// INVESTMENT CONTROLLER
// ======================================================
//
// BUSINESS RULES
// ------------------------------------------------------
// 1. Investment purchases use eligible deposited funds.
//
// 2. Both wallet balance and investableDepositBalance
//    must cover the purchase amount.
//
// 3. Investment principal is deducted when purchased.
//
// 4. Daily income is processed by investmentService.
//
// 5. withdrawableEarnings is separate from wallet balance.
//
// 6. Completed investments remain in purchase history.
//
// 7. Manual approval requests do not reserve funds.
//    Admin approval must revalidate all conditions.
//
// 8. Financial updates use MongoDB transactions.
// ======================================================

const mongoose = require("mongoose");

const User = require("../models/user");
const Plan = require("../models/plan");
const Investment = require("../models/investment");
const Transaction = require("../models/transaction");

const InvestmentPurchaseRequest = require(
    "../models/investmentPurchaseRequest"
);

const {
    processDailyIncome
} = require("../services/investmentService");


// ======================================================
// HELPERS
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


function toNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}


function validObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
}


function generateInvestmentTxId() {
    return (
        "INV-" +
        new mongoose.Types.ObjectId().toString()
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
        console.error("GET INVESTMENT PLANS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load investment plans."
        });
    }
};


// ======================================================
// PURCHASE INVESTMENT PLAN
// ======================================================

exports.purchasePlan = async (req, res) => {
    let session = null;

    try {
        console.log("======================================");
        console.log("TESLA WEALTH - INVESTMENT PURCHASE");
        console.log("======================================");


        // ==============================================
        // 1. AUTHENTICATION
        // ==============================================

        const userId = getUserId(req);

        if (!userId || !validObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }


        // ==============================================
        // 2. VALIDATE PLAN ID
        // ==============================================

        const { planId } = req.body || {};

        if (!planId || !validObjectId(planId)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid investment plan."
            });
        }


        // ==============================================
        // 3. LOAD USER AND PLAN
        // ==============================================

        const [user, plan] = await Promise.all([
            User.findById(userId),
            Plan.findById(planId)
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Investment plan not found."
            });
        }


        // ==============================================
        // 4. CHECK ACCOUNT STATUS
        // ==============================================

        if (user.isBlocked === true) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked."
            });
        }


        // ==============================================
        // 5. CHECK PURCHASE PERMISSION
        // ==============================================

        if (user.investmentPurchaseEnabled === false) {
            return res.status(403).json({
                success: false,
                message:
                    user.investmentPurchaseNote ||
                    "Investment purchases are currently disabled for your account."
            });
        }


        // ==============================================
        // 6. CHECK PLAN AVAILABILITY
        // ==============================================

        if (plan.status !== true) {
            return res.status(400).json({
                success: false,
                message: "This investment plan is currently unavailable."
            });
        }


        // ==============================================
        // 7. VALIDATE PLAN VALUES
        // ==============================================

        const amount = toNumber(plan.price, NaN);
        const dailyIncome = toNumber(plan.dailyIncome, NaN);
        const duration = toNumber(plan.days, NaN);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid investment amount."
            });
        }

        if (!Number.isFinite(dailyIncome) || dailyIncome <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid daily income."
            });
        }

        if (!Number.isInteger(duration) || duration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid investment duration."
            });
        }

        const totalIncome = roundMoney(
            dailyIncome * duration
        );


        // ==============================================
        // 8. CHECK ACTIVE INVESTMENT LIMIT
        // ==============================================

        const activeInvestmentCount =
            await Investment.countDocuments({
                user: user._id,
                status: "Running"
            });

        const maxActiveInvestments =
            Number.isInteger(user.maxActiveInvestments) &&
            user.maxActiveInvestments >= 0
                ? user.maxActiveInvestments
                : 10;

        if (activeInvestmentCount >= maxActiveInvestments) {
            return res.status(403).json({
                success: false,
                message:
                    `You have reached your maximum limit of ` +
                    `${maxActiveInvestments} active investments.`
            });
        }


        // ==============================================
        // 9. VALIDATE AVAILABLE FUNDS
        // ==============================================

        const walletBalance = toNumber(user.balance);
        const depositBalance = toNumber(
            user.investableDepositBalance
        );

        console.log("User:", user._id.toString());
        console.log("Plan:", plan.name);
        console.log("Investment amount:", amount);
        console.log("Wallet balance:", walletBalance);
        console.log("Eligible deposit balance:", depositBalance);

        if (
            walletBalance < 0 ||
            depositBalance < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid account balance."
            });
        }

        if (depositBalance < amount) {
            return res.status(400).json({
                success: false,
                message:
                    `Insufficient eligible deposit funds. ` +
                    `Required ₹${amount}; available ₹${depositBalance}.`
            });
        }

        if (walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message:
                    `Insufficient wallet balance. ` +
                    `Required ₹${amount}; available ₹${walletBalance}.`
            });
        }


        // ==============================================
        // 10. MANUAL APPROVAL MODE
        // ==============================================

        if (user.investmentApprovalMode === "manual") {

            const existingRequest =
                await InvestmentPurchaseRequest.findOne({
                    user: user._id,
                    plan: plan._id,
                    status: "Pending"
                });

            if (existingRequest) {
                return res.status(409).json({
                    success: false,
                    message:
                        "You already have a pending request for this investment plan.",
                    request: {
                        id: existingRequest._id,
                        planName: existingRequest.planName,
                        requestedAmount: existingRequest.requestedAmount,
                        status: existingRequest.status,
                        createdAt: existingRequest.createdAt
                    }
                });
            }


            // Do not deduct funds here.
            // The approval controller must revalidate balances.

            const purchaseRequest =
                await InvestmentPurchaseRequest.create({
                    user: user._id,
                    plan: plan._id,
                    planName: plan.name,
                    requestedAmount: amount,
                    status: "Pending",
                    approvalMode: "manual"
                });

            console.log(
                "PENDING INVESTMENT REQUEST:",
                purchaseRequest._id.toString()
            );

            return res.status(201).json({
                success: true,
                message:
                    "Your investment request has been submitted and is awaiting administrator approval.",
                request: {
                    id: purchaseRequest._id,
                    planName: purchaseRequest.planName,
                    requestedAmount: purchaseRequest.requestedAmount,
                    status: purchaseRequest.status,
                    createdAt: purchaseRequest.createdAt
                }
            });
        }


        // ==============================================
        // 11. AUTOMATIC PURCHASE TRANSACTION
        // ==============================================

        session = await mongoose.startSession();

        let purchaseResult = null;
        let failure = null;

        await session.withTransaction(async () => {

            // ------------------------------------------
            // Reload user and plan
            // ------------------------------------------

            const freshUser = await User.findById(
                user._id
            ).session(session);

            const freshPlan = await Plan.findById(
                plan._id
            ).session(session);

            if (!freshUser) {
                failure = {
                    status: 404,
                    message: "User account not found."
                };
                return;
            }

            if (freshUser.isBlocked === true) {
                failure = {
                    status: 403,
                    message: "Your account has been blocked."
                };
                return;
            }

            if (freshUser.investmentPurchaseEnabled === false) {
                failure = {
                    status: 403,
                    message:
                        freshUser.investmentPurchaseNote ||
                        "Investment purchases are disabled for your account."
                };
                return;
            }

            if (freshUser.investmentApprovalMode === "manual") {
                failure = {
                    status: 409,
                    message:
                        "Your account now requires manual investment approval."
                };
                return;
            }

            if (!freshPlan || freshPlan.status !== true) {
                failure = {
                    status: 400,
                    message: "This investment plan is unavailable."
                };
                return;
            }


            // ------------------------------------------
            // Revalidate plan values
            // ------------------------------------------

            const freshAmount = toNumber(freshPlan.price, NaN);
            const freshDailyIncome = toNumber(
                freshPlan.dailyIncome,
                NaN
            );
            const freshDuration = toNumber(
                freshPlan.days,
                NaN
            );

            if (
                !Number.isFinite(freshAmount) ||
                freshAmount <= 0 ||
                !Number.isFinite(freshDailyIncome) ||
                freshDailyIncome <= 0 ||
                !Number.isInteger(freshDuration) ||
                freshDuration <= 0
            ) {
                failure = {
                    status: 400,
                    message: "The investment plan contains invalid values."
                };
                return;
            }


            // ------------------------------------------
            // Recheck active investment limit
            // ------------------------------------------

            const activeCount =
                await Investment.countDocuments({
                    user: freshUser._id,
                    status: "Running"
                }).session(session);

            const activeLimit =
                Number.isInteger(freshUser.maxActiveInvestments) &&
                freshUser.maxActiveInvestments >= 0
                    ? freshUser.maxActiveInvestments
                    : 10;

            if (activeCount >= activeLimit) {
                failure = {
                    status: 403,
                    message:
                        `You have reached your maximum limit of ` +
                        `${activeLimit} active investments.`
                };
                return;
            }


            // ------------------------------------------
            // Atomically reserve purchase funds
            // ------------------------------------------

            const updatedUser =
                await User.findOneAndUpdate(
                    {
                        _id: freshUser._id,

                        isBlocked: {
                            $ne: true
                        },

                        investmentPurchaseEnabled: {
                            $ne: false
                        },

                        investmentApprovalMode: {
                            $ne: "manual"
                        },

                        balance: {
                            $gte: freshAmount
                        },

                        investableDepositBalance: {
                            $gte: freshAmount
                        }
                    },
                    {
                        $inc: {
                            balance: -freshAmount,

                            investableDepositBalance:
                                -freshAmount,

                            activeInvestments: 1,

                            dailyYield: freshDailyIncome
                        }
                    },
                    {
                        new: true,
                        session,
                        runValidators: true
                    }
                );

            if (!updatedUser) {
                failure = {
                    status: 409,
                    message:
                        "Your available funds or account permissions changed. Please refresh and try again."
                };
                return;
            }


            // ------------------------------------------
            // Create investment record
            // ------------------------------------------

            const purchaseTime = new Date();

            const [investment] =
                await Investment.create(
                    [
                        {
                            user: updatedUser._id,
                            plan: freshPlan._id,
                            planName: freshPlan.name,
                            image: freshPlan.image || "",

                            amount: freshAmount,
                            dailyIncome: freshDailyIncome,
                            duration: freshDuration,

                            totalIncome:
                                freshDailyIncome * freshDuration,

                            earned: 0,
                            remainingDays: freshDuration,

                            purchaseDate: purchaseTime,
                            lastIncomeDate: null,
                            completedDate: null,

                            status: "Running"
                        }
                    ],
                    {
                        session
                    }
                );


            // ------------------------------------------
            // Create purchase transaction
            // ------------------------------------------

            const [transaction] =
                await Transaction.create(
                    [
                        {
                            userId: updatedUser._id,

                            txId: generateInvestmentTxId(),

                            type: "Investment",

                            amount: -freshAmount,

                            description:
                                `${freshPlan.name} investment purchased.`
                        }
                    ],
                    {
                        session
                    }
                );


            // ------------------------------------------
            // Prepare successful result
            // ------------------------------------------

            purchaseResult = {
                investment,
                transaction,

                purchaseTime,

                nextIncomeDate: new Date(
                    purchaseTime.getTime() +
                    24 * 60 * 60 * 1000
                ),

                balance: roundMoney(updatedUser.balance),

                investableDepositBalance: roundMoney(
                    updatedUser.investableDepositBalance
                ),

                withdrawableEarnings: roundMoney(
                    updatedUser.withdrawableEarnings
                ),

                activeInvestments: updatedUser.activeInvestments,

                dailyYield: roundMoney(updatedUser.dailyYield),

                amount: freshAmount,

                dailyIncome: freshDailyIncome,

                duration: freshDuration,

                totalIncome: roundMoney(
                    freshDailyIncome * freshDuration
                )
            };
        });


        // ==============================================
        // 12. HANDLE VALIDATION FAILURE
        // ==============================================

        if (failure) {
            return res.status(failure.status).json({
                success: false,
                message: failure.message
            });
        }

        if (!purchaseResult) {
            return res.status(500).json({
                success: false,
                message: "The investment purchase could not be completed."
            });
        }


        // ==============================================
        // 13. SUCCESS RESPONSE
        // ==============================================

        console.log(
            "INVESTMENT CREATED:",
            purchaseResult.investment._id.toString()
        );

        console.log(
            "TRANSACTION CREATED:",
            purchaseResult.transaction._id.toString()
        );

        return res.status(201).json({
            success: true,

            message: "Investment purchased successfully.",

            investment: purchaseResult.investment,

            transaction: purchaseResult.transaction,

            incomeSchedule: {
                purchaseDate: purchaseResult.purchaseTime,

                firstIncomeDate: purchaseResult.nextIncomeDate,

                dailyIncome: purchaseResult.dailyIncome,

                duration: purchaseResult.duration,

                totalIncome: purchaseResult.totalIncome
            },

            user: {
                balance: purchaseResult.balance,

                investableDepositBalance:
                    purchaseResult.investableDepositBalance,

                withdrawableEarnings:
                    purchaseResult.withdrawableEarnings,

                activeInvestments:
                    purchaseResult.activeInvestments,

                dailyYield:
                    purchaseResult.dailyYield
            }
        });

    } catch (error) {
        console.error("INVESTMENT PURCHASE ERROR:", error);

        return res.status(500).json({
            success: false,
            message:
                "Unable to complete the investment purchase. Please try again later."
        });

    } finally {
        if (session) {
            try {
                await session.endSession();
            } catch (sessionError) {
                console.error(
                    "INVESTMENT SESSION CLEANUP ERROR:",
                    sessionError.message
                );
            }
        }
    }
};


// ======================================================
// DISTRIBUTE DAILY INCOME
// ======================================================

exports.distributeDailyIncome = async (req, res) => {
    try {
        console.log("================================");
        console.log("TESLA WEALTH - DAILY INCOME CHECK");
        console.log("================================");

        const result = await processDailyIncome();

        return res.json({
            success: true,
            message: "Daily income check completed.",
            processed: result.processed,
            skipped: result.skipped,
            failed: result.failed || 0
        });

    } catch (error) {
        console.error("DAILY INCOME CONTROLLER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Daily income processing failed."
        });
    }
};


// ======================================================
// GET MY INVESTMENTS
// ======================================================

exports.myInvestments = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId || !validObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const investments = await Investment.find({
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
            count: investments.length,
            investments
        });

    } catch (error) {
        console.error("MY INVESTMENTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load your investments."
        });
    }
};


// ======================================================
// USER INVESTMENT DASHBOARD
// ======================================================

// ======================================================
// TESLA WEALTH
// USER INVESTMENT DASHBOARD
// Consistent Wallet & Investment Statistics
// ======================================================

exports.userDashboard = async (req, res) => {
    try {
        // ==============================================
        // 1. VALIDATE AUTHENTICATED USER
        // ==============================================

        const userId = getUserId(req);

        if (!userId || !validObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // ==============================================
        // 2. LOAD USER
        // ==============================================

        const user = await User.findById(userId)
            .select("-password")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // ==============================================
        // 3. LOAD USER INVESTMENTS
        // ==============================================

        const allInvestments = await Investment.find({
            user: userId
        })
            .sort({
                purchaseDate: -1
            })
            .lean();

        // ==============================================
        // 4. MONEY NORMALIZATION
        // ==============================================

        const money = (value) => {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return 0;
            }

            return roundMoney(
                Math.max(0, number)
            );
        };

        // ==============================================
        // 5. READ STORED BALANCE FIELDS
        // ==============================================

        // Total wallet balance maintained by wallet routes.
        const walletBalance = money(
            user.balance
        );

        // Remaining approved deposit money available
        // for purchasing investment plans.
        const investableDepositBalance = money(
            user.investableDepositBalance
        );

        // Investment income explicitly eligible for withdrawal.
        const withdrawableEarnings = money(
            user.withdrawableEarnings
        );

        // Accumulated earnings recorded on the user account.
        const lifetimeEarnings = money(
            user.earnings
        );

        // ==============================================
        // 6. CALCULATE INVESTMENT STATISTICS
        // ==============================================

        const runningInvestments = allInvestments.filter(
            (investment) =>
                investment.status === "Running"
        );

        const completedInvestments = allInvestments.filter(
            (investment) =>
                investment.status === "Completed"
        );

        const cancelledInvestments = allInvestments.filter(
            (investment) =>
                investment.status === "Cancelled"
        );

        const totalInvestment = money(
            runningInvestments.reduce(
                (total, investment) =>
                    total + money(investment.amount),
                0
            )
        );

        const dailyIncome = money(
            runningInvestments.reduce(
                (total, investment) =>
                    total + money(investment.dailyIncome),
                0
            )
        );

        const totalInvestmentEarned = money(
            allInvestments.reduce(
                (total, investment) =>
                    total + money(investment.earned),
                0
            )
        );

        // ==============================================
        // 7. CALCULATE INVESTMENT COUNTS
        // ==============================================

        const activeInvestmentCount =
            runningInvestments.length;

        const completedInvestmentCount =
            completedInvestments.length;

        const cancelledInvestmentCount =
            cancelledInvestments.length;

        const totalInvestmentCount =
            allInvestments.length;

        // ==============================================
        // 8. BUILD DASHBOARD DATA
        // ==============================================

        const dashboard = {
            // ------------------------------------------
            // WALLET
            // ------------------------------------------

            wallet: walletBalance,

            balance: walletBalance,

            walletBalance: walletBalance,

            // ------------------------------------------
            // DEPOSIT FUNDS
            // ------------------------------------------

            investableDepositBalance:
                investableDepositBalance,

            // ------------------------------------------
            // WITHDRAWAL ELIGIBILITY
            // ------------------------------------------

            withdrawableEarnings:
                withdrawableEarnings,

            // ------------------------------------------
            // EARNINGS
            // ------------------------------------------

            totalEarned: totalInvestmentEarned,

            lifetimeEarnings: lifetimeEarnings,

            // ------------------------------------------
            // ACTIVE INVESTMENTS
            // ------------------------------------------

            activePlans: activeInvestmentCount,

            activeInvestments: activeInvestmentCount,

            totalInvestment: totalInvestment,

            dailyIncome: dailyIncome,

            // ------------------------------------------
            // INVESTMENT HISTORY
            // ------------------------------------------

            totalInvestments: totalInvestmentCount,

            completedInvestments:
                completedInvestmentCount,

            cancelledInvestments:
                cancelledInvestmentCount
        };

        // ==============================================
        // 9. RETURN CONSISTENT USER BALANCES
        // ==============================================

        const safeUser = {
            ...user,

            balance: walletBalance,

            investableDepositBalance:
                investableDepositBalance,

            withdrawableEarnings:
                withdrawableEarnings,

            earnings: lifetimeEarnings
        };

        // ==============================================
        // 10. SEND RESPONSE
        // ==============================================

        return res.status(200).json({
            success: true,

            message: "Investment dashboard loaded successfully.",

            user: safeUser,

            dashboard: dashboard
        });

    } catch (error) {
        console.error(
            "TESLA WEALTH USER DASHBOARD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message: "Unable to load the investment dashboard."
        });
    }
};



// ======================================================
// ADMIN - ALL PURCHASE HISTORY
// ======================================================

exports.getAllPurchaseHistory = async (req, res) => {
    try {
        console.log("================================");
        console.log("TESLA WEALTH - ADMIN PURCHASE HISTORY");
        console.log("================================");

        const investments = await Investment.find()
            .populate(
                "user",
                "name phone balance withdrawableEarnings"
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
        console.error("ADMIN PURCHASE HISTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load investment purchase history."
        });
    }
};

