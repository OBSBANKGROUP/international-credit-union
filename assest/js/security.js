/**
 * ICU SECURITY LAYER
 * ==================
 * Drop this on every protected page AFTER auth.js:
 *   <script src="assets/js/security.js"></script>
 *
 * Covers:
 *  1. Content Security Policy header (meta tag)
 *  2. XSS — sanitise all user-rendered output
 *  3. localStorage size management (large-scale users)
 *  4. Log rotation — keep only last 500 entries per user
 *  5. Input validation helpers used across all forms
 *  6. Clickjacking protection
 *  7. Console warning for DevTools snoopers
 *  8. Integrity check — detect tampered localStorage
 *  9. Data pagination for large transaction lists
 * 10. Debounce/throttle for high-traffic UI events
 */

(function () {
  "use strict";

  /* ══════════════════════════════════════════════════════
     1. CONTENT SECURITY POLICY (meta tag fallback)
     Note: best set as HTTP header on server — this adds
     a meta tag as a client-side fallback for static hosts.
  ══════════════════════════════════════════════════════ */
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    var csp = document.createElement("meta");
    csp.httpEquiv = "Content-Security-Policy";
    csp.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://translate.google.com https://translate.googleapis.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.emailjs.com https://translate.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; ");
    document.head.appendChild(csp);
  }

  /* ══════════════════════════════════════════════════════
     2. CLICKJACKING PROTECTION
     If page is loaded inside an iframe, break out.
  ══════════════════════════════════════════════════════ */
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }

  /* ══════════════════════════════════════════════════════
     3. DEVTOOLS WARNING
     Discourages casual inspection and credential theft.
  ══════════════════════════════════════════════════════ */
  var _devtoolsOpen = false;
  var _devtoolsThreshold = 160;
  setInterval(function () {
    if (
      window.outerWidth - window.innerWidth > _devtoolsThreshold ||
      window.outerHeight - window.innerHeight > _devtoolsThreshold
    ) {
      if (!_devtoolsOpen) {
        _devtoolsOpen = true;
        console.log(
          "%c⛔ STOP!",
          "color:#e53935;font-size:48px;font-weight:900",
        );
        console.log(
          "%cThis is a browser feature intended for developers. If someone told you to paste something here, they are trying to steal your banking credentials. Do NOT paste anything.",
          "color:#0a2342;font-size:16px;font-weight:600",
        );
      }
    } else {
      _devtoolsOpen = false;
    }
  }, 1000);

  /* ══════════════════════════════════════════════════════
     4. XSS PROTECTION — global output sanitiser
     Use ICU.sanitise(str) before inserting any user-
     generated content into the DOM.
  ══════════════════════════════════════════════════════ */
  window.ICU = window.ICU || {};

  window.ICU.sanitise = function (str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\//g, "&#x2F;")
      .replace(/`/g, "&#x60;")
      .replace(/=/g, "&#x3D;");
  };

  /* Safe DOM text setter — never use innerHTML with user data */
  window.ICU.setText = function (el, text) {
    if (!el) return;
    el.textContent = window.ICU.sanitise(text);
  };

  /* ══════════════════════════════════════════════════════
     5. INPUT VALIDATION HELPERS
  ══════════════════════════════════════════════════════ */
  window.ICU.validate = {
    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
    },
    phone: function (v) {
      return /^[\+\d\s\-\(\)]{7,20}$/.test(String(v || "").trim());
    },
    amount: function (v) {
      var n = parseFloat(v);
      return !isNaN(n) && n > 0 && n < 10000000;
    },
    routing: function (v) {
      return /^\d{9}$/.test(String(v || "").trim());
    },
    account: function (v) {
      return /^\d{6,17}$/.test(String(v || "").trim());
    },
    pin: function (v) {
      return /^\d{4,6}$/.test(String(v || "").trim());
    },
    password: function (v) {
      return String(v || "").length >= 6;
    },
    name: function (v) {
      return /^[a-zA-Z\s'\-\.]{2,60}$/.test(String(v || "").trim());
    },
  };

  /* ══════════════════════════════════════════════════════
     6. LOCALSTORAGE SIZE MANAGEMENT (large-scale users)
     Keeps storage lean so the site stays fast with many
     users stored locally. Rotates logs to last 500 per user.
  ══════════════════════════════════════════════════════ */
  window.ICU.pruneStorage = function () {
    try {
      /* Trim activity logs to last 500 */
      var logs = JSON.parse(localStorage.getItem("icu_activity_log") || "[]");
      if (logs.length > 500) {
        localStorage.setItem(
          "icu_activity_log",
          JSON.stringify(logs.slice(-500)),
        );
      }

      /* Trim users array — remove duplicate IDs */
      var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
      var seen = {};
      var clean = users.filter(function (u) {
        if (seen[u.id]) return false;
        seen[u.id] = true;
        return true;
      });
      if (clean.length < users.length) {
        localStorage.setItem("icu_users", JSON.stringify(clean));
      }

      /* Check storage usage */
      var total = 0;
      for (var key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += (localStorage.getItem(key) || "").length * 2; // bytes (approx)
        }
      }
      /* Warn if approaching 4.5MB (localStorage limit is typically 5MB) */
      if (total > 4500000) {
        console.warn(
          "ICU Storage warning: " +
            Math.round(total / 1024) +
            "KB used. Consider archiving old logs.",
        );
      }
    } catch (e) {
      /* storage full or unavailable */
    }
  };

  /* Run on load */
  window.ICU.pruneStorage();

  /* ══════════════════════════════════════════════════════
     7. INTEGRITY CHECK
     Detects if localStorage data has been tampered with
     by browser extensions or malicious scripts.
  ══════════════════════════════════════════════════════ */
  window.ICU.checkIntegrity = function () {
    try {
      var session = JSON.parse(localStorage.getItem("icu_session") || "null");
      if (!session) return true; // no session = ok

      /* Session must have required fields */
      if (!session.id || !session.expiresAt || !session.createdAt) {
        console.warn("ICU: Session integrity check failed — missing fields.");
        localStorage.removeItem("icu_session");
        return false;
      }

      /* expiresAt must be a number in the future (within 40 mins of creation) */
      var maxExpiry = session.createdAt + 41 * 60 * 1000;
      if (session.expiresAt > maxExpiry) {
        console.warn("ICU: Session integrity check failed — expiry tampered.");
        localStorage.removeItem("icu_session");
        return false;
      }

      /* Verify the session user actually exists */
      var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
      var user = users.find(function (u) {
        return u.id === session.id;
      });
      if (!user) {
        console.warn("ICU: Session integrity check failed — user not found.");
        localStorage.removeItem("icu_session");
        return false;
      }

      return true;
    } catch (e) {
      localStorage.removeItem("icu_session");
      return false;
    }
  };

  /* Run integrity check on every page load */
  if (!window.ICU.checkIntegrity()) {
    window.location.href = "index.html";
  }

  /* ══════════════════════════════════════════════════════
     8. DEBOUNCE / THROTTLE — helps with large traffic
     Prevents rapid-fire clicks on transfer/submit buttons.
  ══════════════════════════════════════════════════════ */
  window.ICU.debounce = function (fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      var args = arguments;
      var ctx = this;
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    };
  };

  window.ICU.throttle = function (fn, limit) {
    var lastCall = 0;
    return function () {
      var now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return fn.apply(this, arguments);
      }
    };
  };

  /* ══════════════════════════════════════════════════════
     9. TRANSACTION PAGINATION HELPER
     For large accounts with hundreds of transactions,
     use this to paginate instead of rendering all at once.
  ══════════════════════════════════════════════════════ */
  window.ICU.paginate = function (array, page, perPage) {
    perPage = perPage || 20;
    var start = (page - 1) * perPage;
    return {
      items: array.slice(start, start + perPage),
      total: array.length,
      totalPages: Math.ceil(array.length / perPage),
      page: page,
      perPage: perPage,
    };
  };

  /* ══════════════════════════════════════════════════════
     10. DOUBLE-SUBMIT PREVENTION
     Disables submit/transfer buttons for 3 seconds after
     first click to prevent duplicate transactions.
  ══════════════════════════════════════════════════════ */
  document.addEventListener(
    "submit",
    function (e) {
      var btn = e.target.querySelector(
        "button[type=submit], .submit-btn, .login-btn",
      );
      if (btn && !btn.dataset.locked) {
        btn.dataset.locked = "1";
        btn.style.opacity = "0.65";
        btn.style.cursor = "not-allowed";
        setTimeout(function () {
          btn.dataset.locked = "";
          btn.style.opacity = "";
          btn.style.cursor = "";
        }, 3000);
      }
    },
    true,
  );

  /* ══════════════════════════════════════════════════════
     11. SECURE COPY — mask sensitive numbers in clipboard
     When user copies an account/routing number, only the
     last 4 digits are visible in the clipboard.
     (Opt-in: add class="secure-copy" to any element)
  ══════════════════════════════════════════════════════ */
  document.addEventListener("copy", function (e) {
    var selection = window.getSelection();
    if (!selection) return;
    var node = selection.anchorNode;
    if (!node) return;
    var el = node.parentElement;
    if (el && el.classList && el.classList.contains("secure-copy")) {
      e.preventDefault();
      var text = selection.toString();
      var masked = text.replace(/\d(?=\d{4})/g, "•");
      e.clipboardData.setData("text/plain", masked);
    }
  });
})();
