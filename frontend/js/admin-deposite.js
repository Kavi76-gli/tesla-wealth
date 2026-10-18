// ==========================================================
// ADMIN DEPOSITS
// ==========================================================

// ==========================================================
// API
// ==========================================================

const API_URL =
    "https://bitcoin-m7kz.onrender.com/api";


// ==========================================================
// TOKEN
// ==========================================================

const adminToken =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// ==========================================================
// LOGIN CHECK
// ==========================================================

if (!adminToken) {

    window.location.href =
        "../auth.html";

}


// ==========================================================
// GLOBAL DATA
// ==========================================================

let allDeposits = [];

let filteredDeposits = [];

let isLoadingDeposits = false;


// ==========================================================
// ESCAPE HTML
// ==========================================================

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


// ==========================================================
// MONEY
// ==========================================================

function formatMoney(value) {

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


// ==========================================================
// API REQUEST
// ==========================================================

async function adminFetch(
    url,
    options = {}
) {

    const response =
        await fetch(
            API_URL + url,
            {

                ...options,

                headers: {

                    ...(options.body instanceof FormData
                        ? {}
                        : {
                            "Content-Type":
                                "application/json"
                        }
                    ),

                    ...(options.headers || {}),

                    Authorization:
                        `Bearer ${adminToken}`

                }

            }
        );


    const data =
        await response
            .json()
            .catch(
                () => ({})
            );


    // ======================================================
    // SESSION EXPIRED
    // ======================================================

    if (
        response.status === 401
    ) {

        localStorage.removeItem(
            "adminToken"
        );

        localStorage.removeItem(
            "ki_token"
        );

        localStorage.removeItem(
            "token"
        );

        alert(
            "Admin session expired. Please login again."
        );

        window.location.href =
            "../auth.html";

        return null;

    }


    // ======================================================
    // FORBIDDEN
    // ======================================================

    if (
        response.status === 403
    ) {

        console.error(
            "ADMIN ACCESS DENIED:",
            data
        );

        alert(
            data.message ||
            data.msg ||
            "Admin access denied."
        );

        return null;

    }


    // ======================================================
    // OTHER ERROR
    // ======================================================

    if (!response.ok) {

        throw new Error(
            data.message ||
            data.msg ||
            "Request failed."
        );

    }


    return data;

}


// ==========================================================
// LOAD ALL DEPOSITS
// ==========================================================

async function loadDeposits() {

    if (isLoadingDeposits) {

        return;

    }

    isLoadingDeposits =
        true;


    showTableLoading();


    try {

        const data =
            await adminFetch(
                "/deposit/admin/all"
            );


        if (!data) {

            return;

        }


        const deposits =
            Array.isArray(
                data.deposits
            )
                ? data.deposits
                : Array.isArray(
                    data.data?.deposits
                )
                    ? data.data.deposits
                    : [];


        allDeposits =
            deposits;


        updateCards(
            allDeposits
        );


        applyFilters();


    }

    catch (error) {

        console.error(
            "LOAD DEPOSITS ERROR:",
            error
        );


        showTableError(
            error.message
        );

    }

    finally {

        isLoadingDeposits =
            false;

    }

}


// ==========================================================
// TABLE LOADING
// ==========================================================

function showTableLoading() {

    const table =
        document.getElementById(
            "depositTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = `

        <tr>

            <td
                colspan="10"
                class="table-loading"
            >

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Loading deposits...

            </td>

        </tr>

    `;

}


// ==========================================================
// TABLE ERROR
// ==========================================================

function showTableError(
    message
) {

    const table =
        document.getElementById(
            "depositTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = `

        <tr>

            <td
                colspan="10"
                class="table-error"
            >

                <i
                    class="fa-solid fa-circle-exclamation"
                ></i>

                ${escapeHtml(
                    message ||
                    "Unable to load deposits."
                )}

            </td>

        </tr>

    `;

}


// ==========================================================
// RENDER TABLE
// ==========================================================

function renderDeposits(
    deposits
) {

    const table =
        document.getElementById(
            "depositTable"
        );


    if (!table) {

        console.warn(
            "depositTable not found."
        );

        return;

    }


    if (
        !Array.isArray(
            deposits
        ) ||
        deposits.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    class="table-empty"
                >

                    <i
                        class="fa-solid fa-receipt"
                    ></i>

                    <span>
                        No deposits found.
                    </span>

                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        deposits
            .map(
                (
                    deposit,
                    index
                ) => {

                    const amount =
                        Number(
                            deposit.amount ||
                            0
                        );


                    const user =
                        deposit.user ||
                        {};


                    const name =
                        user.name ||
                        deposit.userName ||
                        "-";


                    const phone =
                        user.phone ||
                        deposit.phone ||
                        "-";


                    const utr =
                        deposit.utr ||
                        "-";


                    const status =
                        String(
                            deposit.status ||
                            "Pending"
                        );


                    const statusLower =
                        status.toLowerCase();


                    const createdAt =
                        deposit.createdAt
                            ? new Date(
                                deposit.createdAt
                            ).toLocaleString(
                                "en-IN",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            )
                            : "-";


                    const screenshot =
                        deposit.screenshot ||
                        "";


                    const screenshotHtml =
                        screenshot
                            ? `

                                <button
                                    type="button"
                                    class="screenshot-btn"
                                    onclick="viewScreenshot(
                                        '${escapeHtml(screenshot)}'
                                    )"
                                    title="View screenshot"
                                >

                                    <img
                                        src="${escapeHtml(
                                            screenshot
                                        )}"
                                        class="deposit-img"
                                        alt="Payment screenshot"
                                        loading="lazy"
                                        onerror="
                                            this.style.display='none';
                                            this.parentElement.classList.add('image-error');
                                        "
                                    >

                                    <i
                                        class="
                                            fa-solid
                                            fa-expand
                                        "
                                    ></i>

                                </button>

                            `
                            : `

                                <span
                                    class="no-screenshot"
                                >

                                    <i
                                        class="
                                            fa-regular
                                            fa-image
                                        "
                                    ></i>

                                    None

                                </span>

                            `;


                    const actionHtml =
                        statusLower ===
                        "pending"
                            ? `

                                <div
                                    class="deposit-actions"
                                >

                                    <button
                                        type="button"
                                        class="
                                            btn
                                            approve-btn
                                        "
                                        onclick="
                                            approveDeposit(
                                                '${escapeHtml(
                                                    deposit._id ||
                                                    deposit.id ||
                                                    ""
                                                )}',
                                                this
                                            )
                                        "
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-check
                                            "
                                        ></i>

                                        Approve

                                    </button>


                                    <button
                                        type="button"
                                        class="
                                            btn
                                            reject-btn
                                        "
                                        onclick="
                                            rejectDeposit(
                                                '${escapeHtml(
                                                    deposit._id ||
                                                    deposit.id ||
                                                    ""
                                                )}',
                                                this
                                            )
                                        "
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-xmark
                                            "
                                        ></i>

                                        Reject

                                    </button>

                                </div>

                            `
                            : `

                                <span
                                    class="action-completed"
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-circle-check
                                        "
                                    ></i>

                                    Processed

                                </span>

                            `;


                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>

                                <div
                                    class="user-cell"
                                >

                                    <strong>
                                        ${escapeHtml(
                                            name
                                        )}
                                    </strong>

                                </div>

                            </td>


                            <td>

                                <span
                                    class="phone-cell"
                                >
                                    ${escapeHtml(
                                        phone
                                    )}
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="deposit-amount"
                                >
                                    ${formatMoney(
                                        amount
                                    )}
                                </strong>

                            </td>


                            <td>

                                <code
                                    class="utr-code"
                                >
                                    ${escapeHtml(
                                        utr
                                    )}
                                </code>

                            </td>


                            <td>

                                ${screenshotHtml}

                            </td>


                            <td>

                                <span
                                    class="
                                        status
                                        status-${escapeHtml(
                                            statusLower
                                        )}
                                    "
                                >

                                    ${
                                        statusLower ===
                                        "approved"
                                            ? `
                                                <i
                                                    class="
                                                        fa-solid
                                                        fa-check
                                                    "
                                                ></i>
                                            `
                                            : statusLower ===
                                              "rejected"
                                                ? `
                                                    <i
                                                        class="
                                                            fa-solid
                                                            fa-xmark
                                                        "
                                                    ></i>
                                                `
                                                : `
                                                    <i
                                                        class="
                                                            fa-solid
                                                            fa-clock
                                                        "
                                                    ></i>
                                                `
                                    }

                                    ${escapeHtml(
                                        status
                                    )}

                                </span>

                            </td>


                            <td>

                                <span
                                    class="date-cell"
                                >

                                    ${createdAt}

                                </span>

                            </td>


                            <td>

                                ${actionHtml}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


// ==========================================================
// UPDATE STATISTICS
// ==========================================================

function updateCards(
    deposits
) {

    if (
        !Array.isArray(
            deposits
        )
    ) {

        deposits = [];

    }


    const totalAmount =
        deposits.reduce(
            (
                sum,
                item
            ) => {

                return sum +
                    Number(
                        item.amount ||
                        0
                    );

            },
            0
        );


    const pending =
        deposits.filter(
            item =>
                String(
                    item.status
                ).toLowerCase() ===
                "pending"
        ).length;


    const approved =
        deposits.filter(
            item =>
                String(
                    item.status
                ).toLowerCase() ===
                "approved"
        ).length;


    const rejected =
        deposits.filter(
            item =>
                String(
                    item.status
                ).toLowerCase() ===
                "rejected"
        ).length;


    const totalElement =
        document.getElementById(
            "totalDeposit"
        );


    const pendingElement =
        document.getElementById(
            "pendingCount"
        );


    const approvedElement =
        document.getElementById(
            "approvedCount"
        );


    const rejectedElement =
        document.getElementById(
            "rejectedCount"
        );


    if (totalElement) {

        totalElement.innerText =
            formatMoney(
                totalAmount
            );

    }


    if (pendingElement) {

        pendingElement.innerText =
            pending;

    }


    if (approvedElement) {

        approvedElement.innerText =
            approved;

    }


    if (rejectedElement) {

        rejectedElement.innerText =
            rejected;

    }

}


// ==========================================================
// APPLY SEARCH + FILTER
// ==========================================================

function applyFilters() {

    const searchInput =
        document.getElementById(
            "searchDeposit"
        );


    const filterInput =
        document.getElementById(
            "statusFilter"
        );


    const search =
        String(
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        String(
            filterInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    filteredDeposits =
        allDeposits.filter(
            deposit => {

                const user =
                    deposit.user ||
                    {};


                const searchableText =
                    [

                        user.name,

                        user.phone,

                        deposit.amount,

                        deposit.utr,

                        deposit.status,

                        deposit._id

                    ]
                        .filter(
                            value =>
                                value !==
                                undefined &&
                                value !==
                                null
                        )
                        .join(" ")
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const depositStatus =
                    String(
                        deposit.status ||
                        ""
                    ).toLowerCase();


                const matchesStatus =
                    !status ||
                    depositStatus ===
                    status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderDeposits(
        filteredDeposits
    );

}


// ==========================================================
// APPROVE DEPOSIT
// ==========================================================

async function approveDeposit(
    id,
    button
) {

    if (!id) {

        alert(
            "Invalid deposit ID."
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to approve this deposit?"
        );


    if (!confirmed) {

        return;

    }


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
            ></i>

            Processing...

        `;

    }


    try {

        const data =
            await adminFetch(
                `/deposit/admin/approve/${encodeURIComponent(id)}`,
                {
                    method:
                        "PATCH"
                }
            );


        if (!data) {

            return;

        }


        alert(
            data.message ||
            "Deposit approved successfully."
        );


        await loadDeposits();

    }

    catch (error) {

        console.error(
            "APPROVE DEPOSIT ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to approve deposit."
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML = `

                <i
                    class="
                        fa-solid
                        fa-check
                    "
                ></i>

                Approve

            `;

        }

    }

}


