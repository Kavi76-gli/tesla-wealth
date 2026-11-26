"use strict";

const mongoose = require("mongoose");
const crypto = require("crypto");

const User = require("../models/user");
const Referral = require("../models/Referral");
const Transaction = require("../models/transaction");

const ReferralReward = require("../models/ReferralReward");
const ReferralRewardClaim = require("../models/ReferralRewardClaim");


// =====================================================
// DEFAULT ACHIEVEMENTS
// =====================================================

const DEFAULT_REWARDS = [

    {
        milestone: 10,
        title: "Bronze Achievement",
        badge: "🥉",
        description: "Complete a team of 10 verified members.",
        rewardType: "badge",
        sortOrder: 1
    },

    {
        milestone: 20,
        title: "Silver Achievement",
        badge: "🥈",
        description: "Complete a team of 20 verified members.",
        rewardType: "badge",
        sortOrder: 2
    },

    {
        milestone: 30,
        title: "Gold Achievement",
        badge: "🥇",
        description: "Complete a team of 30 verified members.",
        rewardType: "badge",
        sortOrder: 3
    },

    {
        milestone: 40,
        title: "Special Admin Reward",
        badge: "🎁",
        description: "Complete a team of 40 verified members.",
        rewardType: "admin_choice",
        sortOrder: 4
    },

    {
        milestone: 50,
        title: "VIP Achievement",
        badge: "👑",
        description: "Complete a team of 50 verified members.",
        rewardType: "badge",
        sortOrder: 5
    },

    {
        milestone: 100,
        title: "Premium Achievement",
        badge: "💎",
        description: "Complete a team of 100 verified members.",
        rewardType: "badge",
        sortOrder: 6
    }

];


// =====================================================
// HELPERS
// =====================================================

function getUserId(req) {

    return req.user?.id ||
        req.user?._id ||
        req.userId;

}


function isAdmin(req) {

    return req.user?.isAdmin === true;

}


function money(value) {

    return Number(
        (Number(value) || 0).toFixed(2)
    );

}


function adminRequired(req, res) {

    if (!isAdmin(req)) {

        res.status(403).json({

            success: false,
            message: "Admin access required."

        });

        return false;

    }

    return true;

}


// =====================================================
// CREATE DEFAULT REWARDS IF NOT PRESENT
// =====================================================

async function ensureDefaultRewards() {

    const operations = DEFAULT_REWARDS.map(reward => ({

        updateOne: {

            filter: {
                milestone: reward.milestone
            },

            update: {
                $setOnInsert: reward
            },

            upsert: true

        }

    }));

    await ReferralReward.bulkWrite(operations);

}


// =====================================================
// COMPLETE TEAM CALCULATION
//
// Counts all generations.
// Only phone-verified and non-blocked members count.
//
// Important:
// Unverified or blocked parents are still traversed,
// so their eligible descendants are not lost.
// =====================================================
// =====================================================
// COMPLETE TEAM CALCULATION
// Counts all generations.
// Only COMPLETED, phone-verified and non-blocked
// members count toward achievements.
//
// Pending parents are still traversed so eligible
// descendants are not accidentally lost.
// =====================================================

