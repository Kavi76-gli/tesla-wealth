const Transaction = require("../models/transaction");


// ==========================================
// HELPER - GET USER ID
// ==========================================

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?._id ||
        req.userId
    );

}


// ==========================================
// USER - MY TRANSACTIONS
// ==========================================

exports.getMyTransactions = async (req, res) => {

    try {

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }


        const transactions =
            await Transaction.find({

                userId: userId

            }).sort({

                createdAt: -1

            });


        return res.json({

            success: true,

            transactions

        });


    } catch (error) {

        console.error(
            "MY TRANSACTIONS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// ==========================================
// USER - SINGLE TRANSACTION
// ==========================================

exports.getTransactionById = async (req, res) => {

    try {

        const userId = getUserId(req);

        if (!userId) {

            return res.status(401).json({

                success: false,

                message: "Authentication required."

            });

        }


        const transaction =
            await Transaction.findOne({

                _id: req.params.id,

                userId: userId

            });


        if (!transaction) {

            return res.status(404).json({

                success: false,

                message: "Transaction not found."

            });

        }


        return res.json({

            success: true,

            transaction

        });


    } catch (error) {

        console.error(
            "TRANSACTION DETAILS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// ==========================================
// ADMIN - ALL TRANSACTIONS
// ==========================================

exports.getAllTransactions = async (req, res) => {

    try {

        const transactions =
            await Transaction.find()

                .populate(
                    "userId",
                    "name phone"
                )

                .sort({

                    createdAt: -1

                });


        return res.json({

            success: true,

            transactions

        });


    } catch (error) {

        console.error(
            "ALL TRANSACTIONS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};