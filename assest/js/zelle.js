document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("zelleForm");

  const emailInput = document.getElementById("email");
  const nameInput = document.getElementById("name");
  const amountInput = document.getElementById("amount");

  /* Modals */

  const confirmModal = document.getElementById("confirmModal");
  const securityModal = document.getElementById("securityModal");

  /* Confirm Fields */

  const confirmName = document.getElementById("confirmName");
  const confirmEmail = document.getElementById("confirmEmail");
  const confirmAmount = document.getElementById("confirmAmount");

  /* Buttons */

  const cancelBtn = document.getElementById("cancelBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  const verifyBtn = document.getElementById("verifyBtn");

  /* FORM SUBMIT */

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Fill confirmation
    confirmName.innerText = nameInput.value;
    confirmEmail.innerText = emailInput.value;
    confirmAmount.innerText = amountInput.value;

    // Show confirm modal
    confirmModal.style.display = "flex";
  });

  /* CANCEL */

  cancelBtn.addEventListener("click", () => {
    confirmModal.style.display = "none";
  });

  /* CONFIRM */

  confirmBtn.addEventListener("click", () => {
    confirmModal.style.display = "none";

    // Simulate security check
    setTimeout(() => {
      securityModal.style.display = "flex";
    }, 500);
  });

  /* VERIFY */

  verifyBtn.addEventListener("click", () => {
    // Redirect to verification page (you will create later)
    window.location.href = "verify.html";
  });
});
