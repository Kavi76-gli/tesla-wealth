// =====================================================
// BITCOIN INVESTMENT PAGE
// =====================================================

// =====================================================
// API
// =====================================================

const API_URL =
    "https://bitcoin-m7kz.onrender.com/api";


// =====================================================
// TOKEN
// =====================================================

const token =
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// =====================================================
// LOGIN CHECK
// =====================================================

if (!token) {

    window.location.href =
        "auth.html";

}


// =====================================================
// GLOBAL DATA
// =====================================================

let plans = [];

let selectedPlan = null;

let selectedCategory = "normal";

let currentUser = {};

let currentDashboard = {};


// IMPORTANT:
// Keep the current investments globally available
// so countdowns can read the backend data.

window.currentInvestments = [];


// =====================================================
// DOM ELEMENTS
// =====================================================

const plansContainer =
    document.getElementById(
        "plansContainer"
    );

const myInvestments =
    document.getElementById(
        "myInvestments"
    );

const purchaseModal =
    document.getElementById(
        "purchaseModal"
    );


// =====================================================
// API FETCH
// =====================================================

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


        // =================================================
        // SESSION EXPIRED
        // =================================================

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


        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.msg ||
                "Request failed."
            );

        }


        return data;


    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        throw error;

    }

}


// =====================================================
// MONEY FORMAT
// =====================================================

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


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
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


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


// =====================================================
// GET PLAN IMAGE
// =====================================================

function getPlanImage(
    plan
) {

    return (
        plan.image ||
        plan.imageUrl ||
        "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=900&q=80"
    );

}


// =====================================================
// LOAD DASHBOARD
// =====================================================

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/investment/dashboard"
            );


        if (!data) {

            return;

        }


        currentDashboard =
            data.dashboard ||
            data.data?.dashboard ||
            data.data ||
            {};


        currentUser =
            data.user ||
            data.data?.user ||
            currentUser ||
            {};


        renderDashboard();


    } catch (error) {

        console.error(
            "DASHBOARD:",
            error.message
        );

    }

}


// =====================================================
// RENDER DASHBOARD
// =====================================================

function renderDashboard() {

    const dashboard =
        currentDashboard || {};


    const user =
        currentUser || {};


    // =================================================
    // WALLET
    // =================================================

    const wallet =
        dashboard.wallet ??
        dashboard.balance ??
        user.wallet ??
        user.balance ??
        0;


    // =================================================
    // ACTIVE PLANS
    // =================================================

    const activePlans =
        dashboard.activePlans ??
        dashboard.activeInvestments ??
        dashboard.activePlansCount ??
        0;


    // =================================================
    // DAILY INCOME
    // =================================================

    const dailyIncome =
        dashboard.dailyIncome ??
        dashboard.dailyYield ??
        dashboard.dailyEarning ??
        0;


    // =================================================
    // TOTAL INVESTMENT
    // =================================================

    const totalInvestment =
        dashboard.totalInvestment ??
        dashboard.totalInvested ??
        dashboard.investedAmount ??
        0;


    // =================================================
    // REAL TOTAL EARNED
    // =================================================

    const totalEarned =
        dashboard.totalEarned ??
        dashboard.totalEarning ??
        dashboard.earnings ??
        dashboard.totalIncome ??
        0;


    setText(
        "walletBalance",
        money(wallet)
    );


    setText(
        "activePlans",
        activePlans
    );


    setText(
        "dailyIncome",
        money(dailyIncome)
    );


    setText(
        "totalInvestment",
        money(totalInvestment)
    );


    setText(
        "totalEarned",
        money(totalEarned)
    );

}



// =====================================================
// LOAD ALL PLANS
// =====================================================

let plansRequestId = 0;

