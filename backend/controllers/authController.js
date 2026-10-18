
const User = require("../models/user");
const Transaction = require("../models/transaction");
const Referral = require("../models/Referral");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// =====================================================
// HELPER: CREATE JWT TOKEN
// =====================================================

function createToken(userId) {

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured in .env");
    }

    return jwt.sign(
        {
            userId: userId
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}


// =====================================================
// HELPER: CLEAN INDIAN PHONE
// =====================================================

function cleanIndianPhone(phone) {

    let cleanPhone = String(phone || "")
        .replace(/\D/g, "")
        .trim();

    if (
        cleanPhone.length === 12 &&
        cleanPhone.startsWith("91")
    ) {
        cleanPhone = cleanPhone.slice(2);
    }

    if (cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10);
    }

    return cleanPhone;
}


// =====================================================
// HELPER: GET USER ID
// =====================================================

function getUserId(req) {

    return (
        req.user?.userId ||
        req.user?._id ||
        req.user?.id ||
        null
    );
}


// =====================================================
// HELPER: USER RESPONSE
// =====================================================

function getUserResponse(user) {

    return {

        id: user._id,

        name: user.name,

        phone: user.phone,

        phoneVerified:
            user.phoneVerified || false,

        mpinSet:
            user.mpinSet || false,

        inviteCode:
            user.inviteCode,

        referralBy:
            user.referralBy,

        balance:
            user.balance,

        earnings:
            user.earnings,

        activeInvestments:
            user.activeInvestments,

        totalDeposit:
            user.totalDeposit,

        totalWithdraw:
            user.totalWithdraw,

        profileImage:
            user.profileImage,

        isAdmin:
            user.isAdmin

    };
}


// =====================================================
// HELPER: FIREBASE VERIFIED PHONE
// =====================================================

function getFirebasePhone(req) {

    return req.firebaseUser?.phone_number || null;

}


// =====================================================
// REGISTER USER
// FIREBASE PHONE OTP REQUIRED
// =====================================================

