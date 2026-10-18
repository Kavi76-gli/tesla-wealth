// ==========================================
// API URL
// ==========================================

const API_URL = "https://bitcoin-m7kz.onrender.com/api/deposit";

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
// LOAD PAYMENT SETTINGS
// ==========================================

async function loadSettings() {

    try {

        const response = await fetch(`${API_URL}/payment-settings`);

        const data = await response.json();

        console.log("Payment Settings Response:", data);

        if (!response.ok) {
            throw new Error(data.message || "Failed to load settings");
        }

        const setting = data.setting || {};

        document.getElementById("companyName").value = setting.companyName || "";
        document.getElementById("paymentType").value = setting.paymentType || "UPI";
        document.getElementById("upiId").value = setting.upiId || "";
        document.getElementById("accountHolder").value = setting.accountHolder || "";
        document.getElementById("bankName").value = setting.bankName || "";
        document.getElementById("accountNumber").value = setting.accountNumber || "";
        document.getElementById("ifscCode").value = setting.ifscCode || "";
        document.getElementById("minimumDeposit").value = setting.minimumDeposit || 100;
        document.getElementById("maximumDeposit").value = setting.maximumDeposit || 100000;
        document.getElementById("depositInstruction").value = setting.depositInstruction || "";

        if (setting.qrImage) {
            document.getElementById("qrPreview").src = setting.qrImage;
        }

    } catch (err) {

        console.error(err);

        alert(err.message);

    }

}
// ==========================================
// QR IMAGE PREVIEW
// ==========================================

document.getElementById("qrImage").addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        document.getElementById("qrPreview").src = e.target.result;

    };

    reader.readAsDataURL(file);

});

// ==========================================
// SAVE SETTINGS
// ==========================================
// ==========================================
// SAVE PAYMENT SETTINGS
// ==========================================

document.getElementById("paymentForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const saveBtn = document.getElementById("saveBtn");

    if (saveBtn) {

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

    }

    try {

        const formData = new FormData();

        formData.append("companyName",
            document.getElementById("companyName").value.trim());

        formData.append("paymentType",
            document.getElementById("paymentType").value);

        formData.append("upiId",
            document.getElementById("upiId").value.trim());

        formData.append("accountHolder",
            document.getElementById("accountHolder").value.trim());

        formData.append("bankName",
            document.getElementById("bankName").value.trim());

        formData.append("accountNumber",
            document.getElementById("accountNumber").value.trim());

        formData.append("ifscCode",
            document.getElementById("ifscCode").value.trim());

        formData.append("minimumDeposit",
            document.getElementById("minimumDeposit").value);

        formData.append("maximumDeposit",
            document.getElementById("maximumDeposit").value);

        formData.append("depositInstruction",
            document.getElementById("depositInstruction").value.trim());

        const qrImage = document.getElementById("qrImage").files[0];

        if (qrImage) {

            formData.append("qrImage", qrImage);

        }

        const response = await fetch(`${API_URL}/payment-settings`, {

            method: "PUT",

            headers: {

                Authorization: `Bearer ${token}`

            },

            body: formData

        });

        const data = await response.json();

        console.log("Payment Settings Response:", data);

        if (!response.ok) {

            throw new Error(data.message || "Failed to save payment settings.");

        }

        alert(data.message || "Payment Settings Saved Successfully.");

        loadSettings();

    }

    catch (error) {

        console.error("Payment Settings Error:", error);

        alert(error.message || "Server Error");

    }

    finally {

        if (saveBtn) {

            saveBtn.disabled = false;
            saveBtn.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Payment Settings';

        }

    }

});
// ==========================================
// LOGOUT
// ==========================================

document.getElementById("logoutBtn").addEventListener("click", () => {

    if (!confirm("Logout?")) return;

    localStorage.removeItem("adminToken");
    localStorage.removeItem("ki_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "../auth.html";

});

// ==========================================
// LOAD PAGE
// ==========================================

loadSettings();