async function calculateTeam(userId) {

    const rootId = String(userId);

    const visited = new Set([rootId]);

    let frontier = [rootId];

    let totalMembers = 0;
    let activeMembers = 0;
    let blockedMembers = 0;
    let unverifiedMembers = 0;
    let pendingMembers = 0;

    const levelStatistics = [];

    const MAX_DEPTH = 50;
    const MAX_NODES = 20000;

    let truncated = false;

    for (
        let level = 1;
        level <= MAX_DEPTH && frontier.length > 0;
        level++
    ) {

        const parentIds = frontier.map(
            id => new mongoose.Types.ObjectId(id)
        );

        const referrals = await Referral.find({

            referrer: {
                $in: parentIds
            },

            status: {
                $ne: "Cancelled"
            }

        })
        .select("referrer referredUser status")
        .populate({

            path: "referredUser",

            select: "phoneVerified isBlocked"

        })
        .lean();

        const nextFrontier = [];

        let levelCount = 0;

        for (const referral of referrals) {

            const member = referral.referredUser;

            if (!member) {
                continue;
            }

            const memberId = String(member._id);

            if (visited.has(memberId)) {
                continue;
            }

            if (totalMembers >= MAX_NODES) {

                truncated = true;
                break;

            }

            visited.add(memberId);

            const completed =
                referral.status === "Completed";

            const verified =
                member.phoneVerified === true;

            const blocked =
                member.isBlocked === true;

            // -----------------------------------------
            // COUNT ONLY QUALIFYING MEMBERS
            // -----------------------------------------

            if (completed && blocked) {

                blockedMembers++;

            } else if (completed && !verified) {

                unverifiedMembers++;

            } else if (!completed) {

                pendingMembers++;

            } else {

                totalMembers++;
                activeMembers++;
                levelCount++;

            }

            // -----------------------------------------
            // CONTINUE THROUGH ALL GENERATIONS
            // -----------------------------------------

            nextFrontier.push(memberId);

        }

        levelStatistics.push({

            level,

            memberCount: levelCount

        });

        frontier = nextFrontier;

        if (truncated) {
            break;
        }

    }

    return {

        totalMembers,
        activeMembers,
        blockedMembers,
        unverifiedMembers,
        pendingMembers,

        levelStatistics,

        totalLevels: levelStatistics.length,

        truncated

    };

}


// =====================================================
// USER: GET COMPLETE TEAM AND ACHIEVEMENTS
//
// GET /api/referral-rewards/my-team
// =====================================================

exports.getMyTeam = async (req, res) => {

    try {

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,
                message: "Authentication required."

            });

        }


        const user = await User.findById(userId)
            .select("name phone")
            .lean();


        if (!user) {

            return res.status(404).json({

                success: false,
                message: "User not found."

            });

        }


        await ensureDefaultRewards();


        const [

            team,

            rewards,

            claims

        ] = await Promise.all([

            calculateTeam(userId),

            ReferralReward.find({
                enabled: true
            }).sort({
                milestone: 1
            }).lean(),

            ReferralRewardClaim.find({
                user: userId
            }).lean()

        ]);


        const claimMap = new Map(

            claims.map(claim => [

                String(claim.reward),

                claim

            ])

        );


        const achievements = rewards.map(reward => {

            const claim = claimMap.get(
                String(reward._id)
            );


            const eligible =
                team.totalMembers >= reward.milestone;


            return {

                id: String(reward._id),

                milestone: reward.milestone,

                title: reward.title,

                badge: reward.badge,

                description: reward.description,

                rewardType: reward.rewardType,

                eligible,

                remaining: Math.max(
                    0,
                    reward.milestone - team.totalMembers
                ),

                progress: Math.min(

                    100,

                    Math.round(
                        team.totalMembers /
                        reward.milestone * 100
                    )

                ),

                claimed: Boolean(claim),

                claimStatus: claim?.status || null,

                claimId: claim
                    ? String(claim._id)
                    : null

            };

        });


        const directReferralRecords = await Referral.find({

    referrer: userId,

    status: "Completed"

})
.populate(
    "referredUser",
    "phoneVerified isBlocked"
)
.lean();

const directReferrals = directReferralRecords.filter(
    referral => {

        const member = referral.referredUser;

        return member &&
            member.phoneVerified === true &&
            member.isBlocked !== true;

    }
).length;


        return res.status(200).json({

            success: true,

            message: "Referral achievements loaded.",

            user: {

                name: user.name,

                phone: user.phone

            },

            summary: {

                totalTeamMembers: team.totalMembers,

                directReferrals,

                indirectReferrals: Math.max(

                    0,

                    team.totalMembers - directReferrals

                ),

                blockedMembers: team.blockedMembers,

                unverifiedMembers: team.unverifiedMembers,

                totalLevels: team.totalLevels

            },

            levelStatistics: team.levelStatistics,

            achievements,

            calculation: {

                verifiedMembersOnly: true,

                excludeBlockedMembers: true,

                excludeCancelledReferrals: true,

                truncated: team.truncated

            }

        });


    } catch (error) {

        console.error(
            "GET MY TEAM ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Unable to load referral achievements."

        });

    }

};


