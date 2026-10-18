// =========================================================
// HOME.JS
// REAL USER DASHBOARD
// =========================================================


// =========================================================
// API
// =========================================================

const API_URL =
    "https://tesla-wealth.onrender.com/api";


// =========================================================
// TOKEN
// =========================================================

const token =
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// =========================================================
// LOGIN CHECK
// =========================================================

if (!token) {

    window.location.href =
        "auth.html";

}


// =========================================================
// GLOBAL DATA
// =========================================================

let currentUser = {};

let currentDashboard = {};

let recentTransactions = [];


// =========================================================
// COMMON API FETCH
// =========================================================

async function apiFetch(
    url,
    options = {}
) {

    try {

        const response =
            await fetch(
                API_URL + url,
                {

                    ...options,

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`,

                        ...(options.headers || {})

                    }

                }
            );


        // =========================================
        // SESSION EXPIRED
        // =========================================

        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "auth.html";

            return null;

        }


        // =========================================
        // RESPONSE JSON
        // =========================================

        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        // =========================================
        // ERROR
        // =========================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                data.msg ||
                "Request failed."
            );

        }


        return data;

    }

    catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        throw error;

    }

}


// =========================================================
// MONEY
// =========================================================

function money(value) {

    const amount =
        Number(value || 0);


    return "₹" +
        amount.toLocaleString(
            "en-IN",
            {

                minimumFractionDigits: 0,

                maximumFractionDigits: 2

            }
        );

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        character => {

            const map = {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                '"': "&quot;",

                "'": "&#039;"

            };


            return map[
                character
            ];

        }
    );

}


// =========================================================
// LOAD USER
// =========================================================

async function loadUser() {

    try {

        const data =
            await apiFetch(
                "/auth/me"
            );


        if (!data) {

            return null;

        }


        const user =
            data.user ||
            data.data ||
            data;


        currentUser =
            user || {};


        renderUser(
            currentUser,
            currentDashboard
        );


        return currentUser;

    }

    catch (error) {

        console.error(
            "USER LOAD:",
            error.message
        );


        return null;

    }

}


// =========================================================
// LOAD INVESTMENT DASHBOARD
// =========================================================

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/investment/dashboard"
            );


        if (!data) {

            return null;

        }


        console.log(
            "REAL INVESTMENT DASHBOARD:",
            data
        );


        currentDashboard =
            data.dashboard ||
            data.data?.dashboard ||
            {};


        if (data.user) {

            currentUser =
                data.user;

        }


        renderUser(
            currentUser,
            currentDashboard
        );


        return data;

    }

    catch (error) {

        console.error(
            "DASHBOARD LOAD:",
            error.message
        );


        return null;

    }

}


// =========================================================
// RENDER USER
// =========================================================

function renderUser(
    user = {},
    dashboard = {}
) {

    const name =
        user.name ||
        "User";


    // =====================================================
    // REAL WALLET
    // =====================================================

    const balance =
        dashboard.wallet ??
        dashboard.balance ??
        user.wallet ??
        user.balance ??
        0;


    // =====================================================
    // REAL ACTIVE INVESTMENTS
    // =====================================================

    const activePlans =
        dashboard.activePlans ??
        dashboard.activeInvestments ??
        dashboard.activePlansCount ??
        0;


    // =====================================================
    // REAL DAILY INCOME
    // =====================================================

    const dailyIncome =
        dashboard.dailyIncome ??
        dashboard.dailyYield ??
        dashboard.dailyEarning ??
        0;


    // =====================================================
    // REAL TOTAL INVESTMENT
    // =====================================================

    const totalInvestment =
        dashboard.totalInvestment ??
        dashboard.totalInvested ??
        dashboard.investedAmount ??
        0;


    // =====================================================
    // REAL TOTAL EARNED
    // =====================================================

    const totalEarned =
        dashboard.totalEarned ??
        dashboard.totalEarning ??
        dashboard.earnings ??
        dashboard.totalIncome ??
        0;


    // =====================================================
    // USER NAME
    // =====================================================

    const nameElement =
        document.getElementById(
            "userName"
        );


    if (nameElement) {

        nameElement.textContent =
            name;

    }


    // =====================================================
    // WALLET
    // =====================================================

    const balanceElement =
        document.getElementById(
            "walletBalance"
        );


    if (balanceElement) {

        animateNumber(
            balanceElement,
            balance,
            true
        );

    }


    // =====================================================
    // ACTIVE INVESTMENTS
    // =====================================================

    const activeElement =
        document.getElementById(
            "activeInvestments"
        );


    if (activeElement) {

        animateNumber(
            activeElement,
            activePlans,
            false
        );

    }


    // =====================================================
    // DAILY INCOME
    // =====================================================

    const dailyElement =
        document.getElementById(
            "dailyYield"
        );


    if (dailyElement) {

        animateNumber(
            dailyElement,
            dailyIncome,
            true
        );

    }


    // =====================================================
    // TOTAL INVESTMENT
    // =====================================================

    const investmentElement =
        document.getElementById(
            "totalInvestment"
        );


    if (investmentElement) {

        animateNumber(
            investmentElement,
            totalInvestment,
            true
        );

    }


    // =====================================================
    // TOTAL EARNED
    // =====================================================

    const earnedElement =
        document.getElementById(
            "totalEarned"
        );


    if (earnedElement) {

        animateNumber(
            earnedElement,
            totalEarned,
            true
        );

    }


    // =====================================================
    // PROFILE IMAGE
    // =====================================================

    const profileImage =
        document.getElementById(
            "profileImage"
        );


    if (
        profileImage &&
        user.profileImage
    ) {

        profileImage.src =
            user.profileImage;

    }

}


// =========================================================
// NUMBER ANIMATION
// =========================================================

function animateNumber(
    element,
    target,
    currency = false
) {

    const numericTarget =
        Number(target || 0);


    const previous =
        Number(
            element.dataset.value ||
            0
        );


    const difference =
        numericTarget -
        previous;


    const duration =
        650;


    const startTime =
        performance.now();


    function update(
        currentTime
    ) {

        const progress =
            Math.min(
                (
                    currentTime -
                    startTime
                ) / duration,
                1
            );


        const eased =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        const value =
            previous +
            difference * eased;


        element.textContent =
            currency
                ? money(value)
                : Math.round(value);


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                update
            );

        }

        else {

            element.dataset.value =
                numericTarget;

        }

    }


    requestAnimationFrame(
        update
    );

}


// =========================================================
// NAVIGATION
// =========================================================

// =========================================================
// NAVIGATION
// =========================================================
// =========================================================
// NAVIGATION
// =========================================================

function navigate(page) {

    switch (page) {

        case "home":

            window.location.href =
                "home.html";

            break;


        case "investments":

            window.location.href =
                "investments.html";

            break;


        case "deposit":

            window.location.href =
                "deposite.html";

            break;


        case "transactions":

            window.location.href =
                "transactions.html";

            break;


       // ABOUT COMPANY
case "about-company":

    window.location.href =
        "about.html";

    break;


// COMPANY DOCUMENTS
case "company-documents":

    window.location.href =
        "about-company.html";

    break;

        case "profile":

            window.location.href =
                "profile.html";

            break;


        case "withdraw":

            window.location.href =
                "withdraw.html";

            break;


        default:

            console.warn(
                "Unknown page:",
                page
            );

            break;
    }

}



// =========================================================
// QUICK NAVIGATION
// =========================================================

function goToDeposit() {

    navigate("deposit");

}


function goToWithdraw() {

    navigate("withdraw");

}


function goToInvestments() {

    navigate("investments");

}


function goToTransactions() {

    navigate("transactions");

}


// ABOUT COMPANY
function goToAboutCompany() {

    navigate("about-company");

}

function goToCompanyDocuments() {
    navigate("company-documents");
}

// =========================================================
// ACTIVE NAVIGATION
// =========================================================

function setActiveNavigation() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .replace(
                ".html",
                ""
            )
            .toLowerCase();


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove(
                "active"
            );


            const page =
                String(
                    item.dataset.page || ""
                ).toLowerCase();


            if (
                page === currentPage
            ) {

                item.classList.add(
                    "active"
                );

            }

        });

}

// =========================================================
// MAGNETIC EFFECT
// =========================================================

function initMagneticEffect() {

    if (
        window.matchMedia(
            "(pointer: coarse)"
        ).matches
    ) {

        return;

    }


    document
        .querySelectorAll(
            ".magnetic"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "mousemove",
                    function(event) {

                        const rect =
                            element.getBoundingClientRect();


                        const x =
                            event.clientX -
                            rect.left;


                        const y =
                            event.clientY -
                            rect.top;


                        const moveX =
                            (
                                x -
                                rect.width / 2
                            ) * 0.018;


                        const moveY =
                            (
                                y -
                                rect.height / 2
                            ) * 0.018;


                        element.style.transform =
                            `translate(
                                ${moveX}px,
                                ${moveY}px
                            )`;

                    }
                );


                element.addEventListener(
                    "mouseleave",
                    function() {

                        element.style.transform =
                            "";

                    }
                );

            }
        );

}


// =========================================================
// RECENT TRANSACTIONS
// =========================================================

async function loadRecentTransactions() {

    const container =
        document.getElementById(
            "activityContainer"
        );


    if (!container) {

        return;

    }


    try {

        const data =
            await apiFetch(
                "/transactions/my"
            );


        if (!data) {

            return;

        }


        const transactions =
            data.transactions ||
            data.data?.transactions ||
            data.data ||
            data;


        if (
            !Array.isArray(
                transactions
            ) ||
            transactions.length === 0
        ) {

            renderNoTransactions();

            return;

        }


        recentTransactions =
            transactions;


        renderTransactions(
            transactions.slice(
                0,
                5
            )
        );

    }

    catch (error) {

        console.error(
            "TRANSACTIONS:",
            error.message
        );


        renderTransactionError();

    }

}


// =========================================================
// NO TRANSACTIONS
// =========================================================

function renderNoTransactions() {

    const container =
        document.getElementById(
            "activityContainer"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="empty-card">

            <i
                class="fa-solid fa-receipt"
            ></i>

            <p>
                No recent transactions.
            </p>

        </div>

    `;

}


// =========================================================
// TRANSACTION ERROR
// =========================================================

function renderTransactionError() {

    const container =
        document.getElementById(
            "activityContainer"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="empty-card">

            <i
                class="fa-solid fa-circle-exclamation"
            ></i>

            <p>
                Unable to load recent activity.
            </p>

        </div>

    `;

}


// =========================================================
// RENDER TRANSACTIONS
// =========================================================

function renderTransactions(
    transactions
) {

    const container =
        document.getElementById(
            "activityContainer"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        transactions
            .map(
                (
                    transaction,
                    index
                ) => {

                    const amount =
                        Number(
                            transaction.amount ||
                            0
                        );


                    const rawType =
                        transaction.type ||
                        transaction.category ||
                        transaction.title ||
                        "Transaction";


                    const type =
                        String(
                            rawType
                        );


                    // =====================================
                    // DETERMINE TRANSACTION TYPE
                    // =====================================

                    const lowerType =
                        type.toLowerCase();


                    const isDeposit =
                        lowerType.includes(
                            "deposit"
                        ) ||
                        lowerType.includes(
                            "recharge"
                        );


                    const isIncome =
                        lowerType.includes(
                            "income"
                        ) ||
                        lowerType.includes(
                            "earning"
                        ) ||
                        lowerType.includes(
                            "profit"
                        );


                    const isInvestment =
                        lowerType.includes(
                            "investment"
                        );


                    const isWithdraw =
                        lowerType.includes(
                            "withdraw"
                        );


                    let icon =
                        "fa-receipt";


                    let iconClass =
                        "activity-neutral";


                    let sign =
                        "";


                    // =====================================
                    // DEPOSIT
                    // =====================================

                    if (
                        isDeposit
                    ) {

                        icon =
                            "fa-arrow-down";

                        iconClass =
                            "deposit-icon";

                        sign =
                            "+";

                    }


                    // =====================================
                    // INCOME
                    // =====================================

                    else if (
                        isIncome
                    ) {

                        icon =
                            "fa-coins";

                        iconClass =
                            "income-icon";

                        sign =
                            "+";

                    }


                    // =====================================
                    // WITHDRAW
                    // =====================================

                    else if (
                        isWithdraw
                    ) {

                        icon =
                            "fa-arrow-up";

                        iconClass =
                            "withdraw-icon";

                        sign =
                            "-";

                    }


                    // =====================================
                    // INVESTMENT
                    // =====================================

                    else if (
                        isInvestment
                    ) {

                        icon =
                            "fa-chart-line";

                        iconClass =
                            "investment-icon";

                        sign =
                            "-";

                    }


                    return `

                        <div
                            class="activity-item"
                            style="
                                animation-delay:
                                ${index * 0.08}s
                            "
                        >

                            <div
                                class="
                                    activity-icon
                                    ${iconClass}
                                "
                            >

                                <i
                                    class="
                                        fa-solid
                                        ${icon}
                                    "
                                ></i>

                            </div>


                            <div
                                class="
                                    activity-info
                                "
                            >

                                <strong>

                                    ${escapeHtml(
                                        type
                                    )}

                                </strong>


                                <span>

                                    ${formatDate(
                                        transaction.createdAt ||
                                        transaction.date
                                    )}

                                </span>

                            </div>


                            <div
                                class="
                                    activity-amount
                                    ${
                                        sign === "+"
                                            ? "amount-positive"
                                            : sign === "-"
                                                ? "amount-negative"
                                                : ""
                                    }
                                "
                            >

                                ${sign}

                                ${money(
                                    amount
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// =========================================================
// DATE
// =========================================================

function formatDate(
    date
) {

    if (!date) {

        return "Recently";

    }


    const d =
        new Date(date);


    if (
        Number.isNaN(
            d.getTime()
        )
    ) {

        return "Recently";

    }


    return d.toLocaleString(
        "en-IN",
        {

            day: "2-digit",

            month: "short",

            hour: "2-digit",

            minute: "2-digit"

        }
    );

}









// =========================================================
// SAMPLE WITHDRAWAL NAMES
// =========================================================
// =========================================================
// SAMPLE WITHDRAWAL NAMES
// =========================================================

const sampleWithdrawalNames = [

    "Arjun Reddy",
    "Karthik Kumar",
    "Vijay Krishnan",
    "Suresh Babu",
    "Ravi Teja",
    "Praveen Kumar",
    "Harish Reddy",
    "Naveen Rao",
    "Sai Kiran",
    "Manoj Kumar",
    "Rahul Nair",
    "Arun Raj",
    "Vishnu Prasad",
    "Aditya Menon",
    "Sanjay Rao",
    "Gokul Krishnan",
    "Surya Prakash",
    "Ajay Kumar",
    "Ramesh Babu",
    "Nikhil Reddy",
    "Vivek Nair",
    "Kiran Raj",
    "Mohan Das",
    "Anand Kumar",
    "Srinivas Rao"

];


// =========================================================
// POPUP VARIABLES
// =========================================================

let withdrawalTimer = null;
let withdrawalInterval = null;
let currentPopupTimestamp = 0;


// =========================================================
// RANDOM NAME
// =========================================================

function getRandomWithdrawalName() {

    const index =
        Math.floor(
            Math.random() *
            sampleWithdrawalNames.length
        );

    return sampleWithdrawalNames[index];
}


// =========================================================
// RANDOM ROUNDED AMOUNT
// =========================================================
// 80%  → ₹1,000 - ₹49,900
// 15%  → ₹50,000 - ₹2,00,000
// 5%   → ₹2,00,000 - ₹10,00,000
//
// Amounts are rounded.
// No strange values such as ₹762 or ₹1,237.
// =========================================================

function getRandomWithdrawalAmount() {

    const chance = Math.random();

    let amount;


    // -----------------------------------------------------
    // MOST WITHDRAWALS
    // ₹1,000 - ₹49,900
    // -----------------------------------------------------

    if (chance < 0.80) {

        const minimum = 1000;
        const maximum = 49900;
        const step = 100;

        const steps =
            Math.floor(
                Math.random() *
                (
                    (maximum - minimum) /
                    step +
                    1
                )
            );

        amount =
            minimum +
            (steps * step);
    }


    // -----------------------------------------------------
    // SOME LARGER WITHDRAWALS
    // ₹50,000 - ₹2,00,000
    // -----------------------------------------------------

    else if (chance < 0.95) {

        const minimum = 50000;
        const maximum = 200000;
        const step = 5000;

        const steps =
            Math.floor(
                Math.random() *
                (
                    (maximum - minimum) /
                    step +
                    1
                )
            );

        amount =
            minimum +
            (steps * step);
    }


    // -----------------------------------------------------
    // OCCASIONAL HIGH WITHDRAWALS
    // ₹2,00,000 - ₹10,00,000
    // -----------------------------------------------------

    else {

        const minimum = 200000;
        const maximum = 1000000;
        const step = 10000;

        const steps =
            Math.floor(
                Math.random() *
                (
                    (maximum - minimum) /
                    step +
                    1
                )
            );

        amount =
            minimum +
            (steps * step);
    }


    return amount;
}


// =========================================================
// GENERATE SAMPLE WITHDRAWAL
// =========================================================

function generateWithdrawal() {

    return {

        name:
            getRandomWithdrawalName(),

        amount:
            getRandomWithdrawalAmount()

    };
}


// =========================================================
// RELATIVE TIME
// =========================================================

function relativeTime(timestamp) {

    if (!timestamp) {
        return "Just now";
    }


    const seconds =
        Math.max(
            0,
            Math.floor(
                (
                    Date.now() -
                    timestamp
                ) / 1000
            )
        );


    if (seconds < 5) {
        return "Just now";
    }


    if (seconds < 60) {

        return seconds === 1
            ? "1 second ago"
            : `${seconds} seconds ago`;
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return minutes === 1
            ? "1 minute ago"
            : `${minutes} minutes ago`;
    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return hours === 1
            ? "1 hour ago"
            : `${hours} hours ago`;
    }


    const days =
        Math.floor(
            hours / 24
        );


    return days === 1
        ? "1 day ago"
        : `${days} days ago`;
}


// =========================================================
// SHOW WITHDRAWAL POPUP
// =========================================================

function showWithdrawalPopup() {

    const popup =
        document.getElementById(
            "withdrawPopup"
        );

    const user =
        document.getElementById(
            "withdrawUser"
        );

    const message =
        document.getElementById(
            "withdrawMessage"
        );

    const time =
        document.getElementById(
            "withdrawTime"
        );


    // -----------------------------------------------------
    // CHECK HTML
    // -----------------------------------------------------

    if (
        !popup ||
        !user ||
        !message ||
        !time
    ) {

        console.error(
            "Withdrawal popup HTML elements not found."
        );

        return;
    }


    // -----------------------------------------------------
    // GENERATE NEW SAMPLE
    // -----------------------------------------------------

    const item =
        generateWithdrawal();


    // -----------------------------------------------------
    // SAVE TIMESTAMP
    // -----------------------------------------------------

    currentPopupTimestamp =
        Date.now();


    // -----------------------------------------------------
    // USER NAME
    // -----------------------------------------------------

    user.textContent =
        item.name;


    // -----------------------------------------------------
    // AMOUNT
    // -----------------------------------------------------

    message.textContent =
        ` withdrawal ${money(
            item.amount
        )}`;


    // -----------------------------------------------------
    // TIME
    // -----------------------------------------------------

    time.textContent =
        "Just now";


    // -----------------------------------------------------
    // RESET ANIMATION
    // -----------------------------------------------------

    popup.classList.remove(
        "show"
    );

    void popup.offsetWidth;


    // -----------------------------------------------------
    // SHOW
    // -----------------------------------------------------

    requestAnimationFrame(
        function() {

            popup.classList.add(
                "show"
            );

        }
    );


    // -----------------------------------------------------
    // AUTO HIDE
    // -----------------------------------------------------

    clearTimeout(
        withdrawalTimer
    );


    withdrawalTimer =
        setTimeout(
            function() {

                popup.classList.remove(
                    "show"
                );

            },
            6000
        );
}


// =========================================================
// UPDATE POPUP TIME
// =========================================================

function updateWithdrawalTime() {

    const popup =
        document.getElementById(
            "withdrawPopup"
        );

    const time =
        document.getElementById(
            "withdrawTime"
        );


    if (
        !popup ||
        !time
    ) {

        return;
    }


    if (
        !popup.classList.contains(
            "show"
        )
    ) {

        return;
    }


    time.textContent =
        relativeTime(
            currentPopupTimestamp
        );
}


// =========================================================
// START POPUP SYSTEM
// =========================================================

function startWithdrawalPopups() {

    const popup =
        document.getElementById(
            "withdrawPopup"
        );


    if (!popup) {

        console.error(
            "withdrawPopup element not found."
        );

        return;
    }


    // -----------------------------------------------------
    // PREVENT DUPLICATE INTERVALS
    // -----------------------------------------------------

    if (withdrawalInterval) {

        clearInterval(
            withdrawalInterval
        );

        withdrawalInterval = null;
    }


    if (withdrawalTimer) {

        clearTimeout(
            withdrawalTimer
        );

        withdrawalTimer = null;
    }


    console.log(
        " withdrawal popup system started."
    );


    // -----------------------------------------------------
    // FIRST POPUP
    // -----------------------------------------------------

    setTimeout(
        function() {

            showWithdrawalPopup();

        },
        3000
    );


    // -----------------------------------------------------
    // NEW RANDOM SAMPLE EVERY 15 SECONDS
    // -----------------------------------------------------

    withdrawalInterval =
        setInterval(
            function() {

                showWithdrawalPopup();

            },
            15000
        );
}


// =========================================================
// HIDE POPUP
// =========================================================

function hideWithdrawPopup() {

    const popup =
        document.getElementById(
            "withdrawPopup"
        );


    if (!popup) {
        return;
    }


    popup.classList.remove(
        "show"
    );


    clearTimeout(
        withdrawalTimer
    );

    withdrawalTimer = null;
}


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const closeButton =
            document.getElementById(
                "closeWithdrawPopup"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                hideWithdrawPopup
            );
        }


        // Start popup system
        startWithdrawalPopups();


        // Update time every second
        setInterval(
            updateWithdrawalTime,
            1000
        );

    }
);  
// =========================================================
// WELCOME MODAL
// =========================================================

function showWelcomeModal() {

    const modal =
        document.getElementById(
            "welcomeModal"
        );


    if (!modal) {

        return;

    }


    // =============================================
    // USER NAME
    // =============================================

    const name =
        currentUser?.name ||
        "User";


    const nameElement =
        document.getElementById(
            "welcomeUserName"
        );


    if (nameElement) {

        nameElement.textContent =
            name;

    }


    // =============================================
    // REAL WALLET BALANCE
    // =============================================

    const balance =
        currentDashboard?.wallet ??
        currentDashboard?.balance ??
        currentUser?.wallet ??
        currentUser?.balance ??
        0;


    const balanceElement =
        document.getElementById(
            "welcomeBalance"
        );


    if (balanceElement) {

        balanceElement.textContent =
            money(balance);

    }


    // =============================================
    // SHOW
    // =============================================

    modal.classList.add(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


// =========================================================
// CLOSE WELCOME MODAL
// =========================================================

function closeWelcomeModal() {

    const modal =
        document.getElementById(
            "welcomeModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


// =========================================================
// WELCOME MODAL BUTTONS
// =========================================================

function initWelcomeModal() {

    const closeButton =
        document.getElementById(
            "closeWelcome"
        );


    const continueButton =
        document.getElementById(
            "welcomeContinue"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeWelcomeModal
        );

    }


    if (continueButton) {

        continueButton.addEventListener(
            "click",
            closeWelcomeModal
        );

    }


    const modal =
        document.getElementById(
            "welcomeModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeWelcomeModal();

                }

            }
        );

    }

}


// =========================================================
// SHOW WELCOME ONCE PER LOGIN
// =========================================================

function shouldShowWelcome() {

    const welcomeShown =
        sessionStorage.getItem(
            "welcome_shown"
        );


    if (
        welcomeShown ===
        "true"
    ) {

        return false;

    }


    sessionStorage.setItem(
        "welcome_shown",
        "true"
    );


    return true;

}


// =========================================================
// REFRESH
// =========================================================

document
    .getElementById(
        "refreshBalance"
    )
    ?.addEventListener(
        "click",
        async function() {

            this.classList.add(
                "rotating"
            );


            try {

                await Promise.all([
                    loadUser(),
                    loadDashboard(),
                    loadRecentTransactions()
                ]);

            }

            catch (error) {

                console.error(
                    "REFRESH:",
                    error
                );

            }


            setTimeout(
                () => {

                    this.classList.remove(
                        "rotating"
                    );

                },
                500
            );

        }
    );


// =========================================================
// NOTIFICATION
// =========================================================

document
    .getElementById(
        "notificationButton"
    )
    ?.addEventListener(
        "click",
        function() {

            alert(
                "No new notifications."
            );

        }
    );


// =========================================================
// PROFILE
// =========================================================

document
    .getElementById(
        "profileButton"
    )
    ?.addEventListener(
        "click",
        function() {

            navigate(
                "profile"
            );

        }
    );


// =========================================================
// INITIAL LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "HOME PAGE INITIALIZING..."
        );


        // =============================================
        // NAVIGATION
        // =============================================

        setActiveNavigation();


        // =============================================
        // EFFECTS
        // =============================================

        initMagneticEffect();


        // =============================================
        // WELCOME
        // =============================================

        initWelcomeModal();


        // =============================================
        // LOAD REAL USER DATA
        // =============================================

        await loadUser();


        // =============================================
        // LOAD REAL DASHBOARD
        // =============================================

        await loadDashboard();


        // =============================================
        // LOAD REAL TRANSACTIONS
        // =============================================

        await loadRecentTransactions();


        // =============================================
        // SHOW WELCOME AFTER DATA LOAD
        // =============================================

        if (
            shouldShowWelcome()
        ) {

            setTimeout(
                () => {

                    showWelcomeModal();

                },
                500
            );

        }


        console.log(
            "HOME PAGE READY"
        );

    }
);


/* =====================================================
   FAQ ACCORDION
===================================================== */

function initFAQ() {

    const faqItems = document.querySelectorAll(".faq-item");

    if (!faqItems.length) return;

    faqItems.forEach(item => {

        const question = item.querySelector(".faq-question");

        if (!question) return;

        question.addEventListener("click", () => {

            const isAlreadyOpen = item.classList.contains("active");

            // Close all other questions
            faqItems.forEach(otherItem => {
                otherItem.classList.remove("active");
            });

            // Open selected question
            if (!isAlreadyOpen) {
                item.classList.add("active");
            }

        });

    });

}


/* Initialize FAQ after page loads */
document.addEventListener("DOMContentLoaded", () => {
    initFAQ();
});


/* =========================================================
   DEMO LEADERBOARD
   SAMPLE / DEMO DATA ONLY

   RULES:
   - Earnings NEVER decrease
   - Every investor increases once per day
   - Daily increase uses the specified increments
   - Investors can change positions based on earnings
   - Name + earning always remain together
   - Data persists in localStorage
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       SETTINGS
       ===================================================== */

    const STORAGE_KEY =
        "bitcoinInvestDemoLeaderboard";

    const LAST_UPDATE_KEY =
        "bitcoinInvestDemoLastUpdate";

    const UPDATE_INTERVAL =
        24 * 60 * 60 * 1000; // 1 DAY


    /* =====================================================
       DAILY EARNING INCREMENTS
       Each investor receives one of these amounts per day.
       ===================================================== */

    const EARNING_INCREMENTS = [
        750,
        1500,
        4500,
        5000,
        5500,
        6500,
        7500,
        8500,
        9500,
        10000,
        11000,
        12000,
        13000,
        14000,
        15000
    ];


    /* =====================================================
       FICTIONAL DEMO NAMES
       ===================================================== */

    const DEMO_NAMES = [
        "Arjun Kumar",
        "Karthik Reddy",
        "Vijay Kumar",
        "Suresh Babu",
        "Ravi Shankar",
        "Pradeep Kumar",
        "Manoj Reddy",
        "Srinivas Rao",
        "Naveen Kumar",
        "Harish Kumar",
        "Venkatesh Rao",
        "Ramesh Babu",
        "Dinesh Kumar",
        "Sanjay Reddy",
        "Manish Kumar"
    ];


    /* =====================================================
       DEFAULT STARTING EARNINGS
       ===================================================== */

    const DEFAULT_EARNINGS = [
        1250000,
        1185000,
        1095000,
        985000,
        925000,
        875000,
        815000,
        755000,
        695000,
        635000,
        575000,
        515000,
        455000,
        395000,
        335000
    ];


    /* =====================================================
       LOAD INVESTORS
       ===================================================== */

    let investors = loadInvestors();


    /* =====================================================
       FORMAT MONEY
       ===================================================== */

    function formatEarning(value) {

        return "₹" +
            Number(value).toLocaleString("en-IN");

    }


    /* =====================================================
       LOAD DATA
       ===================================================== */

    function loadInvestors() {

        try {

            const savedData =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (savedData) {

                const parsed =
                    JSON.parse(savedData);


                if (
                    Array.isArray(parsed) &&
                    parsed.length === DEMO_NAMES.length
                ) {

                    return parsed.map(
                        function (investor, index) {

                            return {

                                name:
                                    investor.name ||
                                    DEMO_NAMES[index],

                                /*
                                 * IMPORTANT:
                                 * Existing earning is preserved.
                                 * It can never be replaced with
                                 * a lower value.
                                 */

                                earning:
                                    Math.max(
                                        Number(
                                            investor.earning
                                        ) || 0,

                                        DEFAULT_EARNINGS[index]
                                    )

                            };

                        }
                    );

                }

            }

        } catch (error) {

            console.warn(
                "Could not load leaderboard:",
                error
            );

        }


        /* =================================================
           FIRST TIME LOAD
           ================================================= */

        return DEMO_NAMES.map(
            function (name, index) {

                return {

                    name: name,

                    earning:
                        DEFAULT_EARNINGS[index]

                };

            }
        );

    }


    /* =====================================================
       SAVE
       ===================================================== */

    function saveInvestors() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(investors)
            );

        } catch (error) {

            console.warn(
                "Could not save leaderboard:",
                error
            );

        }

    }


    /* =====================================================
       GET DAILY INCREMENT
       =====================================================

       Every investor gets a fixed increment.

       Investor 1  → ₹750
       Investor 2  → ₹1,500
       Investor 3  → ₹4,500
       ...
       Investor 15 → ₹15,000

       The increment belongs to the investor,
       not to the leaderboard position.

       Therefore earnings can only increase.
       ===================================================== */

    function getDailyIncrement(investor, originalIndex) {

        /*
         * Keep a permanent increment attached to
         * each investor.
         */

        if (
            typeof investor.dailyIncrement !== "number"
        ) {

            investor.dailyIncrement =
                EARNING_INCREMENTS[
                    originalIndex %
                    EARNING_INCREMENTS.length
                ];

        }


        return investor.dailyIncrement;

    }


    /* =====================================================
       UPDATE DAILY EARNINGS
       ===================================================== */

    function updateDailyEarnings() {

        if (!investors.length) {
            return;
        }


        /* =================================================
           Increase EVERY investor
           ================================================= */

        investors.forEach(
            function (investor, index) {

                const increment =
                    getDailyIncrement(
                        investor,
                        index
                    );


                /*
                 * IMPORTANT:
                 *
                 * We ONLY ADD.
                 *
                 * We NEVER subtract.
                 * We NEVER replace with a lower value.
                 */

                investor.earning =
                    Number(investor.earning) +
                    Number(increment);

            }
        );


        /*
         * Sort after all earnings increase.
         *
         * This allows investors to move up/down
         * in position depending on their earning.
         */

        sortInvestors();


        /*
         * Save permanently.
         */

        saveInvestors();


        /*
         * Update last daily update time.
         */

        localStorage.setItem(
            LAST_UPDATE_KEY,
            String(Date.now())
        );


        /*
         * Render leaderboard.
         */

        renderLeaderboard();

    }


    /* =====================================================
       SORT BY EARNING
       ===================================================== */

    function sortInvestors() {

        investors.sort(
            function (a, b) {

                return Number(b.earning) -
                       Number(a.earning);

            }
        );

    }


    /* =====================================================
       TOP 3
       ===================================================== */

    function renderTopInvestor(
        rank,
        investor
    ) {

        const nameElement =
            document.getElementById(
                "rank" + rank + "Name"
            );


        const amountElement =
            document.getElementById(
                "rank" + rank + "Amount"
            );


        if (!investor) {

            if (nameElement) {

                nameElement.textContent =
                    "-";

            }


            if (amountElement) {

                amountElement.textContent =
                    "₹0";

            }

            return;

        }


        if (nameElement) {

            nameElement.textContent =
                investor.name;

        }


        if (amountElement) {

            amountElement.textContent =
                formatEarning(
                    investor.earning
                );

        }

    }


    /* =====================================================
       RANK 4+
       ===================================================== */

    function renderRemainingInvestors() {

        const container =
            document.getElementById(
                "winnerRankingList"
            );


        if (!container) {
            return;
        }


        container.innerHTML = "";


        for (
            let index = 3;
            index < investors.length;
            index++
        ) {

            const investor =
                investors[index];


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "winner-row";


            row.innerHTML = `

                <div class="winner-rank">
                    ${index + 1}
                </div>

                <div class="winner-info">

                    <div class="winner-name">
                        ${escapeHTML(
                            investor.name
                        )}
                    </div>

                </div>

                <div class="winner-amount">
                    ${formatEarning(
                        investor.earning
                    )}
                </div>

            `;


            container.appendChild(row);

        }

    }


    /* =====================================================
       RENDER LEADERBOARD
       ===================================================== */

    function renderLeaderboard() {

        sortInvestors();


        renderTopInvestor(
            1,
            investors[0]
        );


        renderTopInvestor(
            2,
            investors[1]
        );


        renderTopInvestor(
            3,
            investors[2]
        );


        renderRemainingInvestors();

    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHTML(value) {

        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       COUNTDOWN TIMER
       ===================================================== */

    let nextUpdateTime =
        Date.now() +
        UPDATE_INTERVAL;


    function updateTimer() {

        const timerElement =
            document.getElementById(
                "leaderboardTimer"
            );


        if (!timerElement) {
            return;
        }


        const remaining =
            Math.max(
                0,
                nextUpdateTime -
                Date.now()
            );


        const totalSeconds =
            Math.floor(
                remaining / 1000
            );


        const hours =
            Math.floor(
                totalSeconds / 3600
            );


        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );


        const seconds =
            totalSeconds % 60;


        timerElement.textContent =
            String(hours).padStart(
                2,
                "0"
            ) +
            ":" +
            String(minutes).padStart(
                2,
                "0"
            ) +
            ":" +
            String(seconds).padStart(
                2,
                "0"
            );


        /* =================================================
           DAILY UPDATE
           ================================================= */

        if (remaining <= 0) {

            updateDailyEarnings();


            nextUpdateTime =
                Date.now() +
                UPDATE_INTERVAL;

        }

    }


    /* =====================================================
       INITIALIZE LEADERBOARD
       ===================================================== */

    function initializeLeaderboard() {

        const lastUpdate =
            Number(
                localStorage.getItem(
                    LAST_UPDATE_KEY
                ) || 0
            );


        const now =
            Date.now();


        /*
         * If one or more full days have passed,
         * calculate how many daily updates were missed.
         *
         * This means the leaderboard continues increasing
         * even if the user didn't open the page yesterday.
         */

        if (lastUpdate) {

            const elapsed =
                now - lastUpdate;


            const daysPassed =
                Math.floor(
                    elapsed /
                    UPDATE_INTERVAL
                );


            if (daysPassed > 0) {

                for (
                    let day = 0;
                    day < daysPassed;
                    day++
                ) {

                    investors.forEach(
                        function (
                            investor,
                            index
                        ) {

                            const increment =
                                getDailyIncrement(
                                    investor,
                                    index
                                );


                            investor.earning =
                                Number(
                                    investor.earning
                                ) +
                                Number(
                                    increment
                                );

                        }
                    );

                }


                sortInvestors();


                saveInvestors();


                localStorage.setItem(
                    LAST_UPDATE_KEY,
                    String(
                        lastUpdate +
                        (
                            daysPassed *
                            UPDATE_INTERVAL
                        )
                    )
                );

            }

        } else {

            /*
             * First visit:
             * Start the daily timer.
             */

            localStorage.setItem(
                LAST_UPDATE_KEY,
                String(now)
            );

        }


        /* =================================================
           DISPLAY
           ================================================= */

        sortInvestors();

        renderLeaderboard();


        /* =================================================
           NEXT UPDATE
           ================================================= */

        const storedLastUpdate =
            Number(
                localStorage.getItem(
                    LAST_UPDATE_KEY
                ) || now
            );


        nextUpdateTime =
            storedLastUpdate +
            UPDATE_INTERVAL;


        /*
         * Safety:
         * If calculated time is already in the past,
         * start a new 24-hour countdown.
         */

        if (
            nextUpdateTime <= Date.now()
        ) {

            nextUpdateTime =
                Date.now() +
                UPDATE_INTERVAL;

        }

    }


    /* =====================================================
       TIMER
       ===================================================== */

    setInterval(
        updateTimer,
        1000
    );


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeLeaderboard
        );

    } else {

        initializeLeaderboard();

    }


})();




