// =====================================================
// BITCOIN INVEST
// FORGOT PASSWORD
// REAL FIREBASE SMS OTP SYSTEM
// =====================================================


// =====================================================
// FIREBASE IMPORTS
// =====================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


// =====================================================
// FIREBASE CONFIG
// USE THE SAME CONFIG AS YOUR WORKING FIREBASE APP
// =====================================================

 const firebaseConfig = {
  apiKey: "AIzaSyBV4g_qG7ZnYopMt8UcznQojJnByVzynhQ",
  authDomain: "televault-ead03.firebaseapp.com",
  projectId: "televault-ead03",
  storageBucket: "televault-ead03.firebasestorage.app",
  messagingSenderId: "292306570636",
  appId: "1:292306570636:web:f15004a0b5031d906ddaa9",
  measurementId: "G-LYC0XT6HEL"
};


// =====================================================
// INITIALIZE FIREBASE
// =====================================================

const firebaseApp =
    initializeApp(firebaseConfig);


// =====================================================
// FIREBASE AUTH
// =====================================================

const auth =
    getAuth(firebaseApp);


// =====================================================
// API URL
// =====================================================

const API_URL =
    "https://tesla-wealth.onrender.com/api/auth";


// =====================================================
// FIREBASE VARIABLES
// =====================================================

let confirmationResult = null;

let verifiedPhone = null;

let firebaseUser = null;

let resendTimer = null;

let resendSeconds = 30;

let otpVerified = false;

let recaptchaVerifier = null;


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupInputs();

        initializeRecaptcha();

    }
);


// =====================================================
// INPUT SETUP
// =====================================================

function setupInputs() {

    const phoneInput =
        document.getElementById("phone");

    const otpInput =
        document.getElementById("otp");


    // =================================================
    // PHONE INPUT
    // =================================================

    if (phoneInput) {

        phoneInput.addEventListener(
            "input",
            () => {

                phoneInput.value =
                    phoneInput.value
                        .replace(/\D/g, "")
                        .slice(0, 10);

            }
        );

    }


    // =================================================
    // OTP INPUT
    // =================================================

    if (otpInput) {

        otpInput.addEventListener(
            "input",
            () => {

                otpInput.value =
                    otpInput.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

            }
        );

    }

}


// =====================================================
// INITIALIZE RECAPTCHA
// =====================================================

function initializeRecaptcha() {

    try {

        if (
            recaptchaVerifier
        ) {

            return;

        }


        recaptchaVerifier =
            new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                {

                    size: "normal",

                    callback: () => {

                        console.log(
                            "Firebase reCAPTCHA verified."
                        );

                    },

                    "expired-callback": () => {

                        console.warn(
                            "Firebase reCAPTCHA expired."
                        );

                    }

                }
            );


        recaptchaVerifier.render()
            .then((widgetId) => {

                console.log(
                    "Firebase reCAPTCHA ready:",
                    widgetId
                );

            })
            .catch((error) => {

                console.error(
                    "RECAPTCHA RENDER ERROR:",
                    error
                );

            });


    } catch (error) {

        console.error(
            "RECAPTCHA INITIALIZATION ERROR:",
            error
        );

    }

}


// =====================================================
// CHECK ACCOUNT
// =====================================================

async function checkPhone(phone) {

    const response =
        await fetch(
            `${API_URL}/check-phone`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        phone:
                            phone

                    })

            }
        );


    let data = {};

    try {

        data =
            await response.json();

    } catch (error) {

        console.warn(
            "Unable to parse account-check response.",
            error
        );

    }


    if (response.status === 404) {

        throw new Error(
            "Password recovery service is currently unavailable. Please try again later."
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to check your mobile number."
        );

    }


    if (!data.success) {

        throw new Error(
            data.message ||
            "No account was found with this mobile number."
        );

    }


    return data;

}


// =====================================================
// SEND REAL FIREBASE SMS OTP
// =====================================================

