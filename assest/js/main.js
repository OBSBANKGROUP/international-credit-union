/* ===== APP MODAL ===== */

const exploreBtn = document.getElementById("exploreAppBtn");
const appModal = document.getElementById("appModal");
const continueBtn = document.getElementById("continueWebBtn");

/* Open Modal */

if (exploreBtn) {
  exploreBtn.addEventListener("click", (e) => {
    e.preventDefault();

    appModal.classList.remove("hidden");
  });
}

/* Close Modal */

if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    appModal.classList.add("hidden");
  });
}
