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
// INVESTMENT ADMIN SETTINGS + ACTIVITY LOG MODELS
// ======================================================

const InvestmentAdminSettings = require(
    "../models/investmentAdminSettings"
);

const InvestmentAdminActivity = require(
    "../models/investmentAdminActivity"
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
            // 1. Load the pending purchase request.
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
            // 2. Load global settings BEFORE using them.
            // --------------------------------------------------

            const globalSettings =
                await InvestmentAdminSettings.findOne({
                    key: "global"
                }).session(session);

            // Missing settings use the model's established
            // default behavior. Existing restrictions are enforced.
            if (
                globalSettings &&
                globalSettings.investmentPurchaseEnabled === false
            ) {
                const error = new Error(
                    globalSettings.investmentPurchaseNote ||
                    globalSettings.restrictionNote ||
                    "Investment purchases are temporarily disabled."
                );

                error.code = "GLOBAL_PURCHASE_DISABLED";
                throw error;
            }

            // --------------------------------------------------
            // 3. Load the user and plan.
            // --------------------------------------------------

            const user = await User.findById(
                request.user
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

            const plan = await Plan.findById(
                request.plan
            ).session(session);

            // Check that the plan exists BEFORE accessing its fields.
            if (!plan || plan.status !== true) {
                const error = new Error(
                    "The investment plan is unavailable."
                );

                error.code = "PLAN_UNAVAILABLE";
                throw error;
            }

            if (plan.purchaseEnabled === false) {
                const error = new Error(
                    plan.restrictionNote ||
                    "New purchases for this investment plan are disabled."
                );

                error.code = "PLAN_PURCHASE_DISABLED";
                throw error;
            }

            // --------------------------------------------------
            // 4. Verify the effective approval policy.
            //
            // Manual approval applies when the global setting,
            // user setting, OR plan setting requires it.
            //
            // A global automatic default does not silently
            // override a user or plan manual requirement.
            // --------------------------------------------------

            const globalMode =
                globalSettings?.investmentApprovalMode || "automatic";

            const userMode =
                user.investmentApprovalMode || "automatic";

            const requiresManualApproval =
                globalMode === "manual" ||
                userMode === "manual" ||
                plan.requireManualApproval === true;

            if (!requiresManualApproval) {
                const error = new Error(
                    "Current settings no longer require manual approval for this purchase."
                );

                error.code = "APPROVAL_MODE_CHANGED";
                throw error;
            }

            // --------------------------------------------------
            // 5. Validate the current plan values and price.
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

            if (requestedAmount !== amount) {
                const error = new Error(
                    "The plan price has changed since this request was submitted. Reject this request and ask the user to submit a new one."
                );

                error.code = "PRICE_CHANGED";
                throw error;
            }

            // --------------------------------------------------
            // 6. Enforce the strictest overall active limit.
            //
            // The lower configured positive limit wins.
            // A configured limit of zero prohibits new purchases.
            // --------------------------------------------------

            const activeCount =
                await Investment.countDocuments({
                    user: user._id,
                    status: "Running"
                }).session(session);

            const overallLimits = [];

            if (
                Number.isInteger(globalSettings?.maxActiveInvestments)
            ) {
                overallLimits.push(
                    globalSettings.maxActiveInvestments
                );
            }

            if (
                Number.isInteger(user.maxActiveInvestments)
            ) {
                overallLimits.push(
                    user.maxActiveInvestments
                );
            }

            // Preserve the existing user default when the field
            // is absent. Global settings default to 10 in the model.
            if (
                !Number.isInteger(user.maxActiveInvestments) &&
                !globalSettings
            ) {
                overallLimits.push(10);
            }

            const activeLimit =
                overallLimits.length > 0
                    ? Math.min(...overallLimits)
                    : 10;

            if (activeCount >= activeLimit) {
                const error = new Error(
                    `The user has reached the active investment limit of ${activeLimit}.`
                );

                error.code = "ACTIVE_LIMIT";
                throw error;
            }

            // --------------------------------------------------
            // 7. Enforce the active limit for this specific plan.
            //
            // Zero means no additional limit at that scope.
            // If both limits are positive, the lower one wins.
            // --------------------------------------------------

            const activePlanCount =
                await Investment.countDocuments({
                    user: user._id,
                    plan: plan._id,
                    status: "Running"
                }).session(session);

            const planLimits = [
                Number(globalSettings?.maxActivePerPlan || 0),
                Number(plan.maxActivePerUser || 0)
            ].filter(
                limit =>
                    Number.isInteger(limit) &&
                    limit > 0
            );

            const effectivePlanLimit =
                planLimits.length > 0
                    ? Math.min(...planLimits)
                    : 0;

            if (
                effectivePlanLimit > 0 &&
                activePlanCount >= effectivePlanLimit
            ) {
                const error = new Error(
                    `The user has reached the active investment limit of ${effectivePlanLimit} for this plan.`
                );

                error.code = "PLAN_ACTIVE_LIMIT";
                throw error;
            }

            // --------------------------------------------------
            // 8. Enforce completed-plan repurchase restrictions.
            // --------------------------------------------------

            const repurchaseAllowed =
                globalSettings?.allowRepurchaseAfterCompletion !== false &&
                plan.allowRepurchaseAfterCompletion !== false;

            if (!repurchaseAllowed) {
                const completedInvestment =
                    await Investment.findOne({
                        user: user._id,
                        plan: plan._id,
                        status: "Completed"
                    })
                    .select("_id")
                    .session(session);

                if (completedInvestment) {
                    const error = new Error(
                        "You cannot purchase this plan again after completing it. Please contact customer support."
                    );

                    error.code = "REPURCHASE_NOT_ALLOWED";
                    throw error;
                }
            }

            // --------------------------------------------------
            // 9. Verify eligible funds.
            //
            // Both balances must be sufficient.
            // Do not substitute daily income or referral
            // commissions for eligible deposit principal.
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
            // 10. Atomically deduct funds and update user counters.
            // --------------------------------------------------

            const updatedUser =
                await User.findOneAndUpdate(
                    {
                        _id: user._id,
                        isBlocked: { $ne: true },
                        investmentPurchaseEnabled: { $ne: false },
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
            // 11. Create the investment.
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
            // 12. Create the financial transaction.
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
            // 13. Mark the request approved.
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

        // Audit logging occurs after the financial transaction commits.
        await recordInvestmentAdminActivity(
            req,
            "Approved investment purchase request",
            result.investment.planName,
            result.investment._id,
            JSON.stringify({
                requestId,
                userId: result.user._id,
                amount: result.investment.amount,
                transactionId: result.transaction._id
            })
        );

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
            GLOBAL_PURCHASE_DISABLED: 403,
            PLAN_UNAVAILABLE: 400,
            PLAN_PURCHASE_DISABLED: 403,
            APPROVAL_MODE_CHANGED: 409,
            INVALID_PLAN: 400,
            PRICE_CHANGED: 409,
            ACTIVE_LIMIT: 409,
            PLAN_ACTIVE_LIMIT: 409,
            REPURCHASE_NOT_ALLOWED: 403,
            INSUFFICIENT_FUNDS: 400,
            BALANCE_OR_SETTINGS_CHANGED: 409,
            REQUEST_RACE: 409
        };

        if (knownErrors[error.code]) {
            return res.status(
                knownErrors[error.code]
            ).json({
                success: false,
                message: error.message,
                code: error.code
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to approve the investment request."
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

// ======================================================
// TESLA WEALTH — GLOBAL INVESTMENT ADMIN CONTROLS
// ======================================================

// ======================================================
// HELPERS — GLOBAL SETTINGS
// ======================================================

async function getOrCreateGlobalInvestmentSettings() {
    return InvestmentAdminSettings.findOneAndUpdate(
        { key: "global" },
        {
            $setOnInsert: {
                key: "global",
                investmentPurchaseEnabled: true,
                investmentApprovalMode: "automatic",
                maxActiveInvestments: 10,
                investmentPurchaseNote: "",
                maxActivePerPlan: 0,
                allowRepurchaseAfterCompletion: true,
                restrictionNote: ""
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true
        }
    );
}

function globalSettingsResponse(settings) {
    return {
        investmentPurchaseEnabled:
            settings.investmentPurchaseEnabled,

        investmentApprovalMode:
            settings.investmentApprovalMode,

        maxActiveInvestments:
            settings.maxActiveInvestments,

        investmentPurchaseNote:
            settings.investmentPurchaseNote || "",

        maxActivePerPlan:
            settings.maxActivePerPlan,

        allowRepurchaseAfterCompletion:
            settings.allowRepurchaseAfterCompletion,

        restrictionNote:
            settings.restrictionNote || ""
    };
}

async function recordInvestmentAdminActivity(
    req,
    action,
    target = "",
    targetId = "",
    details = ""
) {
    try {
        const adminId = getAdminId(req);

        if (!adminId || !isValidObjectId(adminId)) {
            return;
        }

        await InvestmentAdminActivity.create({
            admin: adminId,
            action,
            target,
            targetId: String(targetId || ""),
            details: String(details || ""),
            result: "Success"
        });
    } catch (error) {
        // An audit-log failure must not undo a successful setting update.
        console.error(
            "INVESTMENT ADMIN ACTIVITY LOG ERROR:",
            error.message
        );
    }
}

// ======================================================
// 1. GET GLOBAL INVESTMENT SETTINGS
// GET /api/investment/admin/settings
// ======================================================

exports.getGlobalInvestmentSettings = async (req, res) => {
    try {
        const settings =
            await getOrCreateGlobalInvestmentSettings();

        return res.status(200).json({
            success: true,
            settings: globalSettingsResponse(settings)
        });
    } catch (error) {
        console.error(
            "GET GLOBAL INVESTMENT SETTINGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve global investment settings."
        });
    }
};

// ======================================================
// 2. UPDATE GLOBAL INVESTMENT SETTINGS
// PATCH /api/investment/admin/settings
// ======================================================

exports.updateGlobalInvestmentSettings = async (req, res) => {
    try {
        const body = req.body || {};
        const updates = {};

        const booleanFields = [
            "investmentPurchaseEnabled",
            "allowRepurchaseAfterCompletion"
        ];

        const integerFields = [
            "maxActiveInvestments",
            "maxActivePerPlan"
        ];

        const stringFields = [
            "investmentPurchaseNote",
            "restrictionNote"
        ];

        for (const field of booleanFields) {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
                if (typeof body[field] !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be true or false.`
                    });
                }

                updates[field] = body[field];
            }
        }

        for (const field of integerFields) {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
                const value = body[field];

                if (
                    typeof value !== "number" ||
                    !Number.isInteger(value) ||
                    value < 0 ||
                    value > 10000
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${field} must be a whole number between 0 and 10000.`
                    });
                }

                updates[field] = value;
            }
        }

        if (
            Object.prototype.hasOwnProperty.call(
                body,
                "investmentApprovalMode"
            )
        ) {
            if (
                !["automatic", "manual"].includes(
                    body.investmentApprovalMode
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Approval mode must be automatic or manual."
                });
            }

            updates.investmentApprovalMode =
                body.investmentApprovalMode;
        }

        for (const field of stringFields) {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
                const value = body[field];

                const maxLength =
                    field === "investmentPurchaseNote" ? 500 : 1000;

                if (
                    typeof value !== "string" ||
                    value.length > maxLength
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${field} must be a string of at most ${maxLength} characters.`
                    });
                }

                updates[field] = value.trim();
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid settings were provided."
            });
        }

        const settings =
            await InvestmentAdminSettings.findOneAndUpdate(
                { key: "global" },
                {
                    $set: {
                        ...updates,
                        updatedBy: getAdminId(req)
                    },
                    $setOnInsert: {
                        key: "global"
                    }
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                    runValidators: true
                }
            );

        await recordInvestmentAdminActivity(
            req,
            "Updated global investment settings",
            "Global Investment Settings",
            settings._id,
            JSON.stringify(updates)
        );

        return res.status(200).json({
            success: true,
            message: "Global investment settings updated successfully.",
            settings: globalSettingsResponse(settings)
        });
    } catch (error) {
        console.error(
            "UPDATE GLOBAL INVESTMENT SETTINGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update global investment settings."
        });
    }
};

// ======================================================
// 3. GET ALL PLAN SETTINGS
// GET /api/investment/admin/plans/settings
// ======================================================

exports.getPlanSettings = async (req, res) => {
    try {
        const plans = await Plan.find({})
            .sort({
                sortOrder: 1,
                createdAt: 1
            })
            .lean();

        return res.status(200).json({
            success: true,
            plans
        });
    } catch (error) {
        console.error(
            "GET PLAN SETTINGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve plan settings."
        });
    }
};

// ======================================================
// 4. UPDATE INDIVIDUAL PLAN SETTINGS
// PATCH /api/investment/admin/plans/:planId/settings
// ======================================================

exports.updatePlanSettings = async (req, res) => {
    try {
        const { planId } = req.params;
        const body = req.body || {};

        if (!isValidObjectId(planId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID."
            });
        }

        const allowedFields = [
            "purchaseEnabled",
            "requireManualApproval",
            "maxActivePerUser",
            "allowRepurchaseAfterCompletion",
            "restrictionNote"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid plan settings were provided."
            });
        }

        const booleanFields = [
            "purchaseEnabled",
            "requireManualApproval",
            "allowRepurchaseAfterCompletion"
        ];

        for (const field of booleanFields) {
            if (
                Object.prototype.hasOwnProperty.call(updates, field) &&
                typeof updates[field] !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${field} must be true or false.`
                });
            }
        }

        if (
            Object.prototype.hasOwnProperty.call(
                updates,
                "maxActivePerUser"
            )
        ) {
            const value = updates.maxActivePerUser;

            if (
                typeof value !== "number" ||
                !Number.isInteger(value) ||
                value < 0 ||
                value > 10000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Maximum active investments per plan must be a whole number between 0 and 10000."
                });
            }
        }

        if (
            Object.prototype.hasOwnProperty.call(
                updates,
                "restrictionNote"
            )
        ) {
            const value = updates.restrictionNote;

            if (
                typeof value !== "string" ||
                value.length > 1000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The restriction note must be a string of at most 1000 characters."
                });
            }

            updates.restrictionNote = value.trim();
        }

        const plan = await Plan.findByIdAndUpdate(
            planId,
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Investment plan not found."
            });
        }

        await recordInvestmentAdminActivity(
            req,
            "Updated investment plan settings",
            plan.name,
            plan._id,
            JSON.stringify(updates)
        );

        return res.status(200).json({
            success: true,
            message: "Investment plan settings updated successfully.",
            plan
        });
    } catch (error) {
        console.error(
            "UPDATE PLAN SETTINGS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update plan settings."
        });
    }
};

