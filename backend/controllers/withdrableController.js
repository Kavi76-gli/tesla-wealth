"use strict";

// ======================================================
// TESLA WEALTH
// SECURE WITHDRAWAL CONTROLLER
// ======================================================

const mongoose = require("mongoose");

const Withdrawal = require("../models/withdrawal");
const User = require("../models/user");
const Transaction = require("../models/transaction");

// ======================================================
// CONSTANTS
// ======================================================

const MIN_WITHDRAWAL = 500;
const PLATFORM_FEE_PERCENT = 3;

// ======================================================
// HELPERS
// ======================================================

function getUserId(req) {
    return (
        req.user?.id ||
        req.user?._id ||
        req.user?.userId ||
        req.userId
    );
}

function validObjectId(id) {
    return (
        typeof id === "string" &&
        mongoose.Types.ObjectId.isValid(id)
    );
}

function toNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value) {
    return Math.round(
        (Number(value) + Number.EPSILON) * 100
    ) / 100;
}

function generateTxId(prefix = "WDR") {
    return (
        prefix +
        Date.now() +
        cryptoRandomSuffix()
    );
}

function cryptoRandomSuffix() {
    return require("crypto")
        .randomBytes(8)
        .toString("hex")
        .toUpperCase();
}

function httpError(status, message) {
    const error = new Error(message);
    error.statusCode = status;
    return error;
}

function isDuplicateKeyError(error) {
    return error?.code === 11000;
}

// ======================================================
// USER — CREATE WITHDRAWAL
// ======================================================

