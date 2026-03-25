document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("billForm");

  const modal = document.getElementById("confirmModal");

  const confirmBtn = document.getElementById("confirmPay");

  const cancelBtn = document.getElementById("cancelPay");

  const historyBox = document.getElementById("paymentHistory");

  /* OTP ELEMENTS */

  const otpModal = document.getElementById("otpModal");
  const otpInput = document.getElementById("otpInput");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");

  let generatedOTP = "";
  let billData = {};

  /* FORM SUBMIT */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    billData.biller = document.getElementById("billerName").value;
    billData.amount = document.getElementById("billAmount").value;
    billData.date = document.getElementById("billDate").value;

    document.getElementById("confirmBiller").innerText = billData.biller;
    document.getElementById("confirmAmount").innerText = billData.amount;
    document.getElementById("confirmDate").innerText = billData.date;

    modal.style.display = "flex";
  });

  /* CANCEL PAYMENT */

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  /* CONFIRM PAYMENT → SEND OTP */

  confirmBtn.addEventListener("click", () => {
    modal.style.display = "none";

    sendOTP();

    otpModal.style.display = "flex";
  });

  /* GENERATE OTP */

  function sendOTP() {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("OTP (Demo):", generatedOTP);

    alert("Verification code sent to your email.");
  }

  /* VERIFY OTP */

  verifyOtpBtn.addEventListener("click", () => {
    if (otpInput.value === generatedOTP) {
      otpModal.style.display = "none";

      addPaymentToHistory();

      form.reset();

      otpInput.value = "";

      alert("Payment successful");
    } else {
      alert("Invalid OTP. Try again.");
    }
  });

  /* ADD PAYMENT TO HISTORY */

  function addPaymentToHistory() {
    historyBox.innerHTML += `

<div class="payment-row">

<strong>${billData.biller}</strong>
<p>$${billData.amount} • ${billData.date}</p>

</div>

`;
  }
});
