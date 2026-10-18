// =========================================================
// ADMIN DAILY INCOME
// =========================================================


// =========================================================
// API
// =========================================================

const API_URL =
    "https://bitcoin-m7kz.onrender.com/api";


// =========================================================
// ADMIN TOKEN
// =========================================================
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

    window.location.href = "../auth.html";

}



// =========================================================
// ELEMENTS
// =========================================================

const distributeButton =
    document.getElementById(
        "distributeIncomeBtn"
    );

const resultCard =
    document.getElementById(
        "incomeResult"
    );

const resultIcon =
    document.getElementById(
        "resultIcon"
    );

const resultTitle =
    document.getElementById(
        "resultTitle"
    );

const resultMessage =
    document.getElementById(
        "resultMessage"
    );

const processedCount =
    document.getElementById(
        "processedCount"
    );

const skippedCount =
    document.getElementById(
        "skippedCount"
    );


// =========================================================
// SHOW RESULT
// =========================================================

function showResult(
    success,
    message,
    processed = 0,
    skipped = 0
) {

    if (!resultCard) {
        return;
    }


    resultCard.hidden =
        false;


    processedCount.textContent =
        Number(processed || 0);


    skippedCount.textContent =
        Number(skipped || 0);


    if (success) {

        resultCard.classList.remove(
            "error"
        );

        resultCard.classList.add(
            "success"
        );


        resultIcon.innerHTML =
            `
                <i
                    class="fa-solid fa-check"
                ></i>
            `;


        resultTitle.textContent =
            "Income Processing Completed";


    } else {

        resultCard.classList.remove(
            "success"
        );

        resultCard.classList.add(
            "error"
        );


        resultIcon.innerHTML =
            `
                <i
                    class="fa-solid fa-xmark"
                ></i>
            `;


        resultTitle.textContent =
            "Processing Failed";

    }


    resultMessage.textContent =
        message;

}


// =========================================================
// DISTRIBUTE DAILY INCOME
// =========================================================

async function distributeDailyIncome() {

    if (!adminToken) {

        window.location.href =
            "admin-login.html";

        return;

    }


    const confirmed =
        window.confirm(
            "Are you sure you want to distribute daily income now?"
        );


    if (!confirmed) {

        return;

    }


    // =============================================
    // LOADING
    // =============================================

    distributeButton.disabled =
        true;


    distributeButton.classList.add(
        "loading"
    );


    distributeButton.innerHTML =
        `
            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Processing...
        `;


    try {

        const response =
            await fetch(
                `${API_URL}/investment/daily-income`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${adminToken}`

                    }

                }
            );


        // =============================================
        // JSON
        // =============================================

        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        // =============================================
        // SESSION
        // =============================================

        if (
            response.status ===
            401
        ) {

            localStorage.removeItem(
                "adminToken"
            );

            window.location.href =
                "admin-login.html";

            return;

        }


        // =============================================
        // ERROR
        // =============================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                data.msg ||
                "Daily income processing failed."
            );

        }


        // =============================================
        // SUCCESS
        // =============================================

        showResult(

            true,

            data.message ||
            "Daily income check completed.",

            data.processed ||
            0,

            data.skipped ||
            0

        );


    }

    catch (error) {

        console.error(
            "DAILY INCOME:",
            error
        );


        showResult(

            false,

            error.message ||
            "Unable to process daily income.",

            0,

            0

        );

    }


    // =============================================
    // RESET BUTTON
    // =============================================

    finally {

        distributeButton.disabled =
            false;


        distributeButton.classList.remove(
            "loading"
        );


        distributeButton.innerHTML =
            `
                <span class="btn-icon">

                    <i
                        class="fa-solid fa-bolt"
                    ></i>

                </span>

                <span>
                    Distribute Income
                </span>
            `;

    }

}


// =========================================================
// BUTTON
// =========================================================

if (distributeButton) {

    distributeButton.addEventListener(
        "click",
        distributeDailyIncome
    );

}