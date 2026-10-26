// =====================================================
// TESLA WEALTH — ADMIN AUTHORIZATION MIDDLEWARE
// =====================================================

const User = require("../models/user");

module.exports = async function adminMiddleware(req, res, next) {
    try {

        // =================================================
        // 1. VERIFY AUTHENTICATION
        // authMiddleware MUST run before this middleware.
        // =================================================

        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // =================================================
        // 2. FETCH CURRENT USER PERMISSIONS FROM DATABASE
        // Do not trust client-supplied admin permissions.
        // =================================================

        const admin = await User.findById(req.user._id)
            .select("_id name phone isAdmin isBlocked");

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        // =================================================
        // 3. CHECK ACCOUNT BLOCK STATUS
        // =================================================

        if (admin.isBlocked === true) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked."
            });
        }

        // =================================================
        // 4. CHECK ADMINISTRATOR PERMISSION
        // =================================================

        if (admin.isAdmin !== true) {
            return res.status(403).json({
                success: false,
                message: "Administrator access required."
            });
        }

        // =================================================
        // 5. ATTACH VERIFIED ADMIN TO REQUEST
        // Controllers can use req.admin for admin identity.
        // =================================================

        req.admin = admin;

        // =================================================
        // 6. CONTINUE TO THE PROTECTED ROUTE
        // =================================================

        return next();

    } catch (error) {

        console.error(
            "TESLA WEALTH ADMIN AUTHORIZATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify administrator permissions."
        });
    }
};