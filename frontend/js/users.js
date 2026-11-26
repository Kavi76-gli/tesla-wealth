"use strict";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_BASE = "https://tesla-wealth.onrender.com/api";

const AUTH_API = `${API_BASE}/auth`;

const INVESTMENT_API = `${API_BASE}/investment`;


// ==========================================
// GET TOKEN
// ==========================================

const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// ==========================================
// SELECTED USER
// ==========================================

let selectedPlanUserId = null;


// ==========================================
// AUTHORIZATION
// ==========================================

if (!token) {

    alert("Please login first.");

    window.location.href = "../auth.html";

}


// ==========================================
// SAFE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[char];

    });

}


// ==========================================
// API REQUEST HELPER
// ==========================================

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {

        ...options,

        headers: {

            Authorization: `Bearer ${token}`,

            ...(options.headers || {})

        }

    });

    let data;

    try {

        data = await response.json();

    } catch {

        throw new Error("Invalid server response.");

    }

    if (!response.ok || data.success === false) {

        throw new Error(data.message || "Request failed.");

    }

    return data;

}


// ==========================================
// LOAD ALL USERS
// ==========================================

async function loadUsers() {

    try {

        const data = await apiRequest(
            `${AUTH_API}/admin/users`
        );

        renderUsers(data.users || []);

        updateCards(data.users || []);

    } catch (error) {

        console.error("Load users error:", error);

        alert(error.message || "Unable to load users.");

    }

}


// ==========================================
// RENDER USERS
// ==========================================

