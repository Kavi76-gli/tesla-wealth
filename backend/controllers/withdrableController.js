// ======================================================
// WITHDRAWAL CONTROLLER
//
// BUSINESS RULE
// ------------------------------------------------------
// Wallet = actual available money.
//
// Investment principal is removed from wallet when an
// investment is purchased.
//
// Investment daily income is added to wallet.
//
// Therefore withdrawal can use the wallet balance.
//
// Minimum withdrawal: ₹500
// Platform fee: 3%
// Net payout: 97%
//
// On withdrawal request:
//     Gross amount is reserved from wallet.
//
// On approval:
//     No additional wallet deduction.
//
// On rejection:
//     Gross amount is returned to wallet.
//
// ======================================================

const Withdrawal =
    require("../models/withdrawal");

const User =
    require("../models/user");

const Transaction =
    require("../models/transaction");


// ======================================================
// HELPER - GET USER ID
// ======================================================

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?._id ||
        req.user?.userId ||
        req.userId
    );

}


// ======================================================
// GENERATE TRANSACTION ID
// ======================================================

function generateTxId() {

    return (
        "WDR" +
        Date.now() +
        Math.floor(
            100 + Math.random() * 900
        )
    );

}


// ======================================================
// USER - CREATE WITHDRAWAL
// ======================================================

exports.createWithdrawal = async (req, res) => {

    try {

        console.log(
            "===================================="
        );

        console.log(
            "===== CREATE WITHDRAWAL ====="
        );

        console.log(
            "===================================="
        );


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
        // REQUEST BODY
        // ==================================================

        const {
            amount,
            paymentMethod,
            paymentDetails = {}
        } = req.body || {};


        // ==================================================
        // AMOUNT
        // ==================================================

        const withdrawAmount =
            Number(amount);


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


        // ==================================================
        // MINIMUM WITHDRAWAL
        // ==================================================

        const MIN_WITHDRAWAL = 500;


        if (
            withdrawAmount <
            MIN_WITHDRAWAL
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`

            });

        }


        // ==================================================
        // PAYMENT METHOD
        // ==================================================

        if (
            !["UPI", "Bank"].includes(
                paymentMethod
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid payment method."

            });

        }


        // ==================================================
        // REAL WALLET BALANCE
        //
        // IMPORTANT:
        //
        // Investment returns are already added to wallet.
        //
        // Remaining uninvested deposit is also in wallet.
        //
        // Investment principal is NOT in wallet because it
        // was deducted when the investment was purchased.
        //
        // Therefore user.balance is the withdrawal source.
        // ==================================================

        const walletBalance =
            Number(
                user.balance || 0
            );


        console.log(
            "Wallet Balance:",
            walletBalance
        );

        console.log(
            "Withdrawal Requested:",
            withdrawAmount
        );


        // ==================================================
        // CHECK WALLET BALANCE
        // ==================================================

        if (
            withdrawAmount >
            walletBalance
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Insufficient wallet balance. Available: ₹${walletBalance}`,

                balance:
                    walletBalance

            });

        }


        // ==================================================
        // PLATFORM FEE
        // ==================================================

        const PLATFORM_FEE_PERCENT = 3;


        const platformFee =
            Number(
                (
                    withdrawAmount *
                    PLATFORM_FEE_PERCENT /
                    100
                ).toFixed(2)
            );


        // ==================================================
        // NET PAYOUT
        // ==================================================

        const netAmount =
            Number(
                (
                    withdrawAmount -
                    platformFee
                ).toFixed(2)
            );


        // ==================================================
        // PAYMENT DETAILS
        // ==================================================

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
                    )
                        .trim()
                        .toUpperCase()
                    : ""

        };


        // ==================================================
        // UPI VALIDATION
        // ==================================================

        if (
            paymentMethod === "UPI"
        ) {

            if (
                !cleanPaymentDetails.upiId
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "UPI ID is required."

                });

            }

        }


        // ==================================================
        // BANK VALIDATION
        // ==================================================

        if (
            paymentMethod === "Bank"
        ) {

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


        // ==================================================
        // CHECK PENDING WITHDRAWAL
        // ==================================================

        const existingPending =
            await Withdrawal.findOne({

                user:
                    user._id,

                status:
                    "Pending"

            });


        if (existingPending) {

            return res.status(400).json({

                success: false,

                message:
                    "You already have a pending withdrawal."

            });

        }


        // ==================================================
        // CREATE WITHDRAWAL
        // ==================================================

        const withdrawal =
            await Withdrawal.create({

                user:
                    user._id,

                amount:
                    withdrawAmount,

                platformFee:
                    platformFee,

                platformFeePercent:
                    PLATFORM_FEE_PERCENT,

                netAmount:
                    netAmount,

                paymentMethod:
                    paymentMethod,

                paymentDetails:
                    cleanPaymentDetails,

                status:
                    "Pending"

            });


        // ==================================================
        // RESERVE MONEY FROM WALLET
        //
        // IMPORTANT:
        //
        // We deduct the GROSS withdrawal amount.
        //
        // Example:
        //
        // Wallet ₹5,500
        // Request ₹5,000
        //
        // Wallet becomes ₹500.
        //
        // The 3% fee is taken from the requested ₹5,000.
        // Investor receives ₹4,850.
        //
        // We do NOT deduct ₹150 separately.
        // ==================================================

        user.balance =
            walletBalance -
            withdrawAmount;


        // ==================================================
        // TOTAL WITHDRAW
        // ==================================================

        user.totalWithdraw =
            Number(
                user.totalWithdraw || 0
            ) + withdrawAmount;


        await user.save();


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Withdrawal request submitted successfully.",

            withdrawal,

            grossAmount:
                withdrawAmount,

            platformFee:
                platformFee,

            platformFeePercent:
                PLATFORM_FEE_PERCENT,

            netAmount:
                netAmount,

            balance:
                Number(
                    user.balance || 0
                )

        });


    }

    catch (error) {

        console.error(
            "CREATE WITHDRAWAL ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Server error while creating withdrawal."

        });

    }

};