async function sendOTP() {

    const phoneInput =
        document.getElementById("phone");

    const button =
        document.getElementById("sendOtpButton");


    if (!phoneInput || !button) {

        return;

    }


    const phone =
        phoneInput.value.trim();


    // =================================================
    // VALIDATE PHONE
    // =================================================

    if (!/^[6-9]\d{9}$/.test(phone)) {

        showWarning(
            "Please enter a valid 10-digit Indian mobile number."
        );

        phoneInput.focus();

        return;

    }


    try {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Checking Account...</span>
        `;


        // =================================================
        // CHECK ACCOUNT FIRST
        // =================================================

        await checkPhone(phone);


        verifiedPhone =
            phone;

        otpVerified =
            false;

        firebaseUser =
            null;


        // =================================================
        // ENSURE RECAPTCHA EXISTS
        // =================================================

        if (!recaptchaVerifier) {

            initializeRecaptcha();

        }


        if (!recaptchaVerifier) {

            throw new Error(
                "Firebase security verification could not be initialized."
            );

        }


        // =================================================
        // SEND REAL SMS
        // =================================================

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Sending SMS...</span>
        `;


        const firebasePhone =
            "+91" + phone;


        confirmationResult =
            await signInWithPhoneNumber(
                auth,
                firebasePhone,
                recaptchaVerifier
            );


        // =================================================
        // SHOW OTP STEP
        // =================================================

        const phoneStep =
            document.getElementById(
                "phoneStep"
            );

        const otpStep =
            document.getElementById(
                "otpStep"
            );


        if (phoneStep) {

            phoneStep.classList.add(
                "hidden"
            );

        }


        if (otpStep) {

            otpStep.classList.remove(
                "hidden"
            );

        }


        // =================================================
        // OTP MESSAGE
        // =================================================

        const otpMessage =
            document.getElementById(
                "otpMessage"
            );


        if (otpMessage) {

            otpMessage.textContent =
                "Enter the verification code sent to +91 " +
                phone;

        }


        // =================================================
        // START TIMER
        // =================================================

        startResendTimer();


        // =================================================
        // FOCUS OTP
        // =================================================

        const otpInput =
            document.getElementById(
                "otp"
            );


        if (otpInput) {

            otpInput.focus();

        }


        await Swal.fire({

            icon:
                "success",

            title:
                "OTP Sent",

            text:
                "A verification code has been sent to your mobile number.",

            confirmButtonText:
                "Enter OTP",

            confirmButtonColor:
                "#6654e8"

        });


    } catch (error) {

        console.error(
            "SEND FIREBASE OTP ERROR:",
            error
        );


        handleFirebaseError(
            error
        );


        // =================================================
        // RESET RECAPTCHA
        // =================================================

        resetRecaptcha();


    } finally {

        button.disabled =
            false;

        button.innerHTML = `
            <i class="fa-solid fa-paper-plane"></i>
            <span>Send Verification Code</span>
        `;

    }

}


// =====================================================
// VERIFY REAL FIREBASE OTP
// =====================================================

