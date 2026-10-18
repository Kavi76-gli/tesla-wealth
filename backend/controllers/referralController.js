const mongoose = require("mongoose");

const User = require("../models/user");
const Referral = require("../models/Referral");
const Deposit = require("../models/deposit");
const ReferralCommission = require("../models/ReferralCommission");

// ======================================================
// HELPERS
// ======================================================

function getUserId(req) {
    return req.user?.id || req.user?._id || req.userId;
}

function money(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCsv(value) {
    let text = String(value ?? "");

    // Prevent spreadsheet formula injection.
    if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

function getDateFilter(query) {
    const filter = {};

    if (query.startDate || query.endDate) {
        const start = query.startDate
            ? new Date(query.startDate)
            : null;

        const end = query.endDate
            ? new Date(query.endDate)
            : null;

        if (
            (start && Number.isNaN(start.getTime())) ||
            (end && Number.isNaN(end.getTime()))
        ) {
            return {
                error: "Invalid date. Use YYYY-MM-DD."
            };
        }

        if (start && end && start > end) {
            return {
                error: "Start date cannot be after end date."
            };
        }

        filter.createdAt = {};

        if (start) {
            start.setHours(0, 0, 0, 0);
            filter.createdAt.$gte = start;
        }

        if (end) {
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    return { filter };
}

function csvResponse(res, filename, headers, rows) {
    const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
    );

    return res.status(200).send("\uFEFF" + csv);
}

// ======================================================
// GET MY REFERRAL INFORMATION
// GET /api/referral/my
// ======================================================

exports.getMyReferral = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const user = await User.findById(userId)
            .select(
                "name phone inviteCode referralCount referralEarnings"
            )
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const referrals = await Referral.find({
            referrer: userId
        })
            .populate(
                "referredUser",
                "name phone createdAt"
            )
            .sort({
                createdAt: -1,
                _id: -1
            })
            .lean();

        const referralCommission = referrals.reduce(
            (total, referral) => {
                return total + Number(
                    referral.totalCommission || 0
                );
            },
            0
        );

        const totalReferralEarnings = Math.max(
            Number(user.referralEarnings || 0),
            referralCommission
        );

        return res.status(200).json({
            success: true,
            referralCode: user.inviteCode || "",
            referralCount: referrals.length,
            referralEarnings: money(totalReferralEarnings),
            referrals
        });

    } catch (error) {
        console.error("GET REFERRAL ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load referral information."
        });
    }
};

// ======================================================
// BUILD ADMIN REPORT FILTER
// ======================================================

async function buildAdminReferralFilter(query) {
    const referralFilter = {};

    // ----------------------------------------------
    // SEARCH BY NAME, PHONE, OR REFERRAL CODE
    // ----------------------------------------------

    const search = String(query.search || "").trim();

    if (search) {
        const safeSearch = escapeRegex(search);

        const matchingUsers = await User.find({
            $or: [
                {
                    name: {
                        $regex: safeSearch,
                        $options: "i"
                    }
                },
                {
                    phone: {
                        $regex: safeSearch,
                        $options: "i"
                    }
                },
                {
                    inviteCode: {
                        $regex: safeSearch,
                        $options: "i"
                    }
                }
            ]
        })
            .select("_id")
            .lean();

        const matchingUserIds = matchingUsers.map(
            user => user._id
        );

        referralFilter.$or = [
            {
                referralCode: {
                    $regex: safeSearch,
                    $options: "i"
                }
            },
            {
                referrer: {
                    $in: matchingUserIds
                }
            },
            {
                referredUser: {
                    $in: matchingUserIds
                }
            }
        ];
    }

    // ----------------------------------------------
    // REFERRAL STATUS
    // Pending / Completed / Cancelled
    // ----------------------------------------------

    if (query.referralStatus) {
        const allowedStatuses = [
            "Pending",
            "Completed",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(query.referralStatus)) {
            throw new Error("Invalid referral status.");
        }

        referralFilter.status = query.referralStatus;
    }

    // ----------------------------------------------
    // REGISTRATION DATE FILTER
    // Referral.createdAt is used here.
    // ----------------------------------------------

    const dateResult = getDateFilter(query);

    if (dateResult.error) {
        throw new Error(dateResult.error);
    }

    if (dateResult.filter.createdAt) {
        referralFilter.createdAt = dateResult.filter.createdAt;
    }

    // ----------------------------------------------
    // COMMISSION STATUS FILTER
    // Credited / Failed
    // ----------------------------------------------

    if (query.commissionStatus) {
        const allowedCommissionStatuses = [
            "Credited",
            "Failed"
        ];

        if (
            !allowedCommissionStatuses.includes(
                query.commissionStatus
            )
        ) {
            throw new Error("Invalid commission status.");
        }

        const commissionReferralIds =
            await ReferralCommission.distinct("referral", {
                status: query.commissionStatus
            });

        const existingIdFilter = referralFilter._id;

        if (existingIdFilter) {
            referralFilter.$and = [
                { _id: existingIdFilter },
                {
                    _id: {
                        $in: commissionReferralIds
                    }
                }
            ];

            delete referralFilter._id;
        } else {
            referralFilter._id = {
                $in: commissionReferralIds
            };
        }
    }

    return referralFilter;
}