exports.register = async (req, res) => {

    try {

        const {
            name,
            phone,
            password,
            referralBy,
            referralCode
        } = req.body;


        // ==============================================
        // FIREBASE VERIFICATION REQUIRED
        // ==============================================

        if (!req.firebaseUser) {

            return res.status(401).json({

                success: false,

                message:
                    "Please verify your mobile number with OTP."

            });

        }


        const firebasePhone =
            getFirebasePhone(req);


        if (!firebasePhone) {

            return res.status(401).json({

                success: false,

                message:
                    "Firebase verified phone number not found."

            });

        }


        // ==============================================
        // REQUIRED FIELDS
        // ==============================================

        if (!name || !phone || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide name, mobile number and password."

            });

        }


        // ==============================================
        // NAME
        // ==============================================

        const cleanName =
            String(name).trim();


        if (cleanName.length < 2) {

            return res.status(400).json({

                success: false,

                message:
                    "Name must contain at least 2 characters."

            });

        }


        if (cleanName.length > 50) {

            return res.status(400).json({

                success: false,

                message:
                    "Name cannot exceed 50 characters."

            });

        }


        // ==============================================
        // PHONE
        // ==============================================

        const cleanPhone =
            cleanIndianPhone(phone);

        const verifiedPhone =
            cleanIndianPhone(firebasePhone);


        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 10-digit Indian mobile number."

            });

        }


        // ==============================================
        // FIREBASE PHONE MUST MATCH
        // ==============================================

        if (cleanPhone !== verifiedPhone) {

            return res.status(400).json({

                success: false,

                message:
                    "Verified mobile number does not match."

            });

        }


        // ==============================================
        // PASSWORD
        // ==============================================

        const cleanPassword =
            String(password);


        if (cleanPassword.length < 6) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 6 characters."

            });

        }


        // ==============================================
        // EXISTING USER
        // ==============================================

        const existingUser =
            await User.findOne({
                phone: cleanPhone
            });


        if (existingUser) {

            return res.status(400).json({

                success: false,

                message:
                    "This mobile number is already registered."

            });

        }


        // ==============================================
        // HASH PASSWORD
        // ==============================================

        const hashedPassword =
            await bcrypt.hash(
                cleanPassword,
                10
            );


        // ==============================================
        // UNIQUE INVITE CODE
        // ==============================================

        let inviteCode;

        let inviteExists = true;


        while (inviteExists) {

            inviteCode =
                Math.floor(
                    10000 +
                    Math.random() * 90000
                ).toString();


            const existingInvite =
                await User.findOne({
                    inviteCode: inviteCode
                });


            inviteExists =
                !!existingInvite;

        }


        // ==============================================
        // REFERRAL
        // ==============================================

        const suppliedReferralCode =
            referralCode ||
            referralBy ||
            "";


        const cleanReferralCode =
            suppliedReferralCode
                ? String(suppliedReferralCode)
                    .trim()
                    .toUpperCase()
                : "";


        let referrer = null;


        if (cleanReferralCode) {

            referrer =
                await User.findOne({
                    inviteCode:
                        cleanReferralCode
                });


            if (!referrer) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid referral code."

                });

            }

        }


        // ==============================================
        // WELCOME BONUS
        // ==============================================

        const welcomeBonus = 12.00;


        // ==============================================
        // CREATE USER
        // ==============================================

        const user =
            new User({

                name:
                    cleanName,

                phone:
                    cleanPhone,

                password:
                    hashedPassword,

                firebaseUid:
                    req.firebaseUser.uid,

                phoneVerified:
                    true,

                phoneVerifiedAt:
                    new Date(),

                mpinHash:
                    null,

                mpinSet:
                    false,

                mpinFailedAttempts:
                    0,

                mpinLockedUntil:
                    null,

                mpinUpdatedAt:
                    null,

                referralBy:
                    referrer
                        ? cleanReferralCode
                        : "",

                inviteCode:
                    inviteCode,

                balance:
                    welcomeBonus

            });


        await user.save();


        // ==============================================
        // WELCOME TRANSACTION
        // ==============================================

        const txId =
            "TX" +
            Date.now() +
            Math.floor(
                Math.random() * 10000
            );


        await Transaction.create({

            userId:
                user._id,

            txId:
                txId,

            type:
                "Welcome Bonus",

            amount:
                welcomeBonus

        });


        // ==============================================
        // REFERRAL RELATIONSHIP
        // ==============================================

        if (referrer) {

            await Referral.create({

                referrer:
                    referrer._id,

                referredUser:
                    user._id,

                referralCode:
                    cleanReferralCode,

                welcomeBonus:
                    welcomeBonus,

                totalCommission:
                    0,

                qualifyingDeposits:
                    0,

                status:
                    "Pending"

            });


            await User.findByIdAndUpdate(

                referrer._id,

                {
                    $inc: {
                        referralCount: 1
                    }
                }

            );

        }


        // ==============================================
        // JWT
        // ==============================================

        const token =
            createToken(user._id);


        // ==============================================
        // SUCCESS
        // ==============================================

        return res.status(201).json({

            success: true,

            message:
                "Registration successful.",

            token:

                token,

            user:
                getUserResponse(user),

            referral: {

                applied:
                    !!referrer,

                referralCode:
                    referrer
                        ? cleanReferralCode
                        : null,

                welcomeBonus:
                    welcomeBonus,

                referrerCommission:
                    0

            }

        });


    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );


        if (error.code === 11000) {

            return res.status(400).json({

                success: false,

                message:
                    "Mobile number, Firebase account or invite code already exists."

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Registration failed. Please try again."

        });

    }

};


// =====================================================
// LOGIN
// =====================================================

exports.login = async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body;


        if (!phone || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter mobile number and password."

            });

        }


        const cleanPhone =
            cleanIndianPhone(phone);


        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Indian mobile number."

            });

        }


        const user =
            await User.findOne({
                phone: cleanPhone
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid mobile number or password."

            });

        }


        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        const passwordMatch =
            await bcrypt.compare(
                String(password),
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid mobile number or password."

            });

        }


        const token =
            createToken(user._id);


        return res.status(200).json({

            success: true,

            message:
                "Login successful.",

            token:
                token,

            user:
                getUserResponse(user)

        });


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Authentication server error."

        });

    }

};



// =====================================================
// LOGIN WITH M-PIN
// POST /api/auth/login-mpin
// =====================================================