/* =====================================================
   PREMIUM SAMPLE USER REVIEWS
===================================================== */
const sampleReviews = 
/*
 * DEMO / SAMPLE REVIEWS
 * Fictional investor-style examples for UI/demo purposes.
 */

[
    {
        name: "Arjun Reddy",
        initial: "A",
        text: "Honestly bro, I've been fooled by a couple of online platforms before, so this time I didn't want to take a big chance. I started with ₹500 first and spent some time checking the plans and dashboard. I like that the withdrawal option is easy to find and the process is simple to follow.",
        rating: 5
    },

    {
        name: "Karthik Krishnan",
        initial: "K",
        text: "When I first saw the platform, I was thinking maybe this is also like the others 😅. So I started small. After exploring the account, plans and withdrawal section, I found the whole interface pretty straightforward. For me, starting small was the right way to check it out.",
        rating: 5
    },

    {
        name: "Vijay Kumar",
        initial: "V",
        text: "I've seen many platforms promising different things, so I don't trust anything immediately. I started with ₹500 and first checked how everything works. The plan details are clear and the withdrawal request flow is easy enough to understand.",
        rating: 5
    },

    {
        name: "Suresh Babu",
        initial: "S",
        text: "Bro, I was actually very doubtful in the beginning 😂. I've heard enough stories about fake platforms. That's why I started with a small amount. I like the simple dashboard, and I can easily check my balance, plans and withdrawal details.",
        rating: 5
    },

    {
        name: "Rahul Nair",
        initial: "R",
        text: "My rule is simple — whenever I try something new, I start small. I began with ₹500 and took my time looking through the platform. The account information is easy to check and the withdrawal process doesn't feel complicated.",
        rating: 4
    },

    {
        name: "Naveen Raj",
        initial: "N",
        text: "I've tried platforms before where you have to search everywhere just to understand what's going on. Here the important things are much easier to find. I checked the plans, account details and withdrawal section before going any further.",
        rating: 5
    },

    {
        name: "Amit Subramanian",
        initial: "A",
        text: "Not gonna lie, my first thought was 'let's see if this is actually worth checking' 😅. I didn't put a big amount in. I started with ₹500, explored the dashboard and checked the withdrawal process. I prefer doing things this way instead of blindly trusting something.",
        rating: 5
    },

    {
        name: "Rohit Menon",
        initial: "R",
        text: "After seeing so many scam stories online, I think everyone should be careful. I started small and checked the platform myself instead of believing everything I heard. The dashboard is clean, and the withdrawal steps are easy to understand.",
        rating: 4
    }
]

