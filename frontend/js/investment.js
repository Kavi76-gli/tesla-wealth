"use strict";

/* ============================================================
   TESLA WEALTH — INVESTMENT PAGE
   File: frontend/js/investment.js

   API ENDPOINTS:
   GET  /investment/dashboard
   GET  /investment/plans
   POST /investment/purchase
   GET  /investment/my

   FINANCIAL RULES:
   1. balance:
      Total wallet balance.

   2. investableDepositBalance:
      Remaining eligible deposit funds available for investment.

   3. withdrawableEarnings:
      Funds currently eligible for withdrawal.

   SECURITY:
   - Backend remains authoritative for all financial operations.
   - Never trust frontend balances to authorize transactions.
   - Require an authenticated session for investment requests.
============================================================ */


/* ============================================================
   API CONFIGURATION
============================================================ */

// Local development uses localhost.
// Other hosts use the deployed Tesla Wealth API.

const IS_LOCAL_HOST = [
    "localhost",
    "127.0.0.1"
].includes(window.location.hostname);

const API_BASE = IS_LOCAL_HOST
    ? "https://tesla-wealth.onrender.com/api"
    : "https://tesla-wealth.onrender.com/api";


/* ============================================================
   API ROUTES
============================================================ */

const API = Object.freeze({
    dashboard: "/investment/dashboard",
    plans: "/investment/plans",
    purchase: "/investment/purchase",
    investments: "/investment/my"
});


/* ============================================================
   FALLBACK IMAGE
============================================================ */

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80";


/* ============================================================
   APPLICATION STATE
============================================================ */

const state = {
    dashboard: null,
    plans: [],
    investments: [],
    selectedPlan: null,

    loadingPurchase: false,
    sessionExpired: false
};


/* ============================================================
   DOM HELPERS
============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (!element) return;

    element.textContent =
        value === null || value === undefined
            ? ""
            : String(value);
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}


function numeric(value, fallback = 0) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numeric(value));
}


function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


/* ============================================================
   AUTHENTICATION
============================================================ */

function getToken() {
    return (
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        ""
    );
}


function redirectToLogin() {
    if (state.sessionExpired) return;

    state.sessionExpired = true;

    localStorage.removeItem("ki_token");
    localStorage.removeItem("token");

    window.location.href = "auth.html";
}


function requireAuthToken() {
    const token = getToken().trim();

    if (!token) {
        redirectToLogin();
        return null;
    }

    return token;
}


/* ============================================================
   NOTIFICATIONS
============================================================ */

function showMessage(message, type = "info") {
    const region = getElement("toastRegion");

    if (!region) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = String(message);

    region.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 4500);
}


function showModalError(message) {
    const element = getElement("modalError");

    if (!element) {
        showMessage(message, "error");
        return;
    }

    element.textContent = String(message);
    element.classList.remove("hidden");
}


function clearModalError() {
    const element = getElement("modalError");

    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
}


/* ============================================================
   API REQUEST HELPER
============================================================ */

async function apiRequest(path, options = {}) {
    if (state.sessionExpired) {
        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    const token = getToken();

    if (!token) {
        redirectToLogin();

        throw new Error("Please log in to continue.");
    }

    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    headers.Authorization = `Bearer ${token}`;

    if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error(
            "Unable to connect to Tesla Wealth. " +
            "Check that the backend is running and try again."
        );
    }

    if (response.status === 401) {
        redirectToLogin();

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(
            result.message ||
            result.error ||
            `Request failed with status ${response.status}.`
        );
    }

    if (result && result.success === false) {
        throw new Error(
            result.message ||
            "The request could not be completed."
        );
    }

    return result;
}


/* ============================================================
   RESPONSE HELPERS
============================================================ */

function unwrapObject(result, possibleKeys = []) {
    if (!result || typeof result !== "object") {
        return {};
    }

    for (const key of possibleKeys) {
        const value = result[key];

        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            return value;
        }
    }

    return result;
}


function unwrapArray(result, possibleKeys = []) {
    if (Array.isArray(result)) {
        return result;
    }

    if (!result || typeof result !== "object") {
        return [];
    }

    for (const key of possibleKeys) {
        if (Array.isArray(result[key])) {
            return result[key];
        }
    }

    return [];
}


/* ============================================================
   PLAN HELPERS
============================================================ */

function getPlanId(plan) {
    return String(
        plan?._id ||
        plan?.id ||
        plan?.planId ||
        ""
    );
}


