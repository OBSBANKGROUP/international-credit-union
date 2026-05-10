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
    var accts = user.accounts || {};
    accts[user.accountType || "checking"] = true;
    var last4 = user.accountNumber
      ? String(user.accountNumber).slice(-4)
      : "****";
    var html = "";
    if (accts.checking)
      html +=
        '<option value="checking">Checking \u2022\u2022\u2022\u2022' +
        last4 +
        "</option>";
    if (accts.savings)
      html +=
        '<option value="savings">Savings \u2022\u2022\u2022\u2022' +
        last4 +
        "</option>";
    Object.keys(accts).forEach(function (k) {
      if (k === "checking" || k === "savings") return;
      if (!accts[k]) return;
      var label =
        typeof accts[k] === "object" && accts[k].name
          ? accts[k].name
          : user.businessName || "Business";
      html +=
        '<option value="' +
        k +
        '">' +
        label +
        " \u2022\u2022\u2022\u2022" +
        last4 +
        "</option>";
    });
    fromSelect.innerHTML = html;
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

  var generatedOTP = "";
  var pendingTxn = {};

  /* ── Review button ── */
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
      rec: rec,
      name: name,
      memo: memo,
      amtRaw: amtRaw,
      tax: tax,
      total: total,
      acc: acc,
      txnId: "ZL" + Date.now(),
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
                /* Face passed (never happens) — show confirm */
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
    document.getElementById("cfTo").textContent = pendingTxn.name;
    document.getElementById("cfContact").textContent = pendingTxn.rec;
    document.getElementById("cfAmt").textContent = fmt(pendingTxn.amtRaw);
    document.getElementById("cfFrom").textContent =
      pendingTxn.acc.charAt(0).toUpperCase() + pendingTxn.acc.slice(1);

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

  /* ── Confirm → OTP ── */
  document.getElementById("confirmBtn").addEventListener("click", function () {
    document.getElementById("confirmModal").classList.remove("open");
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    if (window._sendOTP)
      window._sendOTP(
        user.email || user.contactEmail,
        generatedOTP,
        user.firstName,
      );
    else
      console.log(
        "%c\uD83D\uDD11 Zelle OTP: " + generatedOTP,
        "background:#6b2d8b;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700;font-size:14px",
      );
    document.getElementById("otpModal").classList.add("open");
  });

  document
    .getElementById("cancelOtpBtn")
    .addEventListener("click", function () {
      document.getElementById("otpModal").classList.remove("open");
    });

  /* ── Verify OTP ── */
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
        (pendingTxn.memo ? " \u2014 " + pendingTxn.memo : ""),
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

    refreshBal();
    if (window._sendDebitAlert) {
      window._sendDebitAlert(
        user.email || user.contactEmail,
        pendingTxn.total,
        "Zelle to " + pendingTxn.name + " (" + pendingTxn.rec + ")",
        calcBal(pendingTxn.acc),
        user.firstName,
      );
    }

    document.getElementById("mainContent").style.display = "none";
    document.getElementById("successMsg").textContent =
      fmt(pendingTxn.amtRaw) +
      " sent to " +
      pendingTxn.name +
      " via Zelle. " +
      "Fee: " +
      fmt(pendingTxn.tax) +
      " | Total: " +
      fmt(pendingTxn.total);
    document.getElementById("successScreen").style.display = "block";

    var shareBtn = document.getElementById("shareSuccessBtn");
    if (shareBtn) {
      shareBtn.onclick = function () {
        var txt =
          "ICU Zelle Receipt\nTo: " +
          pendingTxn.name +
          " (" +
          pendingTxn.rec +
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
