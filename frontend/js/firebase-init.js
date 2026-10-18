// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

// Firebase configuration
const firebaseConfig = {
     apiKey: "AIzaSyBV4g_qG7ZnYopMt8UcznQojJnByVzynhQ",
  authDomain: "televault-ead03.firebaseapp.com",
  projectId: "televault-ead03",
  storageBucket: "televault-ead03.firebasestorage.app",
  messagingSenderId: "292306570636",
  appId: "1:292306570636:web:f15004a0b5031d906ddaa9",
  measurementId: "G-LYC0XT6HEL"
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

if (!firebase.apps.length) {

    firebase.initializeApp(
        firebaseConfig
    );

}


// ======================================================
// FIREBASE AUTH
// ======================================================

const auth = firebase.auth();


// ======================================================
// EXPORT / GLOBAL
// ======================================================

// Because this project uses Firebase Compat,
// `auth` is available to the rest of your scripts.

console.log(
    "✅ Firebase initialized successfully"
);

console.log(
    "🔥 Firebase Project:",
    firebase.app().options.projectId
);



