// ==========================================
// API URL
// ==========================================

const API_URL = "https://bitcoin-m7kz.onrender.com/api/auth";

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

// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        const response = await fetch(`${API_URL}/admin/dashboard`, {

            headers: {
                Authorization: `Bearer ${token}`
            }

        });

        const data = await response.json();

        if (!response.ok) {

            alert(data.message || "Access Denied");

            return;

        }

        const dashboard = data.dashboard;

        document.getElementById("totalUsers").innerText =
            dashboard.totalUsers;

        document.getElementById("activeUsers").innerText =
            dashboard.activeUsers;

        document.getElementById("blockedUsers").innerText =
            dashboard.blockedUsers;

        document.getElementById("admins").innerText =
            dashboard.admins;

        document.getElementById("totalDeposits").innerText =
            "₹" + dashboard.totalDeposits;

        document.getElementById("totalWithdrawals").innerText =
            "₹" + dashboard.totalWithdrawals;

        document.getElementById("investmentPlans").innerText =
            dashboard.investmentPlans;

        document.getElementById("purchaseHistory").innerText =
            dashboard.purchaseHistory;

        document.getElementById("dailyIncome").innerText =
            "₹" + dashboard.dailyIncome;

    } catch (error) {

        console.error(error);

        alert("Server Error");

    }

}

// ==========================================
// LOAD ADMIN NAME
// ==========================================

async function loadProfile() {

    try {

        const response = await fetch(`${API_URL}/admin/profile`, {

            headers: {
                Authorization: `Bearer ${token}`
            }

        });

        const data = await response.json();

        if (data.success) {

            document.getElementById("adminName").innerText =
                data.user.name;

        }

    } catch (error) {

        console.log(error);

    }

}

// ==========================================
// LOGOUT
// ==========================================

document.getElementById("logoutBtn").addEventListener("click", () => {

    if (!confirm("Logout from Admin Panel?")) return;

    localStorage.removeItem("adminToken");
    localStorage.removeItem("ki_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "../auth.html";

});

// ==========================================
// LOAD DATA
// ==========================================

loadDashboard();

loadProfile();