exports.createWithdrawal = async (req, res) => {
    let session;

    try {
        console.log("====================================");
        console.log("TESLA WEALTH — CREATE WITHDRAWAL");
        console.log("====================================");

        // ----------------------------------------------
        // 1. AUTHENTICATION
        // ----------------------------------------------

        const userId = getUserId(req);

        if (!userId || !validObjectId(String(userId))) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // ----------------------------------------------
        // 2. VALIDATE REQUEST
        // ----------------------------------------------

        const {
            amount,
            paymentMethod,
            paymentDetails = {}
        } = req.body || {};

        const requestedAmount = Number(amount);

        if (
            !Number.isFinite(requestedAmount) ||
            requestedAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid withdrawal amount."
            });
        }

        if (
            !Number.isSafeInteger(
                Math.round(requestedAmount * 100)
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount."
            });
        }

        const grossAmount = roundMoney(requestedAmount);

        if (grossAmount < MIN_WITHDRAWAL) {
            return res.status(400).json({
                success: false,
                message:
                    `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`
            });
        }

        // ----------------------------------------------
        // 3. VALIDATE PAYMENT METHOD
        // ----------------------------------------------

        if (!["UPI", "Bank"].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method."
            });
        }

        // ----------------------------------------------
        // 4. SANITIZE PAYMENT DETAILS
        // ----------------------------------------------

        const cleanPaymentDetails = {
            upiId:
                paymentMethod === "UPI"
                    ? String(
                        paymentDetails?.upiId || ""
                    ).trim()
                    : "",

            accountHolder:
                paymentMethod === "Bank"
                    ? String(
                        paymentDetails?.accountHolder || ""
                    ).trim()
                    : "",

            bankName:
                paymentMethod === "Bank"
                    ? String(
                        paymentDetails?.bankName || ""
                    ).trim()
                    : "",

            accountNumber:
                paymentMethod === "Bank"
                    ? String(
                        paymentDetails?.accountNumber || ""
                    ).trim()
                    : "",

            ifscCode:
                paymentMethod === "Bank"
                    ? String(
                        paymentDetails?.ifscCode || ""
                    ).trim().toUpperCase()
                    : ""
        };

        // ----------------------------------------------
        // 5. VALIDATE UPI
        // ----------------------------------------------

        if (paymentMethod === "UPI") {
            if (!cleanPaymentDetails.upiId) {
                return res.status(400).json({
                    success: false,
                    message: "UPI ID is required."
                });
            }

            if (
                cleanPaymentDetails.upiId.length > 100 ||
                !/^[^\s@]+@[^\s@]+$/.test(
                    cleanPaymentDetails.upiId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid UPI ID."
                });
            }
        }

        // ----------------------------------------------
        // 6. VALIDATE BANK DETAILS
        // ----------------------------------------------

        if (paymentMethod === "Bank") {
            if (
                !cleanPaymentDetails.accountHolder ||
                !cleanPaymentDetails.bankName ||
                !cleanPaymentDetails.accountNumber ||
                !cleanPaymentDetails.ifscCode
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide complete bank account details."
                });
            }

            if (
                !/^\d{6,20}$/.test(
                    cleanPaymentDetails.accountNumber
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid bank account number."
                });
            }

            if (
                !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
                    cleanPaymentDetails.ifscCode
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid IFSC code."
                });
            }
        }

        // ----------------------------------------------
        // 7. CALCULATE FEE AND NET PAYOUT
        // ----------------------------------------------

        const platformFee = roundMoney(
            grossAmount * PLATFORM_FEE_PERCENT / 100
        );

        const netAmount = roundMoney(
            grossAmount - platformFee
        );

        // ----------------------------------------------
        // 8. RESERVE FUNDS TRANSACTIONALLY
        // ----------------------------------------------

        session = await mongoose.startSession();

        let createdWithdrawal = null;
        let updatedBalances = null;

        await session.withTransaction(async () => {
            // Reset callback results because MongoDB may retry
            // a transaction callback.
            createdWithdrawal = null;
            updatedBalances = null;

            // ------------------------------------------
            // CHECK EXISTING PENDING REQUEST
            // ------------------------------------------

            const existingPending = await Withdrawal.findOne({
                user: userId,
                status: "Pending"
            }).session(session);

            if (existingPending) {
                throw httpError(
                    409,
                    "You already have a pending withdrawal. Please wait until it is processed."
                );
            }

            // ------------------------------------------
            // ATOMICALLY RESERVE ELIGIBLE FUNDS
            // ------------------------------------------

            const user = await User.findOneAndUpdate(
                {
                    _id: userId,
                    balance: {
                        $gte: grossAmount
                    },
                    withdrawableEarnings: {
                        $gte: grossAmount
                    }
                },
                {
                    $inc: {
                        balance: -grossAmount,
                        withdrawableEarnings: -grossAmount,
                        totalWithdraw: grossAmount
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            if (!user) {
                const currentUser = await User.findById(
                    userId
                ).session(session);

                if (!currentUser) {
                    throw httpError(
                        404,
                        "User account not found."
                    );
                }

                const walletBalance = roundMoney(
                    toNumber(currentUser.balance)
                );

                const eligibleBalance = roundMoney(
                    toNumber(currentUser.withdrawableEarnings)
                );

                if (eligibleBalance < grossAmount) {
                    throw httpError(
                        400,
                        "Insufficient eligible investment earnings. " +
                        `Available for withdrawal: ₹${eligibleBalance}.`
                    );
                }

                if (walletBalance < grossAmount) {
                    throw httpError(
                        400,
                        "Insufficient wallet balance for this withdrawal."
                    );
                }

                throw httpError(
                    400,
                    "Unable to reserve the requested withdrawal amount."
                );
            }

            // ------------------------------------------
            // CREATE PENDING WITHDRAWAL
            // ------------------------------------------

            const [withdrawal] = await Withdrawal.create(
                [
                    {
                        user: user._id,
                        amount: grossAmount,
                        platformFee,
                        platformFeePercent:
                            PLATFORM_FEE_PERCENT,
                        netAmount,
                        paymentMethod,
                        paymentDetails:
                            cleanPaymentDetails,
                        status: "Pending"
                    }
                ],
                {
                    session
                }
            );

            createdWithdrawal = withdrawal;

            updatedBalances = {
                balance: roundMoney(user.balance),
                withdrawableEarnings: roundMoney(
                    user.withdrawableEarnings
                )
            };
        });

        // ----------------------------------------------
        // 9. SUCCESS RESPONSE
        // ----------------------------------------------

        if (!createdWithdrawal) {
            throw new Error(
                "Withdrawal transaction completed without creating a withdrawal."
            );
        }

        console.log("Withdrawal created successfully.");
        console.log("Withdrawal ID:", createdWithdrawal._id);
        console.log("Gross amount:", grossAmount);
        console.log("Platform fee:", platformFee);
        console.log("Net payout:", netAmount);

        return res.status(201).json({
            success: true,
            message:
                "Withdrawal request submitted successfully.",

            withdrawal: createdWithdrawal,

            grossAmount,
            platformFee,
            platformFeePercent: PLATFORM_FEE_PERCENT,
            netAmount,

            balance: updatedBalances.balance,

            withdrawableEarnings:
                updatedBalances.withdrawableEarnings
        });

    } catch (error) {
        console.error("CREATE WITHDRAWAL ERROR:", error);

        if (isDuplicateKeyError(error)) {
            return res.status(409).json({
                success: false,
                message:
                    "You already have a pending withdrawal. Please wait until it is processed."
            });
        }

        return res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.statusCode
                    ? error.message
                    : "Unable to create withdrawal request."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// ======================================================
// USER — MY WITHDRAWALS
// ======================================================

exports.getMyWithdrawals = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId || !validObjectId(String(userId))) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const withdrawals = await Withdrawal.find({
            user: userId
        }).sort({
            createdAt: -1
        });

        return res.status(200).json({
            success: true,
            withdrawals
        });

    } catch (error) {
        console.error("GET MY WITHDRAWALS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch withdrawals."
        });
    }
};

