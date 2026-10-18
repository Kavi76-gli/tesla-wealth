const admin = require("../config/firebaseAdmin");

async function verifyFirebaseToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Firebase authentication token is required."
            });
        }

        const idToken = authHeader.split("Bearer ")[1];

        if (!idToken) {
            return res.status(401).json({
                success: false,
                message: "Invalid Firebase authentication token."
            });
        }

        const decodedToken = await admin
            .auth()
            .verifyIdToken(idToken);

        req.firebaseUser = decodedToken;

        next();

    } catch (error) {

        console.error(
            "FIREBASE TOKEN ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Firebase verification failed. Please verify your mobile number again."
        });
    }
}

module.exports = verifyFirebaseToken;