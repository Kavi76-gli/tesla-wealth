const Deposit = require("../models/deposit");
const User = require("../models/user");
const Referral = require("../models/Referral");
const ReferralCommission = require("../models/ReferralCommission");
// ==========================================
// USER - CREATE DEPOSIT
// ==========================================

exports.createDeposit = async (req, res) => {

    try {

        const deposit = await Deposit.create({

            user: req.user.id,

            amount: req.body.amount,

            utr: req.body.utr,

            screenshot: req.file ? req.file.path : ""

        });

        res.status(201).json({

            success: true,

            message: "Deposit request submitted successfully.",

            deposit

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================================
// USER - MY DEPOSITS
// ==========================================

exports.getMyDeposits = async (req, res) => {

    try {

        const deposits = await Deposit.find({

            user: req.user.id

        }).sort({

            createdAt: -1

        });

        res.json({

            success: true,

            deposits

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================================
// ADMIN - ALL DEPOSITS
// ==========================================

exports.getAllDeposits = async (req, res) => {

    try {

        const deposits = await Deposit.find()

            .populate("user", "name phone")

            .sort({

                createdAt: -1

            });

        res.json({

            success: true,

            deposits

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================================
// ADMIN - APPROVE DEPOSIT
// ==========================================
// ==========================================
// ADMIN - APPROVE DEPOSIT
// ==========================================
// ==========================================
// ADMIN - APPROVE DEPOSIT
// WITH 5% REFERRAL COMMISSION
// ==========================================

exports.approveDeposit = async (req, res) => {
    try {

        const deposit =
            await Deposit.findById(req.params.id);

        if (!deposit) {
            return res.status(404).json({
                success: false,
                message: "Deposit not found."
            });
        }

        // ======================================
        // PREVENT DOUBLE APPROVAL
        // ======================================

        if (deposit.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "Deposit already processed."
            });
        }

        // ======================================
        // FIND DEPOSIT USER
        // ======================================

        const user =
            await User.findById(deposit.user);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const depositAmount =
            Number(deposit.amount);

        if (
            !Number.isFinite(depositAmount) ||
            depositAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid deposit amount."
            });
        }

        console.log(
            "========== APPROVE DEPOSIT =========="
        );

        console.log(
            "Deposit ID:",
            deposit._id.toString()
        );

        console.log(
            "User ID:",
            user._id.toString()
        );

        console.log(
            "Deposit Amount:",
            depositAmount
        );

        // ======================================
        // 1. APPROVE DEPOSIT
        // ======================================

        deposit.status = "Approved";

        await deposit.save();

        // ======================================
        // 2. CREDIT INVESTOR
        // ======================================

        user.balance =
            Number(user.balance || 0) +
            depositAmount;

        user.totalDeposit =
            Number(user.totalDeposit || 0) +
            depositAmount;

        await user.save();

        // ======================================
        // 3. FIND REFERRAL
        // ======================================

        const referral =
            await Referral.findOne({
                referredUser: user._id,
                status: {
                    $in: [
                        "Pending",
                        "Completed"
                    ]
                }
            });

        let referralCommission = 0;

        // ======================================
        // 4. REFERRER EXISTS
        // ======================================

        if (referral) {

            console.log(
                "Referral Found:",
                referral._id.toString()
            );

            console.log(
                "Referrer:",
                referral.referrer.toString()
            );

            // ==================================
            // CALCULATE 5%
            // ==================================

            referralCommission =
                Math.round(
                    depositAmount * 0.05 * 100
                ) / 100;

            console.log(
                "Referral Commission:",
                referralCommission
            );

            if (referralCommission > 0) {

                // ==============================
                // DUPLICATE PROTECTION
                // ==============================

                const existingCommission =
                    await ReferralCommission.findOne({
                        deposit: deposit._id
                    });

                if (!existingCommission) {

                    // ==========================
                    // FIND REFERRER
                    // ==========================

                    const referrer =
                        await User.findById(
                            referral.referrer
                        );

                    if (referrer) {

                        // ======================
                        // CREDIT REFERRER
                        // ======================

                        referrer.balance =
                            Number(
                                referrer.balance || 0
                            ) +
                            referralCommission;

                        referrer.referralEarnings =
                            Number(
                                referrer.referralEarnings || 0
                            ) +
                            referralCommission;

                        await referrer.save();

                        // ======================
                        // SAVE COMMISSION RECORD
                        // ======================

                        try {

                            await ReferralCommission.create({
                                referral:
                                    referral._id,

                                referrer:
                                    referral.referrer,

                                referredUser:
                                    referral.referredUser,

                                deposit:
                                    deposit._id,

                                depositAmount:
                                    depositAmount,

                                commissionRate: 5,

                                commissionAmount:
                                    referralCommission,

                                status:
                                    "Credited"
                            });

                            // ==================
                            // UPDATE REFERRAL
                            // ==================

                            await Referral.findByIdAndUpdate(
                                referral._id,
                                {
                                    $inc: {
                                        totalCommission:
                                            referralCommission,

                                        qualifyingDeposits: 1
                                    },

                                    $set: {
                                        status:
                                            "Completed",

                                        completedAt:
                                            new Date()
                                    }
                                }
                            );

                            console.log(
                                "✅ Referral commission credited:",
                                referralCommission
                            );

                        } catch (commissionError) {

                            // ==================================
                            // DUPLICATE KEY PROTECTION
                            // ==================================

                            if (
                                commissionError.code === 11000
                            ) {

                                console.log(
                                    "⚠️ Commission already exists for this deposit."
                                );

                            } else {

                                console.error(
                                    "Referral commission save error:",
                                    commissionError
                                );

                                // IMPORTANT:
                                // Deposit itself remains approved.
                                // Log this for manual reconciliation.
                            }
                        }

                    } else {

                        console.log(
                            "⚠️ Referrer user not found."
                        );
                    }

                } else {

                    console.log(
                        "⚠️ Referral commission already processed for this deposit."
                    );
                }
            }
        } else {

            console.log(
                "No referral found for this investor."
            );
        }

        // ======================================
        // GET UPDATED USER
        // ======================================

        const updatedUser =
            await User.findById(user._id);

        console.log(
            "Saved Balance:",
            updatedUser.balance
        );

        console.log(
            "Saved Total Deposit:",
            updatedUser.totalDeposit
        );

        console.log(
            "====================================="
        );

        // ======================================
        // RESPONSE
        // ======================================

        return res.json({

            success: true,

            message:
                "Deposit approved successfully.",

            balance:
                updatedUser.balance,

            totalDeposit:
                updatedUser.totalDeposit,

            referralCommission:
                referralCommission

        });

    } catch (error) {

        console.error(
            "Approve Deposit Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });
    }
};
// ==========================================
// ADMIN - REJECT DEPOSIT
// ==========================================

exports.rejectDeposit = async (req, res) => {

    try {

        const deposit = await Deposit.findById(req.params.id);

        if (!deposit) {

            return res.status(404).json({

                success: false,

                message: "Deposit not found"

            });

        }

        if (deposit.status !== "Pending") {

            return res.status(400).json({

                success: false,

                message: "Deposit already processed"

            });

        }

        deposit.status = "Rejected";

        deposit.remark = req.body.remark || "";

        await deposit.save();

        res.json({

            success: true,

            message: "Deposit rejected."

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const PaymentSetting = require("../models/paymentSetting");



// ==========================================
// DEFAULT PAYMENT SETTINGS
// ==========================================

// ==========================================
// DEFAULT PAYMENT SETTINGS
// ==========================================

const DEFAULT_PAYMENT_SETTINGS = {

    companyName:
        "Bitcoin Investment",

    paymentType:
        "UPI",

    upiId:
        "jaishrishyamji12@axl",

    accountHolder:
        "",

    bankName:
        "",

    accountNumber:
        "",

    ifscCode:
        "",

    minimumDeposit:
        500,

    maximumDeposit:
        100000,

    depositInstruction:
        "Please make the payment using the details below and enter the correct UTR number after payment."

};


// ==========================================
// GET PAYMENT SETTINGS
// ==========================================

exports.getPaymentSettings = async (req, res) => {

    try {

        let setting =
            await PaymentSetting.findOne();


        // ======================================
        // NO ADMIN SETTINGS
        // ======================================

        if (!setting) {

            return res.json({

                success: true,

                source: "default",

                setting:
                    DEFAULT_PAYMENT_SETTINGS

            });

        }


        // ======================================
        // ADMIN SETTINGS EXIST
        // ======================================

        const finalSetting = {

            companyName:
                setting.companyName ||
                DEFAULT_PAYMENT_SETTINGS.companyName,

            paymentType:
                setting.paymentType ||
                DEFAULT_PAYMENT_SETTINGS.paymentType,

            upiId:
                setting.upiId ||
                DEFAULT_PAYMENT_SETTINGS.upiId,

            accountHolder:
                setting.accountHolder ||
                DEFAULT_PAYMENT_SETTINGS.accountHolder,

            bankName:
                setting.bankName ||
                DEFAULT_PAYMENT_SETTINGS.bankName,

            accountNumber:
                setting.accountNumber ||
                DEFAULT_PAYMENT_SETTINGS.accountNumber,

            ifscCode:
                setting.ifscCode ||
                DEFAULT_PAYMENT_SETTINGS.ifscCode,

            minimumDeposit:
                setting.minimumDeposit ||
                DEFAULT_PAYMENT_SETTINGS.minimumDeposit,

            maximumDeposit:
                setting.maximumDeposit ||
                DEFAULT_PAYMENT_SETTINGS.maximumDeposit,

            depositInstruction:
                setting.depositInstruction ||
                DEFAULT_PAYMENT_SETTINGS.depositInstruction

        };


        // ======================================
        // RESPONSE
        // ======================================

        return res.json({

            success: true,

            source: "admin",

            setting:
                finalSetting

        });

    }

    catch (error) {

        console.error(
            "GET PAYMENT SETTINGS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to load payment settings."

        });

    }

};


// ==========================================
// UPDATE PAYMENT SETTINGS
// ==========================================

exports.updatePaymentSettings = async (req, res) => {

    try {

        console.log(
            "===== UPDATE PAYMENT SETTINGS ====="
        );

        console.log(
            "BODY:",
            req.body
        );


        let setting =
            await PaymentSetting.findOne();


        // ======================================
        // CREATE SETTINGS IF NOT EXISTS
        // ======================================

        if (!setting) {

            setting =
                new PaymentSetting();

        }


        // ======================================
        // COMPANY NAME
        // ======================================

        if (
            req.body.companyName !== undefined
        ) {

            setting.companyName =
                req.body.companyName;

        }


        // ======================================
        // PAYMENT TYPE
        // ======================================

        if (
            req.body.paymentType !== undefined
        ) {

            setting.paymentType =
                req.body.paymentType;

        }


        // ======================================
        // UPI ID
        // ======================================

        if (
            req.body.upiId !== undefined
        ) {

            setting.upiId =
                req.body.upiId;

        }


        // ======================================
        // ACCOUNT HOLDER
        // ======================================

        if (
            req.body.accountHolder !== undefined
        ) {

            setting.accountHolder =
                req.body.accountHolder;

        }


        // ======================================
        // BANK NAME
        // ======================================

        if (
            req.body.bankName !== undefined
        ) {

            setting.bankName =
                req.body.bankName;

        }


        // ======================================
        // ACCOUNT NUMBER
        // ======================================

        if (
            req.body.accountNumber !== undefined
        ) {

            setting.accountNumber =
                req.body.accountNumber;

        }


        // ======================================
        // IFSC CODE
        // ======================================

        if (
            req.body.ifscCode !== undefined
        ) {

            setting.ifscCode =
                req.body.ifscCode;

        }


        // ======================================
        // MINIMUM DEPOSIT
        // ======================================

        if (
            req.body.minimumDeposit !== undefined
        ) {

            const minimum =
                Number(
                    req.body.minimumDeposit
                );


            if (
                Number.isFinite(minimum) &&
                minimum > 0
            ) {

                setting.minimumDeposit =
                    minimum;

            }

        }


        // ======================================
        // MAXIMUM DEPOSIT
        // ======================================

        if (
            req.body.maximumDeposit !== undefined
        ) {

            const maximum =
                Number(
                    req.body.maximumDeposit
                );


            if (
                Number.isFinite(maximum) &&
                maximum > 0
            ) {

                setting.maximumDeposit =
                    maximum;

            }

        }


        // ======================================
        // DEPOSIT INSTRUCTION
        // ======================================

        if (
            req.body.depositInstruction !== undefined
        ) {

            setting.depositInstruction =
                req.body.depositInstruction;

        }


        // ======================================
        // SAVE
        // ======================================

        await setting.save();


        console.log(
            "✅ Payment settings saved successfully"
        );


        // ======================================
        // RESPONSE
        // ======================================

        return res.status(200).json({

            success: true,

            message:
                "Payment settings updated successfully.",

            source:
                "admin",

            setting: {

                companyName:
                    setting.companyName,

                paymentType:
                    setting.paymentType,

                upiId:
                    setting.upiId,

                accountHolder:
                    setting.accountHolder,

                bankName:
                    setting.bankName,

                accountNumber:
                    setting.accountNumber,

                ifscCode:
                    setting.ifscCode,

                minimumDeposit:
                    setting.minimumDeposit,

                maximumDeposit:
                    setting.maximumDeposit,

                depositInstruction:
                    setting.depositInstruction

            }

        });

    }

    catch (error) {

        console.error(
            "UPDATE PAYMENT SETTINGS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to update payment settings."

        });

    }

};