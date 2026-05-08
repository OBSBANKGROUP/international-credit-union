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

  /* ================= DATABASE ================= */
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
  // Uses form.querySelector("select") — works because from-account is FIRST select in form
  const fromAccSelect = form.querySelector("select");
  if (fromAccSelect) {
    const accts = currentUser.accounts || {};
    accts[currentUser.accountType || "checking"] = true;
    const last4 = currentUser.accountNumber
      ? String(currentUser.accountNumber).slice(-4)
      : "****";
    let options = '<option value="">Select Account</option>';
    if (accts.checking)
      options += `<option value="checking">Checking •••• ${last4}</option>`;
    if (accts.savings)
      options += `<option value="savings">Savings •••• ${last4}</option>`;
    if (accts.business)
      options += `<option value="business">Business •••• ${last4}</option>`;
    fromAccSelect.innerHTML = options;

    // Live balance display
    const balTag = document.createElement("p");
    balTag.style.cssText = "font-size:.84rem;font-weight:700;margin-top:6px";
    fromAccSelect.parentNode.appendChild(balTag);
    const updateBal = () => {
      const acc = fromAccSelect.value;
      if (!acc) {
        balTag.textContent = "";
        return;
      }
      const b = calcBalance(acc);
      balTag.textContent = "Available: $" + fmt(b);
      balTag.style.color = b <= 0 ? "#e53935" : "#2e7d32";
    };
    fromAccSelect.addEventListener("change", updateBal);
    updateBal();
  }

  /* ================= ACCOUNT LOOKUP ================= */
  function lookupBeneficiary() {
    const routing = routingInput.value.trim();
    const account = accountInput.value.trim();

    if (routing.length < 5 || account.length < 5) {
      resetBeneficiary();
      return;
    }

    // 1. Check internal ICU users
    const foundUser = users.find(
      (u) =>
        String(u.routingNumber) === routing &&
        String(u.accountNumber) === account,
    );

    // 2. Check external database — match routing OR wire routing
    const externalMatch = externalAccounts.find(
      (x) =>
        (x.routing === routing || x.wire === routing) && x.account === account,
    );

    if (foundUser) {
      beneficiaryInput.value = `${foundUser.firstName} ${foundUser.lastName}`;
      beneficiaryInput.setAttribute("readonly", true);
      showMsg("✓ Account found (ICU Member)", "green");
    } else if (externalMatch) {
      beneficiaryInput.value = externalMatch.name;
      beneficiaryInput.setAttribute("readonly", true);
      showMsg("✓ Account found (" + externalMatch.bank + ")", "green");
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
    beneficiaryMsg.style.display = "none";
    beneficiaryMsg.textContent = "";
  }

  function showMsg(text, color) {
    beneficiaryMsg.style.display = "block";
    beneficiaryMsg.style.color = color === "red" ? "#e53935" : "#2e7d32";
    beneficiaryMsg.style.fontWeight = "600";
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

    if (currentUser.status === "suspended") {
      alert("Your account is on hold. Contact support.");
      return;
    }
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

    if (total > bal) {
      alert(
        "❌ Insufficient Balance\n\n" +
          "Transfer amount:    $" +
          fmt(amtRaw) +
          "\n" +
          "Transfer fee (2%):  $" +
          fmt(tax) +
          "\n" +
          "Total required:     $" +
          fmt(total) +
          "\n" +
          "Available balance:  $" +
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
      bank,
      name: beneficiaryInput.value.trim(),
      toAcct: accountInput.value.trim(),
      routing: routingInput.value.trim(),
      accLabel: acc.charAt(0).toUpperCase() + acc.slice(1) + " ••••" + last4,
      txnId: "TXN" + Date.now(),
      date: new Date().toLocaleString(),
    };

    loadingScreen.style.display = "flex";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      sendOTP();
      otpModal.style.display = "flex";
    }, 2000);
  });

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
        "%c🔑 OTP: " + generatedOTP,
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

    /* ================= LOG DEBIT + FEE ================= */
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
    if (fromAccSelect) fromAccSelect.dispatchEvent(new Event("change"));
  });

  /* ================= RECEIPT ================= */
  function showReceipt(newBal) {
    const s = (id, v) => {
      const e = document.getElementById(id);
      if (e) e.innerText = v;
    };
    s("receiptFrom", pendingTxn.accLabel);
    s("receiptAmount", fmt(pendingTxn.amtRaw));
    s("receiptNote", pendingTxn.note || "—");
    s("receiptName", pendingTxn.name);
    s("receiptAccount", "••••" + pendingTxn.toAcct.slice(-4));
    s("receiptBank", pendingTxn.bank);
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

    receiptModal.style.display = "flex";
  }

  /* ================= CLOSE RECEIPT ================= */
  document.getElementById("closeReceiptBtn")?.addEventListener("click", () => {
    receiptModal.style.display = "none";
    pendingTxn = {};
  });

  document.getElementById("shareReceiptBtn")?.addEventListener("click", () => {
    const text = `ICU Wire Transfer Receipt\nTo: ${pendingTxn.name}\nBank: ${pendingTxn.bank}\nAmount: $${fmt(pendingTxn.amtRaw)}\nFee (2%): $${fmt(pendingTxn.tax)}\nTotal: $${fmt(pendingTxn.total)}\nRef: ${pendingTxn.txnId}\nDate: ${pendingTxn.date}`;
    if (navigator.share) navigator.share({ title: "ICU Receipt", text });
    else
      navigator.clipboard
        ?.writeText(text)
        .then(() => alert("Receipt copied to clipboard."));
  });
});
