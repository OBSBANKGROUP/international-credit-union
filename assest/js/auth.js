/* ============================================================
   AUTH.JS — Registration, Login, Session Management
   + Login OTP verification
   + 2-hour session timeout with warning
   + Brute-force protection (5 attempts → 15 min lockout)
   + Session integrity check on every page
   + XSS input sanitisation
   + Rate limiting on login
   ============================================================ */

(function () {
  "use strict";

  /* ── Storage keys ── */
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";

  /* ── Session config ── */
  const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
  const WARN_BEFORE_MS = 5 * 60 * 1000; // warn 5 mins before expiry
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000; // 15-minute lockout

  /* ── Helpers ── */
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }
  function saveUsers(u) {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  }
  function getSession() {
    const d = localStorage.getItem(SESSION_KEY);
    return d ? JSON.parse(d) : null;
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function setSession(user) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_MS,
      }),
    );
  }

  /* Sanitise input to prevent XSS */
  function sanitise(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function logActivity(
    userId,
    userName,
    action,
    details,
    amount,
    txnType,
    targetAccount,
    reason,
  ) {
    var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    const systemDate = localStorage.getItem("icu_system_date");
    const timestamp = systemDate
      ? new Date(systemDate).toISOString()
      : new Date().toISOString();
    logs.push({
      id: Date.now(),
      userId,
      userName,
      action,
      details: details || "",
      reason: reason || "",
      amount: amount || null,
      txnType: txnType || null,
      targetAccount: targetAccount || null,
      timestamp,
      status: "completed",
    });
    if (logs.length > 500) logs = logs.slice(-500);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  }
  window._logActivity = logActivity;

  /* ══════════════════════════════════════════════════════════════
     BRUTE-FORCE PROTECTION
  ══════════════════════════════════════════════════════════════ */
  function getLoginAttempts() {
    return JSON.parse(
      localStorage.getItem("icu_login_attempts") ||
        '{"count":0,"lockedUntil":0}',
    );
  }
  function saveLoginAttempts(obj) {
    localStorage.setItem("icu_login_attempts", JSON.stringify(obj));
  }
  function isLockedOut() {
    const a = getLoginAttempts();
    if (a.lockedUntil && Date.now() < a.lockedUntil) return true;
    if (a.lockedUntil && Date.now() >= a.lockedUntil) {
      saveLoginAttempts({ count: 0, lockedUntil: 0 });
    }
    return false;
  }
  function recordFailedAttempt() {
    const a = getLoginAttempts();
    a.count = (a.count || 0) + 1;
    if (a.count >= MAX_LOGIN_ATTEMPTS) {
      a.lockedUntil = Date.now() + LOCKOUT_MS;
      a.count = 0;
    }
    saveLoginAttempts(a);
    return a;
  }
  function clearLoginAttempts() {
    saveLoginAttempts({ count: 0, lockedUntil: 0 });
  }
  function lockoutTimeLeft() {
    const a = getLoginAttempts();
    const ms = a.lockedUntil - Date.now();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  }

  /* ══════════════════════════════════════════════════════════════
     SESSION TIMEOUT — 40 minutes
     Checks every 30 seconds. Shows 5-minute warning, then logs out.
  ══════════════════════════════════════════════════════════════ */
  function startSessionTimer() {
    var warnShown = false;

    const interval = setInterval(function () {
      const session = getSession();
      if (!session || !session.expiresAt) {
        clearInterval(interval);
        return;
      }

      const remaining = session.expiresAt - Date.now();

      if (remaining <= 0) {
        clearInterval(interval);
        clearSession();
        showSessionExpiredOverlay();
        return;
      }

      if (remaining <= WARN_BEFORE_MS && !warnShown) {
        warnShown = true;
        showSessionWarning(Math.round(remaining / 60000));
      }
    }, 30000); // check every 30 seconds

    // Reset timer on user activity
    ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach(
      function (evt) {
        document.addEventListener(
          evt,
          function () {
            const session = getSession();
            if (!session) return;
            session.expiresAt = Date.now() + SESSION_DURATION_MS;
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            warnShown = false;
            const warn = document.getElementById("sessionWarnBanner");
            if (warn) warn.remove();
          },
          { passive: true },
        );
      },
    );
  }

  function showSessionWarning(minsLeft) {
    if (document.getElementById("sessionWarnBanner")) return;
    const banner = document.createElement("div");
    banner.id = "sessionWarnBanner";
    banner.style.cssText = [
      "position:fixed;top:0;left:0;right:0;z-index:99998;",
      "background:linear-gradient(135deg,#e65100,#f57c00);color:white;",
      "padding:12px 20px;display:flex;align-items:center;justify-content:space-between;",
      "font-family:Inter,sans-serif;font-size:.88rem;font-weight:600;",
      "box-shadow:0 4px 16px rgba(0,0,0,.2)",
    ].join("");
    banner.innerHTML =
      "<span>&#9203; Your session will expire in " +
      minsLeft +
      " minute" +
      (minsLeft !== 1 ? "s" : "") +
      ". Move your mouse or click anywhere to stay signed in.</span>" +
      '<button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;color:white;padding:5px 12px;border-radius:8px;cursor:pointer;font-family:Inter,sans-serif;font-size:.8rem">Dismiss</button>';
    document.body.prepend(banner);
  }

  function showSessionExpiredOverlay() {
    if (document.getElementById("sessionExpiredOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "sessionExpiredOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(10,15,30,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)";
    overlay.innerHTML =
      '<div style="background:white;border-radius:24px;padding:44px 36px;max-width:400px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.4);font-family:Inter,sans-serif">' +
      '<div style="width:72px;height:72px;background:#fff3e0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:2rem">&#9203;</div>' +
      '<div style="font-size:1.2rem;font-weight:800;color:#0a2342;margin-bottom:8px">Session Expired</div>' +
      '<div style="width:44px;height:3px;background:#f57c00;border-radius:2px;margin:0 auto 16px"></div>' +
      '<p style="color:#555;font-size:.88rem;line-height:1.7;margin-bottom:24px">Your session has expired after 2 hours of inactivity. Please sign in again to continue.</p>' +
      '<a href="index.html" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#4b38f5,#6a5cff);color:white;border-radius:22px;font-weight:700;text-decoration:none;font-size:.9rem">Sign In Again</a>' +
      "</div>";
    document.body.appendChild(overlay);
    setTimeout(function () {
      window.location.href = "index.html";
    }, 4000);
  }

  /* ══════════════════════════════════════════════════════════════
     SUSPENSION GUARD
  ══════════════════════════════════════════════════════════════ */
  window.showSuspendedOverlay = function () {
    if (document.getElementById("suspendedOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "suspendedOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(10,15,30,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)";
    overlay.innerHTML =
      '<div style="background:white;border-radius:24px;padding:44px 36px;max-width:420px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,.4);font-family:Inter,sans-serif">' +
      '<div style="width:76px;height:76px;background:#ffebee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2.2rem">&#128683;</div>' +
      '<div style="color:#b71c1c;font-size:1.25rem;font-weight:800;margin-bottom:10px">Account Suspended</div>' +
      '<div style="width:48px;height:3px;background:#e53935;border-radius:2px;margin:0 auto 18px"></div>' +
      '<p style="color:#555;font-size:.9rem;line-height:1.7;margin-bottom:6px">Your account has been placed on hold.</p>' +
      '<p style="color:#555;font-size:.9rem;line-height:1.7;margin-bottom:24px">Please <strong>visit our branch</strong> or <strong>contact online support</strong> for more information and assistance.</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">' +
      '<a href="Contact.html" style="padding:11px 22px;background:#c62828;color:white;border-radius:22px;text-decoration:none;font-size:.85rem;font-weight:700">Contact Support</a>' +
      '<a href="tel:+18005552478" style="padding:11px 22px;background:#f5f5f5;color:#333;border-radius:22px;text-decoration:none;font-size:.85rem;font-weight:700">&#128222; Call Us</a>' +
      "</div>" +
      '<a href="index.html" style="color:#aaa;font-size:.8rem;text-decoration:none">Sign out</a>' +
      "</div>";
    document.body.appendChild(overlay);
  };

  window.checkSuspended = function () {
    const session = getSession();
    if (!session) return false;

    /* First check cached status for instant response */
    const users = getUsers();
    const user = users.find(function (u) {
      return String(u.id) === String(session.id);
    });
    if (
      user &&
      (user.status === "suspended" ||
        user.status === "hold" ||
        user.status === "frozen")
    ) {
      window.showSuspendedOverlay();
      return true;
    }

    /* Also verify LIVE status from Supabase (in case admin just suspended) */
    if (session.email) {
      var SU = "https://fyuuzoldfzcybgwlbofp.supabase.co";
      var SK =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
      fetch(
        SU +
          "/rest/v1/users?email=eq." +
          encodeURIComponent(session.email.toLowerCase().trim()) +
          "&select=status",
        {
          headers: { apikey: SK, Authorization: "Bearer " + SK },
        },
      )
        .then(function (r) {
          return r.json();
        })
        .then(function (rows) {
          if (rows && rows[0]) {
            var st = (rows[0].status || "active").toLowerCase();
            /* Update cache */
            try {
              var cu = getUsers();
              var ix = cu.findIndex(function (u) {
                return String(u.id) === String(session.id);
              });
              if (ix >= 0) {
                cu[ix].status = st;
                localStorage.setItem("icu_users", JSON.stringify(cu));
              }
            } catch (e) {}
            if (st === "suspended" || st === "hold" || st === "frozen") {
              window.showSuspendedOverlay();
            }
          }
        })
        .catch(function () {});
    }
    return false;
  };

  /* Live async check that returns a promise — use to BLOCK transactions */
  window.checkSuspendedLive = function () {
    const session = getSession();
    if (!session || !session.email) return Promise.resolve(false);
    var SU = "https://fyuuzoldfzcybgwlbofp.supabase.co";
    var SK =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
    return fetch(
      SU +
        "/rest/v1/users?email=eq." +
        encodeURIComponent(session.email.toLowerCase().trim()) +
        "&select=status",
      {
        headers: { apikey: SK, Authorization: "Bearer " + SK },
      },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (rows) {
        if (rows && rows[0]) {
          var st = (rows[0].status || "active").toLowerCase();
          if (st === "suspended" || st === "hold" || st === "frozen") {
            window.showSuspendedOverlay();
            return true;
          }
        }
        return false;
      })
      .catch(function () {
        return false;
      });
  };

  /* ══════════════════════════════════════════════════════════════
     LOGIN OTP MODAL — injects into any page that has #loginBtn
  ══════════════════════════════════════════════════════════════ */
  function injectLoginOTPModal() {
    if (document.getElementById("loginOtpOverlay")) return;
    const style = document.createElement("style");
    style.textContent = [
      "#loginOtpOverlay{position:fixed;inset:0;background:rgba(2,22,51,.88);z-index:9999;",
      "display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}",
      "#loginOtpOverlay.open{display:flex}",
      "#loginOtpBox{background:white;border-radius:22px;padding:40px 32px;width:90%;max-width:380px;",
      "text-align:center;box-shadow:0 28px 70px rgba(0,0,0,.35);animation:loginOtpUp .3s ease}",
      "@keyframes loginOtpUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}",
      "#loginOtpBox .otp-shield{width:66px;height:66px;background:#f0f2ff;border-radius:50%;",
      "display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.9rem}",
      "#loginOtpBox h3{font-size:1.1rem;font-weight:800;color:#0a2342;margin-bottom:6px;font-family:Inter,sans-serif}",
      "#loginOtpBox .otp-sub{font-size:.83rem;color:#888;margin-bottom:24px;line-height:1.5}",
      "#loginOtpBox .otp-to{font-weight:700;color:#4b38f5}",
      "#loginOtpInput{width:100%;padding:16px;text-align:center;font-size:1.6rem;letter-spacing:12px;",
      "border:2px solid #e0e4ee;border-radius:14px;font-family:Inter,sans-serif;",
      "color:#0a2342;margin-bottom:8px;outline:none;transition:.2s}",
      "#loginOtpInput:focus{border-color:#4b38f5;box-shadow:0 0 0 3px rgba(75,56,245,.1)}",
      "#loginOtpErr{font-size:.8rem;color:#e53935;min-height:18px;margin-bottom:14px;font-family:Inter,sans-serif}",
      "#loginOtpVerifyBtn{width:100%;padding:13px;background:linear-gradient(135deg,#4b38f5,#6a5cff);",
      "color:white;border:none;border-radius:22px;font-size:.95rem;font-weight:700;cursor:pointer;",
      "font-family:Inter,sans-serif;margin-bottom:12px;transition:.3s}",
      "#loginOtpVerifyBtn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(75,56,245,.35)}",
      "#loginOtpResend{background:none;border:none;color:#4b38f5;font-size:.82rem;cursor:pointer;",
      "font-family:Inter,sans-serif;font-weight:600}",
      "#loginOtpCancel{display:block;margin-top:8px;color:#aaa;font-size:.78rem;cursor:pointer;",
      "font-family:Inter,sans-serif;background:none;border:none;width:100%}",
    ].join("");
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "loginOtpOverlay";
    overlay.innerHTML =
      '<div id="loginOtpBox">' +
      '<div class="otp-shield">&#128737;</div>' +
      "<h3>Verify Your Identity</h3>" +
      '<p class="otp-sub">We sent a 6-digit verification code to<br><span class="otp-to" id="loginOtpEmailTo"></span></p>' +
      '<input type="text" id="loginOtpInput" maxlength="6" inputmode="numeric" placeholder="000000"/>' +
      '<div id="loginOtpErr"></div>' +
      '<button id="loginOtpVerifyBtn">Verify &amp; Sign In</button>' +
      '<button id="loginOtpResend">Resend Code</button>' +
      '<button id="loginOtpCancel">Cancel</button>' +
      "</div>";
    document.body.appendChild(overlay);
  }

  /* ══════════════════════════════════════════════════════════════
     1. REGISTRATION
  ══════════════════════════════════════════════════════════════ */
  const accountForm = document.querySelector(".account-form");
  if (accountForm) {
    accountForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const firstName = sanitise(
        (document.getElementById("firstName")?.value || "").trim(),
      );
      const lastName = sanitise(
        (document.getElementById("lastName")?.value || "").trim(),
      );
      const contactEmail = sanitise(
        (document.getElementById("contactEmail")?.value || "").trim(),
      );
      const phone = sanitise(
        (document.getElementById("contactPhone")?.value || "").trim(),
      );
      const regEmail = sanitise(
        (document.getElementById("regEmail")?.value || "").trim().toLowerCase(),
      );
      const password = document.getElementById("regPassword")?.value || "";
      const confirmPass =
        document.getElementById("regConfirmPassword")?.value || "";

      if (!firstName || !lastName)
        return showFormAlert("Please enter your first and last name.");
      if (!regEmail) return showFormAlert("Please enter a valid email.");
      if (password.length < 6)
        return showFormAlert("Password must be at least 6 characters.");
      if (password !== confirmPass)
        return showFormAlert("Passwords do not match.");

      const users = getUsers();
      const exists = users.find((u) => u.email === regEmail);
      if (exists)
        return showFormAlert("An account with that email already exists.");

      const accountType = document.querySelector("select")?.value || "checking";
      const newUser = {
        id: Date.now(),
        firstName,
        lastName,
        email: regEmail,
        contactEmail: contactEmail || regEmail,
        phone,
        password,
        accountType: accountType.toLowerCase(),
        status: "active",
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      saveUsers(users);

      logActivity(
        newUser.id,
        firstName + " " + lastName,
        "Account Created",
        "New account opened",
      );

      const deposit =
        parseFloat(document.getElementById("initialDeposit")?.value) || 0;
      if (deposit > 0) {
        logActivity(
          newUser.id,
          firstName + " " + lastName,
          "Deposit",
          "Initial account funding",
          deposit,
          "credit",
          newUser.accountType,
        );
      }

      setSession(newUser);
      showFormAlert("Account created! Redirecting…", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    });
  }

  function showFormAlert(msg, type) {
    let el = document.getElementById("formAlert");
    if (!el) {
      el = document.createElement("p");
      el.id = "formAlert";
      el.style.cssText =
        "text-align:center;padding:12px;border-radius:8px;margin:14px 0;font-size:.9rem;font-family:Inter,sans-serif";
      const btn = document.getElementById("submitBtn");
      if (btn) btn.parentNode.insertBefore(el, btn);
    }
    el.textContent = msg;
    el.style.background = type === "success" ? "#e8f5e9" : "#ffebee";
    el.style.color = type === "success" ? "#2e7d32" : "#c62828";
    el.style.display = "block";
  }

  /* ══════════════════════════════════════════════════════════════
     2. LOGIN  (index.html)
     Flow: credentials → brute-force check → OTP email → verify → session
  ══════════════════════════════════════════════════════════════ */
  const loginBtn = document.getElementById("loginBtn");

  if (loginBtn) {
    // Already logged in with valid session → go straight to dashboard
    const existingSession = getSession();
    if (
      existingSession &&
      existingSession.expiresAt &&
      Date.now() < existingSession.expiresAt
    ) {
      window.location.href = "dashboard.html";
      return;
    } else if (existingSession) {
      clearSession(); // expired session — clear it
    }

    // Restore saved login ID
    const savedId = localStorage.getItem("icu_savedLoginId");
    if (savedId) {
      const inp = document.getElementById("loginUserId");
      const chk = document.getElementById("saveLogin");
      if (inp) inp.value = savedId;
      if (chk) chk.checked = true;
    }

    let pendingLoginUser = null;
    let loginOTP = "";
    injectLoginOTPModal();

    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (isLockedOut()) {
        return showLoginError(
          "Too many failed attempts. Please try again later.",
        );
      }

      var errorEl = document.getElementById("loginError");
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }

      var emailInput = document.getElementById("loginUserId");
      var passwordInput = document.getElementById("loginPassword");
      if (!emailInput || !passwordInput) return;

      // Strip everything that mobile keyboards can inject
      var enteredEmail = emailInput.value
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/[^\x20-\x7E]/g, "");
      var enteredPassword = passwordInput.value
        .replace(/\r|\n/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .trim();

      if (!enteredEmail)
        return showLoginError("Please enter your email address.");
      if (!enteredPassword)
        return showLoginError("Please enter your password.");

      // Login via Supabase (works on any device) with localStorage fallback
      function attemptLogin(allUsers) {
        var user = null;
        for (var i = 0; i < allUsers.length; i++) {
          var u = allUsers[i];
          var sEmail = (u.email || "")
            .toLowerCase()
            .replace(/\s/g, "")
            .replace(/[^\x20-\x7E]/g, "");
          var sPass = (u.password || "")
            .replace(/\r|\n/g, "")
            .replace(/[^\x20-\x7E]/g, "")
            .trim();
          if (sEmail !== enteredEmail) continue;
          if (
            sPass === enteredPassword ||
            sPass === enteredPassword.trim() ||
            sPass.trim() === enteredPassword ||
            sPass.toLowerCase() === enteredPassword.toLowerCase()
          ) {
            user = u;
            break;
          }
        }
        if (!user) {
          var att = recordFailedAttempt();
          if (att.lockedUntil)
            return showLoginError(
              "Account temporarily locked. Please try again in 15 minutes.",
            );
          return showLoginError("Incorrect email or password.");
        }
        if (user.status === "suspended") {
          window.showSuspendedOverlay && window.showSuspendedOverlay();
          return;
        }
        pendingLoginUser = user;
        loginOTP = Math.floor(100000 + Math.random() * 900000).toString();
        if (window._sendOTP)
          window._sendOTP(user.email, loginOTP, user.firstName);
        else
          console.log(
            "%c🔑 LOGIN OTP: " + loginOTP,
            "background:#4b38f5;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700",
          );
        var emailTo = document.getElementById("loginOtpEmailTo");
        if (emailTo) {
          var masked = (user.email || "").replace(
            /(.{2})(.*)(@.*)/,
            function (_, a, b, c) {
              return a + b.replace(/./g, "•") + c;
            },
          );
          emailTo.textContent = masked;
        }
        if (document.getElementById("loginOtpInput"))
          document.getElementById("loginOtpInput").value = "";
        if (document.getElementById("loginOtpErr"))
          document.getElementById("loginOtpErr").textContent = "";
        if (document.getElementById("loginOtpOverlay"))
          document.getElementById("loginOtpOverlay").classList.add("open");
      }

      // Use Supabase if available, else fall back to localStorage
      if (window._dbGetUserByEmail) {
        window
          ._dbGetUserByEmail(enteredEmail)
          .then(function (u) {
            attemptLogin(u ? [u] : []);
          })
          .catch(function () {
            attemptLogin(getUsers());
          });
        return;
      }
      attemptLogin(getUsers());
      return; // everything handled inside attemptLogin

      clearLoginAttempts();

      // Save checkbox
      const saveCheck = document.getElementById("saveLogin");
      if (saveCheck && saveCheck.checked) {
        localStorage.setItem("icu_savedLoginId", userId);
      } else {
        localStorage.removeItem("icu_savedLoginId");
      }

      // Generate and send OTP
      pendingLoginUser = user;
      loginOTP = Math.floor(100000 + Math.random() * 900000).toString();

      if (window._sendOTP) {
        window._sendOTP(
          user.email || user.contactEmail,
          loginOTP,
          user.firstName,
        );
      } else {
        console.log(
          "%c🔑 LOGIN OTP: " + loginOTP,
          "background:#4b38f5;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700;font-size:14px",
        );
      }

      // Show OTP modal
      const emailTo = document.getElementById("loginOtpEmailTo");
      if (emailTo) {
        const masked = user.email.replace(/(.{2}).+(@.+)/, "$1•••$2");
        emailTo.textContent = masked;
      }
      document.getElementById("loginOtpInput").value = "";
      document.getElementById("loginOtpErr").textContent = "";
      document.getElementById("loginOtpOverlay").classList.add("open");
    });

    // Enter key submits
    const pwdInput = document.getElementById("loginPassword");
    if (pwdInput)
      pwdInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          loginBtn.click();
        }
      });

    // OTP Verify button
    document.addEventListener("click", function (e) {
      if (e.target.id === "loginOtpVerifyBtn") {
        const entered = document.getElementById("loginOtpInput").value.trim();
        const errEl = document.getElementById("loginOtpErr");

        if (!entered || entered.length < 6) {
          errEl.textContent = "Please enter the 6-digit code.";
          return;
        }
        if (entered !== loginOTP) {
          document.getElementById("loginOtpInput").style.borderColor =
            "#e53935";
          setTimeout(() => {
            document.getElementById("loginOtpInput").style.borderColor = "";
          }, 1500);
          errEl.textContent = "Incorrect code. Please try again.";
          return;
        }

        // OTP correct — complete login
        document.getElementById("loginOtpOverlay").classList.remove("open");
        logActivity(
          pendingLoginUser.id,
          pendingLoginUser.firstName + " " + pendingLoginUser.lastName,
          "Login",
          "User signed in with OTP",
        );
        setSession(pendingLoginUser);
        window.location.href = "dashboard.html";
      }

      if (e.target.id === "loginOtpResend") {
        loginOTP = Math.floor(100000 + Math.random() * 900000).toString();
        if (window._sendOTP) {
          window._sendOTP(
            pendingLoginUser.email || pendingLoginUser.contactEmail,
            loginOTP,
            pendingLoginUser.firstName,
          );
        } else {
          console.log(
            "%c🔑 RESENT LOGIN OTP: " + loginOTP,
            "background:#2e7d32;color:#fff;padding:4px 12px;border-radius:4px;font-weight:700;font-size:14px",
          );
        }
        document.getElementById("loginOtpErr").textContent =
          "New code sent to your email.";
        document.getElementById("loginOtpErr").style.color = "#2e7d32";
      }

      if (e.target.id === "loginOtpCancel") {
        document.getElementById("loginOtpOverlay").classList.remove("open");
        pendingLoginUser = null;
        loginOTP = "";
      }
    });
  }

  function showLoginError(msg) {
    const el = document.getElementById("loginError");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  /* ══════════════════════════════════════════════════════════════
     3. DASHBOARD AUTH GUARD + SESSION TIMER
  ══════════════════════════════════════════════════════════════ */
  const dashHeader = document.querySelector(".dash-header");
  if (dashHeader) {
    const session = getSession();

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    // Validate session hasn't expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      showSessionExpiredOverlay();
      return;
    }

    // Refresh expiry on load
    session.expiresAt = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Start the 2-hour countdown
    startSessionTimer();

    // Greet user
    const usernameEl = document.querySelector(".username");
    if (usernameEl) usernameEl.textContent = "Welcome, " + session.firstName;

    // Logout button
    const userArea = document.querySelector(".user-area");
    if (userArea) {
      const logoutBtn = document.createElement("button");
      logoutBtn.textContent = "Log Out";
      logoutBtn.className = "logout-btn";
      logoutBtn.style.cssText =
        "margin-left:14px;padding:7px 18px;background:#e53935;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:.85rem;font-family:Inter,sans-serif";
      logoutBtn.addEventListener("click", function () {
        logActivity(session.id, session.firstName, "Logout", "User signed out");
        clearSession();
        window.location.href = "index.html";
      });
      userArea.appendChild(logoutBtn);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     4. SESSION CHECK on ALL protected pages (non-dashboard)
     Called automatically when auth.js is loaded on any page
     that is NOT index.html and NOT open-account.html
  ══════════════════════════════════════════════════════════════ */
  const isPublicPage =
    window.location.pathname.includes("index.html") ||
    window.location.pathname.includes("open-account.html") ||
    window.location.pathname.includes("admin") ||
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/");

  if (!isPublicPage && !dashHeader) {
    const session = getSession();
    if (!session) {
      window.location.href = "index.html";
    } else if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      showSessionExpiredOverlay();
    } else {
      // Refresh on every page visit
      session.expiresAt = Date.now() + SESSION_DURATION_MS;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      startSessionTimer();
    }
  }
})();