// ======================================================
// ADMIN: COMPLETE REFERRAL REPORT
//
// GET /api/referral/admin/report
//
// Query parameters:
// page=1
// limit=25
// search=phone or name
// referralStatus=Pending
// commissionStatus=Credited
// startDate=2026-01-01
// endDate=2026-12-31
// format=csv
// ======================================================

exports.getAdminReferralReport = async (req, res) => {
    try {
        // ----------------------------------------------
        // VERIFY ADMIN ACCESS
        // ----------------------------------------------

        if (!req.user || req.user.isAdmin !== true) {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        // ----------------------------------------------
        // PAGINATION
        // ----------------------------------------------

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(
                1,
                parseInt(req.query.limit, 10) || 25
            )
        );

        const skip = (page - 1) * limit;

        // ----------------------------------------------
        // FILTERS
        // ----------------------------------------------

        let referralFilter;

        try {
            referralFilter = await buildAdminReferralFilter(
                req.query
            );
        } catch (filterError) {
            return res.status(400).json({
                success: false,
                message: filterError.message
            });
        }

        // ----------------------------------------------
        // SUMMARY STATISTICS
        //
        // Commission totals use commission records.
        // ----------------------------------------------

        const [
            totalUsers,
            totalReferrals,
            totalReferrers,
            commissionStats,
            welcomeBonusStats,
            approvedDepositStats,
            filteredCount
        ] = await Promise.all([
            User.countDocuments(),

            Referral.countDocuments(),

            Referral.distinct("referrer"),

            ReferralCommission.aggregate([
                {
                    $group: {
                        _id: "$status",
                        totalAmount: {
                            $sum: "$commissionAmount"
                        },
                        records: {
                            $sum: 1
                        }
                    }
                }
            ]),

            Referral.aggregate([
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$welcomeBonus"
                        }
                    }
                }
            ]),

            Deposit.aggregate([
                {
                    $match: {
                        status: "Approved"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$amount"
                        }
                    }
                }
            ]),

            Referral.countDocuments(referralFilter)
        ]);

        const creditedStats = commissionStats.find(
            item => item._id === "Credited"
        );

        const failedStats = commissionStats.find(
            item => item._id === "Failed"
        );

        // ----------------------------------------------
        // LOAD REFERRALS
        // ----------------------------------------------

        const referralQuery = Referral.find(referralFilter)
            .select(
                "referrer referredUser referralCode welcomeBonus totalCommission qualifyingDeposits status completedAt createdAt"
            )
            .populate(
                "referrer",
                "name phone inviteCode referralCount referralEarnings"
            )
            .populate(
                "referredUser",
                "name phone inviteCode createdAt"
            )
            .sort({
                createdAt: -1,
                _id: -1
            });

        // CSV export downloads all matching referrals.
        // JSON responses use pagination.

        const isCsv = String(req.query.format || "")
            .toLowerCase() === "csv";

        if (!isCsv) {
            referralQuery.skip(skip).limit(limit);
        }

        const referrals = await referralQuery.lean();

        // ----------------------------------------------
        // COLLECT REFERRED USER IDS
        // ----------------------------------------------

        const referredUserIds = [
            ...new Set(
                referrals
                    .map(item => item.referredUser?._id)
                    .filter(Boolean)
                    .map(id => String(id))
            )
        ].map(id => new mongoose.Types.ObjectId(id));

        const referralIds = referrals.map(
            referral => referral._id
        );

        // ----------------------------------------------
        // APPROVED DEPOSIT TOTAL FOR EACH REFERRED USER
        // ----------------------------------------------

        let depositTotals = [];

        if (referredUserIds.length > 0) {
            depositTotals = await Deposit.aggregate([
                {
                    $match: {
                        user: {
                            $in: referredUserIds
                        },
                        status: "Approved"
                    }
                },
                {
                    $group: {
                        _id: "$user",
                        approvedDepositTotal: {
                            $sum: "$amount"
                        },
                        approvedDepositCount: {
                            $sum: 1
                        }
                    }
                }
            ]);
        }

        const depositMap = new Map(
            depositTotals.map(item => [
                String(item._id),
                {
                    approvedDepositTotal: money(
                        item.approvedDepositTotal
                    ),
                    approvedDepositCount:
                        item.approvedDepositCount
                }
            ])
        );

        // ----------------------------------------------
        // COMMISSION RECORDS FOR DISPLAYED REFERRALS
        // ----------------------------------------------

        let commissionRecords = [];

        if (referralIds.length > 0) {
            commissionRecords = await ReferralCommission.find({
                referral: {
                    $in: referralIds
                }
            })
                .populate(
                    "deposit",
                    "utr amount status createdAt"
                )
                .sort({
                    createdAt: -1,
                    _id: -1
                })
                .lean();
        }

        const commissionMap = new Map();

        for (const commission of commissionRecords) {
            const key = String(commission.referral);

            if (!commissionMap.has(key)) {
                commissionMap.set(key, {
                    totalCommission: 0,
                    creditedCommission: 0,
                    failedCommission: 0,
                    records: []
                });
            }

            const group = commissionMap.get(key);

            const amount = Number(
                commission.commissionAmount || 0
            );

            // Actual credited commission only.
            if (commission.status === "Credited") {
                group.totalCommission += amount;
                group.creditedCommission += amount;
            } else if (commission.status === "Failed") {
                group.failedCommission += amount;
            }

            group.records.push({
                commissionRecordId: String(commission._id),

                depositId: commission.deposit
                    ? String(commission.deposit._id)
                    : String(commission.deposit || ""),

                transactionId: commission.deposit?.utr || "",

                depositAmount: money(
                    commission.depositAmount
                ),

                commissionRate: Number(
                    commission.commissionRate || 0
                ),

                commissionAmount: money(amount),

                status: commission.status,

                depositStatus: commission.deposit?.status || "",

                commissionCreatedAt: commission.createdAt || null,

                depositCreatedAt: commission.deposit?.createdAt || null
            });
        }

        // ----------------------------------------------
        // BUILD FINAL REPORT RECORDS
        // ----------------------------------------------

        const reportRecords = referrals.map(referral => {
            const referredUser = referral.referredUser || {};
            const referrer = referral.referrer || {};

            const depositInfo = depositMap.get(
                String(referredUser._id || "")
            ) || {
                approvedDepositTotal: 0,
                approvedDepositCount: 0
            };

            const commissionInfo = commissionMap.get(
                String(referral._id)
            ) || {
                totalCommission: 0,
                creditedCommission: 0,
                failedCommission: 0,
                records: []
            };

            return {
                referralId: String(referral._id),

                referrer: {
                    id: referrer._id
                        ? String(referrer._id)
                        : "",
                    name: referrer.name || "",
                    phone: referrer.phone || "",
                    referralCode: referrer.inviteCode || ""
                },

                referredUser: {
                    id: referredUser._id
                        ? String(referredUser._id)
                        : "",
                    name: referredUser.name || "",
                    phone: referredUser.phone || ""
                },

                referralCode: referral.referralCode || "",

                registrationDate:
                    referredUser.createdAt ||
                    referral.createdAt ||
                    null,

                signupBonus: money(referral.welcomeBonus),

                referralStatus: referral.status,

                qualifyingDeposits: Number(
                    referral.qualifyingDeposits || 0
                ),

                approvedDepositTotal:
                    depositInfo.approvedDepositTotal,

                approvedDepositCount:
                    depositInfo.approvedDepositCount,

                // Commission credited according to the
                // individual commission records.
                commissionEarned: money(
                    commissionInfo.creditedCommission
                ),

                failedCommission: money(
                    commissionInfo.failedCommission
                ),

                // Kept separately for reconciliation.
                referralStoredCommission: money(
                    referral.totalCommission
                ),

                commissionRecords: commissionInfo.records
            };
        });

        // ----------------------------------------------
        // CSV EXPORT
        // One row per commission record.
        // A referral without commission records still
        // receives one row.
        // ----------------------------------------------

        if (isCsv) {
            const headers = [
                "Referral ID",
                "Referrer Name",
                "Referrer Phone",
                "Referred User Name",
                "Referred User Phone",
                "Referral Code",
                "Registration Date",
                "Signup Bonus",
                "Referral Status",
                "Approved Deposit Total",
                "Approved Deposit Count",
                "Commission Rate (%)",
                "Commission Amount",
                "Commission Status",
                "Deposit UTR",
                "Deposit ID",
                "Commission Record ID"
            ];

            const rows = [];

            for (const record of reportRecords) {
                if (record.commissionRecords.length === 0) {
                    rows.push([
                        record.referralId,
                        record.referrer.name,
                        record.referrer.phone,
                        record.referredUser.name,
                        record.referredUser.phone,
                        record.referralCode,
                        record.registrationDate
                            ? new Date(
                                record.registrationDate
                            ).toISOString()
                            : "",
                        record.signupBonus,
                        record.referralStatus,
                        record.approvedDepositTotal,
                        record.approvedDepositCount,
                        "",
                        "",
                        "",
                        "",
                        "",
                        ""
                    ]);

                    continue;
                }

                for (const commission of record.commissionRecords) {
                    rows.push([
                        record.referralId,
                        record.referrer.name,
                        record.referrer.phone,
                        record.referredUser.name,
                        record.referredUser.phone,
                        record.referralCode,
                        record.registrationDate
                            ? new Date(
                                record.registrationDate
                            ).toISOString()
                            : "",
                        record.signupBonus,
                        record.referralStatus,
                        record.approvedDepositTotal,
                        record.approvedDepositCount,
                        commission.commissionRate,
                        commission.commissionAmount,
                        commission.status,
                        commission.transactionId,
                        commission.depositId,
                        commission.commissionRecordId
                    ]);
                }
            }

            return csvResponse(
                res,
                "admin-referral-report.csv",
                headers,
                rows
            );
        }

        // ----------------------------------------------
        // JSON RESPONSE
        // ----------------------------------------------

        return res.status(200).json({
            success: true,

            message: "Admin referral report loaded.",

            summary: {
                totalUsers,

                totalReferrals,

                totalReferrers: totalReferrers.length,

                totalApprovedDeposits: money(
                    approvedDepositStats[0]?.total || 0
                ),

                totalWelcomeBonuses: money(
                    welcomeBonusStats[0]?.total || 0
                ),

                totalCreditedCommission: money(
                    creditedStats?.totalAmount || 0
                ),

                totalFailedCommission: money(
                    failedStats?.totalAmount || 0
                ),

                creditedCommissionRecords:
                    creditedStats?.records || 0,

                failedCommissionRecords:
                    failedStats?.records || 0
            },

            pagination: {
                page,

                limit,

                totalRecords: filteredCount,

                totalPages: Math.ceil(
                    filteredCount / limit
                )
            },

            filters: {
                search: req.query.search || "",

                referralStatus:
                    req.query.referralStatus || "",

                commissionStatus:
                    req.query.commissionStatus || "",

                startDate: req.query.startDate || "",

                endDate: req.query.endDate || ""
            },

            referrals: reportRecords
        });

    } catch (error) {
        console.error(
            "ADMIN REFERRAL REPORT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load admin referral report."
        });
    }
};