exports.loginMPin = async (req, res) => {

    try {

        const {
            phone,
            mpin
        } = req.body;


        // =================================================
        // REQUIRED FIELDS
        // =================================================

        if (!phone || !mpin) {

            return res.status(400).json({

                success: false,

                message:
                    "Mobile number and M-PIN are required."

            });

        }


        // =================================================
        // CLEAN PHONE
        // =================================================

        const cleanPhone =
            cleanIndianPhone(phone);


        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Indian mobile number."

            });

        }


        // =================================================
        // M-PIN MUST BE 4 DIGITS
        // =================================================

        const cleanMpin =
            String(mpin).trim();


        if (!/^\d{4}$/.test(cleanMpin)) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN must contain exactly 4 digits."

            });

        }


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findOne({
                phone: cleanPhone
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid mobile number or M-PIN."

            });

        }


        // =================================================
        // BLOCKED ACCOUNT
        // =================================================

        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        // =================================================
        // CHECK M-PIN EXISTS
        // =================================================

        if (
            !user.mpinSet ||
            !user.mpinHash
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN is not set. Please create your M-PIN first."

            });

        }


        // =================================================
        // CHECK LOCK
        // =================================================

        if (
            user.mpinLockedUntil &&
            user.mpinLockedUntil > new Date()
        ) {

            const remainingMinutes =
                Math.ceil(
                    (
                        user.mpinLockedUntil -
                        new Date()
                    ) / 60000
                );


            return res.status(429).json({

                success: false,

                message:
                    `M-PIN is temporarily locked. Try again in ${remainingMinutes} minute(s).`

            });

        }


        // =================================================
        // VERIFY M-PIN
        // =================================================

        const valid =
            await bcrypt.compare(
                cleanMpin,
                user.mpinHash
            );


        // =================================================
        // WRONG M-PIN
        // =================================================

        if (!valid) {

            user.mpinFailedAttempts =
                Number(
                    user.mpinFailedAttempts || 0
                ) + 1;


            if (
                user.mpinFailedAttempts >= 5
            ) {

                user.mpinLockedUntil =
                    new Date(
                        Date.now() +
                        15 * 60 * 1000
                    );

                user.mpinFailedAttempts = 0;

                await user.save();


                return res.status(429).json({

                    success: false,

                    message:
                        "Too many incorrect attempts. M-PIN locked for 15 minutes."

                });

            }


            await user.save();


            return res.status(401).json({

                success: false,

                message:
                    "Incorrect M-PIN.",

                remainingAttempts:
                    5 -
                    user.mpinFailedAttempts

            });

        }


        // =================================================
        // SUCCESS
        // =================================================

        user.mpinFailedAttempts = 0;
        user.mpinLockedUntil = null;

        await user.save();


        // =================================================
        // CREATE JWT
        // =================================================

        const token =
            createToken(user._id);


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({

            success: true,

            message:
                "M-PIN login successful.",

            token:

                token,

            user:

                getUserResponse(user)

        });


    } catch (error) {

        console.error(
            "LOGIN M-PIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "M-PIN login failed. Please try again."

        });

    }

};
// =====================================================
// SET M-PIN
// =====================================================

exports.setMPin = async (req, res) => {

    try {

        const {
            mpin
        } = req.body;


        if (!mpin) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN is required."

            });

        }


        const cleanMpin =
            String(mpin).trim();


        if (!/^\d{4}$/.test(cleanMpin)) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN must contain exactly 6 digits."

            });

        }


        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        if (
            user.mpinSet &&
            user.mpinHash
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN is already set. Please use change M-PIN."

            });

        }


        user.mpinHash =
            await bcrypt.hash(
                cleanMpin,
                12
            );

        user.mpinSet =
            true;

        user.mpinFailedAttempts =
            0;

        user.mpinLockedUntil =
            null;

        user.mpinUpdatedAt =
            new Date();


        await user.save();


        return res.status(200).json({

            success: true,

            message:
                "M-PIN created successfully."

        });


    } catch (error) {

        console.error(
            "SET MPIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create M-PIN."

        });

    }

};


// =====================================================
// VERIFY M-PIN
// =====================================================