async function loadPlans() {

    if (!plansContainer) {
        console.error("plansContainer not found.");
        return;
    }

    const requestId = ++plansRequestId;


    // =================================================
    // SHOW LOADING
    // =================================================

    plansContainer.innerHTML = `
        <div class="loading-card">
            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                Loading investment options...
            </span>
        </div>
    `;


    try {

        console.log("Loading all investment plans...");


        // =================================================
        // API REQUEST
        // =================================================

        const data = await apiFetch("/plans");

        console.log("Plans API response:", data);


        // =================================================
        // PREVENT OLD REQUEST FROM OVERWRITING NEW DATA
        // =================================================

        if (requestId !== plansRequestId) {
            return;
        }


        // =================================================
        // CHECK RESPONSE
        // =================================================

        if (!data) {

            plans = [];

            renderNoPlans();

            return;
        }


        // =================================================
        // SUPPORT DIFFERENT API RESPONSE STRUCTURES
        // =================================================

        let receivedPlans = [];


        // Direct array
        if (Array.isArray(data)) {

            receivedPlans = data;

        }


        // { plans: [] }
        else if (Array.isArray(data.plans)) {

            receivedPlans = data.plans;

        }


        // { data: { plans: [] } }
        else if (
            data.data &&
            Array.isArray(data.data.plans)
        ) {

            receivedPlans = data.data.plans;

        }


        // { data: [] }
        else if (
            data.data &&
            Array.isArray(data.data)
        ) {

            receivedPlans = data.data;

        }


        // =================================================
        // SAVE ALL PLANS
        // =================================================

        plans = receivedPlans;


        console.log(
            "All plans loaded:",
            plans
        );

        console.log(
            "Total plans:",
            plans.length
        );


        // =================================================
        // NO PLANS
        // =================================================

        if (plans.length === 0) {

            renderNoPlans();

            return;
        }


        // =================================================
        // SORT PLANS BY INVESTMENT
        // LOWEST → HIGHEST
        // =================================================

        plans.sort((a, b) => {

            const investmentA = Number(
                a?.price ??
                a?.amount ??
                a?.investment ??
                0
            );


            const investmentB = Number(
                b?.price ??
                b?.amount ??
                b?.investment ??
                0
            );


            return investmentA - investmentB;

        });


        // =================================================
        // DEBUG SORTED PLANS
        // =================================================

        console.log(
            "Plans sorted by investment:"
        );


        plans.forEach((plan, index) => {

            const investment = Number(
                plan?.price ??
                plan?.amount ??
                plan?.investment ??
                0
            );


            console.log(
                `${index + 1}. ${plan?.name || "Plan"} - ₹${investment}`
            );

        });


        // =================================================
        // RENDER ALL PLANS
        // =================================================

        renderPlans(plans);


    } catch (error) {

        // =================================================
        // PLAN LOAD ERROR
        // =================================================

        console.error(
            "PLANS LOAD ERROR:",
            error
        );


        // =================================================
        // PREVENT OLD REQUEST FROM SHOWING ERROR
        // =================================================

        if (requestId !== plansRequestId) {
            return;
        }


        plans = [];


        // =================================================
        // ERROR MESSAGE
        // =================================================

        plansContainer.innerHTML = `

            <div class="loading-card">

                <i class="fa-solid fa-circle-exclamation"></i>

                <span>
                    ${escapeHtml(
                        error?.message ||
                        "Unable to load investment plans."
                    )}
                </span>

            </div>

        `;

    }

}



// =====================================================
// NO PLANS MESSAGE
// =====================================================

function renderNoPlans() {

    if (!plansContainer) {
        return;
    }


    plansContainer.innerHTML = `

        <div class="loading-card">

            <i class="fa-solid fa-box-open"></i>

            <span>
                No investment plans are currently available.
            </span>

        </div>

    `;

}



// =====================================================
// RENDER ALL PLANS
// =====================================================

