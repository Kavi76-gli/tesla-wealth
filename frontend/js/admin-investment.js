// ==========================================
// API URL
// ==========================================

const API_URL =
    "https://bitcoin-m7kz.onrender.com/api/plans";


// ==========================================
// TOKEN
// ==========================================

const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("ki_token") ||
    localStorage.getItem("token");


// ==========================================
// PLANS STORAGE
// ==========================================

let allPlans = [];


// ==========================================
// CHECK LOGIN
// ==========================================

if (!token) {

    alert("Please login first.");

    window.location.href = "../auth.html";

}


// ==========================================
// LOAD PLANS
// ==========================================

async function loadPlans() {

    try {

        const response =
            await fetch(API_URL);


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || "Failed to load plans."
            );

        }


        allPlans =
            data.plans || [];


        renderPlans(allPlans);

        updateCards(allPlans);


    } catch (error) {

        console.error(
            "LOAD PLANS ERROR:",
            error
        );


        document.getElementById(
            "plansTable"
        ).innerHTML = `

            <tr>

                <td colspan="9"
                    style="text-align:center; padding:20px;">

                    Failed to load plans.

                </td>

            </tr>

        `;

    }

}


// ==========================================
// FORMAT CATEGORY
// ==========================================

function getCategoryDetails(category) {

    switch (
        String(category || "starter")
            .toLowerCase()
    ) {

        case "pro":

            return {

                name: "Pro",

                className: "category-pro"

            };


        case "elite":

            return {

                name: "Elite",

                className: "category-elite"

            };


        default:

            return {

                name: "Starter",

                className: "category-starter"

            };

    }

}


// ==========================================
// FORMAT MONEY
// ==========================================

function formatMoney(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString("en-IN");

}


// ==========================================
// RENDER PLANS
// ==========================================

function renderPlans(plans) {

    const table =
        document.getElementById("plansTable");


    table.innerHTML = "";


    if (!plans || plans.length === 0) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="text-align:center; padding:25px;">

                    No investment plans found.

                </td>

            </tr>

        `;

        return;

    }


    plans.forEach(plan => {

        const category =
            getCategoryDetails(plan.category);


        const image =
            plan.image ||
            "../images/no-image.png";


        table.innerHTML += `

            <tr>

                <td>

                    <img
                        src="${image}"
                        alt="${escapeHTML(plan.name)}"
                        onerror="this.src='../images/no-image.png'">

                </td>


                <td>

                    ${escapeHTML(plan.name)}

                </td>


                <td>

                    <span
                        class="category-badge ${category.className}">

                        ${category.name}

                    </span>

                </td>


                <td>

                    ${formatMoney(plan.price)}

                </td>


                <td>

                    ${formatMoney(plan.dailyIncome)}

                </td>


                <td>

                    ${plan.days}

                </td>


                <td>

                    ${formatMoney(plan.totalIncome)}

                </td>


                <td>

                    <span
                        class="${plan.status
                            ? "active-status"
                            : "inactive-status"}">

                        ${plan.status
                            ? "Active"
                            : "Inactive"}

                    </span>

                </td>


                <td>

                    <button
                        class="action-btn edit-btn"
                        onclick="editPlan('${plan._id}')">

                        Edit

                    </button>


                    <button
                        class="action-btn delete-btn"
                        onclick="deletePlan('${plan._id}')">

                        Delete

                    </button>

                </td>

            </tr>

        `;

    });

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text || "";

    return div.innerHTML;

}


// ==========================================
// UPDATE DASHBOARD CARDS
// ==========================================

function updateCards(plans) {

    document.getElementById(
        "totalPlans"
    ).innerText =
        plans.length;


    document.getElementById(
        "activePlans"
    ).innerText =
        plans.filter(
            plan => plan.status
        ).length;


    document.getElementById(
        "inactivePlans"
    ).innerText =
        plans.filter(
            plan => !plan.status
        ).length;


    if (plans.length > 0) {

        const highest =
            Math.max(
                ...plans.map(
                    plan =>
                        Number(plan.price || 0)
                )
            );


        document.getElementById(
            "highestPlan"
        ).innerText =
            formatMoney(highest);

    }

    else {

        document.getElementById(
            "highestPlan"
        ).innerText =
            "₹0";

    }

}


// ==========================================
// IMAGE PREVIEW
// ==========================================

document.getElementById(
    "image"
).addEventListener(
    "change",
    function () {

        const file =
            this.files[0];


        const preview =
            document.getElementById(
                "preview"
            );


        if (!file) {

            preview.style.display =
                "none";

            preview.src = "";

            return;

        }


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                preview.src =
                    event.target.result;

                preview.style.display =
                    "block";

            };


        reader.readAsDataURL(file);

    }
);


// ==========================================
// ADD PLAN BUTTON
// ==========================================

document.getElementById(
    "addPlanBtn"
).addEventListener(
    "click",
    function () {

        document.getElementById(
            "planFormContainer"
        ).scrollIntoView({

            behavior: "smooth",

            block: "start"

        });


        document.getElementById(
            "name"
        ).focus();

    }
);


// ==========================================
// SAVE PLAN
// ==========================================

document.getElementById(
    "planForm"
).addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // ==========================================
        // GET FORM VALUES
        // ==========================================

        const name =
            document.getElementById(
                "name"
            ).value.trim();


        const category =
            document.getElementById(
                "category"
            ).value;


        const price =
            document.getElementById(
                "price"
            ).value;


        const dailyIncome =
            document.getElementById(
                "dailyIncome"
            ).value;


        const days =
            document.getElementById(
                "days"
            ).value;


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!name) {

            alert(
                "Please enter a plan name."
            );

            return;

        }


        if (!category) {

            alert(
                "Please select a category."
            );

            return;

        }


        if (Number(price) <= 0) {

            alert(
                "Please enter a valid price."
            );

            return;

        }


        if (Number(dailyIncome) < 0) {

            alert(
                "Please enter valid daily income."
            );

            return;

        }


        if (Number(days) <= 0) {

            alert(
                "Please enter valid duration days."
            );

            return;

        }


        // ==========================================
        // CREATE FORM DATA
        // ==========================================

        const formData =
            new FormData();


        formData.append(
            "name",
            name
        );


        formData.append(
            "category",
            category
        );


        formData.append(
            "description",
            document.getElementById(
                "description"
            ).value
        );


        formData.append(
            "price",
            price
        );


        formData.append(
            "dailyIncome",
            dailyIncome
        );


        formData.append(
            "days",
            days
        );


        formData.append(
            "totalIncome",
            document.getElementById(
                "totalIncome"
            ).value
        );


        formData.append(
            "status",
            document.getElementById(
                "status"
            ).value
        );


        formData.append(
            "sortOrder",
            document.getElementById(
                "sortOrder"
            ).value
        );


        // ==========================================
        // IMAGE
        // ==========================================

        const image =
            document.getElementById(
                "image"
            ).files[0];


        if (image) {

            formData.append(
                "image",
                image
            );

        }


        // ==========================================
        // SAVE BUTTON
        // ==========================================

        const saveButton =
            document.getElementById(
                "savePlanBtn"
            );


        const originalButtonText =
            saveButton.innerHTML;


        try {

            saveButton.disabled =
                true;


            saveButton.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Saving...

            `;


            // ==========================================
            // API REQUEST
            // ==========================================

            const response =
                await fetch(API_URL, {

                    method: "POST",

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    },

                    body: formData

                });


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to create plan."
                );

            }


            if (data.success) {

                alert(
                    "Plan created successfully!"
                );


                // RESET FORM

                document.getElementById(
                    "planForm"
                ).reset();


                // RESET IMAGE PREVIEW

                const preview =
                    document.getElementById(
                        "preview"
                    );


                preview.src = "";

                preview.style.display =
                    "none";


                // RELOAD PLANS

                loadPlans();

            }

            else {

                alert(
                    data.message ||
                    "Failed to create plan."
                );

            }


        } catch (error) {

            console.error(
                "CREATE PLAN ERROR:",
                error
            );


            alert(
                error.message ||
                "Something went wrong."
            );

        }

        finally {

            saveButton.disabled =
                false;


            saveButton.innerHTML =
                originalButtonText;

        }

    }
);


