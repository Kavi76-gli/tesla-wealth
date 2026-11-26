"use strict";

const mongoose = require("mongoose");

const Withdrawal = require("../models/withdrawal");
const User = require("../models/user");
const Transaction = require("../models/transaction");


// ======================================================
// CONFIGURATION
// ======================================================

const MIN_WITHDRAWAL = 500;

const PLATFORM_FEE_PERCENT = 3;

const MAX_REJECTION_REASON_LENGTH = 500;

const MAX_ALERT_LENGTH = 1000;


// ======================================================
// HELPER - GET USER ID
// ======================================================

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?._id ||
        req.userId
    );

}


// ======================================================
// HELPER - GENERATE TRANSACTION ID
// ======================================================

function generateTxId(prefix = "WDR") {

    return (
        prefix +
        Date.now() +
        Math.floor(100 + Math.random() * 900)
    );

}


// ======================================================
// HELPER - ROUND MONEY
// ======================================================

function roundMoney(value) {

    return Number(Number(value).toFixed(2));

}


// ======================================================
// HELPER - ERROR RESPONSE
// ======================================================

function serverError(res, error, title) {

    console.error(title, error);

    return res.status(500).json({

        success: false,

        message:
            error.message ||
            "An unexpected server error occurred."

    });

}


// ======================================================
// USER - CREATE WITHDRAWAL
// ======================================================

