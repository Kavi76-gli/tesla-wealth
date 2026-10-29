"use strict";

// ======================================================
// TESLA WEALTH — INVESTMENT ADMIN CONTROLLER
//
// FEATURES
// 1. Search users by name or phone.
// 2. Get and update individual user settings.
// 3. Control investment access per user.
// 4. Control individual plans per user.
// 5. Configure lifetime purchase limits.
// 6. View historical purchase counts.
// 7. Record admin activity.
// 8. Manage global investment settings.
// 9. Manage individual plan restrictions.
// 10. View investment purchase history.
//
// PURCHASES REMAIN AUTOMATIC.
// NO PURCHASE-REQUEST APPROVAL WORKFLOW.
// ======================================================

const mongoose = require("mongoose");

const User = require("../models/user");
const Plan = require("../models/plan");
const Investment = require("../models/investment");

const InvestmentAdminSettings = require(
    "../models/investmentAdminSettings"
);

const InvestmentAdminActivity = require(
    "../models/investmentAdminActivity"
);

// ======================================================
// CONSTANTS
// ======================================================

const MAX_PAGE_SIZE = 100;
const MAX_ACTIVE_INVESTMENTS = 10000;
const MAX_LIFETIME_PURCHASES = 1000000;

// ======================================================
// GENERAL HELPERS
// ======================================================

function isValidObjectId(id) {
    return (
        typeof id === "string" &&
        mongoose.Types.ObjectId.isValid(id)
    );
}

function getAdminId(req) {
    return (
        req.admin?._id ||
        req.user?._id ||
        req.user?.id ||
        null
    );
}

function getErrorMessage(error) {
    if (error?.name === "ValidationError") {
        return error.message;
    }

    if (error?.name === "CastError") {
        return "One or more supplied values are invalid.";
    }

    return "An unexpected server error occurred.";
}

function sendServerError(res, error, label) {
    console.error(
        `[TESLA WEALTH] ${label}:`,
        error
    );

    const badRequest = [
        "ValidationError",
        "CastError"
    ].includes(error?.name);

    return res.status(badRequest ? 400 : 500).json({
        success: false,
        message: badRequest
            ? getErrorMessage(error)
            : "An unexpected server error occurred."
    });
}

function normalizePage(value) {
    const parsed = Number.parseInt(value, 10);

    return (
        Number.isInteger(parsed) &&
        parsed > 0
    )
        ? parsed
        : 1;
}

function normalizeLimit(value) {
    const parsed = Number.parseInt(value, 10);

    if (
        !Number.isInteger(parsed) ||
        parsed < 1
    ) {
        return 20;
    }

    return Math.min(
        parsed,
        MAX_PAGE_SIZE
    );
}

function validateText(value, maxLength) {
    return (
        typeof value === "string" &&
        value.length <= maxLength
    );
}

function validateInteger(value, min, max) {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= min &&
        value <= max
    );
}

// ======================================================
// USER SETTINGS RESPONSE
// ======================================================

function getUserSettingsResponse(user) {
    return {
        userId: user._id,

        name: user.name || "",

        phone: user.phone || "",

        isBlocked: user.isBlocked === true,

        investmentPurchaseEnabled:
            user.investmentPurchaseEnabled !== false,

        // Retained for backward compatibility.
        // This controller does not create approval requests.
        investmentApprovalMode:
            user.investmentApprovalMode || "automatic",

        maxActiveInvestments:
            Number.isInteger(user.maxActiveInvestments)
                ? user.maxActiveInvestments
                : 10,

        investmentPurchaseNote:
            user.investmentPurchaseNote || "",

        activeInvestments:
            Number(user.activeInvestments || 0),

        investmentPlanPermissions:
            (
                user.investmentPlanPermissions || []
            ).map(permission => ({
                permissionId:
                    permission._id || null,

                planId:
                    permission.plan?._id ||
                    permission.plan,

                enabled:
                    permission.enabled !== false,

                maxLifetimePurchases:
                    Number(
                        permission.maxLifetimePurchases || 0
                    ),

                restrictionNote:
                    permission.restrictionNote || ""
            }))
    };
}

// ======================================================
// ADMIN ACTIVITY LOGGING
// ======================================================

