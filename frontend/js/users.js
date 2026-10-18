// ==========================================
// API CONFIGURATION
// ==========================================

const API_URL = "https://bitcoin-m7kz.onrender.com/api/auth";

// ==========================================
// AUTHENTICATION
// ==========================================

function getAdminToken() {
    return (
        localStorage.getItem("adminToken") ||
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        ""
    );
}

const token = getAdminToken();

if (!token) {
    alert("Please login first.");
    window.location.href = "../auth.html";
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getValue(...values) {
    return values.find(value =>
        value !== undefined &&
        value !== null &&
        value !== ""
    );
}

function getNumber(...values) {
    const value = getValue(...values, 0);

    if (typeof value === "object" && value !== null) {
        return getNumber(
            value.balance,
            value.amount,
            value.total,
            value.value
        );
    }

    const number = Number(
        typeof value === "string"
            ? value.replace(/[₹,\s]/g, "")
            : value
    );

    return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
    return "₹" + getNumber(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ==========================================
// WALLET BALANCE
// ==========================================

function getUserWallet(user) {
    return getNumber(
        user.balance,
        user.wallet?.balance,
        typeof user.wallet === "number" ? user.wallet : undefined,
        user.walletBalance,
        user.availableBalance
    );
}

// ==========================================
// TOTAL DEPOSITS
// ==========================================

function getUserDeposit(user) {
    return getNumber(
        user.totalDeposit,
        user.totalDeposits,
        user.approvedDeposits,
        user.depositTotal,
        user.totalDepositAmount,
        user.depositAmount
    );
}

// ==========================================
// TOTAL WITHDRAWALS
// ==========================================

function getUserWithdraw(user) {
    return getNumber(
        user.totalWithdraw,
        user.totalWithdrawal,
        user.totalWithdrawals,
        user.withdrawalTotal,
        user.totalWithdrawAmount,
        user.totalWithdrawn,
        user.withdrawnAmount,
        user.withdrawalAmount,
        user.withdrawAmount,
        user.wallet?.totalWithdraw,
        user.wallet?.totalWithdrawals,
        user.stats?.totalWithdraw,
        user.statistics?.totalWithdraw
    );
}

// ==========================================
// TOTAL INVESTMENT
// ==========================================

function getUserInvestment(user) {
    return getNumber(
        user.totalInvestment,
        user.totalInvestments,
        user.totalInvested,
        user.investmentTotal,
        user.investedAmount,
        user.totalInvestmentAmount,
        user.investmentAmount,
        user.investment?.amount,
        user.investment?.total,
        user.stats?.totalInvestment,
        user.statistics?.totalInvestment
    );
}

// ==========================================
// LOAD USERS FROM BACKEND
// ==========================================

async function loadUsers() {
    if (!token) return;

    const table = document.getElementById("usersTable");

    if (!table) {
        console.error("Element #usersTable was not found.");
        return;
    }

    table.innerHTML = `
        <tr>
            <td colspan="9" style="text-align:center;padding:25px;">
                Loading users...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            cache: "no-store"
        });

        const data = await response.json();

        if (response.status === 401) {
            alert("Your session has expired. Please log in again.");
            logout();
            return;
        }

        if (response.status === 403) {
            throw new Error(
                "Administrator permission is required."
            );
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || `Server error: ${response.status}`
            );
        }

        const users =
            data.users ??
            data.data?.users ??
            data.data ??
            [];

        if (!Array.isArray(users)) {
            console.error("Unexpected API response:", data);
            throw new Error("The server did not return a valid users list.");
        }

        window.adminUsers = users;

        // Diagnostic information for checking missing fields.
        console.log("Users API response:", data);

        if (users.length > 0) {
            console.log("First user object:", users[0]);

            console.table(users.map(user => ({
                name: user.name || user.fullName || user.username,
                wallet: getUserWallet(user),
                deposit: getUserDeposit(user),
                withdrawal: getUserWithdraw(user),
                investment: getUserInvestment(user)
            })));
        }

        renderUsers(users);
        updateCards(users);

    } catch (error) {
        console.error("Users loading error:", error);

        table.innerHTML = `
            <tr>
                <td colspan="9"
                    style="text-align:center;padding:25px;color:#b91c1c;">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
}

// ==========================================
// DISPLAY USERS
// ==========================================

function renderUsers(users) {
    const table = document.getElementById("usersTable");

    if (!table) return;

    if (!users.length) {
        table.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;padding:25px;">
                    No users found.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = users.map((user, index) => {
        const id = String(user._id || user.id || "");

        const name = getValue(
            user.name,
            user.fullName,
            user.username,
            "Unknown"
        );

        const phone = getValue(
            user.phone,
            user.mobile,
            user.mobileNumber,
            "—"
        );

        const wallet = getUserWallet(user);
        const deposit = getUserDeposit(user);
        const withdraw = getUserWithdraw(user);
        const investment = getUserInvestment(user);

        const isBlocked = Boolean(
            user.isBlocked || user.blocked
        );

        return `
            <tr>
                <td>${index + 1}</td>

                <td>${escapeHTML(name)}</td>

                <td>${escapeHTML(phone)}</td>

                <td>${formatMoney(wallet)}</td>

                <td>${formatMoney(deposit)}</td>

                <td>${formatMoney(withdraw)}</td>

                <td>${formatMoney(investment)}</td>

                <td>
                    <span class="${
                        isBlocked ? "status-blocked" : "status-active"
                    }">
                        ${isBlocked ? "Blocked" : "Active"}
                    </span>
                </td>

                <td>
                    <button
                        class="btn view-btn"
                        data-action="view"
                        data-id="${escapeHTML(id)}">
                        View
                    </button>

                    <button
                        class="btn block-btn"
                        data-action="block"
                        data-id="${escapeHTML(id)}">
                        ${isBlocked ? "Unblock" : "Block"}
                    </button>

                    <button
                        class="btn delete-btn"
                        data-action="delete"
                        data-id="${escapeHTML(id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateCards(users) {
    const total = document.getElementById("totalUsers");
    const active = document.getElementById("activeUsers");
    const blocked = document.getElementById("blockedUsers");
    const todayUsers = document.getElementById("todayUsers");

    if (total) {
        total.textContent = users.length;
    }

    if (active) {
        active.textContent = users.filter(user =>
            !user.isBlocked && !user.blocked
        ).length;
    }

    if (blocked) {
        blocked.textContent = users.filter(user =>
            user.isBlocked || user.blocked
        ).length;
    }

    if (todayUsers) {
        const today = new Date();

        todayUsers.textContent = users.filter(user => {
            if (!user.createdAt) return false;

            const date = new Date(user.createdAt);

            return (
                !Number.isNaN(date.getTime()) &&
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()
            );
        }).length;
    }
}

// ==========================================
// USER TABLE ACTIONS
// ==========================================

const usersTable = document.getElementById("usersTable");

if (usersTable) {
    usersTable.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        if (!id) {
            alert("User ID is missing.");
            return;
        }

        if (action === "view") {
            viewUser(id);
        }

        if (action === "block") {
            toggleBlock(id);
        }

        if (action === "delete") {
            deleteUser(id);
        }
    });
}

// ==========================================
// VIEW USER
// ==========================================

function viewUser(id) {
    window.location.href =
        `user-details.html?id=${encodeURIComponent(id)}`;
}

// ==========================================
// BLOCK / UNBLOCK USER
// ==========================================

async function toggleBlock(id) {
    if (!confirm("Are you sure you want to change this user's status?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/admin/users/block/${encodeURIComponent(id)}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json();

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "Could not update user status."
            );
        }

        alert(data.message || "User status updated.");

        await loadUsers();

    } catch (error) {
        console.error("Update status error:", error);
        alert(error.message);
    }
}

// ==========================================
// DELETE USER
// ==========================================

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/admin/users/${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            }
        );

        const data = await response.json();

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "Could not delete user."
            );
        }

        alert(data.message || "User deleted.");

        await loadUsers();

    } catch (error) {
        console.error("Delete user error:", error);
        alert(error.message);
    }
}

// ==========================================
// SEARCH USERS
// ==========================================

const searchInput = document.getElementById("searchUser");

if (searchInput) {
    searchInput.addEventListener("input", function () {
        const search = this.value.trim().toLowerCase();

        const filteredUsers = (window.adminUsers || []).filter(user => {
            const name = String(
                user.name || user.fullName || user.username || ""
            ).toLowerCase();

            const phone = String(
                user.phone || user.mobile || user.mobileNumber || ""
            ).toLowerCase();

            return (
                name.includes(search) ||
                phone.includes(search)
            );
        });

        renderUsers(filteredUsers);
    });
}

// ==========================================
// LOGOUT
// ==========================================

function logout() {
    [
        "ki_token",
        "token",
        "adminToken",
        "user"
    ].forEach(key => localStorage.removeItem(key));

    window.location.href = "../auth.html";
}

const logoutButton = document.getElementById("logoutBtn");

if (logoutButton) {
    logoutButton.addEventListener("click", event => {
        event.preventDefault();
        logout();
    });
}

// ==========================================
// INITIAL LOAD
// ==========================================

loadUsers();