// ============================================================
// DEPOSIT PAGE
// FAST / MOBILE OPTIMIZED VERSION
// ============================================================

"use strict";


// ============================================================
// API
// ============================================================

const API_URL =
    "https://bitcoin-m7kz.onrender.com/api/deposit";


// ============================================================
// FRONTEND QR
// ============================================================

const DEFAULT_QR_IMAGE =
    "images/qr.jpeg";


// ============================================================
// TOKEN
// ============================================================

function getToken() {

    return (
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        ""
    );

}


let token = getToken();


// ============================================================
// LOGIN CHECK
// ============================================================

if (!token) {

    window.location.href =
        "auth.html";

}


// ============================================================
// DEFAULT PAYMENT SETTINGS
// ============================================================

const DEFAULT_PAYMENT_SETTINGS = {

    companyName:
        "Bitcoin Investment",

    paymentType:
        "UPI",

    upiId:
        "jaishrishyamji0@axl",

    accountHolder:
        "",

    bankName:
        "",

    accountNumber:
        "",

    ifscCode:
        "",

    minimumDeposit:
        500,

    maximumDeposit:
        100000,

    depositInstruction:
        "Please make the payment using the details below and enter the correct UTR number after payment.",

    qrImage:
        DEFAULT_QR_IMAGE

};


let paymentSettings = {
    ...DEFAULT_PAYMENT_SETTINGS
};


// ============================================================
// HELPERS
// ============================================================

function getElement(id) {

    return document.getElementById(id);

}


// ============================================================
// MONEY
// ============================================================

function money(value) {

    const amount =
        Number(value || 0);


    return (
        "₹" +
        amount.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        character => {

            const map = {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            };

            return map[character];

        }
    );

}


// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(
    url,
    options = {}
) {

    token = getToken();


    const headers = {

        ...(options.headers || {}),

        Authorization:
            `Bearer ${token}`

    };


    try {

        const response =
            await fetch(
                url,
                {
                    ...options,
                    headers
                }
            );


        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        // ====================================================
        // SESSION
        // ====================================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );


            alert(
                "Your session has expired. Please login again."
            );


            window.location.href =
                "auth.html";


            return null;

        }


        if (!response.ok) {

            throw new Error(

                data.message ||

                data.msg ||

                "Request failed."

            );

        }


        return data;

    }

    catch (error) {

        console.error(
            "API REQUEST ERROR:",
            error
        );

        throw error;

    }

}


// ============================================================
// QR IMAGE
// ============================================================

function buildQRUrl(qrImage) {

    if (!qrImage) {

        return DEFAULT_QR_IMAGE;

    }


    const path =
        String(qrImage)
            .trim()
            .replace(
                /\\/g,
                "/"
            );


    if (!path) {

        return DEFAULT_QR_IMAGE;

    }


    if (
        path.startsWith("http://") ||
        path.startsWith("https://")
    ) {

        return path;

    }


    return path;

}


// ============================================================
// LOAD QR
// ============================================================

function loadQRImage() {

    const qr =
        getElement("qrImage");

    const loading =
        getElement("qrLoading");


    if (!qr) {

        return;

    }


    const qrUrl =
        buildQRUrl(
            paymentSettings.qrImage
        );


    if (loading) {

        loading.style.display =
            "flex";

        loading.textContent =
            "Loading QR...";

    }


    qr.onload =
        function () {

            if (loading) {

                loading.style.display =
                    "none";

            }


            qr.style.display =
                "block";

        };


    qr.onerror =
        function () {

            console.error(
                "QR image failed:",
                qrUrl
            );


            if (
                qr.src !==
                new URL(
                    DEFAULT_QR_IMAGE,
                    window.location.href
                ).href
            ) {

                qr.src =
                    DEFAULT_QR_IMAGE;

                return;

            }


            qr.style.display =
                "none";


            if (loading) {

                loading.textContent =
                    "QR Code Could Not Load";

            }

        };


    // Start loading after current rendering work.
    requestAnimationFrame(
        () => {

            qr.src =
                qrUrl;

        }
    );

}


// ============================================================
// RENDER PAYMENT SETTINGS
// ============================================================

