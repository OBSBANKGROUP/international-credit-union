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

  /* ================= DEMO DATABASE ================= */

  const demoAccounts = [
    { routing: "314074269", account: "6667838383", name: "Paul Lampard" },
    {
      routing: "255076753",
      account: "8030166942",
      name: "Knightsplash company LLC",
    },
    { routing: "072000996", account: "375022688698", name: "Jackson Cole" },
    { routing: "054001725", account: "4441467861", name: "Yen Tran" },
    { routing: "113193532", account: "40503099518", name: "Debra Levrie" },
  ];

  /* ================= STATE ================= */

  let manualMode = false;
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

  routingInput.addEventListener("input", clearBeneficiary);
  accountInput.addEventListener("input", clearBeneficiary);

  /* ================= LOOKUP ================= */

  routingInput.addEventListener("blur", lookupBeneficiary);
  accountInput.addEventListener("blur", lookupBeneficiary);

  function lookupBeneficiary() {
    const routing = routingInput.value.trim();
    const account = accountInput.value.trim();

    resetManualMode();

    // Wait for complete input
    if (routing.length !== 9 || account.length < 8) return;

    const match = demoAccounts.find(
      (acc) => acc.routing === routing && acc.account === account,
    );

    if (match) {
      beneficiaryInput.value = match.name;
      hideMessage();
    } else {
      promptManualEntry();
    }
  }

  /* ================= MANUAL MODE ================= */

  function promptManualEntry() {
    beneficiaryMsg.innerText = "Beneficiary not found. Enter manually?";

    beneficiaryMsg.style.display = "block";

    setTimeout(() => {
      const confirmManual = confirm(
        "Beneficiary verification failed.\n\nDo you want to enter the name manually?",
      );

      if (confirmManual) {
        enableManualMode();
      }
    }, 200);
  }

  function enableManualMode() {
    manualMode = true;

    beneficiaryInput.removeAttribute("readonly");

    beneficiaryInput.classList.add("manual-input");

    beneficiaryInput.placeholder = "Enter full name";

    beneficiaryInput.focus();
  }

  function resetManualMode() {
    manualMode = false;

    beneficiaryInput.setAttribute("readonly", true);

    beneficiaryInput.classList.remove("manual-input");

    beneficiaryInput.placeholder = "Will appear automatically";
  }

  function hideMessage() {
    beneficiaryMsg.style.display = "none";
    beneficiaryMsg.innerText = "";
  }

  /* ================= SUBMIT ================= */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

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

    console.log("OTP (Demo):", generatedOTP);

    alert("Verification code sent to your email.");
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
    // 1. Existing local history
    let history = JSON.parse(localStorage.getItem("transactionHistory")) || [];
    history.unshift(data);
    localStorage.setItem("transactionHistory", JSON.stringify(history));

    // 2. Global activity log (for balance and sync)
    const sessionStr = localStorage.getItem("icu_session");
    if (sessionStr && window._logActivity) {
      const session = JSON.parse(sessionStr);
      window._logActivity(
        session.id,
        session.firstName + " " + session.lastName,
        "Wire Transfer",
        "Sent to " + data.name + " (" + data.bank + ")",
        parseFloat(data.amount),
        "debit"
      );
    }
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