// ======================================================
// USER - MY WITHDRAWALS
// ======================================================

exports.getMyWithdrawals = async (req, res) => {

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


        const withdrawals =
            await Withdrawal.find({

                user:
                    userId

            }).sort({

                createdAt:
                    -1

            });


        return res.json({

            success: true,

            withdrawals

        });


    }

    catch (error) {

        console.error(
            "MY WITHDRAWALS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// ADMIN - GET ALL WITHDRAWALS
// ======================================================

exports.getAllWithdrawals = async (req, res) => {

    try {

        const withdrawals =
            await Withdrawal.find()

                .populate(
                    "user",
                    "name phone inviteCode balance"
                )

                .sort({
                    createdAt:
                        -1
                });


        const formattedWithdrawals =
            withdrawals.map(
                (withdrawal) => {

                    const paymentDetails =
                        withdrawal.paymentDetails || {};


                    return {

                        _id:
                            withdrawal._id,

                        user:
                            withdrawal.user || null,

                        amount:
                            Number(
                                withdrawal.amount || 0
                            ),

                        platformFee:
                            Number(
                                withdrawal.platformFee || 0
                            ),

                        platformFeePercent:
                            Number(
                                withdrawal.platformFeePercent || 0
                            ),

                        netAmount:
                            Number(
                                withdrawal.netAmount ||
                                withdrawal.amount ||
                                0
                            ),

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
                                paymentDetails.ifscCode || ""

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
                            paymentDetails.ifscCode || "",

                        status:
                            withdrawal.status ||
                            "Pending",

                        remark:
                            withdrawal.remark || "",

                        rejectionReason:
                            withdrawal.rejectionReason || "",

                        processedAt:
                            withdrawal.processedAt ||
                            null,

                        createdAt:
                            withdrawal.createdAt,

                        updatedAt:
                            withdrawal.updatedAt

                    };

                }
            );


        return res.json({

            success:
                true,

            count:
                formattedWithdrawals.length,

            withdrawals:
                formattedWithdrawals

        });


    }

    catch (error) {

        console.error(
            "GET ALL WITHDRAWALS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Server error while fetching withdrawals."

        });

    }

};


// ======================================================
// ADMIN - APPROVE WITHDRAWAL
// ======================================================

exports.approveWithdrawal = async (req, res) => {

    try {

        const withdrawal =
            await Withdrawal.findById(
                req.params.id
            );


        if (!withdrawal) {

            return res.status(404).json({

                success: false,

                message:
                    "Withdrawal not found."

            });

        }


        // ==================================================
        // ONLY PENDING CAN BE APPROVED
        // ==================================================

        if (
            withdrawal.status !==
            "Pending"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Withdrawal already processed."

            });

        }


        const user =
            await User.findById(
                withdrawal.user
            );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        const remark =
            req.body?.remark ||
            "Withdrawal approved by admin.";


        // ==================================================
        // APPROVE
        // ==================================================

        withdrawal.status =
            "Approved";

        withdrawal.remark =
            remark;

        withdrawal.processedAt =
            new Date();


        await withdrawal.save();


        // ==================================================
        // CREATE PAYOUT TRANSACTION
        // ==================================================

        await Transaction.create({

            userId:
                user._id,

            txId:
                generateTxId(),

            type:
                "Withdrawal",

            amount:
                -Number(
                    withdrawal.netAmount ||
                    withdrawal.amount ||
                    0
                ),

            description:
                `Withdrawal approved. Gross ₹${Number(
                    withdrawal.amount || 0
                )}, platform fee ₹${Number(
                    withdrawal.platformFee || 0
                )}, net payout ₹${Number(
                    withdrawal.netAmount ||
                    withdrawal.amount ||
                    0
                )}.`

        });


        return res.json({

            success:
                true,

            message:
                "Withdrawal approved successfully.",

            withdrawal,

            balance:
                Number(
                    user.balance || 0
                )

        });


    }

    catch (error) {

        console.error(
            "APPROVE WITHDRAWAL ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ======================================================
// ADMIN - REJECT WITHDRAWAL
// ======================================================

exports.rejectWithdrawal = async (req, res) => {

    try {

        const withdrawal =
            await Withdrawal.findById(
                req.params.id
            );


        if (!withdrawal) {

            return res.status(404).json({

                success: false,

                message:
                    "Withdrawal not found."

            });

        }


        // ==================================================
        // ONLY PENDING CAN BE REJECTED
        // ==================================================

        if (
            withdrawal.status !==
            "Pending"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Withdrawal already processed."

            });

        }


        const user =
            await User.findById(
                withdrawal.user
            );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        // ==================================================
        // REJECTION REASON
        // ==================================================

        const rejectionReason =
            String(
                req.body?.remark ||
                req.body?.rejectionReason ||
                ""
            ).trim();


        if (!rejectionReason) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a rejection reason."

            });

        }


        // ==================================================
        // GROSS AMOUNT
        // ==================================================

        const amount =
            Number(
                withdrawal.amount || 0
            );


        if (
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid withdrawal amount."

            });

        }


        // ==================================================
        // RETURN RESERVED MONEY TO WALLET
        //
        // The withdrawal was already deducted when the
        // request was created.
        //
        // Because the withdrawal is rejected, return the
        // complete gross amount.
        //
        // 3% fee is NOT charged.
        // ==================================================

        user.balance =
            Number(
                user.balance || 0
            ) + amount;


        // ==================================================
        // REVERSE TOTAL WITHDRAW
        // ==================================================

        user.totalWithdraw =
            Math.max(

                0,

                Number(
                    user.totalWithdraw || 0
                ) - amount

            );


        await user.save();


        // ==================================================
        // UPDATE WITHDRAWAL
        // ==================================================

        withdrawal.status =
            "Rejected";

        withdrawal.remark =
            rejectionReason;

        withdrawal.rejectionReason =
            rejectionReason;

        withdrawal.processedAt =
            new Date();


        await withdrawal.save();


        // ==================================================
        // REFUND TRANSACTION
        // ==================================================

        await Transaction.create({

            userId:
                user._id,

            txId:
                "REF" +
                Date.now() +
                Math.floor(
                    100 +
                    Math.random() * 900
                ),

            type:
                "Withdrawal Refund",

            amount:
                amount,

            description:
                "Withdrawal rejected. Wallet amount returned."

        });


        return res.json({

            success:
                true,

            message:
                "Withdrawal rejected and wallet amount returned.",

            balance:
                Number(
                    user.balance || 0
                ),

            withdrawal: {

                _id:
                    withdrawal._id,

                amount:
                    withdrawal.amount,

                platformFee:
                    withdrawal.platformFee,

                netAmount:
                    withdrawal.netAmount,

                status:
                    withdrawal.status,

                remark:
                    withdrawal.remark,

                rejectionReason:
                    withdrawal.rejectionReason,

                processedAt:
                    withdrawal.processedAt

            }

        });


    }

    catch (error) {

        console.error(
            "REJECT WITHDRAWAL ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};