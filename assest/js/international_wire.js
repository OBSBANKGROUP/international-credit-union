document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("intlForm");

  const loading = document.getElementById("loadingScreen");
  const otpModal = document.getElementById("otpModal");

  const otpInput = document.getElementById("otpInput");
  const verifyBtn = document.getElementById("verifyOtpBtn");

  let otp = "";

  /* SUBMIT */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    loading.style.display = "flex";

    setTimeout(() => {
      loading.style.display = "none";

      sendOTP();

      otpModal.style.display = "flex";
    }, 2000);
  });

  /* OTP */

  function sendOTP() {
    otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("OTP Demo:", otp);

    alert("Verification code sent.");
  }

  verifyBtn.addEventListener("click", () => {
    if (otpInput.value === otp) {
      success();
    } else {
      alert("Invalid OTP");
    }
  });

  /* SUCCESS */

  function success() {
    otpModal.style.display = "none";

    showReceipt();

    form.reset();

    otpInput.value = "";
  }

  /* RECEIPT */

  function showReceipt() {
    const from = form.querySelector("select").value;

    const amount = document.querySelector(".amount-input").value;

    const bank = form.querySelector("input[type=text]").value;

    const account = document.getElementById("account").value;

    const name = document.getElementById("beneficiary").value;

    const swift = document.getElementById("swift").value;

    const address = document.getElementById("bankAddress").value;

    document.getElementById("rFrom").innerText = from;
    document.getElementById("rAmount").innerText = amount;
    document.getElementById("rBank").innerText = bank;
    document.getElementById("rAccount").innerText = "••••" + account.slice(-4);
    document.getElementById("rName").innerText = name;
    document.getElementById("rSwift").innerText = swift;
    document.getElementById("rAddress").innerText = address;

    document.getElementById("receiptModal").style.display = "flex";
  }

  /* DONE */

  document.getElementById("doneBtn").addEventListener("click", () => {
    document.getElementById("receiptModal").style.display = "none";
  });
});
