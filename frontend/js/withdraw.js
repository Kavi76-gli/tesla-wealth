"use strict";

(() => {

    /* ==========================================
       CONFIGURATION
    ========================================== */

    const API_BASE =
        window.TESLA_API_BASE ||
        (
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1"
                ? "http://localhost:5000/api"
                : "https://tesla-wealth.onrender.com/api"
        );

    const WITHDRAW_API = `${API_BASE}/withdrawals`;
    const DASHBOARD_API = `${API_BASE}/investment/dashboard`;
    const MIN_WITHDRAWAL = 500;
    const FEE_PERCENT = 3;

    const $ = id => document.getElementById(id);


    /* ==========================================
       STATE
    ========================================== */

    const state = {
        walletBalance: null,
        withdrawableBalance: null,
        balanceLoaded: false,
        withdrawalEnabled: true,
        submitting: false,
        history: [],
        pendingPayload: null
    };


    /* ==========================================
       AUTHENTICATION
    ========================================== */

    function getToken() {
        return (
            localStorage.getItem("ki_token") ||
            localStorage.getItem("token") ||
            ""
        );
    }


    function redirectToLogin() {
        localStorage.removeItem("ki_token");
        localStorage.removeItem("token");
        window.location.replace("auth.html");
    }


    /* ==========================================
       MONEY HELPERS
    ========================================== */

    function roundMoney(value) {
        return Math.round(
            (Number(value) + Number.EPSILON) * 100
        ) / 100;
    }


    function money(value) {
        const number = Number(value);

        return "$" + (
            Number.isFinite(number) ? number : 0
        ).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }


    function validNumber(value) {
        return (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(Number(value))
        );
    }


    /* ==========================================
       MESSAGE SYSTEM
    ========================================== */

    function showMessage(
        message,
        type = "error",
        target = "withdrawMessage"
    ) {
        const element = $(target);

        if (!element) return;

        element.textContent = message;

        element.className =
            (target === "pageAlert" ? "alert " : "form-message ") +
            type;
    }


    function clearMessage(target = "withdrawMessage") {
        const element = $(target);

        if (!element) return;

        element.textContent = "";

        element.className =
            (target === "pageAlert" ? "alert" : "form-message") +
            " hidden";
    }


    function showToast(message) {
        const toast = $("toast");

        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }


    /* ==========================================
       API REQUEST
    ========================================== */

    async function apiRequest(url, options = {}) {
        const token = getToken();

        if (!token) {
            redirectToLogin();
            throw new Error("Please login to continue.");
        }

        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        };

        const isFormData =
            options.body instanceof FormData;

        if (options.body && !isFormData) {
            headers["Content-Type"] = "application/json";
        }

        let response;

        try {
            response = await fetch(url, {
                ...options,
                headers
            });
        } catch {
            throw new Error(
                "Unable to connect to Tesla Wealth. Please check your internet connection."
            );
        }

        const raw = await response.text();

        let data = {};

        try {
            data = raw ? JSON.parse(raw) : {};
        } catch {
            data = {
                message: raw || "Unexpected server response."
            };
        }

        if (response.status === 401) {
            redirectToLogin();

            throw new Error(
                "Your session has expired. Please login again."
            );
        }

        if (!response.ok || data.success === false) {
            const error = new Error(
                data.message ||
                data.error ||
                data.alertMessage ||
                `Server request failed (${response.status}).`
            );

            error.responseData = data;
            error.status = response.status;

            throw error;
        }

        return data;
    }


    /* ==========================================
       RESPONSE HELPERS
    ========================================== */

    function collectObjects(data) {
        const objects = [];
        const queue = [data];
        const visited = new Set();

        while (queue.length && objects.length < 100) {
            const current = queue.shift();

            if (
                !current ||
                typeof current !== "object" ||
                visited.has(current)
            ) {
                continue;
            }

            visited.add(current);

            if (Array.isArray(current)) {
                current.forEach(item => {
                    if (item && typeof item === "object") {
                        queue.push(item);
                    }
                });

                continue;
            }

            objects.push(current);

            Object.values(current).forEach(value => {
                if (value && typeof value === "object") {
                    queue.push(value);
                }
            });
        }

        return objects;
    }


    function findNumber(objects, keys) {
        for (const object of objects) {
            for (const key of keys) {
                if (validNumber(object[key])) {
                    return Number(object[key]);
                }
            }
        }

        return null;
    }


    function findArray(objects, keys) {
        for (const object of objects) {
            for (const key of keys) {
                if (Array.isArray(object[key])) {
                    return object[key];
                }
            }
        }

        return [];
    }


    /* ==========================================
       LOAD DASHBOARD BALANCES
    ========================================== */

    async function loadBalance() {
        const balanceElement = $("balance");
        const walletElement = $("walletBalance");

        if (balanceElement) {
            balanceElement.textContent = "Loading...";
        }

        if (walletElement) {
            walletElement.textContent = "Loading...";
        }

        state.balanceLoaded = false;

        try {
            const data = await apiRequest(DASHBOARD_API);
            const objects = collectObjects(data);

            const wallet = findNumber(objects, [
                "walletBalance",
                "balance"
            ]);

            const withdrawable = findNumber(objects, [
                "withdrawableEarnings",
                "withdrawableBalance",
                "eligibleEarnings",
                "availableToWithdraw"
            ]);

            state.walletBalance = wallet;
            state.withdrawableBalance = withdrawable;
            state.balanceLoaded = withdrawable !== null;

            if (balanceElement) {
                balanceElement.textContent =
                    withdrawable === null
                        ? "Unavailable"
                        : money(withdrawable);
            }

            if (walletElement) {
                walletElement.textContent =
                    wallet === null
                        ? "Unavailable"
                        : money(wallet);
            }

            updateCalculation();

            if (withdrawable === null) {
                showMessage(
                    "Your withdrawable balance could not be found in the dashboard response. Please check your backend dashboard fields.",
                    "error",
                    "pageAlert"
                );
            } else {
                clearMessage("pageAlert");
            }

        } catch (error) {
            state.balanceLoaded = false;

            if (balanceElement) {
                balanceElement.textContent = "Unavailable";
            }

            if (walletElement) {
                walletElement.textContent = "Unavailable";
            }

            showMessage(
                error.message,
                "error",
                "pageAlert"
            );
        }
    }


    /* ==========================================
       WITHDRAWAL CONTROL
    ========================================== */

    async function loadWithdrawalControl() {
        try {
            const data = await apiRequest(
                `${WITHDRAW_API}/my/control`
            );

            const objects = collectObjects(data);

            let enabled = true;
            let message = "";

            for (const object of objects) {
                if (typeof object.withdrawalEnabled === "boolean") {
                    enabled = object.withdrawalEnabled;
                }

                if (
                    typeof object.withdrawalDisabledMessage === "string" &&
                    object.withdrawalDisabledMessage
                ) {
                    message = object.withdrawalDisabledMessage;
                }

                if (
                    typeof object.alertMessage === "string" &&
                    object.alertMessage
                ) {
                    message = object.alertMessage;
                }
            }

            state.withdrawalEnabled = enabled;

            renderWithdrawalControl(message);

        } catch (error) {
            console.error(
                "Withdrawal control loading error:",
                error
            );
        }
    }


    function renderWithdrawalControl(message = "") {
        const card = $("restrictionCard");
        const messageElement = $("restrictionMessage");
        const form = $("withdrawalForm");

        if (state.withdrawalEnabled) {
            card?.classList.add("hidden");

            if (form) {
                form.querySelectorAll(
                    "input, select, button"
                ).forEach(element => {
                    element.disabled = false;
                });
            }

            return;
        }

        if (card) {
            card.classList.remove("hidden");
        }

        if (messageElement) {
            messageElement.textContent =
                message ||
                "Your withdrawal facility is temporarily unavailable. Please contact support.";
        }

        if (form) {
            form.querySelectorAll(
                "input, select, button"
            ).forEach(element => {
                element.disabled = true;
            });
        }
    }


    /* ==========================================
       WITHDRAWAL CALCULATION
    ========================================== */

    function updateCalculation() {
        const amount = Number(
            $("withdrawAmount")?.value || 0
        );

        const safeAmount =
            Number.isFinite(amount) && amount > 0
                ? amount
                : 0;

        const fee = roundMoney(
            safeAmount * FEE_PERCENT / 100
        );

        const net = roundMoney(
            safeAmount - fee
        );

        $("summaryAmount").textContent = money(safeAmount);
        $("summaryFee").textContent = money(fee);
        $("summaryNet").textContent = money(net);
    }


    /* ==========================================
       PAYMENT METHOD
    ========================================== */

    function updatePaymentFields() {
        const method = $("paymentMethod").value;

        $("upiFields").classList.toggle(
            "hidden",
            method !== "UPI"
        );

        $("bankFields").classList.toggle(
            "hidden",
            method !== "Bank"
        );
    }


    /* ==========================================
       VALIDATE FORM
    ========================================== */

    function isValidUPI(upiId) {
        const upiRegex =
            /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,254}@[a-zA-Z0-9]{2,64}$/;

        return upiRegex.test(
            String(upiId || "").trim()
        );
    }


    function validateWithdrawal() {
        clearMessage();

        if (!state.balanceLoaded) {
            throw new Error(
                "Your withdrawable balance is not available yet. Please refresh the page."
            );
        }

        if (!state.withdrawalEnabled) {
            throw new Error(
                "Withdrawals are currently disabled for your account."
            );
        }

        const amount = Number(
            $("withdrawAmount").value
        );

        if (
            !validNumber(amount) ||
            amount < MIN_WITHDRAWAL
        ) {
            throw new Error(
                "Minimum withdrawal amount is $500."
            );
        }

        if (amount > state.withdrawableBalance) {
            throw new Error(
                "Your withdrawal amount exceeds your available withdrawable balance."
            );
        }

        const method = $("paymentMethod").value;

        if (!method) {
            throw new Error(
                "Please select a payment method."
            );
        }

        const payload = {
            amount: roundMoney(amount),
            paymentMethod: method
        };


        /* ==========================================
           UPI VALIDATION
        ========================================== */

        if (method === "UPI") {
            const upiId = $("upiId").value
                .trim()
                .toLowerCase();

            if (!isValidUPI(upiId)) {
                throw new Error(
                    "Please enter a valid UPI ID. Example: jaishrishyamji12@axl"
                );
            }

            payload.upiId = upiId;
        }


        /* ==========================================
           BANK VALIDATION
        ========================================== */

        if (method === "Bank") {
            const accountHolder =
                $("accountHolder").value.trim();

            const bankName =
                $("bankName").value.trim();

            const accountNumber =
                $("accountNumber").value.trim();

            const ifsc =
                $("ifsc").value.trim().toUpperCase();

            if (
                !accountHolder ||
                !bankName ||
                !accountNumber ||
                !ifsc
            ) {
                throw new Error(
                    "Please complete all bank details."
                );
            }

            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
                throw new Error(
                    "Please enter a valid IFSC code."
                );
            }

            payload.accountHolder = accountHolder;
            payload.bankName = bankName;
            payload.accountNumber = accountNumber;
            payload.ifsc = ifsc;
        }

        return payload;
    }


    /* ==========================================
       OPEN CONFIRMATION
    ========================================== */

    function openConfirmation(payload) {
        state.pendingPayload = payload;

        const fee = roundMoney(
            payload.amount * FEE_PERCENT / 100
        );

        const net = roundMoney(
            payload.amount - fee
        );

        $("confirmationText").textContent =
            `You requested ${money(payload.amount)}. ` +
            `The 3% platform fee is ${money(fee)}. ` +
            `Your expected payout is ${money(net)}. ` +
            `Payment method: ${payload.paymentMethod}.`;

        $("confirmModal").classList.remove("hidden");
    }


    /* ==========================================
       CLOSE CONFIRMATION
    ========================================== */

    function closeConfirmation() {
        $("confirmModal").classList.add("hidden");
        state.pendingPayload = null;
    }


    /* ==========================================
       CREATE WITHDRAWAL
    ========================================== */

    async function createWithdrawal() {
        if (
            state.submitting ||
            !state.pendingPayload
        ) {
            return;
        }

        state.submitting = true;

        $("confirmWithdraw").disabled = true;
        $("withdrawButton").disabled = true;
        $("confirmWithdraw").textContent = "Processing...";

        try {
            const result = await apiRequest(
                `${WITHDRAW_API}/create`,
                {
                    method: "POST",
                    body: JSON.stringify(
                        state.pendingPayload
                    )
                }
            );


            /* ==========================================
               SUCCESS
            ========================================== */

            closeConfirmation();

            $("withdrawalForm").reset();

            updatePaymentFields();
            updateCalculation();

            showToast(
                result.message ||
                "Withdrawal request submitted successfully."
            );

            clearMessage();

            await Promise.all([
                loadBalance(),
                loadWithdrawalHistory(),
                loadWithdrawalControl()
            ]);

        } catch (error) {
            console.error(
                "WITHDRAWAL ERROR:",
                error
            );

            console.error(
                "BACKEND RESPONSE:",
                error.responseData
            );

            const responseData =
                error.responseData || {};

            const disabledMessage =
                responseData.alertMessage ||
                responseData.withdrawalDisabledMessage;

            if (disabledMessage) {
                state.withdrawalEnabled = false;

                renderWithdrawalControl(
                    disabledMessage
                );
            }

            showMessage(
                disabledMessage ||
                responseData.message ||
                responseData.error ||
                error.message ||
                "Unable to submit withdrawal request.",
                "error"
            );

        } finally {
            state.submitting = false;

            $("confirmWithdraw").disabled = false;

            $("withdrawButton").disabled =
                !state.withdrawalEnabled;

            $("confirmWithdraw").textContent = "Confirm";
        }
    }


    /* ==========================================
       LOAD WITHDRAWAL HISTORY
    ========================================== */

    async function loadWithdrawalHistory() {
        const container = $("withdrawalHistory");

        container.innerHTML = `
            <div class="loading-message">
                Loading withdrawal history...
            </div>
        `;

        try {
            const data = await apiRequest(
                `${WITHDRAW_API}/my`
            );

            const objects = collectObjects(data);

            const history = findArray(objects, [
                "withdrawals",
                "history",
                "records",
                "items"
            ]);

            state.history = history;

            renderWithdrawalHistory(history);

        } catch (error) {
            container.innerHTML = `
                <div class="empty-message">
                    ${escapeHTML(error.message)}
                </div>
            `;
        }
    }


    /* ==========================================
       SAFE HTML
    ========================================== */

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


    /* ==========================================
       RENDER HISTORY
    ========================================== */

    function renderWithdrawalHistory(history) {
        const container = $("withdrawalHistory");

        if (!history.length) {
            container.innerHTML = `
                <div class="empty-message">
                    No withdrawal history found.
                </div>
            `;

            return;
        }

        container.innerHTML = history.map(item => {
            const amount = Number(item.amount || 0);
            const fee = Number(item.platformFee || 0);

            const net = Number(
                item.netAmount ??
                (amount - fee)
            );

            const status = String(
                item.status || "Pending"
            );

            const normalizedStatus =
                status.toLowerCase();

            const statusClass = [
                "pending",
                "approved",
                "completed",
                "rejected"
            ].includes(normalizedStatus)
                ? normalizedStatus
                : "pending";

            const dateValue =
                item.createdAt ||
                item.date ||
                item.requestedAt;

            const date = dateValue
                ? new Date(dateValue).toLocaleString("en-US")
                : "Date unavailable";

            const method =
                item.paymentMethod ||
                item.method ||
                "Not specified";

            const remark =
                item.remark ||
                item.rejectionReason ||
                "";

            return `
                <div class="history-item">

                    <div class="history-top">

                        <div>
                            <div class="history-amount">
                                ${money(amount)}
                            </div>

                            <div class="history-date">
                                ${escapeHTML(date)}
                            </div>
                        </div>

                        <span class="status ${statusClass}">
                            ${escapeHTML(status)}
                        </span>

                    </div>

                    <div class="history-details">

                        Payment: ${escapeHTML(method)}
                        <br>

                        Platform fee: ${money(fee)}
                        <br>

                        Expected payout: ${money(net)}

                        ${
                            remark
                                ? `<br>Remark: ${escapeHTML(remark)}`
                                : ""
                        }

                    </div>

                </div>
            `;
        }).join("");
    }


    /* ==========================================
       EVENT LISTENERS
    ========================================== */

    $("withdrawAmount").addEventListener(
        "input",
        updateCalculation
    );

    $("paymentMethod").addEventListener(
        "change",
        updatePaymentFields
    );

    document.querySelectorAll(
        ".quick-amounts button"
    ).forEach(button => {
        button.addEventListener("click", () => {
            $("withdrawAmount").value =
                button.dataset.amount;

            updateCalculation();
        });
    });

    $("withdrawalForm").addEventListener(
        "submit",
        event => {
            event.preventDefault();

            try {
                const payload = validateWithdrawal();
                openConfirmation(payload);
            } catch (error) {
                showMessage(error.message);
            }
        }
    );

    $("cancelConfirm").addEventListener(
        "click",
        closeConfirmation
    );

    $("confirmWithdraw").addEventListener(
        "click",
        createWithdrawal
    );

    $("refreshHistory").addEventListener(
        "click",
        loadWithdrawalHistory
    );


    /* ==========================================
       INITIALIZE
    ========================================== */

    async function initialize() {
        if (!getToken()) {
            redirectToLogin();
            return;
        }

        await Promise.all([
            loadBalance(),
            loadWithdrawalControl(),
            loadWithdrawalHistory()
        ]);
    }

    initialize();

})();