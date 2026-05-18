document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */
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

  /* ================= ACCOUNT DATABASE ================= */
  const externalAccounts = [
    {
      bank: "Chase Bank",
      name: "Secretary of Defense for Personnel and Readiness",
      routing: "314074269",
      wire: "021000021",
      account: "6667838383",
      address: "1120 G St. NW, Washington, DC 20005, United States",
    },
    {
      bank: "TD Bank",
      name: "Knightsplash Company LLC",
      routing: "255076753",
      wire: "255076753",
      account: "8030166942",
      address: "12179 Clarksville Pike, Clarksville, MD 21029",
    },
    {
      bank: "Bank of America",
      name: "Jackson Cole",
      routing: "072000996",
      wire: "026009432",
      account: "375022688698",
      address: "3334 Palmer Hwy, Texas City, TX 77590",
    },
    {
      bank: "TD Bank",
      name: "Yen Tran",
      routing: "054001725",
      wire: "031101266",
      account: "4441467861",
      address: "13630 Foulger Square, Woodbridge, VA 22192",
    },
    {
      bank: "Chase Bank",
      name: "Shellian Watson",
      routing: "044000037",
      wire: "021000021",
      account: "788960158",
      address: "8435 Georgia Avenue, Silver Spring, Maryland 20910",
    },
    {
      bank: "Citibank",
      name: "Debra Levrie",
      routing: "113193532",
      wire: "113193532",
      account: "40503099518",
      address: "25 East Candle Street, Arlington Heights, Illinois 60005",
    },
  ];

  /* ================= SESSION ================= */
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";
  const TAX_RATE = 0.02;

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

  if (window.checkSuspended && window.checkSuspended()) return;

  const users = getUsers();
  const currentUser = users.find((u) => u.id === session.id);
  if (!currentUser) return (window.location.href = "index.html");

  /* ================= BALANCE ================= */
  function calcBalance(accountType) {
    const primary = (currentUser.accountType || "checking").toLowerCase();
    let bal = 0;
    getLogs().forEach((l) => {
      if (l.userId !== session.id || l.amount == null) return;
      const acct = (l.targetAccount || primary).toLowerCase();
      if (acct !== accountType.toLowerCase()) return;
      if (l.txnType === "credit") bal += parseFloat(l.amount);
      else if (l.txnType === "debit") bal -= parseFloat(l.amount);
    });
    return bal;
  }

  /* ================= POPULATE ACCOUNT DROPDOWN ================= */
  // Uses form.querySelector("select") — same as original zip
  // From-account MUST be the first <select> in the form
  const fromAccSelect = form.querySelector("select");
  if (fromAccSelect) {
    const rawAccts = currentUser.accounts
      ? JSON.parse(JSON.stringify(currentUser.accounts))
      : {};
    rawAccts[currentUser.accountType || "checking"] = true;

    const last4 = currentUser.accountNumber
      ? String(currentUser.accountNumber).slice(-4)
      : "****";
    let options = '<option value="">Select Account</option>';

    if (rawAccts.checking)
      options += `<option value="checking">Checking ••••${last4}</option>`;
    if (rawAccts.savings)
      options += `<option value="savings">Savings ••••${last4}</option>`;

    // Business accounts — supports legacy {business:true} and new {business_0:{name:"..."}}
    Object.keys(rawAccts).forEach((k) => {
      if (k === "checking" || k === "savings") return;
      const val = rawAccts[k];
      if (!val) return;
      const label =
        typeof val === "object" && val.name
          ? val.name
          : currentUser.businessName || "Business Account";
      options += `<option value="${k}">${label} ••••${last4}</option>`;
    });

    fromAccSelect.innerHTML = options;

    // Live balance display
    const balTag = document.createElement("p");
    balTag.style.cssText = "font-size:.84rem;font-weight:700;margin-top:6px";
    fromAccSelect.parentNode.appendChild(balTag);

    function updateBal() {
      const acc = fromAccSelect.value;
      if (!acc) {
        balTag.textContent = "";
        return;
      }
      const b = calcBalance(acc);
      balTag.textContent = `Available: $${fmt(b)}`;
      balTag.style.color = b <= 0 ? "#e53935" : "#2e7d32";
    }
    fromAccSelect.addEventListener("change", updateBal);
    updateBal();
  }

  /* ================= ACCOUNT LOOKUP (original zip logic) ================= */
  function lookupBeneficiary() {
    const routing = routingInput.value.trim();
    const account = accountInput.value.trim();

    if (routing.length < 5 || account.length < 5) {
      resetBeneficiary();
      return;
    }

    // 1. Check internal ICU users
    const foundUser = users.find(
      (u) => u.routingNumber === routing && u.accountNumber === account,
    );

    // 2. Check external database — match routing OR wire routing
    const externalMatch = externalAccounts.find(
      (x) =>
        (x.routing === routing || x.wire === routing) && x.account === account,
    );

    if (foundUser) {
      beneficiaryInput.value = `${foundUser.firstName} ${foundUser.lastName}`;
      beneficiaryInput.setAttribute("readonly", true);
      showMsg("✓ Account found (ICU Member).", "green");
    } else if (externalMatch) {
      beneficiaryInput.value = externalMatch.name;
      beneficiaryInput.setAttribute("readonly", true);
      // Auto-fill bank address if field exists and is empty
      const addrEl = document.getElementById("bankAddress");
      if (addrEl && !addrEl.value.trim())
        addrEl.value = externalMatch.address || "";
      showMsg(`✓ Account found (${externalMatch.bank}).`, "green");
    } else if (routing.length >= 9 && account.length >= 8) {
      beneficiaryInput.value = "";
      beneficiaryInput.removeAttribute("readonly");
      beneficiaryInput.placeholder = "Enter beneficiary name manually";
      showMsg(
        "❌ Name generation failed — account not in database. Enter name manually.",
        "red",
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
    beneficiaryInput.placeholder = "Will appear automatically";
    if (beneficiaryMsg) {
      beneficiaryMsg.style.display = "none";
      beneficiaryMsg.textContent = "";
    }
  }

  function showMsg(text, color) {
    if (!beneficiaryMsg) return;
    beneficiaryMsg.style.display = "block";
    beneficiaryMsg.style.color = color === "red" ? "#e53935" : "#2e7d32";
    beneficiaryMsg.style.fontWeight = "600";
    beneficiaryMsg.style.fontSize = ".82rem";
    beneficiaryMsg.style.marginTop = "6px";
    if (color === "red") {
      beneficiaryMsg.style.background = "#ffebee";
      beneficiaryMsg.style.padding = "8px 12px";
      beneficiaryMsg.style.borderRadius = "8px";
      beneficiaryMsg.style.border = "1px solid #ffcdd2";
    } else {
      beneficiaryMsg.style.background = "transparent";
      beneficiaryMsg.style.padding = "0";
      beneficiaryMsg.style.border = "none";
    }
    beneficiaryMsg.innerText = text;
  }

  /* ================= BANK SELECT ================= */
  bankSelect.addEventListener("change", () => {
    if (bankSelect.value === "other") {
      customBank.classList.remove("hidden");
      customBankInput.required = true;
    } else {
      customBank.classList.add("hidden");
      customBankInput.required = false;
      customBankInput.value = "";
    }
    resetBeneficiary();
  });

  /* ================= SUBMIT ================= */
  let generatedOTP = "";
  let pendingTxn = {};

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!beneficiaryInput.value.trim()) {
      alert("Please enter the beneficiary name.");
      return;
    }

    const acc = fromAccSelect ? fromAccSelect.value : "";
    const amtRaw = parseFloat(
      document.querySelector(".amount-input")?.value || 0,
    );

    if (!acc) {
      alert("Please select an account to send from.");
      return;
    }
    if (!amtRaw || amtRaw <= 0) {
      alert("Please enter a valid transfer amount.");
      return;
    }
    if (!bankSelect.value) {
      alert("Please select a recipient bank.");
      return;
    }

    const tax = parseFloat((amtRaw * TAX_RATE).toFixed(2));
    const total = parseFloat((amtRaw + tax).toFixed(2));
    const bal = calcBalance(acc);

    // Insufficient balance check
    if (total > bal) {
      alert(
        `❌ Insufficient Balance\n\n` +
          `Transfer amount:   $${fmt(amtRaw)}\n` +
          `Transfer fee (2%): $${fmt(tax)}\n` +
          `Total required:    $${fmt(total)}\n` +
          `Available balance: $${fmt(bal)}`,
      );
      return;
    }

    const bank =
      bankSelect.value === "other" ? customBankInput.value : bankSelect.value;
    const note = form.querySelector("textarea")?.value.trim() || "";
    const bankAddr = document.getElementById("bankAddress")?.value.trim() || "";
    const selOpt = fromAccSelect?.options[fromAccSelect.selectedIndex];
    const accLabel = selOpt ? selOpt.text : acc;

    pendingTxn = {
      amtRaw,
      tax,
      total,
      acc,
      accLabel,
      bank,
      bankAddr,
      note,
      name: beneficiaryInput.value.trim(),
      toAcct: accountInput.value.trim(),
      routing: routingInput.value.trim(),
      txnId: "TXN" + Date.now(),
      date: new Date().toLocaleString(),
    };

    // Step 1: PIN verification
    if (window.PinVerify) {
      PinVerify.prompt(
        () => {
          startLoadingAndOTP();
        },
        () => {},
      );
    } else {
      startLoadingAndOTP();
    }
  });

  function startLoadingAndOTP() {
    loadingScreen.style.display = "flex";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      sendOTP();
      otpModal.style.display = "flex";
    }, 2000);
  }

  /* ================= OTP ================= */
  function sendOTP() {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    if (window._sendOTP) {
      window._sendOTP(
        currentUser.email || currentUser.contactEmail,
        generatedOTP,
        currentUser.firstName,
      );
    } else {
      console.log(
        "%c🔑 Wire OTP: " + generatedOTP,
        "background:#4b38f5;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700;font-size:14px",
      );
    }
  }

  verifyOtpBtn.addEventListener("click", () => {
    if (otpInput.value.trim() !== generatedOTP) {
      otpInput.style.borderColor = "#e53935";
      setTimeout(() => {
        otpInput.style.borderColor = "";
      }, 1500);
      alert("Invalid OTP. Please try again.");
      return;
    }

    otpModal.style.display = "none";
    otpInput.value = "";

    // Log debit + fee
    const logs = getLogs();
    const ts = new Date().toISOString();
    const uName = `${currentUser.firstName} ${currentUser.lastName}`;

    logs.push({
      id: Date.now(),
      userId: session.id,
      userName: uName,
      action: "Wire Transfer",
      details: `Wire to ${pendingTxn.name} — ${pendingTxn.bank}${pendingTxn.note ? " | " + pendingTxn.note : ""}`,
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
      details: `Fee for wire to ${pendingTxn.name}`,
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
    if (fromAccSelect) fromAccSelect.dispatchEvent(new Event("change"));

    if (window._sendDebitAlert) {
      window._sendDebitAlert(
        currentUser.email || currentUser.contactEmail,
        pendingTxn.total,
        `Wire to ${pendingTxn.name} — ${pendingTxn.bank}`,
        newBal,
        currentUser.firstName,
      );
    }

    showReceipt(newBal);
    form.reset();
    resetBeneficiary();
  });

  /* ================= RECEIPT ================= */
  function showReceipt(newBal) {
    const s = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.innerText = v;
    };
    s("receiptFrom", pendingTxn.accLabel);
    s("receiptAmount", fmt(pendingTxn.amtRaw));
    s("receiptNote", pendingTxn.note || "—");
    s("receiptName", pendingTxn.name);
    s("receiptAccount", "••••" + pendingTxn.toAcct.slice(-4));
    s("receiptBank", pendingTxn.bank);
    s("receiptBankAddr", pendingTxn.bankAddr || "—");
    s("receiptId", pendingTxn.txnId);
    s("receiptDate", pendingTxn.date);

    // Inject fee + total + new balance rows
    const det = receiptModal?.querySelector(".receipt-details");
    if (det) {
      det.querySelectorAll(".inj-row").forEach((r) => r.remove());
      const anchor = det.querySelector(".detail-row");
      const extra =
        `<div class="detail-row inj-row"><span>Transfer Fee (2%)</span><span style="color:#e53935;font-weight:700">-$${fmt(pendingTxn.tax)}</span></div>` +
        `<div class="detail-row inj-row" style="border-top:2px solid #e8eaf0;padding-top:12px;margin-top:4px"><span style="font-weight:700">Total Debited</span><span style="color:#c62828;font-weight:700;font-size:1rem">-$${fmt(pendingTxn.total)}</span></div>` +
        `<div class="detail-row inj-row"><span>New Balance</span><span style="color:#2e7d32;font-weight:700">$${fmt(newBal)}</span></div>`;
      if (anchor) anchor.insertAdjacentHTML("afterend", extra);
    }
    if (receiptModal) receiptModal.style.display = "flex";
  }

  /* ================= RECEIPT BUTTONS ================= */
  document.getElementById("closeReceiptBtn")?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  document.getElementById("shareReceiptBtn")?.addEventListener("click", () => {
    const txt =
      `ICU Wire Transfer Receipt\n` +
      `To:        ${pendingTxn.name}\n` +
      `Bank:      ${pendingTxn.bank}\n` +
      `Amount:   $${fmt(pendingTxn.amtRaw)}\n` +
      `Fee (2%): $${fmt(pendingTxn.tax)}\n` +
      `Total:    $${fmt(pendingTxn.total)}\n` +
      `Ref:       ${pendingTxn.txnId}\n` +
      `Date:      ${pendingTxn.date}`;
    if (navigator.share) navigator.share({ title: "ICU Receipt", text: txt });
    else
      navigator.clipboard
        ?.writeText(txt)
        .then(() => alert("Receipt copied to clipboard."));
  });
});
