// ======================================================
// TESLA WEALTH — INVESTMENT PURCHASE CONTROLLER
// ADMIN SETTINGS + PURCHASE REQUEST APPROVAL
// ======================================================

const mongoose = require("mongoose");

const User = require("../models/user");
const Plan = require("../models/plan");
const Investment = require("../models/investment");
const Transaction = require("../models/transaction");

const InvestmentPurchaseRequest = require(
    "../models/investmentPurchaseRequest"
);

// ======================================================
// HELPERS
// ======================================================

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function getAdminId(req) {
    return (
        req.admin?._id ||
        req.user?._id ||
        req.user?.id ||
        null
    );
}

function getUserSettingsResponse(user) {
    return {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        isBlocked: user.isBlocked,

        investmentPurchaseEnabled:
            user.investmentPurchaseEnabled !== false,

        investmentApprovalMode:
            user.investmentApprovalMode || "automatic",

        maxActiveInvestments:
            Number.isInteger(user.maxActiveInvestments)
                ? user.maxActiveInvestments
                : 10,

        investmentPurchaseNote:
            user.investmentPurchaseNote || "",

        activeInvestments:
            user.activeInvestments || 0
    };
}

// ======================================================
// ADMIN — GET INVESTMENT SETTINGS
// GET /api/investment/admin/users/:userId/settings
// ======================================================

exports.getUserInvestmentSettings = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const user = await User.findById(userId).select(
            [
                "name",
                "phone",
                "isBlocked",
                "investmentPurchaseEnabled",
                "investmentApprovalMode",
                "maxActiveInvestments",
                "investmentPurchaseNote",
                "activeInvestments"
            ].join(" ")
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            settings: getUserSettingsResponse(user)
        });

    } catch (error) {
        console.error(
            "GET INVESTMENT SETTINGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve investment settings."
        });
    }
};

// ======================================================
// ADMIN — UPDATE INVESTMENT SETTINGS
// PATCH /api/investment/admin/users/:userId/settings
// ======================================================

exports.updateUserInvestmentSettings = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const allowedFields = [
            "investmentPurchaseEnabled",
            "investmentApprovalMode",
            "maxActiveInvestments",
            "investmentPurchaseNote"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(
                    req.body || {},
                    field
                )
            ) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid investment settings were provided."
            });
        }

        // Validate purchase permission.
        if (
            "investmentPurchaseEnabled" in updates &&
            typeof updates.investmentPurchaseEnabled !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Purchase enabled must be true or false."
            });
        }

        // Validate approval mode.
        if (
            "investmentApprovalMode" in updates &&
            !["automatic", "manual"].includes(
                updates.investmentApprovalMode
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Approval mode must be automatic or manual."
            });
        }

        // Validate maximum active investments.
        if ("maxActiveInvestments" in updates) {
            const limit = updates.maxActiveInvestments;

            if (
                typeof limit !== "number" ||
                !Number.isInteger(limit) ||
                limit < 0 ||
                limit > 10000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Maximum active investments must be a whole number between 0 and 10000."
                });
            }
        }

        // Validate administrator purchase note.
        if ("investmentPurchaseNote" in updates) {
            if (
                typeof updates.investmentPurchaseNote !== "string" ||
                updates.investmentPurchaseNote.length > 500
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The purchase note must be at most 500 characters."
                });
            }

            updates.investmentPurchaseNote =
                updates.investmentPurchaseNote.trim();
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        ).select(
            [
                "name",
                "phone",
                "isBlocked",
                "investmentPurchaseEnabled",
                "investmentApprovalMode",
                "maxActiveInvestments",
                "investmentPurchaseNote",
                "activeInvestments"
            ].join(" ")
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        console.log("ADMIN UPDATED INVESTMENT SETTINGS", {
            adminId: getAdminId(req),
            userId: user._id,
            updates
        });

        return res.status(200).json({
            success: true,
            message:
                "Investment settings updated successfully.",
            settings: getUserSettingsResponse(user)
        });

    } catch (error) {
        console.error(
            "UPDATE INVESTMENT SETTINGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update investment settings."
        });
    }
};

