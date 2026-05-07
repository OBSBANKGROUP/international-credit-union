document.addEventListener("DOMContentLoaded", function () {
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
    return (
      "$" +
      parseFloat(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  var session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  var users = getUsers();
  var user = users.find(function (u) {
    return u.id === session.id;
  });
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* balance — logs with no targetAccount fall back to user's primary account */
  function calcBal(accountType) {
    var primary = (user.accountType || "checking").toLowerCase();
    var b = 0;
    getLogs()
      .filter(function (l) {
        return l.userId === session.id && l.amount != null;
      })
      .forEach(function (l) {
        var acct = (l.targetAccount || primary).toLowerCase();
        if (acct !== accountType.toLowerCase()) return;
        if (l.txnType === "credit") b += parseFloat(l.amount);
        else if (l.txnType === "debit") b -= parseFloat(l.amount);
      });
    return b;
  }

  /* Build account dropdown */
  var fromSelect = document.getElementById("fromAccount");
  if (fromSelect) {
    var accts = user.accounts || {};
    accts[user.accountType || "checking"] = true;
    var last4 = user.accountNumber
      ? String(user.accountNumber).slice(-4)
      : "****";
    var html = "";
    if (accts.checking)
      html += '<option value="checking">Checking ••••' + last4 + "</option>";
    if (accts.savings)
      html += '<option value="savings">Savings ••••' + last4 + "</option>";
    if (accts.business)
      html += '<option value="business">Business ••••' + last4 + "</option>";
    fromSelect.innerHTML = html;
  }

  /* Live balance */
  var availBalEl = document.getElementById("availBal");
  function refreshBal() {
    var acc = fromSelect ? fromSelect.value : user.accountType || "checking";
    var b = calcBal(acc);
    if (availBalEl) {
      availBalEl.textContent = fmt(b);
      availBalEl.style.color = b <= 0 ? "#e53935" : "";
    }
  }
  refreshBal();
  if (fromSelect) fromSelect.addEventListener("change", refreshBal);

  var generatedOTP = "";
  var pendingTxn = {};

  /* Review */
  document.getElementById("reviewBtn").addEventListener("click", function () {
    var rec = document.getElementById("recipient").value.trim();
    var name = document.getElementById("recipientName").value.trim();
    var amtRaw = parseFloat(document.getElementById("amount").value);
    var acc = fromSelect ? fromSelect.value : user.accountType || "checking";
    var memo = document.getElementById("memo").value.trim();

    if (!rec) {
      alert("Please enter recipient email or phone.");
      return;
    }
    if (!name) {
      alert("Please enter recipient name.");
      return;
    }
    if (!amtRaw || amtRaw < 1) {
      alert("Minimum transfer is $1.");
      return;
    }
    if (amtRaw > 2500) {
      alert("Zelle limit is $2,500 per transaction.");
      return;
    }

    var tax = parseFloat((amtRaw * TAX_RATE).toFixed(2));
    var total = parseFloat((amtRaw + tax).toFixed(2));
    var bal = calcBal(acc);

    if (total > bal) {
      alert(
        "❌ Insufficient Balance\n\nTransfer:  " +
          fmt(amtRaw) +
          "\nFee (2%): " +
          fmt(tax) +
          "\nTotal:    " +
          fmt(total) +
          "\nAvailable: " +
          fmt(bal),
      );
      return;
    }

    pendingTxn = {
      rec,
      name,
      memo,
      amtRaw,
      tax,
      total,
      acc,
      txnId: "ZL" + Date.now(),
      date: new Date().toLocaleString(),
    };

    document.getElementById("cfTo").textContent = name;
    document.getElementById("cfContact").textContent = rec;
    document.getElementById("cfAmt").textContent = fmt(amtRaw);
    document.getElementById("cfFrom").textContent =
      acc.charAt(0).toUpperCase() + acc.slice(1);

    /* Inject fee into confirm modal */
    var modal = document.getElementById("confirmModal");
    modal.querySelectorAll(".injected-fee").forEach(function (r) {
      r.remove();
    });
    var lastRow = modal.querySelector(".detail-row:last-of-type");
    if (lastRow) {
      lastRow.insertAdjacentHTML(
        "afterend",
        '<div class="detail-row injected-fee"><span>Fee (2%)</span><strong style="color:#e53935">' +
          fmt(tax) +
          "</strong></div>" +
          '<div class="detail-row injected-fee" style="border-top:2px solid #f0f2f5;padding-top:10px"><span><b>Total Debited</b></span><strong style="color:#c62828">' +
          fmt(total) +
          "</strong></div>",
      );
    }
    modal.classList.add("open");
  });

  document.getElementById("cancelBtn").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("open");
  });

  /* Confirm → send OTP */
  document.getElementById("confirmBtn").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("open");
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    if (window._sendOTP)
      window._sendOTP(
        user.email || user.contactEmail,
        generatedOTP,
        user.firstName,
      );
    else console.log("Zelle OTP:", generatedOTP);
    document.getElementById("otpModal").classList.add("open");
  });

  document
    .getElementById("cancelOtpBtn")
    .addEventListener("click", function () {
      document.getElementById("otpModal").classList.remove("open");
    });

  /* Verify OTP → log */
  document.getElementById("verifyBtn").addEventListener("click", function () {
    var entered = document.getElementById("otpInput").value.trim();
    if (!entered) return;
    if (entered !== generatedOTP) {
      document.getElementById("otpInput").style.borderColor = "#e53935";
      setTimeout(function () {
        document.getElementById("otpInput").style.borderColor = "";
      }, 1500);
      alert("Invalid code. Try again.");
      return;
    }
    document.getElementById("otpModal").classList.remove("open");

    var logs = getLogs();
    var ts = new Date().toISOString();
    var uName = user.firstName + " " + user.lastName;

    logs.push({
      id: Date.now(),
      userId: session.id,
      userName: uName,
      action: "Zelle Transfer",
      details:
        "Sent to " +
        pendingTxn.name +
        " (" +
        pendingTxn.rec +
        ")" +
        (pendingTxn.memo ? " — " + pendingTxn.memo : ""),
      reason: pendingTxn.memo || "",
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
      details: "Fee for Zelle to " + pendingTxn.name,
      reason: "2% Zelle fee",
      amount: pendingTxn.tax,
      txnType: "debit",
      targetAccount: pendingTxn.acc,
      timestamp: ts,
      status: "completed",
      txnId: pendingTxn.txnId + "-FEE",
    });

    saveLogs(logs.length > 500 ? logs.slice(-500) : logs);

    var newBal = calcBal(pendingTxn.acc);
    refreshBal();

    if (window._sendDebitAlert)
      window._sendDebitAlert(
        user.email || user.contactEmail,
        pendingTxn.total,
        "Zelle to " + pendingTxn.name + " (" + pendingTxn.rec + ")",
        newBal,
        user.firstName,
      );

    document.getElementById("mainContent").style.display = "none";
    document.getElementById("successMsg").textContent =
      fmt(pendingTxn.amtRaw) +
      " sent to " +
      pendingTxn.name +
      " via Zelle. " +
      "Fee: " +
      fmt(pendingTxn.tax) +
      " | Total debited: " +
      fmt(pendingTxn.total);
    document.getElementById("successScreen").style.display = "block";
  });
});