async function verifyOTP() {

    const otpInput =
        document.getElementById(
            "otp"
        );

    const button =
        document.getElementById(
            "verifyOtpButton"
        );


    if (!confirmationResult) {

        showError(
            "Please request a verification code first."
        );

        return;

    }


    if (!otpInput) {

        showError(
            "OTP input field was not found."
        );

        return;

    }


    const otp =
        otpInput.value.trim();


    // =================================================
    // VALIDATE OTP
    // =================================================

    if (!/^\d{6}$/.test(otp)) {

        showWarning(
            "Please enter the 6-digit verification code."
        );

        otpInput.focus();

        return;

    }


    try {

        if (button) {

            button.disabled =
                true;

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Verifying...</span>
            `;

        }


        // =================================================
        // FIREBASE OTP VERIFICATION
        // =================================================

        const result =
            await confirmationResult.confirm(
                otp
            );


        // =================================================
        // FIREBASE USER
        // =================================================

        firebaseUser =
            result.user;


        // =================================================
        // VERIFY PHONE
        // =================================================

        const firebasePhone =
            firebaseUser.phoneNumber || "";


        const cleanFirebasePhone =
            firebasePhone
                .replace(/\D/g, "")
                .slice(-10);


        if (
            cleanFirebasePhone !==
            verifiedPhone
        ) {

            throw new Error(
                "Verified mobile number does not match the requested account."
            );

        }


        // =================================================
        // OTP VERIFIED
        // =================================================

        otpVerified =
            true;


        // =================================================
        // SWITCH STEPS
        // =================================================

        const otpStep =
            document.getElementById(
                "otpStep"
            );

        const passwordStep =
            document.getElementById(
                "passwordStep"
            );


        if (otpStep) {

            otpStep.classList.add(
                "hidden"
            );

        }


        if (passwordStep) {

            passwordStep.classList.remove(
                "hidden"
            );

        }


        clearInterval(
            resendTimer
        );


        // =================================================
        // SUCCESS
        // =================================================

        await showSuccess(
            "Mobile number verified successfully."
        );


        // =================================================
        // FOCUS PASSWORD
        // =================================================

        const passwordInput =
            document.getElementById(
                "newPassword"
            );


        if (passwordInput) {

            setTimeout(
                () => {

                    passwordInput.focus();

                },
                300
            );

        }


    } catch (error) {

        console.error(
            "VERIFY FIREBASE OTP ERROR:",
            error
        );


        handleFirebaseError(
            error
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerHTML = `
                <i class="fa-solid fa-shield-halved"></i>
                <span>Verify Code</span>
            `;

        }

    }

}


// =====================================================
// RESET PASSWORD
// FIREBASE ID TOKEN REQUIRED
// =====================================================

async function resetPassword() {

    const passwordElement =
        document.getElementById(
            "newPassword"
        );

    const confirmPasswordElement =
        document.getElementById(
            "confirmPassword"
        );

    const button =
        document.getElementById(
            "resetPasswordButton"
        );


    if (
        !passwordElement ||
        !confirmPasswordElement
    ) {

        showError(
            "Password fields were not found."
        );

        return;

    }


    const newPassword =
        passwordElement.value;

    const confirmPassword =
        confirmPasswordElement.value;


    // =================================================
    // CHECK FIREBASE VERIFICATION
    // =================================================

    if (
        !otpVerified ||
        !firebaseUser ||
        !verifiedPhone
    ) {

        showError(
            "Please verify your mobile number with OTP first."
        );

        return;

    }


    // =================================================
    // VALIDATE PASSWORD
    // =================================================

    if (!newPassword) {

        showWarning(
            "Please enter a new password."
        );

        return;

    }


    if (newPassword.length < 6) {

        showWarning(
            "Password must be at least 6 characters."
        );

        return;

    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showWarning(
            "Passwords do not match."
        );

        return;

    }


    try {

        if (button) {

            button.disabled =
                true;

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Resetting Password...</span>
            `;

        }


        // =================================================
        // GET FIREBASE ID TOKEN
        // =================================================

        const idToken =
            await firebaseUser.getIdToken(
                true
            );


        if (!idToken) {

            throw new Error(
                "Firebase verification token could not be created."
            );

        }


        // =================================================
        // RESET PASSWORD API
        // =================================================

        const response =
            await fetch(
                `${API_URL}/reset-password`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${idToken}`

                    },

                    body:
                        JSON.stringify({

                            phone:
                                verifiedPhone,

                            password:
                                newPassword

                        })

                }
            );


        // =================================================
        // SAFE JSON
        // =================================================

        let data = {};

        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.warn(
                "Could not parse reset response.",
                jsonError
            );

        }


        // =================================================
        // ROUTE NOT FOUND
        // =================================================

        if (response.status === 404) {

            throw new Error(
                "Password reset API route is not available on the server."
            );

        }


        // =================================================
        // UNAUTHORIZED
        // =================================================

        if (response.status === 401) {

            throw new Error(
                data.message ||
                "Firebase verification expired. Please request a new OTP."
            );

        }


        // =================================================
        // FORBIDDEN
        // =================================================

        if (response.status === 403) {

            throw new Error(
                data.message ||
                "This Firebase account does not match the mobile number."
            );

        }


        // =================================================
        // SERVER ERROR
        // =================================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to reset password."
            );

        }


        // =================================================
        // BACKEND SUCCESS CHECK
        // =================================================

        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to reset password."
            );

        }


        // =================================================
        // CLEAR RESET STATE
        // =================================================

        otpVerified =
            false;

        verifiedPhone =
            null;

        firebaseUser =
            null;

        confirmationResult =
            null;


        clearInterval(
            resendTimer
        );


        // =================================================
        // SIGN OUT FIREBASE SESSION
        // =================================================

        try {

            await auth.signOut();

        } catch (signOutError) {

            console.warn(
                "Firebase sign-out warning:",
                signOutError
            );

        }


        // =================================================
        // SUCCESS
        // =================================================

        await Swal.fire({

            icon:
                "success",

            title:
                "Password Reset Successful!",

            text:
                "Your password has been updated. You can now login with your new password.",

            confirmButtonText:
                "Go To Login",

            confirmButtonColor:
                "#6654e8",

            allowOutsideClick:
                false

        });


        // =================================================
        // GO LOGIN
        // =================================================

        window.location.href =
            "auth.html";


    } catch (error) {

        console.error(
            "RESET PASSWORD ERROR:",
            error
        );


        handleFirebaseError(
            error
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML = `
                <i class="fa-solid fa-shield-halved"></i>
                <span>Reset Password</span>
            `;

        }

    }

}


// =====================================================
// RESEND REAL FIREBASE OTP
// =====================================================

async function resendOTP() {

    if (resendSeconds > 0) {

        return;

    }


    if (!verifiedPhone) {

        showError(
            "Please enter your mobile number again."
        );

        return;

    }


    try {

        // =================================================
        // RESET OTP INPUT
        // =================================================

        const otpInput =
            document.getElementById(
                "otp"
            );


        if (otpInput) {

            otpInput.value =
                "";

        }


        // =================================================
        // RESET RECAPTCHA
        // =================================================

        resetRecaptcha();


        initializeRecaptcha();


        // =================================================
        // SEND NEW SMS
        // =================================================

        const firebasePhone =
            "+91" +
            verifiedPhone;


        confirmationResult =
            await signInWithPhoneNumber(
                auth,
                firebasePhone,
                recaptchaVerifier
            );


        // =================================================
        // RESTART TIMER
        // =================================================

        startResendTimer();


        // =================================================
        // SUCCESS
        // =================================================

        await Swal.fire({

            icon:
                "success",

            title:
                "New OTP Sent",

            text:
                "A new verification code has been sent to your mobile number.",

            confirmButtonText:
                "Enter OTP",

            confirmButtonColor:
                "#6654e8"

        });


        if (otpInput) {

            otpInput.focus();

        }


    } catch (error) {

        console.error(
            "RESEND OTP ERROR:",
            error
        );


        handleFirebaseError(
            error
        );


        resetRecaptcha();

    }

}


// =====================================================
// RESET RECAPTCHA
// =====================================================

function resetRecaptcha() {

    try {

        if (
            recaptchaVerifier
        ) {

            recaptchaVerifier.clear();

        }

    } catch (error) {

        console.warn(
            "RECAPTCHA CLEAR WARNING:",
            error
        );

    }

    recaptchaVerifier =
        null;

}


// =====================================================
// RESEND TIMER
// =====================================================

function startResendTimer() {

    const button =
        document.getElementById(
            "resendButton"
        );

    const text =
        document.getElementById(
            "resendText"
        );


    if (!button || !text) {

        return;

    }


    clearInterval(
        resendTimer
    );


    resendSeconds =
        30;


    button.disabled =
        true;


    text.textContent =
        `Send New Code (${resendSeconds}s)`;


    resendTimer =
        setInterval(
            () => {

                if (
                    resendSeconds <= 0
                ) {

                    clearInterval(
                        resendTimer
                    );


                    button.disabled =
                        false;


                    text.textContent =
                        "Send New Code";


                    return;

                }


                text.textContent =
                    `Send New Code (${resendSeconds}s)`;


                resendSeconds--;

            },
            1000
        );

}


// =====================================================
// TOGGLE PASSWORD
// =====================================================

function togglePassword(
    inputId,
    button
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {

        return;

    }


    const icon =
        button ?
        button.querySelector("i") :
        null;


    if (
        input.type ===
        "password"
    ) {

        input.type =
            "text";


        if (icon) {

            icon.className =
                "fa-solid fa-eye-slash";

        }

    } else {

        input.type =
            "password";


        if (icon) {

            icon.className =
                "fa-solid fa-eye";

        }

    }

}


// =====================================================
// FIREBASE ERROR HANDLER
// =====================================================

function handleFirebaseError(
    error
) {

    console.error(
        "FIREBASE ERROR:",
        error
    );


    const code =
        error?.code ||
        "";


    switch (code) {


        // =============================================
        // INVALID PHONE
        // =============================================

        case "auth/invalid-phone-number":

            showError(
                "The mobile number is invalid."
            );

            break;


        // =============================================
        // TOO MANY REQUESTS
        // =============================================

        case "auth/too-many-requests":

            showError(
                "Too many verification attempts. Please wait and try again later."
            );

            break;


        // =============================================
        // INVALID OTP
        // =============================================

        case "auth/invalid-verification-code":

            showError(
                "Incorrect verification code. Please check the SMS and try again."
            );

            break;


        // =============================================
        // EXPIRED OTP
        // =============================================

        case "auth/code-expired":

            showError(
                "This verification code has expired. Please request a new code."
            );

            break;


        // =============================================
        // CAPTCHA
        // =============================================

        case "auth/captcha-check-failed":

            showError(
                "Security verification failed. Please complete the reCAPTCHA and try again."
            );

            break;


        // =============================================
        // NETWORK
        // =============================================

        case "auth/network-request-failed":

            showError(
                "Network connection failed. Please check your internet connection and try again."
            );

            break;


        // =============================================
        // OPERATION NOT ALLOWED
        // =============================================

        case "auth/operation-not-allowed":

            showError(
                "Firebase Phone Authentication is not enabled for this project."
            );

            break;


        // =============================================
        // QUOTA
        // =============================================

        case "auth/quota-exceeded":

            showError(
                "Firebase SMS verification quota has been exceeded. Please try again later."
            );

            break;


        // =============================================
        // DEFAULT
        // =============================================

        default:

            showError(
                error?.message ||
                "Firebase verification failed. Please try again."
            );

            break;

    }

}


// =====================================================
// SWEETALERT SUCCESS
// =====================================================

function showSuccess(
    message
) {

    return Swal.fire({

        icon:
            "success",

        title:
            "Success",

        text:
            message,

        confirmButtonColor:
            "#6654e8",

        timer:
            2200,

        timerProgressBar:
            true

    });

}


// =====================================================
// WARNING
// =====================================================

function showWarning(
    message
) {

    return Swal.fire({

        icon:
            "warning",

        title:
            "Check Details",

        text:
            message,

        confirmButtonColor:
            "#6654e8"

    });

}


// =====================================================
// ERROR
// =====================================================

function showError(
    message
) {

    return Swal.fire({

        icon:
            "error",

        title:
            "Something went wrong",

        text:
            message,

        confirmButtonColor:
            "#6654e8"

    });

}


// =====================================================
// NAVIGATION
// =====================================================

function goBack() {

    if (
        window.history.length > 1
    ) {

        window.history.back();

    } else {

        window.location.href =
            "auth.html";

    }

}


function goToLogin() {

    window.location.href =
        "auth.html";

}


// =====================================================
// EXPOSE FUNCTIONS TO HTML
// =====================================================

window.sendOTP =
    sendOTP;

window.verifyOTP =
    verifyOTP;

window.resetPassword =
    resetPassword;

window.resendOTP =
    resendOTP;

window.togglePassword =
    togglePassword;

window.goBack =
    goBack;

window.goToLogin =
    goToLogin;