// ==========================================================
// REJECT DEPOSIT
// ==========================================================

async function rejectDeposit(
    id,
    button
) {

    if (!id) {

        alert(
            "Invalid deposit ID."
        );

        return;

    }


    const remark =
        prompt(
            "Enter rejection remark:"
        );


    if (
        remark === null
    ) {

        return;

    }


    const cleanRemark =
        remark.trim();


    if (!cleanRemark) {

        alert(
            "Please enter a rejection remark."
        );

        return;

    }


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
            ></i>

            Processing...

        `;

    }


    try {

        const data =
            await adminFetch(
                `/deposit/admin/reject/${encodeURIComponent(id)}`,
                {

                    method:
                        "PATCH",

                    body:
                        JSON.stringify({

                            remark:
                                cleanRemark

                        })

                }
            );


        if (!data) {

            return;

        }


        alert(
            data.message ||
            "Deposit rejected successfully."
        );


        await loadDeposits();

    }

    catch (error) {

        console.error(
            "REJECT DEPOSIT ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to reject deposit."
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML = `

                <i
                    class="
                        fa-solid
                        fa-xmark
                    "
                ></i>

                Reject

            `;

        }

    }

}


// ==========================================================
// VIEW SCREENSHOT
// ==========================================================

function viewScreenshot(
    url
) {

    if (!url) {

        return;

    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


// ==========================================================
// SEARCH
// ==========================================================

function initSearch() {

    const searchInput =
        document.getElementById(
            "searchDeposit"
        );


    if (!searchInput) {

        return;

    }


    searchInput.addEventListener(
        "input",
        applyFilters
    );

}


// ==========================================================
// STATUS FILTER
// ==========================================================

function initStatusFilter() {

    const filter =
        document.getElementById(
            "statusFilter"
        );


    if (!filter) {

        return;

    }


    filter.addEventListener(
        "change",
        applyFilters
    );

}


// ==========================================================
// LOGOUT
// ==========================================================

function initLogout() {

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutButton) {

        return;

    }


    logoutButton.addEventListener(
        "click",
        function() {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {

                return;

            }


            localStorage.removeItem(
                "adminToken"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "ki_token"
            );


            window.location.href =
                "../auth.html";

        }
    );

}


// ==========================================================
// OPTIONAL REFRESH BUTTON
// ==========================================================

function initRefresh() {

    const refreshButton =
        document.getElementById(
            "refreshDeposits"
        );


    if (!refreshButton) {

        return;

    }


    refreshButton.addEventListener(
        "click",
        async function() {

            this.disabled =
                true;


            this.classList.add(
                "rotating"
            );


            try {

                await loadDeposits();

            }

            finally {

                setTimeout(
                    () => {

                        this.disabled =
                            false;

                        this.classList.remove(
                            "rotating"
                        );

                    },
                    400
                );

            }

        }
    );

}


// ==========================================================
// INITIALIZE
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "ADMIN DEPOSITS INITIALIZING..."
        );


        initSearch();

        initStatusFilter();

        initLogout();

        initRefresh();


        loadDeposits();

    }
);