function renderUsers(users) {

    const table = document.getElementById("usersTable");

    table.innerHTML = "";

    if (!users.length) {

        table.innerHTML = `
            <tr>
                <td colspan="9">No users found.</td>
            </tr>
        `;

        return;

    }

    users.forEach((user, index) => {

        const wallet = Number(
            user.balance ?? user.wallet ?? 0
        );

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${index + 1}</td>

            <td>${escapeHTML(user.name)}</td>

            <td>${escapeHTML(user.phone)}</td>

            <td>₹${wallet.toFixed(2)}</td>

            <td>₹${Number(user.totalDeposit || 0).toFixed(2)}</td>

            <td>₹${Number(user.totalWithdraw || 0).toFixed(2)}</td>

            <td>₹${Number(user.totalInvestment || 0).toFixed(2)}</td>

            <td>

                <span class="${
                    user.isBlocked
                        ? "status-blocked"
                        : "status-active"
                }">

                    ${user.isBlocked ? "Blocked" : "Active"}

                </span>

            </td>

            <td class="user-actions">

                <button
                    class="btn view-btn"
                    onclick="viewUser('${user._id}')">

                    <i class="fas fa-eye"></i>
                    View

                </button>


                <button
                    class="btn plan-btn"
                    onclick="openPlanModal('${user._id}', '${escapeHTML(user.name)}')">

                    <i class="fas fa-sliders-h"></i>
                    Manage Plans

                </button>


                <button
                    class="btn block-btn"
                    onclick="toggleBlock('${user._id}')">

                    ${user.isBlocked ? "Unblock" : "Block"}

                </button>


                <button
                    class="btn delete-btn"
                    onclick="deleteUser('${user._id}')">

                    Delete

                </button>

            </td>

        `;

        table.appendChild(row);

    });

}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateCards(users) {

    document.getElementById("totalUsers").innerText =
        users.length;

    const active = users.filter(
        user => !user.isBlocked
    ).length;

    const blocked = users.filter(
        user => user.isBlocked
    ).length;

    document.getElementById("activeUsers").innerText =
        active;

    document.getElementById("blockedUsers").innerText =
        blocked;

    const today = new Date().toDateString();

    const todayUsers = users.filter(user => {

        return user.createdAt &&
            new Date(user.createdAt).toDateString() === today;

    }).length;

    document.getElementById("todayUsers").innerText =
        todayUsers;

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

        const data = await apiRequest(
            `${AUTH_API}/admin/users/block/${encodeURIComponent(id)}`,
            {
                method: "PATCH"
            }
        );

        alert(data.message || "User status updated.");

        await loadUsers();

    } catch (error) {

        console.error(error);

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

        const data = await apiRequest(
            `${AUTH_API}/admin/users/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        alert(data.message || "User deleted successfully.");

        await loadUsers();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// OPEN PLAN MANAGEMENT MODAL
// ==========================================

async function openPlanModal(userId, userName) {

    selectedPlanUserId = userId;

    const modal = document.getElementById("planModal");

    const planList = document.getElementById("planList");

    const loading = document.getElementById("planLoading");

    const message = document.getElementById("planMessage");

    document.getElementById("selectedUserName").innerText =
        userName;

    message.innerText = "";

    message.className = "plan-message";

    planList.innerHTML = "";

    loading.style.display = "block";

    modal.style.display = "flex";

    try {

        const data = await apiRequest(
            `${INVESTMENT_API}/admin/users/${encodeURIComponent(userId)}/plan-permissions`
        );

        renderPlanPermissions(data.permissions || []);

    } catch (error) {

        console.error("Plan permission error:", error);

        showPlanMessage(error.message, "error");

    } finally {

        loading.style.display = "none";

    }

}


// ==========================================
// RENDER PLAN PERMISSIONS
// ==========================================

function renderPlanPermissions(permissions) {

    const container = document.getElementById("planList");

    container.innerHTML = "";

    if (!permissions.length) {

        container.innerHTML = `
            <div class="plan-empty">
                No investment plans found.
            </div>
        `;

        return;

    }

    permissions.forEach(permission => {

        const card = document.createElement("div");

        card.className = "plan-permission-card";

        const enabled = permission.enabled !== false;

        const globalStatus =
            permission.globalStatus !== false;

        card.innerHTML = `

            <div class="plan-card-top">

                <div>

                    <h3>${escapeHTML(permission.planName)}</h3>

                    <p>
                        Plan Price:
                        <strong>₹${Number(permission.price || 0).toFixed(2)}</strong>
                    </p>

                    <p>
                        Plan Type:
                        ${escapeHTML(permission.planType || "Daily")}
                    </p>

                </div>


                <div class="plan-switch-area">

                    <label class="plan-switch">

                        <input
                            type="checkbox"
                            class="permission-toggle"
                            ${enabled ? "checked" : ""}
                        >

                        <span class="plan-slider"></span>

                    </label>

                    <span class="permission-status ${
                        enabled ? "enabled" : "disabled"
                    }">

                        ${enabled ? "Enabled" : "Disabled"}

                    </span>

                </div>

            </div>


            <div class="global-plan-status">

                Global Plan:

                <strong class="${
                    globalStatus ? "global-on" : "global-off"
                }">

                    ${globalStatus ? "ON" : "OFF"}

                </strong>

            </div>


            <div class="plan-settings">

                <label>
                    Maximum Lifetime Purchases
                </label>

                <input
                    type="number"
                    class="purchase-limit"
                    min="0"
                    step="1"
                    value="${Number(permission.maxLifetimePurchases || 0)}"
                >

                <small>
                    Enter 0 for unlimited purchases.
                </small>


                <label>
                    Restriction Message
                </label>

                <textarea
                    class="restriction-note"
                    rows="3"
                    maxlength="500"
                    placeholder="Enter the message displayed to this user..."
                >${escapeHTML(permission.restrictionNote || "")}</textarea>


                <button
                    type="button"
                    class="save-plan-btn"
                >

                    <i class="fas fa-save"></i>
                    Save Plan Settings

                </button>

            </div>

        `;


        const toggle = card.querySelector(".permission-toggle");

        const status = card.querySelector(".permission-status");

        const saveButton = card.querySelector(".save-plan-btn");


        // Update ON/OFF label immediately

        toggle.addEventListener("change", function () {

            status.textContent = this.checked
                ? "Enabled"
                : "Disabled";

            status.className = this.checked
                ? "permission-status enabled"
                : "permission-status disabled";

        });


        // Save individual plan permission

        saveButton.addEventListener("click", async function () {

            await savePlanPermission(
                permission.planId,
                card,
                saveButton
            );

        });


        container.appendChild(card);

    });

}


// ==========================================
// SAVE PLAN PERMISSION
// ==========================================

async function savePlanPermission(planId, card, button) {

    if (!selectedPlanUserId) {

        showPlanMessage("Please select a user.", "error");

        return;

    }

    const enabled = card.querySelector(
        ".permission-toggle"
    ).checked;

    const restrictionNote = card.querySelector(
        ".restriction-note"
    ).value.trim();

    const maxLifetimePurchases = Number(
        card.querySelector(".purchase-limit").value
    );


    // Validate purchase limit

    if (
        !Number.isInteger(maxLifetimePurchases) ||
        maxLifetimePurchases < 0
    ) {

        showPlanMessage(
            "Purchase limit must be a whole number greater than or equal to 0.",
            "error"
        );

        return;

    }


    // Require a message when disabled

    if (!enabled && !restrictionNote) {

        showPlanMessage(
            "Please enter a restriction message before disabling this plan.",
            "error"
        );

        return;

    }


    const originalText = button.innerHTML;

    button.disabled = true;

    button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Saving...
    `;


    try {

        const data = await apiRequest(

            `${INVESTMENT_API}/admin/users/${encodeURIComponent(selectedPlanUserId)}/plan-permissions/${encodeURIComponent(planId)}`,

            {

                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    enabled,

                    restrictionNote,

                    maxLifetimePurchases

                })

            }

        );


        showPlanMessage(
            data.message || "Investment plan settings saved successfully.",
            "success"
        );


        button.innerHTML = `
            <i class="fas fa-check"></i>
            Saved
        `;


    } catch (error) {

        console.error("Save permission error:", error);

        showPlanMessage(error.message, "error");

        button.innerHTML = originalText;

    } finally {

        button.disabled = false;

    }

}


// ==========================================
// PLAN MESSAGE
// ==========================================

function showPlanMessage(message, type) {

    const element = document.getElementById("planMessage");

    element.innerText = message;

    element.className = `plan-message ${type}`;

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closePlanModal() {

    document.getElementById("planModal").style.display = "none";

    selectedPlanUserId = null;

}


// Close when clicking outside modal

document.getElementById("planModal").addEventListener(
    "click",
    function (event) {

        if (event.target === this) {
            closePlanModal();
        }

    }
);


// ==========================================
// SEARCH USERS
// ==========================================

document.getElementById("searchUser").addEventListener(
    "input",
    function () {

        const value = this.value.toLowerCase();

        const rows = document.querySelectorAll(
            "#usersTable tr"
        );

        rows.forEach(row => {

            const text = row.innerText.toLowerCase();

            row.style.display =
                text.includes(value) ? "" : "none";

        });

    }
);


// ==========================================
// LOGOUT
// ==========================================

document.getElementById("logoutBtn").addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        localStorage.removeItem("ki_token");

        localStorage.removeItem("token");

        localStorage.removeItem("adminToken");

        localStorage.removeItem("user");

        window.location.href = "../auth.html";

    }
);


// ==========================================
// LOAD USERS
// ==========================================

if (token) {
    loadUsers();
}