let currentReview = 0;

/* =====================================================
   CREATE REVIEW
===================================================== */

function createReviewCard(review, index) {

    const card =
        document.createElement("div");

    card.className =
        "review-card" +
        (index === 0 ? " active" : "");


    const stars =
        "★".repeat(review.rating) +
        "☆".repeat(5 - review.rating);


    card.innerHTML = `

        <div>

            <div class="review-quote">
                “
            </div>

            <div class="review-text">
                ${review.text}
            </div>

        </div>


        <div class="review-bottom">

            <div class="review-user">

                <div class="review-initial">
                    ${review.initial}
                </div>

                <div class="review-user-info">

                    <strong>
                        ${review.name}
                    </strong>

                    <span>
                        Community member
                    </span>

                </div>

            </div>


            <div class="review-stars">
                ${stars}
            </div>

        </div>

    `;


    return card;
}


/* =====================================================
   INITIALIZE
===================================================== */

function initReviews() {

    const slider =
        document.getElementById(
            "reviewsSlider"
        );

    const dotsContainer =
        document.getElementById(
            "reviewsDots"
        );


    if (!slider || !dotsContainer) {
        return;
    }


    slider.innerHTML = "";

    dotsContainer.innerHTML = "";


    sampleReviews.forEach(
        (review, index) => {

            const card =
                createReviewCard(
                    review,
                    index
                );


            slider.appendChild(card);


            const dot =
                document.createElement("div");


            dot.className =
                "review-dot" +
                (index === 0
                    ? " active"
                    : "");


            dotsContainer.appendChild(dot);

        }
    );


    setInterval(
        showNextReview,
        8000
    );

}


