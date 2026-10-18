// ======================================================
// MY INVESTMENTS
// PREMIUM INVESTMENT PORTFOLIO
// 24-HOUR INCOME DISPLAY
// ======================================================


// ======================================================
// API CONFIGURATION
// ======================================================

const API_URL =
    "https://tesla-wealth.onrender.com/api/investment";


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let allInvestments = [];

let currentFilter = "all";

let countdownInterval = null;


// ======================================================
// SWEETALERT TOAST
// ======================================================

const Toast = Swal.mixin({

    toast: true,

    position: "top-end",

    showConfirmButton: false,

    timer: 3000,

    timerProgressBar: true,

    background: "#131b2e",

    color: "#ffffff"

});


// ======================================================
// NOTIFICATION
// ======================================================

function showNotification(
    message,
    isSuccess = true
) {

    Toast.fire({

        icon:
            isSuccess
                ? "success"
                : "error",

        title:
            message

    });

}


// ======================================================
// GET TOKEN
// ======================================================

function getToken() {

    return (
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        ""
    );

}


// ======================================================
// AUTH HEADERS
// ======================================================

function getHeaders() {

    const token =
        getToken();


    return {

        "Content-Type":
            "application/json",

        "Authorization":
            `Bearer ${token}`

    };

}


// ======================================================
// CHECK AUTHENTICATION
// ======================================================

function checkAuthentication() {

    const token =
        getToken();


    if (!token) {

        window.location.href =
            "auth.html";

        return false;

    }


    return true;

}


// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (
            !checkAuthentication()
        ) {

            return;

        }


        loadMyInvestments();

        startCountdownTimer();

    }
);


// ======================================================
// LOAD INVESTMENTS
// ======================================================

