// =====================================================
// AUTH ROUTES
// Firebase OTP + Password + M-PIN
// =====================================================

const express = require("express");

const router = express.Router();


// =====================================================
// CONTROLLER
// =====================================================

const authController = require(
    "../controllers/authController"
);


// =====================================================
// JWT AUTH MIDDLEWARE
// =====================================================

let authMiddleware;

try {

    authMiddleware = require(
        "../middleware/authMiddleware"
    );

} catch (error) {

    console.warn(
        "⚠️ authMiddleware not found. Protected routes disabled."
    );

    authMiddleware = null;

}


// =====================================================
// FIREBASE AUTH MIDDLEWARE
// =====================================================

const firebaseAuthMiddleware = require(
    "../middleware/firebaseAuthMiddleware"
);


// =====================================================
// CONTROLLER DEBUG
// =====================================================

console.log("\n====================================");
console.log("AUTH ROUTES CHECK");
console.log("====================================");

console.log(
    "register:",
    typeof authController.register
);

console.log(
    "login:",
    typeof authController.login
);

console.log(
    "resetPassword:",
    typeof authController.resetPassword
);

console.log(
    "changePassword:",
    typeof authController.changePassword
);

console.log(
    "setMPin:",
    typeof authController.setMPin
);

console.log(
    "changeMPin:",
    typeof authController.changeMPin
);

console.log(
    "verifyMPin:",
    typeof authController.verifyMPin
);

console.log(
    "resetMPin:",
    typeof authController.resetMPin
);

console.log(
    "getProfile:",
    typeof authController.getProfile
);

console.log(
    "adminProfile:",
    typeof authController.adminProfile
);

console.log(
    "getAllUsers:",
    typeof authController.getAllUsers
);

console.log(
    "getUser:",
    typeof authController.getUser
);

console.log(
    "blockUser:",
    typeof authController.blockUser
);

console.log(
    "deleteUser:",
    typeof authController.deleteUser
);

console.log(
    "adminDashboard:",
    typeof authController.adminDashboard
);

console.log("====================================\n");


// =====================================================
// REGISTER USER
// POST /api/auth/register
//
// Firebase OTP verification required.
// Frontend sends:
//
// Authorization: Bearer FIREBASE_ID_TOKEN
//
// firebaseAuthMiddleware verifies the token and creates:
//
// req.firebaseUser
// =====================================================

if (typeof authController.register === "function") {

    router.post(
        "/register",
        firebaseAuthMiddleware,
        authController.register
    );

} else {

    console.error(
        "❌ register function is missing from authController"
    );

}


// =====================================================
// LOGIN USER
// POST /api/auth/login
//
// Normal phone + password login.
// Firebase OTP is NOT required here.
// =====================================================

if (typeof authController.login === "function") {

    router.post(
        "/login",
        authController.login
    );

} else {

    console.error(
        "❌ login function is missing from authController"
    );

}




// =====================================================
// LOGIN WITH M-PIN
// POST /api/auth/login-mpin
//
// M-PIN is the default login method.
// JWT is created after successful M-PIN verification.
// =====================================================

if (typeof authController.loginMPin === "function") {

    router.post(
        "/login-mpin",
        authController.loginMPin
    );

} else {

    console.error(
        "❌ loginMPin function is missing from authController"
    );

}




// =====================================================
// CHECK PHONE
// POST /api/auth/check-phone
// =====================================================

if (typeof authController.checkPhone === "function") {

    router.post(
        "/check-phone",
        authController.checkPhone
    );

} else {

    console.error(
        "❌ checkPhone function is missing from authController"
    );

}
// =====================================================
// RESET PASSWORD
// POST /api/auth/reset-password
//
// Firebase OTP verification required.
// =====================================================

if (typeof authController.resetPassword === "function") {

    router.post(
        "/reset-password",
        firebaseAuthMiddleware,
        authController.resetPassword
    );

} else {

    console.error(
        "❌ resetPassword function is missing from authController"
    );

}


// =====================================================
// PROTECTED JWT ROUTES
// =====================================================

if (typeof authMiddleware === "function") {


    // =================================================
    // GET PROFILE
    // GET /api/auth/profile
    // =================================================

    if (typeof authController.getProfile === "function") {

        router.get(
            "/profile",
            authMiddleware,
            authController.getProfile
        );

    }


    // =================================================
    // CHANGE PASSWORD
    // POST /api/auth/change-password
    // =================================================

    if (typeof authController.changePassword === "function") {

        router.post(
            "/change-password",
            authMiddleware,
            authController.changePassword
        );

    }


    // =================================================
    // SET M-PIN
    // POST /api/auth/set-mpin
    // =================================================

    if (typeof authController.setMPin === "function") {

        router.post(
            "/set-mpin",
            authMiddleware,
            authController.setMPin
        );

    }


    // =================================================
    // CHANGE M-PIN
    // POST /api/auth/change-mpin
    // =================================================

    if (typeof authController.changeMPin === "function") {

        router.post(
            "/change-mpin",
            authMiddleware,
            authController.changeMPin
        );

    }


    // =================================================
    // VERIFY M-PIN
    // POST /api/auth/verify-mpin
    // =================================================

    if (typeof authController.verifyMPin === "function") {

        router.post(
            "/verify-mpin",
            authMiddleware,
            authController.verifyMPin
        );

    }


    // =================================================
    // ADMIN PROFILE
    // GET /api/auth/admin/profile
    // =================================================

    if (typeof authController.adminProfile === "function") {

        router.get(
            "/admin/profile",
            authMiddleware,
            authController.adminProfile
        );

    }


    // =================================================
    // GET ALL USERS
    // GET /api/auth/admin/users
    // =================================================

    if (typeof authController.getAllUsers === "function") {

        router.get(
            "/admin/users",
            authMiddleware,
            authController.getAllUsers
        );

    }


    // =================================================
    // GET SINGLE USER
    // GET /api/auth/admin/users/:id
    // =================================================

    if (typeof authController.getUser === "function") {

        router.get(
            "/admin/users/:id",
            authMiddleware,
            authController.getUser
        );

    }


    // =================================================
    // BLOCK / UNBLOCK USER
    // PUT /api/auth/admin/users/:id/block
    // =================================================

    if (typeof authController.blockUser === "function") {

        router.put(
            "/admin/users/:id/block",
            authMiddleware,
            authController.blockUser
        );

    }


    // =================================================
    // DELETE USER
    // DELETE /api/auth/admin/users/:id
    // =================================================

    if (typeof authController.deleteUser === "function") {

        router.delete(
            "/admin/users/:id",
            authMiddleware,
            authController.deleteUser
        );

    }


    // =================================================
    // ADMIN DASHBOARD
    // GET /api/auth/admin/dashboard
    // =================================================

    if (typeof authController.adminDashboard === "function") {

        router.get(
            "/admin/dashboard",
            authMiddleware,
            authController.adminDashboard
        );

    }


} else {

    console.warn(
        "⚠️ Protected auth routes were not registered because authMiddleware is unavailable."
    );

}


// =====================================================
// FIREBASE OTP → RESET M-PIN
// POST /api/auth/reset-mpin
//
// Firebase SMS verification is required.
// JWT login is NOT required.
// =====================================================

if (typeof authController.resetMPin === "function") {

    router.post(
        "/reset-mpin",
        firebaseAuthMiddleware,
        authController.resetMPin
    );

} else {

    console.error(
        "❌ resetMPin function is missing from authController"
    );

}


// =====================================================
// ROUTE NOT FOUND
// =====================================================

router.use((req, res) => {

    return res.status(404).json({

        success: false,

        message: "Auth API route not found."

    });

});


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;