exports.verifyMPin = async (req, res) => {

    try {

        const {
            mpin
        } = req.body;


        if (!mpin) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN is required."

            });

        }


        const cleanMpin =
            String(mpin).trim();


        if (!/^\d{4}$/.test(cleanMpin)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid M-PIN format."

            });

        }


        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        if (
            !user.mpinSet ||
            !user.mpinHash
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please create your M-PIN first."

            });

        }


        // ==============================================
        // CHECK LOCK
        // ==============================================

        if (
            user.mpinLockedUntil &&
            user.mpinLockedUntil > new Date()
        ) {

            const remainingMinutes =
                Math.ceil(
                    (
                        user.mpinLockedUntil -
                        new Date()
                    ) / 60000
                );


            return res.status(429).json({

                success: false,

                message:
                    `M-PIN is temporarily locked. Try again in ${remainingMinutes} minute(s).`

            });

        }


        // ==============================================
        // VERIFY
        // ==============================================

        const valid =
            await bcrypt.compare(
                cleanMpin,
                user.mpinHash
            );


        if (!valid) {

            user.mpinFailedAttempts =
                Number(
                    user.mpinFailedAttempts || 0
                ) + 1;


            if (
                user.mpinFailedAttempts >= 5
            ) {

                user.mpinLockedUntil =
                    new Date(
                        Date.now() +
                        15 * 60 * 1000
                    );

                user.mpinFailedAttempts =
                    0;


                await user.save();


                return res.status(429).json({

                    success: false,

                    message:
                        "Too many incorrect attempts. M-PIN locked for 15 minutes."

                });

            }


            await user.save();


            return res.status(401).json({

                success: false,

                message:
                    "Incorrect M-PIN.",

                remainingAttempts:
                    5 -
                    user.mpinFailedAttempts

            });

        }


        user.mpinFailedAttempts =
            0;

        user.mpinLockedUntil =
            null;


        await user.save();


        return res.status(200).json({

            success: true,

            verified: true,

            message:
                "M-PIN verified successfully."

        });


    } catch (error) {

        console.error(
            "VERIFY MPIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to verify M-PIN."

        });

    }

};


// =====================================================
// CHANGE M-PIN
// =====================================================

exports.changeMPin = async (req, res) => {

    try {

        const {
            currentMpin,
            newMpin
        } = req.body;


        if (!currentMpin || !newMpin) {

            return res.status(400).json({

                success: false,

                message:
                    "Current and new M-PIN are required."

            });

        }


        if (
            !/^\d{6}$/.test(
                String(currentMpin)
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Current M-PIN must contain 6 digits."

            });

        }


        if (
            !/^\d{6}$/.test(
                String(newMpin)
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "New M-PIN must contain exactly 6 digits."

            });

        }


        if (
            String(currentMpin) ===
            String(newMpin)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "New M-PIN must be different."

            });

        }


        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        if (
            !user.mpinSet ||
            !user.mpinHash
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN has not been created yet."

            });

        }


        if (
            user.mpinLockedUntil &&
            user.mpinLockedUntil > new Date()
        ) {

            return res.status(429).json({

                success: false,

                message:
                    "M-PIN is temporarily locked."

            });

        }


        const currentValid =
            await bcrypt.compare(
                String(currentMpin),
                user.mpinHash
            );


        if (!currentValid) {

            return res.status(401).json({

                success: false,

                message:
                    "Current M-PIN is incorrect."

            });

        }


        user.mpinHash =
            await bcrypt.hash(
                String(newMpin),
                12
            );

        user.mpinSet =
            true;

        user.mpinFailedAttempts =
            0;

        user.mpinLockedUntil =
            null;

        user.mpinUpdatedAt =
            new Date();


        await user.save();


        return res.status(200).json({

            success: true,

            message:
                "M-PIN changed successfully."

        });


    } catch (error) {

        console.error(
            "CHANGE MPIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to change M-PIN."

        });

    }

};


// =====================================================
// RESET PASSWORD
// FIREBASE OTP REQUIRED
// =====================================================