// =====================================================
// USER: CLAIM ACHIEVEMENT
//
// POST /api/referral-rewards/claim
//
// BODY:
// { "rewardId": "MONGODB_ID" }
// =====================================================

exports.claimReward = async (req, res) => {

    try {

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,
                message: "Authentication required."

            });

        }


        const { rewardId } = req.body;


        if (!mongoose.Types.ObjectId.isValid(rewardId)) {

            return res.status(400).json({

                success: false,
                message: "Invalid reward ID."

            });

        }


        const reward = await ReferralReward.findOne({

            _id: rewardId,

            enabled: true

        });


        if (!reward) {

            return res.status(404).json({

                success: false,
                message: "Achievement not found or disabled."

            });

        }


        const user = await User.findById(userId)
            .select("isBlocked");


        if (!user || user.isBlocked === true) {

            return res.status(403).json({

                success: false,
                message: "Your account is not eligible."

            });

        }


        // ---------------------------------------------
        // RECHECK TEAM ON SERVER
        // ---------------------------------------------

        const team = await calculateTeam(userId);


        if (team.truncated) {

            return res.status(409).json({

                success: false,

                message:
                    "Team calculation limit reached. Please contact support."

            });

        }


        if (team.totalMembers < reward.milestone) {

            return res.status(400).json({

                success: false,

                message: "You have not completed this achievement.",

                currentMembers: team.totalMembers,

                requiredMembers: reward.milestone

            });

        }


        // ---------------------------------------------
        // CREATE CLAIM
        // ---------------------------------------------

        const existingClaim = await ReferralRewardClaim.findOne({

            user: userId,

            reward: reward._id

        });


        if (existingClaim) {

            return res.status(409).json({

                success: false,

                message: "You have already claimed this achievement.",

                claimStatus: existingClaim.status

            });

        }


        const claim = await ReferralRewardClaim.create({

            user: userId,

            reward: reward._id,

            milestone: reward.milestone,

            teamCountAtClaim: team.totalMembers,

            status: "Pending"

        });


        return res.status(201).json({

            success: true,

            message: "Achievement claim submitted successfully.",

            claim

        });


    } catch (error) {

        if (error.code === 11000) {

            return res.status(409).json({

                success: false,

                message: "This achievement has already been claimed."

            });

        }


        console.error(
            "CLAIM REWARD ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Unable to submit achievement claim."

        });

    }

};


// =====================================================
// USER: REWARD HISTORY
//
// GET /api/referral-rewards/history
// =====================================================

exports.getMyRewardHistory = async (req, res) => {

    try {

        const userId = getUserId(req);


        const claims = await ReferralRewardClaim.find({

            user: userId

        })

        .populate(
            "reward",
            "title badge milestone description"
        )

        .sort({

            createdAt: -1

        })

        .lean();


        return res.status(200).json({

            success: true,

            claims

        });


    } catch (error) {

        console.error(
            "REWARD HISTORY ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Unable to load reward history."

        });

    }

};


// =====================================================
// ADMIN: CREATE ACHIEVEMENT
//
// POST /api/referral-rewards/admin/milestones
// =====================================================

exports.createMilestone = async (req, res) => {

    try {

        if (!adminRequired(req, res)) return;


        const {

            milestone,

            title,

            badge,

            description,

            rewardType,

            enabled

        } = req.body;


        const count = Number(milestone);


        if (
            !Number.isInteger(count) ||
            count < 1 ||
            count > 1000000
        ) {

            return res.status(400).json({

                success: false,
                message: "Invalid milestone."

            });

        }


        if (!title || !String(title).trim()) {

            return res.status(400).json({

                success: false,
                message: "Achievement title is required."

            });

        }


        const reward = await ReferralReward.create({

            milestone: count,

            title: String(title).trim(),

            badge: badge || "🏆",

            description: description || "",

            rewardType: rewardType || "badge",

            enabled: enabled !== false

        });


        return res.status(201).json({

            success: true,

            message: "Achievement created.",

            reward

        });


    } catch (error) {

        if (error.code === 11000) {

            return res.status(409).json({

                success: false,
                message: "This milestone already exists."

            });

        }


        console.error(
            "CREATE MILESTONE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,
            message: "Unable to create achievement."

        });

    }

};