/* =====================================================
   NEXT REVIEW
===================================================== */

function showNextReview() {

    const cards =
        document.querySelectorAll(
            ".review-card"
        );

    const dots =
        document.querySelectorAll(
            ".review-dot"
        );


    if (!cards.length) {
        return;
    }


    cards[currentReview]
        .classList
        .remove("active");


    dots[currentReview]
        ?.classList
        .remove("active");


    currentReview++;

    if (
        currentReview >=
        cards.length
    ) {

        currentReview = 0;

    }


    cards[currentReview]
        .classList
        .add("active");


    dots[currentReview]
        ?.classList
        .add("active");

}


/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initReviews
);


/* =====================================================
   WINNER USER ACTIVITY
   SAMPLE / DEMO DATA
===================================================== */


const sampleUsers = [

    ["Arjun Reddy", "382300"],
    ["Karthik Kumar", "431800"],
    ["Vijay Krishnan", "294100"],
    ["Suresh Babu", "318500"],
    ["Ravi Teja", "457200"],
    ["Praveen Kumar", "191600"],
    ["Harish Reddy", "426800"],
    ["Naveen Rao", "343900"],
    ["Sai Kiran", "285700"],
    ["Manoj Kumar", "239200"],

    ["Gokul Krishnan", "417400"],
    ["Nikhil Reddy", "328100"],
    ["Deepak Kumar", "256900"],
    ["Manish Nair", "171800"],
    ["Prakash Rao", "442600"],
    ["Anand Kumar", "194700"],
    ["Rakesh Babu", "315300"],
    ["Sunil Varma", "231500"],
    ["Vishnu Prasad", "368200"],
    ["Sanjay Kumar", "452600"],

    ["Surya Prakash", "218700"],
    ["Aditya Menon", "374900"],
    ["Mohan Das", "415600"],
    ["Ajay Kumar", "329700"],
    ["Srinivas Rao", "263800"],
    ["Rohit Nair", "191400"],
    ["Vivek Krishnan", "437500"],
    ["Kiran Raj", "316800"],
    ["Rahul Nair", "445100"],
    ["Arun Raj", "262800"],

    ["Vijay Babu", "318400"],
    ["Sathish Kumar", "424900"],
    ["Sanjay Rao", "283200"],
    ["Tarun Kumar", "217600"],
    ["Madhav Reddy", "339100"],
    ["Ramesh Babu", "395800"],
    ["Ajith Kumar", "241600"],
    ["Naveen Nair", "118900"],
    ["Vikram Rao", "436400"],
    ["Krishna Prasad", "274500"]

];
/* =====================================================
   USED USERS
===================================================== */