// ======================================================
// ADMIN — LIST INVESTMENT PURCHASE REQUESTS
// GET /api/investment/admin/purchase-requests
//
// Optional query:
// ?status=Pending&page=1&limit=20
// ======================================================

exports.getPurchaseRequests = async (req, res) => {
    try {
        const requestedStatus = String(
            req.query.status || "Pending"
        );

        const allowedStatuses = [
            "Pending",
            "Approved",
            "Rejected",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(requestedStatus)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid purchase request status."
            });
        }

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(
                1,
                parseInt(req.query.limit, 10) || 20
            )
        );

        const filter = {
            status: requestedStatus
        };

        const [requests, total] = await Promise.all([
            InvestmentPurchaseRequest.find(filter)
                .populate(
                    "user",
                    "name phone isBlocked"
                )
                .populate(
                    "plan",
                    "name price status"
                )
                .populate(
                    "reviewedBy",
                    "name phone"
                )
                .sort({
                    createdAt: -1,
                    _id: -1
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            InvestmentPurchaseRequest.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error(
            "GET PURCHASE REQUESTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve purchase requests."
        });
    }
};

// ======================================================
// ADMIN — APPROVE PURCHASE REQUEST
// POST /api/investment/admin/purchase-requests/:requestId/approve
//
// Optional request body:
// {
//     "adminNote": "Approved after verification."
// }
//
// SAFEGUARDS:
// - Only pending requests can be approved.
// - Rechecks the user and current plan.
// - Checks the eligible deposit balance.
// - Checks the wallet balance.
// - Checks the active investment limit.
// - Creates investment and transaction together.
// - Updates the request inside the same DB transaction.
// ======================================================
// ======================================================
// ADMIN — APPROVE INVESTMENT PURCHASE REQUEST
// POST /api/investment/admin/purchase-requests/:requestId/approve
// ======================================================

exports.approvePurchaseRequest = async (req, res) => {
    const { requestId } = req.params;
    const adminId = getAdminId(req);

    if (!isValidObjectId(requestId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid purchase request ID."
        });
    }

    if (!adminId || !isValidObjectId(adminId)) {
        return res.status(401).json({
            success: false,
            message: "Administrator authentication required."
        });
    }

    const adminNote =
        typeof req.body?.adminNote === "string"
            ? req.body.adminNote.trim()
            : "";

    if (adminNote.length > 1000) {
        return res.status(400).json({
            success: false,
            message: "Administrator note cannot exceed 1000 characters."
        });
    }

    let session;

    try {
        session = await mongoose.startSession();

        let result = null;

        await session.withTransaction(async () => {
            // --------------------------------------------------
            // 1. Load the pending request.
            // --------------------------------------------------

            const request =
                await InvestmentPurchaseRequest.findOne({
                    _id: requestId,
                    status: "Pending"
                }).session(session);

            if (!request) {
                const error = new Error(
                    "This request does not exist or has already been processed."
                );
                error.code = "REQUEST_NOT_PENDING";
                throw error;
            }

            // --------------------------------------------------
            // 2. Load current user and plan.
            // --------------------------------------------------

            const user = await User.findById(
                request.user
            ).session(session);

            const plan = await Plan.findById(
                request.plan
            ).session(session);

            if (!user) {
                const error = new Error(
                    "The user associated with this request was not found."
                );
                error.code = "USER_NOT_FOUND";
                throw error;
            }

            if (user.isBlocked === true) {
                const error = new Error(
                    "The user account is blocked."
                );
                error.code = "USER_BLOCKED";
                throw error;
            }

            if (user.investmentPurchaseEnabled === false) {
                const error = new Error(
                    user.investmentPurchaseNote ||
                    "Investment purchases are disabled for this user."
                );
                error.code = "PURCHASE_DISABLED";
                throw error;
            }

            // Manual approval must still be enabled.
            if (user.investmentApprovalMode !== "manual") {
                const error = new Error(
                    "Manual approval is no longer enabled for this user."
                );
                error.code = "APPROVAL_MODE_CHANGED";
                throw error;
            }

            if (!plan || plan.status !== true) {
                const error = new Error(
                    "The investment plan is unavailable."
                );
                error.code = "PLAN_UNAVAILABLE";
                throw error;
            }

            // --------------------------------------------------
            // 3. Validate requested amount and current plan.
            // --------------------------------------------------

            const requestedAmount =
                Number(request.requestedAmount);

            const amount = Number(plan.price);
            const dailyIncome = Number(plan.dailyIncome);
            const duration = Number(plan.days);

            if (
                !Number.isFinite(requestedAmount) ||
                requestedAmount <= 0 ||
                !Number.isFinite(amount) ||
                amount <= 0 ||
                !Number.isFinite(dailyIncome) ||
                dailyIncome <= 0 ||
                !Number.isInteger(duration) ||
                duration <= 0
            ) {
                const error = new Error(
                    "The request or investment plan contains invalid values."
                );
                error.code = "INVALID_PLAN";
                throw error;
            }

            // Do not silently approve a different price.
            if (requestedAmount !== amount) {
                const error = new Error(
                    "The plan price has changed since this request was submitted. Reject this request and ask the user to submit a new one."
                );
                error.code = "PRICE_CHANGED";
                throw error;
            }

            // --------------------------------------------------
            // 4. Check the active investment limit.
            // --------------------------------------------------

            const activeCount =
                await Investment.countDocuments({
                    user: user._id,
                    status: "Running"
                }).session(session);

            const activeLimit =
                Number.isInteger(user.maxActiveInvestments) &&
                user.maxActiveInvestments >= 0
                    ? user.maxActiveInvestments
                    : 10;

            if (activeCount >= activeLimit) {
                const error = new Error(
                    `The user has reached the active investment limit of ${activeLimit}.`
                );
                error.code = "ACTIVE_LIMIT";
                throw error;
            }

            // --------------------------------------------------
            // 5. Verify eligible funds.
            // --------------------------------------------------

            const walletBalance =
                Number(user.balance ?? 0);

            const depositBalance =
                Number(user.investableDepositBalance ?? 0);

            if (
                !Number.isFinite(walletBalance) ||
                !Number.isFinite(depositBalance) ||
                walletBalance < amount ||
                depositBalance < amount
            ) {
                const error = new Error(
                    "Insufficient eligible deposit funds or wallet balance."
                );
                error.code = "INSUFFICIENT_FUNDS";
                throw error;
            }

            // --------------------------------------------------
            // 6. Conditionally deduct funds.
            // --------------------------------------------------

            const updatedUser =
                await User.findOneAndUpdate(
                    {
                        _id: user._id,
                        isBlocked: { $ne: true },
                        investmentPurchaseEnabled: { $ne: false },
                        investmentApprovalMode: "manual",
                        balance: { $gte: amount },
                        investableDepositBalance: {
                            $gte: amount
                        }
                    },
                    {
                        $inc: {
                            balance: -amount,
                            investableDepositBalance: -amount,
                            activeInvestments: 1,
                            dailyYield: dailyIncome
                        }
                    },
                    {
                        new: true,
                        session,
                        runValidators: true
                    }
                );

            if (!updatedUser) {
                const error = new Error(
                    "The user's account settings or balances changed. Please try again."
                );
                error.code = "BALANCE_OR_SETTINGS_CHANGED";
                throw error;
            }

            // --------------------------------------------------
            // 7. Create investment.
            // --------------------------------------------------

            const purchaseTime = new Date();

            const [investment] = await Investment.create(
                [
                    {
                        user: updatedUser._id,
                        plan: plan._id,
                        planName: plan.name,
                        image: plan.image || "",
                        amount,
                        dailyIncome,
                        duration,
                        totalIncome: dailyIncome * duration,
                        earned: 0,
                        remainingDays: duration,
                        purchaseDate: purchaseTime,
                        lastIncomeDate: null,
                        completedDate: null,
                        status: "Running"
                    }
                ],
                { session }
            );

            // --------------------------------------------------
            // 8. Create transaction record.
            // --------------------------------------------------

            const txId =
                "INV-" + new mongoose.Types.ObjectId().toString();

            const [transaction] = await Transaction.create(
                [
                    {
                        userId: updatedUser._id,
                        txId,
                        type: "Investment",
                        amount: -amount,
                        description:
                            `${plan.name} investment approved by administrator.`
                    }
                ],
                { session }
            );

            // --------------------------------------------------
            // 9. Mark request approved.
            // --------------------------------------------------

            const approvedRequest =
                await InvestmentPurchaseRequest.findOneAndUpdate(
                    {
                        _id: request._id,
                        status: "Pending"
                    },
                    {
                        $set: {
                            status: "Approved",
                            reviewedBy: adminId,
                            reviewedAt: new Date(),
                            processedAt: new Date(),
                            adminNote,
                            investment: investment._id,
                            transaction: transaction._id,
                            failureReason: ""
                        }
                    },
                    {
                        new: true,
                        session,
                        runValidators: true
                    }
                );

            if (!approvedRequest) {
                const error = new Error(
                    "This request has already been processed."
                );
                error.code = "REQUEST_RACE";
                throw error;
            }

            result = {
                request: approvedRequest,
                investment,
                transaction,
                user: updatedUser
            };
        });

        if (!result) {
            throw new Error(
                "The approval transaction did not complete."
            );
        }

        console.log("PURCHASE REQUEST APPROVED", {
            requestId,
            adminId,
            investmentId: result.investment._id
        });

        return res.status(200).json({
            success: true,
            message: "Investment request approved successfully.",
            request: result.request,
            investment: result.investment,
            transaction: result.transaction,
            user: {
                id: result.user._id,
                balance: result.user.balance,
                investableDepositBalance:
                    result.user.investableDepositBalance,
                activeInvestments:
                    result.user.activeInvestments,
                dailyYield: result.user.dailyYield
            }
        });

    } catch (error) {
        console.error(
            "APPROVE PURCHASE REQUEST ERROR:",
            error
        );

        const knownErrors = {
            REQUEST_NOT_PENDING: 409,
            USER_NOT_FOUND: 404,
            USER_BLOCKED: 403,
            PURCHASE_DISABLED: 403,
            APPROVAL_MODE_CHANGED: 409,
            PLAN_UNAVAILABLE: 400,
            INVALID_PLAN: 400,
            PRICE_CHANGED: 409,
            ACTIVE_LIMIT: 409,
            INSUFFICIENT_FUNDS: 400,
            BALANCE_OR_SETTINGS_CHANGED: 409,
            REQUEST_RACE: 409
        };

        if (knownErrors[error.code]) {
            return res.status(knownErrors[error.code]).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to approve the investment request."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// ======================================================
// ADMIN — REJECT PURCHASE REQUEST
// POST /api/investment/admin/purchase-requests/:requestId/reject
//
// Required body:
// {
//     "adminNote": "Reason for rejection."
// }
// ======================================================

exports.rejectPurchaseRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const adminId = getAdminId(req);

        if (!isValidObjectId(requestId)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid purchase request ID."
            });
        }

        if (!adminId || !isValidObjectId(adminId)) {
            return res.status(401).json({
                success: false,
                message:
                    "Administrator authentication required."
            });
        }

        const adminNote =
            typeof req.body?.adminNote === "string"
                ? req.body.adminNote.trim()
                : "";

        if (!adminNote) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide a reason for rejecting the request."
            });
        }

        if (adminNote.length > 1000) {
            return res.status(400).json({
                success: false,
                message:
                    "Administrator note cannot exceed 1000 characters."
            });
        }

        // Only Pending requests can be rejected.
        const request =
            await InvestmentPurchaseRequest.findOneAndUpdate(
                {
                    _id: requestId,
                    status: "Pending"
                },
                {
                    $set: {
                        status: "Rejected",

                        reviewedBy: adminId,
                        reviewedAt: new Date(),
                        processedAt: new Date(),

                        adminNote,
                        failureReason: adminNote
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!request) {
            return res.status(409).json({
                success: false,
                message:
                    "Request not found or it has already been processed."
            });
        }

        console.log("INVESTMENT REQUEST REJECTED", {
            requestId,
            adminId
        });

        return res.status(200).json({
            success: true,
            message:
                "Investment request rejected.",
            request
        });

    } catch (error) {
        console.error(
            "REJECT PURCHASE REQUEST ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to reject the investment request."
        });
    }
};