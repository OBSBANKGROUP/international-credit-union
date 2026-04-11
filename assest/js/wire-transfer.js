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

  /* ================= STATIC ACCOUNT DATABASE ================= */

  const externalAccounts = [
    {
      bank: "Chase Bank",
      name: "Secretary of Defense for Personnel and Readiness",
      routing: "314074269",
      account: "6667838383",
    },
    {
      bank: "TD Bank",
      name: "Knightsplash company LLC",
      routing: "255076753",
      account: "8030166942",
    },
    {
      bank: "BOA",
      name: "Jackson cole",
      routing: "072000996",
      account: "375022688698",
    },
    {
      bank: "TD Bank",
      name: "Knightsplash company LLC",
      routing: "255076753",
      account: "8030166942",
    },
    {
      bank: "TD Bank",
      name: "Yen Tran",
      routing: "054001725",
      account: "4441467861",
    },
    {
      bank: "Chase Bank",
      name: "Shellian Watson",
      routing: "044000037",
      account: "788960158",
    },
    {
      bank: "Citi Bank",
      name: "Debra Levrie",
      routing: "113193532",
      account: "40503099518",
    },
  ];

  /* ================= SESSION ================= */

  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";

  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  const session = getSession();
  if (!session) return (window.location.href = "index.html");

  const users = getUsers();
  const currentUser = users.find((u) => u.id === session.id);
  if (!currentUser) return (window.location.href = "index.html");

  /* ================= POPULATE ACCOUNT ================= */

  const fromAccSelect = form.querySelector("select");
  if (fromAccSelect && currentUser.accounts) {
    let options = '<option value="">Select Account</option>';

    if (currentUser.accounts.checking) {
      options += `<option value="checking">Checking •••• ${currentUser.accountNumber?.slice(-4) || "2841"}</option>`;
    }
    if (currentUser.accounts.savings) {
      options += `<option value="savings">Savings •••• ${currentUser.accountNumber?.slice(-4) || "9472"}</option>`;
    }
    if (currentUser.accounts.business) {
      options += `<option value="business">Business •••• ${currentUser.accountNumber?.slice(-4) || "1011"}</option>`;
    }

    fromAccSelect.innerHTML = options;
  }

  /* ================= ACCOUNT LOOKUP ================= */

  function lookupBeneficiary() {
    const routing = routingInput.value.trim();
    const account = accountInput.value.trim();

    if (routing.length < 5 || account.length < 5) {
      resetBeneficiary();
      return;
    }

    // 1. Check internal users
    const foundUser = users.find(
      (u) => u.routingNumber === routing && u.accountNumber === account,
    );

    // 2. Check external database
    const externalMatch = externalAccounts.find(
      (acc) => acc.routing === routing && acc.account === account,
    );

    if (foundUser) {
      beneficiaryInput.value = `${foundUser.firstName} ${foundUser.lastName}`;
      beneficiaryInput.setAttribute("readonly", true);

      showMsg("Account found (Internal).", "green");
    } else if (externalMatch) {
      beneficiaryInput.value = externalMatch.name;
      beneficiaryInput.setAttribute("readonly", true);

      showMsg("Account found (External Bank).", "green");
    } else {
      beneficiaryInput.value = "";
      beneficiaryInput.removeAttribute("readonly");

      showMsg("Account not found. Enter name manually.", "red");
    }
  }

  routingInput.addEventListener("input", lookupBeneficiary);
  accountInput.addEventListener("input", lookupBeneficiary);

  function resetBeneficiary() {
    beneficiaryInput.value = "";
    beneficiaryInput.removeAttribute("readonly");
    beneficiaryMsg.style.display = "none";
  }

  function showMsg(text, color) {
    beneficiaryMsg.style.display = "block";
    beneficiaryMsg.style.color = color;
    beneficiaryMsg.innerText = text;
  }

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

    resetBeneficiary();
  });

  /* ================= SUBMIT ================= */

  let generatedOTP = "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (currentUser.status === "suspended") {
      alert("Your account is on hold.");
      return;
    }

    if (!beneficiaryInput.value) {
      alert("Please enter beneficiary name.");
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
      window._sendOTP(currentUser.email, generatedOTP, currentUser.firstName);
    } else {
      console.log("OTP:", generatedOTP);
    }

    alert("Verification code sent.");
  }

  verifyOtpBtn.addEventListener("click", () => {
    if (otpInput.value === generatedOTP) {
      otpModal.style.display = "none";
      otpInput.value = "";
      showReceipt();
      form.reset();
      resetBeneficiary();
    } else {
      alert("Invalid OTP.");
    }
  });

  /* ================= RECEIPT ================= */

  function showReceipt() {
    const amount = document.querySelector(".amount-input").value || "0.00";
    const name = beneficiaryInput.value;
    const bank =
      bankSelect.value === "other" ? customBankInput.value : bankSelect.value;

    document.getElementById("receiptAmount").innerText = amount;
    document.getElementById("receiptName").innerText = name;
    document.getElementById("receiptBank").innerText = bank;

    receiptModal.style.display = "flex";
  }

  /* ================= CLOSE ================= */

  document.getElementById("closeReceiptBtn")?.addEventListener("click", () => {
    receiptModal.style.display = "none";
  });
});
