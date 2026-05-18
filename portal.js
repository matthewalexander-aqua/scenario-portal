const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLCFPz6n-rOTbqBs59xQXMp2xiQ0bCZ1Tae0eXsjndSZPLSJhWrd9mkNJJarLIdh2ouA/exec";

// =============================================================
// POSTCODE METRO RANGES (unchanged from original policy)
// =============================================================
const METRO_RANGES = [
    [800, 820], [828, 832], [1000, 1920], [2000, 2308], [2500, 2534],
    [2555, 2574], [2600, 2617], [2745, 2786], [2900, 2920], [3000, 3232],
    [3235, 3235], [3240, 3241], [3242, 3320], [3321, 3321], [3328, 3340],
    [3427, 3441], [3442, 3749], [3750, 3815], [3816, 3909], [3910, 3920],
    [3926, 3944], [3945, 3971], [3972, 3978], [3979, 3979], [3980, 3983],
    [3984, 3999], [4000, 4269], [4270, 4313], [4340, 4342], [4346, 4346],
    [4350, 4350], [4500, 4575], [5000, 5199], [5800, 5999], [6000, 6214],
    [6800, 6999], [7000, 7899], [8000, 8899], [9000, 9299], [9400, 9596]
];

function getZone(pc) {
    let p = parseInt(pc);
    if (!p || p < 200 || p > 9999) return "Invalid";
    return METRO_RANGES.some(r => p >= r[0] && p <= r[1]) ? "Metro" : "Non-Metro";
}

// =============================================================
// ABN LOOKUP
// =============================================================
async function lookupABN() {
    const abnInput = document.getElementById("abn");
    const abn = abnInput.value.replace(/\s/g, "");
    const entityInput = document.getElementById("entityName");

    if (abn.length === 11) {
        entityInput.value = "Verifying...";
        try {
            const response = await fetch(`${SCRIPT_URL}?abn=${abn}`);
            const result = await response.json();
            if (result.name === "Entity Not Found" || result.name.includes("Error")) {
                entityInput.value = "";
                entityInput.placeholder = "ABN not found — enter manually";
                entityInput.readOnly = false;
            } else {
                entityInput.value = result.name;
                entityInput.readOnly = true;
            }
        } catch (e) {
            entityInput.value = "";
            entityInput.readOnly = false;
            entityInput.placeholder = "Lookup failed — enter manually";
        }
    }
}

// =============================================================
// POPULATE LOAN TERMS based on interest type
// =============================================================
function populateTerms() {
    const type = document.getElementById("interestType").value;
    const max = (type === "Capitalised") ? 18 : 36;
    const select = document.getElementById("loanTerm");
    select.innerHTML = "";
    for (let i = 3; i <= max; i += 3) {
        const o = document.createElement("option");
        o.value = i;
        o.text = i + " Months";
        select.appendChild(o);
    }
}

// =============================================================
// FEEDBACK HELPERS — replaces inline-style approach
// =============================================================
function showFeedback(el, message, type) {
    el.innerHTML = message;
    el.classList.remove("ok", "err");
    el.classList.add("show", type);
}

function hideFeedback(el) {
    el.classList.remove("show", "ok", "err");
    el.innerHTML = "";
}

