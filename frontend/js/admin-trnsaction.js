// ==========================================
// API
// ==========================================

const API_URL =
    "https://tesla-wealth.onrender.com/api/transactions";


// ==========================================
// TOKEN
// ==========================================

const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// ==========================================
// LOGIN
// ==========================================

if (!token) {

    alert("Please login as admin.");

    window.location.href =
        "../auth.html";

}


// ==========================================
// DATA
// ==========================================

let transactions = [];


// ==========================================
// LOAD
// ==========================================

async function loadTransactions() {

    const tbody =
        document.getElementById(
            "transactionTableBody"
        );


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="loading"
            >

                <i
                    class="
                        fa-solid
                        fa-spinner
                        fa-spin
                    "
                ></i>

                Loading transactions...

            </td>

        </tr>

    `;


    try {

        const response =
            await fetch(
                `${API_URL}/admin/all`,
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load transactions."
            );

        }


        transactions =
            data.transactions || [];


        updateStats();

        renderTransactions();


    } catch (error) {

        console.error(error);


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="loading"
                >

                    ❌ ${escapeHTML(
                        error.message
                    )}

                </td>

            </tr>

        `;

    }

}


// ==========================================
// STATS
// ==========================================

function updateStats() {

    let credits = 0;

    let debits = 0;

    let volume = 0;


    transactions.forEach(tx => {

        const amount =
            Number(tx.amount || 0);


        if (amount >= 0) {

            credits++;

        } else {

            debits++;

        }


        volume +=
            Math.abs(amount);

    });


    document.getElementById(
        "totalCount"
    ).textContent =
        transactions.length;


    document.getElementById(
        "creditCount"
    ).textContent =
        credits;


    document.getElementById(
        "debitCount"
    ).textContent =
        debits;


    document.getElementById(
        "volume"
    ).textContent =
        formatMoney(volume);

}


// ==========================================
// RENDER
// ==========================================

