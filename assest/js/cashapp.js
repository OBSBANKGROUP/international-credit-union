document.addEventListener("DOMContentLoaded", () => {
  const cancelBtn = document.getElementById("cancelBtn");
  const linkBtn = document.getElementById("linkBtn");

  /* Cancel → Go Back */

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "wire.html";
    });
  }

  /* Link → Demo */

  if (linkBtn) {
    linkBtn.addEventListener("click", () => {
      alert(
        "Cash App linking is coming soon.\n\n" +
          "You will be redirected to secure verification.",
      );

      // Later connect to backend
      // window.location.href = "cashapp-link.html";
    });
  }
});