// ======================================================
// ADMIN — GET ALL WITHDRAWALS
// ======================================================

exports.getAllWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find()
            .populate(
                "user",
                "name phone inviteCode balance withdrawableEarnings"
            )
            .sort({
                createdAt: -1
            });

        const formattedWithdrawals = withdrawals.map(
            (withdrawal) => {
                const details =
                    withdrawal.paymentDetails || {};

                return {
                    _id: withdrawal._id,
                    user: withdrawal.user || null,

                    amount: toNumber(withdrawal.amount),

                    platformFee: toNumber(
                        withdrawal.platformFee
                    ),

                    platformFeePercent: toNumber(
                        withdrawal.platformFeePercent
                    ),

                    netAmount: toNumber(
                        withdrawal.netAmount
                    ),

                    paymentMethod:
                        withdrawal.paymentMethod || "",

                    paymentDetails: {
                        upiId: details.upiId || "",
                        accountHolder:
                            details.accountHolder || "",
                        bankName: details.bankName || "",
                        accountNumber:
                            details.accountNumber || "",
                        ifscCode: details.ifscCode || ""
                    },

                    // Retained for compatibility with existing
                    // admin frontend implementations.
                    upiId: details.upiId || "",
                    accountHolder:
                        details.accountHolder || "",
                    bankName: details.bankName || "",
                    accountNumber:
                        details.accountNumber || "",
                    ifscCode: details.ifscCode || "",

                    status: withdrawal.status || "Pending",
                    remark: withdrawal.remark || "",
                    rejectionReason:
                        withdrawal.rejectionReason || "",

                    processedAt:
                        withdrawal.processedAt || null,

                    createdAt: withdrawal.createdAt,
                    updatedAt: withdrawal.updatedAt
                };
            }
        );

        return res.status(200).json({
            success: true,
            count: formattedWithdrawals.length,
            withdrawals: formattedWithdrawals
        });

    } catch (error) {
        console.error("GET ALL WITHDRAWALS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch withdrawals."
        });
    }
};

// ======================================================
// ADMIN — APPROVE WITHDRAWAL
//
// Money has already been reserved during creation.
// Approval must NOT deduct the wallet a second time.
// ======================================================