function renderPaymentSettings() {

    paymentSettings = {

        ...DEFAULT_PAYMENT_SETTINGS

    };


    const companyName =
        getElement("companyName");

    if (companyName) {

        companyName.textContent =
            paymentSettings.companyName;

    }


    const paymentType =
        getElement("paymentType");

    if (paymentType) {

        paymentType.textContent =
            paymentSettings.paymentType;

    }


    const upiId =
        getElement("upiId");

    if (upiId) {

        upiId.textContent =
            paymentSettings.upiId;

    }


    const accountHolder =
        getElement("accountHolder");

    if (accountHolder) {

        accountHolder.textContent =
            paymentSettings.accountHolder;

    }


    const bankName =
        getElement("bankName");

    if (bankName) {

        bankName.textContent =
            paymentSettings.bankName ||
            "-";

    }


    const accountNumber =
        getElement("accountNumber");

    if (accountNumber) {

        accountNumber.textContent =
            paymentSettings.accountNumber ||
            "-";

    }


    const ifscCode =
        getElement("ifscCode");

    if (ifscCode) {

        ifscCode.textContent =
            paymentSettings.ifscCode ||
            "-";

    }


    const limits =
        getElement("limits");


    if (limits) {

        limits.textContent =

            `${money(paymentSettings.minimumDeposit)} - ` +

            `${money(paymentSettings.maximumDeposit)}`;

    }


    const instruction =
        getElement(
            "depositInstruction"
        );


    if (instruction) {

        instruction.textContent =
            paymentSettings.depositInstruction;

    }


    const amountInput =
        getElement("amount");


    if (amountInput) {

        amountInput.min =
            paymentSettings.minimumDeposit;

        amountInput.max =
            paymentSettings.maximumDeposit;

    }


    loadQRImage();

}


// ============================================================
// COPY UPI
// ============================================================

async function copyUPI() {

    const element =
        getElement("upiId");


    if (!element) {

        return;

    }


    const upi =
        element.textContent.trim();


    if (!upi) {

        showMessage(
            "UPI ID is not available.",
            "error"
        );

        return;

    }


    try {

        await navigator.clipboard.writeText(
            upi
        );


        showMessage(
            "UPI ID copied successfully.",
            "success"
        );

    }

    catch (error) {

        console.warn(
            "Clipboard failed:",
            error
        );


        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            upi;


        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";


        document.body.appendChild(
            textarea
        );


        textarea.focus();
        textarea.select();


        try {

            document.execCommand(
                "copy"
            );


            showMessage(
                "UPI ID copied successfully.",
                "success"
            );

        }

        catch {

            showMessage(
                "Unable to copy UPI ID.",
                "error"
            );

        }


        textarea.remove();

    }

}


// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    message,
    type = "info"
) {

    let element =
        getElement(
            "depositMessage"
        );


    if (!element) {

        element =
            document.createElement(
                "div"
            );


        element.id =
            "depositMessage";


        const form =
            getElement(
                "depositForm"
            );


        if (form) {

            form.prepend(
                element
            );

        }

    }


    if (!element) {

        alert(message);

        return;

    }


    element.textContent =
        message;


    element.style.display =
        "block";

    element.style.marginTop =
        "12px";

    element.style.padding =
        "10px 14px";

    element.style.borderRadius =
        "10px";

    element.style.fontSize =
        "13px";


    if (
        type === "success"
    ) {

        element.style.background =
            "#ecfdf3";

        element.style.color =
            "#15803d";

    }

    else if (
        type === "error"
    ) {

        element.style.background =
            "#fef2f2";

        element.style.color =
            "#dc2626";

    }

    else {

        element.style.background =
            "#eff6ff";

        element.style.color =
            "#2563eb";

    }


    clearTimeout(
        element._timer
    );


    element._timer =
        setTimeout(
            () => {

                element.style.display =
                    "none";

            },
            4500
        );

}


// ============================================================
// FAST SCREENSHOT PREVIEW
// ============================================================

let previewObjectUrl =
    null;


function initScreenshotPreview() {

    const input =
        getElement(
            "screenshot"
        );


    const preview =
        getElement(
            "preview"
        );


    if (
        !input ||
        !preview
    ) {

        return;

    }


    input.addEventListener(
        "change",
        function () {

            const file =
                this.files?.[0];


            if (!file) {

                clearPreview();

                return;

            }


            // =================================================
            // FILE TYPE
            // =================================================

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showMessage(
                    "Please select a valid image.",
                    "error"
                );

                this.value =
                    "";

                clearPreview();

                return;

            }


            // =================================================
            // MOBILE-FRIENDLY LIMIT
            // =================================================

            const maxSize =
                3 * 1024 * 1024;


            if (
                file.size > maxSize
            ) {

                showMessage(
                    "Screenshot must be smaller than 3MB.",
                    "error"
                );

                this.value =
                    "";

                clearPreview();

                return;

            }


            // =================================================
            // RELEASE OLD URL
            // =================================================

            if (
                previewObjectUrl
            ) {

                URL.revokeObjectURL(
                    previewObjectUrl
                );

            }


            // =================================================
            // FAST OBJECT URL
            // =================================================

            previewObjectUrl =
                URL.createObjectURL(
                    file
                );


            preview.src =
                previewObjectUrl;


            preview.style.display =
                "block";

        }
    );

}


