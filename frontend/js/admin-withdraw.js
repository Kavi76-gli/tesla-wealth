// ======================================================
// ADMIN WITHDRAWAL MANAGEMENT
// ======================================================

const API_URL = "https://tesla-wealth.onrender.com/api";


// ======================================================
// TOKEN
// ======================================================

const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


if (!token) {

    alert("Please login first.");

    window.location.href = "../auth.html";

}


// ======================================================
// AUTH HEADERS
// ======================================================

const headers = {

    Authorization: `Bearer ${token}`

};


// ======================================================
// GLOBAL DATA
// ======================================================

let withdrawals = [];


// ======================================================
// LOAD WITHDRAWALS
// ======================================================

async function loadWithdrawals() {

    try {

        const response = await fetch(
            `${API_URL}/withdrawals/admin/all`,
            {
                method: "GET",
                headers
            }
        );


        const data = await response.json();


        console.log(
            "ADMIN WITHDRAW RESPONSE:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load withdrawals"
            );

        }


        // Support different backend response formats

        if (Array.isArray(data)) {

            withdrawals = data;

        }

        else if (Array.isArray(data.withdrawals)) {

            withdrawals = data.withdrawals;

        }

        else if (Array.isArray(data.data)) {

            withdrawals = data.data;

        }

        else {

            withdrawals = [];

        }


        console.log(
            "Withdrawals:",
            withdrawals
        );


        updateStatistics();

        renderWithdrawals();


    } catch (error) {

        console.error(
            "LOAD WITHDRAWALS ERROR:",
            error
        );

        alert(
            "Unable to load withdrawals."
        );

    }

}


// ======================================================
// UPDATE STATISTICS
// ======================================================

function updateStatistics() {

    const pending =
        withdrawals.filter(
            item =>
                item.status === "Pending"
        ).length;


    const approved =
        withdrawals.filter(
            item =>
                item.status === "Approved"
        ).length;


    const rejected =
        withdrawals.filter(
            item =>
                item.status === "Rejected"
        ).length;


    const total =
        withdrawals.length;


    // IMPORTANT:
    // These IDs match your HTML

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


    const totalElement =
        document.getElementById(
            "totalCount"
        );


    if (pendingElement) {

        pendingElement.textContent =
            pending;

    }


    if (approvedElement) {

        approvedElement.textContent =
            approved;

    }


    if (rejectedElement) {

        rejectedElement.textContent =
            rejected;

    }


    if (totalElement) {

        totalElement.textContent =
            total;

    }

}

// ======================================================
// RENDER WITHDRAWALS
// ======================================================