function getPlanName(plan) {
    return String(
        plan?.name ||
        plan?.planName ||
        plan?.title ||
        "Investment Plan"
    );
}


function getPlanPrice(plan) {
    return numeric(
        plan?.price ??
        plan?.amount ??
        plan?.investment ??
        plan?.minInvestment,
        NaN
    );
}


function getPlanDailyIncome(plan) {
    return numeric(
        plan?.dailyIncome ??
        plan?.dailyEarning ??
        plan?.dailyReturn ??
        plan?.dailyProfit,
        0
    );
}


function getPlanDuration(plan) {
    return numeric(
        plan?.duration ??
        plan?.durationDays ??
        plan?.days,
        0
    );
}


function getPlanTotalIncome(plan) {
    const configuredTotal =
        plan?.totalIncome ??
        plan?.totalReturn ??
        plan?.totalEarning;

    if (
        configuredTotal !== undefined &&
        configuredTotal !== null
    ) {
        return numeric(configuredTotal, 0);
    }

    return getPlanDailyIncome(plan) * getPlanDuration(plan);
}


function getPlanDescription(plan) {
    return String(
        plan?.description ||
        plan?.details ||
        "Review the plan terms before making an investment."
    );
}


function getPlanImage(plan) {
    const candidate = String(
        plan?.image ||
        plan?.imageUrl ||
        plan?.photo ||
        ""
    ).trim();

    if (!candidate) {
        return FALLBACK_IMAGE;
    }

    try {
        const url = new URL(candidate, window.location.href);

        if (
            url.protocol === "https:" ||
            (
                url.origin === window.location.origin &&
                candidate.startsWith("/") &&
                !candidate.startsWith("//")
            )
        ) {
            return url.href;
        }
    } catch {
        // Invalid URL: use the fallback image.
    }

    return FALLBACK_IMAGE;
}


function isPlanAvailable(plan) {
    const status = String(
        plan?.status || ""
    ).toLowerCase();

    return Boolean(
        getPlanId(plan) &&
        Number.isFinite(getPlanPrice(plan)) &&
        getPlanPrice(plan) > 0 &&
        plan?.isActive !== false &&
        plan?.active !== false &&
        plan?.enabled !== false &&
        status !== "inactive" &&
        status !== "disabled" &&
        status !== "unavailable"
    );
}


/* ============================================================
   DASHBOARD
============================================================ */

async function loadDashboard() {
    if (!requireAuthToken()) return;

    try {
        const result = await apiRequest(API.dashboard);

        const source =
            result.dashboard ||
            result.data?.dashboard ||
            {};

        const user =
            result.user ||
            result.data?.user ||
            {};

        /*
         * Normalize the wallet field names returned by the API.
         * The backend must provide the authoritative balances.
         */

        const walletBalance = numeric(
            source.walletBalance ??
            source.wallet ??
            source.balance ??
            user.balance,
            0
        );

        const investableDepositBalance = numeric(
            source.investableDepositBalance ??
            user.investableDepositBalance,
            0
        );

        const withdrawableEarnings = numeric(
            source.withdrawableEarnings ??
            user.withdrawableEarnings,
            0
        );

        /*
         * Save normalized values for purchase validation.
         * These frontend values are not transaction authorization.
         */

        state.dashboard = {
            ...source,

            wallet: walletBalance,
            balance: walletBalance,
            walletBalance,

            investableDepositBalance,
            withdrawableEarnings
        };


        /* ----------------------------------------------------
           CARD 1 — TOTAL WALLET BALANCE
        ---------------------------------------------------- */

        [
            "walletBalance",
            "wallet",
            "balance"
        ].forEach(id => {
            const element = getElement(id);

            if (element) {
                element.textContent = formatMoney(
                    walletBalance
                );
            }
        });


        /* ----------------------------------------------------
           CARD 2 — REMAINING DEPOSIT BALANCE
        ---------------------------------------------------- */

        [
            "investableBalance",
            "availableInvestmentBalance"
        ].forEach(id => {
            const element = getElement(id);

            if (element) {
                element.textContent = formatMoney(
                    investableDepositBalance
                );
            }
        });


        /* ----------------------------------------------------
           CARD 3 — AVAILABLE FOR WITHDRAWAL
        ---------------------------------------------------- */

        [
            "withdrawableEarnings",
            "withdrawableBalance"
        ].forEach(id => {
            const element = getElement(id);

            if (element) {
                element.textContent = formatMoney(
                    withdrawableEarnings
                );
            }
        });


        /* ----------------------------------------------------
           OPTIONAL DASHBOARD STATISTICS
        ---------------------------------------------------- */

        setText(
            "activePlans",
            source.activePlans ??
            source.activeInvestments ??
            0
        );

        setText(
            "totalInvestment",
            formatMoney(source.totalInvestment ?? 0)
        );

        setText(
            "dailyIncome",
            formatMoney(source.dailyIncome ?? 0)
        );

        setText(
            "totalEarned",
            formatMoney(source.totalEarned ?? 0)
        );


        const errorElement = getElement("dashboardError");

        if (errorElement) {
            errorElement.textContent = "";
            errorElement.classList.add("hidden");
        }

        console.log(
            "Tesla Wealth dashboard loaded successfully."
        );

        return state.dashboard;

    } catch (error) {
        console.error(
            "Dashboard loading error:",
            error
        );

        if (!state.sessionExpired) {
            const messageElement =
                getElement("dashboardError");

            if (messageElement) {
                messageElement.textContent =
                    error.message ||
                    "Unable to load dashboard.";

                messageElement.classList.remove("hidden");
            }
        }

        throw error;
    }
}