// ======================================================
// 5. GET INVESTMENT RESTRICTIONS
// GET /api/investment/admin/restrictions
// ======================================================

exports.getInvestmentRestrictions = async (req, res) => {
    try {
        const settings =
            await getOrCreateGlobalInvestmentSettings();

        const restrictions = {
            maxActivePerPlan: settings.maxActivePerPlan,
            allowRepurchaseAfterCompletion:
                settings.allowRepurchaseAfterCompletion,
            restrictionNote: settings.restrictionNote || ""
        };

        return res.status(200).json({
            success: true,
            restrictions,
            settings: restrictions
        });
    } catch (error) {
        console.error(
            "GET INVESTMENT RESTRICTIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve investment restrictions."
        });
    }
};

// ======================================================
// 6. UPDATE INVESTMENT RESTRICTIONS
// PATCH /api/investment/admin/restrictions
// ======================================================

exports.updateInvestmentRestrictions = async (req, res) => {
    try {
        const body = req.body || {};
        const updates = {};

        if (
            Object.prototype.hasOwnProperty.call(
                body,
                "maxActivePerPlan"
            )
        ) {
            const value = body.maxActivePerPlan;

            if (
                typeof value !== "number" ||
                !Number.isInteger(value) ||
                value < 0 ||
                value > 10000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "maxActivePerPlan must be a whole number between 0 and 10000."
                });
            }

            updates.maxActivePerPlan = value;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                body,
                "allowRepurchaseAfterCompletion"
            )
        ) {
            if (
                typeof body.allowRepurchaseAfterCompletion !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "allowRepurchaseAfterCompletion must be true or false."
                });
            }

            updates.allowRepurchaseAfterCompletion =
                body.allowRepurchaseAfterCompletion;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                body,
                "restrictionNote"
            )
        ) {
            if (
                typeof body.restrictionNote !== "string" ||
                body.restrictionNote.length > 1000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "restrictionNote must be a string of at most 1000 characters."
                });
            }

            updates.restrictionNote =
                body.restrictionNote.trim();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid investment restrictions were provided."
            });
        }

        const settings =
            await InvestmentAdminSettings.findOneAndUpdate(
                { key: "global" },
                {
                    $set: {
                        ...updates,
                        updatedBy: getAdminId(req)
                    },
                    $setOnInsert: {
                        key: "global"
                    }
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                    runValidators: true
                }
            );

        await recordInvestmentAdminActivity(
            req,
            "Updated investment restrictions",
            "Global Investment Restrictions",
            settings._id,
            JSON.stringify(updates)
        );

        const restrictions = {
            maxActivePerPlan: settings.maxActivePerPlan,
            allowRepurchaseAfterCompletion:
                settings.allowRepurchaseAfterCompletion,
            restrictionNote: settings.restrictionNote || ""
        };

        return res.status(200).json({
            success: true,
            message: "Investment restrictions updated successfully.",
            restrictions,
            settings: restrictions
        });
    } catch (error) {
        console.error(
            "UPDATE INVESTMENT RESTRICTIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update investment restrictions."
        });
    }
};