// =====================================================
// ADMIN: UPDATE ACHIEVEMENT
//
// PATCH /admin/milestones/:id
// =====================================================

exports.updateMilestone = async (req, res) => {

    try {

        if (!adminRequired(req, res)) return;


        const allowed = [

            "milestone",

            "title",

            "badge",

            "description",

            "rewardType",

            "enabled",

            "sortOrder"

        ];


        const updates = {};


        for (const key of allowed) {

            if (req.body[key] !== undefined) {

                updates[key] = req.body[key];

            }

        }


        const reward = await ReferralReward.findByIdAndUpdate(

            req.params.id,

            {
                $set: updates
            },

            {
                new: true,
                runValidators: true
            }

        );


        if (!reward) {

            return res.status(404).json({

                success: false,
                message: "Achievement not found."

            });

        }


        return res.json({

            success: true,

            message: "Achievement updated.",

            reward

        });


    } catch (error) {

        console.error(
            "UPDATE MILESTONE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,
            message: "Unable to update achievement."

        });

    }

};


// =====================================================
// ADMIN: LIST ACHIEVEMENTS
//
// GET /admin/milestones
// =====================================================

exports.getAdminMilestones = async (req, res) => {

    try {

        if (!adminRequired(req, res)) return;


        await ensureDefaultRewards();


        const rewards = await ReferralReward.find()
            .sort({
                milestone: 1
            })
            .lean();


        return res.json({

            success: true,

            rewards

        });


    } catch (error) {

        console.error(error);


        return res.status(500).json({

            success: false,
            message: "Unable to load achievements."

        });

    }

};


// =====================================================
// ADMIN: GET CLAIMS
//
// GET /admin/claims
// =====================================================

exports.getAdminClaims = async (req, res) => {

    try {

        if (!adminRequired(req, res)) return;


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


        const filter = {};


        if (req.query.status) {

            filter.status = req.query.status;

        }


        const [

            claims,

            total

        ] = await Promise.all([

            ReferralRewardClaim.find(filter)

                .populate(
                    "user",
                    "name phone phoneVerified isBlocked inviteCode"
                )

                .populate(
                    "reward",
                    "title badge milestone description"
                )

                .populate(
                    "reviewedBy",
                    "name phone"
                )

                .sort({

                    createdAt: -1

                })

                .skip((page - 1) * limit)

                .limit(limit)

                .lean(),


            ReferralRewardClaim.countDocuments(filter)

        ]);


        return res.json({

            success: true,

            claims,

            pagination: {

                page,

                limit,

                total,

                totalPages: Math.ceil(total / limit)

            }

        });


    } catch (error) {

        console.error(
            "ADMIN CLAIMS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,
            message: "Unable to load reward claims."

        });

    }

};


// =====================================================
// ADMIN: APPROVE OR REJECT CLAIM
//
// PATCH /admin/claims/:id/review
//
// BODY:
// { "action": "approve", "adminNote": "..." }
// =====================================================

exports.reviewClaim = async (req, res) => {

    try {

        if (!adminRequired(req, res)) return;


        const action = String(
            req.body.action || ""
        ).toLowerCase();


        if (!["approve", "reject"].includes(action)) {

            return res.status(400).json({

                success: false,
                message: "Invalid review action."

            });

        }


        const claim = await ReferralRewardClaim.findOne({

            _id: req.params.id,

            status: "Pending"

        });


        if (!claim) {

            return res.status(404).json({

                success: false,

                message: "Pending claim not found."

            });

        }


        claim.status = action === "approve"
            ? "Approved"
            : "Rejected";


        claim.adminNote = String(
            req.body.adminNote || ""
        ).slice(0, 1000);


        claim.reviewedBy = getUserId(req);

        claim.reviewedAt = new Date();


        await claim.save();


        return res.json({

            success: true,

            message: action === "approve"
                ? "Claim approved. You can now issue the reward."
                : "Claim rejected.",

            claim

        });


    } catch (error) {

        console.error(
            "REVIEW CLAIM ERROR:",
            error
        );


        return res.status(500).json({

            success: false,
            message: "Unable to review claim."

        });

    }

};


