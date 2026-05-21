/* ================================================================
   INDEX PAGE JS  |  assets/js/index.js
================================================================ */

document.addEventListener("DOMContentLoaded", function () {
  /* ── Hamburger / Mobile Drawer ── */
  var hamburger = document.getElementById("hamburgerBtn");
  var overlay = document.getElementById("drawerOverlay");
  var closeBtn = document.getElementById("drawerCloseBtn");

  function openDrawer() {
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (hamburger)
    hamburger.addEventListener("click", function (e) {
      e.stopPropagation();
      openDrawer();
    });

  if (overlay)
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeDrawer();
    });

  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

  document.querySelectorAll(".drawer-links a").forEach(function (link) {
    link.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  /* ── Protect login inputs from mobile interference ── */
  ["loginUserId", "loginPassword"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "none");
    el.setAttribute("spellcheck", "false");
    el.setAttribute("translate", "no");
    el.classList.add("notranslate");
  });
});

/* ── Google Translate (must be global, not inside DOMContentLoaded) ── */
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