// ======================================================
// 7. GET INVESTMENT ADMIN ACTIVITY
// GET /api/investment/admin/activity
//
// Query: ?page=1&limit=20&search=plan
// ======================================================

exports.getAdminActivity = async (req, res) => {
    try {
        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit, 10) || 20)
        );

        const search = String(
            req.query.search || ""
        ).trim().slice(0, 100);

        const filter = {};

        if (search) {
            // Escape regex metacharacters in user-supplied search text.
            const escaped = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                { action: { $regex: escaped, $options: "i" } },
                { target: { $regex: escaped, $options: "i" } },
                { targetId: { $regex: escaped, $options: "i" } },
                { details: { $regex: escaped, $options: "i" } },
                { result: { $regex: escaped, $options: "i" } }
            ];
        }

        const [activities, total] = await Promise.all([
            InvestmentAdminActivity.find(filter)
                .populate("admin", "name phone")
                .sort({
                    createdAt: -1,
                    _id: -1
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            InvestmentAdminActivity.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            activities,
            logs: activities,
            data: activities,
            pagination: {
                page,
                limit,
                total,
                totalPages
            },
            page,
            total,
            totalPages
        });
    } catch (error) {
        console.error(
            "GET INVESTMENT ADMIN ACTIVITY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve investment admin activity."
        });
    }
};

