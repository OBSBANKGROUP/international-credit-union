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

  /* balance — falls back logs with no targetAccount to user's primary account */
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

  const form = document.getElementById("intlForm");
  const loading = document.getElementById("loadingScreen");
  const otpModal = document.getElementById("otpModal");
  const otpInput = document.getElementById("otpInput");
  const verifyBtn = document.getElementById("verifyOtpBtn");
  const fromSelect = form ? form.querySelector("select") : null;

  /* Build dropdown from admin-set accounts */
  function buildDropdown() {
    if (!fromSelect) return;
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
    fromSelect.innerHTML = html;
    updateBal();
  }
  buildDropdown();

  /* Live balance */
  const balTag = document.createElement("p");
  balTag.style.cssText = "font-size:.83rem;font-weight:700;margin-top:7px";
  if (fromSelect) fromSelect.parentNode.appendChild(balTag);

  function updateBal() {
    const acc = fromSelect ? fromSelect.value : "";
    if (!acc) {
      balTag.textContent = "";
      return;
    }
    const b = calcBalance(acc);
    balTag.textContent = "Available: $" + fmt(b);
    balTag.style.color = b <= 0 ? "#e53935" : "#2e7d32";
  }
  if (fromSelect) fromSelect.addEventListener("change", updateBal);

  let generatedOTP = "";
  let pendingTxn = {};

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const amtRaw = parseFloat(
        document.querySelector(".amount-input")?.value || 0,
      );
      if (!amtRaw || amtRaw <= 0) {
        alert("Please enter a valid amount.");
        return;
      }

      const acc = fromSelect ? fromSelect.value : "";
      if (!acc) {
        alert("Please select an account.");
        return;
      }

      const tax = parseFloat((amtRaw * TAX_RATE).toFixed(2));
      const total = parseFloat((amtRaw + tax).toFixed(2));
      const bal = calcBalance(acc);

      if (total > bal) {
        alert(
          "❌ Insufficient Balance\n\nTransfer:  $" +
            fmt(amtRaw) +
            "\nFee (2%): $" +
            fmt(tax) +
            "\nTotal:    $" +
            fmt(total) +
            "\nAvailable: $" +
            fmt(bal),
        );
        return;
      }

      const last4 = currentUser.accountNumber
        ? String(currentUser.accountNumber).slice(-4)
        : "****";
      pendingTxn = {
        amtRaw,
        tax,
        total,
        acc,
        accLabel: acc.charAt(0).toUpperCase() + acc.slice(1) + " ••••" + last4,
        bank: form.querySelector("input[type=text]")?.value || "—",
        name: document.getElementById("beneficiary")?.value || "—",
        toAcct: document.getElementById("account")?.value || "—",
        swift: document.getElementById("swift")?.value || "—",
        address: document.getElementById("bankAddress")?.value || "—",
        note: form.querySelector("textarea")?.value.trim() || "",
        txnId: "INTL" + Date.now(),
        date: new Date().toLocaleString(),
      };

      loading.style.display = "flex";
      setTimeout(() => {
        loading.style.display = "none";
        generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        if (window._sendOTP)
          window._sendOTP(
            currentUser.email || currentUser.contactEmail,
            generatedOTP,
            currentUser.firstName,
          );
        else console.log("Intl Wire OTP:", generatedOTP);
        otpModal.style.display = "flex";
      }, 2000);
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener("click", () => {
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

      const logs = getLogs();
      const ts = new Date().toISOString();
      const uName = currentUser.firstName + " " + currentUser.lastName;
      logs.push({
        id: Date.now(),
        userId: session.id,
        userName: uName,
        action: "International Wire",
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
        details: "Fee for international wire to " + pendingTxn.name,
        reason: "2% international wire fee",
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
          "International Wire to " + pendingTxn.name,
          newBal,
          currentUser.firstName,
        );

      // Populate receipt
      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.innerText = v;
      };
      set("rFrom", pendingTxn.accLabel);
      set("rAmount", "$" + fmt(pendingTxn.amtRaw));
      set("rBank", pendingTxn.bank);
      set("rAccount", "••••" + pendingTxn.toAcct.slice(-4));
      set("rName", pendingTxn.name);
      set("rSwift", pendingTxn.swift);
      set("rAddress", pendingTxn.address);

      const rm = document.getElementById("receiptModal");
      if (rm) {
        rm.querySelectorAll(".injected-row").forEach((r) => r.remove());
        const last = rm.querySelector(
          ".receipt-details .detail-row:last-child",
        );
        const html =
          `<div class="detail-row injected-row"><span>Transfer Fee (2%)</span><span style="color:#e53935;font-weight:700">-$${fmt(pendingTxn.tax)}</span></div>` +
          `<div class="detail-row injected-row" style="border-top:2px solid #e8eaf0;padding-top:12px;margin-top:4px"><span style="font-weight:700">Total Debited</span><span style="color:#c62828;font-weight:700">-$${fmt(pendingTxn.total)}</span></div>` +
          `<div class="detail-row injected-row"><span>New Balance</span><span style="color:#2e7d32;font-weight:700">$${fmt(newBal)}</span></div>`;
        if (last) last.insertAdjacentHTML("afterend", html);
        rm.style.display = "flex";
      }

      form.reset();
      updateBal();
    });
  }

  document.getElementById("doneBtn")?.addEventListener("click", () => {
    const rm = document.getElementById("receiptModal");
    if (rm) rm.style.display = "none";
    pendingTxn = {};
  });
});
