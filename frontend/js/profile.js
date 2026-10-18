// ======================================================
// PROFILE PAGE
// ======================================================


// ======================================================
// BACKEND API
// ======================================================

const API_URL =
    "https://tesla-wealth.onrender.com/api";


// ======================================================
// GET JWT TOKEN
// ======================================================

const token =
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// ======================================================
// CHECK LOGIN
// ======================================================

if (!token) {

    window.location.href =
        "auth.html";

}


// ======================================================
// MONEY FORMAT
// ======================================================

function formatMoney(amount) {

    const number =
        Number(amount || 0);

    return (
        "₹" +
        number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );

}


// ======================================================
// SAFE TEXT UPDATE
// ======================================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            `Element #${id} not found.`
        );

        return;

    }

    element.textContent =
        value;

}


// ======================================================
// LOAD PROFILE
// ======================================================

async function loadProfile() {

    console.log(
        "================================"
    );

    console.log(
        "LOADING PROFILE"
    );

    console.log(
        "================================"
    );


    try {


        // ==================================================
        // TOKEN CHECK
        // ==================================================

        if (!token) {

            window.location.href =
                "auth.html";

            return;

        }


        // ==================================================
        // API REQUEST
        // ==================================================

        const response =
            await fetch(
                `${API_URL}/auth/profile`,
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


        // ==================================================
        // READ RESPONSE
        // ==================================================

        const rawResponse =
            await response.text();


        console.log(
            "PROFILE STATUS:",
            response.status
        );


        console.log(
            "PROFILE RESPONSE:",
            rawResponse
        );


        // ==================================================
        // EMPTY RESPONSE
        // ==================================================

        if (!rawResponse) {

            throw new Error(
                "Server returned an empty response."
            );

        }


        // ==================================================
        // PARSE JSON
        // ==================================================

        let data;

        try {

            data =
                JSON.parse(
                    rawResponse
                );

        } catch (jsonError) {

            console.error(
                "PROFILE API DID NOT RETURN JSON:",
                rawResponse
            );

            throw new Error(
                `Server returned ${response.status} instead of JSON.`
            );

        }


        // ==================================================
        // AUTH ERROR
        // ==================================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            console.warn(
                "PROFILE SESSION EXPIRED."
            );


            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "ki_user"
            );

            localStorage.removeItem(
                "user"
            );


            window.location.href =
                "auth.html";

            return;

        }


        // ==================================================
        // API ERROR
        // ==================================================

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load profile."
            );

        }


        // ==================================================
        // USER DATA
        // ==================================================

        const user =
            data.user || {};


        console.log(
            "PROFILE USER:",
            user
        );


        // ==================================================
        // USER NAME
        // ==================================================
        //
        // IMPORTANT:
        // HTML uses id="userName"
        //
        // Backend returns:
        // user.name
        //
        // ==================================================

        setText(
            "userName",
            user.name || "New User"
        );


        // ==================================================
        // PHONE
        // ==================================================

        setText(
            "phone",
            user.phone || "No Phone"
        );


        // ==================================================
        // INVITE CODE / UID
        // ==================================================

        setText(
            "uid",
            user.inviteCode || "------"
        );


        // ==================================================
        // WALLET BALANCE
        // ==================================================

        setText(
            "walletBalance",
            formatMoney(
                user.balance
            )
        );


        // ==================================================
        // DEPOSIT BALANCE
        // ==================================================

        setText(
            "depositBalance",
            formatMoney(
                user.totalDeposit
            )
        );


        // ==================================================
        // WITHDRAW BALANCE
        // ==================================================

        setText(
            "withdrawBalance",
            formatMoney(
                user.totalWithdraw
            )
        );


        // ==================================================
        // TOTAL DEPOSIT
        // ==================================================

        setText(
            "totalDeposit",
            formatMoney(
                user.totalDeposit
            )
        );


        // ==================================================
        // TOTAL WITHDRAW
        // ==================================================

        setText(
            "totalWithdraw",
            formatMoney(
                user.totalWithdraw
            )
        );


        // ==================================================
        // AVATAR
        // ==================================================

        const avatar =
            document.getElementById(
                "avatar"
            );


        if (avatar) {


            // ----------------------------------------------
            // PROFILE IMAGE EXISTS
            // ----------------------------------------------

            if (
                user.profileImage &&
                String(
                    user.profileImage
                ).trim() !== ""
            ) {

                const imageUrl =
                    String(
                        user.profileImage
                    ).trim();


                avatar.innerHTML = "";


                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    imageUrl;


                image.alt =
                    "Profile";


                image.loading =
                    "lazy";


                image.onerror =
                    () => {

                        console.warn(
                            "Profile image failed:",
                            imageUrl
                        );


                        avatar.innerHTML =
                            '<i class="fa-solid fa-user"></i>';

                    };


                avatar.appendChild(
                    image
                );

            }


            // ----------------------------------------------
            // NO PROFILE IMAGE
            // ----------------------------------------------

            else {

                avatar.innerHTML =
                    '<i class="fa-solid fa-user"></i>';

            }

        }


        // ==================================================
        // ADMIN AREA
        // ==================================================

        const adminArea =
            document.getElementById(
                "adminArea"
            );


        if (adminArea) {


            if (
                user.isAdmin === true
            ) {

                adminArea.style.display =
                    "block";

            } else {

                adminArea.style.display =
                    "none";

            }

        }


        // ==================================================
        // SAVE USER TO LOCAL STORAGE
        // ==================================================
        //
        // Keep both names for compatibility
        // with older pages.
        //
        // ==================================================

        const userJSON =
            JSON.stringify(
                user
            );


        localStorage.setItem(
            "ki_user",
            userJSON
        );


        localStorage.setItem(
            "user",
            userJSON
        );


        // ==================================================
        // SUCCESS
        // ==================================================

        console.log(
            "PROFILE NAME:",
            user.name
        );


        console.log(
            "PROFILE PHONE:",
            user.phone
        );


        console.log(
            "PROFILE BALANCE:",
            user.balance
        );


        console.log(
            "PROFILE LOADED SUCCESSFULLY"
        );


    } catch (error) {


        // ==================================================
        // ERROR
        // ==================================================

        console.error(
            "PROFILE ERROR:",
            error
        );


        // ==================================================
        // SESSION ERROR
        // ==================================================

        const errorMessage =
            String(
                error.message || ""
            );


        if (
            errorMessage.includes("401") ||
            errorMessage.includes("403") ||
            errorMessage.includes("Unauthorized")
        ) {


            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "ki_user"
            );

            localStorage.removeItem(
                "user"
            );


            window.location.href =
                "auth.html";

            return;

        }


        // ==================================================
        // SHOW ERROR
        // ==================================================

        alert(
            error.message ||
            "Unable to load profile."
        );

    }

}


