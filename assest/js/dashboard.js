document.addEventListener("DOMContentLoaded", () => {
  /* PROFILE */

  const profileBtn = document.getElementById("profileBtn");

  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  /* BUSINESS SWITCH */

  const switchBtn = document.getElementById("switchBtn");

  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      window.location.href = "business-dashboard.html";
    });
  }

  /* MENU */

  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");

  if (menuBtn && menuPanel) {
    menuBtn.addEventListener("click", () => {
      menuPanel.classList.toggle("open");
    });
  }

  /* NOTIFICATIONS */

  const notifyBar = document.getElementById("notifyBar");

  function showNotify(msg) {
    if (!notifyBar) return;

    notifyBar.innerText = msg;

    notifyBar.style.display = "block";

    setTimeout(() => {
      notifyBar.style.display = "none";
    }, 4000);
  }

  // Demo alerts (remove later when backend is ready)

  setTimeout(() => {
    showNotify("🔐 New device login detected");
  }, 2000);

  setTimeout(() => {
    showNotify("💳 Transaction completed");
  }, 6000);

  /* DARK MODE */

  const darkToggle = document.getElementById("darkToggle");

  if (darkToggle) {
    darkToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode");
    });
  }
});
