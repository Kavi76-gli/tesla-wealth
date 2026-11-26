"use strict";

(() => {

    // =====================================================
    // CONFIGURATION
    // =====================================================

    const API_BASE =
        window.BITCOIN_API_BASE ||
        (
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1"
                ? "http://localhost:5000/api"
                : "https://tesla-wealth.onrender.com/api"
        );

    const WITHDRAW_API = `${API_BASE}/withdrawals`;

    const TOKEN =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token");


    // =====================================================
    // DOM ELEMENTS
    // =====================================================

    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const refreshBtn = document.getElementById("refreshBtn");

    const pendingCount = document.getElementById("pendingCount");
    const approvedCount = document.getElementById("approvedCount");
    const rejectedCount = document.getElementById("rejectedCount");
    const totalCount = document.getElementById("totalCount");

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");

    const withdrawalTableBody =
        document.getElementById("withdrawalTableBody");

    const resultCount = document.getElementById("resultCount");

    const detailsModal = document.getElementById("detailsModal");
    const modalContent = document.getElementById("modalContent");
    const closeModalButton = document.getElementById("closeModal");


    // =====================================================
    // STATE
    // =====================================================

    let allWithdrawals = [];
    let isLoading = false;
    let processingActions = new Set();


    // =====================================================
    // AUTHENTICATION
    // =====================================================

    if (!TOKEN) {
        window.location.href = "auth.html";
        return;
    }


    // =====================================================
    // API REQUEST
    // =====================================================

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {

            ...options,

            headers: {

                "Content-Type": "application/json",

                "Authorization": `Bearer ${TOKEN}`,

                ...options.headers

            }

        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {

            const error = new Error(
                data.message || "Request failed."
            );

            error.status = response.status;
            error.data = data;

            throw error;

        }

        return data;

    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            })[character]
        );

    }


    // =====================================================
    // FORMAT CURRENCY
    // =====================================================

    function formatCurrency(amount) {

        return "₹" + Number(amount || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }


    // =====================================================
    // FORMAT DATE
    // =====================================================

    function formatDate(date) {

        if (!date) return "N/A";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "N/A";
        }

        return parsedDate.toLocaleString("en-IN", {

            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"

        });

    }


    // =====================================================
    // NORMALIZE STATUS
    // =====================================================

    function normalizeStatus(status) {

        const value = String(status || "Pending").toLowerCase();

        if (value === "approved") return "Approved";
        if (value === "rejected") return "Rejected";
        if (value === "processing") return "Processing";
        if (value === "completed") return "Completed";

        return "Pending";

    }


    // =====================================================
    // USER WITHDRAWAL PERMISSION
    // =====================================================

    function isWithdrawalEnabled(user) {

        // Older user records without this field
        // are treated as enabled.

        return user?.withdrawalEnabled !== false;

    }


    // =====================================================
    // NOTIFICATION
    // =====================================================

    function showNotification(message, type = "success") {

        let notification =
            document.getElementById("adminNotification");

        if (!notification) {

            notification = document.createElement("div");

            notification.id = "adminNotification";

            document.body.appendChild(notification);

        }

        notification.textContent = message;

        notification.className =
            `admin-notification ${type}`;

        Object.assign(notification.style, {

            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: "5000",
            maxWidth: "350px",
            padding: "14px 18px",
            borderRadius: "10px",
            color: "#ffffff",

            background:
                type === "error"
                    ? "#d94350"
                    : "#128653",

            boxShadow: "0 8px 25px rgba(0,0,0,.15)",
            fontSize: "13px",
            fontWeight: "600"

        });

        clearTimeout(notification.timer);

        notification.timer = setTimeout(() => {
            notification.remove();
        }, 4000);

    }


    // =====================================================
    // CLEAR AUTHENTICATION
    // =====================================================

    function clearAuthentication() {

        localStorage.removeItem("adminToken");
        localStorage.removeItem("ki_token");
        localStorage.removeItem("token");

        window.location.href = "auth.html";

    }


    // =====================================================
    // LOAD WITHDRAWALS
    // =====================================================

    async function loadWithdrawals() {

        if (isLoading) return;

        isLoading = true;

        if (refreshBtn) {
            refreshBtn.disabled = true;
        }

        if (withdrawalTableBody) {

            withdrawalTableBody.innerHTML = `

                <tr>
                    <td colspan="8" class="loading">

                        <i class="fa-solid fa-spinner fa-spin"></i>

                        Loading withdrawal requests...

                    </td>
                </tr>

            `;

        }

        try {

            const data = await apiRequest(
                `${WITHDRAW_API}/admin/all`
            );

            allWithdrawals =
                Array.isArray(data.withdrawals)
                    ? data.withdrawals
                    : [];

            updateStatistics();

            applyFilters();

        } catch (error) {

            console.error("LOAD WITHDRAWALS ERROR:", error);

            if (withdrawalTableBody) {

                withdrawalTableBody.innerHTML = `

                    <tr>
                        <td colspan="8" class="empty-state">

                            Unable to load withdrawal requests.

                            <br><br>

                            ${escapeHTML(error.message)}

                        </td>
                    </tr>

                `;

            }

            showNotification(error.message, "error");

            if (error.status === 401) {
                clearAuthentication();
            }

        } finally {

            isLoading = false;

            if (refreshBtn) {
                refreshBtn.disabled = false;
            }

        }

    }


    // =====================================================
    // UPDATE STATISTICS
    // =====================================================

    function updateStatistics() {

        const pending = allWithdrawals.filter(
            item => normalizeStatus(item.status) === "Pending"
        ).length;

        const approved = allWithdrawals.filter(
            item => normalizeStatus(item.status) === "Approved"
        ).length;

        const rejected = allWithdrawals.filter(
            item => normalizeStatus(item.status) === "Rejected"
        ).length;

        if (pendingCount) {
            pendingCount.textContent = pending;
        }

        if (approvedCount) {
            approvedCount.textContent = approved;
        }

        if (rejectedCount) {
            rejectedCount.textContent = rejected;
        }

        if (totalCount) {
            totalCount.textContent = allWithdrawals.length;
        }

    }


    // =====================================================
    // GET PAYMENT DETAILS
    // =====================================================

    function getPaymentDetails(withdrawal) {

        const details = withdrawal.paymentDetails || {};

        return {

            upiId:
                details.upiId ||
                withdrawal.upiId ||
                "",

            accountHolder:
                details.accountHolder ||
                withdrawal.accountHolder ||
                "",

            bankName:
                details.bankName ||
                withdrawal.bankName ||
                "",

            accountNumber:
                details.accountNumber ||
                withdrawal.accountNumber ||
                "",

            ifscCode:
                details.ifscCode ||
                details.ifsc ||
                withdrawal.ifscCode ||
                ""

        };

    }


    // =====================================================
    // GET USER DETAILS
    // =====================================================

    function getUserDetails(withdrawal) {

        const user = withdrawal.user || {};

        return {

            name:
                user.name ||
                withdrawal.userName ||
                "Unknown User",

            phone:
                user.phone ||
                withdrawal.phone ||
                "N/A",

            id:
                user._id ||
                withdrawal.userId ||
                "",

            withdrawalEnabled:
                isWithdrawalEnabled(user),

            disabledReason:
                user.withdrawalDisabledReason || "",

            disabledAlert:
                user.withdrawalDisabledAlert || "",

            disabledAt:
                user.withdrawalDisabledAt || null

        };

    }


    // =====================================================
    // PAYMENT DISPLAY
    // =====================================================

    function paymentDisplay(withdrawal) {

        const details = getPaymentDetails(withdrawal);

        if (withdrawal.paymentMethod === "UPI") {

            return `

                <strong>UPI ID:</strong>

                ${escapeHTML(details.upiId || "N/A")}

            `;

        }

        return `

            <strong>Account:</strong>

            ${escapeHTML(details.accountNumber || "N/A")}

        `;

    }


    // =====================================================
    // USER PERMISSION BUTTON
    // =====================================================

    function permissionButton(user, withdrawal) {

        if (!user.id) {
            return "";
        }

        if (user.withdrawalEnabled) {

            return `

                <button
                    type="button"
                    class="reject-btn"
                    data-action="disable-user"
                    data-user-id="${escapeHTML(user.id)}"
                    title="Disable user withdrawals"
                >

                    <i class="fa-solid fa-lock"></i>

                </button>

            `;

        }

        return `

            <button
                type="button"
                class="approve-btn"
                data-action="enable-user"
                data-user-id="${escapeHTML(user.id)}"
                title="Enable user withdrawals"
            >

                <i class="fa-solid fa-lock-open"></i>

            </button>

        `;

    }


    // =====================================================
    // RENDER TABLE
    // =====================================================

    function renderTable(withdrawals) {

        if (!withdrawalTableBody) return;

        if (!withdrawals.length) {

            withdrawalTableBody.innerHTML = `

                <tr>
                    <td colspan="8" class="empty-state">

                        <i class="fa-solid fa-folder-open"></i>

                        <h3>No withdrawal requests found</h3>

                        <p>There are no matching records.</p>

                    </td>
                </tr>

            `;

            return;

        }

        withdrawalTableBody.innerHTML =
            withdrawals.map((withdrawal, index) => {

                const status = normalizeStatus(withdrawal.status);

                const user = getUserDetails(withdrawal);

                const badgeClass = status.toLowerCase();

                const payment = paymentDisplay(withdrawal);

                const permissionStatus = user.withdrawalEnabled
                    ? `<span class="status-badge status-approved">Enabled</span>`
                    : `<span class="status-badge status-rejected">Disabled</span>`;

                const actions = `

                    <div class="action-buttons">

                        ${
                            status === "Pending"
                                ? `

                                    <button
                                        type="button"
                                        class="approve-btn"
                                        data-action="approve"
                                        data-id="${escapeHTML(withdrawal._id)}"
                                        title="Approve withdrawal"
                                    >
                                        <i class="fa-solid fa-check"></i>
                                    </button>

                                    <button
                                        type="button"
                                        class="reject-btn"
                                        data-action="reject"
                                        data-id="${escapeHTML(withdrawal._id)}"
                                        title="Reject withdrawal"
                                    >
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>

                                `
                                : ""
                        }

                        <button
                            type="button"
                            class="view-btn"
                            data-action="view"
                            data-id="${escapeHTML(withdrawal._id)}"
                            title="View details"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        ${permissionButton(user, withdrawal)}

                    </div>

                `;

                return `

                    <tr>

                        <td>${index + 1}</td>

                        <td>

                            <strong class="user-name">
                                ${escapeHTML(user.name)}
                            </strong>

                            <div class="user-phone">
                                ${escapeHTML(user.phone)}
                            </div>

                        </td>

                        <td>

                            <strong class="amount">
                                ${formatCurrency(withdrawal.amount)}
                            </strong>

                        </td>

                        <td>
                            ${escapeHTML(withdrawal.paymentMethod || "N/A")}
                        </td>

                        <td>${payment}</td>

                        <td>${formatDate(withdrawal.createdAt)}</td>

                        <td>

                            <span class="status-badge status-${badgeClass}">
                                ${status}
                            </span>

                            <div style="margin-top:6px;">
                                ${permissionStatus}
                            </div>

                        </td>

                        <td>${actions}</td>

                    </tr>

                `;

            }).join("");

    }


    // =====================================================
    // SEARCH AND FILTER
    // =====================================================

    function applyFilters() {

        const search =
            String(searchInput?.value || "")
                .trim()
                .toLowerCase();

        const selectedStatus =
            statusFilter?.value || "All";

        const filtered = allWithdrawals.filter(withdrawal => {

            const user = getUserDetails(withdrawal);

            const searchableText = [

                user.name,
                user.phone,
                withdrawal._id,
                withdrawal.paymentMethod,
                withdrawal.status

            ].join(" ").toLowerCase();

            const matchesSearch =
                !search || searchableText.includes(search);

            const matchesStatus =
                selectedStatus === "All" ||
                normalizeStatus(withdrawal.status) === selectedStatus;

            return matchesSearch && matchesStatus;

        });

        renderTable(filtered);

        if (resultCount) {
            resultCount.textContent = `${filtered.length} requests`;
        }

    }


    searchInput?.addEventListener("input", applyFilters);

    statusFilter?.addEventListener("change", applyFilters);


    // =====================================================
    // FIND WITHDRAWAL
    // =====================================================

    function findWithdrawal(id) {

        return allWithdrawals.find(
            withdrawal => String(withdrawal._id) === String(id)
        );

    }


    // =====================================================
    // VIEW WITHDRAWAL
    // =====================================================

    function viewWithdrawal(id) {

        const withdrawal = findWithdrawal(id);

        if (!withdrawal) {

            showNotification("Withdrawal not found.", "error");
            return;

        }

        const user = getUserDetails(withdrawal);

        const details = getPaymentDetails(withdrawal);

        const status = normalizeStatus(withdrawal.status);

        const paymentInformation =
            withdrawal.paymentMethod === "UPI"

                ? [
                    ["UPI ID", details.upiId]
                ]

                : [
                    ["Account Holder", details.accountHolder],
                    ["Bank Name", details.bankName],
                    ["Account Number", details.accountNumber],
                    ["IFSC Code", details.ifscCode]
                ];

        const rows = [

            ["Withdrawal ID", withdrawal._id],
            ["User", user.name],
            ["Phone", user.phone],
            ["Amount", formatCurrency(withdrawal.amount)],
            ["Payment Method", withdrawal.paymentMethod],
            ...paymentInformation,
            ["Withdrawal Status", status],

            [
                "Withdrawal Permission",
                user.withdrawalEnabled ? "Enabled" : "Disabled"
            ],

            ["Created", formatDate(withdrawal.createdAt)],
            ["Processed", formatDate(withdrawal.processedAt)]

        ];

        modalContent.innerHTML = rows.map(([label, value]) => `

            <div class="detail-row">

                <span class="detail-label">
                    ${escapeHTML(label)}
                </span>

                <span class="detail-value">
                    ${escapeHTML(value || "N/A")}
                </span>

            </div>

        `).join("");


        // =================================================
        // REJECTION INFORMATION
        // =================================================

        if (status === "Rejected") {

            modalContent.innerHTML += `

                <div class="rejection-reason">

                    <h4>Withdrawal Rejection Reason</h4>

                    <p>
                        ${escapeHTML(
                            withdrawal.rejectionReason ||
                            withdrawal.remark ||
                            "No rejection reason provided."
                        )}
                    </p>

                    <h4 style="margin-top:15px;">
                        User Alert Message
                    </h4>

                    <p>
                        ${escapeHTML(
                            withdrawal.rejectionAlert ||
                            "No separate alert message provided."
                        )}
                    </p>

                </div>

            `;

        }


        // =================================================
        // DISABLED PERMISSION INFORMATION
        // =================================================

        if (!user.withdrawalEnabled) {

            modalContent.innerHTML += `

                <div class="rejection-reason">

                    <h4>Withdrawal Restriction</h4>

                    <p>
                        ${escapeHTML(
                            user.disabledReason || "No restriction reason provided."
                        )}
                    </p>

                    <p>
                        <strong>Disabled At:</strong>
                        ${escapeHTML(formatDate(user.disabledAt))}
                    </p>

                </div>

            `;

        }

        detailsModal.style.display = "flex";
        detailsModal.classList.add("show");

        document.body.style.overflow = "hidden";

    }


    // =====================================================
    // CLOSE MODAL
    // =====================================================

    function closeModal() {

        if (!detailsModal) return;

        detailsModal.style.display = "none";
        detailsModal.classList.remove("show");

        document.body.style.overflow = "";

    }

    window.closeModal = closeModal;

    closeModalButton?.addEventListener("click", closeModal);

    detailsModal?.addEventListener("click", event => {

        if (event.target === detailsModal) {
            closeModal();
        }

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeModal();
        }

    });


    // =====================================================
    // APPROVE WITHDRAWAL
    // =====================================================

    async function approveWithdrawal(id) {

        const withdrawal = findWithdrawal(id);

        if (!withdrawal) return;

        if (normalizeStatus(withdrawal.status) !== "Pending") {

            showNotification(
                "This withdrawal has already been processed.",
                "error"
            );

            return;

        }

        const confirmed = window.confirm(
            `Approve withdrawal of ${formatCurrency(withdrawal.amount)}?`
        );

        if (!confirmed) return;

        try {

            const data = await apiRequest(

                `${WITHDRAW_API}/admin/approve/${encodeURIComponent(id)}`,

                {

                    method: "PATCH",

                    body: JSON.stringify({

                        remark: "Withdrawal approved by admin."

                    })

                }

            );

            showNotification(
                data.message || "Withdrawal approved successfully."
            );

            await loadWithdrawals();

        } catch (error) {

            console.error("APPROVE WITHDRAWAL ERROR:", error);

            showNotification(error.message, "error");

            if (error.status === 401) {
                clearAuthentication();
            }

        }

    }


    // =====================================================
    // REJECT WITHDRAWAL
    // =====================================================

    async function rejectWithdrawal(id) {

        const withdrawal = findWithdrawal(id);

        if (!withdrawal) return;

        if (normalizeStatus(withdrawal.status) !== "Pending") {

            showNotification(
                "This withdrawal has already been processed.",
                "error"
            );

            return;

        }


        // =================================================
        // ADMIN ENTERS REJECTION REASON
        // =================================================

        const rejectionReason = window.prompt(

            "Enter the withdrawal rejection reason:\n\n" +
            "Example: The submitted bank account details are incorrect."

        );

        if (rejectionReason === null) return;

        const reason = rejectionReason.trim();

        if (!reason) {

            showNotification(
                "Withdrawal rejection reason is required.",
                "error"
            );

            return;

        }

        if (reason.length > 500) {

            showNotification(
                "Rejection reason cannot exceed 500 characters.",
                "error"
            );

            return;

        }


        // =================================================
        // ADMIN ENTERS SEPARATE ALERT MESSAGE
        // =================================================

        const rejectionAlert = window.prompt(

            "Enter a separate alert message for the user:\n\n" +
            "Example: Your withdrawal facility has been temporarily disabled. Please contact customer support."

        );

        if (rejectionAlert === null) return;

        const alertMessage = rejectionAlert.trim();

        if (!alertMessage) {

            showNotification(
                "A separate user alert message is required.",
                "error"
            );

            return;

        }

        if (alertMessage.length > 1000) {

            showNotification(
                "Alert message cannot exceed 1000 characters.",
                "error"
            );

            return;

        }


        // =================================================
        // CONFIRM
        // =================================================

        const confirmed = window.confirm(

            "Reject this withdrawal?\n\n" +
            "The withdrawal amount will be refunded to the user's wallet.\n" +
            "The user's future withdrawal permission will also be disabled."

        );

        if (!confirmed) return;


        try {

            const data = await apiRequest(

                `${WITHDRAW_API}/admin/reject/${encodeURIComponent(id)}`,

                {

                    method: "PATCH",

                    body: JSON.stringify({

                        rejectionReason: reason,

                        rejectionAlert: alertMessage

                    })

                }

            );

            showNotification(
                data.message || "Withdrawal rejected successfully."
            );

            await loadWithdrawals();

        } catch (error) {

            console.error("REJECT WITHDRAWAL ERROR:", error);

            showNotification(error.message, "error");

            if (error.status === 401) {
                clearAuthentication();
            }

        }

    }


    // =====================================================
    // ENABLE USER WITHDRAWALS
    // =====================================================

    async function enableUserWithdrawal(userId) {

        if (!userId) return;

        const confirmed = window.confirm(

            "Enable withdrawal permission for this user?\n\n" +
            "The user will be able to submit withdrawal requests again."

        );

        if (!confirmed) return;

        try {

            const data = await apiRequest(

                `${WITHDRAW_API}/admin/users/${encodeURIComponent(userId)}/enable`,

                {

                    method: "PATCH",

                    body: JSON.stringify({})

                }

            );

            showNotification(
                data.message || "User withdrawal permission enabled."
            );

            await loadWithdrawals();

        } catch (error) {

            console.error("ENABLE WITHDRAWAL ERROR:", error);

            showNotification(error.message, "error");

            if (error.status === 401) {
                clearAuthentication();
            }

        }

    }


    // =====================================================
    // DISABLE USER WITHDRAWALS
    // =====================================================

    async function disableUserWithdrawal(userId) {

        if (!userId) return;

        const enteredReason = window.prompt(

            "Enter the reason for disabling this user's withdrawal permission:"

        );

        if (enteredReason === null) return;

        const reason = enteredReason.trim();

        if (!reason) {

            showNotification(
                "Please enter a withdrawal restriction reason.",
                "error"
            );

            return;

        }

        if (reason.length > 500) {

            showNotification(
                "Restriction reason cannot exceed 500 characters.",
                "error"
            );

            return;

        }

        const confirmed = window.confirm(

            "Disable withdrawal permission for this user?"

        );

        if (!confirmed) return;

        try {

            const data = await apiRequest(

                `${WITHDRAW_API}/admin/users/${encodeURIComponent(userId)}/disable`,

                {

                    method: "PATCH",

                    body: JSON.stringify({

                        reason: reason

                    })

                }

            );

            showNotification(
                data.message || "User withdrawal permission disabled."
            );

            await loadWithdrawals();

        } catch (error) {

            console.error("DISABLE WITHDRAWAL ERROR:", error);

            showNotification(error.message, "error");

            if (error.status === 401) {
                clearAuthentication();
            }

        }

    }


    // =====================================================
    // TABLE ACTION HANDLER
    // =====================================================

    withdrawalTableBody?.addEventListener("click", event => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;

        const id = button.dataset.id;

        const userId = button.dataset.userId;


        if (action === "view" && id) {
            viewWithdrawal(id);
            return;
        }

        if (action === "approve" && id) {
            approveWithdrawal(id);
            return;
        }

        if (action === "reject" && id) {
            rejectWithdrawal(id);
            return;
        }

        if (action === "enable-user" && userId) {
            enableUserWithdrawal(userId);
            return;
        }

        if (action === "disable-user" && userId) {
            disableUserWithdrawal(userId);
            return;
        }

    });


    // =====================================================
    // REFRESH
    // =====================================================

    refreshBtn?.addEventListener("click", loadWithdrawals);


    // =====================================================
    // MOBILE SIDEBAR
    // =====================================================

    menuBtn?.addEventListener("click", () => {

        sidebar?.classList.toggle("active");

    });

    document.addEventListener("click", event => {

        if (

            window.innerWidth <= 900 &&
            sidebar?.classList.contains("active") &&
            !sidebar.contains(event.target) &&
            !menuBtn?.contains(event.target)

        ) {

            sidebar.classList.remove("active");

        }

    });


    // =====================================================
    // LOGOUT
    // =====================================================

    logoutBtn?.addEventListener("click", () => {

        const confirmed = window.confirm(
            "Are you sure you want to logout?"
        );

        if (confirmed) {
            clearAuthentication();
        }

    });


    // =====================================================
    // INITIALIZE
    // =====================================================

    loadWithdrawals();

})(); 