function renderPlans(planList) {

    if (!plansContainer) {
        return;
    }


    // =================================================
    // CHECK PLAN LIST
    // =================================================

    if (
        !Array.isArray(planList) ||
        planList.length === 0
    ) {

        renderNoPlans();

        return;
    }


    // =================================================
    // RENDER EVERY PLAN
    // =================================================

    plansContainer.innerHTML = planList
        .map((plan, index) => {


            // =========================================
            // PRICE / INVESTMENT
            // =========================================

            const price = Number(
                plan?.price ??
                plan?.amount ??
                plan?.investment ??
                0
            );


            // =========================================
            // DAILY INCOME
            // =========================================

            const daily = Number(
                plan?.dailyIncome ??
                plan?.dailyYield ??
                plan?.dailyEarning ??
                0
            );


            // =========================================
            // DURATION
            // =========================================

            const days = Number(
                plan?.days ??
                plan?.duration ??
                0
            );


            // =========================================
            // TOTAL INCOME
            // =========================================

            const backendTotal = Number(
                plan?.totalIncome ??
                plan?.totalEarning ??
                0
            );


            const total =
                backendTotal > 0
                    ? backendTotal
                    : daily * days;


            // =========================================
            // PLAN NAME
            // =========================================

            const name = String(
                plan?.name ||
                "Bitcoin Investment"
            );


            // =========================================
            // PLAN DESCRIPTION
            // =========================================

            const description = String(
                plan?.description ||
                "Bitcoin investment option."
            );


            // =========================================
            // PLAN IMAGE
            // =========================================

            const image = getPlanImage(plan);


            // =========================================
            // RETURN PERCENTAGE
            // =========================================

            const returnPercent =
                price > 0
                    ? (
                        (
                            (total - price) /
                            price
                        ) * 100
                    ).toFixed(1)
                    : "0.0";


            // =========================================
            // PLAN ID
            // =========================================

            const planId = String(
                plan?._id || ""
            );


            // =========================================
            // PLAN CARD
            // =========================================

            return `

                <article
                    class="plan-card"
                    style="
                        animation-delay:${index * 0.07}s;
                    "
                >

                    <!-- PLAN IMAGE -->

                    <div class="plan-image">

                        <img
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(name)}"
                            loading="lazy"

                            onerror="
                                this.onerror=null;
                                this.style.display='none';
                            "
                        >

                    </div>


                    <!-- PLAN CONTENT -->

                    <div class="plan-content">


                        <!-- PLAN NAME -->

                        <h3>
                            ${escapeHtml(name)}
                        </h3>


                        <!-- PLAN DESCRIPTION -->

                        <p class="plan-description">
                            ${escapeHtml(description)}
                        </p>


                        <!-- PLAN DETAILS -->

                        <div class="plan-details">


                            <!-- INVESTMENT -->

                            <div
                                class="
                                    plan-detail
                                    investment-highlight
                                "
                            >

                                <span>
                                    Investment
                                </span>

                                <strong>
                                    ${money(price)}
                                </strong>

                            </div>


                            <!-- DAILY INCOME -->

                            <div class="plan-detail">

                                <span>
                                    Daily Income
                                </span>

                                <strong>
                                    ${money(daily)}
                                </strong>

                            </div>


                            <!-- DURATION -->

                            <div class="plan-detail">

                                <span>
                                    Duration
                                </span>

                                <strong>
                                    ${days} Days
                                </strong>

                            </div>


                            <!-- TOTAL INCOME -->

                            <div
                                class="
                                    plan-detail
                                    total-income-detail
                                "
                            >

                                <span>
                                    Total Income
                                </span>

                                <strong>
                                    ${money(total)}
                                </strong>

                            </div>


                            <!-- RETURN -->

                            <div
                                class="
                                    plan-detail
                                    return-detail
                                "
                            >

                                <span>
                                    Return
                                </span>

                                <strong>
                                    +${returnPercent}%
                                </strong>

                            </div>


                        </div>


                        <!-- INVEST BUTTON -->

                        <button
                            class="plan-button"
                            type="button"
                            ${!planId ? "disabled" : ""}
                            onclick="
                                openPurchaseModal(
                                    '${escapeHtml(planId)}'
                                )
                            "
                        >

                            <i
                                class="
                                    fa-brands
                                    fa-bitcoin
                                "
                            ></i>

                            Invest Now

                        </button>


                    </div>

                </article>

            `;

        })
        .join("");

}

// =====================================================
// OPEN PURCHASE MODAL
// =====================================================

function openPurchaseModal(
    planId
) {

    if (!purchaseModal) {

        return;

    }


    selectedPlan =
        plans.find(
            plan =>
                String(
                    plan._id
                ) ===
                String(
                    planId
                )
        );


    if (!selectedPlan) {

        alert(
            "Investment option not found."
        );

        return;

    }


    const price =
        Number(
            selectedPlan.price ??
            selectedPlan.amount ??
            selectedPlan.investment ??
            0
        );


    const daily =
        Number(
            selectedPlan.dailyIncome ??
            selectedPlan.dailyYield ??
            selectedPlan.dailyEarning ??
            0
        );


    const days =
        Number(
            selectedPlan.days ??
            selectedPlan.duration ??
            0
        );


    const total =
        Number(
            selectedPlan.totalIncome ??
            selectedPlan.totalEarning ??
            daily * days
        );


    setText(
        "modalPlanName",
        selectedPlan.name ||
        "Bitcoin Investment"
    );


    setText(
        "modalAmount",
        money(price)
    );


    setText(
        "modalDaily",
        money(daily)
    );


    setText(
        "modalDuration",
        `${days} Days`
    );


    setText(
        "modalTotal",
        money(total)
    );


    purchaseModal.classList.add(
        "show"
    );

}