// ==========================================
// DELETE PLAN
// ==========================================

async function deletePlan(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this plan?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {

                    method: "DELETE",

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to delete plan."
            );

        }


        alert(
            data.message ||
            "Plan deleted successfully."
        );


        loadPlans();


    } catch (error) {

        console.error(
            "DELETE PLAN ERROR:",
            error
        );


        alert(
            error.message ||
            "Something went wrong."
        );

    }

}


// ==========================================
// EDIT PLAN
// ==========================================

function editPlan(id) {

    const plan =
        allPlans.find(
            plan =>
                plan._id === id
        );


    if (!plan) {

        alert("Plan not found.");

        return;

    }


    // Fill form with existing values

    document.getElementById(
        "name"
    ).value =
        plan.name || "";


    document.getElementById(
        "category"
    ).value =
        plan.category || "starter";


    document.getElementById(
        "description"
    ).value =
        plan.description || "";


    document.getElementById(
        "price"
    ).value =
        plan.price || "";


    document.getElementById(
        "dailyIncome"
    ).value =
        plan.dailyIncome || "";


    document.getElementById(
        "days"
    ).value =
        plan.days || "";


    document.getElementById(
        "totalIncome"
    ).value =
        plan.totalIncome || "";


    document.getElementById(
        "status"
    ).value =
        String(plan.status);


    document.getElementById(
        "sortOrder"
    ).value =
        plan.sortOrder || 0;


    // Scroll to form

    document.getElementById(
        "planFormContainer"
    ).scrollIntoView({

        behavior: "smooth",

        block: "start"

    });


    alert(
        "Plan data loaded into the form. " +
        "Editing API can be connected next."
    );

}


// ==========================================
// SEARCH PLANS
// ==========================================

document.getElementById(
    "searchPlan"
).addEventListener(
    "input",
    function () {

        const search =
            this.value
                .toLowerCase()
                .trim();


        const filteredPlans =
            allPlans.filter(plan => {

                const name =
                    String(
                        plan.name || ""
                    ).toLowerCase();


                const category =
                    String(
                        plan.category || ""
                    ).toLowerCase();


                const description =
                    String(
                        plan.description || ""
                    ).toLowerCase();


                return (

                    name.includes(search) ||

                    category.includes(search) ||

                    description.includes(search)

                );

            });


        renderPlans(filteredPlans);

    }
);


// ==========================================
// LOGOUT
// ==========================================

document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    function (event) {

        event.preventDefault();


        const confirmLogout =
            confirm(
                "Are you sure you want to logout?"
            );


        if (!confirmLogout) {

            return;

        }


        localStorage.removeItem(
            "adminToken"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "ki_token"
        );

        localStorage.removeItem(
            "user"
        );


        window.location.href =
            "../auth.html";

    }
);


// ==========================================
// LOAD PAGE
// ==========================================

loadPlans();