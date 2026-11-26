"use strict";

/* =========================================================
   TESLA WEALTH — PROFILE PAGE
   Premium Emerald & Gold Edition
========================================================= */

(() => {

    // =====================================================
    // BACKEND API
    // =====================================================

    const API_URL =
        window.TESLA_API_BASE ||
        "https://tesla-wealth.onrender.com/api";

    const PROFILE_API =
        `${API_URL}/auth/profile`;


    // =====================================================
    // AUTHENTICATION
    // =====================================================

    function getToken() {

        return (
            localStorage.getItem("ki_token") ||
            localStorage.getItem("token")
        );

    }


    function clearSession() {

        [
            "ki_token",
            "token",
            "ki_user",
            "user"
        ].forEach(key => {

            localStorage.removeItem(key);

        });

    }


    function redirectToLogin() {

        clearSession();

        window.location.replace("auth.html");

    }


    // =====================================================
    // MONEY FORMAT
    // =====================================================
function formatMoney(amount) {
    return "$" +
        Number(amount || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}


    // =====================================================
    // SAFE HTML TEXT UPDATE
    // =====================================================

    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (!element) return;

        element.textContent = value ?? "";

    }


    // =====================================================
    // TOAST NOTIFICATION
    // =====================================================

    let toastTimer;

    function showToast(message, type = "success") {

        const toast =
            document.getElementById("toast");

        if (!toast) {

            console.log(message);

            return;

        }

        toast.textContent = message;

        toast.className = "toast";

        if (type === "error") {

            toast.classList.add("error");

        }

        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {

            toast.classList.remove("show");

        }, 3500);

    }


    // =====================================================
    // UPDATE PROFILE IMAGE
    // =====================================================

    function updateAvatar(user) {

        const avatar =
            document.getElementById("avatar");

        if (!avatar) return;

        const imageUrl =
            String(user.profileImage || "").trim();

        if (!imageUrl) {

            avatar.innerHTML =
                '<i class="fa-solid fa-user"></i>';

            return;

        }

        avatar.replaceChildren();

        const image =
            document.createElement("img");

        image.src = imageUrl;

        image.alt = "Profile photo";

        image.loading = "lazy";

        image.referrerPolicy = "no-referrer";

        image.onerror = () => {

            avatar.innerHTML =
                '<i class="fa-solid fa-user"></i>';

        };

        avatar.appendChild(image);

    }


    // =====================================================
    // UPDATE ADMIN ACCESS
    // =====================================================

    function updateAdminArea(user) {

        const adminArea =
            document.getElementById("adminArea");

        if (!adminArea) return;

        adminArea.style.display =
            user.isAdmin === true ? "block" : "none";

    }


    // =====================================================
    // UPDATE PROFILE INFORMATION
    // =====================================================

    function updateProfileUI(user) {

        // -----------------------------------------------
        // PERSONAL INFORMATION
        // -----------------------------------------------

        setText(
            "userName",
            user.name || "New User"
        );

        setText(
            "phone",
            user.phone || "Phone not available"
        );

        setText(
            "uid",
            user.inviteCode || "------"
        );


        // -----------------------------------------------
        // WALLET INFORMATION
        // -----------------------------------------------

        setText(
            "walletBalance",
            formatMoney(user.balance)
        );

        setText(
            "depositBalance",
            formatMoney(user.totalDeposit)
        );

        setText(
            "withdrawBalance",
            formatMoney(user.totalWithdraw)
        );


        // -----------------------------------------------
        // FINANCIAL STATISTICS
        // -----------------------------------------------

        setText(
            "totalDeposit",
            formatMoney(user.totalDeposit)
        );

        setText(
            "totalWithdraw",
            formatMoney(user.totalWithdraw)
        );


        // -----------------------------------------------
        // PROFILE IMAGE
        // -----------------------------------------------

        updateAvatar(user);


        // -----------------------------------------------
        // ADMIN AREA
        // -----------------------------------------------

        updateAdminArea(user);


        // -----------------------------------------------
        // SAVE USER CACHE
        // -----------------------------------------------

        try {

            const userJSON =
                JSON.stringify(user);

            localStorage.setItem(
                "ki_user",
                userJSON
            );

            localStorage.setItem(
                "user",
                userJSON
            );

        } catch (error) {

            console.warn(
                "Unable to save user cache:",
                error
            );

        }

    }


    // =====================================================
    // LOAD PROFILE FROM BACKEND
    // =====================================================

    async function loadProfile() {

        console.log(
            "================================"
        );

        console.log(
            "TESLA WEALTH PROFILE LOADING"
        );

        console.log(
            "================================"
        );


        const token = getToken();

        if (!token) {

            redirectToLogin();

            return;

        }


        try {

            // -------------------------------------------
            // API REQUEST
            // -------------------------------------------

            const response = await fetch(
                PROFILE_API,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                        "Accept":
                            "application/json"

                    }

                }
            );


            // -------------------------------------------
            // RESPONSE
            // -------------------------------------------

            const rawResponse =
                await response.text();

            console.log(
                "PROFILE STATUS:",
                response.status
            );


            // -------------------------------------------
            // AUTHENTICATION ERROR
            // -------------------------------------------

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                console.warn(
                    "Session expired."
                );

                redirectToLogin();

                return;

            }


            // -------------------------------------------
            // EMPTY RESPONSE
            // -------------------------------------------

            if (!rawResponse) {

                throw new Error(
                    "Server returned an empty response."
                );

            }


            // -------------------------------------------
            // PARSE JSON
            // -------------------------------------------

            let data;

            try {

                data = JSON.parse(rawResponse);

            } catch (error) {

                console.error(
                    "Invalid API response:",
                    rawResponse
                );

                throw new Error(
                    "Invalid server response. Please try again."
                );

            }


            // -------------------------------------------
            // API ERROR
            // -------------------------------------------

            if (!response.ok || data.success !== true) {

                throw new Error(
                    data.message ||
                    "Unable to load your profile."
                );

            }


            // -------------------------------------------
            // USER INFORMATION
            // -------------------------------------------

            const user =
                data.user || {};

            console.log(
                "PROFILE USER:",
                user
            );


            // -------------------------------------------
            // UPDATE FRONTEND
            // -------------------------------------------

            updateProfileUI(user);


            // -------------------------------------------
            // SUCCESS
            // -------------------------------------------

            console.log(
                "PROFILE LOADED SUCCESSFULLY"
            );

            showToast(
                "Profile loaded successfully."
            );

        } catch (error) {

            console.error(
                "PROFILE ERROR:",
                error
            );

            showToast(
                error.message ||
                "Unable to connect to the server.",
                "error"
            );

        }

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    function setupLogout() {

        const logoutBtn =
            document.getElementById("logoutBtn");

        if (!logoutBtn) return;

        logoutBtn.addEventListener("click", () => {

            const confirmed = window.confirm(
                "Are you sure you want to logout from Tesla Wealth?"
            );

            if (!confirmed) return;

            clearSession();

            window.location.replace("auth.html");

        });

    }


    // =====================================================
    // BOTTOM NAVIGATION
    // =====================================================

    function setupBottomNavigation() {

        const navItems =
            document.querySelectorAll(".bottom-nav a");

        if (!navItems.length) return;

        const currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        navItems.forEach(item => {

            const href =
                (item.getAttribute("href") || "")
                    .toLowerCase();

            item.classList.toggle(
                "active",
                href === currentPage
            );

        });

    }


    // =====================================================
    // DOWNLOAD BUTTON
    // =====================================================

    function setupDownloadButton() {

        const button =
            document.getElementById("downloadAppBtn");

        if (!button) return;

        button.addEventListener("click", event => {

            const href =
                button.getAttribute("href");

            if (!href || href === "#") {

                event.preventDefault();

                showToast(
                    "App download is currently unavailable.",
                    "error"
                );

            }

        });

    }


    // =====================================================
    // PAGE ANIMATION
    // =====================================================

    function startPageAnimation() {

        document.body.classList.add(
            "page-loaded"
        );

    }


    // =====================================================
    // INITIALIZE PROFILE PAGE
    // =====================================================

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            console.log(
                "TESLA WEALTH PROFILE INITIALIZING"
            );

            startPageAnimation();

            setupLogout();

            setupBottomNavigation();

            setupDownloadButton();

            loadProfile();

        }
    );

})();