// =====================================================
// CLOSE PURCHASE MODAL
// =====================================================

function closePurchaseModal() {

    if (!purchaseModal) {

        return;

    }


    purchaseModal.classList.remove(
        "show"
    );


    selectedPlan =
        null;

}


// =====================================================
// CONFIRM PURCHASE
// =====================================================

async function confirmPurchase() {

    if (!selectedPlan) {

        alert(
            "Please select an investment option."
        );

        return;

    }


    const button =
        document.getElementById(
            "confirmPurchase"
        );


    if (!button) {

        return;

    }


    button.disabled =
        true;


    button.innerHTML = `

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        Processing...

    `;


    try {

        const data =
            await apiFetch(
                "/investment/purchase",
                {

                    method: "POST",

                    body:
                        JSON.stringify({

                            planId:
                                selectedPlan._id

                        })

                }
            );


        if (!data) {

            return;

        }


        if (!data.success) {

            throw new Error(
                data.message ||
                data.msg ||
                "Investment purchase failed."
            );

        }


        closePurchaseModal();


        alert(
            data.message ||
            "Bitcoin investment purchased successfully."
        );


        // Refresh all real backend data

        await Promise.all([

            loadDashboard(),

            loadPlans(),

            loadMyInvestments()

        ]);


    } catch (error) {

        console.error(
            "PURCHASE:",
            error
        );


        alert(
            error.message ||
            "Investment purchase failed."
        );


    } finally {

        button.disabled =
            false;


        button.innerHTML = `

            <i
                class="fa-brands fa-bitcoin"
            ></i>

            Confirm Investment

        `;

    }

}


// =====================================================
// LOAD MY INVESTMENTS
// =====================================================

async function loadMyInvestments() {

    if (!myInvestments) {

        return;

    }


    myInvestments.innerHTML = `

        <div class="loading-card">

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            <span>
                Loading portfolio...
            </span>

        </div>

    `;


    try {

        const data =
            await apiFetch(
                "/investment/my"
            );


        if (!data) {

            return;

        }


        const investments =
            data.investments ||
            data.data?.investments ||
            data.data ||
            [];


        if (
            !Array.isArray(
                investments
            ) ||
            investments.length === 0
        ) {

            window.currentInvestments =
                [];

            renderEmptyInvestments();

            return;

        }


        // =================================================
        // IMPORTANT
        //
        // Store backend investments globally.
        // Countdown functions use this array.
        // =================================================

        window.currentInvestments =
            investments;


        renderMyInvestments(
            investments
        );


        updateIncomeCountdowns();


    } catch (error) {

        console.error(
            "MY INVESTMENTS:",
            error.message
        );


        window.currentInvestments =
            [];


        renderEmptyInvestments();

    }

}


// =====================================================
// EMPTY INVESTMENTS
// =====================================================

function renderEmptyInvestments() {

    if (!myInvestments) {

        return;

    }


    myInvestments.innerHTML = `

        <div class="empty-card">

            <i
                class="fa-brands fa-bitcoin"
            ></i>

            <p>
                You don't have any active
                Bitcoin investments yet.
            </p>

        </div>

    `;

}


// =====================================================
// RENDER MY INVESTMENTS
// =====================================================

