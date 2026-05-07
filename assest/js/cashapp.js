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

  var pendingTxn = {};

  document.getElementById("reviewBtn").addEventListener("click", function () {
    var tag = document.getElementById("cashtag").value.trim();
    var amtRaw = parseFloat(document.getElementById("amount").value);
    var acc = fromSelect ? fromSelect.value : user.accountType || "checking";
    var name = document.getElementById("recipientName").value.trim() || tag;
    var note = document.getElementById("noteField").value.trim();

    if (!tag) {
      alert("Please enter a $Cashtag or phone number.");
      return;
    }
    if (!amtRaw || amtRaw < 1) {
      alert("Minimum transfer is $1.");
      return;
    }
    if (amtRaw > 2500) {
      alert("Cash App limit is $2,500 per transaction.");
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
      tag,
      name,
      note,
      amtRaw,
      tax,
      total,
      acc,
      txnId: "CA" + Date.now(),
      date: new Date().toLocaleString(),
    };

    document.getElementById("cfTo").textContent = name + " (" + tag + ")";
    document.getElementById("cfAmt").textContent = fmt(amtRaw);
    document.getElementById("cfFrom").textContent =
      acc.charAt(0).toUpperCase() + acc.slice(1) + " Account";
    document.getElementById("cfNote").textContent = note || "—";

    /* Inject fee into modal */
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

  document.getElementById("confirmBtn").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("open");

    var logs = getLogs();
    var ts = new Date().toISOString();
    var uName = user.firstName + " " + user.lastName;

    logs.push({
      id: Date.now(),
      userId: session.id,
      userName: uName,
      action: "Cash App Transfer",
      details:
        "Sent to " +
        pendingTxn.name +
        " (" +
        pendingTxn.tag +
        ")" +
        (pendingTxn.note ? " — " + pendingTxn.note : ""),
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
      details: "Fee for Cash App to " + pendingTxn.name,
      reason: "2% Cash App fee",
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
        "Cash App to " + pendingTxn.name + "(" + pendingTxn.tag + ")",
        newBal,
        user.firstName,
      );

    document.getElementById("mainContent").style.display = "none";
    document.getElementById("successMsg").textContent =
      fmt(pendingTxn.amtRaw) +
      " sent to " +
      pendingTxn.tag +
      ". Fee: " +
      fmt(pendingTxn.tax) +
      " | Total debited: " +
      fmt(pendingTxn.total);
    document.getElementById("successScreen").style.display = "block";
  });
});
