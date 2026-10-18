
// =====================================================
// BITCOIN INVEST
// AUTH APPLICATION JAVASCRIPT
// Firebase Phone OTP + Backend Authentication
// =====================================================


// =====================================================
// API CONFIGURATION
// =====================================================

const API_URL =
    "http://localhost:5000/api";


// =====================================================
// FIREBASE CONFIGURATION
// IMPORTANT:
// Replace these values with your Firebase Web App config.
// Firebase Console:
// Project settings → Your apps → Web app
// =====================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

let firebaseReady = false;

try {

    if (!firebase.apps.length) {

        firebase.initializeApp(
            firebaseConfig
        );

    }

    firebaseReady = true;

    console.log(
        "✅ Firebase initialized"
    );

} catch (error) {

    console.error(
        "❌ Firebase initialization error:",
        error
    );

}


// =====================================================
// FIREBASE OTP STATE
// =====================================================

let confirmationResult = null;

let firebaseVerifiedUser = null;

let otpPhone = "";

let otpPurpose = "register";

let recaptchaVerifier = null;


// =====================================================
// SWEETALERT TOAST
// =====================================================

const Toast = Swal.mixin({

    toast: true,

    position: "top-end",

    showConfirmButton: false,

    timer: 3500,

    timerProgressBar: true,

    background: "#131b2e",

    color: "#ffffff"

});


// =====================================================
// NOTIFICATION
// =====================================================

function showNotification(
    message,
    isSuccess = true
) {

    Toast.fire({

        icon:
            isSuccess
                ? "success"
                : "error",

        title: message,

        iconColor:
            isSuccess
                ? "#10b981"
                : "#ef4444"

    });

}


// =====================================================
// CAPTURE REFERRAL CODE
// =====================================================

(function captureReferralCode() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const ref =
        params.get("ref") ||
        params.get("id");


    if (ref) {

        const cleanRef =
            ref
                .trim()
                .toUpperCase();


        if (cleanRef) {

            localStorage.setItem(
                "referralCode",
                cleanRef
            );

        }

    }

})();


// =====================================================
// GET REFERRAL CODE
// =====================================================

function getReferralCode() {

    return (
        localStorage.getItem(
            "referralCode"
        ) || ""
    )
        .trim()
        .toUpperCase();

}


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupPhoneInputs();

        setupReferralCode();

        setupFirebaseRecaptcha();

        checkExistingSession();

    }
);


// =====================================================
// PHONE INPUT VALIDATION
// =====================================================

function setupPhoneInputs() {

    const phoneInputs = [

        document.getElementById(
            "login_phone"
        ),

        document.getElementById(
            "f_phone"
        )

    ];


    phoneInputs.forEach(
        input => {

            if (!input) {
                return;
            }


            input.addEventListener(
                "input",
                () => {

                    input.value =
                        input.value
                            .replace(/\D/g, "")
                            .slice(0, 10);

                }
            );

        }
    );

}


// =====================================================
// SET REFERRAL CODE
// =====================================================

function setupReferralCode() {

    const referralInput =
        document.getElementById(
            "f_ref"
        );


    if (!referralInput) {
        return;
    }


    referralInput.value =
        getReferralCode();

}


// =====================================================
// FIREBASE RECAPTCHA
// =====================================================

function setupFirebaseRecaptcha() {

    if (!firebaseReady) {

        console.error(
            "Firebase is not ready."
        );

        return;

    }


    const container =
        document.getElementById(
            "recaptcha-container"
        );


    if (!container) {

        console.error(
            "reCAPTCHA container not found."
        );

        return;

    }


    try {

        recaptchaVerifier =
            new firebase.auth.RecaptchaVerifier(
                "recaptcha-container",
                {

                    size: "invisible",

                    callback: function () {

                        console.log(
                            "✅ reCAPTCHA verified"
                        );

                    },

                    "expired-callback":
                        function () {

                            console.log(
                                "reCAPTCHA expired."
                            );

                        }

                }
            );


        recaptchaVerifier.render()
            .then(
                function (widgetId) {

                    window.recaptchaWidgetId =
                        widgetId;

                    console.log(
                        "✅ Firebase reCAPTCHA ready"
                    );

                }
            );

    } catch (error) {

        console.error(
            "RECAPTCHA ERROR:",
            error
        );

    }

}


