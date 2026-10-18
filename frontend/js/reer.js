

// ======================================================
// REFERRAL PAGE
// ======================================================

const API_URL =
    "https://tesla-wealth.onrender.com/api";


// ======================================================
// GET TOKEN
// ======================================================

function getToken() {

    return (
        localStorage.getItem("ki_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken")
    );

}


// ======================================================
// DOM READY
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadReferralData();

    }
);


// ======================================================
// LOAD REFERRAL DATA
// ======================================================

async function loadReferralData() {

    const token = getToken();

    if (!token) {

        showToast(
            "Please login again."
        );

        setTimeout(() => {

            window.location.href =
                "auth.html";

        }, 1000);

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/referral/my`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );


        // ==================================================
        // HANDLE UNAUTHORIZED
        // ==================================================

        if (response.status === 401) {

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

            return;
        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load referral data."
            );

        }


        // ==================================================
        // REFERRAL CODE
        // ==================================================

        const inviteCode =
            data.referralCode || "N/A";

        const inviteCodeElement =
            document.getElementById(
                "inviteCode"
            );

        if (inviteCodeElement) {

            inviteCodeElement.textContent =
                inviteCode;

        }


        // ==================================================
        // TOTAL INVITES
        // ==================================================

        const totalInvites =
            Number(
                data.referralCount || 0
            );

        const referralCountElement =
            document.getElementById(
                "referralCount"
            );

        if (referralCountElement) {

            referralCountElement.textContent =
                totalInvites;

        }


        // ==================================================
        // TOTAL EARNINGS
        // ==================================================

        const earnings =
            Number(
                data.referralEarnings || 0
            );


        const referralEarningsElement =
            document.getElementById(
                "referralEarnings"
            );

        if (referralEarningsElement) {

            referralEarningsElement.textContent =
                formatMoney(earnings);

        }


        // ==================================================
        // REFERRAL LINK
        // ==================================================

        const referralLink =
            createReferralLink(
                inviteCode
            );


        const referralLinkElement =
            document.getElementById(
                "referralLink"
            );

        if (referralLinkElement) {

            referralLinkElement.textContent =
                referralLink;

        }


        // ==================================================
        // HISTORY
        // ==================================================

        renderReferralHistory(
            data.referrals || []
        );

    } catch (error) {

        console.error(
            "REFERRAL PAGE ERROR:",
            error
        );

        const history =
            document.getElementById(
                "referralHistory"
            );

        if (history) {

            history.innerHTML = `
                <div class="loading">
                    Unable to load referral information.
                </div>
            `;

        }

        showToast(
            "Unable to load referral data."
        );

    }

}


// ======================================================
// CREATE REFERRAL LINK
// ======================================================

function createReferralLink(
    inviteCode
) {

    if (!inviteCode) {
        return "";
    }

    return (
        window.location.origin +
        "/auth.html?ref=" +
        encodeURIComponent(inviteCode)
    );

}


// ======================================================
// FORMAT MONEY
// ======================================================

function formatMoney(amount) {

    const number =
        Number(amount || 0);

    return (
        "₹" +
        number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );

}


// ======================================================
// RENDER REFERRAL HISTORY
// ======================================================

function renderReferralHistory(
    referrals
) {

    const container =
        document.getElementById(
            "referralHistory"
        );

    const countElement =
        document.getElementById(
            "historyCount"
        );


    if (countElement) {

        countElement.textContent =
            referrals.length;

    }


    if (!container) {
        return;
    }


    if (!referrals.length) {

        container.innerHTML = `
            <div class="loading">
                No referrals yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        referrals.map(
            (referral) => {

                const user =
                    referral.referredUser || {};

                const name =
                    user.name ||
                    "New User";

                const phone =
                    user.phone ||
                    "—";

                const commission =
                    Number(
                        referral.totalCommission || 0
                    );

                const status =
                    referral.status ||
                    "Pending";


                const createdAt =
                    referral.createdAt
                        ? formatDate(
                            referral.createdAt
                        )
                        : "—";


                return `

                    <div class="referral-item">

                        <div class="referral-user">

                            <div class="referral-avatar">

                                <i class="fa-solid fa-user"></i>

                            </div>

                            <div>

                                <strong>
                                    ${escapeHtml(name)}
                                </strong>

                                <small>
                                    ${escapeHtml(phone)}
                                </small>

                            </div>

                        </div>


                        <div class="referral-details">

                            <span>
                                ${createdAt}
                            </span>

                            <strong>
                                ${formatMoney(commission)}
                            </strong>

                        </div>


                        <div class="referral-status">

                            ${escapeHtml(status)}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(
    date
) {

    try {

        return new Date(date)
            .toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    } catch {

        return "—";

    }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(
    value
) {

    return String(value || "")
        .replace(
            /[&<>"']/g,
            (char) => {

                const entities = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };

                return entities[char];

            }
        );

}


// ======================================================
// COPY REFERRAL CODE
// ======================================================

async function copyReferralCode() {

    const element =
        document.getElementById(
            "inviteCode"
        );

    if (!element) {
        return;
    }

    const code =
        element.textContent.trim();

    if (
        !code ||
        code === "Loading..." ||
        code === "N/A"
    ) {

        showToast(
            "Referral code not available."
        );

        return;
    }


    try {

        await navigator.clipboard.writeText(
            code
        );

        showToast(
            "Referral code copied!"
        );

    } catch {

        showToast(
            "Unable to copy code."
        );

    }

}


// ======================================================
// COPY REFERRAL LINK
// ======================================================

async function copyReferralLink() {

    const element =
        document.getElementById(
            "referralLink"
        );

    if (!element) {
        return;
    }

    const link =
        element.textContent.trim();


    if (
        !link ||
        link === "Loading..."
    ) {

        showToast(
            "Referral link not available."
        );

        return;
    }


    try {

        await navigator.clipboard.writeText(
            link
        );

        showToast(
            "Referral link copied!"
        );

    } catch {

        showToast(
            "Unable to copy link."
        );

    }

}


// ======================================================
// SHARE REFERRAL
// ======================================================

async function shareReferral() {

    const element =
        document.getElementById(
            "referralLink"
        );

    if (!element) {
        return;
    }

    const link =
        element.textContent.trim();


    const message =
        `Join our community using my referral link:\n\n${link}`;


    if (
        navigator.share
    ) {

        try {

            await navigator.share({

                title:
                    "Join Our Community",

                text:
                    message,

                url:
                    link

            });

        } catch {

            // User cancelled share

        }

    } else {

        await copyReferralLink();

    }

}


// ======================================================
// WHATSAPP
// ======================================================

function shareWhatsApp() {

    const link =
        getReferralLink();

    if (!link) {
        return;
    }

    const message =
        `Join using my referral link:\n${link}`;

    const url =
        "https://wa.me/?text=" +
        encodeURIComponent(message);

    window.open(
        url,
        "_blank"
    );

}


// ======================================================
// TELEGRAM
// ======================================================

function shareTelegram() {

    const link =
        getReferralLink();

    if (!link) {
        return;
    }

    const message =
        `Join using my referral link`;

    const url =
        "https://t.me/share/url?url=" +
        encodeURIComponent(link) +
        "&text=" +
        encodeURIComponent(message);

    window.open(
        url,
        "_blank"
    );

}


// ======================================================
// GET CURRENT REFERRAL LINK
// ======================================================

function getReferralLink() {

    const element =
        document.getElementById(
            "referralLink"
        );

    if (!element) {
        return "";
    }

    const link =
        element.textContent.trim();

    if (
        !link ||
        link === "Loading..."
    ) {

        return "";

    }

    return link;

}


// ======================================================
// BACK BUTTON
// ======================================================

function goBack() {

    if (
        window.history.length > 1
    ) {

        window.history.back();

    } else {

        window.location.href =
            "home.html";

    }

}


// ======================================================
// TOAST
// ======================================================

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}