// ======================================================
// INVESTMENT SERVICE
// Exact 24-Hour Daily Income System
//
// BUSINESS RULE
// ------------------------------------------------------
// Investment principal is deducted from wallet when
// investment is purchased.
//
// Daily investment income is added back to wallet.
//
// Therefore:
// user.balance = actual available wallet balance.
//
// Withdrawal uses user.balance.
//
// ======================================================

const User =
    require("../models/user");

const Investment =
    require("../models/investment");

const Transaction =
    require("../models/transaction");


// ======================================================
// CONSTANTS
// ======================================================

const ONE_DAY =
    24 * 60 * 60 * 1000;


// ======================================================
// PROCESS DAILY INCOME
// ======================================================

async function processDailyIncome() {

    console.log(
        "======================================"
    );

    console.log(
        "STARTING 24-HOUR DAILY INCOME PROCESS"
    );

    console.log(
        "======================================"
    );


    const now =
        new Date();


    // ==================================================
    // FIND RUNNING INVESTMENTS
    // ==================================================

    const investments =
        await Investment.find({

            status: "Running",

            remainingDays: {
                $gt: 0
            }

        });


    let processed = 0;

    let skipped = 0;


    // ==================================================
    // PROCESS EACH INVESTMENT
    // ==================================================

    for (
        const investment of investments
    ) {

        try {

            // ==========================================
            // PURCHASE DATE
            // ==========================================

            const purchaseDate =
                new Date(
                    investment.purchaseDate
                );


            if (
                Number.isNaN(
                    purchaseDate.getTime()
                )
            ) {

                console.log(
                    "❌ Invalid purchase date:",
                    investment._id
                );

                skipped++;

                continue;

            }


            // ==========================================
            // LAST INCOME DATE
            // ==========================================

            const lastIncomeDate =
                investment.lastIncomeDate
                    ? new Date(
                        investment.lastIncomeDate
                    )
                    : purchaseDate;


            if (
                Number.isNaN(
                    lastIncomeDate.getTime()
                )
            ) {

                console.log(
                    "❌ Invalid last income date:",
                    investment._id
                );

                skipped++;

                continue;

            }


            // ==========================================
            // NEXT INCOME TIME
            // ==========================================

            const nextIncomeDate =
                new Date(
                    lastIncomeDate.getTime() +
                    ONE_DAY
                );


            // ==========================================
            // EXACT 24-HOUR CHECK
            // ==========================================

            if (
                now.getTime() <
                nextIncomeDate.getTime()
            ) {

                console.log(
                    `⏳ Not due yet: ${investment._id}`
                );

                skipped++;

                continue;

            }


            // ==========================================
            // FIND USER
            // ==========================================

            const user =
                await User.findById(
                    investment.user
                );


            if (!user) {

                console.log(
                    "❌ User not found:",
                    investment.user
                );

                skipped++;

                continue;

            }


            // ==========================================
            // DAILY INCOME
            // ==========================================

            const dailyIncome =
                Number(
                    investment.dailyIncome || 0
                );


            if (
                !Number.isFinite(
                    dailyIncome
                ) ||
                dailyIncome <= 0
            ) {

                console.log(
                    "❌ Invalid daily income:",
                    investment._id
                );

                skipped++;

                continue;

            }


            // ==========================================
            // REMAINING DAYS
            // ==========================================

            const remainingDays =
                Number(
                    investment.remainingDays || 0
                );


            if (
                remainingDays <= 0
            ) {

                skipped++;

                continue;

            }


            // ==========================================
            // ONE DAY INCOME
            // ==========================================

            const income =
                dailyIncome;


            // ==================================================
            // IMPORTANT
            //
            // INVESTMENT RETURN GOES DIRECTLY TO WALLET.
            //
            // DO NOT remove this.
            // ==================================================

            user.balance =
                Number(
                    user.balance || 0
                ) + income;


            // ==========================================
            // USER TOTAL EARNINGS
            // ==========================================

            user.earnings =
                Number(
                    user.earnings || 0
                ) + income;


            // ==========================================
            // INVESTMENT EARNED
            // ==========================================

            investment.earned =
                Number(
                    investment.earned || 0
                ) + income;


            // ==========================================
            // REDUCE REMAINING DAYS
            // ==========================================

            investment.remainingDays =
                Math.max(

                    0,

                    remainingDays - 1

                );


            // ==========================================
            // UPDATE LAST INCOME DATE
            // ==========================================

            investment.lastIncomeDate =
                nextIncomeDate;


            // ==========================================
            // CHECK COMPLETION
            // ==========================================

            if (
                investment.remainingDays <= 0
            ) {

                investment.remainingDays =
                    0;


                investment.status =
                    "Completed";


                investment.completedDate =
                    now;


                // --------------------------------------
                // ACTIVE INVESTMENTS
                // --------------------------------------

                user.activeInvestments =
                    Math.max(

                        0,

                        Number(
                            user.activeInvestments || 0
                        ) - 1

                    );


                // --------------------------------------
                // DAILY YIELD
                // --------------------------------------

                user.dailyYield =
                    Math.max(

                        0,

                        Number(
                            user.dailyYield || 0
                        ) - income

                    );

            }


            // ==========================================
            // TRANSACTION ID
            // ==========================================

            const txId =
                "INC" +
                Date.now() +
                Math.floor(
                    100 +
                    Math.random() * 900
                );


            // ==========================================
            // CREATE DAILY INCOME TRANSACTION
            // ==========================================

            await Transaction.create({

                userId:
                    user._id,

                txId:
                    txId,

                type:
                    "Daily Income",

                amount:
                    income,

                description:
                    `Daily income from ${investment.planName || "investment"}.`

            });


            // ==========================================
            // SAVE USER
            // ==========================================

            await user.save();


            // ==========================================
            // SAVE INVESTMENT
            // ==========================================

            await investment.save();


            // ==========================================
            // SUCCESS LOG
            // ==========================================

            processed++;


            console.log(
                "======================================"
            );

            console.log(
                "✅ DAILY INCOME CREDITED"
            );

            console.log(
                "Investment:",
                investment._id.toString()
            );

            console.log(
                "User:",
                user._id.toString()
            );

            console.log(
                "Income:",
                `₹${income}`
            );

            console.log(
                "Wallet Balance:",
                `₹${user.balance}`
            );

            console.log(
                "Lifetime Earnings:",
                `₹${user.earnings}`
            );

            console.log(
                "Investment Earned:",
                `₹${investment.earned}`
            );

            console.log(
                "Remaining Days:",
                investment.remainingDays
            );

            console.log(
                "Next Income:",
                new Date(
                    investment.lastIncomeDate.getTime() +
                    ONE_DAY
                )
            );

            console.log(
                "======================================"
            );

        }

        catch (itemError) {

            console.error(
                "❌ INVESTMENT PROCESSING ERROR:",
                investment._id,
                itemError
            );

            skipped++;

        }

    }


    // ==================================================
    // FINAL RESULT
    // ==================================================

    console.log(
        "======================================"
    );

    console.log(
        "24-HOUR DAILY INCOME PROCESS FINISHED"
    );

    console.log(
        `Processed: ${processed}`
    );

    console.log(
        `Skipped: ${skipped}`
    );

    console.log(
        "======================================"
    );


    return {

        processed,

        skipped

    };

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    processDailyIncome

};