async function loadMyInvestments() {

    const container =
        document.getElementById(
            "investmentsContainer"
        );


    if (!container) {

        console.error(
            "investmentsContainer not found."
        );

        return;

    }


    showLoadingState(
        container
    );


    try {

        const response =
            await fetch(

                `${API_URL}/my`,

                {

                    method:
                        "GET",

                    headers:
                        getHeaders()

                }

            );


        let data = null;


        try {

            data =
                await response.json();

        }

        catch (error) {

            throw new Error(
                "Server returned invalid JSON."
            );

        }


        // ==================================================
        // AUTH ERROR
        // ==================================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );


            showNotification(
                "Your session has expired. Please login again.",
                false
            );


            setTimeout(
                function () {

                    window.location.href =
                        "auth.html";

                },
                1000
            );


            return;

        }


        // ==================================================
        // API ERROR
        // ==================================================

        if (
            !response.ok ||
            !data ||
            !data.success
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <i
                        class="fa-solid fa-circle-exclamation"
                    ></i>

                    <h3>
                        Unable to load investments
                    </h3>

                    <p>
                        ${escapeHTML(
                            data?.message ||
                            "Please try again later."
                        )}
                    </p>

                </div>

            `;


            updateInvestmentCount(0);

            return;

        }


        // ==================================================
        // SAVE INVESTMENTS
        // ==================================================

        allInvestments =
            Array.isArray(
                data.investments
            )
                ? data.investments
                : [];


        // ==================================================
        // UPDATE SUMMARY
        // ==================================================

        updatePortfolioSummary(
            allInvestments
        );


        // ==================================================
        // RENDER
        // ==================================================

        renderFilteredInvestments();

    }

    catch (error) {

        console.error(
            "MY INVESTMENTS ERROR:",
            error
        );


        container.innerHTML = `

            <div class="empty-state">

                <i
                    class="fa-solid fa-wifi"
                ></i>

                <h3>
                    Connection Error
                </h3>

                <p>
                    Unable to connect to the investment server.
                    Please try again.
                </p>

            </div>

        `;


        updateInvestmentCount(0);

    }

}


// ======================================================
// LOADING STATE
// ======================================================

function showLoadingState(
    container
) {

    container.innerHTML = `

        <div class="loading-card">

            <div class="loader"></div>

            <strong>
                Loading investments
            </strong>

            <span>
                Please wait...
            </span>

        </div>

    `;

}


// ======================================================
// FILTER
// ======================================================

function setInvestmentFilter(
    filter
) {

    currentFilter =
        filter;


    document
        .querySelectorAll(
            ".filter-button"
        )
        .forEach(
            function (button) {

                button.classList.remove(
                    "active"
                );

            }
        );


    const activeButton =
        document.querySelector(
            `.filter-button[data-filter="${filter}"]`
        );


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }


    renderFilteredInvestments();

}


// ======================================================
// GET FILTERED INVESTMENTS
// ======================================================

function getFilteredInvestments() {

    if (
        currentFilter === "active"
    ) {

        return allInvestments.filter(
            function (investment) {

                return isActiveInvestment(
                    investment
                );

            }
        );

    }


    if (
        currentFilter === "completed"
    ) {

        return allInvestments.filter(
            function (investment) {

                return isCompletedInvestment(
                    investment
                );

            }
        );

    }


    return allInvestments;

}


// ======================================================
// ACTIVE CHECK
// ======================================================

function isActiveInvestment(
    investment
) {

    const status =
        String(
            investment?.status || ""
        )
        .toLowerCase()
        .trim();


    return (
        status === "running" ||
        status === "active" ||
        status === "in_progress" ||
        status === "in progress"
    );

}


// ======================================================
// COMPLETED CHECK
// ======================================================

function isCompletedInvestment(
    investment
) {

    const status =
        String(
            investment?.status || ""
        )
        .toLowerCase()
        .trim();


    return (
        status === "completed" ||
        status === "complete" ||
        status === "finished"
    );

}


// ======================================================
// RENDER FILTERED
// ======================================================

function renderFilteredInvestments() {

    const investments =
        getFilteredInvestments();


    renderMyInvestments(
        investments
    );


    updateInvestmentCount(
        investments.length
    );

}


// ======================================================
// RENDER INVESTMENTS
// ======================================================

function renderMyInvestments(
    investments
) {

    const container =
        document.getElementById(
            "investmentsContainer"
        );


    if (!container) {

        return;

    }


    if (
        !investments.length
    ) {

        let message =
            "Choose an investment plan to get started.";


        if (
            currentFilter === "active"
        ) {

            message =
                "You currently have no active investments.";

        }


        if (
            currentFilter === "completed"
        ) {

            message =
                "You currently have no completed investments.";

        }


        container.innerHTML = `

            <div class="empty-state">

                <i
                    class="fa-solid fa-chart-line"
                ></i>

                <h3>
                    No Investments Found
                </h3>

                <p>
                    ${escapeHTML(message)}
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        investments
            .map(
                function (
                    investment,
                    index
                ) {

                    return createInvestmentCard(
                        investment,
                        index
                    );

                }
            )
            .join("");


    // Animate progress

    requestAnimationFrame(
        function () {

            setTimeout(
                function () {

                    container
                        .querySelectorAll(
                            ".progress-fill"
                        )
                        .forEach(
                            function (bar) {

                                bar.style.width =
                                    `${bar.dataset.width || 0}%`;

                            }
                        );

                },
                100
            );

        }
    );

}


// ======================================================
// CREATE INVESTMENT CARD
// ======================================================

function createInvestmentCard(
    investment,
    index
) {

    const planName =
        getFirstValue(
            investment,
            [
                "planName",
                "name",
                "investmentPlan"
            ],
            "Investment Plan"
        );


    const amount =
        getNumberValue(
            investment,
            [
                "amount",
                "investedAmount",
                "investmentAmount",
                "principal"
            ]
        );


    // IMPORTANT:
    // Backend uses "earned"

    const earned =
        getNumberValue(
            investment,
            [
                "earned",
                "profit",
                "profitAmount",
                "totalProfit",
                "earning",
                "earnings"
            ]
        );


    const dailyIncome =
        getNumberValue(
            investment,
            [
                "dailyIncome"
            ]
        );


    const totalIncome =
        getNumberValue(
            investment,
            [
                "totalIncome"
            ]
        );


    const remainingDays =
        getNumberValue(
            investment,
            [
                "remainingDays"
            ]
        );


    const duration =
        getNumberValue(
            investment,
            [
                "duration",
                "days"
            ]
        );


    const status =
        normalizeStatus(
            investment.status
        );


    const startDate =
        getDateValue(
            investment,
            [
                "purchaseDate",
                "startDate",
                "createdAt",
                "investmentDate",
                "date"
            ]
        );


    const completedDate =
        getDateValue(
            investment,
            [
                "completedDate",
                "completedAt"
            ]
        );


    const progress =
        calculateInvestmentProgress(
            investment
        );


    const statusClass =
        getStatusClass(
            status
        );


    const delay =
        Math.min(
            index * 0.08,
            0.5
        );


    const nextIncomeText =
        getNextIncomeText(
            investment
        );


    return `

        <article
            class="investment-card"
            style="animation-delay:${delay}s"
        >

            <!-- =====================================
                 TOP
            ====================================== -->

            <div class="investment-top">

                <div class="investment-title">

                    <h3>
                        ${escapeHTML(planName)}
                    </h3>

                    <span>
                        Investment Portfolio
                    </span>

                </div>


                <span
                    class="investment-status ${statusClass}"
                >

                    <i
                        class="${getStatusIcon(status)}"
                    ></i>

                    ${escapeHTML(
                        formatStatus(status)
                    )}

                </span>

            </div>


            <!-- =====================================
                 MAIN MONEY DETAILS
            ====================================== -->

            <div class="investment-details">

                <div class="investment-detail">

                    <span>
                        Invested
                    </span>

                    <strong>
                        ${formatCurrency(amount)}
                    </strong>

                </div>


                <div class="investment-detail">

                    <span>
                        Daily Income
                    </span>

                    <strong class="daily-income">

                        +${formatCurrency(
                            dailyIncome
                        )}

                    </strong>

                </div>


                <div class="investment-detail">

                    <span>
                        Total Earned
                    </span>

                    <strong class="investment-profit">

                        +${formatCurrency(
                            earned
                        )}

                    </strong>

                </div>


                <div class="investment-detail">

                    <span>
                        Total Income
                    </span>

                    <strong>
                        ${formatCurrency(
                            totalIncome
                        )}
                    </strong>

                </div>

            </div>


            <!-- =====================================
                 NEXT INCOME
            ====================================== -->

            ${
                isActiveInvestment(investment)
                    ? `

                <div class="next-income-box">

                    <div class="next-income-icon">

                        <i
                            class="fa-solid fa-clock"
                        ></i>

                    </div>


                    <div class="next-income-content">

                        <span>
                            Next Income
                        </span>

                        <strong
                            class="income-countdown"
                            data-investment-id="${investment._id || investment.id || ""}"
                            data-purchase-date="${escapeHTML(
                                investment.purchaseDate || ""
                            )}"
                            data-last-income-date="${escapeHTML(
                                investment.lastIncomeDate || ""
                            )}"
                        >
                            ${escapeHTML(
                                nextIncomeText
                            )}
                        </strong>

                    </div>


                    <div class="next-income-amount">

                        <span>
                            Daily
                        </span>

                        <strong>
                            +${formatCurrency(
                                dailyIncome
                            )}
                        </strong>

                    </div>

                </div>

            `
                    : `
                
                <div class="completed-income-box">

                    <i
                        class="fa-solid fa-circle-check"
                    ></i>

                    <span>
                        Investment completed
                    </span>

                </div>

            `
            }


            <!-- =====================================
                 DAYS
            ====================================== -->

            <div class="investment-days">

                <div class="days-item">

                    <span>
                        Duration
                    </span>

                    <strong>
                        ${duration} Days
                    </strong>

                </div>


                <div class="days-item">

                    <span>
                        Remaining
                    </span>

                    <strong>
                        ${remainingDays} Days
                    </strong>

                </div>


                <div class="days-item">

                    <span>
                        Progress
                    </span>

                    <strong>
                        ${progress}%
                    </strong>

                </div>

            </div>


            <!-- =====================================
                 PROGRESS
            ====================================== -->

            <div class="investment-progress">

                <div class="progress-header">

                    <span>
                        Investment Progress
                    </span>

                    <strong>
                        ${progress}%
                    </strong>

                </div>


                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        data-width="${progress}"
                    ></div>

                </div>

            </div>


            <!-- =====================================
                 FOOTER
            ====================================== -->

            <div class="investment-footer">

                <span>

                    <i
                        class="fa-regular fa-calendar"
                    ></i>

                    ${
                        startDate
                            ? `Started ${startDate}`
                            : "Start date unavailable"
                    }

                </span>


                <strong>

                    ${
                        completedDate
                            ? `Completed ${completedDate}`
                            : isActiveInvestment(investment)
                                ? "Running"
                                : "Completed"
                    }

                </strong>

            </div>

        </article>

    `;

}


