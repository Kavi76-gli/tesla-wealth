// =====================================================
// ADMIN AUTH MIDDLEWARE
// =====================================================

module.exports = (req, res, next) => {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        if (!req.user.isAdmin) {

            return res.status(403).json({

                success: false,

                message:
                    "Admin access required."

            });

        }


        next();


    } catch (error) {

        console.error(
            "ADMIN MIDDLEWARE ERROR:",
            error
        );


        return res.status(403).json({

            success: false,

            message:
                "Admin access denied."

        });

    }

};