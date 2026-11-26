"use strict";

// ==========================================
// TESLA WEALTH — ADMIN PAYMENT SETTINGS
// ==========================================

const API_URL = "https://tesla-wealth.onrender.com/api/deposit";
const MAX_QR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_QR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ==========================================
// TOKEN
// ==========================================

function getToken() {
    return (
        localStorage.getItem("adminToken") ||
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        ""
    );
}

// ==========================================
// CHECK LOGIN
// ==========================================

if (!getToken()) {
    alert("Please login first.");
    window.location.href = "../auth.html";
}

// ==========================================
// ELEMENTS
// ==========================================

const paymentForm = document.getElementById("paymentForm");
const qrInput = document.getElementById("qrImage");
const qrPreview = document.getElementById("qrPreview");
const qrFileName = document.getElementById("qrFileName");
const qrPreviewLoading = document.getElementById("qrPreviewLoading");

const saveBtn =
    document.getElementById("saveBtn") ||
    document.getElementById("savePaymentBtn");

// ==========================================
// IMAGE URL
// ==========================================

function resolveImageUrl(imagePath) {
    if (!imagePath) return "";

    // Keep fully qualified image URLs unchanged.
    if (/^https?:\/\//i.test(imagePath)) {
        return imagePath;
    }

    const apiOrigin = new URL(API_URL).origin;
    const normalizedPath = imagePath.startsWith("/")
        ? imagePath
        : `/${imagePath}`;

    return `${apiOrigin}${normalizedPath}`;
}

// ==========================================
// QR PREVIEW DISPLAY
// ==========================================

function showQrLoading(show) {
    if (qrPreviewLoading) {
        qrPreviewLoading.style.display = show ? "block" : "none";
    }
}

function displayQrImage(imageUrl) {
    if (!qrPreview) return;

    if (!imageUrl) {
        qrPreview.removeAttribute("src");
        qrPreview.style.display = "none";
        showQrLoading(false);
        return;
    }

    showQrLoading(true);
    qrPreview.style.display = "none";

    // Set handlers before assigning src, so cached images are handled too.
    qrPreview.onload = function () {
        qrPreview.style.display = "block";
        showQrLoading(false);
    };

    qrPreview.onerror = function () {
        qrPreview.style.display = "none";
        showQrLoading(false);
        console.error("Could not load the QR image:", imageUrl);
    };

    qrPreview.src = imageUrl;
}

// ==========================================
// LOAD PAYMENT SETTINGS
// ==========================================

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/payment-settings`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load payment settings."
            );
        }

        const setting = data.setting || {};

        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        };

        setValue("companyName", setting.companyName || "");
        setValue("paymentType", setting.paymentType || "BINANCE_PAY");
        setValue("upiId", setting.upiId || "");
        setValue("accountHolder", setting.accountHolder || "");
        setValue("bankName", setting.bankName || "");
        setValue("accountNumber", setting.accountNumber || "");
        setValue("ifscCode", setting.ifscCode || "");
        setValue("minimumDeposit", setting.minimumDeposit ?? 50);
        setValue("maximumDeposit", setting.maximumDeposit ?? 100000);
        setValue("depositInstruction", setting.depositInstruction || "");

        const imageUrl = resolveImageUrl(setting.qrImage);
        displayQrImage(imageUrl);

        if (qrFileName && (!qrInput || !qrInput.files.length)) {
            qrFileName.textContent = imageUrl
                ? "Saved QR image"
                : "No QR image selected";
        }
    } catch (error) {
        console.error("Load payment settings error:", error);
        alert(error.message || "Unable to load payment settings.");
    }
}

// ==========================================
// QR IMAGE SELECTION AND PREVIEW
// ==========================================

if (qrInput) {
    qrInput.addEventListener("change", function () {
        const file = this.files && this.files[0];

        if (!file) {
            if (qrFileName) {
                qrFileName.textContent = "No QR image selected";
            }
            showQrLoading(false);
            return;
        }

        if (!ALLOWED_QR_TYPES.includes(file.type)) {
            this.value = "";

            if (qrFileName) {
                qrFileName.textContent = "No QR image selected";
            }

            alert("Please select a PNG, JPG, or WEBP image.");
            return;
        }

        if (file.size > MAX_QR_SIZE) {
            this.value = "";

            if (qrFileName) {
                qrFileName.textContent = "No QR image selected";
            }

            alert("QR image must be 5 MB or smaller.");
            return;
        }

        if (qrFileName) {
            qrFileName.textContent = file.name;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            displayQrImage(event.target.result);
        };

        reader.onerror = function () {
            alert("Unable to read the selected image.");
            showQrLoading(false);
        };

        reader.readAsDataURL(file);
    });
}

// ==========================================
// SAVE PAYMENT SETTINGS
// ==========================================

if (paymentForm) {
    paymentForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!getToken()) {
            alert("Your session has expired. Please login again.");
            window.location.href = "../auth.html";
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML =
                '<i class="fa fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const getValue = (id) => {
                const element = document.getElementById(id);
                return element ? element.value.trim() : "";
            };

            const formData = new FormData();

            formData.append("companyName", getValue("companyName"));
            formData.append("paymentType", getValue("paymentType"));
            formData.append("upiId", getValue("upiId"));
            formData.append("accountHolder", getValue("accountHolder"));
            formData.append("bankName", getValue("bankName"));
            formData.append("accountNumber", getValue("accountNumber"));
            formData.append("ifscCode", getValue("ifscCode"));
            formData.append("minimumDeposit", getValue("minimumDeposit"));
            formData.append("maximumDeposit", getValue("maximumDeposit"));
            formData.append(
                "depositInstruction",
                getValue("depositInstruction")
            );

            const qrFile =
                qrInput && qrInput.files && qrInput.files[0]
                    ? qrInput.files[0]
                    : null;

            if (qrFile) {
                if (!ALLOWED_QR_TYPES.includes(qrFile.type)) {
                    throw new Error(
                        "Please select a JPG, PNG, or WEBP QR image."
                    );
                }

                if (qrFile.size > MAX_QR_SIZE) {
                    throw new Error("QR image must be 5 MB or smaller.");
                }

                // Must match upload.single("qrImage") in your backend route.
                formData.append("qrImage", qrFile);
            }

            const response = await fetch(`${API_URL}/payment-settings`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${getToken()}`
                },
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to save payment settings."
                );
            }

            alert(data.message || "Payment settings saved successfully.");

            // Reload from the backend to confirm the saved image URL.
            await loadSettings();

            if (qrInput) {
                qrInput.value = "";
            }
        } catch (error) {
            console.error("Save payment settings error:", error);
            alert(error.message || "Server error while saving settings.");
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Save Payment Settings';
            }
        }
    });
}

// ==========================================
// LOGOUT
// ==========================================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        if (!confirm("Logout?")) return;

        localStorage.removeItem("adminToken");
        localStorage.removeItem("ki_token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "../auth.html";
    });
}

// ==========================================
// INITIALIZE
// ==========================================

loadSettings();