// ======================================================
// ADMIN — SEARCH USERS BY NAME OR PHONE
// GET /api/investment/admin/users/search?q=...
// ======================================================

exports.searchInvestmentUsers = async (req, res) => {
    try {
        const search = String(req.query.q || "")
            .trim()
            .slice(0, 100);

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            50,
            Math.max(
                1,
                parseInt(req.query.limit, 10) || 20
            )
        );

        const filter = {};

        if (search) {
            const escaped = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                {
                    name: {
                        $regex: escaped,
                        $options: "i"
                    }
                },
                {
                    phone: {
                        $regex: escaped
                    }
                }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select(
                    "name phone isBlocked " +
                    "investmentPurchaseEnabled " +
                    "investmentApprovalMode " +
                    "maxActiveInvestments " +
                    "activeInvestments"
                )
                .sort({
                    name: 1,
                    _id: 1
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            User.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error(
            "SEARCH INVESTMENT USERS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to search users."
        });
    }
};


// ======================================================
// ADMIN — GET INDIVIDUAL USER PLAN PERMISSIONS
// GET /api/investment/admin/users/:userId/plan-permissions
// ======================================================

exports.getUserPlanPermissions = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const user = await User.findById(userId)
            .select(
                "name phone investmentPlanPermissions"
            )
            .populate(
                "investmentPlanPermissions.plan",
                "name price status"
            )
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const permissions = user.investmentPlanPermissions || [];

        const purchaseCounts = await Investment.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: "$plan",
                    lifetimePurchases: { $sum: 1 }
                }
            }
        ]);

        const countMap = new Map(
            purchaseCounts.map(item => [
                String(item._id),
                item.lifetimePurchases
            ])
        );

        const result = permissions.map(permission => {
            const planId = permission.plan?._id;

            return {
                ...permission,
                lifetimePurchases: planId
                    ? countMap.get(String(planId)) || 0
                    : 0
            };
        });

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone
            },
            permissions: result
        });

    } catch (error) {
        console.error(
            "GET USER PLAN PERMISSIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve plan permissions."
        });
    }
};


