
"use strict";

const mongoose = require("mongoose");

const Deposit = require("../models/deposit");
const User = require("../models/user");
const Referral = require("../models/Referral");
const ReferralCommission = require("../models/ReferralCommission");
const PaymentSetting = require("../models/paymentSetting");

// ======================================================
// DEFAULT PAYMENT SETTINGS
// ======================================================

const DEFAULT_PAYMENT_SETTINGS = {
    companyName: "Tesla Wealth",
    paymentType: "UPI",
    upiId: "jaishrishyamji12@axl",
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    minimumDeposit: 500,
    maximumDeposit: 100000,
    depositInstruction:
        "Please make the payment using the details below and enter the correct UTR number after payment."
};

// ======================================================
// CONSTANTS
// ======================================================

const REFERRAL_COMMISSION_RATE = 5;

// ======================================================
// HELPERS
// ======================================================

function money(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round((number + Number.EPSILON) * 100) / 100;
}

function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function getErrorResponse(error, fallbackMessage) {
    if (error.statusCode) {
        return {
            statusCode: error.statusCode,
            message: error.message
        };
    }

    if (error.code === 11000) {
        return {
            statusCode: 409,
            message:
                "A duplicate record was detected. Please check the existing transaction before retrying."
        };
    }

    return {
        statusCode: 500,
        message: fallbackMessage
    };
}

// ======================================================
// USER — CREATE DEPOSIT
// ======================================================

exports.createDeposit = async (req, res) => {
    try {
        const amount = Number(req.body.amount);

        const utr =
            typeof req.body.utr === "string"
                ? req.body.utr.trim()
                : "";

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid deposit amount."
            });
        }

        if (!Number.isSafeInteger(amount * 100)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid deposit amount."
            });
        }

        if (!utr || utr.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid UTR number."
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Please log in to submit a deposit."
            });
        }

        const setting = await PaymentSetting.findOne().lean();

        const minimumDeposit = Number(
            setting?.minimumDeposit ??
            DEFAULT_PAYMENT_SETTINGS.minimumDeposit
        );

        const maximumDeposit = Number(
            setting?.maximumDeposit ??
            DEFAULT_PAYMENT_SETTINGS.maximumDeposit
        );

        if (
            !Number.isFinite(minimumDeposit) ||
            !Number.isFinite(maximumDeposit) ||
            minimumDeposit <= 0 ||
            maximumDeposit < minimumDeposit
        ) {
            console.error("INVALID PAYMENT SETTINGS:", {
                minimumDeposit,
                maximumDeposit
            });

            return res.status(500).json({
                success: false,
                message:
                    "Deposit settings are temporarily unavailable."
            });
        }

        if (amount < minimumDeposit) {
            return res.status(400).json({
                success: false,
                message:
                    `Minimum deposit amount is ₹${minimumDeposit}.`
            });
        }

        if (amount > maximumDeposit) {
            return res.status(400).json({
                success: false,
                message:
                    `Maximum deposit amount is ₹${maximumDeposit}.`
            });
        }

        const deposit = await Deposit.create({
            user: req.user.id,
            amount: money(amount),
            utr,
            screenshot: req.file ? req.file.path : "",
            status: "Pending"
        });

        return res.status(201).json({
            success: true,
            message: "Deposit request submitted successfully.",
            deposit
        });

    } catch (error) {
        console.error("CREATE DEPOSIT ERROR:", error);

        const response = getErrorResponse(
            error,
            "Unable to submit deposit request."
        );

        return res.status(response.statusCode).json({
            success: false,
            message: response.message
        });
    }
};

// ======================================================
// USER — MY DEPOSITS
// ======================================================

exports.getMyDeposits = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your deposits."
            });
        }

        const deposits = await Deposit.find({
            user: req.user.id
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            deposits
        });

    } catch (error) {
        console.error("GET MY DEPOSITS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load your deposits."
        });
    }
};

// ======================================================
// ADMIN — ALL DEPOSITS
// ======================================================