// ============================================================
// CLEAR PREVIEW
// ============================================================

function clearPreview() {

    const preview =
        getElement(
            "preview"
        );


    if (preview) {

        preview.removeAttribute(
            "src"
        );

        preview.style.display =
            "none";

    }


    if (
        previewObjectUrl
    ) {

        URL.revokeObjectURL(
            previewObjectUrl
        );

        previewObjectUrl =
            null;

    }

}


// ============================================================
// VALIDATE DEPOSIT
// ============================================================

function validateDeposit() {

    const amountInput =
        getElement("amount");


    const utrInput =
        getElement("utr");


    if (!amountInput) {

        return {

            valid: false,

            message:
                "Amount field not found."

        };

    }


    const amount =
        Number(
            amountInput.value
        );


    const minimum =
        Number(
            paymentSettings.minimumDeposit
        );


    const maximum =
        Number(
            paymentSettings.maximumDeposit
        );


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        return {

            valid: false,

            message:
                "Please enter a valid deposit amount."

        };

    }


    if (
        amount < minimum
    ) {

        return {

            valid: false,

            message:
                `Minimum deposit is ${money(minimum)}.`

        };

    }


    if (
        amount > maximum
    ) {

        return {

            valid: false,

            message:
                `Maximum deposit is ${money(maximum)}.`

        };

    }


    if (utrInput) {

        const utr =
            utrInput.value.trim();


        if (!utr) {

            return {

                valid: false,

                message:
                    "Please enter your UTR number."

            };

        }


        if (
            utr.length < 4
        ) {

            return {

                valid: false,

                message:
                    "Please enter a valid UTR number."

            };

        }

    }


    return {

        valid: true,

        message: ""

    };

}


// ============================================================
// SUBMIT DEPOSIT
// ============================================================

async function submitDeposit(event) {

    event.preventDefault();


    const form =
        getElement(
            "depositForm"
        );


    if (!form) {

        return;

    }


    const validation =
        validateDeposit();


    if (
        !validation.valid
    ) {

        showMessage(
            validation.message,
            "error"
        );

        return;

    }


    const button =
        getElement(
            "submitDeposit"
        );


    const originalText =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled =
            true;


        button.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                Submitting...
            </span>

        `;

    }


    const amountInput =
        getElement(
            "amount"
        );


    const utrInput =
        getElement(
            "utr"
        );


    const screenshotInput =
        getElement(
            "screenshot"
        );


    const formData =
        new FormData();


    formData.append(
        "amount",
        amountInput.value.trim()
    );


    formData.append(
        "utr",
        utrInput
            ? utrInput.value.trim()
            : ""
    );


    if (
        screenshotInput &&
        screenshotInput.files &&
        screenshotInput.files[0]
    ) {

        formData.append(
            "screenshot",
            screenshotInput.files[0]
        );

    }


    try {

        console.log(
            "SUBMITTING DEPOSIT..."
        );


        const response =
            await fetch(
                `${API_URL}/create`,
                {

                    method:
                        "POST",

                    headers: {

                        Authorization:
                            `Bearer ${getToken()}`

                    },

                    body:
                        formData

                }
            );


        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        console.log(
            "DEPOSIT RESPONSE:",
            data
        );


        // ====================================================
        // SESSION
        // ====================================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "ki_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );


            alert(
                "Your session has expired. Please login again."
            );


            window.location.href =
                "auth.html";


            return;

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||

                data.msg ||

                "Deposit submission failed."

            );

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        showMessage(

            data.message ||

            "Deposit submitted successfully.",

            "success"

        );


        // ====================================================
        // RESET
        // ====================================================

        form.reset();


        clearPreview();


        // ====================================================
        // DON'T BLOCK UI
        // ====================================================

        // Update history in background.
        // User doesn't need to wait.

        loadHistory();

    }

    catch (error) {

        console.error(
            "DEPOSIT SUBMIT ERROR:",
            error
        );


        showMessage(

            error.message ||

            "Server error. Please try again.",

            "error"

        );

    }

    finally {

        if (button) {

            button.disabled =
                false;


            button.innerHTML =
                originalText;

        }

    }

}


// ============================================================
// LOAD HISTORY
// ============================================================

async function loadHistory() {

    const container =
        getElement(
            "historyList"
        );


    if (!container) {

        return;

    }


    try {

        const data =
            await apiRequest(
                `${API_URL}/my`
            );


        if (!data) {

            return;

        }


        if (
            !data.success
        ) {

            throw new Error(

                data.message ||

                "Unable to load deposit history."

            );

        }


        const deposits =
            Array.isArray(
                data.deposits
            )

                ? data.deposits

                : [];


        if (
            deposits.length === 0
        ) {

            container.innerHTML = `

                <div class="history-item empty-history">

                    <i class="fa-solid fa-receipt"></i>

                    <span>
                        No Deposit Found
                    </span>

                </div>

            `;

            return;

        }


        // ====================================================
        // RENDER
        // ====================================================

        container.innerHTML =

            deposits
                .map(
                    item => {

                        const amount =
                            Number(
                                item.amount || 0
                            );


                        const status =
                            String(
                                item.status ||
                                "Pending"
                            );


                        const statusClass =
                            status
                                .toLowerCase()
                                .replace(
                                    /\s+/g,
                                    "-"
                                );


                        const createdAt =

                            item.createdAt

                                ? new Date(
                                    item.createdAt
                                ).toLocaleString(
                                    "en-IN",
                                    {

                                        day:
                                            "2-digit",

                                        month:
                                            "short",

                                        year:
                                            "numeric",

                                        hour:
                                            "2-digit",

                                        minute:
                                            "2-digit"

                                    }
                                )

                                : "Recently";


                        const utr =
                            item.utr ||
                            "-";


                        return `

                            <div class="history-item">

                                <div>

                                    <div class="amount">

                                        ${money(amount)}

                                    </div>


                                    <small>

                                        ${escapeHtml(
                                            createdAt
                                        )}

                                    </small>

                                </div>


                                <div>

                                    <span>
                                        UTR
                                    </span>

                                    <br>

                                    <strong>

                                        ${escapeHtml(
                                            utr
                                        )}

                                    </strong>

                                </div>


                                <div>

                                    <span
                                        class="status ${escapeHtml(
                                            statusClass
                                        )}"
                                    >

                                        ${escapeHtml(
                                            status
                                        )}

                                    </span>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }

    catch (error) {

        console.error(
            "LOAD HISTORY ERROR:",
            error
        );


        // Don't make the entire page feel broken.
        // Only show the error inside history.

        container.innerHTML = `

            <div class="history-item error-history">

                <i class="fa-solid fa-circle-exclamation"></i>

                <span>
                    Unable to load deposit history.
                </span>

            </div>

        `;

    }

}