// ======================================================
// ADMIN — CREATE OR UPDATE A USER'S PLAN PERMISSION
// PATCH /api/investment/admin/users/:userId/plans/:planId/permission
//
// Body:
// {
//   "enabled": true,
//   "maxLifetimePurchases": 1,
//   "restrictionNote": ""
// }
// ======================================================

exports.updateUserPlanPermission = async (req, res) => {
    try {
        const { userId, planId } = req.params;
        const body = req.body || {};

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(planId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID or plan ID."
            });
        }

        const allowedFields = [
            "enabled",
            "maxLifetimePurchases",
            "restrictionNote"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(
                    body,
                    field
                )
            ) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid permission settings supplied."
            });
        }

        if (
            "enabled" in updates &&
            typeof updates.enabled !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "enabled must be true or false."
            });
        }

        if ("maxLifetimePurchases" in updates) {
            const limit = updates.maxLifetimePurchases;

            if (
                typeof limit !== "number" ||
                !Number.isInteger(limit) ||
                limit < 0 ||
                limit > 10000
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Lifetime purchase limit must be a whole number between 0 and 10000."
                });
            }
        }

        if ("restrictionNote" in updates) {
            if (
                typeof updates.restrictionNote !== "string" ||
                updates.restrictionNote.length > 500
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Restriction note must not exceed 500 characters."
                });
            }

            updates.restrictionNote =
                updates.restrictionNote.trim();
        }

        const [user, plan] = await Promise.all([
            User.findById(userId),
            Plan.findById(planId)
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Investment plan not found."
            });
        }

        if (!Array.isArray(user.investmentPlanPermissions)) {
            user.investmentPlanPermissions = [];
        }

        let permission = user.investmentPlanPermissions.find(
            item => String(item.plan) === String(planId)
        );

        if (!permission) {
            permission = {
                plan: planId,
                enabled: true,
                maxLifetimePurchases: 0,
                restrictionNote: ""
            };

            user.investmentPlanPermissions.push(permission);
        }

        for (const [field, value] of Object.entries(updates)) {
            permission[field] = value;
        }

        user.markModified("investmentPlanPermissions");

        await user.save();

        const savedPermission =
            user.investmentPlanPermissions.find(
                item => String(item.plan) === String(planId)
            );

        return res.status(200).json({
            success: true,
            message: "User plan permission updated successfully.",
            permission: {
                userId: user._id,
                planId,
                planName: plan.name,
                enabled: savedPermission.enabled,
                maxLifetimePurchases:
                    savedPermission.maxLifetimePurchases,
                restrictionNote:
                    savedPermission.restrictionNote
            }
        });

    } catch (error) {
        console.error(
            "UPDATE USER PLAN PERMISSION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update user plan permission."
        });
    }
};