/* ============================================================
   LOAD INVESTMENT PLANS
============================================================ */

async function loadPlans() {
    const result = await apiRequest(API.plans);

    const plans = unwrapArray(result, [
        "plans",
        "data",
        "results"
    ]);

    state.plans = plans;

    renderPlans();

    return state.plans;
}


/* ============================================================
   PLAN SORTING
============================================================ */

function getSortedFilteredPlans() {
    const searchTerm = (
        getElement("planSearch")?.value || ""
    ).trim().toLowerCase();

    const sortMode =
        getElement("planSort")?.value || "low";

    const plans = state.plans.filter(plan => {
        const searchableText = [
            getPlanName(plan),
            getPlanDescription(plan)
        ].join(" ").toLowerCase();

        return searchableText.includes(searchTerm);
    });

    if (sortMode === "high") {
        plans.sort(
            (a, b) => getPlanPrice(b) - getPlanPrice(a)
        );

    } else if (sortMode === "name") {
        plans.sort(
            (a, b) =>
                getPlanName(a).localeCompare(
                    getPlanName(b)
                )
        );

    } else {
        plans.sort(
            (a, b) => getPlanPrice(a) - getPlanPrice(b)
        );
    }

    return plans;
}


/* ============================================================
   PLAN RENDERING
============================================================ */

function renderPlans() {
    const container = getElement("plansContainer");

    if (!container) return;

    const plans = getSortedFilteredPlans();

    const emptyElement = getElement("plansEmpty");

    if (!plans.length) {
        container.replaceChildren();

        if (emptyElement) {
            emptyElement.classList.remove("hidden");
        }

        return;
    }

    if (emptyElement) {
        emptyElement.classList.add("hidden");
    }

    container.innerHTML = plans.map(plan => {
        const id = getPlanId(plan);
        const name = getPlanName(plan);
        const description = getPlanDescription(plan);
        const price = getPlanPrice(plan);
        const daily = getPlanDailyIncome(plan);
        const duration = getPlanDuration(plan);
        const total = getPlanTotalIncome(plan);
        const image = getPlanImage(plan);
        const available = isPlanAvailable(plan);

        return `
            <article class="plan-card">

                <div class="plan-card-top">

                    <div class="plan-image">
                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(name)}"
                            loading="lazy"
                            referrerpolicy="no-referrer"
                        >
                    </div>

                    <span class="plan-tag ${
                        available ? "" : "unavailable"
                    }">
                        ${
                            available
                                ? "Investment Plan"
                                : "Unavailable"
                        }
                    </span>

                </div>

                <h3>${escapeHTML(name)}</h3>

                <p class="plan-description">
                    ${escapeHTML(description)}
                </p>

                <span class="price-caption">
                    Investment amount
                </span>

                <div class="plan-price">
                    ${
                        Number.isFinite(price)
                            ? formatMoney(price)
                            : "—"
                    }
                </div>

                <div class="plan-metrics">

                    <div>
                        <small>Listed daily income</small>
                        <strong>${formatMoney(daily)}</strong>
                    </div>

                    <div>
                        <small>Duration</small>
                        <strong>${duration} days</strong>
                    </div>

                </div>

                <div class="plan-total">
                    <span>Listed total income</span>
                    <strong>${formatMoney(total)}</strong>
                </div>

                <p class="plan-disclaimer">
                    Listed figures are estimates, not guaranteed returns.
                </p>

                <button
                    type="button"
                    class="button button-primary plan-buy"
                    data-plan-id="${escapeHTML(id)}"
                    ${available ? "" : "disabled"}
                >
                    ${
                        available
                            ? "Review & Invest"
                            : "Unavailable"
                    }

                    ${available ? "<span>→</span>" : ""}
                </button>

            </article>
        `;
    }).join("");


    /*
     * If an image fails, use a safe fallback image.
     */

    container.querySelectorAll("img").forEach(imageElement => {
        imageElement.addEventListener("error", () => {
            imageElement.src = FALLBACK_IMAGE;
        }, { once: true });
    });
}


