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
    const gstStatusEl = document.getElementById("gstStatus");

    if (abn.length === 11) {
        entityInput.value = "Verifying...";
        hideGstStatus();
        try {
            const response = await fetch(`${SCRIPT_URL}?abn=${abn}`);
            const result = await response.json();
            if (result.name === "Entity Not Found" || (result.name && result.name.includes("Error"))) {
                entityInput.value = "";
                entityInput.placeholder = "ABN not found — enter manually";
                entityInput.readOnly = false;
                hideGstStatus();
            } else {
                entityInput.value = result.name;
                entityInput.readOnly = true;
                showGstStatus(result.gstStatus, result.gstFrom);
            }
        } catch (e) {
            entityInput.value = "";
            entityInput.readOnly = false;
            entityInput.placeholder = "Lookup failed — enter manually";
            hideGstStatus();
        }
    }
}

// =============================================================
// GST STATUS DISPLAY
// =============================================================
function hideGstStatus() {
    const el = document.getElementById("gstStatus");
    if (!el) return;
    el.hidden = true;
    el.className = "gst-status";
    document.getElementById("gstStatusInput").value = "";
    document.getElementById("gstFromInput").value = "";
}

function showGstStatus(status, fromDate) {
    const el = document.getElementById("gstStatus");
    const label = document.getElementById("gstStatusLabel");
    const date = document.getElementById("gstStatusDate");
    if (!el || !label || !date) return;

    // Persist to hidden inputs so the values are included in form submission
    document.getElementById("gstStatusInput").value = status || "";
    document.getElementById("gstFromInput").value = fromDate || "";

    el.className = "gst-status";
    if (!status) { el.hidden = true; return; }

    let variant = "";
    let labelText = "GST: ";
    let dateText = "";

    if (status === "Registered") {
        variant = "registered";
        labelText = "GST Registered";
        if (fromDate) dateText = "since " + fromDate;
    } else if (status === "Not Registered") {
        variant = "not-registered";
        labelText = "Not Registered for GST";
    } else if (status.indexOf("Cancelled") === 0) {
        variant = "cancelled";
        labelText = "GST Cancelled";
        // status string is "Cancelled DD Mmm YYYY"
        const m = status.match(/^Cancelled\s+(.+)$/);
        if (m) dateText = "on " + m[1];
        if (fromDate) dateText = "registered " + fromDate + (dateText ? ", " + dateText : "");
    } else {
        // Unknown status — fall through gracefully
        labelText = "GST: " + status;
    }

    label.textContent = labelText;
    date.textContent = dateText;
    if (variant) el.classList.add(variant);
    el.hidden = false;
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
// CURRENCY FORMATTING — display with commas, store as plain number
// =============================================================
function parseCurrency(str) {
    if (str === null || str === undefined) return 0;
    const cleaned = String(str).replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
}

function formatCurrencyInput(input) {
    // Remember caret position so cursor doesn't jump to the end after reformat
    const start = input.selectionStart;
    const before = input.value;
    const digitsBeforeCaret = (before.slice(0, start).match(/[0-9]/g) || []).length;

    // Strip non-digits, then reformat with commas
    const digitsOnly = before.replace(/[^0-9]/g, "");
    if (digitsOnly === "") {
        input.value = "";
        return;
    }

    // Cap at a sensible max (999,999,999) to prevent silly inputs
    const trimmed = digitsOnly.slice(0, 9);
    const formatted = parseInt(trimmed, 10).toLocaleString("en-AU");
    input.value = formatted;

    // Restore caret to the same logical digit position
    let newCaret = 0;
    let digitsSeen = 0;
    while (newCaret < formatted.length && digitsSeen < digitsBeforeCaret) {
        if (/[0-9]/.test(formatted[newCaret])) digitsSeen++;
        newCaret++;
    }
    try { input.setSelectionRange(newCaret, newCaret); } catch (_) {}
}

// =============================================================
// POLICY CHECK — logic UNCHANGED from original
// =============================================================
function runPolicyCheck() {
    const loan = parseCurrency(document.getElementById("loanAmount").value);
    const val = parseCurrency(document.getElementById("value").value);
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
        // Reformat currency fields with commas as the user types
        if (id === "loanAmount" || id === "value") formatCurrencyInput(el);
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
    hideGstStatus();
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

    // Build payload — strip commas from currency fields so the backend receives plain numbers
    const formData = new FormData(form);
    formData.set("loanAmount", parseCurrency(formData.get("loanAmount")));
    formData.set("value", parseCurrency(formData.get("value")));

    fetch(SCRIPT_URL, { method: "POST", body: formData })
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

// =============================================================
// SIDEBAR NAVIGATION & TABS
// =============================================================
(function initNav() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    const toggle = document.getElementById("navToggle");
    const tabButtons = document.querySelectorAll(".side-nav-item[data-tab]");
    const tabPanels = document.querySelectorAll(".tab-panel");

    function closeSidebar() {
        sidebar.classList.remove("open");
        backdrop.classList.remove("show");
        toggle.setAttribute("aria-expanded", "false");
    }

    function openSidebar() {
        sidebar.classList.add("open");
        backdrop.classList.add("show");
        toggle.setAttribute("aria-expanded", "true");
    }

    if (toggle) {
        toggle.addEventListener("click", () => {
            if (sidebar.classList.contains("open")) closeSidebar();
            else openSidebar();
        });
    }

    if (backdrop) {
        backdrop.addEventListener("click", closeSidebar);
    }

    // Close on Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.classList.contains("open")) closeSidebar();
    });

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-tab");

            tabButtons.forEach(b => b.classList.toggle("active", b === btn));
            tabPanels.forEach(p => {
                p.classList.toggle("active", p.id === `tab-${target}`);
            });

            // Scroll to top of content on tab change
            window.scrollTo({ top: 0, behavior: "smooth" });

            // Close sidebar on mobile after tap
            if (window.innerWidth <= 880) closeSidebar();
        });
    });
})();