// ======================================================
// NEXT INCOME TEXT
// ======================================================

function getNextIncomeText(
    investment
) {

    if (
        !isActiveInvestment(
            investment
        )
    ) {

        return "Completed";

    }


    const purchaseDate =
        investment.purchaseDate
            ? new Date(
                investment.purchaseDate
            )
            : null;


    const lastIncomeDate =
        investment.lastIncomeDate
            ? new Date(
                investment.lastIncomeDate
            )
            : null;


    const baseDate =
        lastIncomeDate &&
        !Number.isNaN(
            lastIncomeDate.getTime()
        )
            ? lastIncomeDate
            : purchaseDate;


    if (
        !baseDate ||
        Number.isNaN(
            baseDate.getTime()
        )
    ) {

        return "Calculating...";

    }


    const nextIncome =
        new Date(
            baseDate.getTime() +
            24 * 60 * 60 * 1000
        );


    const difference =
        nextIncome.getTime() -
        Date.now();


    if (
        difference <= 0
    ) {

        return "Income due";

    }


    return formatCountdown(
        difference
    );

}


// ======================================================
// COUNTDOWN TIMER
// ======================================================

function startCountdownTimer() {

    if (
        countdownInterval
    ) {

        clearInterval(
            countdownInterval
        );

    }


    countdownInterval =
        setInterval(
            function () {

                updateCountdowns();

            },
            1000
        );


    updateCountdowns();

}