// =====================================================
// CHECK LOGIN SESSION
// =====================================================

function checkExistingSession() {

    const token =
        localStorage.getItem(
            "ki_token"
        );


    if (!token) {
        return;
    }

    // Optional automatic redirect.
    // Uncomment if required:
    //
    // window.location.href = "home.html";

}


// =====================================================
// PASSWORD VISIBILITY
// =====================================================

function togglePasswordVisibility(
    fieldId,
    iconId
) {

    const field =
        document.getElementById(
            fieldId
        );

    const icon =
        document.getElementById(
            iconId
        );


    if (!field || !icon) {
        return;
    }


    if (field.type === "password") {

        field.type = "text";

        icon.className =
            "fa-regular fa-eye";

    } else {

        field.type = "password";

        icon.className =
            "fa-regular fa-eye-slash";

    }

}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );

    const registerForm =
        document.getElementById(
            "registerForm"
        );

    const loginTab =
        document.getElementById(
            "loginTab"
        );

    const registerTab =
        document.getElementById(
            "registerTab"
        );

    const authTitle =
        document.getElementById(
            "authTitle"
        );

    const authSubtitle =
        document.getElementById(
            "authSubtitle"
        );


    loginForm.classList.add(
        "active-form"
    );

    registerForm.classList.remove(
        "active-form"
    );


    loginTab.classList.add(
        "active"
    );

    registerTab.classList.remove(
        "active"
    );


    authTitle.textContent =
        "Welcome Back";

    authSubtitle.textContent =
        "Login to securely access your account.";

}


// =====================================================
// SHOW REGISTER
// =====================================================

function showRegister() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );

    const registerForm =
        document.getElementById(
            "registerForm"
        );

    const loginTab =
        document.getElementById(
            "loginTab"
        );

    const registerTab =
        document.getElementById(
            "registerTab"
        );

    const authTitle =
        document.getElementById(
            "authTitle"
        );

    const authSubtitle =
        document.getElementById(
            "authSubtitle"
        );


    loginForm.classList.remove(
        "active-form"
    );

    registerForm.classList.add(
        "active-form"
    );


    loginTab.classList.remove(
        "active"
    );

    registerTab.classList.add(
        "active"
    );


    authTitle.textContent =
        "Create Your Account";

    authSubtitle.textContent =
        "Verify your mobile number with SMS OTP.";

}


// =====================================================
// VALIDATE REGISTER DATA
// =====================================================

function getRegisterData() {

    const name =
        document
            .getElementById("f_name")
            .value
            .trim();


    const phone =
        document
            .getElementById("f_phone")
            .value
            .trim();


    const password =
        document
            .getElementById("f_pass")
            .value;


    const confirmPassword =
        document
            .getElementById("f_pass2")
            .value;


    const referralInput =
        document.getElementById(
            "f_ref"
        );


    const referralCode =
        referralInput
            ? referralInput.value
                .trim()
                .toUpperCase()
            : getReferralCode();


    const terms =
        document.getElementById(
            "registerTerms"
        );


    if (!name) {

        throw new Error(
            "Please enter your full name."
        );

    }


    if (name.length < 2) {

        throw new Error(
            "Name must contain at least 2 characters."
        );

    }


    if (name.length > 50) {

        throw new Error(
            "Name cannot exceed 50 characters."
        );

    }


    if (
        !/^[6-9]\d{9}$/.test(phone)
    ) {

        throw new Error(
            "Enter a valid 10-digit Indian mobile number."
        );

    }


    if (
        !password ||
        password.length < 6
    ) {

        throw new Error(
            "Password must contain at least 6 characters."
        );

    }


    if (
        password !== confirmPassword
    ) {

        throw new Error(
            "Passwords do not match."
        );

    }


    if (
        !terms ||
        !terms.checked
    ) {

        throw new Error(
            "Please accept the Terms & Conditions."
        );

    }


    return {

        name,

        phone,

        password,

        referralCode

    };

}


// =====================================================
// SEND FIREBASE SMS OTP
// =====================================================