exports.approveWithdrawal = async (req, res) => {
    let session;

    try {
        const withdrawalId = req.params.id;

        if (!validObjectId(withdrawalId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal ID."
            });
        }

        session = await mongoose.startSession();

        let approvedWithdrawal = null;
        let resultingBalance = null;

        await session.withTransaction(async () => {
            approvedWithdrawal = null;

            // ------------------------------------------
            // CLAIM PENDING WITHDRAWAL
            // ------------------------------------------

            const withdrawal = await Withdrawal.findOneAndUpdate(
                {
                    _id: withdrawalId,
                    status: "Pending"
                },
                {
                    $set: {
                        status: "Approved",

                        remark: String(
                            req.body?.remark ||
                            "Withdrawal approved by admin."
                        ).trim(),

                        processedAt: new Date()
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!withdrawal) {
                const existing = await Withdrawal.findById(
                    withdrawalId
                ).session(session);

                throw httpError(
                    existing ? 409 : 404,
                    existing
                        ? "Withdrawal has already been processed."
                        : "Withdrawal not found."
                );
            }

            const user = await User.findById(
                withdrawal.user
            ).session(session);

            if (!user) {
                throw new Error(
                    "User not found for this withdrawal."
                );
            }

            // ------------------------------------------
            // RECORD APPROVAL
            // ------------------------------------------
            // No wallet deduction occurs here.
            //
            // The transaction record is an audit entry.
            // Actual bank/UPI payment must be handled and
            // verified by the payout process.

            await Transaction.create(
                [
                    {
                        userId: user._id,
                        txId: generateTxId("WDR"),
                        type: "Withdrawal",
                        amount: -toNumber(
                            withdrawal.netAmount
                        ),
                        description:
                            `Withdrawal approved. Gross ₹${toNumber(withdrawal.amount)}, ` +
                            `platform fee ₹${toNumber(withdrawal.platformFee)}, ` +
                            `net payout ₹${toNumber(withdrawal.netAmount)}.`
                    }
                ],
                {
                    session
                }
            );

            approvedWithdrawal = withdrawal;
            resultingBalance = roundMoney(
                toNumber(user.balance)
            );
        });

        return res.status(200).json({
            success: true,
            message: "Withdrawal approved successfully.",
            withdrawal: approvedWithdrawal,
            balance: resultingBalance
        });

    } catch (error) {
        console.error("APPROVE WITHDRAWAL ERROR:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.statusCode
                    ? error.message
                    : "Unable to approve withdrawal."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// ======================================================
// ADMIN — REJECT WITHDRAWAL
//
// Restore the gross amount exactly once.
// Status change, wallet refund and audit record are
// committed in the same MongoDB transaction.
// ======================================================

exports.rejectWithdrawal = async (req, res) => {
    let session;

    try {
        const withdrawalId = req.params.id;

        if (!validObjectId(withdrawalId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal ID."
            });
        }

        const rejectionReason = String(
            req.body?.remark ||
            req.body?.rejectionReason ||
            ""
        ).trim();

        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                message: "Please enter a rejection reason."
            });
        }

        session = await mongoose.startSession();

        let rejectedWithdrawal = null;
        let resultingBalance = null;
        let resultingEligibleBalance = null;

        await session.withTransaction(async () => {
            rejectedWithdrawal = null;

            // ------------------------------------------
            // 1. ATOMICALLY CLAIM PENDING WITHDRAWAL
            // ------------------------------------------

            const withdrawal = await Withdrawal.findOneAndUpdate(
                {
                    _id: withdrawalId,
                    status: "Pending"
                },
                {
                    $set: {
                        status: "Rejected",
                        remark: rejectionReason,
                        rejectionReason,
                        processedAt: new Date()
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!withdrawal) {
                const existing = await Withdrawal.findById(
                    withdrawalId
                ).session(session);

                throw httpError(
                    existing ? 409 : 404,
                    existing
                        ? "Withdrawal has already been processed."
                        : "Withdrawal not found."
                );
            }

            // ------------------------------------------
            // 2. VALIDATE RESERVED AMOUNT
            // ------------------------------------------

            const amount = roundMoney(
                toNumber(withdrawal.amount, NaN)
            );

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                throw new Error(
                    "Invalid withdrawal amount. Refund was rolled back."
                );
            }

            // ------------------------------------------
            // 3. RESTORE USER BALANCES
            // ------------------------------------------

            const user = await User.findByIdAndUpdate(
                withdrawal.user,
                {
                    $inc: {
                        balance: amount,
                        withdrawableEarnings: amount,
                        totalWithdraw: -amount
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            if (!user) {
                throw new Error(
                    "User not found. Refund was rolled back."
                );
            }

            // ------------------------------------------
            // 4. CREATE REFUND AUDIT RECORD
            // ------------------------------------------

            await Transaction.create(
                [
                    {
                        userId: user._id,
                        txId: generateTxId("REF"),
                        type: "Withdrawal Refund",
                        amount,
                        description:
                            `Withdrawal ${withdrawal._id} rejected. ` +
                            `₹${amount} restored to wallet and eligible withdrawal funds.`
                    }
                ],
                {
                    session
                }
            );

            rejectedWithdrawal = withdrawal;

            resultingBalance = roundMoney(
                toNumber(user.balance)
            );

            resultingEligibleBalance = roundMoney(
                toNumber(user.withdrawableEarnings)
            );
        });

        return res.status(200).json({
            success: true,

            message:
                "Withdrawal rejected. Reserved funds have been restored.",

            balance: resultingBalance,

            withdrawableEarnings:
                resultingEligibleBalance,

            withdrawal: {
                _id: rejectedWithdrawal._id,
                amount: rejectedWithdrawal.amount,
                platformFee: rejectedWithdrawal.platformFee,
                netAmount: rejectedWithdrawal.netAmount,
                status: rejectedWithdrawal.status,
                remark: rejectedWithdrawal.remark,
                rejectionReason:
                    rejectedWithdrawal.rejectionReason,
                processedAt: rejectedWithdrawal.processedAt
            }
        });

    } catch (error) {
        console.error("REJECT WITHDRAWAL ERROR:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.statusCode
                    ? error.message
                    : "Unable to reject withdrawal."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};