function renderMyInvestments(
    investments
) {

    if (!myInvestments) {

        return;

    }


    if (
        !Array.isArray(
            investments
        ) ||
        investments.length === 0
    ) {

        renderEmptyInvestments();

        return;

    }


    myInvestments.innerHTML =
        investments
            .map(
                (
                    investment,
                    index
                ) => {


                    // =====================================
                    // PLAN
                    // =====================================

                    const plan =
                        investment.plan ||
                        {};


                    // =====================================
                    // NAME
                    // =====================================

                    const name =
                        investment.planName ||
                        investment.name ||
                        plan.name ||
                        "Bitcoin Investment";


                    // =====================================
                    // INVESTMENT AMOUNT
                    // =====================================

                    const amount =
                        Number(
                            investment.amount ??
                            investment.investmentAmount ??
                            investment.investedAmount ??
                            investment.price ??
                            plan.price ??
                            0
                        );


                    // =====================================
                    // DAILY INCOME
                    // =====================================

                    const daily =
                        Number(
                            investment.dailyIncome ??
                            investment.dailyYield ??
                            investment.dailyEarning ??
                            plan.dailyIncome ??
                            0
                        );


                    // =====================================
                    // REAL EARNED
                    //
                    // IMPORTANT:
                    // This comes from backend.
                    //
                    // We DO NOT calculate:
                    //
                    // daily × days
                    //
                    // for "earned".
                    // =====================================

                    const earned =
                        Number(
                            investment.earned ??
                            investment.totalEarned ??
                            investment.profit ??
                            investment.profitAmount ??
                            investment.income ??
                            0
                        );


                    // =====================================
                    // TOTAL INCOME
                    // =====================================

                    const totalIncome =
                        Number(
                            investment.totalIncome ??
                            investment.totalEarning ??
                            investment.expectedIncome ??
                            plan.totalIncome ??
                            0
                        );


                    // =====================================
                    // DURATION
                    // =====================================

                    const duration =
                        Number(
                            investment.duration ??
                            investment.days ??
                            plan.duration ??
                            plan.days ??
                            0
                        );


                    // =====================================
                    // REMAINING DAYS
                    // =====================================

                    const remainingDays =
                        Number(
                            investment.remainingDays ??
                            0
                        );


                    // =====================================
                    // STATUS
                    // =====================================

                    const rawStatus =
                        String(
                            investment.status ||
                            "Active"
                        );


                    const status =
                        rawStatus
                            .charAt(0)
                            .toUpperCase() +
                        rawStatus
                            .slice(1)
                            .toLowerCase();


                    const isActive =
                        status === "Active" ||
                        status === "Running";


                    // =====================================
                    // START DATE
                    // =====================================

                    const startDate =
                        investment.purchaseDate ||
                        investment.startDate ||
                        investment.createdAt ||
                        "";


                    const formattedDate =
                        formatInvestmentDate(
                            startDate
                        );


                    // =====================================
                    // PROGRESS
                    // =====================================

                    let progress = 0;


                    if (
                        duration > 0
                    ) {

                        const completedDays =
                            Math.max(
                                0,
                                duration -
                                remainingDays
                            );


                        progress =
                            Math.round(
                                (
                                    completedDays /
                                    duration
                                ) *
                                100
                            );

                    }


                    progress =
                        Math.max(
                            0,
                            Math.min(
                                100,
                                progress
                            )
                        );


                    // =====================================
                    // INVESTMENT ID
                    // =====================================

                    const investmentId =
                        investment._id ||
                        investment.id ||
                        "";


                    // =====================================
                    // NEXT INCOME
                    // =====================================

                    const nextIncome =
                        getNextIncomeDisplay(
                            investment
                        );


                    // =====================================
                    // STATUS CLASS
                    // =====================================

                    const statusClass =
                        isActive
                            ? "status-active"
                            : "status-completed";


                    // =====================================
                    // CARD
                    // =====================================

                    return `

                        <article
                            class="my-investment-card"
                            data-investment-id="${escapeHtml(
                                investmentId
                            )}"
                            style="
                                animation-delay:
                                ${Math.min(
                                    index * 0.08,
                                    0.5
                                )}s
                            "
                        >

                            <!-- =========================
                                 HEADER
                            ========================== -->

                            <div
                                class="investment-top"
                            >

                                <div
                                    class="investment-name"
                                >

                                    <div
                                        class="investment-logo"
                                    >

                                        <i
                                            class="
                                                fa-brands
                                                fa-bitcoin
                                            "
                                        ></i>

                                    </div>


                                    <div>

                                        <strong>
                                            ${escapeHtml(
                                                name
                                            )}
                                        </strong>

                                        <span>
                                            Bitcoin Investment
                                        </span>

                                    </div>

                                </div>


                                <span
                                    class="
                                        investment-status
                                        ${statusClass}
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            ${
                                                isActive
                                                    ? "fa-bolt"
                                                    : "fa-circle-check"
                                            }
                                        "
                                    ></i>

                                    ${escapeHtml(
                                        status
                                    )}

                                </span>

                            </div>


                            <!-- =========================
                                 MONEY
                            ========================== -->

                            <div
                                class="investment-stats"
                            >


                                <div
                                    class="investment-stat"
                                >

                                    <span>
                                        Invested
                                    </span>

                                    <strong>
                                        ${money(amount)}
                                    </strong>

                                </div>


                                <div
                                    class="investment-stat"
                                >

                                    <span>
                                        Daily Income
                                    </span>

                                    <strong
                                        class="income-value"
                                    >
                                        +${money(daily)}
                                    </strong>

                                </div>


                                <div
                                    class="
                                        investment-stat
                                        earned-stat
                                    "
                                >

                                    <span>
                                        Earned
                                    </span>

                                    <strong>
                                        +${money(earned)}
                                    </strong>

                                </div>


                                <div
                                    class="investment-stat"
                                >

                                    <span>
                                        Total Income
                                    </span>

                                    <strong>
                                        ${money(totalIncome)}
                                    </strong>

                                </div>

                            </div>


                            <!-- =========================
                                 NEXT INCOME
                            ========================== -->

                            ${
                                isActive
                                    ? `

                                <div
                                    class="next-income-box"
                                >

                                    <div
                                        class="
                                            next-income-icon
                                        "
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-clock
                                            "
                                        ></i>

                                    </div>


                                    <div
                                        class="
                                            next-income-content
                                        "
                                    >

                                        <span>
                                            Next Income
                                        </span>


                                        <strong
                                            class="
                                                income-countdown
                                            "
                                            data-investment-id="${escapeHtml(
                                                investmentId
                                            )}"
                                        >
                                            ${escapeHtml(
                                                nextIncome
                                            )}
                                        </strong>

                                    </div>


                                    <div
                                        class="
                                            next-income-amount
                                        "
                                    >

                                        <span>
                                            Daily
                                        </span>

                                        <strong>
                                            +${money(daily)}
                                        </strong>

                                    </div>

                                </div>

                            `
                                    : `

                                <div
                                    class="
                                        completed-income-box
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-circle-check
                                        "
                                    ></i>

                                    <span>
                                        Investment completed
                                    </span>

                                </div>

                            `
                            }


                            <!-- =========================
                                 DAYS
                            ========================== -->

                            <div
                                class="investment-days"
                            >

                                <div
                                    class="days-item"
                                >

                                    <span>
                                        Duration
                                    </span>

                                    <strong>
                                        ${duration} Days
                                    </strong>

                                </div>


                                <div
                                    class="days-item"
                                >

                                    <span>
                                        Remaining
                                    </span>

                                    <strong>
                                        ${remainingDays} Days
                                    </strong>

                                </div>


                                <div
                                    class="days-item"
                                >

                                    <span>
                                        Progress
                                    </span>

                                    <strong>
                                        ${progress}%
                                    </strong>

                                </div>

                            </div>


                            <!-- =========================
                                 PROGRESS
                            ========================== -->

                            <div
                                class="investment-progress"
                            >

                                <div
                                    class="progress-header"
                                >

                                    <span>
                                        Investment Progress
                                    </span>

                                    <strong>
                                        ${progress}%
                                    </strong>

                                </div>


                                <div
                                    class="progress-bar"
                                >

                                    <div
                                        class="progress-fill"
                                        style="
                                            width:${progress}%
                                        "
                                    ></div>

                                </div>

                            </div>


                            <!-- =========================
                                 FOOTER
                            ========================== -->

                            <div
                                class="investment-footer"
                            >

                                <span>

                                    <i
                                        class="
                                            fa-regular
                                            fa-calendar
                                        "
                                    ></i>

                                    ${
                                        formattedDate
                                            ? `Started ${formattedDate}`
                                            : "Start date unavailable"
                                    }

                                </span>


                                <strong>

                                    ${
                                        isActive
                                            ? "Running"
                                            : "Completed"
                                    }

                                </strong>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


// =====================================================
// FORMAT INVESTMENT DATE
// =====================================================

function formatInvestmentDate(
    dateValue
) {

    if (!dateValue) {

        return "";

    }


    const date =
        new Date(
            dateValue
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
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =====================================================
// NEXT INCOME DISPLAY
// =====================================================

function getNextIncomeDisplay(
    investment
) {

    if (!investment) {

        return "Income schedule unavailable";

    }


    // =================================================
    // BACKEND NEXT-INCOME DATE
    // =================================================

    const nextIncomeDate =
        investment.nextIncomeDate ||
        investment.nextIncomeAt ||
        investment.nextIncome ||
        "";


    if (!nextIncomeDate) {

        return "Next income pending";

    }


    const target =
        new Date(
            nextIncomeDate
        );


    if (
        Number.isNaN(
            target.getTime()
        )
    ) {

        return "Next income pending";

    }


    const now =
        new Date();


    const difference =
        target.getTime() -
        now.getTime();


    // =================================================
    // INCOME IS DUE
    //
    // Do not credit it here.
    // Backend should process the income.
    // =================================================

    if (
        difference <= 0
    ) {

        return "Income processing";

    }


    const totalSeconds =
        Math.floor(
            difference / 1000
        );


    const days =
        Math.floor(
            totalSeconds /
            86400
        );


    const hours =
        Math.floor(
            (
                totalSeconds %
                86400
            ) / 3600
        );


    const minutes =
        Math.floor(
            (
                totalSeconds %
                3600
            ) / 60
        );


    const seconds =
        totalSeconds %
        60;


    if (days > 0) {

        return (
            `${days}d ` +
            `${String(hours).padStart(2, "0")}h ` +
            `${String(minutes).padStart(2, "0")}m`
        );

    }


    return (
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`
    );

}