exports.resetPassword = async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body;


        if (!req.firebaseUser) {

            return res.status(401).json({

                success: false,

                message:
                    "Please verify your mobile number with OTP."

            });

        }


        if (!phone || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Mobile number and new password are required."

            });

        }


        const cleanPhone =
            cleanIndianPhone(phone);


        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Indian mobile number."

            });

        }


        const firebasePhone =
            getFirebasePhone(req);


        if (!firebasePhone) {

            return res.status(401).json({

                success: false,

                message:
                    "Firebase verified phone number not found."

            });

        }


        const verifiedPhone =
            cleanIndianPhone(firebasePhone);


        if (
            verifiedPhone !==
            cleanPhone
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Verified mobile number does not match."

            });

        }


        const cleanPassword =
            String(password);


        if (cleanPassword.length < 6) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 6 characters."

            });

        }


        const user =
            await User.findOne({
                phone: cleanPhone
            });


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        // ==============================================
        // FIREBASE ACCOUNT BINDING
        // ==============================================

        if (
            user.firebaseUid &&
            user.firebaseUid !==
            req.firebaseUser.uid
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Firebase account does not match this user."

            });

        }


        user.firebaseUid =
            req.firebaseUser.uid;

        user.phoneVerified =
            true;

        user.phoneVerifiedAt =
            new Date();


        user.password =
            await bcrypt.hash(
                cleanPassword,
                10
            );


        await user.save();


        return res.status(200).json({

            success: true,

            message:
                "Password reset successfully. You can now login."

        });


    } catch (error) {

        console.error(
            "RESET PASSWORD ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to reset password."

        });

    }

};


// =====================================================
// RESET M-PIN
// FIREBASE OTP REQUIRED
// =====================================================

exports.resetMPin = async (req, res) => {

    try {

        const {
            phone,
            mpin
        } = req.body;


        if (!req.firebaseUser) {

            return res.status(401).json({

                success: false,

                message:
                    "Please verify your mobile number with OTP."

            });

        }


        if (!phone || !mpin) {

            return res.status(400).json({

                success: false,

                message:
                    "Mobile number and new M-PIN are required."

            });

        }


        const cleanPhone =
            cleanIndianPhone(phone);


        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Indian mobile number."

            });

        }


        const cleanMpin =
            String(mpin).trim();


        if (!/^\d{4}$/.test(cleanMpin)) {

            return res.status(400).json({

                success: false,

                message:
                    "M-PIN must contain exactly 6 digits."

            });

        }


        const firebasePhone =
            getFirebasePhone(req);


        if (!firebasePhone) {

            return res.status(401).json({

                success: false,

                message:
                    "Firebase verified phone number not found."

            });

        }


        const verifiedPhone =
            cleanIndianPhone(
                firebasePhone
            );


        if (
            verifiedPhone !==
            cleanPhone
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Verified mobile number does not match."

            });

        }


        const user =
            await User.findOne({
                phone: cleanPhone
            });


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        // ==============================================
        // FIREBASE ACCOUNT BINDING
        // ==============================================

        if (
            user.firebaseUid &&
            user.firebaseUid !==
            req.firebaseUser.uid
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Firebase account does not match this user."

            });

        }


        user.firebaseUid =
            req.firebaseUser.uid;

        user.phoneVerified =
            true;

        user.phoneVerifiedAt =
            new Date();


        // ==============================================
        // NEW M-PIN
        // ==============================================

        user.mpinHash =
            await bcrypt.hash(
                cleanMpin,
                12
            );

        user.mpinSet =
            true;

        user.mpinFailedAttempts =
            0;

        user.mpinLockedUntil =
            null;

        user.mpinUpdatedAt =
            new Date();


        await user.save();


        return res.status(200).json({

            success: true,

            message:
                "M-PIN reset successfully."

        });


    } catch (error) {

        console.error(
            "RESET MPIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to reset M-PIN."

        });

    }

};


// =====================================================
// GET PROFILE
// =====================================================

exports.getProfile = async (req, res) => {

    try {

        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        return res.status(200).json({

            success: true,

            user:
                getUserResponse(user)

        });


    } catch (error) {

        console.error(
            "GET PROFILE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load profile."

        });

    }

};






// =====================================================
// CHECK PHONE
// POST /api/auth/check-phone
// =====================================================

