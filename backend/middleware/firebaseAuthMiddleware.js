// ======================================================
// FIREBASE AUTH MIDDLEWARE
// ======================================================

const { firebaseAuth } = require("../config/firebaseAdmin");

async function firebaseAuthMiddleware(req, res, next) {

    try {

        // ------------------------------------------------
        // Get Authorization header
        // ------------------------------------------------

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Firebase authorization token is required."
            });
        }

        // ------------------------------------------------
        // Check Bearer format
        // ------------------------------------------------

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format."
            });
        }

        // ------------------------------------------------
        // Extract Firebase ID token
        // ------------------------------------------------

        const idToken = authHeader.substring(7).trim();

        if (!idToken) {
            return res.status(401).json({
                success: false,
                message: "Firebase ID token is missing."
            });
        }

        // ------------------------------------------------
        // Verify Firebase token
        // ------------------------------------------------

        const decodedToken = await firebaseAuth.verifyIdToken(idToken);

        // ------------------------------------------------
        // Validate Firebase UID
        // ------------------------------------------------

        if (!decodedToken.uid) {
            return res.status(401).json({
                success: false,
                message: "Invalid Firebase user."
            });
        }

        // ------------------------------------------------
        // Validate phone number
        // ------------------------------------------------

        if (!decodedToken.phone_number) {
            return res.status(401).json({
                success: false,
                message: "Firebase phone number is missing."
            });
        }

        // ------------------------------------------------
        // Make sure this is phone authentication
        // ------------------------------------------------

        if (
            decodedToken.firebase &&
            decodedToken.firebase.sign_in_provider &&
            decodedToken.firebase.sign_in_provider !== "phone"
        ) {
            return res.status(401).json({
                success: false,
                message: "Phone authentication is required."
            });
        }

        // ------------------------------------------------
        // Attach verified Firebase user
        // ------------------------------------------------

        req.firebaseUser = decodedToken;

        console.log(
            "✅ Firebase token verified:",
            decodedToken.phone_number
        );

        next();

    } catch (error) {

        console.error(
            "❌ Firebase token verification failed:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired Firebase authentication token."
        });
    }
}

module.exports = firebaseAuthMiddleware;