async function recordInvestmentAdminActivity({
    req,
    action,
    targetUser = null,
    targetPlan = null,
    details = {},
    note = ""
}) {
    try {
        const adminId = getAdminId(req);

        if (
            !adminId ||
            !mongoose.Types.ObjectId.isValid(
                String(adminId)
            )
        ) {
            console.error(
                "[TESLA WEALTH] Invalid admin ID; activity not recorded."
            );

            return;
        }

        const target = targetPlan
            ? "Investment Plan"
            : targetUser
                ? "User"
                : "Investment Settings";

        const targetId = targetPlan
            ? String(targetPlan)
            : targetUser
                ? String(targetUser)
                : "global";

        const detailsObject =
            details &&
            typeof details === "object" &&
            !Array.isArray(details)
                ? details
                : { value: details };

        const detailsText = JSON.stringify({
            ...detailsObject,
            ...(note ? { note } : {})
        });

        await InvestmentAdminActivity.create({
            admin: adminId,

            action: String(
                action || "UNKNOWN_ACTION"
            ),

            target,

            targetId,

            details: (
                detailsText || "{}"
            ).slice(0, 2000),

            result: "Success"
        });
    } catch (error) {
        // Logging errors should not undo a successful settings update.
        console.error(
            "[TESLA WEALTH] Activity logging failed:",
            error.message
        );
    }
}

// ======================================================
// GLOBAL SETTINGS HELPER
// ======================================================

async function getOrCreateGlobalSettings() {
    let settings =
        await InvestmentAdminSettings.findOne({
            key: "global"
        });

    if (!settings) {
        try {
            settings =
                await InvestmentAdminSettings.create({
                    key: "global"
                });
        } catch (error) {
            // Handle simultaneous requests creating the singleton.
            if (error?.code !== 11000) {
                throw error;
            }

            settings =
                await InvestmentAdminSettings.findOne({
                    key: "global"
                });
        }
    }

    return settings;
}

// ======================================================
// ADMIN — SEARCH USERS
//
// GET /api/investment/admin/users?search=rahul
// Also accepts ?q=rahul
// ======================================================

exports.searchUsers = async (req, res) => {
    try {
        const page = normalizePage(
            req.query.page
        );

        const limit = normalizeLimit(
            req.query.limit
        );

        const search = String(
            req.query.q ||
            req.query.search ||
            ""
        ).trim();

        const filter = {};

        if (search) {
            const escaped = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const regex = new RegExp(
                escaped,
                "i"
            );

            filter.$or = [
                { name: regex },
                { phone: regex }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select([
                    "name",
                    "phone",
                    "isBlocked",
                    "investmentPurchaseEnabled",
                    "maxActiveInvestments",
                    "activeInvestments",
                    "investmentPurchaseNote",
                    "createdAt"
                ].join(" "))
                .sort({
                    createdAt: -1,
                    _id: -1
                })
                .skip(
                    (page - 1) * limit
                )
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
                totalPages: Math.ceil(
                    total / limit
                )
            }
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "SEARCH INVESTMENT USERS"
        );
    }
};

// Route compatibility alias.
exports.searchInvestmentUsers =
    exports.searchUsers;

// ======================================================
// ADMIN — GET USER INVESTMENT SETTINGS
//
// GET /api/investment/admin/users/:userId/settings
// ======================================================

exports.getUserInvestmentSettings = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const user = await User.findById(userId)
            .select([
                "name",
                "phone",
                "isBlocked",
                "investmentPurchaseEnabled",
                "investmentApprovalMode",
                "maxActiveInvestments",
                "investmentPurchaseNote",
                "activeInvestments",
                "investmentPlanPermissions"
            ].join(" "))
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,

            settings:
                getUserSettingsResponse(user)
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET USER INVESTMENT SETTINGS"
        );
    }
};

// ======================================================
// ADMIN — UPDATE USER INVESTMENT SETTINGS
//
// PATCH /api/investment/admin/users/:userId/settings
//
// Allowed:
// investmentPurchaseEnabled
// investmentApprovalMode
// maxActiveInvestments
// investmentPurchaseNote
// ======================================================

