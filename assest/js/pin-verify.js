/**
 * PIN VERIFICATION MODULE
 * ───────────────────────
 * Injects a PIN entry modal into any transfer page.
 * Usage:  PinVerify.prompt(onSuccess, onCancel)
 *
 * Add to any transfer HTML:
 *   <script src="assets/js/pin-verify.js"></script>
 * Call BEFORE showing OTP modal:
 *   PinVerify.prompt(function(){ sendOTP(); otpModal.style.display="flex"; });
 */

(function () {
  "use strict";

  /* ── Inject modal HTML + CSS once ── */
  function injectModal() {
    if (document.getElementById("pinVerifyOverlay")) return;

    var style = document.createElement("style");
    style.textContent = [
      "#pinVerifyOverlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;",
      "align-items:center;justify-content:center;z-index:9000;backdrop-filter:blur(3px)}",
      "#pinVerifyOverlay.open{display:flex}",
      "#pinVerifyBox{background:white;border-radius:22px;padding:36px 32px;width:90%;max-width:360px;",
      "text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.25);animation:pinSlideUp .3s ease}",
      "@keyframes pinSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}",
      "#pinVerifyBox .pin-lock-icon{width:64px;height:64px;background:#f0f2ff;border-radius:50%;",
      "display:flex;align-items:center;justify-content:center;margin:0 auto 18px}",
      "#pinVerifyBox .pin-lock-icon .material-icons-outlined{font-size:1.8rem;color:#4b38f5}",
      "#pinVerifyBox h3{font-size:1.1rem;font-weight:700;color:#0a2342;margin-bottom:6px}",
      "#pinVerifyBox p{font-size:.85rem;color:#888;margin-bottom:24px}",
      "#pinDots{display:flex;justify-content:center;gap:12px;margin-bottom:20px}",
      ".pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid #d0d4e8;transition:.2s}",
      ".pin-dot.filled{background:#4b38f5;border-color:#4b38f5}",
      "#pinDigits{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:240px;margin:0 auto 16px}",
      ".pin-key{padding:16px;border:1.5px solid #e8eaf0;border-radius:14px;font-size:1.2rem;",
      "font-weight:700;cursor:pointer;transition:.2s;background:white;font-family:'Inter',sans-serif;",
      "color:#0a2342;user-select:none}",
      ".pin-key:hover{background:#f0f2ff;border-color:#4b38f5;color:#4b38f5}",
      ".pin-key:active{transform:scale(.94)}",
      ".pin-key.del{font-size:.9rem;color:#e53935;border-color:#ffcdd2;background:#fff5f5}",
      ".pin-key.del:hover{background:#ffebee}",
      "#pinError{color:#e53935;font-size:.82rem;font-weight:600;min-height:20px;margin-bottom:10px}",
      "#pinSubmitBtn{width:100%;padding:13px;background:linear-gradient(135deg,#4b38f5,#6a5cff);",
      "color:white;border:none;border-radius:25px;font-size:.95rem;font-weight:700;cursor:pointer;",
      "font-family:'Inter',sans-serif;transition:.3s;margin-bottom:10px}",
      "#pinSubmitBtn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(75,56,245,.35)}",
      "#pinCancelBtn{background:none;border:none;color:#aaa;font-size:.83rem;cursor:pointer;",
      "font-family:'Inter',sans-serif}",
      "#pinCancelBtn:hover{color:#555}",
      ".dark-mode #pinVerifyBox{background:#1c1f35;color:#e0e0e0}",
      ".dark-mode .pin-key{background:#13162a;border-color:#2e3250;color:#e0e0e0}",
      ".dark-mode #pinVerifyBox h3{color:#e0e0e0}",
    ].join("");
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.id = "pinVerifyOverlay";
    overlay.innerHTML =
      '<div id="pinVerifyBox">' +
      '<div class="pin-lock-icon"><span class="material-icons-outlined">lock</span></div>' +
      "<h3>Enter Transaction PIN</h3>" +
      "<p>Enter your 4–6 digit security PIN to authorise this transfer.</p>" +
      '<div id="pinDots"></div>' +
      '<div id="pinDigits">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map(function (n) {
          return (
            '<button type="button" class="pin-key" data-val="' +
            n +
            '">' +
            n +
            "</button>"
          );
        })
        .join("") +
      '<button type="button" class="pin-key del" data-val="del">⌫</button>' +
      '<button type="button" class="pin-key" data-val="0">0</button>' +
      "<div></div>" +
      "</div>" +
      '<div id="pinError"></div>' +
      '<button id="pinSubmitBtn">Confirm PIN</button>' +
      '<button id="pinCancelBtn">Cancel</button>' +
      "</div>";
    document.body.appendChild(overlay);
  }

  /* ── State ── */
  var _onSuccess = null;
  var _onCancel = null;
  var _entered = "";
  var _maxLen = 6;
  var _attempts = 0;
  var _maxAttempts = 3;

  function getPin() {
    var session = JSON.parse(localStorage.getItem("icu_session") || "null");
    if (!session) return null;
    var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
    var user = users.find(function (u) {
      return u.id === session.id;
    });
    return user ? user.transactionPin || null : null;
  }

  function renderDots(len) {
    var container = document.getElementById("pinDots");
    if (!container) return;
    var count = getPin() ? getPin().length : 4;
    container.innerHTML = "";
    for (var i = 0; i < Math.max(count, _entered.length || 4); i++) {
      var dot = document.createElement("div");
      dot.className = "pin-dot" + (i < _entered.length ? " filled" : "");
      container.appendChild(dot);
    }
  }

  function setError(msg) {
    var el = document.getElementById("pinError");
    if (el) el.textContent = msg;
  }

  function open(onSuccess, onCancel) {
    injectModal();
    _onSuccess = onSuccess || function () {};
    _onCancel = onCancel || function () {};
    _entered = "";
    _attempts = 0;
    setError("");
    renderDots(0);

    // Wire up keys
    document.querySelectorAll(".pin-key").forEach(function (btn) {
      btn.onclick = function () {
        var val = btn.dataset.val;
        if (val === "del") {
          _entered = _entered.slice(0, -1);
        } else if (_entered.length < _maxLen) {
          _entered += val;
        }
        renderDots(_entered.length);
        setError("");
      };
    });

    document.getElementById("pinSubmitBtn").onclick = function () {
      var pin = getPin();

      // If no PIN set for this user, skip PIN check and proceed
      if (!pin) {
        close();
        _onSuccess();
        return;
      }

      if (_entered.length < 4) {
        setError("PIN must be at least 4 digits.");
        return;
      }

      if (_entered === pin) {
        close();
        _onSuccess();
      } else {
        _attempts++;
        _entered = "";
        renderDots(0);
        var remaining = _maxAttempts - _attempts;
        if (remaining <= 0) {
          setError("Too many wrong attempts. Transfer blocked.");
          document.getElementById("pinSubmitBtn").disabled = true;
          setTimeout(function () {
            close();
            _onCancel();
          }, 2000);
        } else {
          setError(
            "Incorrect PIN. " +
              remaining +
              " attempt" +
              (remaining === 1 ? "" : "s") +
              " remaining.",
          );
        }
      }
    };

    document.getElementById("pinCancelBtn").onclick = function () {
      close();
      _onCancel();
    };

    document.getElementById("pinVerifyOverlay").classList.add("open");
  }

  function close() {
    var overlay = document.getElementById("pinVerifyOverlay");
    if (overlay) overlay.classList.remove("open");
    _entered = "";
    setError("");
    var btn = document.getElementById("pinSubmitBtn");
    if (btn) btn.disabled = false;
  }

  /* ── Public API ── */
  window.PinVerify = { prompt: open, close: close };
})();
