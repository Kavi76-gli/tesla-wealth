// ==========================================
// API
// ==========================================

const API_URL =
    "https://tesla-wealth.onrender.com/api/transactions";


// ==========================================
// TOKEN
// ==========================================

const token =
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// ==========================================
// CHECK LOGIN
// ==========================================

if (!token) {

    alert("Please login first.");

    window.location.href =
        "./auth.html";

}


// ==========================================
// DATA
// ==========================================

let transactions = [];


// ==========================================
// DOM
// ==========================================

const list =
    document.getElementById(
        "transactionList"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const typeFilter =
    document.getElementById(
        "typeFilter"
    );


// ==========================================
// LOAD TRANSACTIONS
// ==========================================

async function loadTransactions() {

    try {

        list.innerHTML = `

            <div class="loading">

                <i class="fa-solid fa-spinner fa-spin"></i>

                Loading transactions...

            </div>

        `;


        const response =
            await fetch(
                `${API_URL}/my`,
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


        updateSummary();

        renderTransactions();


    } catch (error) {

        console.error(error);


        list.innerHTML = `

            <div class="loading">

                ❌ ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// ==========================================
// SUMMARY
// ==========================================

function updateSummary() {

    document.getElementById(
        "totalTransactions"
    ).textContent =
        transactions.length;


    let credit = 0;

    let debit = 0;


    transactions.forEach(tx => {

        const amount =
            Number(tx.amount || 0);


        if (amount > 0) {

            credit += amount;

        } else {

            debit += Math.abs(amount);

        }

    });


    document.getElementById(
        "totalCredit"
    ).textContent =
        formatMoney(credit);


    document.getElementById(
        "totalDebit"
    ).textContent =
        formatMoney(debit);

}


// ==========================================
// RENDER
// ==========================================

function renderTransactions() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const filter =
        typeFilter.value;


    const filtered =
        transactions.filter(tx => {

            const amount =
                Number(tx.amount || 0);


            const type =
                amount >= 0
                    ? "Credit"
                    : "Debit";


            const text = `

                ${tx.type || ""}

                ${tx.txId || ""}

                ${tx.description || ""}

            `.toLowerCase();


            const matchesSearch =
                !search ||
                text.includes(search);


            const matchesType =
                filter === "All" ||
                filter === type;


            return (
                matchesSearch &&
                matchesType
            );

        });


    if (filtered.length === 0) {

        list.innerHTML = `

            <div class="loading">

                No transactions found.

            </div>

        `;

        return;

    }


    list.innerHTML =
        filtered.map(
            (tx) => {

                const amount =
                    Number(
                        tx.amount || 0
                    );


                const credit =
                    amount >= 0;


                const typeClass =
                    credit
                        ? "credit"
                        : "debit";


                const icon =
                    credit
                        ? "fa-arrow-down"
                        : "fa-arrow-up";


                const sign =
                    credit
                        ? "+"
                        : "-";


                return `

                    <div
                        class="transaction-card"
                        onclick="viewTransaction('${tx._id}')"
                    >

                        <div
                            class="
                                transaction-icon
                                ${typeClass}
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
                            class="transaction-info"
                        >

                            <strong>

                                ${escapeHTML(
                                    tx.type ||
                                    "Transaction"
                                )}

                            </strong>


                            <small>

                                ${
                                    tx.txId
                                        ? escapeHTML(
                                            tx.txId
                                        )
                                        : "No ID"
                                }

                                •
                                ${formatDate(
                                    tx.createdAt
                                )}

                            </small>

                        </div>


                        <div
                            class="
                                transaction-amount
                                ${typeClass}
                            "
                        >

                            ${sign}
                            ${formatMoney(
                                Math.abs(amount)
                            )}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


// ==========================================
// VIEW TRANSACTION
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


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Transaction not found."
            );

        }


        const tx =
            data.transaction;


        const amount =
            Number(tx.amount || 0);


        document.getElementById(
            "transactionDetails"
        ).innerHTML = `

            <div class="detail-row">

                <span>Type</span>

                <strong>
                    ${escapeHTML(
                        tx.type || "-"
                    )}
                </strong>

            </div>


            <div class="detail-row">

                <span>Transaction ID</span>

                <strong>
                    ${escapeHTML(
                        tx.txId || "-"
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
                        tx.description || "-"
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
            .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

}


function formatDate(date) {

    if (!date) return "-";


    return new Date(date)
        .toLocaleString("en-IN", {

            day: "2-digit",

            month: "short",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit"

        });

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

searchInput.addEventListener(
    "input",
    renderTransactions
);


typeFilter.addEventListener(
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


// ==========================================
// START
// ==========================================

loadTransactions();