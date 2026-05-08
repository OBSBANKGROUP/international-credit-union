/**
 * OTP DEV HELPER
 * --------------
 * Shows the OTP code on screen so you can test without email.
 *
 * HOW TO USE:
 *   Add this ONE line to any page you want to test:
 *   <script src="assets/js/otp-dev-helper.js"></script>
 *
 * REMOVE IT before going live — just delete that script tag.
 *
 * It works automatically — whenever window._sendOTP() is called
 * anywhere in your app, the code pops up on screen.
 */

(function () {
  // ── Inject styles ──────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#otpDevBox{",
    "position:fixed;bottom:24px;right:24px;z-index:99999;",
    "background:#1e1e2e;color:#fff;",
    "border-radius:14px;padding:18px 22px;",
    "box-shadow:0 8px 30px rgba(0,0,0,.4);",
    "font-family:monospace;min-width:220px;",
    "animation:otpSlideIn .3s ease;",
    "border:1.5px solid #4b38f5;",
    "}",
    "@keyframes otpSlideIn{",
    "from{opacity:0;transform:translateY(20px)}",
    "to{opacity:1;transform:translateY(0)}",
    "}",
    "#otpDevBox .dev-label{",
    "font-size:.65rem;text-transform:uppercase;",
    "letter-spacing:1px;color:#888;margin-bottom:8px;",
    "display:flex;justify-content:space-between;align-items:center;",
    "}",
    "#otpDevBox .dev-label span{color:#4b38f5;font-weight:700}",
    "#otpDevBox .dev-code{",
    "font-size:2rem;font-weight:700;letter-spacing:10px;",
    "color:#7effa0;text-align:center;padding:8px 0;",
    "}",
    "#otpDevBox .dev-email{",
    "font-size:.72rem;color:#666;margin-top:6px;",
    "text-align:center;word-break:break-all;",
    "}",
    "#otpDevBox .dev-copy{",
    "display:block;width:100%;margin-top:12px;",
    "padding:8px;background:#4b38f5;color:white;",
    "border:none;border-radius:8px;font-size:.8rem;",
    "font-weight:700;cursor:pointer;font-family:monospace;",
    "transition:.2s;",
    "}",
    "#otpDevBox .dev-copy:hover{background:#6a5cff}",
    "#otpDevBox .dev-close{",
    "background:none;border:none;color:#555;",
    "cursor:pointer;font-size:.85rem;padding:0;",
    "font-family:monospace;",
    "}",
    "#otpDevBox .dev-close:hover{color:#fff}",
    "#otpDevBadge{",
    "position:fixed;top:12px;right:12px;z-index:99999;",
    "background:#e53935;color:white;",
    "font-size:.65rem;font-weight:700;",
    "padding:4px 10px;border-radius:20px;",
    "font-family:monospace;letter-spacing:.5px;",
    "}",
  ].join("");
  document.head.appendChild(style);

  // ── DEV MODE badge (always visible so you remember to remove) ──
  var badge = document.createElement("div");
  badge.id = "otpDevBadge";
  badge.textContent = "⚠ DEV MODE";
  document.body.appendChild(badge);

  // ── Show OTP box ───────────────────────────────────────────────
  function showOTPBox(code, email) {
    // Remove existing box if any
    var old = document.getElementById("otpDevBox");
    if (old) old.remove();

    var box = document.createElement("div");
    box.id = "otpDevBox";
    box.innerHTML = [
      '<div class="dev-label">',
      "<span>🔑 DEV OTP</span>",
      '<button class="dev-close" onclick="document.getElementById(\'otpDevBox\').remove()">✕</button>',
      "</div>",
      '<div class="dev-code">' + code + "</div>",
      '<div class="dev-email">→ ' + (email || "unknown email") + "</div>",
      '<button class="dev-copy" id="otpCopyBtn">Copy Code</button>',
    ].join("");

    document.body.appendChild(box);

    // Copy to clipboard
    document
      .getElementById("otpCopyBtn")
      .addEventListener("click", function () {
        navigator.clipboard
          .writeText(code)
          .then(function () {
            document.getElementById("otpCopyBtn").textContent = "✓ Copied!";
            setTimeout(function () {
              var btn = document.getElementById("otpCopyBtn");
              if (btn) btn.textContent = "Copy Code";
            }, 2000);
          })
          .catch(function () {
            // Fallback for browsers without clipboard API
            var tmp = document.createElement("input");
            tmp.value = code;
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand("copy");
            document.body.removeChild(tmp);
            document.getElementById("otpCopyBtn").textContent = "✓ Copied!";
          });
      });

    // Auto-hide after 5 minutes
    setTimeout(function () {
      var b = document.getElementById("otpDevBox");
      if (b) b.remove();
    }, 300000);
  }

  // ── Intercept window._sendOTP ──────────────────────────────────
  // Wait for emailjs-config.js to define _sendOTP, then wrap it
  var intercepted = false;

  function interceptSendOTP() {
    if (intercepted) return;

    var original = window._sendOTP;

    window._sendOTP = function (toEmail, otpCode, userName) {
      // Show on screen
      showOTPBox(otpCode, toEmail);
      // Also keep the console log
      console.log(
        "%c🔑 OTP CODE: " + otpCode + " %c→ " + toEmail,
        "background:#4b38f5;color:white;padding:4px 10px;border-radius:4px;font-weight:700;font-size:14px",
        "color:#888;font-size:12px",
      );
      // Call original if it exists
      if (typeof original === "function") {
        return original(toEmail, otpCode, userName);
      }
      return Promise.resolve({ status: 200, text: "dev-mode" });
    };

    intercepted = true;
  }

  // Run immediately and also after DOM ready (in case emailjs-config loads late)
  interceptSendOTP();
  document.addEventListener("DOMContentLoaded", interceptSendOTP);

  // Also poll briefly in case emailjs-config.js loads after this script
  var attempts = 0;
  var poll = setInterval(function () {
    interceptSendOTP();
    attempts++;
    if (attempts > 20) clearInterval(poll);
  }, 100);
})();
