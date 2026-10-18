
// =========================================================
// CHANGE PASSWORD JS
// PREMIUM BITCOIN INVEST THEME
// =========================================================

// ---------------------------------------------------------
// API CONFIGURATION
// ---------------------------------------------------------

const API_URL = "https://tesla-wealth.onrender.com/api";


// ---------------------------------------------------------
// SWEETALERT TOAST
// ---------------------------------------------------------

const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: "#131b2e",
    color: "#ffffff"
});


// ---------------------------------------------------------
// SHOW NOTIFICATION
// ---------------------------------------------------------

function showNotification(message, isSuccess = true) {

    Toast.fire({
        icon: isSuccess ? "success" : "error",
        title: message,
        iconColor: isSuccess ? "#10b981" : "#ef4444"
    });

}


// ---------------------------------------------------------
// AUTH TOKEN
// ---------------------------------------------------------

function getToken() {

    return localStorage.getItem("ki_token");

}


// ---------------------------------------------------------
// AUTH HEADERS
// ---------------------------------------------------------

function getHeaders() {

    const token = getToken();

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

}


// ---------------------------------------------------------
// CHECK LOGIN
// ---------------------------------------------------------

function checkAuthentication() {

    const token = getToken();

    if (!token) {

        showNotification(
            "Please login to continue.",
            false
        );

        setTimeout(() => {
            window.location.href = "auth.html";
        }, 1000);

        return false;
    }

    return true;

}


// ---------------------------------------------------------
// PASSWORD VISIBILITY
// ---------------------------------------------------------

function togglePassword(fieldId, button) {

    const field = document.getElementById(fieldId);

    if (!field || !button) {
        return;
    }

    const icon = button.querySelector("i");

    if (field.type === "password") {

        field.type = "text";

        if (icon) {
            icon.className = "fa-solid fa-eye";
        }

    } else {

        field.type = "password";

        if (icon) {
            icon.className = "fa-solid fa-eye-slash";
        }

    }

}


// ---------------------------------------------------------
// PASSWORD VALIDATION
// ---------------------------------------------------------

function validatePassword(password) {

    const minLength = password.length >= 6;

    const hasLetter = /[A-Za-z]/.test(password);

    const hasNumber = /[0-9]/.test(password);

    return {
        minLength,
        hasLetter,
        hasNumber,
        valid: minLength && hasLetter && hasNumber
    };

}


// ---------------------------------------------------------
// UPDATE PASSWORD RULES UI
// ---------------------------------------------------------

function updatePasswordRules(password) {

    const result = validatePassword(password);

    const lengthRule = document.getElementById("ruleLength");
    const letterRule = document.getElementById("ruleLetter");
    const numberRule = document.getElementById("ruleNumber");

    updateRule(
        lengthRule,
        result.minLength
    );

    updateRule(
        letterRule,
        result.hasLetter
    );

    updateRule(
        numberRule,
        result.hasNumber
    );

}


// ---------------------------------------------------------
// UPDATE SINGLE RULE
// ---------------------------------------------------------

function updateRule(element, valid) {

    if (!element) {
        return;
    }

    const icon = element.querySelector("i");

    if (valid) {

        element.classList.add("valid");

        if (icon) {
            icon.className = "fa-solid fa-circle-check";
        }

    } else {

        element.classList.remove("valid");

        if (icon) {
            icon.className = "fa-regular fa-circle";
        }

    }

}


// ---------------------------------------------------------
// CHANGE PASSWORD
// ---------------------------------------------------------