// ======================================================
// LOGOUT
// ======================================================

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutBtn) {

        return;

    }


    logoutBtn.addEventListener(
        "click",
        () => {


            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {

                return;

            }


            // ----------------------------------------------
            // REMOVE AUTH
            // ----------------------------------------------

            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );


            // ----------------------------------------------
            // REMOVE USER CACHE
            // ----------------------------------------------

            localStorage.removeItem(
                "ki_user"
            );

            localStorage.removeItem(
                "user"
            );


            // ----------------------------------------------
            // REDIRECT
            // ----------------------------------------------

            window.location.href =
                "auth.html";

        }
    );

}


// ======================================================
// BOTTOM NAVIGATION
// ======================================================

function setupBottomNavigation() {

    const navItems =
        document.querySelectorAll(
            ".bottom-nav a"
        );


    if (!navItems.length) {

        return;

    }


    navItems.forEach(
        item => {


            item.addEventListener(
                "click",
                () => {


                    navItems.forEach(
                        nav => {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    item.classList.add(
                        "active"
                    );

                }
            );

        }
    );

}


// ======================================================
// PAGE ANIMATION
// ======================================================

function startPageAnimation() {

    document.body.classList.add(
        "page-loaded"
    );

}


// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        console.log(
            "================================"
        );


        console.log(
            "PROFILE PAGE INITIALIZING"
        );


        console.log(
            "================================"
        );


        // ----------------------------------------------
        // LOAD PROFILE
        // ----------------------------------------------

        loadProfile();


        // ----------------------------------------------
        // LOGOUT
        // ----------------------------------------------

        setupLogout();


        // ----------------------------------------------
        // NAVIGATION
        // ----------------------------------------------

        setupBottomNavigation();


        // ----------------------------------------------
        // ANIMATION
        // ----------------------------------------------

        startPageAnimation();


    }
);