function renderTransactions() {

    const tbody =
        document.getElementById(
            "transactionTableBody"
        );


    const search =
        document.getElementById(
            "searchInput"
        ).value
            .trim()
            .toLowerCase();


    const filter =
        document.getElementById(
            "typeFilter"
        ).value;


    const filtered =
        transactions.filter(tx => {

            const amount =
                Number(tx.amount || 0);


            const type =
                amount >= 0
                    ? "Credit"
                    : "Debit";


            const user =
                tx.userId || {};


            const text = `

                ${user.name || ""}

                ${user.phone || ""}

                ${tx.txId || ""}

                ${tx.type || ""}

                ${tx.description || ""}

            `.toLowerCase();


            return (

                (!search ||
                    text.includes(search))

                &&

                (
                    filter === "All" ||
                    filter === type
                )

            );

        });


    document.getElementById(
        "resultCount"
    ).textContent =
        `${filtered.length} transactions`;


    if (filtered.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="loading"
                >

                    No transactions found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        filtered.map(
            (tx, index) => {

                const user =
                    tx.userId || {};


                const userName =
                    user.name ||
                    "Unknown User";


                const phone =
                    user.phone ||
                    "-";


                const amount =
                    Number(
                        tx.amount || 0
                    );


                const credit =
                    amount >= 0;


                const type =
                    credit
                        ? "Credit"
                        : "Debit";


                const typeClass =
                    credit
                        ? "credit"
                        : "debit";


                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>


                        <td>

                            <div
                                class="user-cell"
                            >

                                <div
                                    class="user-avatar"
                                >

                                    ${escapeHTML(
                                        userName
                                            .charAt(0)
                                            .toUpperCase()
                                    )}

                                </div>


                                <div
                                    class="user-info"
                                >

                                    <strong>

                                        ${escapeHTML(
                                            userName
                                        )}

                                    </strong>

                                    <small>

                                        ${escapeHTML(
                                            phone
                                        )}

                                    </small>

                                </div>

                            </div>

                        </td>


                        <td>

                            <strong>

                                ${escapeHTML(
                                    tx.txId || "-"
                                )}

                            </strong>

                        </td>


                        <td>

                            <span
                                class="
                                    type-badge
                                    ${typeClass}
                                "
                            >

                                ${type}

                            </span>

                        </td>


                        <td>

                            <strong
                                class="${typeClass}"
                            >

                                ${credit ? "+" : "-"}

                                ${formatMoney(
                                    Math.abs(amount)
                                )}

                            </strong>

                        </td>


                        <td>

                            ${escapeHTML(
                                tx.description ||
                                tx.type ||
                                "-"
                            )}

                        </td>


                        <td>

                            ${formatDate(
                                tx.createdAt
                            )}

                        </td>


                        <td>

                            <button
                                class="view-btn"
                                onclick="
                                    viewTransaction(
                                        '${tx._id}'
                                    )
                                "
                            >

                                <i
                                    class="
                                        fa-solid
                                        fa-eye
                                    "
                                ></i>

                            </button>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// ==========================================
// VIEW
// ==========================================

async function viewTransaction(id) {

    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        /*
         * The single-transaction endpoint is
         * user-protected, so for admin we can
         * simply use the already-loaded object.
         */

        const tx =
            transactions.find(
                item =>
                    String(item._id) ===
                    String(id)
            );


        if (!tx) {

            throw new Error(
                "Transaction not found."
            );

        }


        const user =
            tx.userId || {};


        const amount =
            Number(tx.amount || 0);


        document.getElementById(
            "modalContent"
        ).innerHTML = `

            <div class="detail-row">

                <span>User</span>

                <strong>

                    ${escapeHTML(
                        user.name ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="detail-row">

                <span>Phone</span>

                <strong>

                    ${escapeHTML(
                        user.phone ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="detail-row">

                <span>Transaction ID</span>

                <strong>

                    ${escapeHTML(
                        tx.txId ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="detail-row">

                <span>Type</span>

                <strong>

                    ${escapeHTML(
                        tx.type ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="detail-row">

                <span>Amount</span>

                <strong>

                    ${amount >= 0 ? "+" : "-"}

                    ${formatMoney(
                        Math.abs(amount)
                    )}

                </strong>

            </div>


            <div class="detail-row">

                <span>Description</span>

                <strong>

                    ${escapeHTML(
                        tx.description ||
                        "-"
                    )}

                </strong>

            </div>


            <div class="detail-row">

                <span>Date</span>

                <strong>

                    ${formatDate(
                        tx.createdAt
                    )}

                </strong>

            </div>

        `;


        document.getElementById(
            "transactionModal"
        ).classList.add("show");


    } catch (error) {

        alert(error.message);

    }

}


// ==========================================
// HELPERS
// ==========================================

function formatMoney(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

}


function formatDate(date) {

    if (!date) return "-";


    return new Date(date)
        .toLocaleString(
            "en-IN",
            {

                day: "2-digit",

                month: "short",

                year: "numeric",

                hour: "2-digit",

                minute: "2-digit"

            }
        );

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==========================================
// EVENTS
// ==========================================

document.getElementById(
    "searchInput"
).addEventListener(
    "input",
    renderTransactions
);


document.getElementById(
    "typeFilter"
).addEventListener(
    "change",
    renderTransactions
);


document.getElementById(
    "refreshBtn"
).addEventListener(
    "click",
    loadTransactions
);


document.getElementById(
    "closeModal"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "transactionModal"
        ).classList.remove("show");

    }
);


document.getElementById(
    "transactionModal"
).addEventListener(
    "click",
    e => {

        if (
            e.target.id ===
            "transactionModal"
        ) {

            e.currentTarget.classList.remove(
                "show"
            );

        }

    }
);


document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    () => {

        if (!confirm("Logout?")) return;

        localStorage.removeItem(
            "adminToken"
        );

        localStorage.removeItem(
            "ki_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

        window.location.href =
            "../auth.html";

    }
);


// ==========================================
// START
// ==========================================

loadTransactions();