function renderWithdrawals() {

    const tbody = document.getElementById(
        "withdrawalTableBody"
    );

    if (!tbody) {
        console.error("withdrawalTableBody not found");
        return;
    }

    tbody.innerHTML = "";


    // ==================================================
    // REQUEST COUNT
    // ==================================================

    const requestCount = document.getElementById(
        "resultCount"
    );

    if (requestCount) {

        requestCount.textContent =
            `${withdrawals.length} requests`;

    }


    // ==================================================
    // NO DATA
    // ==================================================

    if (!withdrawals || withdrawals.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >

                    <i class="fa-solid fa-wallet"></i>

                    <div style="margin-top:10px;">
                        No withdrawal requests found.
                    </div>

                </td>

            </tr>

        `;

        return;

    }


    // ==================================================
    // LOOP WITHDRAWALS
    // ==================================================

    withdrawals.forEach(
        (withdrawal, index) => {

            const user =
                withdrawal.user || {};


            const userName =
                user.name ||
                "Unknown User";


            const phone =
                user.phone ||
                "-";


            const amount =
                Number(
                    withdrawal.amount || 0
                );


            const method =
                withdrawal.paymentMethod ||
                "-";


            const status =
                withdrawal.status ||
                "Pending";


            // ==================================================
            // PAYMENT DETAILS
            // ==================================================

            /*
                New format:

                withdrawal.paymentDetails = {
                    upiId,
                    accountHolder,
                    bankName,
                    accountNumber,
                    ifscCode
                }

                Old format:

                withdrawal.upiId
                withdrawal.accountHolder
                withdrawal.bankName
                withdrawal.accountNumber
                withdrawal.ifscCode
            */

            const details =
                withdrawal.paymentDetails || {};


            const upiId =
                details.upiId ||
                withdrawal.upiId ||
                "";


            const accountHolder =
                details.accountHolder ||
                withdrawal.accountHolder ||
                "";


            const bankName =
                details.bankName ||
                withdrawal.bankName ||
                "";


            const accountNumber =
                details.accountNumber ||
                withdrawal.accountNumber ||
                "";


            const ifscCode =
                details.ifscCode ||
                withdrawal.ifscCode ||
                "";


            let paymentDetailsHTML = "-";


            // ==================================================
            // UPI
            // ==================================================

            if (method === "UPI") {

                paymentDetailsHTML = `

                    <div class="payment-details">

                        <div>
                            <strong>UPI ID:</strong>
                            ${escapeHTML(
                                upiId || "-"
                            )}
                        </div>

                    </div>

                `;

            }


            // ==================================================
            // BANK
            // ==================================================

            if (method === "Bank") {

                paymentDetailsHTML = `

                    <div class="payment-details">

                        <div>
                            <strong>Holder:</strong>
                            ${escapeHTML(
                                accountHolder || "-"
                            )}
                        </div>

                        <div>
                            <strong>Bank:</strong>
                            ${escapeHTML(
                                bankName || "-"
                            )}
                        </div>

                        <div>
                            <strong>A/C:</strong>
                            ${escapeHTML(
                                accountNumber || "-"
                            )}
                        </div>

                        <div>
                            <strong>IFSC:</strong>
                            ${escapeHTML(
                                ifscCode || "-"
                            )}
                        </div>

                    </div>

                `;

            }


            // ==================================================
            // DATE
            // ==================================================

            const date =
                withdrawal.createdAt
                    ? formatDate(
                        withdrawal.createdAt
                    )
                    : "-";


            // ==================================================
            // STATUS CLASS
            // ==================================================

            let statusClass = "pending";


            if (status === "Approved") {

                statusClass = "approved";

            }
            else if (status === "Rejected") {

                statusClass = "rejected";

            }


            // ==================================================
            // ACTION BUTTONS
            // ==================================================

            let actionHTML = `

                <button
                    class="view-btn"
                    onclick="viewWithdrawal('${withdrawal._id}')"
                    title="View Details"
                >

                    <i class="fa-solid fa-eye"></i>

                </button>

            `;


            // ==================================================
            // PENDING ACTIONS
            // ==================================================

            if (status === "Pending") {

                actionHTML = `

                    <button
                        class="approve-btn"
                        onclick="approveWithdrawal('${withdrawal._id}')"
                        title="Approve"
                    >

                        <i class="fa-solid fa-check"></i>

                    </button>


                    <button
                        class="reject-btn"
                        onclick="rejectWithdrawal('${withdrawal._id}')"
                        title="Reject"
                    >

                        <i class="fa-solid fa-xmark"></i>

                    </button>


                    <button
                        class="view-btn"
                        onclick="viewWithdrawal('${withdrawal._id}')"
                        title="View Details"
                    >

                        <i class="fa-solid fa-eye"></i>

                    </button>

                `;

            }


            // ==================================================
            // USER AVATAR
            // ==================================================

            const avatarLetter =
                userName
                    .charAt(0)
                    .toUpperCase();


            // ==================================================
            // CREATE TABLE ROW
            // ==================================================

            tbody.innerHTML += `

                <tr>

                    <!-- NUMBER -->

                    <td>

                        ${index + 1}

                    </td>


                    <!-- USER -->

                    <td>

                        <div class="user-cell">

                            <div class="user-avatar">

                                ${escapeHTML(
                                    avatarLetter
                                )}

                            </div>


                            <div>

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


                    <!-- AMOUNT -->

                    <td>

                        <strong class="amount">

                            ₹${amount.toLocaleString(
                                "en-IN"
                            )}

                        </strong>

                    </td>


                    <!-- METHOD -->

                    <td>

                        <span class="method">

                            ${escapeHTML(
                                method
                            )}

                        </span>

                    </td>


                    <!-- PAYMENT DETAILS -->

                    <td>

                        ${paymentDetailsHTML}

                    </td>


                    <!-- DATE -->

                    <td>

                        ${escapeHTML(
                            date
                        )}

                    </td>


                    <!-- STATUS -->

                    <td>

                        <span
                            class="status ${statusClass}"
                        >

                            ${escapeHTML(
                                status
                            )}

                        </span>

                    </td>


                    <!-- ACTION -->

                    <td>

                        <div class="action-buttons">

                            ${actionHTML}

                        </div>

                    </td>

                </tr>

            `;

        }
    );

}
// ======================================================
// APPROVE WITHDRAWAL
// ======================================================

async function approveWithdrawal(id) {

    if (
        !confirm(
            "Approve this withdrawal?"
        )
    ) {

        return;

    }


    try {

        const response = await fetch(

            `${API_URL}/withdrawals/admin/approve/${id}`,

            {

                method: "PATCH",

                headers

            }

        );


        const data =
            await response.json();


        console.log(
            "APPROVE RESPONSE:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Approval failed"
            );

        }


        alert(
            data.message ||
            "Withdrawal approved successfully."
        );


        loadWithdrawals();


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// ======================================================
// REJECT WITHDRAWAL
// ======================================================
// ======================================================
// REJECT WITHDRAWAL
// ======================================================

async function rejectWithdrawal(id) {

    // ==================================================
    // ASK FOR REJECTION REASON
    // ==================================================

    const rejectionReason = prompt(
        "Enter the reason for rejecting this withdrawal:"
    );


    // ==================================================
    // CANCELLED
    // ==================================================

    if (rejectionReason === null) {

        return;

    }


    // ==================================================
    // EMPTY REASON
    // ==================================================

    const reason = 
        rejectionReason.trim();


    if (!reason) {

        alert(
            "Please enter a rejection reason."
        );

        return;

    }


    // ==================================================
    // CONFIRM REJECTION
    // ==================================================

    const confirmed = confirm(
        `Reject this withdrawal?\n\nReason:\n${reason}`
    );


    if (!confirmed) {

        return;

    }


    // ==================================================
    // SEND REQUEST
    // ==================================================

    try {

        const response = await fetch(

            `${API_URL}/withdrawals/admin/reject/${id}`,

            {

                method: "PATCH",

                headers: {

                    ...headers,

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    rejectionReason:
                        reason

                })

            }

        );


        const data =
            await response.json();


        console.log(
            "REJECT RESPONSE:",
            data
        );


        // ==================================================
        // SERVER ERROR
        // ==================================================

        if (!response.ok) {

            throw new Error(

                data.message ||
                "Rejection failed"

            );

        }


        // ==================================================
        // SUCCESS
        // ==================================================

        alert(

            data.message ||
            "Withdrawal rejected successfully."

        );


        // ==================================================
        // REFRESH WITHDRAWALS
        // ==================================================

        await loadWithdrawals();


    } catch (error) {

        console.error(
            "REJECT WITHDRAWAL ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to reject withdrawal."
        );

    }

}

// ======================================================
// VIEW WITHDRAWAL
// ======================================================
// ======================================================
// VIEW WITHDRAWAL
// ======================================================

function viewWithdrawal(id) {

    const withdrawal =
        withdrawals.find(
            item =>
                item._id === id
        );


    if (!withdrawal) {

        console.error(
            "Withdrawal not found:",
            id
        );

        return;

    }


    // ==================================================
    // USER
    // ==================================================

    const user =
        withdrawal.user || {};


    // ==================================================
    // PAYMENT DETAILS
    // ==================================================

    const paymentDetails =
        withdrawal.paymentDetails || {};


    const upiId =
        paymentDetails.upiId ||
        withdrawal.upiId ||
        "";


    const accountHolder =
        paymentDetails.accountHolder ||
        withdrawal.accountHolder ||
        "";


    const bankName =
        paymentDetails.bankName ||
        withdrawal.bankName ||
        "";


    const accountNumber =
        paymentDetails.accountNumber ||
        withdrawal.accountNumber ||
        "";


    const ifscCode =
        paymentDetails.ifscCode ||
        withdrawal.ifscCode ||
        "";


    // ==================================================
    // MODAL CONTENT
    // ==================================================

    const content =
        document.getElementById(
            "modalContent"
        );


    if (!content) {

        console.error(
            "modalContent not found"
        );

        return;

    }


    // ==================================================
    // PAYMENT INFORMATION
    // ==================================================

    let paymentHTML = "";


    if (
        withdrawal.paymentMethod === "UPI"
    ) {

        paymentHTML = `

            <div class="detail-row">

                <strong>UPI ID:</strong>

                <span>
                    ${escapeHTML(
                        upiId || "-"
                    )}
                </span>

            </div>

        `;

    }


    if (
        withdrawal.paymentMethod === "Bank"
    ) {

        paymentHTML = `

            <div class="detail-row">

                <strong>Account Holder:</strong>

                <span>
                    ${escapeHTML(
                        accountHolder || "-"
                    )}
                </span>

            </div>


            <div class="detail-row">

                <strong>Bank:</strong>

                <span>
                    ${escapeHTML(
                        bankName || "-"
                    )}
                </span>

            </div>


            <div class="detail-row">

                <strong>Account Number:</strong>

                <span>
                    ${escapeHTML(
                        accountNumber || "-"
                    )}
                </span>

            </div>


            <div class="detail-row">

                <strong>IFSC:</strong>

                <span>
                    ${escapeHTML(
                        ifscCode || "-"
                    )}
                </span>

            </div>

        `;

    }


    // ==================================================
    // MODAL
    // ==================================================

    content.innerHTML = `

        <div class="detail-row">

            <strong>User:</strong>

            <span>
                ${escapeHTML(
                    user.name || "-"
                )}
            </span>

        </div>


        <div class="detail-row">

            <strong>Phone:</strong>

            <span>
                ${escapeHTML(
                    user.phone || "-"
                )}
            </span>

        </div>


        <div class="detail-row">

            <strong>Amount:</strong>

            <span>
                ₹${Number(
                    withdrawal.amount || 0
                ).toLocaleString("en-IN")}
            </span>

        </div>


        <div class="detail-row">

            <strong>Method:</strong>

            <span>
                ${escapeHTML(
                    withdrawal.paymentMethod || "-"
                )}
            </span>

        </div>


        ${paymentHTML}


        <div class="detail-row">

            <strong>Status:</strong>

            <span>
                ${escapeHTML(
                    withdrawal.status || "-"
                )}
            </span>

        </div>


        <div class="detail-row">

            <strong>Remark:</strong>

            <span>
                ${escapeHTML(
                    withdrawal.remark || "-"
                )}
            </span>

        </div>


        <div class="detail-row">

            <strong>Created:</strong>

            <span>
                ${withdrawal.createdAt
                    ? escapeHTML(
                        formatDate(
                            withdrawal.createdAt
                        )
                    )
                    : "-"
                }
            </span>

        </div>

    `;


    // ==================================================
    // OPEN MODAL
    // ==================================================

    const modal =
        document.getElementById(
            "detailsModal"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}

// ======================================================
// CLOSE MODAL
// ======================================================

function closeModal() {

    const modal =
        document.getElementById(
            "detailsModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(date) {

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


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ======================================================
// REFRESH BUTTON
// ======================================================

const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );


if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        loadWithdrawals
    );

}


// ======================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ======================================================

window.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "detailsModal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            modal.style.display =
                "none";

        }

    }
);


// ======================================================
// INITIAL LOAD
// ======================================================

loadWithdrawals();