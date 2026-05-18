document.addEventListener("DOMContentLoaded", function () {
  var TAX_RATE = 0.02;
  var SESSION_KEY = "icu_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

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

  /* ── Session guard ── */
  var session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  if (window.checkSuspended && window.checkSuspended()) return;

  var users = getUsers();
  var currentUser = users.find(function (u) {
    return u.id === session.id;
  });
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  /* ── Balance ── */
  function calcBalance(accountType) {
    var primary = (currentUser.accountType || "checking").toLowerCase();
    var bal = 0;
    getLogs().forEach(function (l) {
      if (l.userId !== session.id || l.amount == null) return;
      var acct = (l.targetAccount || primary).toLowerCase();
      if (acct !== accountType.toLowerCase()) return;
      if (l.txnType === "credit") bal += parseFloat(l.amount);
      else if (l.txnType === "debit") bal -= parseFloat(l.amount);
    });
    return bal;
  }

  /* ── Elements ── */
  var form = document.getElementById("intlForm");
  var loading = document.getElementById("loadingScreen");
  var otpModal = document.getElementById("otpModal");
  var otpInput = document.getElementById("otpInput");
  var verifyBtn = document.getElementById("verifyOtpBtn");

  /* ── Build account dropdown ── */
  var fromAccSelect =
    document.getElementById("intlFromAccount") ||
    (form ? form.querySelector("select") : null);
  if (fromAccSelect) {
    var accts = currentUser.accounts
      ? JSON.parse(JSON.stringify(currentUser.accounts))
      : {};
    accts[currentUser.accountType || "checking"] = true;
    var last4 = currentUser.accountNumber
      ? String(currentUser.accountNumber).slice(-4)
      : "****";
    var opts = "<option value=''>Select Account</option>";
    if (accts.checking)
      opts +=
        "<option value='checking'>Checking \u2022\u2022\u2022\u2022" +
        last4 +
        "</option>";
    if (accts.savings)
      opts +=
        "<option value='savings'>Savings \u2022\u2022\u2022\u2022" +
        last4 +
        "</option>";
    Object.keys(accts).forEach(function (k) {
      if (k === "checking" || k === "savings") return;
      if (!accts[k]) return;
      var label =
        typeof accts[k] === "object" && accts[k].name
          ? accts[k].name
          : currentUser.businessName || "Business";
      opts +=
        "<option value='" +
        k +
        "'>" +
        label +
        " \u2022\u2022\u2022\u2022" +
        last4 +
        "</option>";
    });
    fromAccSelect.innerHTML = opts;

    /* Live balance */
    var balTag = document.createElement("p");
    balTag.style.cssText = "font-size:.84rem;font-weight:700;margin-top:6px";
    fromAccSelect.parentNode.appendChild(balTag);
    function updateBal() {
      var acc = fromAccSelect.value;
      if (!acc) {
        balTag.textContent = "";
        return;
      }
      var b = calcBalance(acc);
      balTag.textContent = "Available: $" + fmt(b);
      balTag.style.color = b <= 0 ? "#e53935" : "#2e7d32";
    }
    fromAccSelect.addEventListener("change", updateBal);
    updateBal();
  }

  var otp = "";
  var pending = {};

  /* ── Submit ── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var acc = fromAccSelect ? fromAccSelect.value : "";
    var amtRaw = parseFloat(
      document.querySelector(".amount-input")
        ? document.querySelector(".amount-input").value
        : 0,
    );

    if (!acc) {
      alert("Please select an account to send from.");
      return;
    }
    if (!amtRaw || amtRaw <= 0) {
      alert("Please enter a valid transfer amount.");
      return;
    }

    var tax = parseFloat((amtRaw * TAX_RATE).toFixed(2));
    var total = parseFloat((amtRaw + tax).toFixed(2));
    var bal = calcBalance(acc);

    if (total > bal) {
      alert(
        "\u274C Insufficient Balance\n\nTransfer:   $" +
          fmt(amtRaw) +
          "\nFee (2%):  $" +
          fmt(tax) +
          "\nTotal:      $" +
          fmt(total) +
          "\nAvailable:  $" +
          fmt(bal),
      );
      return;
    }

    var selOpt = fromAccSelect
      ? fromAccSelect.options[fromAccSelect.selectedIndex]
      : null;
    var accLabel = selOpt ? selOpt.text : acc;
    var bankEl = form.querySelector("input[type=text]");
    var bank = bankEl ? bankEl.value : "";
    var benef = document.getElementById("beneficiary")
      ? document.getElementById("beneficiary").value
      : "";
    var acctNo = document.getElementById("account")
      ? document.getElementById("account").value
      : "";
    var swift = document.getElementById("swift")
      ? document.getElementById("swift").value
      : "";
    var bankAddr = document.getElementById("bankAddress")
      ? document.getElementById("bankAddress").value
      : "";

    pending = {
      acc: acc,
      accLabel: accLabel,
      amtRaw: amtRaw,
      tax: tax,
      total: total,
      bank: bank,
      benef: benef,
      acctNo: acctNo,
      swift: swift,
      bankAddr: bankAddr,
      txnId: "INTL" + Date.now(),
      date: new Date().toLocaleString(),
    };

    /* Step 1: PIN */
    if (window.PinVerify) {
      PinVerify.prompt(
        function () {
          startLoadingOTP();
        },
        function () {},
      );
    } else {
      startLoadingOTP();
    }
  });

  function startLoadingOTP() {
    loading.style.display = "flex";
    setTimeout(function () {
      loading.style.display = "none";
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      if (window._sendOTP) {
        window._sendOTP(
          currentUser.email || currentUser.contactEmail,
          otp,
          currentUser.firstName,
        );
      } else {
        console.log(
          "%c\uD83D\uDD11 Intl Wire OTP: " + otp,
          "background:#4b38f5;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700",
        );
      }
      otpModal.style.display = "flex";
    }, 2000);
  }

  /* ── Verify OTP ── */
  verifyBtn.addEventListener("click", function () {
    if (otpInput.value.trim() !== otp) {
      otpInput.style.borderColor = "#e53935";
      setTimeout(function () {
        otpInput.style.borderColor = "";
      }, 1500);
      alert("Invalid OTP. Try again.");
      return;
    }
    otpModal.style.display = "none";
    otpInput.value = "";

    /* Log debit + fee */
    var logs = getLogs();
    var ts = new Date().toISOString();
    var uName = currentUser.firstName + " " + currentUser.lastName;
    logs.push({
      id: Date.now(),
      userId: session.id,
      userName: uName,
      action: "International Wire",
      details: "Wire to " + pending.benef + " \u2014 " + pending.bank,
      amount: pending.amtRaw,
      txnType: "debit",
      targetAccount: pending.acc,
      timestamp: ts,
      status: "completed",
      txnId: pending.txnId,
    });
    logs.push({
      id: Date.now() + 1,
      userId: session.id,
      userName: uName,
      action: "Transfer Fee (2%)",
      details: "Fee for international wire to " + pending.benef,
      amount: pending.tax,
      txnType: "debit",
      targetAccount: pending.acc,
      timestamp: ts,
      status: "completed",
      txnId: pending.txnId + "-FEE",
    });
    saveLogs(logs.length > 500 ? logs.slice(-500) : logs);

    if (fromAccSelect) fromAccSelect.dispatchEvent(new Event("change"));

    showReceipt();
    form.reset();
  });

  /* ── Receipt ── */
  function showReceipt() {
    function s(id, v) {
      var el = document.getElementById(id);
      if (el) el.innerText = v;
    }
    s("rFrom", pending.accLabel);
    s("rAmount", "$" + fmt(pending.amtRaw));
    s("rBank", pending.bank);
    s(
      "rAccount",
      "\u2022\u2022\u2022\u2022" + (pending.acctNo.slice(-4) || "****"),
    );
    s("rName", pending.benef);
    s("rSwift", pending.swift);
    s("rAddress", pending.bankAddr);
    document.getElementById("receiptModal").style.display = "flex";
  }

  document.getElementById("doneBtn") &&
    document.getElementById("doneBtn").addEventListener("click", function () {
      document.getElementById("receiptModal").style.display = "none";
      pending = {};
    });
});
