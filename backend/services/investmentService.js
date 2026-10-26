
// ======================================================
// TESLA WEALTH
// INVESTMENT SERVICE
// Exact 24-Hour Daily Income System
// ======================================================
//
// BUSINESS RULES
// ------------------------------------------------------
// 1. Investment principal is deducted when a plan is
//    purchased.
//
// 2. Daily investment income is credited to user.balance.
//
// 3. Daily investment income increases user.earnings.
//
// 4. Daily investment income increases
//    user.withdrawableEarnings.
//
// 5. Uninvested deposit funds must NOT be added to
//    withdrawableEarnings.
//
// 6. Investment principal is NOT automatically returned
//    when a plan completes.
//
// 7. The income credit, investment update, and transaction
//    record are saved in a MongoDB transaction.
//
// 8. Income is processed in exact 24-hour intervals.
//
// IMPORTANT
// ------------------------------------------------------
// MongoDB transactions require a replica set or a
// transaction-capable MongoDB deployment.
// ======================================================

const mongoose = require("mongoose");

const User = require("../models/user");
const Investment = require("../models/investment");
const Transaction = require("../models/transaction");


// ======================================================
// CONSTANTS
// ======================================================

const ONE_DAY = 24 * 60 * 60 * 1000;


// ======================================================
// HELPERS
// ======================================================

function toNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function createTransactionId() {
    return (
        "INC" +
        Date.now() +
        Math.floor(100000 + Math.random() * 900000)
    );
}


// ======================================================
// PROCESS ONE INVESTMENT IN A TRANSACTION
// ======================================================

async function processInvestmentIncome(
    investmentId,
    now
) {
    const session = await mongoose.startSession();

    try {
        let result = {
            processed: false,
            reason: "Not processed"
        };

        await session.withTransaction(async () => {

            // ==========================================
            // RELOAD INVESTMENT INSIDE TRANSACTION
            // ==========================================

            const investment = await Investment.findOne({
                _id: investmentId,
                status: "Running",
                remainingDays: { $gt: 0 }
            }).session(session);

            if (!investment) {
                result = {
                    processed: false,
                    reason: "Investment is no longer running"
                };

                return;
            }


            // ==========================================
            // VALIDATE PURCHASE DATE
            // ==========================================

            const purchaseDate = new Date(
                investment.purchaseDate
            );

            if (
                Number.isNaN(purchaseDate.getTime())
            ) {
                result = {
                    processed: false,
                    reason: "Invalid purchase date"
                };

                return;
            }


            // ==========================================
            // LAST INCOME DATE
            // ==========================================

            const lastIncomeDate = investment.lastIncomeDate
                ? new Date(investment.lastIncomeDate)
                : purchaseDate;

            if (
                Number.isNaN(lastIncomeDate.getTime())
            ) {
                result = {
                    processed: false,
                    reason: "Invalid last income date"
                };

                return;
            }


            // ==========================================
            // NEXT INCOME TIME
            // ==========================================

            const nextIncomeDate = new Date(
                lastIncomeDate.getTime() + ONE_DAY
            );


            // ==========================================
            // EXACT 24-HOUR CHECK
            // ==========================================

            if (now.getTime() < nextIncomeDate.getTime()) {
                result = {
                    processed: false,
                    reason: "Daily income is not due yet"
                };

                return;
            }


            // ==========================================
            // VALIDATE DAILY INCOME
            // ==========================================

            const income = toNumber(
                investment.dailyIncome,
                0
            );

            if (
                !Number.isFinite(income) ||
                income <= 0
            ) {
                result = {
                    processed: false,
                    reason: "Invalid daily income"
                };

                return;
            }


            // ==========================================
            // VALIDATE REMAINING DAYS
            // ==========================================

            const remainingDays = toNumber(
                investment.remainingDays,
                0
            );

            if (remainingDays <= 0) {
                result = {
                    processed: false,
                    reason: "No remaining investment days"
                };

                return;
            }


            // ==========================================
            // LOAD USER INSIDE TRANSACTION
            // ==========================================

            const user = await User.findById(
                investment.user
            ).session(session);

            if (!user) {
                result = {
                    processed: false,
                    reason: "User not found"
                };

                return;
            }


            // ==========================================
            // CREDIT WALLET
            // ==========================================

            user.balance =
                toNumber(user.balance) + income;


            // ==========================================
            // UPDATE LIFETIME EARNINGS
            // ==========================================

            user.earnings =
                toNumber(user.earnings) + income;


            // ==========================================
            // UPDATE ELIGIBLE WITHDRAWAL EARNINGS
            // ==========================================
            //
            // Only newly credited investment income is
            // added here.
            //
            // Do NOT add user.balance or the uninvested
            // deposit balance to this field.
            // ==========================================

            user.withdrawableEarnings =
                toNumber(user.withdrawableEarnings) +
                income;


            // ==========================================
            // UPDATE INVESTMENT EARNED AMOUNT
            // ==========================================

            investment.earned =
                toNumber(investment.earned) + income;


            // ==========================================
            // DECREASE REMAINING DAYS
            // ==========================================

            investment.remainingDays = Math.max(
                0,
                remainingDays - 1
            );


            // ==========================================
            // UPDATE LAST INCOME DATE
            // ==========================================

            investment.lastIncomeDate = nextIncomeDate;


            // ==========================================
            // CHECK INVESTMENT COMPLETION
            // ==========================================

            if (investment.remainingDays === 0) {

                investment.status = "Completed";

                investment.completedDate = now;


                // ======================================
                // DECREASE ACTIVE INVESTMENTS
                // ======================================

                user.activeInvestments = Math.max(
                    0,
                    toNumber(user.activeInvestments) - 1
                );


                // ======================================
                // DECREASE DAILY YIELD
                // ======================================

                user.dailyYield = Math.max(
                    0,
                    toNumber(user.dailyYield) -
                    toNumber(investment.dailyIncome)
                );
            }


            // ==========================================
            // CREATE DAILY INCOME TRANSACTION
            // ==========================================

            await Transaction.create(
                [
                    {
                        userId: user._id,

                        txId: createTransactionId(),

                        type: "Daily Income",

                        amount: income,

                        description:
                            `Daily investment income from ${
                                investment.planName ||
                                "investment"
                            }.`
                    }
                ],
                {
                    session
                }
            );


            // ==========================================
            // SAVE USER
            // ==========================================

            await user.save({
                session
            });


            // ==========================================
            // SAVE INVESTMENT
            // ==========================================

            await investment.save({
                session
            });


            // ==========================================
            // SUCCESS RESULT
            // ==========================================

            result = {
                processed: true,

                investmentId: investment._id.toString(),

                userId: user._id.toString(),

                income,

                walletBalance: user.balance,

                lifetimeEarnings: user.earnings,

                withdrawableEarnings:
                    user.withdrawableEarnings,

                investmentEarned: investment.earned,

                remainingDays: investment.remainingDays,

                status: investment.status,

                nextIncomeDate:
                    investment.remainingDays > 0
                        ? new Date(
                            investment.lastIncomeDate.getTime() +
                            ONE_DAY
                        )
                        : null
            };
        });

        return result;

    } finally {
        await session.endSession();
    }
}