// =====================================================
// UPDATE INCOME COUNTDOWNS
// =====================================================

function updateIncomeCountdowns() {

    const countdowns =
        document.querySelectorAll(
            ".income-countdown"
        );


    countdowns.forEach(
        element => {

            const investmentId =
                element.dataset.investmentId;


            if (!investmentId) {

                return;

            }


            const investment =
                window.currentInvestments.find(
                    item =>
                        String(
                            item._id ||
                            item.id
                        ) ===
                        String(
                            investmentId
                        )
                );


            if (!investment) {

                return;

            }


            element.textContent =
                getNextIncomeDisplay(
                    investment
                );

        }
    );

}


// =====================================================
// COUNTDOWN TIMER
// =====================================================

setInterval(
    updateIncomeCountdowns,
    1000
);


// =====================================================
// NAVIGATION
// =====================================================

function navigate(
    page
) {

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


        case "profile":

            window.location.href =
                "profile.html";

            break;


        case "transactions":

            window.location.href =
                "transactions.html";

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

    }

}


// =====================================================
// REFRESH BUTTON
// =====================================================

document
    .getElementById(
        "refreshButton"
    )
    ?.addEventListener(
        "click",
        async function() {

            this.classList.add(
                "rotating"
            );


            try {

                await Promise.all([

                    loadDashboard(),

                    loadPlans(),

                    loadMyInvestments()

                ]);

            } finally {

                setTimeout(
                    () => {

                        this.classList.remove(
                            "rotating"
                        );

                    },
                    500
                );

            }

        }
    );