exports.updateUserInvestmentSettings = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;
        const body = req.body || {};

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
                    body,
                    field
                )
            ) {
                updates[field] = body[field];
            }
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message: "No valid settings were provided."
            });
        }

        if (
            "investmentPurchaseEnabled" in updates &&
            typeof updates.investmentPurchaseEnabled !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "investmentPurchaseEnabled must be true or false."
            });
        }

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

        if (
            "maxActiveInvestments" in updates &&
            !validateInteger(
                updates.maxActiveInvestments,
                0,
                MAX_ACTIVE_INVESTMENTS
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "maxActiveInvestments must be a whole number from 0 to 10000."
            });
        }

        if ("investmentPurchaseNote" in updates) {
            if (
                !validateText(
                    updates.investmentPurchaseNote,
                    500
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Purchase note must be 500 characters or fewer."
                });
            }

            updates.investmentPurchaseNote =
                updates.investmentPurchaseNote.trim();
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        ).select([
            "name",
            "phone",
            "isBlocked",
            "investmentPurchaseEnabled",
            "investmentApprovalMode",
            "maxActiveInvestments",
            "investmentPurchaseNote",
            "activeInvestments",
            "investmentPlanPermissions"
        ].join(" "));

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        await recordInvestmentAdminActivity({
            req,
            action: "UPDATE_USER_INVESTMENT_SETTINGS",
            targetUser: user._id,
            details: updates
        });

        return res.status(200).json({
            success: true,
            message:
                "User settings updated. Purchases remain automatic.",
            settings:
                getUserSettingsResponse(user)
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "UPDATE USER INVESTMENT SETTINGS"
        );
    }
};

// ======================================================
// ADMIN — GET USER PLAN PERMISSIONS
//
// GET /api/investment/admin/users/:userId/plans
//
// Returns all plans, user permissions, and purchase counts.
// ======================================================

exports.getUserPlanPermissions = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const user = await User.findById(userId)
            .select(
                "name phone investmentPlanPermissions"
            )
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const plans = await Plan.find({})
            .select(
                "name image price dailyIncome days status purchaseEnabled sortOrder"
            )
            .sort({
                sortOrder: 1,
                createdAt: 1
            })
            .lean();

        const permissions =
            user.investmentPlanPermissions || [];

        const result = await Promise.all(
            plans.map(async plan => {
                const permission = permissions.find(
                    item =>
                        String(
                            item.plan?._id ||
                            item.plan
                        ) === String(plan._id)
                );

                const lifetimeLimit = Number(
                    permission?.maxLifetimePurchases || 0
                );

                const lifetimePurchases =
                    await Investment.countDocuments({
                        user: user._id,
                        plan: plan._id
                    });

                return {
                    planId: plan._id,

                    name: plan.name,

                    image: plan.image || "",

                    price: plan.price,

                    dailyIncome: plan.dailyIncome,

                    days: plan.days,

                    planAvailable:
                        plan.status === true &&
                        plan.purchaseEnabled !== false,

                    // Missing permission means allowed by default.
                    enabled: permission
                        ? permission.enabled !== false
                        : true,

                    maxLifetimePurchases:
                        lifetimeLimit,

                    lifetimePurchases,

                    remainingPurchases:
                        lifetimeLimit === 0
                            ? null
                            : Math.max(
                                0,
                                lifetimeLimit -
                                    lifetimePurchases
                            ),

                    restrictionNote:
                        permission?.restrictionNote || "",

                    permissionConfigured:
                        Boolean(permission)
                };
            })
        );

        return res.status(200).json({
            success: true,

            user: {
                userId: user._id,
                name: user.name || "",
                phone: user.phone || ""
            },

            plans: result
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET USER PLAN PERMISSIONS"
        );
    }
};

// ======================================================
// ADMIN — UPDATE USER PLAN PERMISSION
//
// PATCH /api/investment/admin/users/:userId/plans/:planId
//
// Example:
// {
//   "enabled": false,
//   "maxLifetimePurchases": 1,
//   "restrictionNote": "Please contact support."
// }
//
// maxLifetimePurchases = 0 means unlimited.
// ======================================================

