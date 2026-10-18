// ============================================================
// WITHDRAW.JS
// Investment Earnings Withdrawal
// UPI / Bank
// 3% Platform Fee
// ============================================================

"use strict";


// ============================================================
// CONFIG
// ============================================================

const API_BASE =
    "http://localhost:5000/api";

const WITHDRAW_API =
    `${API_BASE}/withdrawals`;

const DASHBOARD_API =
    `${API_BASE}/investment/dashboard`;


// ============================================================
// CONSTANTS
// ============================================================

const MIN_WITHDRAWAL =
    500;

const PLATFORM_FEE_PERCENT =
    3;


// ============================================================
// AUTH TOKEN
// ============================================================

function getToken() {

    return (
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        ""
    );

}


const token =
    getToken();


// ============================================================
// AUTH CHECK
// ============================================================

if (!token) {

    window.location.href =
        "auth.html";

}


// ============================================================
// DOM HELPER
// ============================================================

function $(id) {

    return document.getElementById(id);

}


// ============================================================
// GLOBAL DATA
// ============================================================

let withdrawableEarnings = 0;

let currentWalletBalance = 0;

let selectedMethod = "upi";

let withdrawalHistory = [];


// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(
    url,
    options = {}
) {

    const currentToken =
        getToken();


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (currentToken) {

        headers.Authorization =
            `Bearer ${currentToken}`;

    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    const text =
        await response.text();


    let data = {};


    if (text) {

        try {

            data =
                JSON.parse(text);

        }

        catch {

            throw new Error(
                `Server returned invalid response (${response.status})`
            );

        }

    }


    // ========================================================
    // AUTH ERROR
    // ========================================================

    if (
        response.status === 401
    ) {

        localStorage.removeItem(
            "ki_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "adminToken"
        );


        alert(
            data.message ||
            data.msg ||
            "Session expired. Please login again."
        );


        window.location.href =
            "auth.html";


        return null;

    }


    // ========================================================
    // SERVER ERROR
    // ========================================================

    if (!response.ok) {

        throw new Error(

            data.message ||
            data.msg ||
            data.error ||
            `Request failed (${response.status})`

        );

    }


    return data;

}


// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(amount) {

    const number =
        Number(amount);


    if (
        !Number.isFinite(number)
    ) {

        return "0.00";

    }


    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


// ============================================================
// LOAD BALANCES
// ============================================================

async function loadBalance() {

    try {

        showBalanceLoading();


        const data =
            await apiRequest(
                DASHBOARD_API,
                {
                    method: "GET"
                }
            );


        if (!data) {

            return;

        }


        let dashboard =
            data.dashboard ||
            data.data ||
            data.user ||
            data;


        // ====================================================
        // WALLET BALANCE
        // ====================================================

        currentWalletBalance =
            Number(

                dashboard.wallet ??

                dashboard.balance ??

                dashboard.user?.wallet ??

                dashboard.user?.balance ??

                0

            ) || 0;


        // ====================================================
        // WITHDRAWABLE EARNINGS
        //
        // New backend field.
        // ====================================================

        withdrawableEarnings =
            Number(

                dashboard.withdrawableEarnings ??

                dashboard.user?.withdrawableEarnings ??

                data.withdrawableEarnings ??

                data.user?.withdrawableEarnings ??

                0

            ) || 0;


        updateBalanceUI();


        updateCalculation();


        return {

            balance:
                currentWalletBalance,

            withdrawableEarnings

        };


    }

    catch (error) {

        console.error(
            "Load Balance Error:",
            error
        );


        currentWalletBalance =
            0;

        withdrawableEarnings =
            0;


        updateBalanceUI();


        showError(
            "Unable to load withdrawal balance. Please refresh the page."
        );

    }

}


// ============================================================
// BALANCE LOADING UI
// ============================================================

function showBalanceLoading() {

    const earningsElements = [

        $("balance")

    ];


    earningsElements.forEach(
        element => {

            if (element) {

                element.textContent =
                    "Loading...";

            }

        }
    );


    const wallet =
        $("walletBalance");


    if (wallet) {

        wallet.textContent =
            "Loading...";

    }

}


// ============================================================
// UPDATE BALANCE UI
// ============================================================

function updateBalanceUI() {

    const earnings =
        $("balance");


    if (earnings) {

        earnings.textContent =
            `₹${formatMoney(
                withdrawableEarnings
            )}`;

    }


    const wallet =
        $("walletBalance");


    if (wallet) {

        wallet.textContent =
            `₹${formatMoney(
                currentWalletBalance
            )}`;

    }

}


// ============================================================
// WITHDRAWAL CALCULATION
// ============================================================

function calculateWithdrawal(amount) {

    const withdrawalAmount =
        Number(amount);


    if (
        !Number.isFinite(
            withdrawalAmount
        ) ||
        withdrawalAmount <= 0
    ) {

        return {

            amount: 0,

            fee: 0,

            net: 0,

            remaining:
                withdrawableEarnings

        };

    }


    const fee =
        withdrawalAmount *
        (
            PLATFORM_FEE_PERCENT /
            100
        );


    const net =
        withdrawalAmount -
        fee;


    const remaining =
        Math.max(
            0,
            withdrawableEarnings -
            withdrawalAmount
        );


    return {

        amount:
            withdrawalAmount,

        fee,

        net,

        remaining

    };

}


// ============================================================
// UPDATE CALCULATION UI
// ============================================================

function updateCalculation() {

    const amount =
        getWithdrawalAmount();


    const calculation =
        calculateWithdrawal(
            Number.isFinite(amount)
                ? amount
                : 0
        );


    const previewAmount =
        $("previewAmount");


    const previewFee =
        $("previewFee");


    const previewNet =
        $("previewNet");


    const previewRemaining =
        $("previewRemaining");


    if (previewAmount) {

        previewAmount.textContent =
            `₹${formatMoney(
                calculation.amount
            )}`;

    }


    if (previewFee) {

        previewFee.textContent =
            `₹${formatMoney(
                calculation.fee
            )}`;

    }


    if (previewNet) {

        previewNet.textContent =
            `₹${formatMoney(
                calculation.net
            )}`;

    }


    if (previewRemaining) {

        previewRemaining.textContent =
            `₹${formatMoney(
                calculation.remaining
            )}`;

    }

}


// ============================================================
// LOAD WITHDRAWAL HISTORY
// ============================================================

async function loadWithdrawalHistory() {

    try {

        const data =
            await apiRequest(
                `${WITHDRAW_API}/my`,
                {
                    method: "GET"
                }
            );


        if (!data) {

            return;

        }


        withdrawalHistory =

            data.withdrawals ||

            data.data ||

            data.history ||

            [];


        if (
            !Array.isArray(
                withdrawalHistory
            )
        ) {

            withdrawalHistory = [];

        }


        renderWithdrawalHistory();

    }

    catch (error) {

        console.error(
            "Load Withdrawal History Error:",
            error
        );


        renderWithdrawalHistoryError();

    }

}


// ============================================================
// RENDER WITHDRAWAL HISTORY
// ============================================================

function renderWithdrawalHistory() {

    const container =

        $("withdrawalHistory") ||

        $("historyList") ||

        $("withdrawHistory");


    if (!container) {

        return;

    }


    if (
        !withdrawalHistory.length
    ) {

        container.innerHTML = `

            <div class="empty-history">

                <div class="empty-icon">
                    💸
                </div>

                <p>
                    No withdrawal history yet.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =

        withdrawalHistory
            .map(item => {

                const amount =
                    Number(
                        item.amount ??
                        item.withdrawAmount ??
                        0
                    );


                const fee =
                    Number(
                        item.platformFee ??
                        0
                    );


                const netAmount =
                    Number(
                        item.netAmount ??
                        (
                            amount -
                            fee
                        )
                    );


                const status =
                    item.status ||
                    "Pending";


                const method =
                    item.paymentMethod ||
                    item.method ||
                    "UPI";


                const date =
                    item.createdAt ||
                    item.date ||
                    item.updatedAt;


                const formattedDate =
                    date
                        ? formatDate(date)
                        : "-";


                const rejectionReason =
                    item.rejectionReason ||
                    item.remark ||
                    "";


                const rejectionHTML =

                    String(status)
                        .toLowerCase() ===
                    "rejected"

                        ? `

                            <div class="withdrawal-rejection">

                                <strong>
                                    ❌ Withdrawal Rejected
                                </strong>

                                <p>

                                    <strong>
                                        Reason:
                                    </strong>

                                    ${escapeHTML(
                                        rejectionReason ||
                                        "No reason provided."
                                    )}

                                </p>

                            </div>

                        `

                        : "";


                return `

                    <div class="withdraw-history-item">

                        <div class="withdraw-history-left">

                            <div class="withdraw-history-icon">
                                💸
                            </div>


                            <div>

                                <div class="withdraw-history-amount">

                                    ₹${formatMoney(amount)}

                                </div>


                                <div class="withdraw-history-method">

                                    ${escapeHTML(method)}

                                </div>


                                <div class="withdraw-history-date">

                                    ${formattedDate}

                                </div>


                                <div class="withdraw-history-fee">

                                    Fee:
                                    ₹${formatMoney(fee)}

                                </div>


                                <div class="withdraw-history-net">

                                    Received:
                                    ₹${formatMoney(netAmount)}

                                </div>

                            </div>

                        </div>


                        <div class="withdraw-status ${getStatusClass(status)}">

                            ${escapeHTML(status)}

                        </div>


                        ${rejectionHTML}

                    </div>

                `;

            })
            .join("");

}


// ============================================================
// HISTORY ERROR
// ============================================================

function renderWithdrawalHistoryError() {

    const container =

        $("withdrawalHistory") ||

        $("historyList") ||

        $("withdrawHistory");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="empty-history">

            <p>
                Unable to load withdrawal history.
            </p>


            <button
                type="button"
                onclick="loadWithdrawalHistory()"
            >
                Retry
            </button>

        </div>

    `;

}


// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {

    const value =
        String(status)
            .toLowerCase()
            .trim();


    if (

        value === "approved" ||

        value === "success" ||

        value === "completed"

    ) {

        return "status-success";

    }


    if (

        value === "rejected" ||

        value === "failed" ||

        value === "cancelled"

    ) {

        return "status-danger";

    }


    return "status-pending";

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateValue) {

    try {

        const date =
            new Date(dateValue);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "-";

        }


        return date.toLocaleString(
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

    catch {

        return "-";

    }

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// PAYMENT METHOD SWITCH
// ============================================================

function selectMethod(method) {

    const normalized =
        String(method)
            .toLowerCase()
            .trim();


    if (
        normalized !== "upi" &&
        normalized !== "bank"
    ) {

        return;

    }


    selectedMethod =
        normalized;


    const upiSection =
        $("upiSection");


    const bankSection =
        $("bankSection");


    const upiRadio =
        document.querySelector(
            'input[name="paymentMethod"][value="UPI"], input[name="paymentMethod"][value="upi"]'
        );


    const bankRadio =
        document.querySelector(
            'input[name="paymentMethod"][value="Bank"], input[name="paymentMethod"][value="bank"]'
        );


    if (
        normalized === "upi"
    ) {

        if (upiSection) {

            upiSection.style.display =
                "block";

            upiSection.classList.remove(
                "hidden"
            );

        }


        if (bankSection) {

            bankSection.style.display =
                "none";

            bankSection.classList.add(
                "hidden"
            );

        }


        if (upiRadio) {

            upiRadio.checked =
                true;

        }

    }

    else {

        if (upiSection) {

            upiSection.style.display =
                "none";

            upiSection.classList.add(
                "hidden"
            );

        }


        if (bankSection) {

            bankSection.style.display =
                "block";

            bankSection.classList.remove(
                "hidden"
            );

        }


        if (bankRadio) {

            bankRadio.checked =
                true;

        }

    }

}


// ============================================================
// GET INPUT VALUE
// ============================================================

function getValue(...ids) {

    for (
        const id of ids
    ) {

        const element =
            $(id);


        if (element) {

            return String(
                element.value || ""
            ).trim();

        }

    }


    return "";

}


// ============================================================
// GET WITHDRAWAL AMOUNT
// ============================================================

function getWithdrawalAmount() {

    const input =
        $("amount") ||
        $("withdrawAmount") ||
        $("withdrawalAmount");


    if (!input) {

        return NaN;

    }


    const rawValue =
        String(
            input.value || ""
        )
        .replace(
            /[^0-9.]/g,
            ""
        );


    return Number(
        rawValue
    );

}


// ============================================================
// VALIDATE UPI
// ============================================================

function validateUPI() {

    const upiId =
        getValue(
            "upiId",
            "withdrawUpi",
            "upi"
        );


    if (!upiId) {

        showError(
            "Please enter your UPI ID."
        );

        return null;

    }


    const upiRegex =
        /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;


    if (
        !upiRegex.test(
            upiId
        )
    ) {

        showError(
            "Please enter a valid UPI ID."
        );

        return null;

    }


    return {

        upiId

    };

}


// ============================================================
// VALIDATE BANK
// ============================================================

function validateBank() {

    const accountHolder =
        getValue(
            "accountHolder",
            "bankAccountHolder",
            "holderName"
        );


    const bankName =
        getValue(
            "bankName"
        );


    const accountNumber =
        getValue(
            "accountNumber",
            "bankAccountNumber"
        );


    const ifscCode =
        getValue(
            "ifscCode",
            "ifsc"
        )
        .toUpperCase();


    if (!accountHolder) {

        showError(
            "Please enter account holder name."
        );

        return null;

    }


    if (!bankName) {

        showError(
            "Please enter bank name."
        );

        return null;

    }


    if (!accountNumber) {

        showError(
            "Please enter account number."
        );

        return null;

    }


    if (
        !/^[0-9]{6,20}$/
            .test(accountNumber)
    ) {

        showError(
            "Please enter a valid account number."
        );

        return null;

    }


    if (!ifscCode) {

        showError(
            "Please enter IFSC code."
        );

        return null;

    }


    if (
        !/^[A-Z]{4}0[A-Z0-9]{6}$/
            .test(ifscCode)
    ) {

        showError(
            "Please enter a valid IFSC code."
        );

        return null;

    }


    return {

        accountHolder,

        bankName,

        accountNumber,

        ifscCode

    };

}


// ============================================================
// VALIDATE AMOUNT
// ============================================================

function validateAmount(amount) {

    if (
        !Number.isFinite(amount)
    ) {

        showError(
            "Please enter a valid withdrawal amount."
        );

        return false;

    }


    if (
        amount < MIN_WITHDRAWAL
    ) {

        showError(
            `Minimum withdrawal amount is ₹${formatMoney(
                MIN_WITHDRAWAL
            )}.`
        );

        return false;

    }


    if (
        amount > withdrawableEarnings
    ) {

        showError(

            `Insufficient withdrawable earnings. Available: ₹${formatMoney(
                withdrawableEarnings
            )}`

        );

        return false;

    }


    return true;

}


// ============================================================
// SUBMIT WITHDRAWAL
// ============================================================

async function submitWithdrawal(event) {

    if (event) {

        event.preventDefault();

    }


    clearMessage();


    const button =
        $("withdrawBtn");


    const amount =
        getWithdrawalAmount();


    if (
        !validateAmount(
            amount
        )
    ) {

        return;

    }


    // ========================================================
    // CALCULATE FEE
    // ========================================================

    const calculation =
        calculateWithdrawal(
            amount
        );


    // ========================================================
    // PAYMENT DETAILS
    // ========================================================

    let paymentDetails = {};


    if (
        selectedMethod === "upi"
    ) {

        const upi =
            validateUPI();


        if (!upi) {

            return;

        }


        paymentDetails =
            upi;

    }

    else if (
        selectedMethod === "bank"
    ) {

        const bank =
            validateBank();


        if (!bank) {

            return;

        }


        paymentDetails =
            bank;

    }

    else {

        showError(
            "Please select a payment method."
        );

        return;

    }


    const backendPaymentMethod =

        selectedMethod === "upi"

            ? "UPI"

            : "Bank";


    // ========================================================
    // CONFIRMATION
    // ========================================================

    const confirmed =
        confirm(

            `Confirm withdrawal?\n\n` +

            `Withdrawal: ₹${formatMoney(
                calculation.amount
            )}\n` +

            `Platform Fee (3%): ₹${formatMoney(
                calculation.fee
            )}\n` +

            `You Receive: ₹${formatMoney(
                calculation.net
            )}\n\n` +

            `Payment Method: ${backendPaymentMethod}`

        );


    if (!confirmed) {

        return;

    }


    // ========================================================
    // REQUEST BODY
    // ========================================================

    const body = {

        amount:
            Number(amount),

        paymentMethod:
            backendPaymentMethod,

        paymentDetails:
            paymentDetails

    };


    // ========================================================
    // DISABLE BUTTON
    // ========================================================

    if (button) {

        button.disabled =
            true;


        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                Processing...
            </span>

        `;

    }


    // ========================================================
    // SEND REQUEST
    // ========================================================

    try {

        const data =
            await apiRequest(

                `${WITHDRAW_API}/create`,

                {

                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            body
                        )

                }

            );


        if (!data) {

            return;

        }


        showSuccess(

            data.message ||

            data.msg ||

            "Withdrawal request submitted successfully."

        );


        // ====================================================
        // UPDATE WITHDRAWABLE EARNINGS
        // ====================================================

        if (
            data.withdrawableEarnings !==
            undefined
        ) {

            withdrawableEarnings =
                Number(
                    data.withdrawableEarnings
                ) || 0;

        }

        else {

            withdrawableEarnings =
                Math.max(
                    0,
                    withdrawableEarnings -
                    amount
                );

        }


        // ====================================================
        // WALLET BALANCE
        //
        // This must NOT be reduced by withdrawal.
        // ====================================================

        if (
            data.balance !== undefined
        ) {

            currentWalletBalance =
                Number(
                    data.balance
                ) || 0;

        }


        updateBalanceUI();


        // ====================================================
        // CLEAR FORM
        // ====================================================

        const amountInput =
            $("amount") ||
            $("withdrawAmount") ||
            $("withdrawalAmount");


        if (amountInput) {

            amountInput.value =
                "";

        }


        updateCalculation();


        clearPaymentFields();


        // ====================================================
        // REFRESH
        // ====================================================

        await loadBalance();

        await loadWithdrawalHistory();


    }

    catch (error) {

        console.error(
            "Withdrawal Error:",
            error
        );


        showError(

            error.message ||

            "Unable to submit withdrawal request."

        );

    }


    finally {

        if (button) {

            button.disabled =
                false;


            button.innerHTML =

                button.dataset.originalText ||

                `

                    <i class="fa-solid fa-paper-plane"></i>

                    <span>
                        Submit Withdrawal
                    </span>

                `;

        }

    }

}


// ============================================================
// CLEAR PAYMENT FIELDS
// ============================================================

function clearPaymentFields() {

    const fields = [

        "upiId",

        "accountHolder",

        "bankName",

        "accountNumber",

        "ifscCode"

    ];


    fields.forEach(
        id => {

            const input =
                $(id);


            if (input) {

                input.value =
                    "";

            }

        }
    );

}


// ============================================================
// QUICK AMOUNT
// ============================================================

function setAmount(amount) {

    const input =
        $("amount") ||
        $("withdrawAmount") ||
        $("withdrawalAmount");


    if (!input) {

        return;

    }


    amount =
        Number(amount);


    if (
        !Number.isFinite(amount)
    ) {

        return;

    }


    if (
        amount > withdrawableEarnings
    ) {

        amount =
            withdrawableEarnings;

    }


    if (
        amount < 0
    ) {

        amount =
            0;

    }


    input.value =
        String(
            amount
        );


    updateCalculation();

}


// ============================================================
// WITHDRAW ALL
// ============================================================

function withdrawAll() {

    setAmount(
        withdrawableEarnings
    );

}


// ============================================================
// MESSAGE ELEMENT
// ============================================================

function getMessageElement() {

    return (

        $("message") ||

        $("errorMessage") ||

        $("successMessage") ||

        $("withdrawMessage")

    );

}


// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

    const element =
        getMessageElement();


    if (!element) {

        alert(message);

        return;

    }


    element.textContent =
        message;


    element.classList.remove(
        "success",
        "error"
    );


    element.classList.add(
        "error"
    );


    element.style.display =
        "block";

}


// ============================================================
// SHOW SUCCESS
// ============================================================

function showSuccess(message) {

    const element =
        getMessageElement();


    if (!element) {

        alert(message);

        return;

    }


    element.textContent =
        message;


    element.classList.remove(
        "success",
        "error"
    );


    element.classList.add(
        "success"
    );


    element.style.display =
        "block";

}


// ============================================================
// CLEAR MESSAGE
// ============================================================

function clearMessage() {

    const element =
        getMessageElement();


    if (!element) {

        return;

    }


    element.textContent =
        "";


    element.style.display =
        "none";

}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    localStorage.removeItem(
        "ki_token"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "adminToken"
    );


    window.location.href =
        "auth.html";

}


// ============================================================
// INPUT EVENT
// ============================================================

function initializeAmountInput() {

    const input =
        $("amount");


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        updateCalculation
    );


    input.addEventListener(
        "change",
        updateCalculation
    );

}


// ============================================================
// EVENT BINDING
// ============================================================

function initializeEvents() {

    const form =
        $("withdrawForm");


    if (form) {

        form.addEventListener(
            "submit",
            submitWithdrawal
        );

    }


    const paymentMethods =
        document.querySelectorAll(
            'input[name="paymentMethod"]'
        );


    paymentMethods.forEach(
        radio => {

            radio.addEventListener(
                "change",
                function () {

                    selectMethod(
                        this.value
                    );

                }
            );

        }
    );


    const logoutButton =
        $("logoutBtn");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }


    document
        .querySelectorAll(
            "[data-amount]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        setAmount(
                            Number(
                                this.dataset.amount
                            )
                        );

                    }
                );

            }
        );


    initializeAmountInput();

}


// ============================================================
// INITIALIZE PAGE
// ============================================================

async function initializeWithdrawalPage() {

    console.log(
        "===================================="
    );

    console.log(
        "Withdrawal page initializing..."
    );

    console.log(
        "Withdrawable Earnings Mode"
    );

    console.log(
        "Platform Fee:",
        `${PLATFORM_FEE_PERCENT}%`
    );

    console.log(
        "===================================="
    );


    initializeEvents();


    selectMethod(
        "upi"
    );


    updateCalculation();


    await loadBalance();


    await loadWithdrawalHistory();

}


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeWithdrawalPage
    );

}

else {

    initializeWithdrawalPage();

}


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.loadBalance =
    loadBalance;

window.loadWithdrawalHistory =
    loadWithdrawalHistory;

window.submitWithdrawal =
    submitWithdrawal;

window.selectMethod =
    selectMethod;

window.setAmount =
    setAmount;

window.withdrawAll =
    withdrawAll;

window.logout =
    logout;

window.updateCalculation =
    updateCalculation;