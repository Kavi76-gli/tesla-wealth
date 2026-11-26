"use strict";

// =====================================================
// TESLA WEALTH — BINANCE PAY DEPOSIT
// =====================================================

// Use your production API when deployed.
// For local testing, change this to:
// http://localhost:5000/api
const API_BASE = "https://tesla-wealth.onrender.com/api";

const MIN_DEPOSIT = 50;
const MAX_DEPOSIT = 100000;
const MAX_FILE_SIZE = 3 * 1024 * 1024;

// =====================================================
// ELEMENTS
// =====================================================

const amountInput = document.getElementById("amount");
const paymentModal = document.getElementById("paymentModal");
const continueButton = document.getElementById("continuePayment");
const closeModalButton = document.getElementById("closeModal");
const modalAmount = document.getElementById("modalAmount");

const upiIdElement = document.getElementById("upiId");
const qrImage = document.getElementById("qrImage");
const qrLoading = document.getElementById("qrLoading");
const copyUpiButton = document.getElementById("copyUpi");
const upiPayButton = document.getElementById("upiPayButton");

const depositForm = document.getElementById("depositForm");
const utrInput = document.getElementById("utr");
const screenshotInput = document.getElementById("screenshot");
const preview = document.getElementById("preview");
const submitButton = document.getElementById("submitDeposit");

const historyList = document.getElementById("historyList");
const toast = document.getElementById("toast");
const limitsElement = document.getElementById("limits");

// =====================================================
// STATE
// =====================================================

let paymentSettings = {};
let selectedAmount = 0;
let qrImageUrl = "";

// =====================================================
// TOKEN
// =====================================================

function getToken() {
    return (
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        ""
    );
}

// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// =====================================================
// TOAST
// =====================================================

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// =====================================================
// FORMAT USDT / WALLET CURRENCY
// =====================================================

function formatUSDT(value) {
    return Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }) + " USDT";
}

