document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openAppModal");
  const modal = document.getElementById("appModal");

  const cashBtn = document.getElementById("cashAppBtn");
  const zelleBtn = document.getElementById("zelleBtn");
  const closeBtn = document.getElementById("closeAppModal");

  /* Open Modal */

  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.style.display = "flex";
    });
  }

  /* Close */

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  /* Redirect */

  if (cashBtn) {
    cashBtn.addEventListener("click", () => {
      window.location.href = "cashapp.html";
    });
  }

  if (zelleBtn) {
    zelleBtn.addEventListener("click", () => {
      window.location.href = "zelle.html";
    });
  }
});
