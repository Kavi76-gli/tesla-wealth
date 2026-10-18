// =====================================================
// JWT AUTH MIDDLEWARE
// =====================================================

const jwt = require("jsonwebtoken");

const User = require("../models/user");


// =====================================================
// AUTHENTICATION
// =====================================================

module.exports = async (req, res, next) => {

    try {

        // =================================================
        // JWT SECRET
        // =================================================

        if (!process.env.JWT_SECRET) {

            console.error(
                "❌ JWT_SECRET is not configured."
            );

            return res.status(500).json({

                success: false,

                message:
                    "Authentication server configuration error."

            });

        }


        // =================================================
        // AUTHORIZATION HEADER
        // =================================================

        const authHeader =
            req.header("Authorization");


        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authorization denied."

            });

        }


        // =================================================
        // GET TOKEN
        // =================================================

        const token =
            authHeader
                .substring(7)
                .trim();


        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication token is missing."

            });

        }


        // =================================================
        // VERIFY JWT
        // =================================================

        const decoded =
            jwt.verify(

                token,

                process.env.JWT_SECRET

            );


        // =================================================
        // USER ID
        // =================================================

        if (!decoded.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid authentication token."

            });

        }


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findById(
                decoded.userId
            )
                .select(
                    "-password -mpinHash"
                );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        // =================================================
        // CHECK BLOCKED USER
        // =================================================

        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        // =================================================
        // ATTACH USER
        // =================================================

        req.user =
            user;


        // =================================================
        // CONTINUE
        // =================================================

        next();


    } catch (error) {

        console.error(
            "JWT AUTH ERROR:",
            error.message
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired token."

        });

    }

};