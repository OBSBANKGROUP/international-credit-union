document.addEventListener("DOMContentLoaded", () => {
  const TAX_RATE = 0.02;
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";

  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  }
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }
  function getLogs() {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  }
  function saveLogs(l) {
    localStorage.setItem(LOG_KEY, JSON.stringify(l));
  }
  function fmt(n) {
    return parseFloat(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const session = getSession();
  if (!session) return (window.location.href = "index.html");
  const users = getUsers();
  const currentUser = users.find((u) => u.id === session.id);
  if (!currentUser) return (window.location.href = "index.html");

  /* ----------------------------------------------------------
     BALANCE — counts every log for user+account
     Logs with no targetAccount fall back to user's primary type
  ---------------------------------------------------------- */
  function calcBalance(accountType) {
    const primary = (currentUser.accountType || "checking").toLowerCase();
    let bal = 0;
    getLogs()
      .filter((l) => l.userId === session.id && l.amount != null)
      .forEach((l) => {
        const acct = (l.targetAccount || primary).toLowerCase();
        if (acct !== accountType.toLowerCase()) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      });
    return bal;
  }

  /* ---- DOM ---- */
  const form = document.getElementById("wireForm");
  const bankSelect = document.getElementById("bankSelect");
  const customBank = document.getElementById("customBank");
  const customBankInput = document.getElementById("customBankInput");
  const routingInput = document.getElementById("routingNumber");
  const accountInput = document.getElementById("accountNumber");
  const beneficiaryInput = document.getElementById("beneficiaryName");
  const beneficiaryMsg = document.getElementById("beneficiaryMsg");
  const loadingScreen = document.getElementById("loadingScreen");
  const otpModal = document.getElementById("otpModal");
  const otpInput = document.getElementById("otpInput");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const receiptModal = document.getElementById("receiptModal");
  const fromAccSelect = form ? form.querySelector("select") : null;

  /* ---- Build account dropdown from admin-set accounts object ---- */
  function buildDropdown() {
    if (!fromAccSelect) return;
    const accts = currentUser.accounts || {
      [currentUser.accountType || "checking"]: true,
    };
    const last4 = currentUser.accountNumber
      ? String(currentUser.accountNumber).slice(-4)
      : "****";
    let html = '<option value="">Select Account</option>';
    if (accts.checking)
      html += `<option value="checking">Checking ••••${last4}</option>`;
    if (accts.savings)
      html += `<option value="savings">Savings ••••${last4}</option>`;
    if (accts.business)
      html += `<option value="business">Business ••••${last4}</option>`;
    fromAccSelect.innerHTML = html;
    updateBal();
  }
  buildDropdown();

  /* ---- Live balance display ---- */
  const balTag = document.createElement("p");
  balTag.style.cssText = "font-size:.83rem;font-weight:700;margin-top:7px";
  if (fromAccSelect) fromAccSelect.parentNode.appendChild(balTag);

  function updateBal() {
    const acc = fromAccSelect ? fromAccSelect.value : "";
    if (!acc) {
      balTag.textContent = "";
      return;
    }
    const b = calcBalance(acc);
    balTag.textContent = "Available: $" + fmt(b);
    balTag.style.color = b <= 0 ? "#e53935" : "#2e7d32";
  }
  if (fromAccSelect) fromAccSelect.addEventListener("change", updateBal);

  /* ---- External accounts database ---- */
  const externalAccounts = [
    {
      bank: "Chase Bank",
      name: "Secretary of Defense for Personnel and Readiness",
      routing: "314074269",
      wire: "021000021",
      account: "6667838383",
      swift: "CHASUS33",
      address: "1120 G St. NW, Washington, DC 20005, United States",
    },
    {
      bank: "TD Bank",
      name: "Knightsplash Company LLC",
      routing: "255076753",
      wire: "255076753",
      account: "8030166942",
      swift: "SMCUUS31",
      address: "12179 Clarksville Pike, Clarksville, MD 21029",
    },
    {
      bank: "Bank of America",
      name: "Jackson Cole",
      routing: "072000996",
      wire: "026009432",
      account: "375022688698",
      swift: "",
      address: "3334 Palmer Hwy, Texas City, TX 77590",
    },
    {
      bank: "TD Bank",
      name: "Yen Tran",
      routing: "054001725",
      wire: "031101266",
      account: "4441467861",
      swift: "NRTHUS33",
      address: "13630 Foulger Square, Woodbridge, VA 22192, United States",
    },
    {
      bank: "Chase Bank",
      name: "Shellian Watson",
      routing: "044000037",
      wire: "021000021",
      account: "788960158",
      swift: "CHASUS33",
      address: "8435 Georgia Avenue, Silver Spring, Maryland 20910",
    },
    {
      bank: "Citibank",
      name: "Debra Levrie",
      routing: "113193532",
      wire: "113193532",
      account: "40503099518",
      swift: "CITIUS33",
      address: "25 East Candle Street, Arlington Heights, Illinois 60005",
    },
  ];

  /* ---- Auto beneficiary lookup ---- */
  function lookupBeneficiary() {
    const r = routingInput.value.trim();
    const a = accountInput.value.trim();
    if (r.length < 5 || a.length < 5) {
      resetBeneficiary();
      return;
    }

    // Check internal ICU users first
    const internal = users.find(
      (u) => String(u.routingNumber) === r && String(u.accountNumber) === a,
    );

    // Match on routing number OR wire routing number + account number
    const external = externalAccounts.find(
      (x) => (x.routing === r || x.wire === r) && x.account === a,
    );

    if (internal) {
      beneficiaryInput.value = internal.firstName + " " + internal.lastName;
      beneficiaryInput.setAttribute("readonly", true);
      showMsg("✓ Account verified — ICU Member", "#2e7d32");
    } else if (external) {
      beneficiaryInput.value = external.name;
      beneficiaryInput.setAttribute("readonly", true);
      showMsg("✓ Account verified — " + external.bank, "#2e7d32");
    } else if (r.length >= 9 && a.length >= 8) {
      // Enough digits entered but no match found — show red error
      beneficiaryInput.value = "";
      beneficiaryInput.removeAttribute("readonly");
      showMsg(
        "❌ Name generation failed — account not in database. Enter name manually.",
        "#e53935",
      );
    } else {
      resetBeneficiary();
    }
  }

  routingInput.addEventListener("input", lookupBeneficiary);
  accountInput.addEventListener("input", lookupBeneficiary);

  function resetBeneficiary() {
    beneficiaryInput.value = "";
    beneficiaryInput.removeAttribute("readonly");
    if (beneficiaryMsg) {
      beneficiaryMsg.style.display = "none";
    }
  }
  function showMsg(text, color) {
    if (!beneficiaryMsg) return;
    if (!text) {
      beneficiaryMsg.style.display = "none";
      return;
    }
    beneficiaryMsg.style.display = "block";
    beneficiaryMsg.style.color = color;
    beneficiaryMsg.style.fontWeight = color === "#e53935" ? "700" : "600";
    beneficiaryMsg.style.fontSize = ".83rem";
    beneficiaryMsg.style.marginTop = "6px";
    beneficiaryMsg.style.padding = color === "#e53935" ? "8px 12px" : "0";
    beneficiaryMsg.style.background =
      color === "#e53935" ? "#ffebee" : "transparent";
    beneficiaryMsg.style.borderRadius = color === "#e53935" ? "8px" : "0";
    beneficiaryMsg.innerText = text;
  }

  bankSelect.addEventListener("change", () => {
    const isOther = bankSelect.value === "other";
    customBank.classList.toggle("hidden", !isOther);
    customBankInput.required = isOther;
    if (!isOther) customBankInput.value = "";
    resetBeneficiary();
  });

  /* ---- Submit ---- */
  let generatedOTP = "";
  let pendingTxn = {};

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (currentUser.status === "suspended") {
      alert("Your account is on hold. Contact support.");
      return;
    }

    const amtRaw = parseFloat(
      document.querySelector(".amount-input")?.value || 0,
    );
    if (!amtRaw || amtRaw <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!beneficiaryInput.value.trim()) {
      alert("Please confirm the beneficiary name.");
      return;
    }

    const acc = fromAccSelect ? fromAccSelect.value : "";
    if (!acc) {
      alert("Please select an account to send from.");
      return;
    }

    const tax = parseFloat((amtRaw * TAX_RATE).toFixed(2));
    const total = parseFloat((amtRaw + tax).toFixed(2));
    const bal = calcBalance(acc);

    if (total > bal) {
      alert(
        "❌ Insufficient Balance\n\n" +
          "Transfer:   $" +
          fmt(amtRaw) +
          "\n" +
          "Fee (2%):   $" +
          fmt(tax) +
          "\n" +
          "Total:      $" +
          fmt(total) +
          "\n" +
          "Available:  $" +
          fmt(bal),
      );
      return;
    }

    const bank =
      bankSelect.value === "other" ? customBankInput.value : bankSelect.value;
    const note = form.querySelector("textarea")?.value.trim() || "";
    const last4 = currentUser.accountNumber
      ? String(currentUser.accountNumber).slice(-4)
      : "****";

    pendingTxn = {
      amtRaw,
      tax,
      total,
      acc,
      note,
      accLabel: acc.charAt(0).toUpperCase() + acc.slice(1) + " ••••" + last4,
      bank,
      name: beneficiaryInput.value.trim(),
      toAcct: accountInput.value.trim(),
      routing: routingInput.value.trim(),
      txnId: "TXN" + Date.now(),
      date: new Date().toLocaleString(),
    };

    loadingScreen.style.display = "flex";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      if (window._sendOTP)
        window._sendOTP(
          currentUser.email || currentUser.contactEmail,
          generatedOTP,
          currentUser.firstName,
        );
      else console.log("Wire OTP:", generatedOTP);
      otpModal.style.display = "flex";
    }, 2000);
  });

  /* ---- Verify OTP ---- */
  verifyOtpBtn.addEventListener("click", () => {
    if (!otpInput.value.trim()) return;
    if (otpInput.value.trim() !== generatedOTP) {
      otpInput.style.borderColor = "#e53935";
      setTimeout(() => {
        otpInput.style.borderColor = "";
      }, 1500);
      alert("Invalid code. Try again.");
      return;
    }
    otpModal.style.display = "none";
    otpInput.value = "";

    // Log both entries
    const logs = getLogs();
    const ts = new Date().toISOString();
    const uName = currentUser.firstName + " " + currentUser.lastName;
    logs.push({
      id: Date.now(),
      userId: session.id,
      userName: uName,
      action: "Wire Transfer",
      details:
        "Wire to " +
        pendingTxn.name +
        " — " +
        pendingTxn.bank +
        (pendingTxn.note ? " | " + pendingTxn.note : ""),
      reason: pendingTxn.note || "",
      amount: pendingTxn.amtRaw,
      txnType: "debit",
      targetAccount: pendingTxn.acc,
      timestamp: ts,
      status: "completed",
      txnId: pendingTxn.txnId,
    });
    logs.push({
      id: Date.now() + 1,
      userId: session.id,
      userName: uName,
      action: "Transfer Fee (2%)",
      details: "Fee for wire to " + pendingTxn.name,
      reason: "2% wire transfer fee",
      amount: pendingTxn.tax,
      txnType: "debit",
      targetAccount: pendingTxn.acc,
      timestamp: ts,
      status: "completed",
      txnId: pendingTxn.txnId + "-FEE",
    });
    saveLogs(logs.length > 500 ? logs.slice(-500) : logs);

    const newBal = calcBalance(pendingTxn.acc);
    if (window._sendDebitAlert)
      window._sendDebitAlert(
        currentUser.email || currentUser.contactEmail,
        pendingTxn.total,
        "Wire to " + pendingTxn.name,
        newBal,
        currentUser.firstName,
      );

    // Populate receipt
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.innerText = v;
    };
    set("receiptFrom", pendingTxn.accLabel);
    set("receiptAmount", fmt(pendingTxn.amtRaw));
    set("receiptNote", pendingTxn.note || "—");
    set("receiptName", pendingTxn.name);
    set("receiptAccount", "••••" + (pendingTxn.toAcct.slice(-4) || "****"));
    set("receiptBank", pendingTxn.bank);
    set("receiptId", pendingTxn.txnId);
    set("receiptDate", pendingTxn.date);

    const details = receiptModal?.querySelector(".receipt-details");
    if (details) {
      details.querySelectorAll(".injected-row").forEach((r) => r.remove());
      const ref =
        details.querySelector(".detail-row:nth-child(2)") ||
        details.querySelector(".detail-row");
      const html =
        `<div class="detail-row injected-row"><span>Transfer Fee (2%)</span><span style="color:#e53935;font-weight:700">-$${fmt(pendingTxn.tax)}</span></div>` +
        `<div class="detail-row injected-row" style="border-top:2px solid #e8eaf0;padding-top:12px;margin-top:4px"><span style="font-weight:700">Total Debited</span><span style="color:#c62828;font-weight:700;font-size:1rem">-$${fmt(pendingTxn.total)}</span></div>` +
        `<div class="detail-row injected-row"><span>New Balance</span><span style="color:#2e7d32;font-weight:700">$${fmt(newBal)}</span></div>`;
      if (ref) ref.insertAdjacentHTML("afterend", html);
    }
    if (receiptModal) receiptModal.style.display = "flex";

    form.reset();
    resetBeneficiary();
    updateBal();
  });

  document.getElementById("closeReceiptBtn")?.addEventListener("click", () => {
    if (receiptModal) receiptModal.style.display = "none";
    pendingTxn = {};
  });

  document.getElementById("shareReceiptBtn")?.addEventListener("click", () => {
    const text =
      "ICU Wire Receipt\n─────────────────\nTo: " +
      pendingTxn.name +
      "\nBank: " +
      pendingTxn.bank +
      "\nAmount: $" +
      fmt(pendingTxn.amtRaw) +
      "\nFee (2%): $" +
      fmt(pendingTxn.tax) +
      "\nTotal: $" +
      fmt(pendingTxn.total) +
      "\nRef: " +
      pendingTxn.txnId +
      "\nDate: " +
      pendingTxn.date;
    if (navigator.share) navigator.share({ title: "ICU Receipt", text });
    else
      navigator.clipboard?.writeText(text).then(() => alert("Receipt copied."));
  });
});