// ======================================================
// USER-SPECIFIC PLAN PERMISSION HELPERS
// ======================================================

// No permission record means the plan is allowed by default.
// maxLifetimePurchases = 0 means unlimited purchases.

async function validateUserPlanPermission({
    user,
    plan,
    session = null
}) {
    const permission = (
        user.investmentPlanPermissions || []
    ).find(item =>
        String(item.plan?._id || item.plan) ===
        String(plan._id)
    );

    // No individual restriction has been configured.
    if (!permission) {
        return;
    }

    // Administrator has disabled this plan for this user.
    if (permission.enabled === false) {
        const error = new Error(
            permission.restrictionNote ||
            `Purchasing the ${plan.name} plan is currently disabled for your account.`
        );

        error.code = "USER_PLAN_DISABLED";
        throw error;
    }

    const lifetimeLimit = Number(
        permission.maxLifetimePurchases ?? 0
    );

    // Zero means unlimited.
    if (lifetimeLimit <= 0) {
        return;
    }

    const query = Investment.countDocuments({
        user: user._id,
        plan: plan._id
    });

    if (session) {
        query.session(session);
    }

    const lifetimePurchases = await query;

    if (lifetimePurchases >= lifetimeLimit) {
        const error = new Error(
            `You have reached your lifetime purchase limit of ${lifetimeLimit} for the ${plan.name} plan. Please contact customer support if you need assistance.`
        );

        error.code = "USER_PLAN_LIFETIME_LIMIT";
        throw error;
    }
}