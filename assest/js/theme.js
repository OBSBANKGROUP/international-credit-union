/**
 * Centralized Theme Management
 * Persists user's choice in localStorage and applies it globally.
 */

(function () {
  const THEME_KEY = "icu_theme"; // "dark" or "light"

  /**
   * Applies the saved theme to the document body.
   */
  function applyTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }

    // Sync any existing toggles on the page
    const darkToggles = document.querySelectorAll("#darkToggle");
    darkToggles.forEach(toggle => {
      toggle.checked = (savedTheme === "dark");
    });
  }

  /**
   * Initializes a theme toggle element.
   * @param {string} id - The ID of the toggle element (default: "darkToggle")
   */
  window._initThemeToggle = function (id = "darkToggle") {
    const toggle = document.getElementById(id);
    if (!toggle) return;

    // Set initial state
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    toggle.checked = (savedTheme === "dark");

    // Listen for changes
    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        localStorage.setItem(THEME_KEY, "dark");
      } else {
        localStorage.setItem(THEME_KEY, "light");
      }
      applyTheme();
    });
  };

  /**
   * Toggles the theme programmatically.
   */
  window._toggleTheme = function () {
    const current = localStorage.getItem(THEME_KEY) || "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme();
  };

  // Run on script load to prevent flickering
  applyTheme();

  // Also run on DOMContentLoaded to ensure body class is set correctly
  document.addEventListener("DOMContentLoaded", applyTheme);
})();


