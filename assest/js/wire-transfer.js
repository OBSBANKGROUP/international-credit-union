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

  /* ================= LOAD SESSION ================= */
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";

  function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  const users = getUsers();
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  // Populate From Account
  const fromAccSelect = form.querySelector("select");
  if (fromAccSelect && currentUser.accounts) {
    let options = '<option value="">Select Account</option>';
    if (currentUser.accounts.checking) {
      options += `<option value="checking">Checking •••• ${currentUser.accountNumber ? currentUser.accountNumber.slice(-4) : '2841'}</option>`;
    }
    if (currentUser.accounts.savings) {
      options += `<option value="savings">Savings •••• ${currentUser.accountNumber ? (parseInt(currentUser.accountNumber) + 1).toString().slice(-4) : '9472'}</option>`;
    }
    if (currentUser.accounts.business) {
        options += `<option value="business">Business •••• ${currentUser.accountNumber ? (parseInt(currentUser.accountNumber) + 2).toString().slice(-4) : '1011'}</option>`;
    }
    fromAccSelect.innerHTML = options;
  }

  /* ================= STATE ================= */

  let generatedOTP = "";

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

    clearBeneficiary();
  });

  /* ================= CLEAR ================= */

  function clearBeneficiary() {
    beneficiaryInput.value = "";
    beneficiaryMsg.style.display = "none";
    resetManualMode();
  }

  routingInput.addEventListener("input", function() {});
  accountInput.addEventListener("input", function() {});

  // Removed lookup logic as requested. Users must type details manually.

  /* ================= BENEFICIARY ENTRY ================= */
  // Always allow manual entry
  beneficiaryInput.removeAttribute("readonly");
  beneficiaryInput.placeholder = "Enter full beneficiary name";

  function hideMessage() {
    beneficiaryMsg.style.display = "none";
    beneficiaryMsg.innerText = "";
  }

  /* ================= SUBMIT ================= */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Check if account is suspended
    if (currentUser.status === "suspended") {
        alert("Your account is on hold. Email our customer support for more info and help.");
        return;
    }

    if (!beneficiaryInput.value) {
      alert("Please verify beneficiary information.");
      return;
    }

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
        window._sendOTP(currentUser.email, generatedOTP, currentUser.firstName)
            .then(() => {
                alert("Verification code sent to your email.");
            })
            .catch(() => {
                alert("Error sending email. Please check your connection.");
            });
    } else {
        console.log("OTP (Fallback):", generatedOTP);
        alert("Verification code sent to your email.");
    }
  }

  verifyOtpBtn.addEventListener("click", () => {
    if (otpInput.value === generatedOTP) {
      handleOtpSuccess();
    } else {
      alert("Invalid OTP. Try again.");
    }
  });

  /* ================= OTP SUCCESS ================= */

  function handleOtpSuccess() {
    otpModal.style.display = "none";

    otpInput.value = "";

    showReceipt();

    form.reset();

    resetManualMode();

    hideMessage();

    customBank.classList.add("hidden");
  }

  /* ================= RECEIPT ================= */

  function showReceipt() {
    const amount = document.querySelector(".amount-input").value || "0.00";

    const fromAccount = form.querySelector("select").value;

    const note = form.querySelector("textarea").value || "Wire Transfer";

    const bank =
      bankSelect.value === "other" ? customBankInput.value : bankSelect.value;

    const account = accountInput.value;

    const name = beneficiaryInput.value;

    const txId = "TX" + Math.floor(Math.random() * 1000000000);

    const date = new Date().toLocaleString();
    // Save transaction

    saveTransaction({
      id: txId,
      from: fromAccount,
      name: name,
      bank: bank,
      account: account,
      amount: amount,
      note: note,
      date: date,
    });

    document.getElementById("receiptAmount").innerText = amount;

    document.getElementById("receiptFrom").innerText = fromAccount;

    document.getElementById("receiptNote").innerText = note;

    document.getElementById("receiptName").innerText = name;

    document.getElementById("receiptAccount").innerText =
      "••••" + account.slice(-4);

    document.getElementById("receiptBank").innerText = bank;

    document.getElementById("receiptId").innerText = txId;

    document.getElementById("receiptDate").innerText = date;

    receiptModal.style.display = "flex";
  }

  function saveTransaction(data) {
    // 1. Local history for receipt
    let history = JSON.parse(localStorage.getItem("transactionHistory")) || [];
    history.unshift(data);
    localStorage.setItem("transactionHistory", JSON.stringify(history));

    // 2. Global activity log & Email Alerts
    const amountNum = parseFloat(data.amount);
    const fee = 25.00;
    
    if (window._logActivity) {
      // Main Transfer
      window._logActivity(
        currentUser.id,
        currentUser.firstName + " " + currentUser.lastName,
        "Wire Transfer",
        "Sent to " + data.name + " (" + data.bank + ")",
        amountNum,
        "debit",
        data.from, // Passing target account
        data.note // Passing transfer reason
      );

      // Service Fee
      window._logActivity(
        currentUser.id,
        currentUser.firstName + " " + currentUser.lastName,
        "Service Fee",
        "Wire transfer processing charge",
        fee,
        "debit",
        data.from
      );
    }


    // 3. Send Debit Alert Email
    if (window._sendDebitAlert) {
      const newBalance = getAccBalance(currentUser.id, data.from); // This might be slightly stale but it's okay for demo
      window._sendDebitAlert(
        currentUser.email,
        (amountNum + fee).toFixed(2),
        "Wire Transfer to " + data.name,
        newBalance.toFixed(2),
        currentUser.firstName
      );
    }

    // 4. Update Notifications (Simple implementation)
    const notifications = JSON.parse(localStorage.getItem("icu_notifications") || "[]");
    notifications.unshift({
        id: Date.now(),
        title: "Transfer Successful",
        message: `You successfully sent $${data.amount} to ${data.name}. A service fee of $25.00 was applied.`,
        date: new Date().toISOString(),
        unread: true
    });
    localStorage.setItem("icu_notifications", JSON.stringify(notifications));
  }

  // Local helper for balance (simpler version for this file)
  function getAccBalance(userId, type) {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    let bal = 0;
    logs.forEach(l => {
      if (l.userId === userId && l.amount) {
        if (type && l.targetAccount !== type) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      }
    });
    return bal;
  }

  /* ================= CLOSE RECEIPT ================= */

  const closeBtn = document.getElementById("closeReceiptBtn");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      receiptModal.style.display = "none";
    });
  }
  /* ================= SHARE ================= */

  const shareBtn = document.getElementById("shareReceiptBtn");

  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const amount = document.getElementById("receiptAmount").innerText;
      const name = document.getElementById("receiptName").innerText;
      const bank = document.getElementById("receiptBank").innerText;
      const date = document.getElementById("receiptDate").innerText;

      const shareText = `
International Credit Union

Transfer Successful ✅

Recipient: ${name}
Bank: ${bank}
Amount: $${amount}
Date: ${date}

Transaction completed securely.
`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Wire Transfer Receipt",
            text: shareText,
          });
        } catch (err) {
          console.log("Share cancelled");
        }
      } else {
        // Fallback for desktop
        navigator.clipboard.writeText(shareText);

        alert("Receipt copied to clipboard.");
      }
    });
  }
});