async function sendRegisterOTP() {

    if (!firebaseReady) {

        showNotification(
            "Firebase authentication is not configured.",
            false
        );

        return;

    }


    const button =
        document.getElementById(
            "regBtn"
        );


    try {

        const registerData =
            getRegisterData();


        const phone =
            registerData.phone;


        // =============================================
        // CHECK RECAPTCHA
        // =============================================

        if (!recaptchaVerifier) {

            setupFirebaseRecaptcha();

        }


        if (!recaptchaVerifier) {

            throw new Error(
                "Security verification is not ready. Please refresh the page."
            );

        }


        // =============================================
        // DISABLE BUTTON
        // =============================================

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Sending OTP...</span>
        `;


        // =============================================
        // INDIA COUNTRY CODE
        // =============================================

        const fullPhone =
            "+91" + phone;


        otpPhone =
            phone;

        otpPurpose =
            "register";


        // =============================================
        // SEND SMS
        // =============================================

        confirmationResult =
            await firebase.auth()
                .signInWithPhoneNumber(
                    fullPhone,
                    recaptchaVerifier
                );


        console.log(
            "✅ Firebase OTP sent"
        );


        showNotification(
            "OTP sent successfully to your mobile.",
            true
        );


        // =============================================
        // OPEN OTP DIALOG
        // =============================================

        await showOTPDialog();


    } catch (error) {

        console.error(
            "SEND OTP ERROR:",
            error
        );


        let message =
            "Unable to send OTP.";


        if (
            error &&
            error.code
        ) {

            switch (error.code) {

                case
                    "auth/invalid-phone-number":

                    message =
                        "Invalid mobile number.";

                    break;


                case
                    "auth/too-many-requests":

                    message =
                        "Too many OTP requests. Please try again later.";

                    break;


                case
                    "auth/quota-exceeded":

                    message =
                        "SMS quota exceeded. Please try again later.";

                    break;


                case
                    "auth/captcha-check-failed":

                    message =
                        "Security verification failed. Please refresh and try again.";

                    break;


                default:

                    message =
                        error.message ||
                        message;

            }

        } else if (error?.message) {

            message =
                error.message;

        }


        showNotification(
            message,
            false
        );


        // Re-create reCAPTCHA
        resetRecaptcha();


    } finally {

        button.disabled = false;

        button.innerHTML = `
            <span>Verify Mobile & Create Account</span>
            <i class="fa-solid fa-mobile-screen-button"></i>
        `;

    }

}


// =====================================================
// SHOW OTP DIALOG
// =====================================================

async function showOTPDialog() {

    if (!confirmationResult) {

        showNotification(
            "OTP session not found. Please request OTP again.",
            false
        );

        return;

    }


    const result =
        await Swal.fire({

            title:
                "Verify Mobile Number",

            html: `

                <div style="
                    text-align:center;
                    line-height:1.6;
                ">

                    <div style="
                        width:58px;
                        height:58px;
                        margin:0 auto 15px;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:rgba(247,147,26,.12);
                        color:#f7931a;
                        font-size:24px;
                    ">

                        <i class="fa-solid fa-message"></i>

                    </div>

                    <p style="
                        margin:0;
                        font-size:14px;
                        opacity:.8;
                    ">

                        Enter the 6-digit OTP sent to

                    </p>

                    <strong
                        style="
                            display:block;
                            margin-top:4px;
                        "
                    >
                        +91 ${otpPhone}
                    </strong>

                </div>

            `,

            input:
                "text",

            inputPlaceholder:
                "Enter 6-digit OTP",

            inputAttributes: {

                maxlength: 6,

                inputmode:
                    "numeric",

                autocomplete:
                    "one-time-code",

                autocapitalize:
                    "off"

            },

            showCancelButton:
                true,

            confirmButtonText:
                "Verify OTP",

            cancelButtonText:
                "Cancel",

            confirmButtonColor:
                "#f7931a",

            allowOutsideClick:
                false,

            allowEscapeKey:
                false,

            preConfirm:
                async (otp) => {

                    const cleanOTP =
                        String(
                            otp || ""
                        )
                            .replace(
                                /\D/g,
                                ""
                            )
                            .trim();


                    if (
                        !/^\d{6}$/.test(
                            cleanOTP
                        )
                    ) {

                        Swal.showValidationMessage(
                            "Please enter the 6-digit OTP."
                        );

                        return false;

                    }


                    try {

                        Swal.showLoading();


                        // =====================================
                        // FIREBASE OTP VERIFICATION
                        // =====================================

                        const result =
                            await confirmationResult
                                .confirm(
                                    cleanOTP
                                );


                        firebaseVerifiedUser =
                            result.user;


                        console.log(
                            "✅ Firebase phone verified:",
                            result.user.phoneNumber
                        );


                        return true;


                    } catch (error) {

                        console.error(
                            "OTP VERIFY ERROR:",
                            error
                        );


                        Swal.showValidationMessage(
                            getFirebaseOTPError(
                                error
                            )
                        );


                        return false;

                    }

                }

        });


    if (
        result.isConfirmed &&
        firebaseVerifiedUser
    ) {

        await completeBackendRegistration();

    } else if (
        result.dismiss ===
        Swal.DismissReason.cancel
    ) {

        resetFirebaseOTPState();

    }

}


// =====================================================
// FIREBASE OTP ERROR
// =====================================================

function getFirebaseOTPError(
    error
) {

    if (!error) {

        return "Invalid OTP.";

    }


    switch (error.code) {

        case
            "auth/invalid-verification-code":

            return "Incorrect OTP. Please check the code and try again.";


        case
            "auth/code-expired":

            return "This OTP has expired. Please request a new OTP.";


        case
            "auth/session-expired":

            return "OTP session expired. Please request a new OTP.";


        case
            "auth/too-many-requests":

            return "Too many attempts. Please try again later.";


        default:

            return (
                error.message ||
                "OTP verification failed."
            );

    }

}


// =====================================================
// COMPLETE BACKEND REGISTRATION
// =====================================================

async function completeBackendRegistration() {

    const button =
        document.getElementById(
            "regBtn"
        );


    try {

        if (!firebaseVerifiedUser) {

            throw new Error(
                "Mobile verification was not completed."
            );

        }


        const registerData =
            getRegisterData();


        // =============================================
        // GET FIREBASE ID TOKEN
        // =============================================

        const firebaseIdToken =
            await firebaseVerifiedUser
                .getIdToken(
                    true
                );


        if (!firebaseIdToken) {

            throw new Error(
                "Firebase authentication token was not received."
            );

        }


        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Creating Account...</span>
        `;


        // =============================================
        // SEND VERIFIED TOKEN TO BACKEND
        // =============================================

        const response =
            await fetch(
                `${API_URL}/auth/register`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${firebaseIdToken}`

                    },

                    body:
                        JSON.stringify({

                            name:
                                registerData.name,

                            phone:
                                registerData.phone,

                            password:
                                registerData.password,

                            referralCode:
                                registerData.referralCode

                        })

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Registration failed."

            );

        }


        // =============================================
        // SAVE JWT
        // =============================================

        if (data.token) {

            localStorage.setItem(
                "ki_token",
                data.token
            );

        }


        // =============================================
        // SAVE USER
        // =============================================

        if (data.user) {

            localStorage.setItem(
                "ki_user",
                JSON.stringify(
                    data.user
                )
            );

        }


        // =============================================
        // REFERRAL
        // =============================================

        const referralApplied =
            data.referral?.applied === true;


        const welcomeBonus =
            Number(
                data.referral?.welcomeBonus ??
                12
            );


        const appliedReferralCode =
            data.referral?.referralCode ||
            registerData.referralCode;


        // =============================================
        // SUCCESS
        // =============================================

        await Swal.fire({

            icon:
                "success",

            title:
                "Account Created!",

            html:
                referralApplied

                    ? `
                        <div style="
                            line-height:1.7;
                            font-size:14px;
                        ">

                            <div>
                                Your mobile number has
                                been verified successfully.
                            </div>

                            <div style="
                                margin-top:10px;
                                font-weight:700;
                            ">
                                Welcome Bonus:
                                ₹${welcomeBonus.toFixed(2)}
                            </div>

                            <div style="
                                margin-top:5px;
                                opacity:.8;
                            ">
                                Referral code applied:
                                ${appliedReferralCode}
                            </div>

                        </div>
                    `

                    : `
                        <div style="
                            line-height:1.7;
                            font-size:14px;
                        ">

                            <div>
                                Your mobile number has
                                been verified successfully.
                            </div>

                            <div style="
                                margin-top:10px;
                                font-weight:700;
                            ">
                                Welcome Bonus:
                                ₹${welcomeBonus.toFixed(2)}
                            </div>

                        </div>
                    `,

            confirmButtonColor:
                "#f7931a"

        });


        // =============================================
        // CLEAR REFERRAL
        // =============================================

        localStorage.removeItem(
            "referralCode"
        );


        // =============================================
        // RESET FIREBASE STATE
        // =============================================

        resetFirebaseOTPState();


        // =============================================
        // REDIRECT
        // =============================================

       // ==========================================
// SAVE REGISTERED PHONE FOR M-PIN LOGIN
// ==========================================

localStorage.setItem("registered_phone", registerData.phone);
localStorage.setItem("mpin_set", "false");

// Save user returned by backend
if (data.user) {
    localStorage.setItem("ki_user", JSON.stringify(data.user));
}

// Save JWT
if (data.token) {
    localStorage.setItem("ki_token", data.token);
    localStorage.setItem("token", data.token);
}

// ==========================================
// NEW USER → M-PIN SETUP
// ==========================================

Swal.fire({
    icon: "success",
    title: "Registration Successful",
    text: "Now create your 4-digit M-PIN.",
    confirmButtonText: "Continue",
    allowOutsideClick: false
}).then(() => {
    window.location.replace("mpin-setup.html");
});


    } catch (error) {

        console.error(
            "BACKEND REGISTRATION ERROR:",
            error
        );


        showNotification(

            error.message ||
            "Unable to create account.",

            false

        );


        button.disabled = false;

        button.innerHTML = `
            <span>Verify Mobile & Create Account</span>
            <i class="fa-solid fa-mobile-screen-button"></i>
        `;

    }

}


// =====================================================
// LOGIN USER
// =====================================================

async function handleLogin() {

    const phone =
        document
            .getElementById("login_phone")
            .value
            .trim();


    const password =
        document
            .getElementById("login_pass")
            .value;


    const button =
        document.getElementById(
            "loginBtn"
        );


    if (
        !/^[6-9]\d{9}$/.test(phone)
    ) {

        showNotification(
            "Enter a valid 10-digit Indian mobile number.",
            false
        );

        return;

    }


    if (!password) {

        showNotification(
            "Please enter your password.",
            false
        );

        return;

    }


    button.disabled = true;

    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Logging In...</span>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/auth/login`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            phone,

                            password

                        })

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Invalid credentials."

            );

        }


        if (data.token) {

            localStorage.setItem(
                "ki_token",
                data.token
            );

        }


        if (data.user) {

            localStorage.setItem(
                "ki_user",
                JSON.stringify(
                    data.user
                )
            );

        }


        await Swal.fire({

            icon:
                "success",

            title:
                "Login Successful",

            text:
                "Welcome back!",

            timer:
                1500,

            showConfirmButton:
                false,

            timerProgressBar:
                true

        });


        window.location.href =
            "home.html";


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        showNotification(

            error.message ||
            "Login failed.",

            false

        );


        button.disabled = false;

        button.innerHTML = `
            <span>Login Securely</span>
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
        `;

    }

}


