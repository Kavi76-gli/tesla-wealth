// ======================================================
// FIREBASE ADMIN SDK
// ======================================================

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// ------------------------------------------------------
// Firebase Admin configuration
// ------------------------------------------------------

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY
        .replace(/^"(.*)"$/s, "$1")
        .replace(/\\n/g, "\n")
        .replace(/\r/g, "")
        .trim()
    : null;
// ------------------------------------------------------
// Validate configuration
// ------------------------------------------------------

if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
        "Firebase Admin configuration is missing. " +
        "Please configure FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env"
    );
}

// ------------------------------------------------------
// Initialize Firebase only once
// ------------------------------------------------------

let firebaseApp;

if (getApps().length === 0) {
    firebaseApp = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey
        })
    });

    console.log("✅ Firebase Admin initialized");
} else {
    firebaseApp = getApps()[0];

    console.log("✅ Firebase Admin already initialized");
}

// ------------------------------------------------------
// Firebase Authentication
// ------------------------------------------------------

const firebaseAuth = getAuth(firebaseApp);

// ------------------------------------------------------
// Export
// ------------------------------------------------------

module.exports = {
    firebaseApp,
    firebaseAuth
};