// ======================================================
// UPDATE COUNTDOWNS
// ======================================================

function updateCountdowns() {

    document
        .querySelectorAll(
            ".income-countdown"
        )
        .forEach(
            function (element) {

                const purchaseDate =
                    element.dataset.purchaseDate;


                const lastIncomeDate =
                    element.dataset.lastIncomeDate;


                const baseDate =
                    lastIncomeDate
                        ? new Date(
                            lastIncomeDate
                        )
                        : new Date(
                            purchaseDate
                        );


                if (
                    Number.isNaN(
                        baseDate.getTime()
                    )
                ) {

                    element.textContent =
                        "Calculating...";

                    return;

                }


                const nextIncome =
                    baseDate.getTime() +
                    (
                        24 *
                        60 *
                        60 *
                        1000
                    );


                const difference =
                    nextIncome -
                    Date.now();


                if (
                    difference <= 0
                ) {

                    element.textContent =
                        "Income due";

                    return;

                }


                element.textContent =
                    formatCountdown(
                        difference
                    );

            }
        );

}


// ======================================================
// FORMAT COUNTDOWN
// ======================================================

function formatCountdown(
    milliseconds
) {

    let seconds =
        Math.floor(
            milliseconds / 1000
        );


    const days =
        Math.floor(
            seconds / 86400
        );


    seconds %= 86400;


    const hours =
        Math.floor(
            seconds / 3600
        );


    seconds %= 3600;


    const minutes =
        Math.floor(
            seconds / 60
        );


    seconds %= 60;


    return (
        `${String(days).padStart(2, "0")}d ` +
        `${String(hours).padStart(2, "0")}h ` +
        `${String(minutes).padStart(2, "0")}m ` +
        `${String(seconds).padStart(2, "0")}s`
    );

}


// ======================================================
// PORTFOLIO SUMMARY
// ======================================================

function updatePortfolioSummary(
    investments
) {

    const totalInvested =
        investments.reduce(
            function (
                total,
                investment
            ) {

                return (
                    total +
                    getNumberValue(
                        investment,
                        [
                            "amount",
                            "investedAmount",
                            "investmentAmount",
                            "principal"
                        ]
                    )
                );

            },
            0
        );


    const totalEarned =
        investments.reduce(
            function (
                total,
                investment
            ) {

                return (
                    total +
                    getNumberValue(
                        investment,
                        [
                            "earned",
                            "profit",
                            "profitAmount",
                            "totalProfit",
                            "earning",
                            "earnings"
                        ]
                    )
                );

            },
            0
        );


    const activeCount =
        investments.filter(
            isActiveInvestment
        ).length;


    const completedCount =
        investments.filter(
            isCompletedInvestment
        ).length;


    setElementText(
        "totalInvested",
        formatCurrency(
            totalInvested
        )
    );


    setElementText(
        "totalProfit",
        `+${formatCurrency(
            totalEarned
        )}`
    );


    setElementText(
        "activeInvestments",
        activeCount
    );


    setElementText(
        "completedInvestments",
        completedCount
    );

}


// ======================================================
// COUNT
// ======================================================

function updateInvestmentCount(
    count
) {

    const element =
        document.getElementById(
            "investmentCount"
        );


    if (!element) {

        return;

    }


    element.textContent =
        count === 0
            ? "No investments found"
            : `${count} investment${
                count === 1
                    ? ""
                    : "s"
            }`;

}


// ======================================================
// REFRESH
// ======================================================

async function refreshInvestments() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    if (button) {

        button.classList.add(
            "rotating"
        );

        button.disabled = true;

    }


    try {

        await loadMyInvestments();


        showNotification(
            "Investments refreshed successfully.",
            true
        );

    }

    finally {

        if (button) {

            setTimeout(
                function () {

                    button.classList.remove(
                        "rotating"
                    );

                    button.disabled = false;

                },
                500
            );

        }

    }

}


// ======================================================
// BACK
// ======================================================