exports.updateUserPlanPermission = async (
    req,
    res
) => {
    try {
        const { userId, planId } = req.params;
        const body = req.body || {};

        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(planId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID or plan ID."
            });
        }

        const updates = {};

        for (const field of [
            "enabled",
            "maxLifetimePurchases",
            "restrictionNote"
        ]) {
            if (
                Object.prototype.hasOwnProperty.call(
                    body,
                    field
                )
            ) {
                updates[field] = body[field];
            }
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid permission fields were provided."
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

        if (
            "maxLifetimePurchases" in updates &&
            !validateInteger(
                updates.maxLifetimePurchases,
                0,
                MAX_LIFETIME_PURCHASES
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Lifetime limit must be 0 to 1000000. Use 0 for unlimited."
            });
        }

        if ("restrictionNote" in updates) {
            if (
                !validateText(
                    updates.restrictionNote,
                    1000
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Restriction note must be 1000 characters or fewer."
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

        let permission =
            user.investmentPlanPermissions.find(
                item =>
                    String(
                        item.plan?._id ||
                        item.plan
                    ) === String(plan._id)
            );

        if (!permission) {
            user.investmentPlanPermissions.push({
                plan: plan._id,
                enabled: true,
                maxLifetimePurchases: 0,
                restrictionNote: ""
            });

            permission =
                user.investmentPlanPermissions[
                    user.investmentPlanPermissions.length - 1
                ];
        }

        Object.assign(permission, updates);

        await user.save();

        const lifetimePurchases =
            await Investment.countDocuments({
                user: user._id,
                plan: plan._id
            });

        const lifetimeLimit = Number(
            permission.maxLifetimePurchases || 0
        );

        await recordInvestmentAdminActivity({
            req,
            action: "UPDATE_USER_PLAN_PERMISSION",
            targetUser: user._id,
            targetPlan: plan._id,
            details: {
                ...updates,
                lifetimePurchases
            }
        });

        return res.status(200).json({
            success: true,

            message:
                "User plan permission updated successfully.",

            permission: {
                permissionId: permission._id,
                userId: user._id,
                planId: plan._id,

                enabled:
                    permission.enabled !== false,

                maxLifetimePurchases:
                    lifetimeLimit,

                lifetimePurchases,

                remainingPurchases:
                    lifetimeLimit === 0
                        ? null
                        : Math.max(
                            0,
                            lifetimeLimit -
                                lifetimePurchases
                        ),

                restrictionNote:
                    permission.restrictionNote || ""
            }
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "UPDATE USER PLAN PERMISSION"
        );
    }
};

// ======================================================
// ADMIN — REMOVE USER PLAN OVERRIDE
//
// DELETE /api/investment/admin/users/:userId/plans/:planId
// ======================================================

exports.removeUserPlanPermission = async (
    req,
    res
) => {
    try {
        const { userId, planId } = req.params;

        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(planId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID or plan ID."
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (!Array.isArray(user.investmentPlanPermissions)) {
            user.investmentPlanPermissions = [];
        }

        const beforeCount =
            user.investmentPlanPermissions.length;

        user.investmentPlanPermissions =
            user.investmentPlanPermissions.filter(
                item =>
                    String(
                        item.plan?._id ||
                        item.plan
                    ) !== String(planId)
            );

        if (
            user.investmentPlanPermissions.length ===
            beforeCount
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "No individual permission was configured."
            });
        }

        await user.save();

        await recordInvestmentAdminActivity({
            req,
            action: "REMOVE_USER_PLAN_PERMISSION",
            targetUser: user._id,
            targetPlan: planId,
            details: {
                removed: true
            }
        });

        return res.status(200).json({
            success: true,
            message:
                "User-specific plan override removed."
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "REMOVE USER PLAN PERMISSION"
        );
    }
};

// ======================================================
// ADMIN — USER PURCHASE HISTORY
//
// GET /api/investment/admin/users/:userId/purchases
// ======================================================

exports.getUserPurchaseHistory = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const page = normalizePage(req.query.page);
        const limit = normalizeLimit(req.query.limit);

        const user = await User.findById(userId)
            .select("name phone")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const filter = {
            user: user._id
        };

        const [investments, total] = await Promise.all([
            Investment.find(filter)
                .populate(
                    "plan",
                    "name image price dailyIncome days"
                )
                .sort({
                    purchaseDate: -1,
                    _id: -1
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            Investment.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,

            user: {
                userId: user._id,
                name: user.name || "",
                phone: user.phone || ""
            },

            investments,

            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(
                    total / limit
                )
            }
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET USER PURCHASE HISTORY"
        );
    }
};

// ======================================================
// ADMIN — ALL PURCHASE HISTORY
//
// GET /api/investment/admin/purchase-history
// ======================================================

exports.getAllPurchaseHistory = async (
    req,
    res
) => {
    try {
        const page = normalizePage(req.query.page);
        const limit = normalizeLimit(req.query.limit);

        const filter = {};

        if (req.query.status) {
            const allowedStatuses = [
                "Running",
                "Completed",
                "Cancelled"
            ];

            if (
                !allowedStatuses.includes(
                    req.query.status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid investment status."
                });
            }

            filter.status = req.query.status;
        }

        const [investments, total] = await Promise.all([
            Investment.find(filter)
                .populate(
                    "user",
                    "name phone balance withdrawableEarnings"
                )
                .populate(
                    "plan",
                    "name price dailyIncome days totalIncome image"
                )
                .sort({
                    purchaseDate: -1,
                    _id: -1
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            Investment.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,

            investments,

            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(
                    total / limit
                )
            }
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "ADMIN PURCHASE HISTORY"
        );
    }
};

// ======================================================
// ADMIN — GET GLOBAL INVESTMENT SETTINGS
//
// GET /api/investment/admin/settings
// ======================================================

exports.getGlobalInvestmentSettings = async (
    req,
    res
) => {
    try {
        const settings =
            await getOrCreateGlobalSettings();

        return res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET GLOBAL INVESTMENT SETTINGS"
        );
    }
};

// ======================================================
// ADMIN — UPDATE GLOBAL INVESTMENT SETTINGS
//
// PATCH /api/investment/admin/settings
// ======================================================

exports.updateGlobalInvestmentSettings = async (
    req,
    res
) => {
    try {
        const body = req.body || {};

        const allowedFields = [
            "investmentPurchaseEnabled",
            "investmentApprovalMode",
            "maxActiveInvestments",
            "investmentPurchaseNote",
            "maxActivePerPlan",
            "allowRepurchaseAfterCompletion",
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

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid global settings were provided."
            });
        }

        if (
            "investmentPurchaseEnabled" in updates &&
            typeof updates.investmentPurchaseEnabled !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "investmentPurchaseEnabled must be boolean."
            });
        }

        if (
            "investmentApprovalMode" in updates &&
            !["automatic", "manual"].includes(
                updates.investmentApprovalMode
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid investmentApprovalMode."
            });
        }

        for (const field of [
            "maxActiveInvestments",
            "maxActivePerPlan"
        ]) {
            if (
                field in updates &&
                !validateInteger(
                    updates[field],
                    0,
                    MAX_ACTIVE_INVESTMENTS
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `${field} must be a whole number from 0 to 10000.`
                });
            }
        }

        if (
            "allowRepurchaseAfterCompletion" in updates &&
            typeof updates.allowRepurchaseAfterCompletion !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "allowRepurchaseAfterCompletion must be boolean."
            });
        }

        for (const [field, maxLength] of [
            ["investmentPurchaseNote", 500],
            ["restrictionNote", 1000]
        ]) {
            if (field in updates) {
                if (
                    !validateText(
                        updates[field],
                        maxLength
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${field} is too long or is not a string.`
                    });
                }

                updates[field] =
                    updates[field].trim();
            }
        }

        // Purchases must remain automatic.
        // Manual approval is not implemented by this controller.
        if (
            updates.investmentApprovalMode === "manual"
        ) {
            updates.investmentApprovalMode =
                "automatic";
        }

        const settings =
            await getOrCreateGlobalSettings();

        Object.assign(settings, updates);

        await settings.save();

        await recordInvestmentAdminActivity({
            req,
            action: "UPDATE_GLOBAL_INVESTMENT_SETTINGS",
            details: updates
        });

        return res.status(200).json({
            success: true,
            message:
                "Global settings updated. Purchases remain automatic.",
            settings
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "UPDATE GLOBAL INVESTMENT SETTINGS"
        );
    }
};

// ======================================================
// ADMIN — GET PLAN SETTINGS
//
// GET /api/investment/admin/plans/:planId/settings
// ======================================================

exports.getPlanSettings = async (
    req,
    res
) => {
    try {
        const { planId } = req.params;

        if (!isValidObjectId(planId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID."
            });
        }

        const plan = await Plan.findById(planId).lean();

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Investment plan not found."
            });
        }

        return res.status(200).json({
            success: true,
            plan
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET PLAN SETTINGS"
        );
    }
};

// ======================================================
// ADMIN — UPDATE PLAN SETTINGS
//
// PATCH /api/investment/admin/plans/:planId/settings
// ======================================================

exports.updatePlanSettings = async (
    req,
    res
) => {
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
            "status",
            "purchaseEnabled",
            "maxActivePerUser",
            "allowRepurchaseAfterCompletion",
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

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid plan settings were provided."
            });
        }

        for (const field of [
            "status",
            "purchaseEnabled",
            "allowRepurchaseAfterCompletion"
        ]) {
            if (
                field in updates &&
                typeof updates[field] !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `${field} must be true or false.`
                });
            }
        }

        if (
            "maxActivePerUser" in updates &&
            !validateInteger(
                updates.maxActivePerUser,
                0,
                MAX_ACTIVE_INVESTMENTS
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "maxActivePerUser must be a whole number from 0 to 10000."
            });
        }

        if ("restrictionNote" in updates) {
            if (
                !validateText(
                    updates.restrictionNote,
                    1000
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "restrictionNote must be 1000 characters or fewer."
                });
            }

            updates.restrictionNote =
                updates.restrictionNote.trim();
        }

        const plan = await Plan.findByIdAndUpdate(
            planId,
            { $set: updates },
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

        await recordInvestmentAdminActivity({
            req,
            action: "UPDATE_INVESTMENT_PLAN_SETTINGS",
            targetPlan: plan._id,
            details: updates
        });

        return res.status(200).json({
            success: true,
            message: "Plan settings updated.",
            plan
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "UPDATE PLAN SETTINGS"
        );
    }
};

// ======================================================
// ADMIN — GET INVESTMENT RESTRICTIONS
//
// GET /api/investment/admin/restrictions
// ======================================================

exports.getInvestmentRestrictions = async (
    req,
    res
) => {
    try {
        const [settings, plans] = await Promise.all([
            getOrCreateGlobalSettings(),

            Plan.find({})
                .select([
                    "name",
                    "status",
                    "purchaseEnabled",
                    "maxActivePerUser",
                    "allowRepurchaseAfterCompletion",
                    "restrictionNote"
                ].join(" "))
                .sort({
                    sortOrder: 1,
                    createdAt: 1
                })
                .lean()
        ]);

        return res.status(200).json({
            success: true,

            global: {
                investmentPurchaseEnabled:
                    settings.investmentPurchaseEnabled !== false,

                maxActiveInvestments:
                    settings.maxActiveInvestments,

                maxActivePerPlan:
                    settings.maxActivePerPlan,

                allowRepurchaseAfterCompletion:
                    settings.allowRepurchaseAfterCompletion,

                investmentPurchaseNote:
                    settings.investmentPurchaseNote || "",

                restrictionNote:
                    settings.restrictionNote || ""
            },

            plans
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET INVESTMENT RESTRICTIONS"
        );
    }
};

// ======================================================
// ADMIN — UPDATE INVESTMENT RESTRICTIONS
//
// For global settings, provide global fields.
//
// For an individual plan, provide:
// {
//   "planId": "...",
//   "purchaseEnabled": false
// }
// ======================================================

exports.updateInvestmentRestrictions = async (
    req,
    res
) => {
    try {
        const body = req.body || {};

        // --------------------------------------------------
        // Update a particular plan's restrictions.
        // --------------------------------------------------

        if (body.planId) {
            if (!isValidObjectId(String(body.planId))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid planId."
                });
            }

            const planUpdates = {};

            for (const field of [
                "status",
                "purchaseEnabled",
                "maxActivePerUser",
                "allowRepurchaseAfterCompletion",
                "restrictionNote"
            ]) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        body,
                        field
                    )
                ) {
                    planUpdates[field] = body[field];
                }
            }

            if (!Object.keys(planUpdates).length) {
                return res.status(400).json({
                    success: false,
                    message:
                        "No plan restriction fields were provided."
                });
            }

            for (const field of [
                "status",
                "purchaseEnabled",
                "allowRepurchaseAfterCompletion"
            ]) {
                if (
                    field in planUpdates &&
                    typeof planUpdates[field] !== "boolean"
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${field} must be true or false.`
                    });
                }
            }

            if (
                "maxActivePerUser" in planUpdates &&
                !validateInteger(
                    planUpdates.maxActivePerUser,
                    0,
                    MAX_ACTIVE_INVESTMENTS
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "maxActivePerUser must be between 0 and 10000."
                });
            }

            if ("restrictionNote" in planUpdates) {
                if (
                    !validateText(
                        planUpdates.restrictionNote,
                        1000
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "restrictionNote must be 1000 characters or fewer."
                    });
                }

                planUpdates.restrictionNote =
                    planUpdates.restrictionNote.trim();
            }

            const plan = await Plan.findByIdAndUpdate(
                body.planId,
                { $set: planUpdates },
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

            await recordInvestmentAdminActivity({
                req,
                action: "UPDATE_INVESTMENT_RESTRICTIONS",
                targetPlan: plan._id,
                details: planUpdates
            });

            return res.status(200).json({
                success: true,
                message: "Plan restrictions updated.",
                plan
            });
        }

        // --------------------------------------------------
        // Update global restrictions.
        // --------------------------------------------------

        const allowedFields = [
            "investmentPurchaseEnabled",
            "maxActiveInvestments",
            "maxActivePerPlan",
            "allowRepurchaseAfterCompletion",
            "investmentPurchaseNote",
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

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message:
                    "Provide global restriction fields or a planId with plan fields."
            });
        }

        if (
            "investmentPurchaseEnabled" in updates &&
            typeof updates.investmentPurchaseEnabled !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "investmentPurchaseEnabled must be boolean."
            });
        }

        if (
            "allowRepurchaseAfterCompletion" in updates &&
            typeof updates.allowRepurchaseAfterCompletion !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "allowRepurchaseAfterCompletion must be boolean."
            });
        }

        for (const field of [
            "maxActiveInvestments",
            "maxActivePerPlan"
        ]) {
            if (
                field in updates &&
                !validateInteger(
                    updates[field],
                    0,
                    MAX_ACTIVE_INVESTMENTS
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `${field} must be between 0 and 10000.`
                });
            }
        }

        for (const [field, maxLength] of [
            ["investmentPurchaseNote", 500],
            ["restrictionNote", 1000]
        ]) {
            if (field in updates) {
                if (
                    !validateText(
                        updates[field],
                        maxLength
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${field} is too long or is not a string.`
                    });
                }

                updates[field] =
                    updates[field].trim();
            }
        }

        const settings =
            await getOrCreateGlobalSettings();

        Object.assign(settings, updates);

        await settings.save();

        await recordInvestmentAdminActivity({
            req,
            action: "UPDATE_INVESTMENT_RESTRICTIONS",
            details: updates
        });

        return res.status(200).json({
            success: true,
            message: "Global restrictions updated.",
            settings
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "UPDATE INVESTMENT RESTRICTIONS"
        );
    }
};

// ======================================================
// ADMIN — VIEW ADMIN ACTIVITY
//
// GET /api/investment/admin/activity?page=1&limit=20
// ======================================================

exports.getAdminActivity = async (
    req,
    res
) => {
    try {
        const page = normalizePage(
            req.query.page
        );

        const limit = normalizeLimit(
            req.query.limit
        );

        const filter = {};

        if (req.query.action) {
            filter.action = String(
                req.query.action
            ).slice(0, 150);
        }

        if (req.query.targetId) {
            filter.targetId = String(
                req.query.targetId
            ).slice(0, 100);
        }

        if (
            ["Success", "Failed"].includes(
                req.query.result
            )
        ) {
            filter.result = req.query.result;
        }

        const [activities, total] = await Promise.all([
            InvestmentAdminActivity.find(filter)
                .populate(
                    "admin",
                    "name phone"
                )
                .sort({
                    createdAt: -1,
                    _id: -1
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            InvestmentAdminActivity.countDocuments(
                filter
            )
        ]);

        return res.status(200).json({
            success: true,

            activities,

            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(
                    total / limit
                )
            }
        });
    } catch (error) {
        return sendServerError(
            res,
            error,
            "GET ADMIN ACTIVITY"
        );
    }
};