// =====================================================
// CLOSE MODAL BUTTON
// =====================================================

document
    .getElementById(
        "closeModal"
    )
    ?.addEventListener(
        "click",
        closePurchaseModal
    );


// =====================================================
// CLOSE MODAL OUTSIDE
// =====================================================

purchaseModal
    ?.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                purchaseModal
            ) {

                closePurchaseModal();

            }

        }
    );


// =====================================================
// CONFIRM BUTTON
// =====================================================

document
    .getElementById(
        "confirmPurchase"
    )
    ?.addEventListener(
        "click",
        confirmPurchase
    );


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "BITCOIN INVESTMENT PAGE STARTING..."
        );


        await loadDashboard();


        await loadPlans();


        await loadMyInvestments();


        console.log(
            "BITCOIN INVESTMENT PAGE READY"
        );

    }
);
// =====================================================
// CATEGORY TABS
// =====================================================

document
    .querySelectorAll(
        ".category-tab"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function() {

                // ==========================================
                // REMOVE ACTIVE
                // ==========================================

                document
                    .querySelectorAll(
                        ".category-tab"
                    )
                    .forEach(tab => {

                        tab.classList.remove(
                            "active"
                        );

                    });


                // ==========================================
                // ADD ACTIVE
                // ==========================================

                this.classList.add(
                    "active"
                );


                // ==========================================
                // SELECT CATEGORY
                // ==========================================

                selectedCategory =
                    this.dataset.category;


                // ==========================================
                // FILTER PLANS
                // ==========================================

                const filteredPlans =
                    getPlansByCategory(
                        selectedCategory
                    );


                renderPlans(
                    filteredPlans
                );

            }
        );

    });