// ============================================================
// COPY BUTTON
// ============================================================

function initCopyButton() {

    const button =
        getElement(
            "copyUpi"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        copyUPI
    );

}


// ============================================================
// DEPOSIT FORM
// ============================================================

function initDepositForm() {

    const form =
        getElement(
            "depositForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        submitDeposit
    );

}


// ============================================================
// AMOUNT VALIDATION
// ============================================================

function initAmountValidation() {

    const input =
        getElement(
            "amount"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        function () {

            const value =
                Number(
                    this.value
                );


            const minimum =
                Number(
                    paymentSettings.minimumDeposit
                );


            const maximum =
                Number(
                    paymentSettings.maximumDeposit
                );


            // =================================================
            // MAX
            // =================================================

            if (
                value > maximum
            ) {

                this.value =
                    maximum;

            }


            const hint =
                getElement(
                    "amountHint"
                );


            if (!hint) {

                return;

            }


            if (
                value > 0 &&
                value < minimum
            ) {

                hint.textContent =
                    `Minimum deposit: ${money(minimum)}`;

                hint.classList.add(
                    "error"
                );

            }

            else {

                hint.textContent =

                    `Deposit limit: ` +

                    `${money(minimum)} - ` +

                    `${money(maximum)}`;

                hint.classList.remove(
                    "error"
                );

            }

        }
    );

}


// ============================================================
// INITIALIZE
// ============================================================

function initializeDepositPage() {

    console.log(
        "================================"
    );

    console.log(
        "FAST DEPOSIT PAGE INITIALIZING"
    );

    console.log(
        "================================"
    );


    // ========================================================
    // RENDER UI FIRST
    // ========================================================

    renderPaymentSettings();


    initCopyButton();

    initDepositForm();

    initScreenshotPreview();

    initAmountValidation();


    console.log(
        "DEPOSIT UI READY"
    );


    // ========================================================
    // HISTORY IS NON-BLOCKING
    // ========================================================

    // IMPORTANT:
    // Do NOT await this.
    //
    // The page remains usable while Render responds.

    if (
        "requestIdleCallback" in window
    ) {

        requestIdleCallback(
            () => {

                loadHistory();

            },
            {
                timeout: 1500
            }
        );

    }

    else {

        setTimeout(
            () => {

                loadHistory();

            },
            300
        );

    }


    console.log(
        "DEPOSIT PAGE READY"
    );

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
        initializeDepositPage,
        {
            once: true
        }
    );

}

else {

    initializeDepositPage();

}


// ============================================================
// CLEANUP
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            previewObjectUrl
        ) {

            URL.revokeObjectURL(
                previewObjectUrl
            );

            previewObjectUrl =
                null;

        }

    }
);