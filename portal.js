const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzHRugrSISOKZSDD0gmYsc9BlaRF4EpL00-bvEXfEXoTtArSVylCO9b63KIP9JzuNcErQ/exec";

const METRO_RANGES = [[800,820],[828,832],[1000,1920],[2000,2308],[2500,2534],[2555,2574],[2600,2617],[2745,2786],[2900,2920],[3000,3232],[3235,3235],[3240,3241],[3242,3320],[3321,3321],[3328,3340],[3427,3441],[3442,3749],[3750,3815],[3816,3909],[3910,3920],[3926,3944],[3945,3971],[3972,3978],[3979,3979],[3980,3983],[3984,3999],[4000,4269],[4270,4313],[4340,4342],[4346,4346],[4350,4350],[4500,4575],[5000,5199],[5800,5999],[6000,6214],[6800,6999],[7000,7899],[8000,8899],[9000,9299],[9400,9596]];

function getZone(pc) {
    let p = parseInt(pc);
    if (!p || p < 200 || p > 9999) return "Invalid";
    return METRO_RANGES.some(r => p >= r[0] && p <= r[1]) ? "Metro" : "Non-Metro";
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
    const feedback = document.getElementById("policyFeedback");
    const lvrSpan = document.getElementById("lvr");
    const pcStatus = document.getElementById("postcodeStatus");
    const submitBtn = document.getElementById("submitButton");

    let lvr = 0;
    if (val > 0) {
        lvr = (loan / val) * 100;
        lvrSpan.innerText = lvr.toFixed(2) + "%";
    }

    if (!pc) { pcStatus.innerText = ""; return; }
    const zone = getZone(pc);
    pcStatus.innerText = `Location: ${zone}`;
    pcStatus.style.color = zone === "Metro" ? "#0f8f66" : "#2c3e50";

    let error = "";
    feedback.style.display = (loan > 0 && val > 0) ? "block" : "none";

    // 1. Capitalised Interest Overlay
    if (interestType === "Capitalised" && lvr > 70) {
        error = "Policy Alert: Max LVR is 70.00% for Fully Capitalised scenarios.";
    } 
    // 2. Land Size Check
    else if (land === "Large") {
        error = "Ineligible: Land size > 5HA requires financier consent.";
    } 
    // 3. Asset Logic
    else if (asset === "Residential" || asset === "Townhouse") {
        let maxLVR = (loan > 5000000) ? 70 : 75;
        if (land === "Medium") {
            maxLVR = (zone === "Metro") ? 60 : 55;
            if (loan > 3000000) error = "Loan capped at $3M for 1HA-5HA land.";
        }
        if (!error && lvr > maxLVR) error = `Policy Alert: Max LVR is ${maxLVR}% for this asset.`;
    } else if (asset === "Unit") {
        if (loan > 3000000) error = "Loan capped at $3M for Units.";
        if (!error && lvr > 75) error = "Policy Alert: Max LVR is 75% for Units.";
    } else if (asset === "Commercial") {
        let maxLVR = (zone === "Metro") ? (loan <= 3000000 ? 70 : 65) : (loan <= 3000000 ? 62.5 : 57.5);
        if (land === "Medium") {
            maxLVR = (zone === "Metro") ? 60 : 55;
            if (loan > 3000000) error = "Loan capped at $3M for 1HA-5HA land.";
        }
        if (!error && lvr > maxLVR) error = `Policy Alert: Max LVR is ${maxLVR}% for Commercial (${zone}).`;
    } else if (asset === "Vacant Land") {
        let maxLVR = (zone === "Metro") ? 60 : 55;
        if (loan > 3000000) error = "Loan capped at $3M for Vacant Land.";
        if (!error && lvr > maxLVR) error = `Policy Alert: Max LVR is ${maxLVR}% for Vacant Land (${zone}).`;
    }

    if (error) {
        feedback.innerHTML = `⚠️ ${error}`;
        feedback.style.background = "#f8d7da"; feedback.style.color = "#721c24";
        submitBtn.style.opacity = "0.5"; // Visual cue to stop
    } else {
        feedback.innerHTML = "✅ Scenario appears within standard policy guidelines.";
        feedback.style.background = "#d4edda"; feedback.style.color = "#155724";
        submitBtn.style.opacity = "1";
    }
}

["loanAmount","value","assetType","postcode","landSize","interestType"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
        if (id === "interestType") populateTerms();
        runPolicyCheck();
    });
});

populateTerms();

function submitScenario() {
    const form = document.getElementById("scenarioForm");
    const status = document.getElementById("status");
    if (!form.checkValidity()) { alert("Please complete all required fields."); return; }

    status.innerText = "Submitting...";
    fetch(SCRIPT_URL, { method: "POST", body: new FormData(form) })
    .then(() => {
        status.innerHTML = "✅ SUCCESS: Scenario submitted.";
        form.reset();
        populateTerms();
    }).catch(() => { status.innerText = "❌ ERROR: Submission failed."; });
}