// ======================================================
// PROCESS DAILY INCOME
// ======================================================

async function processDailyIncome() {

    console.log("======================================");
    console.log("TESLA WEALTH DAILY INCOME PROCESS");
    console.log("======================================");

    const now = new Date();

    let processed = 0;
    let skipped = 0;
    let failed = 0;


    // ==============================================
    // FIND RUNNING INVESTMENTS
    // ==============================================

    const investments = await Investment.find({
        status: "Running",
        remainingDays: { $gt: 0 }
    }).select("_id");


    // ==============================================
    // PROCESS EACH INVESTMENT
    // ==============================================

    for (const item of investments) {

        try {

            const result = await processInvestmentIncome(
                item._id,
                now
            );


            if (!result.processed) {

                skipped++;

                console.log(
                    `⏳ Skipped ${item._id}: ${result.reason}`
                );

                continue;
            }


            processed++;


            console.log("======================================");
            console.log("DAILY INVESTMENT INCOME CREDITED");
            console.log("Investment:", result.investmentId);
            console.log("User:", result.userId);
            console.log("Income:", `₹${result.income}`);
            console.log(
                "Wallet Balance:",
                `₹${result.walletBalance}`
            );
            console.log(
                "Lifetime Earnings:",
                `₹${result.lifetimeEarnings}`
            );
            console.log(
                "Withdrawable Earnings:",
                `₹${result.withdrawableEarnings}`
            );
            console.log(
                "Investment Earned:",
                `₹${result.investmentEarned}`
            );
            console.log(
                "Remaining Days:",
                result.remainingDays
            );
            console.log(
                "Status:",
                result.status
            );
            console.log(
                "Next Income:",
                result.nextIncomeDate || "Plan completed"
            );
            console.log("======================================");

        } catch (error) {

            failed++;

            console.error(
                "INVESTMENT INCOME PROCESSING ERROR:",
                item._id.toString(),
                error
            );
        }
    }


    // ==============================================
    // FINAL RESULT
    // ==============================================

    console.log("======================================");
    console.log("DAILY INCOME PROCESS FINISHED");
    console.log("Processed:", processed);
    console.log("Skipped:", skipped);
    console.log("Failed:", failed);
    console.log("======================================");

    return {
        processed,
        skipped,
        failed
    };
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
    processDailyIncome
};