/* ============================================================
   PURCHASE ELIGIBILITY
============================================================ */

function validateInvestmentBalance(plan) {
    if (!state.dashboard) {
        return (
            "Your account balance is not loaded. " +
            "Please try again."
        );
    }

    if (!isPlanAvailable(plan)) {
        return "This investment plan is currently unavailable.";
    }

    const price = getPlanPrice(plan);

    if (!Number.isFinite(price) || price <= 0) {
        return "This plan has an invalid investment amount.";
    }

    if (
        state.dashboard.investmentPurchaseEnabled === false
    ) {
        return (
            "Investment purchases are temporarily disabled."
        );
    }

    const walletBalance = numeric(
        state.dashboard.walletBalance,
        0
    );

    const eligibleBalance = numeric(
        state.dashboard.investableDepositBalance,
        0
    );

    if (eligibleBalance < price) {
        return (
            `You need ${formatMoney(price)} in eligible ` +
            `deposit funds. Your current eligible balance is ` +
            `${formatMoney(eligibleBalance)}.`
        );
    }

    if (walletBalance < price) {
        return (
            "Your wallet balance is insufficient for this purchase. " +
            `Required: ${formatMoney(price)}.`
        );
    }

    return "";
}


/* ============================================================
   PURCHASE MODAL
============================================================ */

function openPurchaseModal(planId) {
    if (state.loadingPurchase) return;

    const plan = state.plans.find(
        item => getPlanId(item) === String(planId)
    );

    if (!plan) {
        showMessage(
            "Investment plan not found. Refresh and try again.",
            "error"
        );

        return;
    }

    const validationError =
        validateInvestmentBalance(plan);

    if (validationError) {
        showMessage(validationError, "warning");
        return;
    }

    const modal = getElement("purchaseModal");

    if (!modal) {
        showMessage(
            "The purchase confirmation dialog is unavailable.",
            "error"
        );

        return;
    }

    state.selectedPlan = plan;

    setText(
        "modalPlanName",
        getPlanName(plan)
    );

    setText(
        "modalPlanDescription",
        getPlanDescription(plan)
    );

    setText(
        "modalAmount",
        formatMoney(getPlanPrice(plan))
    );

    setText(
        "modalDaily",
        formatMoney(getPlanDailyIncome(plan))
    );

    setText(
        "modalDuration",
        `${getPlanDuration(plan)} days`
    );

    setText(
        "modalTotal",
        formatMoney(getPlanTotalIncome(plan))
    );


    /*
     * This percentage describes listed total income relative
     * to principal. It is not a guarantee of future returns.
     */

    const price = getPlanPrice(plan);

    const totalIncome = getPlanTotalIncome(plan);

    const incomePercentage = price > 0
        ? (totalIncome / price) * 100
        : 0;

    setText(
        "modalReturn",
        `${incomePercentage.toFixed(2)}%`
    );

    setText(
        "modalEligibleBalance",
        formatMoney(
            state.dashboard.investableDepositBalance
        )
    );

    clearModalError();

    const confirmButton =
        getElement("confirmPurchase");

    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm purchase";
    }

    modal.classList.remove("hidden");

    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    getElement("closeModal")?.focus();
}