// =============================================================
// POSTCODE → SUBURB / STATE AUTO-FILL
// Uses community AU postcode dataset via jsDelivr CDN.
// Fallback: if dataset fails to load, suburb becomes a free-text input.
// =============================================================
(function initPostcodeLookup() {
    // Try the bundled local file first (host it next to portal.js for full independence).
    // If absent, fall back to public CDN mirrors of the same dataset.
    const POSTCODE_DATA_URLS = [
        "australian-postcodes.json",                                                                  // 1. Local copy (recommended — host alongside portal.js)
        "https://cdn.jsdelivr.net/gh/schappim/australian-postcodes@master/australian-postcodes.json", // 2. jsDelivr CDN mirror
        "https://raw.githubusercontent.com/schappim/australian-postcodes/master/australian-postcodes.json" // 3. GitHub raw fallback
    ];

    const postcodeInput = document.getElementById("postcode");
    const suburbSelect = document.getElementById("suburb");
    const stateInput = document.getElementById("propertyState");
    const hint = document.getElementById("postcodeHint");

    if (!postcodeInput || !suburbSelect || !stateInput) return;

    // Index will be { "2000": [{suburb:"Sydney",state:"NSW"}, ...], ... }
    let postcodeIndex = null;
    let datasetLoading = false;
    let datasetFailed = false;

    function setHint(text, cls) {
        if (!hint) return;
        hint.textContent = text;
        hint.classList.remove("loading", "ok", "err");
        if (cls) hint.classList.add(cls);
    }

    function buildIndex(rows) {
        const idx = {};
        for (const r of rows) {
            // Support both schappim ({postcode, suburb, state}) and matthewproctor ({postcode, locality, state, type}) field names
            const pc = String(r.postcode || "").padStart(4, "0");
            const suburb = String(r.suburb || r.locality || "").trim();
            const state = String(r.state || "").trim();
            if (!pc || !suburb || !state || pc.length !== 4) continue;
            // If a type field exists, filter out PO Box / LVR entries
            const type = String(r.type || "").toLowerCase();
            if (type.includes("post office") || type === "po boxes" || type === "lvr") continue;

            if (!idx[pc]) idx[pc] = [];
            const existing = idx[pc].some(s => s.suburb === suburb && s.state === state);
            if (!existing) idx[pc].push({ suburb, state });
        }
        for (const pc in idx) idx[pc].sort((a, b) => a.suburb.localeCompare(b.suburb));
        return idx;
    }

    async function loadDataset() {
        if (postcodeIndex || datasetLoading || datasetFailed) return;
        datasetLoading = true;

        let lastError = null;
        for (const url of POSTCODE_DATA_URLS) {
            try {
                const resp = await fetch(url, { cache: "force-cache" });
                if (!resp.ok) { lastError = "HTTP " + resp.status; continue; }
                const rows = await resp.json();
                postcodeIndex = buildIndex(rows);
                datasetLoading = false;
                if (postcodeInput.value.length === 4) handlePostcodeChange();
                return;
            } catch (e) {
                lastError = e;
                // try next source
            }
        }

        console.warn("All postcode data sources failed — falling back to manual entry.", lastError);
        datasetLoading = false;
        datasetFailed = true;
        convertSuburbToTextInput();
    }

    function convertSuburbToTextInput() {
        const newInput = document.createElement("input");
        newInput.type = "text";
        newInput.id = "suburb";
        newInput.name = "suburb";
        newInput.placeholder = "Enter suburb";
        newInput.required = true;
        suburbSelect.replaceWith(newInput);
        stateInput.removeAttribute("readonly");
        stateInput.placeholder = "Enter state";
        setHint("Address lookup unavailable — please enter manually", "err");
    }

    function resetSuburbSelect(placeholder) {
        suburbSelect.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = placeholder;
        suburbSelect.appendChild(opt);
        suburbSelect.disabled = true;
        stateInput.value = "";
    }

    function handlePostcodeChange() {
        const pc = postcodeInput.value.replace(/\D/g, "").slice(0, 4);
        // Sync cleaned value back to the input
        if (pc !== postcodeInput.value) postcodeInput.value = pc;

        // Reset state if postcode is incomplete
        if (pc.length < 4) {
            resetSuburbSelect("Enter postcode first");
            setHint("Type a 4-digit postcode", "");
            return;
        }

        // Dataset still loading — show loading hint
        if (!postcodeIndex) {
            if (datasetFailed) return; // already converted to free text
            setHint("Loading suburb list…", "loading");
            resetSuburbSelect("Loading…");
            return;
        }

        const matches = postcodeIndex[pc];
        if (!matches || matches.length === 0) {
            setHint("No suburbs found for this postcode", "err");
            resetSuburbSelect("No suburbs found");
            // Allow manual entry as fallback
            stateInput.removeAttribute("readonly");
            return;
        }

        // Populate suburb dropdown
        suburbSelect.innerHTML = "";
        if (matches.length > 1) {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = `– Select suburb (${matches.length} options) –`;
            suburbSelect.appendChild(placeholder);
        }
        matches.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.suburb;
            opt.textContent = m.suburb;
            opt.dataset.state = m.state;
            suburbSelect.appendChild(opt);
        });
        suburbSelect.disabled = false;

        // Auto-select if exactly 1 suburb
        if (matches.length === 1) {
            suburbSelect.value = matches[0].suburb;
            stateInput.value = matches[0].state;
            setHint(`✓ ${matches[0].suburb}, ${matches[0].state}`, "ok");
        } else {
            // Multiple suburbs — set state from the first match (they all share the same state for a single postcode in practice)
            stateInput.value = matches[0].state;
            setHint(`${matches.length} suburbs found — please choose`, "ok");
        }
    }

    // When the user picks a suburb from the dropdown, sync the state
    suburbSelect.addEventListener("change", () => {
        const selected = suburbSelect.selectedOptions[0];
        if (selected && selected.dataset.state) {
            stateInput.value = selected.dataset.state;
        }
    });

    // Hook into postcode input — fires after existing runPolicyCheck listener
    postcodeInput.addEventListener("input", handlePostcodeChange);

    // Kick off dataset load (non-blocking)
    loadDataset();
})();
