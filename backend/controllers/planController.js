const Plan = require("../models/plan");


// ==========================================
// VALID CATEGORIES
// ==========================================

const VALID_CATEGORIES = [
    "starter",
    "pro",
    "elite"
];


// ==========================================
// DEFAULT PLANS
// ==========================================

const defaultPlans = [

    // STARTER CATEGORY

    {
        name: "Starter Plan",
        category: "starter",
        description: "Best for beginners",
        image: "/uploads/starter.png",
        price: 500,
        dailyIncome: 35,
        days: 30,
        totalIncome: 1050,
        status: true,
        sortOrder: 1
    },

    {
        name: "Silver Plan",
        category: "starter",
        description: "Entry level plan",
        image: "/uploads/silver.png",
        price: 1000,
        dailyIncome: 75,
        days: 30,
        totalIncome: 2250,
        status: true,
        sortOrder: 2
    },


    // PRO CATEGORY

    {
        name: "Gold Plan",
        category: "pro",
        description: "Advanced investment plan",
        image: "/uploads/gold.png",
        price: 3000,
        dailyIncome: 230,
        days: 30,
        totalIncome: 6900,
        status: true,
        sortOrder: 3
    },

    {
        name: "Diamond Plan",
        category: "pro",
        description: "Premium level plan",
        image: "/uploads/diamond.png",
        price: 5000,
        dailyIncome: 420,
        days: 30,
        totalIncome: 12600,
        status: true,
        sortOrder: 4
    },


    // ELITE CATEGORY

    {
        name: "VIP Plan",
        category: "elite",
        description: "Elite level plan",
        image: "/uploads/vip.png",
        price: 10000,
        dailyIncome: 900,
        days: 30,
        totalIncome: 27000,
        status: true,
        sortOrder: 5
    }

];


// ==========================================
// GET PLANS
// ==========================================

exports.getPlans = async (req, res) => {

    try {

        let plans = await Plan
            .find()
            .sort({
                category: 1,
                sortOrder: 1
            });


        // Create default plans if database is empty

        if (plans.length === 0) {

            await Plan.insertMany(defaultPlans);

            plans = await Plan
                .find()
                .sort({
                    category: 1,
                    sortOrder: 1
                });

        }


        res.json({

            success: true,

            plans

        });


    } catch (error) {

        console.error(
            "GET PLANS ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ==========================================
// CREATE PLAN
// ==========================================

exports.createPlan = async (req, res) => {

    try {

        console.log("===== CREATE PLAN =====");

        console.log("BODY:", req.body);

        console.log("FILE:", req.file);


        const {

            name,
            category,
            description,
            price,
            dailyIncome,
            days,
            totalIncome,
            status,
            sortOrder

        } = req.body;


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!name || !name.trim()) {

            return res.status(400).json({

                success: false,

                message: "Plan name is required."

            });

        }


        // CATEGORY REQUIRED

        if (!category) {

            return res.status(400).json({

                success: false,

                message: "Please select a category."

            });

        }


        const normalizedCategory =
            category.toLowerCase().trim();


        if (
            !VALID_CATEGORIES.includes(
                normalizedCategory
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid category. Choose Starter, Pro, or Elite."

            });

        }


        // PRICE VALIDATION

        if (
            price === undefined ||
            Number(price) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Plan price must be greater than 0."

            });

        }


        // DAILY INCOME VALIDATION

        if (
            dailyIncome === undefined ||
            Number(dailyIncome) < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Daily income is required."

            });

        }


        // DAYS VALIDATION

        if (
            days === undefined ||
            Number(days) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Plan duration must be greater than 0."

            });

        }


        // ==========================================
        // IMAGE
        // ==========================================

        let image = "";


        if (req.file) {

            image =
                `/uploads/${req.file.filename}`;

        }


        // ==========================================
        // CREATE PLAN
        // ==========================================

        const plan = new Plan({

            name:
                name.trim(),

            category:
                normalizedCategory,

            description:
                description
                    ? description.trim()
                    : "",

            image,

            price:
                Number(price),

            dailyIncome:
                Number(dailyIncome),

            days:
                Number(days),

            totalIncome:
                totalIncome !== undefined &&
                totalIncome !== ""
                    ? Number(totalIncome)
                    : Number(dailyIncome) *
                      Number(days),

            status:
                status === "false"
                    ? false
                    : true,

            sortOrder:
                Number(sortOrder || 0)

        });


        await plan.save();


        res.status(201).json({

            success: true,

            message:
                "Plan created successfully.",

            plan

        });


    } catch (error) {

        console.error(
            "CREATE PLAN ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ==========================================
// UPDATE PLAN
// ==========================================

exports.updatePlan = async (req, res) => {

    try {

        const plan =
            await Plan.findById(
                req.params.id
            );


        if (!plan) {

            return res.status(404).json({

                success: false,

                message:
                    "Investment plan not found."

            });

        }


        const {

            name,
            category,
            description,
            price,
            dailyIncome,
            days,
            totalIncome,
            status,
            sortOrder

        } = req.body;


        // NAME

        if (
            name !== undefined &&
            name.trim()
        ) {

            plan.name =
                name.trim();

        }


        // CATEGORY

        if (category !== undefined) {

            const normalizedCategory =
                category.toLowerCase().trim();


            if (
                !VALID_CATEGORIES.includes(
                    normalizedCategory
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid category. Choose Starter, Pro, or Elite."

                });

            }


            plan.category =
                normalizedCategory;

        }


        // DESCRIPTION

        if (description !== undefined) {

            plan.description =
                description.trim();

        }


        // PRICE

        if (price !== undefined) {

            if (Number(price) <= 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Price must be greater than 0."

                });

            }

            plan.price =
                Number(price);

        }


        // DAILY INCOME

        if (dailyIncome !== undefined) {

            plan.dailyIncome =
                Number(dailyIncome);

        }


        // DAYS

        if (days !== undefined) {

            if (Number(days) <= 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Days must be greater than 0."

                });

            }

            plan.days =
                Number(days);

        }


        // TOTAL INCOME

        if (
            totalIncome !== undefined &&
            totalIncome !== ""
        ) {

            plan.totalIncome =
                Number(totalIncome);

        }


        // STATUS

        if (status !== undefined) {

            plan.status =
                status !== "false";

        }


        // SORT ORDER

        if (sortOrder !== undefined) {

            plan.sortOrder =
                Number(sortOrder);

        }


        // NEW IMAGE

        if (req.file) {

            plan.image =
                `/uploads/${req.file.filename}`;

        }


        await plan.save();


        res.json({

            success: true,

            message:
                "Plan updated successfully.",

            plan

        });


    } catch (error) {

        console.error(
            "UPDATE PLAN ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ==========================================
// DELETE PLAN
// ==========================================

exports.deletePlan = async (req, res) => {

    try {

        const plan =
            await Plan.findByIdAndDelete(
                req.params.id
            );


        if (!plan) {

            return res.status(404).json({

                success: false,

                message:
                    "Plan not found."

            });

        }


        res.json({

            success: true,

            message:
                "Plan deleted successfully."

        });


    } catch (error) {

        console.error(
            "DELETE PLAN ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};