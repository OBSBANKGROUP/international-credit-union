/* ================================================================
   INDEX PAGE JS
   - Mobile hamburger menu
   - Google Translate init
   ================================================================ */

/* ── Mobile menu ── */
(function () {
  var hamburger = document.getElementById("hamburgerBtn");
  var menu = document.getElementById("mobileMenu");
  var panel = document.getElementById("mobilePanel");
  var closeBtn = document.getElementById("closeMenuBtn");

  function openMenu() {
    menu.classList.add("open");
    panel.classList.add("open");
  }
  function closeMenu() {
    menu.classList.remove("open");
    panel.classList.remove("open");
  }

  if (hamburger) hamburger.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);

  /* Close when clicking outside the panel */
  if (menu) {
    menu.addEventListener("click", function (e) {
      if (e.target === menu) closeMenu();
    });
  }

  /* Close menu when a Sign In link inside it is clicked */
  document.querySelectorAll(".m-btn").forEach(function (btn) {
    btn.addEventListener("click", closeMenu);
  });
})();

/* ── Google Translate init ── */
function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: "en",
      includedLanguages:
        "es,fr,de,zh-CN,ar,pt,ru,ja,ko,hi,it,nl,pl,tr,vi,sw,yo,ig,ha,am",
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false,
    },
    "google_translate_element",
  );
}