function closePurchaseModal() {
    if (state.loadingPurchase) return;

    const modal = getElement("purchaseModal");

    if (modal) {
        modal.classList.add("hidden");

        modal.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove("modal-open");

    state.selectedPlan = null;
}


/* ============================================================
   CONFIRM PURCHASE
============================================================ */

async function confirmPurchase() {
    if (state.loadingPurchase) return;

    const plan = state.selectedPlan;

    if (!plan) {
        showMessage(
            "Please select an investment plan first.",
            "warning"
        );

        return;
    }

    const confirmButton =
        getElement("confirmPurchase");

    state.loadingPurchase = true;

    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.textContent = "Processing...";
    }

    clearModalError();

    try {
        /*
         * Refresh the displayed balance before submitting.
         *
         * The backend must independently validate and deduct
         * balances atomically. Frontend validation alone is
         * never sufficient to authorize a financial transaction.
         */

        await loadDashboard();

        const validationError =
            validateInvestmentBalance(plan);

        if (validationError) {
            throw new Error(validationError);
        }

        const result = await apiRequest(
            API.purchase,
            {
                method: "POST",

                body: JSON.stringify({
                    planId: getPlanId(plan)
                })
            }
        );

        const responseData = unwrapObject(
            result,
            ["data"]
        );

        const requestStatus = String(
            responseData.status ||
            result.status ||
            ""
        ).toLowerCase();

        const pendingStatuses = [
            "pending",
            "processing",
            "awaiting_approval"
        ];

        if (
            pendingStatuses.includes(requestStatus) ||
            responseData.approvalRequired === true ||
            result.approvalRequired === true
        ) {
            showMessage(
                result.message ||
                "Your investment request was submitted and is awaiting confirmation.",
                "info"
            );

        } else {
            showMessage(
                result.message ||
                "The server accepted your investment request.",
                "success"
            );
        }

        closePurchaseModal();

        await refreshInvestmentPage();

    } catch (error) {
        console.error(
            "Tesla Wealth purchase error:",
            error
        );

        showModalError(
            error.message ||
            "Unable to submit the investment request. Please try again."
        );

    } finally {
        state.loadingPurchase = false;

        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = "Confirm purchase";
        }
    }
}


/* ============================================================
   MY INVESTMENTS
============================================================ */

function getInvestmentStatus(investment) {
    return String(
        investment?.status ||
        investment?.state ||
        "unknown"
    ).toLowerCase();
}


function normalizeStatus(status) {
    const aliases = {
        running: "active",
        approved: "active",
        finished: "completed",
        complete: "completed",
        awaiting_approval: "pending",
        cancelled: "cancelled",
        canceled: "cancelled"
    };

    const normalized = aliases[status] || status;

    const allowed = [
        "active",
        "completed",
        "pending",
        "processing",
        "rejected",
        "cancelled",
        "failed",
        "unknown"
    ];

    return allowed.includes(normalized)
        ? normalized
        : "unknown";
}


async function loadMyInvestments() {
    const result = await apiRequest(API.investments);

    state.investments = unwrapArray(result, [
        "investments",
        "data",
        "results"
    ]);

    renderMyInvestments();

    return state.investments;
}


function renderMyInvestments() {
    const container = getElement("myInvestments");

    if (!container) return;

    const emptyElement =
        getElement("investmentsEmpty");

    if (!state.investments.length) {
        container.replaceChildren();

        if (emptyElement) {
            emptyElement.classList.remove("hidden");
        }

        return;
    }

    if (emptyElement) {
        emptyElement.classList.add("hidden");
    }

    container.innerHTML = state.investments.map(investment => {
        const planName =
            investment.planName ||
            investment.name ||
            investment.plan?.name ||
            "Investment Plan";

        const amount = numeric(
            investment.amount ??
            investment.investmentAmount,
            0
        );

        const earned = numeric(
            investment.earned ??
            investment.totalEarned,
            0
        );

        const remainingDays = numeric(
            investment.remainingDays ??
            investment.daysRemaining,
            0
        );

        const status = normalizeStatus(
            getInvestmentStatus(investment)
        );

        const purchaseDate = formatDate(
            investment.purchaseDate ||
            investment.createdAt
        );

        return `
            <article class="investment-row">

                <div class="investment-title">

                    <div
                        class="investment-symbol"
                        aria-hidden="true"
                    >TW</div>

                    <div>
                        <strong>
                            ${escapeHTML(planName)}
                        </strong>

                        <small>
                            Started ${escapeHTML(purchaseDate)}
                        </small>
                    </div>

                </div>

                <div class="investment-field">
                    <span>Invested</span>
                    <strong>${formatMoney(amount)}</strong>
                </div>

                <div class="investment-field">
                    <span>Earned</span>
                    <strong>${formatMoney(earned)}</strong>
                </div>

                <div class="investment-field">
                    <span>Days remaining</span>
                    <strong>${remainingDays}</strong>
                </div>

                <div>
                    <span class="status-pill status-${status}">
                        ${escapeHTML(
                            status.charAt(0).toUpperCase() +
                            status.slice(1)
                        )}
                    </span>
                </div>

            </article>
        `;
    }).join("");
}


