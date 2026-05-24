document.addEventListener("DOMContentLoaded", function () {
  /* ================= CONSTANTS ================= */
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

  /* Load user from Supabase to get real accounts data */
  var users = getUsers();
  var currentUser = users.find(function (u) {
    return (
      (u.email || "").toLowerCase() === (session.email || "").toLowerCase() ||
      String(u.id) === String(session.id)
    );
  });

  /* If not cached locally, fetch from Supabase */
  if (!currentUser && session.email) {
    var SURL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
    var SKEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
    fetch(
      SURL +
        "/rest/v1/users?email=eq." +
        encodeURIComponent(session.email.toLowerCase()) +
        "&select=*",
      {
        headers: { apikey: SKEY, Authorization: "Bearer " + SKEY },
      },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) {
          window.location.href = "index.html";
          return;
        }
        var row = rows[0];
        currentUser = {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          accountNumber: row.account_number,
          routingNumber: row.routing_number,
          accountType: row.account_type || "checking",
          accounts: row.accounts || {},
          status: row.status || "active",
          transactionPin: row.transaction_pin,
          businessName: row.business_name,
        };
        if (row.data) Object.assign(currentUser, row.data);
        initPage();
      })
      .catch(function () {
        window.location.href = "index.html";
      });
    return; /* wait for async fetch */
  }

  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }
  initPage();

  function initPage() {
    /* ── Elements ── */
    var form = document.getElementById("wireForm");
    var bankSelect = document.getElementById("bankSelect");
    var customBank = document.getElementById("customBank");
    var customBankInput = document.getElementById("customBankInput");
    var bankAddrInput = document.getElementById("bankAddress");
    var routingInput = document.getElementById("routingNumber");
    var accountInput = document.getElementById("accountNumber");
    var beneficiaryInput = document.getElementById("beneficiaryName");
    var beneficiaryMsg = document.getElementById("beneficiaryMsg");
    var loadingScreen = document.getElementById("loadingScreen");
    var otpModal = document.getElementById("otpModal");
    var otpInput = document.getElementById("otpInput");
    var verifyOtpBtn = document.getElementById("verifyOtpBtn");
    var receiptModal = document.getElementById("receiptModal");

    /* ── ACCOUNT DROPDOWN — first <select> in form ── */
    var fromAccSelect = form ? form.querySelector("select") : null;

    if (fromAccSelect) {
      /* Supports both legacy {checking:true} and new {business_0:{name:"..."}} */
      var last4_fromAccSelect = currentUser.accountNumber
        ? String(currentUser.accountNumber).slice(-4)
        : "****";
      var ddOpts = '<option value="">Select Account</option>';
      ddOpts +=
        '<option value="checking">Checking Account ••••' +
        last4_fromAccSelect +
        "</option>";
      ddOpts +=
        '<option value="savings">Savings Account ••••' +
        last4_fromAccSelect +
        "</option>";

      /* Add business accounts — from Supabase accounts field */
      var ddAccts = {};
      if (currentUser.accounts && typeof currentUser.accounts === "object") {
        ddAccts = currentUser.accounts;
      }
      /* Also check data field for legacy format */
      if (currentUser.data && currentUser.data.accounts) {
        Object.assign(ddAccts, currentUser.data.accounts);
      }
      Object.keys(ddAccts).forEach(function (k) {
        if (k === "checking" || k === "savings") return;
        var v = ddAccts[k];
        if (!v) return;
        var lbl =
          typeof v === "object" && v.name
            ? v.name
            : currentUser.businessName || "Business Account";
        ddOpts +=
          '<option value="' +
          k +
          '">' +
          lbl +
          " ••••" +
          last4_fromAccSelect +
          "</option>";
      });
      /* If admin set businessName but no business key, add a generic one */
      if (
        currentUser.businessName &&
        Object.keys(ddAccts).filter(function (k) {
          return k !== "checking" && k !== "savings";
        }).length === 0
      ) {
        ddOpts +=
          '<option value="business">' +
          currentUser.businessName +
          " ••••" +
          last4_fromAccSelect +
          "</option>";
      }
      fromAccSelect.innerHTML = ddOpts;

      /* Live balance tag */
      var balTag = document.createElement("p");
      balTag.style.cssText = "font-size:.84rem;font-weight:700;margin-top:6px";
      fromAccSelect.parentNode.appendChild(balTag);

      function calcBalance(accountType) {
        var primary = (currentUser.accountType || "checking").toLowerCase();
        var bal = 0;
        getLogs().forEach(function (l) {
          if (String(l.userId) !== String(session.id) || l.amount == null)
            return;
          var acct = (l.targetAccount || primary).toLowerCase();
          if (acct !== accountType.toLowerCase()) return;
          if (l.txnType === "credit") bal += parseFloat(l.amount);
          else if (l.txnType === "debit") bal -= parseFloat(l.amount);
        });
        return bal;
      }

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

    /* ================= ACCOUNT DATABASE ================= */
    var externalAccounts = [
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

    /* ================= NAME AUTO-LOOKUP (original zip logic) ================= */
    function lookupBeneficiary() {
      var routing = routingInput.value.trim();
      var account = accountInput.value.trim();

      if (routing.length < 5 || account.length < 5) {
        resetBeneficiary();
        return;
      }

      /* 1. Internal ICU users */
      var foundUser = users.find(function (u) {
        return (
          String(u.routingNumber) === routing &&
          String(u.accountNumber) === account
        );
      });

      /* 2. External database — match routing OR wire routing */
      var externalMatch = externalAccounts.find(function (x) {
        return (
          (x.routing === routing || x.wire === routing) && x.account === account
        );
      });

      if (foundUser) {
        beneficiaryInput.value = foundUser.firstName + " " + foundUser.lastName;
        beneficiaryInput.setAttribute("readonly", true);
        showMsg("\u2713 Account found (ICU Member).", "green");
      } else if (externalMatch) {
        beneficiaryInput.value = externalMatch.name;
        beneficiaryInput.setAttribute("readonly", true);
        if (bankAddrInput && !bankAddrInput.value.trim())
          bankAddrInput.value = externalMatch.address || "";
        showMsg("\u2713 Account found (" + externalMatch.bank + ").", "green");
      } else if (routing.length >= 9 && account.length >= 8) {
        beneficiaryInput.value = "";
        beneficiaryInput.removeAttribute("readonly");
        beneficiaryInput.placeholder = "Enter beneficiary name manually";
        showMsg(
          "\u274C Name generation failed \u2014 account not in database. Enter name manually.",
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
      beneficiaryMsg.textContent = text;
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
    }

    /* ── Bank select toggle ── */
    if (bankSelect) {
      bankSelect.addEventListener("change", function () {
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
    }

    /* ================= SUBMIT ================= */
    var generatedOTP = "";
    var pendingTxn = {};

    function calcBalance(accountType) {
      var primary = (currentUser.accountType || "checking").toLowerCase();
      var bal = 0;
      getLogs().forEach(function (l) {
        if (String(l.userId) !== String(session.id) || l.amount == null) return;
        var acct = (l.targetAccount || primary).toLowerCase();
        if (acct !== accountType.toLowerCase()) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      });
      return bal;
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!beneficiaryInput.value.trim()) {
          alert("Please enter the beneficiary name.");
          return;
        }

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
        if (bankSelect && !bankSelect.value) {
          alert("Please select a recipient bank.");
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

        var bank = bankSelect
          ? bankSelect.value === "other"
            ? customBankInput.value
            : bankSelect.value
          : "";
        var note = form.querySelector("textarea")
          ? form.querySelector("textarea").value.trim()
          : "";
        var bAddr = bankAddrInput ? bankAddrInput.value.trim() : "";
        var selOpt = fromAccSelect
          ? fromAccSelect.options[fromAccSelect.selectedIndex]
          : null;
        var accLabel = selOpt ? selOpt.text : acc;

        pendingTxn = {
          amtRaw: amtRaw,
          tax: tax,
          total: total,
          acc: acc,
          accLabel: accLabel,
          bank: bank,
          bankAddr: bAddr,
          note: note,
          name: beneficiaryInput.value.trim(),
          toAcct: accountInput.value.trim(),
          routing: routingInput.value.trim(),
          txnId: "TXN" + Date.now(),
          date: new Date().toLocaleString(),
        };

        /* Step 1: PIN */
        if (window.PinVerify) {
          PinVerify.prompt(
            function () {
              startLoadingAndOTP();
            },
            function () {},
          );
        } else {
          startLoadingAndOTP();
        }
      });
    }

    function startLoadingAndOTP() {
      loadingScreen.style.display = "flex";
      setTimeout(function () {
        loadingScreen.style.display = "none";
        generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        if (window._sendOTP) {
          window._sendOTP(
            currentUser.email || currentUser.contactEmail,
            generatedOTP,
            currentUser.firstName,
          );
        } else {
          console.log(
            "%c\uD83D\uDD11 OTP: " + generatedOTP,
            "background:#4b38f5;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700;font-size:14px",
          );
        }
        otpModal.style.display = "flex";
      }, 2000);
    }

    /* ── OTP verify ── */
    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener("click", function () {
        if (otpInput.value.trim() !== generatedOTP) {
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
          action: "Wire Transfer",
          details:
            "Wire to " +
            pendingTxn.name +
            " \u2014 " +
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

        var newBal = calcBalance(pendingTxn.acc);
        if (fromAccSelect) fromAccSelect.dispatchEvent(new Event("change"));

        if (window._sendDebitAlert) {
          window._sendDebitAlert(
            currentUser.email || currentUser.contactEmail,
            pendingTxn.total,
            "Wire to " + pendingTxn.name + " \u2014 " + pendingTxn.bank,
            newBal,
            currentUser.firstName,
          );
        }

        /* Also log to Supabase if available */
        if (window._dbAddLogs) {
          window
            ._dbAddLogs([
              {
                userId: session.id,
                userName: uName,
                action: "Wire Transfer",
                details:
                  "Wire to " +
                  pendingTxn.name +
                  " \u2014 " +
                  pendingTxn.bank +
                  (pendingTxn.note ? " | " + pendingTxn.note : ""),
                reason: pendingTxn.note || "",
                amount: pendingTxn.amtRaw,
                txnType: "debit",
                targetAccount: pendingTxn.acc,
                timestamp: ts,
                status: "completed",
                txnId: pendingTxn.txnId,
              },
              {
                userId: session.id,
                userName: uName,
                action: "Transfer Fee (2%)",
                details: "Fee for wire to " + pendingTxn.name,
                reason: "2% fee",
                amount: pendingTxn.tax,
                txnType: "debit",
                targetAccount: pendingTxn.acc,
                timestamp: ts,
                status: "completed",
                txnId: pendingTxn.txnId + "-FEE",
              },
            ])
            .catch(function () {});
        }

        showReceipt(newBal);
        if (form) form.reset();
        resetBeneficiary();
      });
    }

    /* ── Receipt ── */
    function showReceipt(newBal) {
      function s(id, v) {
        var el = document.getElementById(id);
        if (el) el.innerText = v;
      }
      s("receiptFrom", pendingTxn.accLabel);
      s("receiptAmount", fmt(pendingTxn.amtRaw));
      s("receiptNote", pendingTxn.note || "\u2014");
      s("receiptName", pendingTxn.name);
      s(
        "receiptAccount",
        "\u2022\u2022\u2022\u2022" + pendingTxn.toAcct.slice(-4),
      );
      s("receiptBank", pendingTxn.bank);
      s("receiptBankAddr", pendingTxn.bankAddr || "\u2014");
      s("receiptId", pendingTxn.txnId);
      s("receiptDate", pendingTxn.date);

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
          fmt(pendingTxn.tax) +
          "</span></div>" +
          '<div class="detail-row inj-row" style="border-top:2px solid #e8eaf0;padding-top:12px;margin-top:4px"><span style="font-weight:700">Total Debited</span><span style="color:#c62828;font-weight:700;font-size:1rem">-$' +
          fmt(pendingTxn.total) +
          "</span></div>" +
          '<div class="detail-row inj-row"><span>New Balance</span><span style="color:#2e7d32;font-weight:700">$' +
          fmt(newBal) +
          "</span></div>";
        if (anchor) anchor.insertAdjacentHTML("afterend", extra);
      }
      if (receiptModal) receiptModal.style.display = "flex";
    }

    var closeBtn = document.getElementById("closeReceiptBtn");
    if (closeBtn)
      closeBtn.addEventListener("click", function () {
        window.location.href = "dashboard.html";
      });

    var shareBtn = document.getElementById("shareReceiptBtn");
    if (shareBtn)
      shareBtn.addEventListener("click", function () {
        var card = document.querySelector(".receipt-card-wrap");
        if (!card) return;
        shareBtn.textContent = "Generating...";
        shareBtn.disabled = true;

        function fallbackText() {
          var txt =
            "ICU Wire Transfer Receipt\nTo: " +
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
          if (navigator.share)
            navigator.share({ title: "ICU Receipt", text: txt });
          else if (navigator.clipboard)
            navigator.clipboard.writeText(txt).then(function () {
              alert("Receipt copied.");
            });
        }

        function reset() {
          shareBtn.innerHTML = "&#128257; Share Receipt";
          shareBtn.disabled = false;
        }

        if (typeof html2canvas !== "undefined") {
          html2canvas(card, {
            scale: 4 /* 4x = crisp on retina screens */,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            imageTimeout: 15000,
            removeContainer: true,
            width: card.offsetWidth,
            height: card.offsetHeight,
          })
            .then(function (canvas) {
              canvas.toBlob(function (blob) {
                var fname =
                  "ICU-Receipt-" + (pendingTxn.txnId || Date.now()) + ".png";
                var file = new File([blob], fname, { type: "image/png" });
                if (
                  navigator.share &&
                  navigator.canShare &&
                  navigator.canShare({ files: [file] })
                ) {
                  navigator
                    .share({
                      title: "ICU Wire Transfer Receipt",
                      files: [file],
                    })
                    .then(reset)
                    .catch(function () {
                      var a = document.createElement("a");
                      a.href = canvas.toDataURL("image/png");
                      a.download = fname;
                      a.click();
                      reset();
                    });
                } else {
                  var a = document.createElement("a");
                  a.href = canvas.toDataURL("image/png");
                  a.download = fname;
                  a.click();
                  reset();
                }
              }, "image/png");
            })
            .catch(function () {
              fallbackText();
              reset();
            });
        } else {
          fallbackText();
          reset();
        }
      });
  } // end initPage
});
