document.addEventListener("DOMContentLoaded", function () {
  var TAX_RATE = 0.02;
  var USERS_KEY = "icu_users";
  var SESSION_KEY = "icu_session";
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
  if (window.checkSuspended && window.checkSuspended()) return;
  var users = getUsers();
  var user = users.find(function (u) {
    return u.id === session.id;
  });
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* ── Balance ── */
  function calcBal(type) {
    var primary = (user.accountType || "checking").toLowerCase();
    var b = 0;
    getLogs().forEach(function (l) {
      if (l.userId !== session.id || l.amount == null) return;
      var acct = (l.targetAccount || primary).toLowerCase();
      if (acct !== type.toLowerCase()) return;
      if (l.txnType === "credit") b += parseFloat(l.amount);
      else if (l.txnType === "debit") b -= parseFloat(l.amount);
    });
    return b;
  }

  /* ── Build account dropdown (includes business accounts) ── */
  var fromSelect = document.getElementById("fromAccount");
  if (fromSelect) {
    var last4_fromSelect = user.accountNumber
      ? String(user.accountNumber).slice(-4)
      : "****";
    var ddOpts = '<option value="">Select Account</option>';
    ddOpts +=
      '<option value="checking">Checking Account ••••' +
      last4_fromSelect +
      "</option>";
    ddOpts +=
      '<option value="savings">Savings Account ••••' +
      last4_fromSelect +
      "</option>";
    var ddAccts = user.accounts
      ? JSON.parse(JSON.stringify(user.accounts))
      : {};
    Object.keys(ddAccts).forEach(function (k) {
      if (k === "checking" || k === "savings") return;
      var v = ddAccts[k];
      if (!v) return;
      var lbl =
        typeof v === "object" && v.name
          ? v.name
          : user.businessName || "Business Account";
      ddOpts +=
        '<option value="' +
        k +
        '">' +
        lbl +
        " ••••" +
        last4_fromSelect +
        "</option>";
    });
    fromSelect.innerHTML = ddOpts;
  }

  /* ── Live balance ── */
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

  /* ── Review button ── */
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
        "\u274C Insufficient Balance\n\nTransfer: " +
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
      tag: tag,
      name: name,
      note: note,
      amtRaw: amtRaw,
      tax: tax,
      total: total,
      acc: acc,
      txnId: "CA" + Date.now(),
      date: new Date().toLocaleString(),
    };

    /* ── Step 1: PIN ── */
    if (window.PinVerify) {
      PinVerify.prompt(
        function () {
          /* ── Step 2: Face verification ── */
          if (window.FaceVerify) {
            FaceVerify.prompt(
              function () {
                /* Face passed (never happens in current logic) — show confirm */
                showConfirmModal();
              },
              function (reason) {
                if (reason !== "cancelled") {
                  alert(
                    "Transfer blocked: Face verification failed. For assistance contact support.",
                  );
                }
              },
            );
          } else {
            showConfirmModal();
          }
        },
        function () {
          /* PIN cancelled */
        },
      );
    } else {
      showConfirmModal();
    }
  });

  function showConfirmModal() {
    document.getElementById("cfTo").textContent =
      pendingTxn.name + " (" + pendingTxn.tag + ")";
    document.getElementById("cfAmt").textContent = fmt(pendingTxn.amtRaw);
    document.getElementById("cfFrom").textContent =
      pendingTxn.acc.charAt(0).toUpperCase() +
      pendingTxn.acc.slice(1) +
      " Account";
    document.getElementById("cfNote").textContent = pendingTxn.note || "\u2014";

    var modal = document.getElementById("confirmModal");
    modal.querySelectorAll(".injected-fee").forEach(function (r) {
      r.remove();
    });
    var lastRow = modal.querySelector(".detail-row:last-of-type");
    if (lastRow) {
      lastRow.insertAdjacentHTML(
        "afterend",
        '<div class="detail-row injected-fee"><span>Fee (2%)</span><strong style="color:#e53935">' +
          fmt(pendingTxn.tax) +
          "</strong></div>" +
          '<div class="detail-row injected-fee" style="border-top:2px solid #f0f2f5;padding-top:10px">' +
          '<span><b>Total Debited</b></span><strong style="color:#c62828">' +
          fmt(pendingTxn.total) +
          "</strong></div>",
      );
    }
    modal.classList.add("open");
  }

  document.getElementById("cancelBtn").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("open");
  });

  /* ── Confirm ── */
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
        (pendingTxn.note ? " \u2014 " + pendingTxn.note : ""),
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

    refreshBal();
    if (window._sendDebitAlert) {
      window._sendDebitAlert(
        user.email || user.contactEmail,
        pendingTxn.total,
        "Cash App to " + pendingTxn.name + " (" + pendingTxn.tag + ")",
        calcBal(pendingTxn.acc),
        user.firstName,
      );
    }

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

    var shareBtn = document.getElementById("shareSuccessBtn");
    if (shareBtn) {
      shareBtn.onclick = function () {
        var txt =
          "ICU Cash App Receipt\nTo: " +
          pendingTxn.name +
          " (" +
          pendingTxn.tag +
          ")\nAmount: " +
          fmt(pendingTxn.amtRaw) +
          "\nFee (2%): " +
          fmt(pendingTxn.tax) +
          "\nTotal: " +
          fmt(pendingTxn.total) +
          "\nRef: " +
          pendingTxn.txnId +
          "\nDate: " +
          pendingTxn.date;
        if (navigator.share)
          navigator.share({ title: "ICU Receipt", text: txt });
        else if (navigator.clipboard)
          navigator.clipboard.writeText(txt).then(function () {
            alert("Receipt copied.");
          });
      };
    }
  });
});
