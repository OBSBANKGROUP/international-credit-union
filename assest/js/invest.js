document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startInvestBtn");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      alert("Investment services will be available soon.");
    });
  }
});