// =====================================================
// ADMIN: ISSUE REWARD
//
// POST /admin/claims/:id/issue
//
// CASH:
// {
//   "type": "cash",
//   "title": "Special Cash Reward",
//   "description": "40 member achievement",
//   "amount": 5000
// }
//
// OTHER:
// {
//   "type": "vip_plan",
//   "title": "VIP Membership",
//   "description": "Special VIP membership",
//   "amount": 0
// }
// =====================================================

exports.issueReward = async (req, res) => {

    try {

        if (!adminRequired(req, res)) return;


        const {

            type,

            title,

            description,

            amount

        } = req.body;


        const allowedTypes = [

            "cash",

            "vip_plan",

            "custom",

            "badge"

        ];


        if (!allowedTypes.includes(type)) {

            return res.status(400).json({

                success: false,
                message: "Invalid reward type."

            });

        }


        if (!title || !String(title).trim()) {

            return res.status(400).json({

                success: false,
                message: "Reward title is required."

            });

        }


        const cashAmount = Number(amount || 0);


        if (
            !Number.isFinite(cashAmount) ||
            cashAmount < 0 ||
            (type === "cash" && cashAmount <= 0)
        ) {

            return res.status(400).json({

                success: false,
                message: "Invalid reward amount."

            });

        }


        const claim = await ReferralRewardClaim.findOne({

            _id: req.params.id,

            status: "Approved"

        });


        if (!claim) {

            return res.status(404).json({

                success: false,

                message: "Approved claim not found or already issued."

            });

        }


        const issuedReward = {

            type,

            title: String(title).trim(),

            description: String(description || "").slice(0, 2000),

            amount: type === "cash"
                ? money(cashAmount)
                : 0

        };


        // ---------------------------------------------
        // CASH REWARD
        // Wallet and transaction must update atomically.
        // Requires MongoDB replica set or transaction-
        // capable sharded cluster.
        // ---------------------------------------------

        if (type === "cash") {

            const session = await mongoose.startSession();


            try {

                await session.withTransaction(async () => {

                    // Atomically reserve this claim for issuance.
                    const reservedClaim =
                        await ReferralRewardClaim.findOneAndUpdate(

                            {

                                _id: claim._id,

                                status: "Approved"

                            },

                            {

                                $set: {

                                    status: "Rewarded",

                                    issuedReward,

                                    issuedAt: new Date()

                                }

                            },

                            {

                                new: true,

                                session

                            }

                        );


                    if (!reservedClaim) {

                        throw new Error(
                            "Claim has already been issued."
                        );

                    }


                    const updatedUser = await User.updateOne(

                        {

                            _id: claim.user,

                            isBlocked: {
                                $ne: true
                            }

                        },

                        {

                            $inc: {
                                balance: issuedReward.amount
                            }

                        },

                        {
                            session
                        }

                    );


                    if (updatedUser.modifiedCount !== 1) {

                        throw new Error(
                            "User not found or blocked."
                        );

                    }


                    await Transaction.create([{

                        userId: claim.user,

                        txId: "RWD-" + crypto.randomUUID(),

                        type: "Referral Achievement Reward",

                        amount: issuedReward.amount,

                        description:
                            `${issuedReward.title} - ${claim.milestone} team members`

                    }], {
                        session
                    });


                });


            } finally {

                await session.endSession();

            }

        } else {

            // -----------------------------------------
            // NON-CASH REWARD
            // -----------------------------------------

            const updatedClaim =
                await ReferralRewardClaim.findOneAndUpdate(

                    {

                        _id: claim._id,

                        status: "Approved"

                    },

                    {

                        $set: {

                            status: "Rewarded",

                            issuedReward,

                            issuedAt: new Date()

                        }

                    },

                    {

                        new: true

                    }

                );


            if (!updatedClaim) {

                return res.status(409).json({

                    success: false,

                    message: "Reward has already been issued."

                });

            }

        }


        return res.status(200).json({

            success: true,

            message: "Special reward issued successfully.",

            issuedReward

        });


    } catch (error) {

        console.error(
            "ISSUE REWARD ERROR:",
            error
        );


        if (
            error.code === 11000 ||
            error.message.includes("already been issued")
        ) {

            return res.status(409).json({

                success: false,
                message: error.message

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Unable to issue reward. No successful payment was confirmed."

        });

    }

};