// =====================================================
// RESET RECAPTCHA
// =====================================================

function resetRecaptcha() {

    try {

        if (
            typeof grecaptcha !==
            "undefined" &&
            window.recaptchaWidgetId !==
            undefined
        ) {

            grecaptcha.reset(
                window.recaptchaWidgetId
            );

        }

    } catch (error) {

        console.warn(
            "reCAPTCHA reset warning:",
            error
        );

    }

}


// =====================================================
// RESET FIREBASE OTP STATE
// =====================================================

function resetFirebaseOTPState() {

    confirmationResult =
        null;

    firebaseVerifiedUser =
        null;

    otpPhone =
        "";

    otpPurpose =
        "register";

}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    localStorage.removeItem(
        "ki_token"
    );

    localStorage.removeItem(
        "ki_user"
    );


    // Firebase sign-out as well.

    if (
        firebaseReady
    ) {

        firebase.auth()
            .signOut()
            .catch(
                error => {

                    console.warn(
                        "Firebase logout warning:",
                        error
                    );

                }
            );

    }


    window.location.href =
        "auth.html";

}


// =====================================================
// MAKE FUNCTIONS GLOBAL
// =====================================================

window.showLogin =
    showLogin;

window.showRegister =
    showRegister;

window.handleLogin =
    handleLogin;

window.handleRegister =
    sendRegisterOTP;

window.sendRegisterOTP =
    sendRegisterOTP;

window.togglePasswordVisibility =
    togglePasswordVisibility;

window.logout =
    logout;