/* ============================================================
   PAGE REFRESH
============================================================ */

async function refreshInvestmentPage() {
    const tasks = [
        ["dashboard", loadDashboard],
        ["plans", loadPlans],
        ["investments", loadMyInvestments]
    ];

    const results = await Promise.allSettled(
        tasks.map(([, task]) => task())
    );

    let hasError = false;

    results.forEach((result, index) => {
        if (result.status === "rejected") {
            hasError = true;

            console.error(
                `Tesla Wealth ${tasks[index][0]} error:`,
                result.reason
            );
        }
    });

    if (hasError && !state.sessionExpired) {
        showMessage(
            "Some account information could not be loaded. " +
            "Check your connection and refresh the page.",
            "error"
        );
    }

    setText(
        "lastUpdated",
        new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        })
    );

    setText(
        "currentYear",
        new Date().getFullYear()
    );

    return !hasError;
}


/* ============================================================
   MOBILE SIDEBAR
============================================================ */

function closeSidebar() {
    const sidebar = getElement("sidebar");

    const overlay = getElement("sidebarOverlay");

    const menuButton = getElement("menuButton");

    sidebar?.classList.remove("open");

    overlay?.classList.remove("show");

    menuButton?.setAttribute(
        "aria-expanded",
        "false"
    );
}


function toggleSidebar() {
    const sidebar = getElement("sidebar");

    const overlay = getElement("sidebarOverlay");

    const menuButton = getElement("menuButton");

    if (!sidebar) return;

    const willOpen =
        !sidebar.classList.contains("open");

    sidebar.classList.toggle("open", willOpen);

    overlay?.classList.toggle("show", willOpen);

    menuButton?.setAttribute(
        "aria-expanded",
        String(willOpen)
    );
}


/* ============================================================
   SIGN OUT
============================================================ */

function signOut() {
    localStorage.removeItem("ki_token");

    localStorage.removeItem("token");

    window.location.href = "auth.html";
}


/* ============================================================
   EVENT LISTENERS
============================================================ */

function bindEvents() {
    getElement("plansContainer")?.addEventListener(
        "click",
        event => {
            const button = event.target.closest(
                "[data-plan-id]"
            );

            if (!button || button.disabled) return;

            openPurchaseModal(
                button.dataset.planId
            );
        }
    );


    getElement("planSearch")?.addEventListener(
        "input",
        renderPlans
    );


    getElement("planSort")?.addEventListener(
        "change",
        renderPlans
    );


    getElement("confirmPurchase")?.addEventListener(
        "click",
        confirmPurchase
    );


    getElement("closeModal")?.addEventListener(
        "click",
        closePurchaseModal
    );


    getElement("cancelPurchase")?.addEventListener(
        "click",
        closePurchaseModal
    );


    getElement("purchaseModal")?.addEventListener(
        "click",
        event => {
            if (event.target.id === "purchaseModal") {
                closePurchaseModal();
            }
        }
    );


    getElement("menuButton")?.addEventListener(
        "click",
        toggleSidebar
    );


    getElement("sidebarOverlay")?.addEventListener(
        "click",
        closeSidebar
    );


    getElement("logoutButton")?.addEventListener(
        "click",
        signOut
    );


    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeSidebar();
                closePurchaseModal();
            }
        }
    );
}


/* ============================================================
   INITIALIZE PAGE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        setText(
            "currentYear",
            new Date().getFullYear()
        );

        if (!getToken()) {
            redirectToLogin();
            return;
        }

        bindEvents();

        await refreshInvestmentPage();
    }
);


/* ============================================================
   DEBUGGING / TESTING
============================================================ */

window.TeslaWealthInvestment = {
    refresh: refreshInvestmentPage,
    loadDashboard,
    loadPlans,
    loadMyInvestments,
    renderPlans,
    renderMyInvestments,
    openPurchaseModal,
    closePurchaseModal,
    confirmPurchase
};