async function changePassword(event) {

    if (event) {
        event.preventDefault();
    }

    const currentPassword =
        document.getElementById("currentPassword");

    const newPassword =
        document.getElementById("newPassword");

    const confirmPassword =
        document.getElementById("confirmPassword");

    const submitButton =
        document.getElementById("changePasswordBtn");


    if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
    ) {

        console.error(
            "Password form elements are missing."
        );

        showNotification(
            "Password form is not configured correctly.",
            false
        );

        return;
    }


    const currentValue =
        currentPassword.value.trim();

    const newValue =
        newPassword.value;

    const confirmValue =
        confirmPassword.value;


    // -----------------------------------------------------
    // CURRENT PASSWORD
    // -----------------------------------------------------

    if (!currentValue) {

        showNotification(
            "Enter your current password.",
            false
        );

        currentPassword.focus();

        return;
    }


    // -----------------------------------------------------
    // NEW PASSWORD
    // -----------------------------------------------------

    if (!newValue) {

        showNotification(
            "Enter your new password.",
            false
        );

        newPassword.focus();

        return;
    }


    // -----------------------------------------------------
    // PASSWORD RULES
    // -----------------------------------------------------

    const passwordCheck =
        validatePassword(newValue);


    if (!passwordCheck.valid) {

        showNotification(
            "New password must contain at least 6 characters, one letter and one number.",
            false
        );

        newPassword.focus();

        return;
    }


    // -----------------------------------------------------
    // CONFIRM PASSWORD
    // -----------------------------------------------------

    if (!confirmValue) {

        showNotification(
            "Confirm your new password.",
            false
        );

        confirmPassword.focus();

        return;
    }


    if (newValue !== confirmValue) {

        showNotification(
            "New passwords do not match.",
            false
        );

        confirmPassword.focus();

        return;
    }


    // -----------------------------------------------------
    // SAME PASSWORD CHECK
    // -----------------------------------------------------

    if (currentValue === newValue) {

        showNotification(
            "New password must be different from your current password.",
            false
        );

        newPassword.focus();

        return;
    }


    // -----------------------------------------------------
    // CHECK TOKEN
    // -----------------------------------------------------

    if (!checkAuthentication()) {
        return;
    }


    // -----------------------------------------------------
    // BUTTON LOADING
    // -----------------------------------------------------

    const originalButtonHTML =
        submitButton
            ? submitButton.innerHTML
            : "";


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Updating Password...
        `;

    }


    try {

        // -------------------------------------------------
        // BACKEND REQUEST
        // -------------------------------------------------

        const response = await fetch(
            `${API_URL}/auth/change-password`,
            {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({
                    currentPassword: currentValue,
                    newPassword: newValue
                })
            }
        );


        // -------------------------------------------------
        // READ RESPONSE
        // -------------------------------------------------

        let data = {};

        try {

            data = await response.json();

        } catch (jsonError) {

            console.error(
                "Invalid server response:",
                jsonError
            );

        }


        // -------------------------------------------------
        // SERVER ERROR
        // -------------------------------------------------

        if (!response.ok || !data.success) {

            showNotification(
                data.message ||
                "Unable to change password.",
                false
            );

            return;
        }


        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        showNotification(
            "Password changed successfully!",
            true
        );


        // Clear password fields

        currentPassword.value = "";

        newPassword.value = "";

        confirmPassword.value = "";


        // Reset rules

        updatePasswordRules("");


        // -------------------------------------------------
        // OPTIONAL LOGOUT
        // -------------------------------------------------
        // If your backend invalidates old tokens,
        // redirect the user to login.

        setTimeout(() => {

            localStorage.removeItem("ki_token");

            window.location.href = "auth.html";

        }, 1800);


    } catch (error) {

        console.error(
            "Change Password Error:",
            error
        );

        showNotification(
            "Unable to connect to the server. Please try again.",
            false
        );


    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.innerHTML =
                originalButtonHTML ||
                `
                    <i class="fa-solid fa-lock"></i>
                    Change Password
                `;

        }

    }

}


// ---------------------------------------------------------
// GO BACK
// ---------------------------------------------------------

function goBack() {

    if (window.history.length > 1) {

        window.history.back();

    } else {

        window.location.href = "profile.html";

    }

}


// ---------------------------------------------------------
// PAGE NAVIGATION
// ---------------------------------------------------------

function goTo(page) {

    if (!page) {
        return;
    }

    window.location.href = page;

}


// ---------------------------------------------------------
// PAGE INITIALIZATION
// ---------------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // Check authentication

        if (!checkAuthentication()) {
            return;
        }


        // -------------------------------------------------
        // PASSWORD INPUT
        // -------------------------------------------------

        const newPassword =
            document.getElementById("newPassword");


        if (newPassword) {

            newPassword.addEventListener(
                "input",
                () => {

                    updatePasswordRules(
                        newPassword.value
                    );

                }
            );

        }


        // -------------------------------------------------
        // FORM SUBMIT
        // -------------------------------------------------

        const form =
            document.getElementById(
                "changePasswordForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                changePassword
            );

        }


        // -------------------------------------------------
        // BUTTON FALLBACK
        // -------------------------------------------------

        const submitButton =
            document.getElementById(
                "changePasswordBtn"
            );


        if (
            submitButton &&
            !form
        ) {

            submitButton.addEventListener(
                "click",
                changePassword
            );

        }

    }
);

