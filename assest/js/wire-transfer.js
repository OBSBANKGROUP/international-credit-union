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
  var me = users.find(function (u) {
    return u.id === session.id;
  });
  if (!me) {
    window.location.href = "index.html";
    return;
  }

  /* ── Balance ── */
  function calcBalance(accountType) {
    var primary = (me.accountType || "checking").toLowerCase();
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
  var form = document.getElementById("wireForm");
  var fromAccSelect = document.getElementById("fromAccount"); // explicit id
  var bankSelect = document.getElementById("bankSelect");
  var customBank = document.getElementById("customBank");
  var customBankInput = document.getElementById("customBankInput");
  var bankAddrInput = document.getElementById("bankAddress");
  var routingInput = document.getElementById("routingNumber");
  var accountInput = document.getElementById("accountNumber");
  var beneficiary = document.getElementById("beneficiaryName");
  var beneficiaryMsg = document.getElementById("beneficiaryMsg");
  var loadingScreen = document.getElementById("loadingScreen");
  var otpModal = document.getElementById("otpModal");
  var otpInput = document.getElementById("otpInput");
  var verifyBtn = document.getElementById("verifyOtpBtn");
  var receiptModal = document.getElementById("receiptModal");
  var noteInput = document.getElementById("noteInput");
  var amountInput = document.querySelector(".amount-input");

  /* ── Build account dropdown from admin-set accounts ── */
  function buildDropdown() {
    var accts = me.accounts ? JSON.parse(JSON.stringify(me.accounts)) : {};
    accts[me.accountType || "checking"] = true;
    var last4 = me.accountNumber ? String(me.accountNumber).slice(-4) : "****";
    var html = '<option value="">Select Account</option>';
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
      var val = accts[k];
      if (!val) return;
      var label =
        typeof val === "object" && val.name
          ? val.name
          : me.businessName || "Business";
      html +=
        '<option value="' +
        k +
        '">' +
        label +
        " \u2022\u2022\u2022\u2022" +
        last4 +
        "</option>";
    });
    fromAccSelect.innerHTML = html;
    updateBal();
  }
  buildDropdown();

  /* ── Live balance display ── */
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

  /* ── Account database ── */
  var DB = [
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

  /* ── Auto-lookup beneficiary name (original zip logic) ── */
  function lookupBeneficiary() {
    var routing = routingInput.value.trim();
    var account = accountInput.value.trim();
    if (routing.length < 5 || account.length < 5) {
      resetBen();
      return;
    }

    /* 1. Internal ICU users */
    var internal = users.find(function (u) {
      return (
        String(u.routingNumber) === routing &&
        String(u.accountNumber) === account
      );
    });
    /* 2. External database — match routing OR wire routing */
    var external = DB.find(function (x) {
      return (
        (x.routing === routing || x.wire === routing) && x.account === account
      );
    });

    if (internal) {
      beneficiary.value = internal.firstName + " " + internal.lastName;
      beneficiary.setAttribute("readonly", true);
      showMsg("\u2713 Account found (ICU Member)", "green");
    } else if (external) {
      beneficiary.value = external.name;
      beneficiary.setAttribute("readonly", true);
      /* Auto-fill bank address if blank */
      if (bankAddrInput && !bankAddrInput.value.trim() && external.address) {
        bankAddrInput.value = external.address;
      }
      showMsg("\u2713 Account found (" + external.bank + ")", "green");
    } else if (routing.length >= 9 && account.length >= 8) {
      beneficiary.value = "";
      beneficiary.removeAttribute("readonly");
      beneficiary.placeholder = "Enter beneficiary name manually";
      showMsg(
        "\u274C Name generation failed \u2014 account not in database. Enter name manually.",
        "red",
      );
    } else {
      resetBen();
    }
  }

  routingInput.addEventListener("input", lookupBeneficiary);
  accountInput.addEventListener("input", lookupBeneficiary);

  function resetBen() {
    beneficiary.value = "";
    beneficiary.removeAttribute("readonly");
    beneficiary.placeholder = "Will appear automatically";
    beneficiaryMsg.style.display = "none";
    beneficiaryMsg.textContent = "";
  }

  function showMsg(text, color) {
    beneficiaryMsg.textContent = text;
    beneficiaryMsg.style.display = "block";
    beneficiaryMsg.style.color = color === "red" ? "#e53935" : "#2e7d32";
    beneficiaryMsg.style.fontWeight = "600";
    beneficiaryMsg.style.marginTop = "7px";
    beneficiaryMsg.style.padding = color === "red" ? "8px 12px" : "0";
    beneficiaryMsg.style.background =
      color === "red" ? "#ffebee" : "transparent";
    beneficiaryMsg.style.borderRadius = color === "red" ? "8px" : "0";
    beneficiaryMsg.style.border =
      color === "red" ? "1px solid #ffcdd2" : "none";
  }

  /* ── Bank select toggle ── */
  bankSelect.addEventListener("change", function () {
    var isOther = bankSelect.value === "other";
    customBank.classList.toggle("hidden", !isOther);
    customBankInput.required = isOther;
    if (!isOther) customBankInput.value = "";
    resetBen();
  });

  /* ── Submit ── */
  var generatedOTP = "";
  var pending = {};

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var acc = fromAccSelect.value;
    var amtRaw = parseFloat(amountInput ? amountInput.value : 0);

    if (!acc) {
      alert("Please select an account to send from.");
      return;
    }
    if (!bankSelect.value) {
      alert("Please select a recipient bank.");
      return;
    }
    if (!routingInput.value.trim()) {
      alert("Please enter a routing number.");
      return;
    }
    if (!accountInput.value.trim()) {
      alert("Please enter an account number.");
      return;
    }
    if (!beneficiary.value.trim()) {
      alert("Beneficiary name is required.");
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
        "\u274C Insufficient Balance\n\nTransfer:  $" +
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

    var bank =
      bankSelect.value === "other" ? customBankInput.value : bankSelect.value;
    var note = noteInput ? noteInput.value.trim() : "";
    var bAddr = bankAddrInput ? bankAddrInput.value.trim() : "";
    var last4 = me.accountNumber ? String(me.accountNumber).slice(-4) : "****";

    /* Get display label for selected account */
    var selOpt = fromAccSelect.options[fromAccSelect.selectedIndex];
    var accLabel = selOpt ? selOpt.text : acc;

    pending = {
      amtRaw: amtRaw,
      tax: tax,
      total: total,
      acc: acc,
      accLabel: accLabel,
      bank: bank,
      bankAddr: bAddr,
      note: note,
      name: beneficiary.value.trim(),
      toAcct: accountInput.value.trim(),
      routing: routingInput.value.trim(),
      txnId: "TXN" + Date.now(),
      date: new Date().toLocaleString(),
    };

    /* Step 1: PIN verification */
    if (window.PinVerify) {
      PinVerify.prompt(
        function () {
          startOTP();
        },
        function () {},
      );
    } else {
      startOTP();
    }
  });

  function startOTP() {
    loadingScreen.style.display = "flex";
    setTimeout(function () {
      loadingScreen.style.display = "none";
      generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      if (window._sendOTP) {
        window._sendOTP(
          me.email || me.contactEmail,
          generatedOTP,
          me.firstName,
        );
      } else {
        console.log(
          "%c\uD83D\uDD11 Wire OTP: " + generatedOTP,
          "background:#4b38f5;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700;font-size:14px",
        );
      }
      otpModal.style.display = "flex";
    }, 2000);
  }

  /* ── Verify OTP ── */
  verifyBtn.addEventListener("click", function () {
    if (!otpInput.value.trim()) return;
    if (otpInput.value.trim() !== generatedOTP) {
      otpInput.style.borderColor = "#e53935";
      setTimeout(function () {
        otpInput.style.borderColor = "";
      }, 1500);
      alert("Invalid code. Try again.");
      return;
    }
    otpModal.style.display = "none";
    otpInput.value = "";

    /* Log debit + fee */
    var logs = getLogs();
    var ts = new Date().toISOString();
    var uName = me.firstName + " " + me.lastName;
    logs.push({
      id: Date.now(),
      userId: session.id,
      userName: uName,
      action: "Wire Transfer",
      details:
        "Wire to " +
        pending.name +
        " \u2014 " +
        pending.bank +
        (pending.note ? " | " + pending.note : ""),
      reason: pending.note || "",
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
      details: "Fee for wire to " + pending.name,
      reason: "2% wire transfer fee",
      amount: pending.tax,
      txnType: "debit",
      targetAccount: pending.acc,
      timestamp: ts,
      status: "completed",
      txnId: pending.txnId + "-FEE",
    });
    saveLogs(logs.length > 500 ? logs.slice(-500) : logs);

    var newBal = calcBalance(pending.acc);
    updateBal();

    if (window._sendDebitAlert) {
      window._sendDebitAlert(
        me.email || me.contactEmail,
        pending.total,
        "Wire to " + pending.name,
        newBal,
        me.firstName,
      );
    }

    showReceipt(newBal);
    form.reset();
    resetBen();
    buildDropdown();
  });

  /* ── Receipt ── */
  function showReceipt(newBal) {
    function s(id, v) {
      var e = document.getElementById(id);
      if (e) e.innerText = v;
    }
    s("receiptAmount", fmt(pending.amtRaw));
    s("receiptFrom", pending.accLabel);
    s("receiptName", pending.name);
    s("receiptAccount", "\u2022\u2022\u2022\u2022" + pending.toAcct.slice(-4));
    s("receiptBank", pending.bank);
    s("receiptBankAddr", pending.bankAddr || "\u2014");
    s("receiptNote", pending.note || "\u2014");
    s("receiptId", pending.txnId);
    s("receiptDate", pending.date);

    /* Inject fee + total + new balance rows */
    var det = receiptModal
      ? receiptModal.querySelector(".receipt-details")
      : null;
    if (det) {
      det.querySelectorAll(".inj-row").forEach(function (r) {
        r.remove();
      });
      var anchor = det.querySelector(".detail-row");
      var extra =
        '<div class="detail-row inj-row"><span>Transfer Fee (2%)</span><span style="color:#e53935;font-weight:700">-$' +
        fmt(pending.tax) +
        "</span></div>" +
        '<div class="detail-row inj-row" style="border-top:2px solid #e8eaf0;padding-top:12px;margin-top:4px"><span style="font-weight:700">Total Debited</span><span style="color:#c62828;font-weight:700;font-size:1rem">-$' +
        fmt(pending.total) +
        "</span></div>" +
        '<div class="detail-row inj-row"><span>New Balance</span><span style="color:#2e7d32;font-weight:700">$' +
        fmt(newBal) +
        "</span></div>";
      if (anchor) anchor.insertAdjacentHTML("afterend", extra);
    }
    receiptModal.style.display = "flex";
  }

  /* ── Receipt buttons ── */
  var closeBtn = document.getElementById("closeReceiptBtn");
  if (closeBtn)
    closeBtn.addEventListener("click", function () {
      window.location.href = "dashboard.html";
    });

  var shareBtn = document.getElementById("shareReceiptBtn");
  if (shareBtn)
    shareBtn.addEventListener("click", function () {
      var txt =
        "ICU Wire Transfer Receipt\nTo: " +
        pending.name +
        "\nBank: " +
        pending.bank +
        "\nBank Address: " +
        (pending.bankAddr || "N/A") +
        "\nAmount: $" +
        fmt(pending.amtRaw) +
        "\nFee (2%): $" +
        fmt(pending.tax) +
        "\nTotal: $" +
        fmt(pending.total) +
        "\nRef: " +
        pending.txnId +
        "\nDate: " +
        pending.date;
      if (navigator.share) navigator.share({ title: "ICU Receipt", text: txt });
      else if (navigator.clipboard)
        navigator.clipboard.writeText(txt).then(function () {
          alert("Receipt copied.");
        });
    });
});