exports.checkPhone = async (req, res) => {

    try {

        let { phone } = req.body;

        if (!phone) {

            return res.status(400).json({
                success: false,
                message: "Mobile number is required."
            });

        }

        phone = String(phone)
            .replace(/\D/g, "")
            .slice(-10);

        if (!/^[6-9]\d{9}$/.test(phone)) {

            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit Indian mobile number."
            });

        }

        const user = await User.findOne({
            phone: phone
        }).select("_id phone");

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "No account was found with this mobile number."
            });

        }

        return res.status(200).json({
            success: true,
            message: "Mobile number is registered."
        });

    } catch (error) {

        console.error(
            "CHECK PHONE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to check mobile number."
        });

    }

};
// =====================================================
// CHANGE PASSWORD
// =====================================================

exports.changePassword = async (req, res) => {

    try {

        const {
            currentPassword,
            newPassword
        } = req.body;


        if (
            !currentPassword ||
            !newPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your current and new password."

            });

        }


        if (
            String(newPassword).length < 6
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "New password must be at least 6 characters."

            });

        }


        const userId =
            getUserId(req);


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        if (user.isBlocked) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been blocked."

            });

        }


        const passwordMatch =
            await bcrypt.compare(
                String(currentPassword),
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Current password is incorrect."

            });

        }


        const samePassword =
            await bcrypt.compare(
                String(newPassword),
                user.password
            );


        if (samePassword) {

            return res.status(400).json({

                success: false,

                message:
                    "New password must be different from your current password."

            });

        }


        user.password =
            await bcrypt.hash(
                String(newPassword),
                10
            );


        await user.save();


        return res.status(200).json({

            success: true,

            message:
                "Password changed successfully."

        });


    } catch (error) {

        console.error(
            "CHANGE PASSWORD ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to change password."

        });

    }

};


// =====================================================
// ADMIN PROFILE
// =====================================================

exports.adminProfile = async (req, res) => {

    return res.json({

        success: true,

        message:
            "Welcome Admin",

        admin:
            req.user

    });

};


// =====================================================
// GET ALL USERS
// =====================================================

exports.getAllUsers = async (req, res) => {

    try {

        const users =
            await User.find({})

                .select(
                    "-password -mpinHash -__v"
                )

                .sort({
                    createdAt: -1
                });


        return res.status(200).json({

            success: true,

            totalUsers:
                users.length,

            users:
                users

        });


    } catch (error) {

        console.error(
            "GET ALL USERS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// =====================================================
// GET SINGLE USER
// =====================================================

exports.getUser = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.params.id
            )

                .select(
                    "-password -mpinHash -__v"
                );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        return res.status(200).json({

            success: true,

            user:
                user

        });


    } catch (error) {

        console.error(
            "GET USER ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// =====================================================
// BLOCK / UNBLOCK USER
// =====================================================

exports.blockUser = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.params.id
            );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        user.isBlocked =
            !user.isBlocked;


        await user.save();


        return res.status(200).json({

            success: true,

            message:

                user.isBlocked
                    ? "User blocked successfully."
                    : "User unblocked successfully."

        });


    } catch (error) {

        console.error(
            "BLOCK USER ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// =====================================================
// DELETE USER
// =====================================================

exports.deleteUser = async (req, res) => {

    try {

        const user =
            await User.findById(
                req.params.id
            );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        await User.findByIdAndDelete(
            req.params.id
        );


        return res.status(200).json({

            success: true,

            message:
                "User deleted successfully."

        });


    } catch (error) {

        console.error(
            "DELETE USER ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// =====================================================
// ADMIN DASHBOARD
// =====================================================

exports.adminDashboard = async (req, res) => {

    try {

        const totalUsers =
            await User.countDocuments();


        const activeUsers =
            await User.countDocuments({
                isBlocked: false
            });


        const blockedUsers =
            await User.countDocuments({
                isBlocked: true
            });


        const admins =
            await User.countDocuments({
                isAdmin: true
            });


        return res.status(200).json({

            success: true,

            dashboard: {

                totalUsers,

                activeUsers,

                blockedUsers,

                admins,

                totalDeposits:
                    0,

                totalWithdrawals:
                    0,

                investmentPlans:
                    0,

                purchaseHistory:
                    0,

                dailyIncome:
                    0

            }

        });


    } catch (error) {

        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};