function formatWallet(value) {
    return "$" + Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// =====================================================
// BUILD QR IMAGE URL
// =====================================================

function resolveImageUrl(imagePath) {
    if (!imagePath) return "";

    // Already an absolute URL.
    if (/^https?:\/\//i.test(imagePath)) {
        return imagePath;
    }

    // Relative upload path, e.g. /uploads/123-image.png
    const apiOrigin = new URL(API_BASE).origin;
    const normalizedPath = imagePath.startsWith("/")
        ? imagePath
        : `/${imagePath}`;

    return `${apiOrigin}${normalizedPath}`;
}

// =====================================================
// LOAD PAYMENT SETTINGS
// =====================================================

async function loadPaymentSettings() {
    try {
        const data = await apiRequest("/deposit/payment-settings");

        if (!data.success || !data.setting) {
            throw new Error("Payment settings are unavailable.");
        }

        paymentSettings = data.setting;

        const minimum = Number(
            paymentSettings.minimumDeposit ?? MIN_DEPOSIT
        );

        const maximum = Number(
            paymentSettings.maximumDeposit ?? MAX_DEPOSIT
        );

        amountInput.min = minimum;
        amountInput.max = maximum;
        amountInput.step = "0.01";

        if (limitsElement) {
            limitsElement.textContent =
                `Minimum ${formatUSDT(minimum)} · Maximum ${formatUSDT(maximum)}`;
        }

        amountInput.placeholder = `Minimum ${minimum} USDT`;

        document.querySelectorAll(".preset-btn").forEach(button => {
            const value = Number(button.dataset.amount);
            button.disabled = value < minimum || value > maximum;
        });

        // Load the Binance Pay QR saved from the admin settings.
        qrImageUrl = resolveImageUrl(paymentSettings.qrImage);

        if (qrImageUrl) {
            qrImage.src = qrImageUrl;
            qrImage.classList.remove("loaded");

            qrImage.onload = () => {
                qrImage.classList.add("loaded");
                qrLoading.style.display = "none";
            };

            qrImage.onerror = () => {
                qrImage.classList.remove("loaded");
                qrLoading.style.display = "block";
                qrLoading.textContent =
                    "Unable to load the saved Binance Pay QR. Please contact support.";
            };
        } else {
            qrImage.removeAttribute("src");
            qrImage.classList.remove("loaded");
            qrLoading.style.display = "block";
            qrLoading.textContent =
                "Binance Pay QR has not been configured yet.";
        }

        // The model currently has no Binance Pay ID field.
        // Show the configured payment instructions instead.
        if (upiIdElement) {
            upiIdElement.textContent =
                paymentSettings.depositInstruction ||
                "Scan the Binance Pay QR code";
        }

        // UPI-specific actions are not applicable to Binance Pay QR.
        if (copyUpiButton) {
            copyUpiButton.style.display = "none";
        }

        if (upiPayButton) {
            upiPayButton.style.display = "none";
        }

    } catch (error) {
        console.error("Payment settings error:", error);
        showToast(error.message);
    }
}

// =====================================================
// PRESET AMOUNT
// =====================================================

document.querySelectorAll(".preset-btn").forEach(button => {
    button.addEventListener("click", () => {
        if (button.disabled) return;

        const amount = Number(button.dataset.amount);

        amountInput.value = amount;
        selectedAmount = amount;

        document.querySelectorAll(".preset-btn").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");
    });
});

amountInput.addEventListener("input", () => {
    selectedAmount = Number(amountInput.value);

    document.querySelectorAll(".preset-btn").forEach(button => {
        button.classList.toggle(
            "active",
            Number(button.dataset.amount) === selectedAmount
        );
    });
});

// =====================================================
// VALIDATE AMOUNT
// =====================================================

function validateAmount() {
    const amount = Number(amountInput.value);

    const minimum = Number(
        paymentSettings.minimumDeposit ?? MIN_DEPOSIT
    );

    const maximum = Number(
        paymentSettings.maximumDeposit ?? MAX_DEPOSIT
    );

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Please enter a valid deposit amount in USDT.");
        return false;
    }

    if (amount < minimum) {
        showToast(`Minimum deposit is ${formatUSDT(minimum)}.`);
        return false;
    }

    if (amount > maximum) {
        showToast(`Maximum deposit is ${formatUSDT(maximum)}.`);
        return false;
    }

    selectedAmount = amount;
    return true;
}

// =====================================================
// OPEN PAYMENT MODAL
// =====================================================

continueButton.addEventListener("click", () => {
    if (!getToken()) {
        showToast("Please login to continue.");

        setTimeout(() => {
            window.location.href = "auth.html";
        }, 1200);

        return;
    }

    if (!validateAmount()) return;

    if (!qrImageUrl) {
        showToast("Binance Pay QR is not configured yet.");
        return;
    }

    modalAmount.textContent = formatUSDT(selectedAmount);

    depositForm.reset();

    preview.style.display = "none";
    preview.removeAttribute("src");

    // Re-apply the saved QR after resetting the form.
    qrImage.src = qrImageUrl;
    qrLoading.style.display = "none";

    paymentModal.classList.add("active");
    document.body.style.overflow = "hidden";
});

// =====================================================
// CLOSE MODAL
// =====================================================

function closePaymentModal() {
    paymentModal.classList.remove("active");
    document.body.style.overflow = "";
}

closeModalButton.addEventListener("click", closePaymentModal);

paymentModal.addEventListener("click", event => {
    if (event.target === paymentModal) {
        closePaymentModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closePaymentModal();
    }
});

// =====================================================
// SCREENSHOT PREVIEW
// =====================================================