let usedSampleUsers = [];


/* =====================================================
   ACTIVITY TYPES
===================================================== */

const sampleActivityTypes = [

    {
        type: "Deposit",
        icon: "💰"
    },

    {
        type: "Investment",
        icon: "📈"
    },

    {
        type: "Investment Return",
        icon: "↗️"
    },

    {
        type: "Withdrawal ",
        icon: "🏆"
    }

];


/* =====================================================
   INVESTMENT / PRIZE AMOUNTS

   Used for:
   - Investment
   - Withdrawal Prize
===================================================== */

const investmentPrizeAmounts = [

    500,
    1000,
    2500,
    5000,
    10000,
    15000,
    20000,
    25000,
    30000,
    35000,
    40000,
    42500,
    45000,
    47500,
    50000

];


/* =====================================================
   INVESTMENT RETURN AMOUNTS

   SMALLER AMOUNTS
===================================================== */

const investmentReturnAmounts = [
    750,
   
    1500,
    4500,
    5000,
    5500,
    6500,
    7500,
    8500,
    9500,

    
    10000,
    11000,
    12000,
    13000,
    14000,
    15000,
    
    
];


/* =====================================================
   DEPOSIT AMOUNTS

   NEVER BELOW ₹500
===================================================== */

const depositAmounts = [

    500,

    1000,
    1500,
    2000,
    2500,
    3500,
    5000,
    7500,
    10000,
    15000,
    20000,
    25000,
    30000,
    35000,
    40000,
    42500,
    45000,
    47500,
    
    50000

];