exports.getAllDeposits = async (req, res) => {
    try {
        const deposits = await Deposit.find()
            .populate("user", "name phone")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            deposits
        });

    } catch (error) {
        console.error("GET ALL DEPOSITS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load deposits."
        });
    }
};

// ======================================================
// ADMIN — APPROVE DEPOSIT
//
// Accounting:
//
// Deposit owner:
//   balance                   + deposit amount
//   totalDeposit              + deposit amount
//   investableDepositBalance  + deposit amount
//
// Referrer, when eligible:
//   balance                   + commission
//   referralEarnings          + commission
//   withdrawableEarnings      + commission
//
// Referral commission must never increase
// investableDepositBalance.
//
// Deposit status and financial updates are atomic.
// ======================================================

exports.approveDeposit = async (req, res) => {
    const depositId = req.params.id;

    if (!isValidObjectId(depositId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid deposit ID."
        });
    }

    const session = await mongoose.startSession();

    let result;

    try {
        await session.withTransaction(async () => {
            // ------------------------------------------
            // 1. CLAIM THE PENDING DEPOSIT
            // ------------------------------------------

            const deposit = await Deposit.findOneAndUpdate(
                {
                    _id: depositId,
                    status: "Pending"
                },
                {
                    $set: {
                        status: "Approved"
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!deposit) {
                const existing = await Deposit.findById(
                    depositId
                ).session(session);

                if (!existing) {
                    throw createHttpError(
                        404,
                        "Deposit not found."
                    );
                }

                throw createHttpError(
                    409,
                    "This deposit has already been processed."
                );
            }

            // ------------------------------------------
            // 2. VALIDATE AMOUNT AND OWNER
            // ------------------------------------------

            const depositAmount = money(deposit.amount);

            if (
                !Number.isFinite(depositAmount) ||
                depositAmount <= 0
            ) {
                throw createHttpError(
                    400,
                    "Invalid deposit amount."
                );
            }

            const owner = await User.findById(
                deposit.user
            ).session(session);

            if (!owner) {
                throw createHttpError(
                    404,
                    "Deposit owner not found."
                );
            }

            // ------------------------------------------
            // 3. CREDIT DEPOSIT OWNER
            // ------------------------------------------

            const updatedOwner = await User.findByIdAndUpdate(
                owner._id,
                {
                    $inc: {
                        balance: depositAmount,
                        totalDeposit: depositAmount,
                        investableDepositBalance: depositAmount
                    }
                },
                {
                    new: true,
                    runValidators: true,
                    session
                }
            );

            if (!updatedOwner) {
                throw new Error(
                    "Failed to update the deposit owner's wallet."
                );
            }

            // ------------------------------------------
            // 4. FIND ELIGIBLE REFERRAL
            // ------------------------------------------

            const referral = await Referral.findOne({
                referredUser: updatedOwner._id,
                status: {
                    $in: ["Pending", "Completed"]
                }
            }).session(session);

            let commissionAmount = 0;
            let commissionCredited = false;

            // ------------------------------------------
            // 5. PROCESS REFERRAL COMMISSION
            // ------------------------------------------

            if (referral) {
                commissionAmount = money(
                    depositAmount *
                    REFERRAL_COMMISSION_RATE / 100
                );

                if (commissionAmount > 0) {
                    const existingCommission =
                        await ReferralCommission.findOne({
                            deposit: deposit._id
                        }).session(session);

                    if (existingCommission) {
                        throw createHttpError(
                            409,
                            "A commission record already exists for this deposit. Please reconcile it before retrying."
                        );
                    }

                    const referrer = await User.findById(
                        referral.referrer
                    ).session(session);

                    if (!referrer) {
                        throw new Error(
                            "Referral owner not found."
                        );
                    }

                    // Record commission in the same transaction.

                    await ReferralCommission.create(
                        [
                            {
                                referral: referral._id,
                                referrer: referrer._id,
                                referredUser: updatedOwner._id,
                                deposit: deposit._id,
                                depositAmount,
                                commissionRate:
                                    REFERRAL_COMMISSION_RATE,
                                commissionAmount,
                                status: "Credited"
                            }
                        ],
                        { session }
                    );

                    // Commission is withdrawable reward money,
                    // not deposit principal.

                    const updatedReferrer =
                        await User.findByIdAndUpdate(
                            referrer._id,
                            {
                                $inc: {
                                    balance: commissionAmount,
                                    referralEarnings: commissionAmount,
                                    withdrawableEarnings: commissionAmount
                                }
                            },
                            {
                                new: true,
                                runValidators: true,
                                session
                            }
                        );

                    if (!updatedReferrer) {
                        throw new Error(
                            "Failed to credit referral commission."
                        );
                    }

                    const updatedReferral =
                        await Referral.findByIdAndUpdate(
                            referral._id,
                            {
                                $inc: {
                                    totalCommission: commissionAmount,
                                    qualifyingDeposits: 1
                                },
                                $set: {
                                    status: "Completed",
                                    completedAt: new Date()
                                }
                            },
                            {
                                new: true,
                                runValidators: true,
                                session
                            }
                        );

                    if (!updatedReferral) {
                        throw new Error(
                            "Failed to update referral totals."
                        );
                    }

                    commissionCredited = true;
                }
            }

            // ------------------------------------------
            // 6. SAVE RESULT
            // ------------------------------------------

            result = {
                depositId: deposit._id.toString(),
                userId: updatedOwner._id.toString(),
                depositAmount,

                balance: money(updatedOwner.balance),

                totalDeposit: money(
                    updatedOwner.totalDeposit
                ),

                investableDepositBalance: money(
                    updatedOwner.investableDepositBalance
                ),

                referralCommission:
                    commissionCredited
                        ? commissionAmount
                        : 0,

                referralCommissionCredited:
                    commissionCredited
            };
        });

        // ----------------------------------------------
        // 7. SUCCESS RESPONSE
        // ----------------------------------------------

        console.log("======================================");
        console.log("TESLA WEALTH — DEPOSIT APPROVED");
        console.log("Deposit ID:", result.depositId);
        console.log("User ID:", result.userId);
        console.log("Deposit Amount:", result.depositAmount);
        console.log("Wallet Balance:", result.balance);

        console.log(
            "Investable Deposit Balance:",
            result.investableDepositBalance
        );

        console.log(
            "Referral Commission:",
            result.referralCommission
        );

        console.log("======================================");

        return res.status(200).json({
            success: true,
            message: "Deposit approved successfully.",
            depositId: result.depositId,
            balance: result.balance,
            totalDeposit: result.totalDeposit,
            investableDepositBalance:
                result.investableDepositBalance,
            referralCommission:
                result.referralCommission,
            referralCommissionCredited:
                result.referralCommissionCredited
        });

    } catch (error) {
        console.error("APPROVE DEPOSIT ERROR:", error);

        const response = getErrorResponse(
            error,
            "Unable to complete deposit approval."
        );

        return res.status(response.statusCode).json({
            success: false,
            message: response.message
        });

    } finally {
        await session.endSession();
    }
};

// ======================================================
// ADMIN — REJECT DEPOSIT
// ======================================================

exports.rejectDeposit = async (req, res) => {
    try {
        const depositId = req.params.id;

        if (!isValidObjectId(depositId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid deposit ID."
            });
        }

        const remark =
            typeof req.body.remark === "string"
                ? req.body.remark.trim().slice(0, 500)
                : "";

        const deposit = await Deposit.findOneAndUpdate(
            {
                _id: depositId,
                status: "Pending"
            },
            {
                $set: {
                    status: "Rejected",
                    remark
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!deposit) {
            const existing = await Deposit.findById(
                depositId
            ).lean();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: "Deposit not found."
                });
            }

            return res.status(409).json({
                success: false,
                message:
                    "This deposit has already been processed."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Deposit rejected successfully.",
            deposit
        });

    } catch (error) {
        console.error("REJECT DEPOSIT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to reject deposit."
        });
    }
};