screenshotInput.addEventListener("change", () => {
    const file = screenshotInput.files[0];

    if (!file) {
        preview.style.display = "none";
        preview.removeAttribute("src");
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        screenshotInput.value = "";
        preview.style.display = "none";
        showToast("Please select a JPG, PNG or WEBP image.");
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        screenshotInput.value = "";
        preview.style.display = "none";
        showToast("Screenshot must be smaller than 3MB.");
        return;
    }

    const reader = new FileReader();

    reader.onload = event => {
        preview.src = event.target.result;
        preview.style.display = "block";
    };

    reader.readAsDataURL(file);
});

// =====================================================
// SUBMIT DEPOSIT
// =====================================================

depositForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!getToken()) {
        showToast("Your session has expired. Please login.");
        return;
    }

    if (!validateAmount()) return;

    const utr = utrInput.value.trim();
    const screenshot = screenshotInput.files[0];

    if (!utr) {
        showToast("Please enter your Binance Pay transaction reference.");
        utrInput.focus();
        return;
    }

    if (!screenshot) {
        showToast("Please upload your payment screenshot.");
        return;
    }

    if (screenshot.size > MAX_FILE_SIZE) {
        showToast("Screenshot must be smaller than 3MB.");
        return;
    }

    const formData = new FormData();

    formData.append("amount", String(selectedAmount));
    formData.append("utr", utr);
    formData.append("screenshot", screenshot);

    submitButton.disabled = true;
    submitButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Submitting...
    `;

    try {
        const data = await apiRequest("/deposit/create", {
            method: "POST",
            body: formData
        });

        if (!data.success) {
            throw new Error(data.message || "Deposit submission failed.");
        }

        showToast(
            data.message || "Deposit request submitted successfully."
        );

        depositForm.reset();

        preview.style.display = "none";
        preview.removeAttribute("src");

        closePaymentModal();

        amountInput.value = "";
        selectedAmount = 0;

        document.querySelectorAll(".preset-btn").forEach(button => {
            button.classList.remove("active");
        });

        await loadDepositHistory();

    } catch (error) {
        console.error("Deposit submission error:", error);
        showToast(error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = `
            <span>Submit Deposit Request</span>
            <i class="fa-solid fa-paper-plane"></i>
        `;
    }
});

// =====================================================
// LOAD DEPOSIT HISTORY
// =====================================================

async function loadDepositHistory() {
    try {
        const data = await apiRequest("/deposit/my");

        if (!data.success) {
            throw new Error("Unable to load deposit history.");
        }

        const deposits = Array.isArray(data.deposits)
            ? data.deposits
            : [];

        if (!deposits.length) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fa-solid fa-wallet"></i>
                    <p>No deposit history available.</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = deposits.map(deposit => {
            const status = String(deposit.status || "Pending");
            const statusClass = status.toLowerCase();

            const date = deposit.createdAt
                ? new Date(deposit.createdAt).toLocaleString("en-IN")
                : "Date unavailable";

            return `
                <div class="history-item">
                    <div class="history-left">
                        <div class="history-icon">
                            <i class="fa-solid fa-wallet"></i>
                        </div>

                        <div>
                            <strong>USDT Deposit</strong>
                            <small>${escapeHTML(date)}</small>
                        </div>
                    </div>

                    <div class="history-right">
                        <div class="history-amount">
                            ${formatUSDT(deposit.amount)}
                        </div>

                        <span class="status ${escapeHTML(statusClass)}">
                            ${escapeHTML(status)}
                        </span>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Deposit history error:", error);

        historyList.innerHTML = `
            <div class="empty-history">
                Unable to load deposit history.
            </div>
        `;
    }
}

// =====================================================
// SAFE HTML
// =====================================================
function escapeHTML(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value ?? "").replace(/[&<>"']/g, character => {
        return entities[character];
    });
}
// =====================================================
// INITIALIZE
// =====================================================

async function initializeDepositPage() {
    if (!getToken()) {
        showToast("Please login to access deposits.");

        setTimeout(() => {
            window.location.href = "auth.html";
        }, 1200);

        return;
    }

    await loadPaymentSettings();
    await loadDepositHistory();
}

initializeDepositPage();