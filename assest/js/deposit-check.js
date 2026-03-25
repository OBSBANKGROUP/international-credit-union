document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("depositForm");

  const modal = document.getElementById("reviewModal");

  const confirmBtn = document.getElementById("confirmDeposit");

  const cancelBtn = document.getElementById("cancelDeposit");

  const successBox = document.getElementById("successDeposit");

  const reviewAccount = document.getElementById("reviewAccount");

  const reviewAmount = document.getElementById("reviewAmount");

  const frontPreview = document.getElementById("frontPreview");

  const backPreview = document.getElementById("backPreview");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const account = document.getElementById("depositAccount").value;

    const amount = document.getElementById("checkAmount").value;

    const frontFile = document.getElementById("frontCheck").files[0];

    const backFile = document.getElementById("backCheck").files[0];

    reviewAccount.innerText = account;

    reviewAmount.innerText = amount;

    frontPreview.src = URL.createObjectURL(frontFile);

    backPreview.src = URL.createObjectURL(backFile);

    modal.style.display = "flex";
  });

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  confirmBtn.addEventListener("click", () => {
    modal.style.display = "none";

    document.querySelector(".deposit-page").style.display = "none";

    successBox.classList.remove("hidden");
  });
});