// ======================================================
// GET PAYMENT SETTINGS
// ======================================================

exports.getPaymentSettings = async (req, res) => {
    try {
        const setting = await PaymentSetting.findOne().lean();

        const finalSetting = {
            ...DEFAULT_PAYMENT_SETTINGS,
            ...(setting || {})
        };

        // Do not return internal MongoDB metadata.

        const publicSetting = {
            companyName: finalSetting.companyName,
            paymentType: finalSetting.paymentType,
            upiId: finalSetting.upiId,
            accountHolder: finalSetting.accountHolder,
            bankName: finalSetting.bankName,
            accountNumber: finalSetting.accountNumber,
            ifscCode: finalSetting.ifscCode,
            minimumDeposit: finalSetting.minimumDeposit,
            maximumDeposit: finalSetting.maximumDeposit,
            depositInstruction: finalSetting.depositInstruction
        };

        return res.status(200).json({
            success: true,
            source: setting ? "admin" : "default",
            setting: publicSetting
        });

    } catch (error) {
        console.error("GET PAYMENT SETTINGS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load payment settings."
        });
    }
};

// ======================================================
// UPDATE PAYMENT SETTINGS
// ======================================================

exports.updatePaymentSettings = async (req, res) => {
    try {
        let setting = await PaymentSetting.findOne();

        if (!setting) {
            setting = new PaymentSetting({
                ...DEFAULT_PAYMENT_SETTINGS
            });
        }

        const stringFields = [
            "companyName",
            "paymentType",
            "upiId",
            "accountHolder",
            "bankName",
            "accountNumber",
            "ifscCode",
            "depositInstruction"
        ];

        for (const field of stringFields) {
            if (req.body[field] !== undefined) {
                if (typeof req.body[field] !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be a string.`
                    });
                }

                setting[field] = req.body[field].trim();
            }
        }

        if (req.body.minimumDeposit !== undefined) {
            const minimum = Number(req.body.minimumDeposit);

            if (!Number.isFinite(minimum) || minimum <= 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Minimum deposit must be greater than zero."
                });
            }

            setting.minimumDeposit = money(minimum);
        }

        if (req.body.maximumDeposit !== undefined) {
            const maximum = Number(req.body.maximumDeposit);

            if (!Number.isFinite(maximum) || maximum <= 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Maximum deposit must be greater than zero."
                });
            }

            setting.maximumDeposit = money(maximum);
        }

        const minimumDeposit = Number(
            setting.minimumDeposit ??
            DEFAULT_PAYMENT_SETTINGS.minimumDeposit
        );

        const maximumDeposit = Number(
            setting.maximumDeposit ??
            DEFAULT_PAYMENT_SETTINGS.maximumDeposit
        );

        if (minimumDeposit > maximumDeposit) {
            return res.status(400).json({
                success: false,
                message:
                    "Minimum deposit cannot exceed maximum deposit."
            });
        }

        await setting.save();

        return res.status(200).json({
            success: true,
            message: "Payment settings updated successfully.",
            source: "admin",
            setting: {
                companyName: setting.companyName,
                paymentType: setting.paymentType,
                upiId: setting.upiId,
                accountHolder: setting.accountHolder,
                bankName: setting.bankName,
                accountNumber: setting.accountNumber,
                ifscCode: setting.ifscCode,
                minimumDeposit: setting.minimumDeposit,
                maximumDeposit: setting.maximumDeposit,
                depositInstruction: setting.depositInstruction
            }
        });

    } catch (error) {
        console.error("UPDATE PAYMENT SETTINGS ERROR:", error);

        const response = getErrorResponse(
            error,
            "Unable to update payment settings."
        );

        return res.status(response.statusCode).json({
            success: false,
            message: response.message
        });
    }
};