/* =====================================================
   RANDOM ITEM
===================================================== */

function randomItem(array) {

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];

}


/* =====================================================
   GET UNIQUE USER
===================================================== */

function getUniqueSampleUser() {

    if (
        usedSampleUsers.length >=
        sampleUsers.length
    ) {

        usedSampleUsers = [];

    }


    const availableUsers =
        sampleUsers.filter(
            user =>
                !usedSampleUsers.includes(
                    user[1]
                )
        );


    const selectedUser =
        randomItem(
            availableUsers
        );


    usedSampleUsers.push(
        selectedUser[1]
    );


    return selectedUser;

}


/* =====================================================
   GET ACTIVITY AMOUNT
===================================================== */

function getActivityAmount(activityType) {

    /* ---------------------------------------------
       DEPOSIT
       Minimum ₹500
    --------------------------------------------- */

    if (
        activityType === "Deposit"
    ) {

        return randomItem(
            depositAmounts
        );

    }


    /* ---------------------------------------------
       INVESTMENT RETURN

       Small amount
       NOT leaderboard-style
    --------------------------------------------- */

    if (
        activityType === "Investment Return"
    ) {

        return randomItem(
            investmentReturnAmounts
        );

    }


    /* ---------------------------------------------
       INVESTMENT / WITHDRAWAL PRIZE
    --------------------------------------------- */

    return randomItem(
        investmentPrizeAmounts
    );

}