function goBack() {

    if (
        window.history.length > 1
    ) {

        window.history.back();

    }

    else {

        window.location.href =
            "home.html";

    }

}


// ======================================================
// NAVIGATION
// ======================================================

function goTo(
    page
) {

    if (!page) {

        return;

    }


    window.location.href =
        page;

}


// ======================================================
// GET FIRST VALUE
// ======================================================

function getFirstValue(
    object,
    keys,
    fallback = ""
) {

    if (!object) {

        return fallback;

    }


    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const value =
            object[
                keys[i]
            ];


        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            if (
                typeof value ===
                "object"
            ) {

                if (
                    value.name
                ) {

                    return value.name;

                }


                if (
                    value.title
                ) {

                    return value.title;

                }

            }


            return String(
                value
            );

        }

    }


    return fallback;

}


// ======================================================
// NUMBER VALUE
// ======================================================

function getNumberValue(
    object,
    keys
) {

    if (!object) {

        return 0;

    }


    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const value =
            object[
                keys[i]
            ];


        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(
                    value
                );


            if (
                Number.isFinite(
                    number
                )
            ) {

                return number;

            }

        }

    }


    return 0;

}


// ======================================================
// FORMAT CURRENCY
// ======================================================

function formatCurrency(
    amount
) {

    const number =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "₹0.00";

    }


    return (
        "₹" +
        number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        )
    );

}


// ======================================================
// NORMALIZE STATUS
// ======================================================

function normalizeStatus(
    status
) {

    if (!status) {

        return "pending";

    }


    return String(
        status
    )
    .toLowerCase()
    .trim()
    .replace(
        /-/g,
        "_"
    );

}


// ======================================================
// FORMAT STATUS
// ======================================================

function formatStatus(
    status
) {

    const map = {

        active:
            "Active",

        running:
            "Active",

        in_progress:
            "Active",

        "in progress":
            "Active",

        completed:
            "Completed",

        complete:
            "Completed",

        finished:
            "Completed",

        pending:
            "Pending",

        cancelled:
            "Cancelled",

        canceled:
            "Cancelled"

    };


    return (
        map[status] ||
        status
            .replace(
                /_/g,
                " "
            )
            .replace(
                /\b\w/g,
                function (
                    char
                ) {

                    return char.toUpperCase();

                }
            )
    );

}


// ======================================================
// STATUS CLASS
// ======================================================

function getStatusClass(
    status
) {

    if (
        status === "active" ||
        status === "running" ||
        status === "in_progress" ||
        status === "in progress"
    ) {

        return "active";

    }


    if (
        status === "completed" ||
        status === "complete" ||
        status === "finished"
    ) {

        return "completed";

    }


    if (
        status === "cancelled" ||
        status === "canceled"
    ) {

        return "cancelled";

    }


    return "pending";

}


// ======================================================
// STATUS ICON
// ======================================================

function getStatusIcon(
    status
) {

    if (
        status === "active" ||
        status === "running" ||
        status === "in_progress" ||
        status === "in progress"
    ) {

        return "fa-solid fa-bolt";

    }


    if (
        status === "completed" ||
        status === "complete" ||
        status === "finished"
    ) {

        return "fa-solid fa-circle-check";

    }


    if (
        status === "cancelled" ||
        status === "canceled"
    ) {

        return "fa-solid fa-circle-xmark";

    }


    return "fa-solid fa-clock";

}


// ======================================================
// CALCULATE PROGRESS
// ======================================================

function calculateInvestmentProgress(
    investment
) {

    const status =
        normalizeStatus(
            investment.status
        );


    if (
        status === "completed" ||
        status === "complete" ||
        status === "finished"
    ) {

        return 100;

    }


    const duration =
        Number(
            investment.duration ||
            investment.days ||
            0
        );


    const remainingDays =
        Number(
            investment.remainingDays ||
            0
        );


    if (
        duration > 0
    ) {

        const completedDays =
            Math.max(
                0,
                duration -
                remainingDays
            );


        return Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    (
                        completedDays /
                        duration
                    ) *
                    100
                )
            )
        );

    }


    return 0;

}


// ======================================================
// GET RAW DATE
// ======================================================

function getRawDate(
    object,
    keys
) {

    if (!object) {

        return null;

    }


    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const value =
            object[
                keys[i]
            ];


        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            return value;

        }

    }


    return null;

}


// ======================================================
// GET DATE
// ======================================================

function getDateValue(
    object,
    keys
) {

    const value =
        getRawDate(
            object,
            keys
        );


    if (!value) {

        return "";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


// ======================================================
// SET ELEMENT TEXT
// ======================================================

function setElementText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            String(
                value
            );

    }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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