exports.createWithdrawal = async (req, res) => {

    try {

        console.log("====================================");
        console.log("CREATE WITHDRAWAL");
        console.log("====================================");


        // ==============================================
        // USER ID
        // ==============================================

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }


        // ==============================================
        // FIND USER
        // ==============================================

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // ==============================================
        // CHECK WITHDRAWAL PERMISSION
        // ==============================================

        if (user.withdrawalEnabled === false) {

            return res.status(403).json({

                success: false,

                withdrawalDisabled: true,

                message:
                    "Your withdrawal permission is currently disabled.",

                alert:
                    "Withdrawal Temporarily Disabled",

                reason:
                    user.withdrawalDisabledReason ||
                    "Please contact customer support.",

                disabledReason:
                    user.withdrawalDisabledReason || "",

                disabledAlert:
                    user.withdrawalDisabledAlert || "",

                disabledAt:
                    user.withdrawalDisabledAt || null

            });

        }


        // ==============================================
        // REQUEST BODY
        // ==============================================

        const {

            amount,

            paymentMethod,

            paymentDetails = {}

        } = req.body || {};


        // ==============================================
        // AMOUNT VALIDATION
        // ==============================================

        const withdrawAmount = Number(amount);

        if (
            !Number.isFinite(withdrawAmount) ||
            withdrawAmount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid withdrawal amount."

            });

        }


        const finalAmount = roundMoney(withdrawAmount);

        if (finalAmount < MIN_WITHDRAWAL) {

            return res.status(400).json({

                success: false,

                message:
                    `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`

            });

        }


        // ==============================================
        // PAYMENT METHOD VALIDATION
        // ==============================================

        if (!["UPI", "Bank"].includes(paymentMethod)) {

            return res.status(400).json({

                success: false,

                message: "Invalid payment method."

            });

        }


        // ==============================================
        // WALLET BALANCE
        // ==============================================

        const currentBalance =
            Number(user.balance || 0);

        if (
            !Number.isFinite(currentBalance) ||
            finalAmount > currentBalance
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Insufficient wallet balance. Available balance: ₹${currentBalance}`

            });

        }


        // ==============================================
        // CLEAN PAYMENT DETAILS
        // ==============================================

        const submittedDetails =
            paymentDetails &&
            typeof paymentDetails === "object"
                ? paymentDetails
                : {};


        const ifscCode = String(
            submittedDetails.ifscCode ||
            submittedDetails.ifsc ||
            ""
        ).trim().toUpperCase();


        const cleanPaymentDetails = {

            upiId:
                paymentMethod === "UPI"
                    ? String(
                        submittedDetails.upiId || ""
                    ).trim()
                    : "",

            accountHolder:
                paymentMethod === "Bank"
                    ? String(
                        submittedDetails.accountHolder || ""
                    ).trim()
                    : "",

            bankName:
                paymentMethod === "Bank"
                    ? String(
                        submittedDetails.bankName || ""
                    ).trim()
                    : "",

            accountNumber:
                paymentMethod === "Bank"
                    ? String(
                        submittedDetails.accountNumber || ""
                    ).trim()
                    : "",

            ifsc: ifscCode,

            ifscCode: ifscCode

        };


        // ==============================================
        // UPI VALIDATION
        // ==============================================

        if (paymentMethod === "UPI") {

            if (!cleanPaymentDetails.upiId) {

                return res.status(400).json({

                    success: false,

                    message: "UPI ID is required."

                });

            }

            if (
                !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(
                    cleanPaymentDetails.upiId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message: "Please enter a valid UPI ID."

                });

            }

        }


        // ==============================================
        // BANK VALIDATION
        // ==============================================

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

                    message:
                        "Please enter a valid IFSC code."

                });

            }

        }


        // ==============================================
        // CHECK EXISTING PENDING WITHDRAWAL
        // ==============================================

        const existingPending =
            await Withdrawal.findOne({

                user: user._id,

                status: "Pending"

            });

        if (existingPending) {

            return res.status(400).json({

                success: false,

                message:
                    "You already have a pending withdrawal."

            });

        }


        // ==============================================
        // CALCULATE PLATFORM FEE
        // ==============================================

        const platformFeePercent =
            PLATFORM_FEE_PERCENT;

        const platformFee = roundMoney(
            finalAmount * platformFeePercent / 100
        );

        const netAmount = roundMoney(
            finalAmount - platformFee
        );


        // ==============================================
        // CREATE WITHDRAWAL
        // ==============================================

        const withdrawal = await Withdrawal.create({

            user: user._id,

            amount: finalAmount,

            platformFee: platformFee,

            platformFeePercent: platformFeePercent,

            netAmount: netAmount,

            paymentMethod,

            paymentDetails: cleanPaymentDetails,

            status: "Pending"

        });


        // ==============================================
        // RESERVE WALLET AMOUNT
        // ==============================================

        user.balance = roundMoney(
            currentBalance - finalAmount
        );

        user.totalWithdraw = roundMoney(
            Number(user.totalWithdraw || 0) +
            finalAmount
        );

        await user.save();


        // ==============================================
        // RESPONSE
        // ==============================================

        return res.status(201).json({

            success: true,

            message:
                "Withdrawal request submitted successfully.",

            withdrawal,

            balance: user.balance,

            calculation: {

                amount: finalAmount,

                platformFeePercent,

                platformFee,

                netAmount

            }

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "CREATE WITHDRAWAL ERROR:"
        );

    }

};


// ======================================================
// USER - MY WITHDRAWALS
// ======================================================

exports.getMyWithdrawals = async (req, res) => {

    try {

        // ==============================================
        // USER ID
        // ==============================================

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }


        // ==============================================
        // GET USER AND WITHDRAWALS
        // ==============================================

        const [withdrawals, user] = await Promise.all([

            Withdrawal.find({

                user: userId

            }).sort({

                createdAt: -1

            }),

            User.findById(userId).select(

                "withdrawalEnabled " +
                "withdrawalDisabledReason " +
                "withdrawalDisabledAlert " +
                "withdrawalDisabledAt"

            )

        ]);


        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // ==============================================
        // RESPONSE
        // ==============================================

        return res.json({

            success: true,

            withdrawals,

            withdrawalPermission: {

                enabled:
                    user.withdrawalEnabled !== false,

                disabledReason:
                    user.withdrawalDisabledReason || "",

                disabledAlert:
                    user.withdrawalDisabledAlert || "",

                disabledAt:
                    user.withdrawalDisabledAt || null

            }

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "MY WITHDRAWALS ERROR:"
        );

    }

};


// ======================================================
// ADMIN - GET ALL WITHDRAWALS
// ======================================================

exports.getAllWithdrawals = async (req, res) => {

    try {

        // ==============================================
        // FIND ALL WITHDRAWALS
        // ==============================================

        const withdrawals = await Withdrawal.find()

            .populate(

                "user",

                "name phone inviteCode " +
                "withdrawalEnabled " +
                "withdrawalDisabledReason " +
                "withdrawalDisabledAlert " +
                "withdrawalDisabledAt"

            )

            .sort({

                createdAt: -1

            });


        // ==============================================
        // FORMAT RESPONSE
        // ==============================================

        const formattedWithdrawals = withdrawals.map(
            withdrawal => {

                const paymentDetails =
                    withdrawal.paymentDetails || {};

                const user =
                    withdrawal.user || {};


                return {

                    _id: withdrawal._id,

                    user: user._id ? {

                        _id: user._id,

                        name: user.name || "",

                        phone: user.phone || "",

                        inviteCode: user.inviteCode || "",

                        withdrawalEnabled:
                            user.withdrawalEnabled !== false,

                        withdrawalDisabledReason:
                            user.withdrawalDisabledReason || "",

                        withdrawalDisabledAlert:
                            user.withdrawalDisabledAlert || "",

                        withdrawalDisabledAt:
                            user.withdrawalDisabledAt || null

                    } : null,


                    amount:
                        Number(withdrawal.amount || 0),

                    platformFee:
                        Number(withdrawal.platformFee || 0),

                    platformFeePercent:
                        Number(withdrawal.platformFeePercent || 0),

                    netAmount:
                        Number(withdrawal.netAmount || 0),


                    paymentMethod:
                        withdrawal.paymentMethod || "",


                    paymentDetails: {

                        upiId:
                            paymentDetails.upiId || "",

                        accountHolder:
                            paymentDetails.accountHolder || "",

                        bankName:
                            paymentDetails.bankName || "",

                        accountNumber:
                            paymentDetails.accountNumber || "",

                        ifscCode:
                            paymentDetails.ifscCode ||
                            paymentDetails.ifsc || ""

                    },


                    upiId:
                        paymentDetails.upiId || "",

                    accountHolder:
                        paymentDetails.accountHolder || "",

                    bankName:
                        paymentDetails.bankName || "",

                    accountNumber:
                        paymentDetails.accountNumber || "",

                    ifscCode:
                        paymentDetails.ifscCode ||
                        paymentDetails.ifsc || "",


                    status:
                        withdrawal.status || "Pending",

                    remark:
                        withdrawal.remark || "",

                    rejectionReason:
                        withdrawal.rejectionReason || "",

                    rejectionAlert:
                        withdrawal.rejectionAlert || "",


                    processedAt:
                        withdrawal.processedAt || null,

                    createdAt:
                        withdrawal.createdAt,

                    updatedAt:
                        withdrawal.updatedAt

                };

            }
        );


        return res.json({

            success: true,

            count: formattedWithdrawals.length,

            withdrawals: formattedWithdrawals

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "GET ALL WITHDRAWALS ERROR:"
        );

    }

};


// ======================================================
// ADMIN - APPROVE WITHDRAWAL
// ======================================================

exports.approveWithdrawal = async (req, res) => {

    try {

        // ==============================================
        // FIND WITHDRAWAL
        // ==============================================

        const withdrawal = await Withdrawal.findById(
            req.params.id
        );

        if (!withdrawal) {

            return res.status(404).json({

                success: false,

                message: "Withdrawal not found."

            });

        }


        // ==============================================
        // CHECK STATUS
        // ==============================================

        if (withdrawal.status !== "Pending") {

            return res.status(400).json({

                success: false,

                message: "Withdrawal already processed."

            });

        }


        // ==============================================
        // FIND USER
        // ==============================================

        const user = await User.findById(
            withdrawal.user
        );

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // ==============================================
        // ADMIN REMARK
        // ==============================================

        const remark = String(

            req.body?.remark ||
            "Withdrawal approved by admin."

        ).trim();


        // ==============================================
        // ENSURE LEGACY FINANCIAL FIELDS
        // ==============================================

        const amount = Number(withdrawal.amount || 0);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid withdrawal amount."

            });

        }


        if (
            withdrawal.netAmount === undefined ||
            withdrawal.netAmount === null
        ) {

            const feePercent = Number(
                withdrawal.platformFeePercent ??
                PLATFORM_FEE_PERCENT
            );

            const fee = roundMoney(
                amount * feePercent / 100
            );

            withdrawal.platformFeePercent = feePercent;

            withdrawal.platformFee = fee;

            withdrawal.netAmount = roundMoney(
                amount - fee
            );

        }


        // ==============================================
        // UPDATE STATUS
        // ==============================================

        withdrawal.status = "Approved";

        withdrawal.remark = remark;

        withdrawal.processedAt = new Date();


        await withdrawal.save();


        // ==============================================
        // CREATE TRANSACTION RECORD
        // ==============================================

        await Transaction.create({

            userId: user._id,

            txId: generateTxId("WD"),

            type: "Withdrawal",

            amount: -amount,

            description:
                "Withdrawal approved successfully."

        });


        // ==============================================
        // RESPONSE
        // ==============================================

        return res.json({

            success: true,

            message:
                "Withdrawal approved successfully.",

            withdrawal,

            balance: user.balance

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "APPROVE WITHDRAWAL ERROR:"
        );

    }

};


// ======================================================
// ADMIN - REJECT WITHDRAWAL
// ======================================================

exports.rejectWithdrawal = async (req, res) => {

    try {

        // ==============================================
        // FIND WITHDRAWAL
        // ==============================================

        const withdrawal = await Withdrawal.findById(
            req.params.id
        );

        if (!withdrawal) {

            return res.status(404).json({

                success: false,

                message: "Withdrawal not found."

            });

        }


        // ==============================================
        // CHECK STATUS
        // ==============================================

        if (withdrawal.status !== "Pending") {

            return res.status(400).json({

                success: false,

                message: "Withdrawal already processed."

            });

        }


        // ==============================================
        // FIND USER
        // ==============================================

        const user = await User.findById(
            withdrawal.user
        );

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // ==============================================
        // VALIDATE AMOUNT
        // ==============================================

        const amount = Number(withdrawal.amount || 0);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid withdrawal amount."

            });

        }


        // ==============================================
        // ADMIN REJECTION REASON
        // ==============================================

        const rejectionReason = String(

            req.body?.rejectionReason ||
            req.body?.remark ||
            ""

        ).trim();


        if (!rejectionReason) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a withdrawal rejection reason."

            });

        }


        if (
            rejectionReason.length >
            MAX_REJECTION_REASON_LENGTH
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Rejection reason cannot exceed 500 characters."

            });

        }


        // ==============================================
        // SEPARATE USER ALERT
        // ==============================================

        const rejectionAlert = String(

            req.body?.rejectionAlert || ""

        ).trim();


        if (!rejectionAlert) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a separate user alert message."

            });

        }


        if (
            rejectionAlert.length >
            MAX_ALERT_LENGTH
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Alert message cannot exceed 1000 characters."

            });

        }


        // ==============================================
        // ENSURE LEGACY FINANCIAL FIELDS
        // ==============================================

        if (
            withdrawal.netAmount === undefined ||
            withdrawal.netAmount === null
        ) {

            const feePercent = Number(
                withdrawal.platformFeePercent ??
                PLATFORM_FEE_PERCENT
            );

            const fee = roundMoney(
                amount * feePercent / 100
            );

            withdrawal.platformFeePercent = feePercent;

            withdrawal.platformFee = fee;

            withdrawal.netAmount = roundMoney(
                amount - fee
            );

        }


        // ==============================================
        // REFUND USER WALLET
        // ==============================================

        user.balance = roundMoney(

            Number(user.balance || 0) + amount

        );


        user.totalWithdraw = Math.max(

            0,

            roundMoney(
                Number(user.totalWithdraw || 0) - amount
            )

        );


        // ==============================================
        // DISABLE FUTURE WITHDRAWALS
        // ==============================================

        user.withdrawalEnabled = false;

        user.withdrawalDisabledReason =
            rejectionReason;

        user.withdrawalDisabledAlert =
            rejectionAlert;

        user.withdrawalDisabledAt = new Date();


        // ==============================================
        // UPDATE WITHDRAWAL
        // ==============================================

        withdrawal.status = "Rejected";

        withdrawal.remark = rejectionReason;

        withdrawal.rejectionReason =
            rejectionReason;

        withdrawal.rejectionAlert =
            rejectionAlert;

        withdrawal.processedAt = new Date();


        // ==============================================
        // SAVE WITHDRAWAL AND USER
        // ==============================================

        await withdrawal.save();

        await user.save();


        // ==============================================
        // CREATE REFUND TRANSACTION
        // ==============================================

        await Transaction.create({

            userId: user._id,

            txId: generateTxId("REF"),

            type: "Withdrawal Refund",

            amount: amount,

            description:
                "Withdrawal rejected. Amount returned to wallet."

        });


        // ==============================================
        // RESPONSE
        // ==============================================

        return res.status(200).json({

            success: true,

            message:
                "Withdrawal rejected. Amount refunded and future withdrawals disabled.",

            balance: user.balance,

            withdrawal: {

                _id: withdrawal._id,

                user: withdrawal.user,

                amount: withdrawal.amount,

                status: withdrawal.status,

                rejectionReason:
                    withdrawal.rejectionReason,

                rejectionAlert:
                    withdrawal.rejectionAlert,

                processedAt:
                    withdrawal.processedAt

            },

            withdrawalPermission: {

                enabled: false,

                disabledReason:
                    user.withdrawalDisabledReason,

                disabledAlert:
                    user.withdrawalDisabledAlert,

                disabledAt:
                    user.withdrawalDisabledAt

            }

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "REJECT WITHDRAWAL ERROR:"
        );

    }

};


// ======================================================
// ADMIN - ENABLE USER WITHDRAWAL
// ======================================================

exports.enableUserWithdrawal = async (req, res) => {

    try {

        const { userId } = req.params;


        // ==============================================
        // VALIDATE USER ID
        // ==============================================

        if (!mongoose.isValidObjectId(userId)) {

            return res.status(400).json({

                success: false,

                message: "Invalid user ID."

            });

        }


        // ==============================================
        // FIND USER
        // ==============================================

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // ==============================================
        // ENABLE WITHDRAWAL
        // ==============================================

        user.withdrawalEnabled = true;

        user.withdrawalDisabledReason = "";

        user.withdrawalDisabledAlert = "";

        user.withdrawalDisabledAt = null;


        await user.save();


        // ==============================================
        // RESPONSE
        // ==============================================

        return res.json({

            success: true,

            message:
                "User withdrawal facility enabled successfully.",

            user: {

                _id: user._id,

                name: user.name,

                phone: user.phone,

                withdrawalEnabled: true,

                withdrawalDisabledReason: "",

                withdrawalDisabledAlert: "",

                withdrawalDisabledAt: null

            }

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "ENABLE USER WITHDRAWAL ERROR:"
        );

    }

};


// ======================================================
// ADMIN - DISABLE USER WITHDRAWAL
// ======================================================

exports.disableUserWithdrawal = async (req, res) => {

    try {

        const { userId } = req.params;


        // ==============================================
        // VALIDATE USER ID
        // ==============================================

        if (!mongoose.isValidObjectId(userId)) {

            return res.status(400).json({

                success: false,

                message: "Invalid user ID."

            });

        }


        // ==============================================
        // FIND USER
        // ==============================================

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // ==============================================
        // ADMIN RESTRICTION REASON
        // ==============================================

        const reason = String(

            req.body?.reason ||
            req.body?.withdrawalDisabledReason ||
            ""

        ).trim();


        if (!reason) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a withdrawal restriction reason."

            });

        }


        if (reason.length > MAX_REJECTION_REASON_LENGTH) {

            return res.status(400).json({

                success: false,

                message:
                    "Restriction reason cannot exceed 500 characters."

            });

        }


        // ==============================================
        // SEPARATE USER ALERT
        // ==============================================

        const alert = String(

            req.body?.alert ||
            req.body?.withdrawalDisabledAlert ||
            ""

        ).trim();


        if (!alert) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a separate user alert message."

            });

        }


        if (alert.length > MAX_ALERT_LENGTH) {

            return res.status(400).json({

                success: false,

                message:
                    "Alert message cannot exceed 1000 characters."

            });

        }


        // ==============================================
        // DISABLE WITHDRAWAL
        // ==============================================

        user.withdrawalEnabled = false;

        user.withdrawalDisabledReason = reason;

        user.withdrawalDisabledAlert = alert;

        user.withdrawalDisabledAt = new Date();


        await user.save();


        // ==============================================
        // RESPONSE
        // ==============================================

        return res.json({

            success: true,

            message:
                "User withdrawal facility disabled successfully.",

            user: {

                _id: user._id,

                name: user.name,

                phone: user.phone,

                withdrawalEnabled: false,

                withdrawalDisabledReason: reason,

                withdrawalDisabledAlert: alert,

                withdrawalDisabledAt:
                    user.withdrawalDisabledAt

            }

        });


    } catch (error) {

        return serverError(
            res,
            error,
            "DISABLE USER WITHDRAWAL ERROR:"
        );

    }

};