// =============================================================
// POLICY CHECK — logic UNCHANGED from original
// =============================================================
function runPolicyCheck() {
    const loan = parseFloat(document.getElementById("loanAmount").value) || 0;
    const val = parseFloat(document.getElementById("value").value) || 0;
    const asset = document.getElementById("assetType").value;
    const pc = document.getElementById("postcode").value;
    const land = document.getElementById("landSize").value;
    const interestType = document.getElementById("interestType").value;
    const propFeedback = document.getElementById("propertyFeedback");
    const loanFeedback = document.getElementById("loanFeedback");
    const lvrSpan = document.getElementById("lvr");
    const pcStatus = document.getElementById("postcodeStatus");
    const submitBtn = document.getElementById("submitButton");

    // LVR calculation
    const lvr = val > 0 ? (loan / val) * 100 : 0;
    lvrSpan.innerText = lvr.toFixed(2) + "%";

    // Postcode zone status
    const zone = getZone(pc);
    pcStatus.classList.remove("metro", "non-metro");
    if (pc.length >= 3) {
        pcStatus.innerText = `Location: ${zone}`;
        pcStatus.classList.add(zone === "Metro" ? "metro" : "non-metro");
    } else {
        pcStatus.innerText = "";
    }

    // ------- Property Policy -------
    let propError = "";
    let loanError = "";

    if (asset === "Vacant Land" && zone === "Non-Metro") {
        propError = "INELIGIBLE PROPERTY: Non-Metro Vacant Land is not eligible.";
    } else if (land === "Large") {
        propError = "INELIGIBLE PROPERTY: Land size > 5HA is not eligible.";
    } else if (pc.length === 4 && zone === "Invalid") {
        propError = "INVALID POSTCODE: Enter a valid 4-digit postcode.";
    }

    // ------- Loan Policy -------
    if (!propError && loan > 0 && val > 0) {
        if (interestType === "Capitalised" && lvr > 70) {
            loanError = "POLICY ALERT: Max LVR is 70.00% for Fully Capitalised scenarios.";
        } else if (asset === "Residential" || asset === "Townhouse") {
            let maxLVR = (loan > 5000000) ? 70 : 75;
            if (land === "Medium") {
                maxLVR = (zone === "Metro") ? 60 : 55;
                if (loan > 3000000) loanError = "POLICY ALERT: Loan capped at $3M for 1HA-5HA land.";
            }
            if (!loanError && lvr > maxLVR) loanError = `POLICY ALERT: Max LVR is ${maxLVR}% for this asset.`;
        } else if (asset === "Unit") {
            if (loan > 3000000 || lvr > 75) loanError = "POLICY ALERT: Max $3M loan / 75% LVR for Units.";
        } else if (asset === "Commercial") {
            let maxLVR = (zone === "Metro") ? (loan <= 3000000 ? 70 : 65) : (loan <= 3000000 ? 62.5 : 57.5);
            if (land === "Medium") {
                maxLVR = (zone === "Metro") ? 60 : 55;
                if (loan > 3000000) loanError = "POLICY ALERT: Loan capped at $3M for 1HA-5HA land.";
            }
            if (!loanError && lvr > maxLVR) loanError = `POLICY ALERT: Max LVR is ${maxLVR}% for Commercial (${zone}).`;
        } else if (asset === "Vacant Land") {
            if (loan > 3000000 || lvr > 60) loanError = "POLICY ALERT: Max $3M / 60% LVR for Metro Vacant Land.";
        }
    }

    // ------- Render feedback -------
    if (propError) {
        showFeedback(propFeedback, `⚠️ ${propError}`, "err");
    } else if (pc.length === 4) {
        showFeedback(propFeedback, "✅ Property eligible per location policy.", "ok");
    } else {
        hideFeedback(propFeedback);
    }

    if (loanError) {
        showFeedback(loanFeedback, `⚠️ ${loanError}`, "err");
    } else if (loan > 0 && val > 0) {
        showFeedback(loanFeedback, "✅ Loan figures meet standard LVR policy.", "ok");
    } else {
        hideFeedback(loanFeedback);
    }

    // ------- Submit button state -------
    submitBtn.disabled = !!(propError || loanError);
}

// =============================================================
// EVENT BINDINGS
// =============================================================
["loanAmount", "value", "assetType", "postcode", "landSize", "interestType"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
        if (id === "interestType") populateTerms();
        runPolicyCheck();
    });
    // selects also need change for some browsers
    if (el.tagName === "SELECT") {
        el.addEventListener("change", () => {
            if (id === "interestType") populateTerms();
            runPolicyCheck();
        });
    }
});

document.getElementById("abn").addEventListener("blur", lookupABN);
document.getElementById("abn").addEventListener("focus", () => {
    document.getElementById("entityName").value = "";
});

populateTerms();

// =============================================================
// SUBMIT
// =============================================================
function submitScenario() {
    const form = document.getElementById("scenarioForm");
    const status = document.getElementById("status");

    if (!form.checkValidity()) {
        // surface the first invalid field
        form.reportValidity();
        status.className = "status err";
        status.innerText = "Please complete all required fields.";
        return;
    }

    status.className = "status pending";
    status.innerText = "Submitting...";

    fetch(SCRIPT_URL, { method: "POST", body: new FormData(form) })
        .then(() => {
            status.className = "status ok";
            status.innerHTML = "✅ Success — scenario submitted. Your Aquamore RM will be in touch.";
            form.reset();
            populateTerms();
            hideFeedback(document.getElementById("propertyFeedback"));
            hideFeedback(document.getElementById("loanFeedback"));
            document.getElementById("lvr").innerText = "0%";
            document.getElementById("postcodeStatus").innerText = "";
            document.getElementById("postcodeStatus").classList.remove("metro", "non-metro");
            // re-enable submit (form.reset doesn't restore disabled state)
            document.getElementById("submitButton").disabled = false;
            // scroll status into view
            status.scrollIntoView({ behavior: "smooth", block: "center" });
        })
        .catch(() => {
            status.className = "status err";
            status.innerText = "❌ Submission failed. Please try again or contact your RM.";
        });
}
