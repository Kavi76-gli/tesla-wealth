// ======================================================
// API
// ======================================================

const API_URL =
    "https://tesla-wealth.onrender.com/api/investment";


// ======================================================
// ADMIN TOKEN
// ======================================================

// ==========================================
// TOKEN
// ==========================================

const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");

// ==========================================
// CHECK LOGIN
// ==========================================

if (!token) {

    alert("Please login first.");

    window.location.href = "../auth.html";

}


// ======================================================
// ELEMENTS
// ======================================================

const table =
    document.getElementById("purchaseTable");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const refreshBtn =
    document.getElementById("refreshBtn");


// ======================================================
// DATA
// ======================================================

let allInvestments = [];


// ======================================================
// LOAD PURCHASE HISTORY
// ======================================================

async function loadPurchaseHistory() {

    table.innerHTML = `

        <tr>

            <td
                colspan="12"
                class="loading"
            >

                Loading purchase history...

            </td>

        </tr>

    `;


    try {

        const response = await fetch(

            `${API_URL}/admin/purchase-history`,

            {

                method: "GET",

                headers: {

                    Authorization:
                        `Bearer ${token}`

                }

            }

        );


        const data =
            await response.json();


        console.log(
            "PURCHASE HISTORY:",
            data
        );


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load purchase history."
            );

        }


        allInvestments =
            data.investments || [];


        updateStats(
            allInvestments
        );


        renderTable(
            allInvestments
        );


    }

    catch (error) {

        console.error(
            "PURCHASE HISTORY ERROR:",
            error
        );


        table.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="error"
                >

                    ${escapeHtml(error.message)}

                </td>

            </tr>

        `;

    }

}


// ======================================================
// UPDATE STATS
// ======================================================

function updateStats(investments) {

    document.getElementById(
        "totalPurchases"
    ).innerText =
        investments.length;


    const total =
        investments.reduce(

            (sum, item) => {

                return sum +
                    Number(item.amount || 0);

            },

            0

        );


    document.getElementById(
        "totalInvested"
    ).innerText =
        formatMoney(total);


    const running =
        investments.filter(

            item =>
                item.status === "Running"

        ).length;


    const completed =
        investments.filter(

            item =>
                item.status === "Completed"

        ).length;


    document.getElementById(
        "runningCount"
    ).innerText =
        running;


    document.getElementById(
        "completedCount"
    ).innerText =
        completed;

}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable(investments) {

    table.innerHTML = "";


    if (!investments.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="empty"
                >

                    No investment purchases found.

                </td>

            </tr>

        `;

        return;

    }


    investments.forEach(
        (item, index) => {

            const user =
                item.user || {};

            const plan =
                item.plan || {};


            const userName =
                user.name ||
                "Unknown User";


            const phone =
                user.phone ||
                "-";


            const planName =
                item.planName ||
                plan.name ||
                "-";


            const amount =
                Number(
                    item.amount || 0
                );


            const dailyIncome =
                Number(
                    item.dailyIncome || 0
                );


            const duration =
                Number(
                    item.duration || 0
                );


            const totalIncome =
                Number(
                    item.totalIncome || 0
                );


            const earned =
                Number(
                    item.earned || 0
                );


            const remaining =
                Number(
                    item.remainingDays || 0
                );


            const date =
                item.purchaseDate
                    ? new Date(
                        item.purchaseDate
                    ).toLocaleString()
                    : "-";


            const status =
                item.status ||
                "Running";


            table.innerHTML += `

                <tr>

                    <td>
                        ${index + 1}
                    </td>


                    <td>

                        <div class="user">

                            <strong>
                                ${escapeHtml(userName)}
                            </strong>

                        </div>

                    </td>


                    <td>
                        ${escapeHtml(phone)}
                    </td>


                    <td>

                        <strong>
                            ${escapeHtml(planName)}
                        </strong>

                    </td>


                    <td class="money">

                        ${formatMoney(amount)}

                    </td>


                    <td class="income">

                        ${formatMoney(dailyIncome)}

                    </td>


                    <td>

                        ${duration} days

                    </td>


                    <td>

                        ${formatMoney(totalIncome)}

                    </td>


                    <td>

                        ${formatMoney(earned)}

                    </td>


                    <td>

                        ${remaining} days

                    </td>


                    <td class="date">

                        ${escapeHtml(date)}

                    </td>


                    <td>

                        <span
                            class="status ${status.toLowerCase()}"
                        >

                            ${escapeHtml(status)}

                        </span>

                    </td>

                </tr>

            `;

        }

    );

}


// ======================================================
// SEARCH + FILTER
// ======================================================

function filterData() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const status =
        statusFilter.value;


    const filtered =
        allInvestments.filter(
            item => {

                const user =
                    item.user || {};

                const plan =
                    item.plan || {};


                const userName =
                    String(
                        user.name || ""
                    ).toLowerCase();


                const phone =
                    String(
                        user.phone || ""
                    ).toLowerCase();


                const planName =
                    String(
                        item.planName ||
                        plan.name ||
                        ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    userName.includes(search) ||
                    phone.includes(search) ||
                    planName.includes(search);


                const matchesStatus =
                    status === "all" ||
                    item.status === status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderTable(filtered);

}


// ======================================================
// MONEY FORMAT
// ======================================================

function formatMoney(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString("en-IN");

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// EVENTS
// ======================================================

searchInput.addEventListener(
    "input",
    filterData
);


statusFilter.addEventListener(
    "change",
    filterData
);


refreshBtn.addEventListener(
    "click",
    loadPurchaseHistory
);


// ======================================================
// START
// ======================================================

loadPurchaseHistory();