/* =====================================================
   TIME TEXT
===================================================== */

function randomTimeText() {

    const times = [

        "Just now",
        "5 sec ago",
        "12 sec ago",
        "18 sec ago",
        "25 sec ago",
        "32 sec ago",
        "45 sec ago",
        "1 min ago",
        "2 min ago"

    ];

    return randomItem(times);

}


/* =====================================================
   CREATE ACTIVITY
===================================================== */

function createWinnerActivity() {

    const user =
        getUniqueSampleUser();


    const activity =
        randomItem(
            sampleActivityTypes
        );


    const amount =
        getActivityAmount(
            activity.type
        );


    const row =
        document.createElement("div");


    row.className =
        "winner-activity-row";


    /* ---------------------------------------------
       Special class for small return amount
    --------------------------------------------- */

    if (
        activity.type === "Investment Return"
    ) {

        row.classList.add(
            "investment-return-row"
        );

    }


    row.innerHTML = `

        <div class="activity-icon">
            ${activity.icon}
        </div>


        <div class="activity-user">

            <div class="activity-user-name">

                ${user[0]}

                <span class="activity-verified">
                    ✓
                </span>

            </div>


            <div class="activity-uid">
                UID: ${user[1]}
            </div>


            <div class="activity-action">
                ${activity.type}
            </div>

        </div>


        <div class="activity-right">

            <strong class="activity-amount">
                ₹${amount.toLocaleString("en-IN")}
            </strong>


            <span class="activity-status">
                ● Completed
            </span>


            <span class="activity-time">
                ${randomTimeText()}
            </span>

        </div>

    `;


    return row;

}


/* =====================================================
   ADD ACTIVITY
===================================================== */

function addWinnerActivity() {

    const list =
        document.getElementById(
            "winnerActivityList"
        );


    if (!list) return;


    const row =
        createWinnerActivity();


    /* New activity at top */

    list.prepend(row);


    /* Keep maximum 8 */

    while (
        list.children.length > 8
    ) {

        list.lastElementChild.remove();

    }

}


/* =====================================================
   INITIAL LOAD
===================================================== */

function initWinnerActivity() {

    const list =
        document.getElementById(
            "winnerActivityList"
        );


    if (!list) return;


    /* Initial 5 activities */

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const row =
            createWinnerActivity();


        list.appendChild(row);

    }


    /* New activity every 12 seconds */

    setInterval(
        addWinnerActivity,
        12000
    );

}


/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initWinnerActivity
);
