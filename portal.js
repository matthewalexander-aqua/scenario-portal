const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLCFPz6n-rOTbqBs59xQXMp2xiQ0bCZ1Tae0eXsjndSZPLSJhWrd9mkNJJarLIdh2ouA/exec";

// Postcode Ranges
const METRO_RANGES = [[800,820],[828,832],[1000,1920],[2000,2308],[2500,2534],[2555,2574],[2600,2617],[2745,2786],[2900,2920],[3000,3232],[3235,3235],[3240,3241],[3242,3320],[3321,3321],[3328,3340],[3427,3441],[3442,3749],[3750,3815],[3816,3909],[3910,3920],[3926,3944],[3945,3971],[3972,3978],[3979,3979],[3980,3983],[3984,3999],[4000,4269],[4270,4313],[4340,4342],[4346,4346],[4350,4350],[4500,4575],[5000,5199],[5800,5999],[6000,6214],[6800,6999],[7000,7899],[8000,8899],[9000,9299],[9400,9596]];

function getZone(pc) {
    let p = parseInt(pc);
    if (!p || p < 200 || p > 9999) return "Invalid";
    return METRO_RANGES.some(r => p >= r[0] && p <= r[1]) ? "Metro" : "Non-Metro";
}

// Live ABN Lookup using Google Script
async function lookupABN() {
    let abnInput = document.getElementById("abn");
    let abn = abnInput.value.replace(/\s/g, "");
    let entityInput = document.getElementById("entityName");
    
    if (abn.length === 11) {
        entityInput.value = "Verifying...";
        try {
            let response = await fetch(`${SCRIPT_URL}?abn=${abn}`);
            let result = await response.json();
            if (result.name === "Entity Not Found") {
                alert("Invalid ABN. Please check the number.");
                entityInput.value = "";
            } else {
                entityInput.value = result.name;
            }
        } catch (e) {
            entityInput.value = "";
        }
    }
}

function populateTerms() {
    const type = document.getElementById("interestType").value;
    const max = (type === "Capitalised") ? 18 : 36;
    const select = document.getElementById("loanTerm");
    select.innerHTML = "";
    for (let i = 3; i <= max; i += 3) {
        let o = document.createElement("option");
        o.value = i; o.text = i + " Months";
        select.appendChild(o);
    }
}

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

    let lvr = val > 0 ? (loan / val) * 100 : 0;
    lvrSpan.innerText = lvr.toFixed(2) + "%";
    
    const zone = getZone(pc);
    if (pc.length >= 3) {
        pcStatus.innerText = `Location: ${zone}`;
        pcStatus.style.color = (zone === "Metro") ? "#0f8f66" : "#d9534f";
    }

    let propError = "";
    let loanError = "";

    // Security Eligibility
    if (asset === "Vacant Land" && zone === "Non-Metro") {
        propError = "INELIGIBLE PROPERTY: Non-Metro Vacant Land is not eligible.";
    } else if (land === "Large") {
        propError = "INELIGIBLE PROPERTY: Land size > 5HA is not eligible.";
    } else if (pc.length === 4 && zone === "Invalid") {
        propError = "INVALID POSTCODE: Enter a valid 4-digit postcode.";
    }

    // Loan Policy
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

    // UI Updates
    if (propError) {
        propFeedback.innerHTML = `⚠️ ${propError}`; propFeedback.style.display = "block";
        propFeedback.style.background = "#f8d7da"; propFeedback.style.color = "#721c24";
    } else if (pc.length === 4) {
        propFeedback.innerHTML = "✅ Property eligible per location policy."; propFeedback.style.display = "block";
        propFeedback.style.background = "#d4edda"; propFeedback.style.color = "#155724";
    } else { propFeedback.style.display = "none"; }

    if (loanError) {
        loanFeedback.innerHTML = `⚠️ ${loanError}`; loanFeedback.style.display = "block";
        loanFeedback.style.background = "#f8d7da"; loanFeedback.style.color = "#721c24";
    } else if (loan > 0 && val > 0) {
        loanFeedback.innerHTML = "✅ Loan figures meet standard LVR policy."; loanFeedback.style.display = "block";
        loanFeedback.style.background = "#d4edda"; loanFeedback.style.color = "#155724";
    } else { loanFeedback.style.display = "none"; }

    submitBtn.disabled = (propError || loanError);
    submitBtn.style.opacity = (propError || loanError) ? "0.4" : "1";
    submitBtn.style.cursor = (propError || loanError) ? "not-allowed" : "pointer";
}

["loanAmount","value","assetType","postcode","landSize","interestType"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
        if (id === "interestType") populateTerms();
        runPolicyCheck();
    });
});
document.getElementById("abn").addEventListener("blur", lookupABN); // Triggers lookup on blur

populateTerms();

function submitScenario() {
    const form = document.getElementById("scenarioForm");
    if (!form.checkValidity()) { alert("Please complete all required fields."); return; }
    document.getElementById("status").innerText = "Submitting to Aquamore...";
    fetch(SCRIPT_URL, { method: "POST", body: new FormData(form) })
    .then(() => {
        document.getElementById("status").innerHTML = "✅ SUCCESS: Scenario submitted.";
        form.reset(); populateTerms();
        document.getElementById("propertyFeedback").style.display = "none";
        document.getElementById("loanFeedback").style.display = "none";
        document.getElementById("lvr").innerText = "0%";
    }).catch(() => { document.getElementById("status").innerText = "❌ ERROR: Submission failed."; });
}
