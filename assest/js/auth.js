/* ═══════════════════════════════════════════════════
   GLOBAL SUSPENSION GUARD
   Call window.checkSuspended() on any protected page.
═══════════════════════════════════════════════════ */
window.showSuspendedOverlay = function () {
  if (document.getElementById("suspendedOverlay")) return;
  var overlay = document.createElement("div");
  overlay.id = "suspendedOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(10,15,30,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)";
  overlay.innerHTML =
    '<div style="background:white;border-radius:24px;padding:44px 36px;max-width:420px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.4)">' +
    '<div style="width:76px;height:76px;background:#ffebee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2.2rem">&#128683;</div>' +
    '<div style="color:#b71c1c;font-size:1.25rem;font-weight:800;margin-bottom:10px;font-family:Inter,sans-serif">Account Suspended</div>' +
    '<div style="width:48px;height:3px;background:#e53935;border-radius:2px;margin:0 auto 18px"></div>' +
    '<p style="color:#555;font-size:.9rem;line-height:1.7;margin-bottom:6px;font-family:Inter,sans-serif">Your account has been placed on hold.</p>' +
    '<p style="color:#555;font-size:.9rem;line-height:1.7;margin-bottom:24px;font-family:Inter,sans-serif">Please <strong>visit our branch</strong> or <strong>contact online support</strong> for more information and assistance.</p>' +
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">' +
    '<a href="Contact.html" style="padding:11px 22px;background:#c62828;color:white;border-radius:22px;text-decoration:none;font-size:.85rem;font-weight:700;font-family:Inter,sans-serif">Contact Support</a>' +
    '<a href="tel:+18005552478" style="padding:11px 22px;background:#f5f5f5;color:#333;border-radius:22px;text-decoration:none;font-size:.85rem;font-weight:700;font-family:Inter,sans-serif">&#128222; Call Us</a>' +
    "</div>" +
    '<a href="index.html" style="color:#aaa;font-size:.8rem;font-family:Inter,sans-serif;text-decoration:none">Sign out</a>' +
    "</div>";
  document.body.appendChild(overlay);
};

window.checkSuspended = function () {
  var session = JSON.parse(localStorage.getItem("icu_session") || "null");
  if (!session) return false;
  var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
  var user = users.find(function (u) {
    return u.id === session.id;
  });
  if (user && user.status === "suspended") {
    window.showSuspendedOverlay();
    return true;
  }
  return false;
};
