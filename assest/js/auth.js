/* ============================================================
   AUTH.JS — Registration, Login & Session Management
   Uses localStorage to persist user accounts and sessions.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const USERS_KEY = "icu_users"; // array of user objects
  const SESSION_KEY = "icu_session"; // currently logged-in user
  const LOG_KEY = "icu_activity_log"; // activity log for admin
  const TXN_KEY = "icu_transactions"; // transactions

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function logActivity(userId, userName, action, details, amount, txnType, targetAccount, reason) {
    var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    
    // Check for System Date override from Admin page
    const systemDate = localStorage.getItem("icu_system_date");
    const timestamp = systemDate ? new Date(systemDate).toISOString() : new Date().toISOString();

    logs.push({
      id: Date.now(),
      userId: userId,
      userName: userName,
      action: action,
      details: details || "",
      reason: reason || "", // New field for transferal reason
      amount: amount || null,
      txnType: txnType || null,
      targetAccount: targetAccount || null,
      timestamp: timestamp,
      status: "completed",
    });
    // keep last 500 logs
    if (logs.length > 500) logs = logs.slice(-500);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  }
  window._logActivity = logActivity;


  /* ==========================================================
     1. REGISTRATION  (open-account.html)
     ========================================================== */
  const accountForm = document.querySelector(".account-form");

  let pendingUser = null;
  let pendingDeposit = 0;
  let generatedOtp = null;

  if (accountForm) {
    accountForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const firstName = (
        document.getElementById("firstName")?.value || ""
      ).trim();
      const lastName = (
        document.getElementById("lastName")?.value || ""
      ).trim();
      const contactEmail = (
        document.getElementById("contactEmail")?.value || ""
      ).trim();
      const phone = (
        document.getElementById("contactPhone")?.value || ""
      ).trim();

      /* Login credentials section */
      const regEmail = (
        document.getElementById("regEmail")?.value || ""
      ).trim();
      const password = document.getElementById("regPassword")?.value || "";
      const confirmPassword =
        document.getElementById("regConfirmPassword")?.value || "";

      /* --- basic validation --- */
      if (!firstName || !lastName) {
        return showFormAlert("Please fill in your first and last name.");
      }

      if (!regEmail) {
        return showFormAlert("Please enter an email as your User ID.");
      }

      if (password.length < 6) {
        return showFormAlert("Password must be at least 6 characters.");
      }

      if (password !== confirmPassword) {
        return showFormAlert("Passwords do not match.");
      }

      /* --- check duplicate --- */
      const users = getUsers();
      const exists = users.find(
        (u) => u.email.toLowerCase() === regEmail.toLowerCase(),
      );

      if (exists) {
        return showFormAlert(
          "An account with that email already exists. Please sign in.",
        );
      }

      /* --- PREPARE USER OBJECT --- */
      const accountType = document.querySelector("select")?.value || "checking";
      pendingDeposit = parseFloat(document.getElementById("initialDeposit")?.value) || 0;
      
      pendingUser = {
        id: Date.now(),
        firstName,
        lastName,
        email: regEmail.toLowerCase(),
        contactEmail: contactEmail || regEmail,
        phone,
        password, // plain-text (demo only — hash in production!)
        accountType: accountType.toLowerCase(),
        status: "active",
        createdAt: new Date().toISOString(),
      };

      /* --- GENERATE & SEND OTP --- */
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending OTP...";
      }

      generatedOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

      try {
        const response = await fetch("http://localhost:3000/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_email: pendingUser.contactEmail,
            otp_code: generatedOtp,
            user_name: pendingUser.firstName + " " + pendingUser.lastName,
            app_name: "International Credit Union"
          })
        });

        if (!response.ok) throw new Error("Failed to send OTP");

        // Hide main submit button, show OTP section
        const submitSection = document.getElementById("submitSection");
        if (submitSection) submitSection.style.display = "none";
        
        const otpSection = document.getElementById("otpSection");
        if (otpSection) {
            otpSection.style.display = "block";
            const otpErrorMsg = document.getElementById("otpErrorMsg");
            if (otpErrorMsg) otpErrorMsg.style.display = "none";
        }
        showFormAlert("Verification code sent to your email. Please check your inbox.", "success");

      } catch (error) {
        console.error("OTP Send Error:", error);
        showFormAlert("Failed to send OTP email. Is the email service running?", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Application";
        }
      }
    });

    /* --- VERIFY OTP --- */
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener("click", function() {
        const otpInput = document.getElementById("otpInput")?.value.trim();
        const otpErrorMsg = document.getElementById("otpErrorMsg");

        if (otpInput === generatedOtp) {
          // Success
          if (otpErrorMsg) otpErrorMsg.style.display = "none";
          verifyOtpBtn.disabled = true;
          verifyOtpBtn.textContent = "Creating Account...";

          /* --- save user --- */
          const users = getUsers();
          users.push(pendingUser);
          saveUsers(users);

          /* log activity */
          logActivity(
            pendingUser.id,
            pendingUser.firstName + " " + pendingUser.lastName,
            "Account Created",
            "New " + pendingUser.accountType + " account opened",
          );

          /* initial deposit log */
          if (pendingDeposit > 0) {
            logActivity(
              pendingUser.id,
              pendingUser.firstName + " " + pendingUser.lastName,
              "Deposit",
              "Initial account funding",
              pendingDeposit,
              "credit",
              pendingUser.accountType
            );
          }

          /* auto-login & redirect */
          setSession({
            id: pendingUser.id,
            firstName: pendingUser.firstName,
            lastName: pendingUser.lastName,
            email: pendingUser.email,
            accountNumber: pendingUser.accountNumber,
            profilePic: pendingUser.profilePic || null
          });

          showFormAlert("Account created successfully! Redirecting…", "success");
          setTimeout(() => (window.location.href = "dashboard.html"), 1200);

        } else {
          // Error
          if (otpErrorMsg) {
            otpErrorMsg.textContent = "Invalid OTP code. Please try again.";
            otpErrorMsg.style.display = "block";
          }
        }
      });
    }
  }

  /* small alert helper for the registration form */
  function showFormAlert(msg, type) {
    let alertEl = document.getElementById("formAlert");
    if (!alertEl) {
      alertEl = document.createElement("p");
      alertEl.id = "formAlert";
      alertEl.style.cssText =
        "text-align:center;padding:12px;border-radius:8px;margin:18px 0;font-size:0.92rem;";
      const btn = document.getElementById("submitBtn");
      if (btn) btn.parentNode.insertBefore(alertEl, btn);
    }
    alertEl.textContent = msg;
    if (type === "success") {
      alertEl.style.background = "#e8f5e9";
      alertEl.style.color = "#2e7d32";
    } else {
      alertEl.style.background = "#ffebee";
      alertEl.style.color = "#c62828";
    }
    alertEl.style.display = "block";
  }

  /* ==========================================================
     2. LOGIN  (index.html — hero login panel)
     ========================================================== */
  const loginBtn = document.getElementById("loginBtn");

  if (loginBtn) {
    /* If already logged in, redirect straight to dashboard */
    if (getSession()) {
      window.location.href = "dashboard.html";
      return;
    }

    /* Restore saved login ID */
    const savedId = localStorage.getItem("icu_savedLoginId");
    if (savedId) {
      const userIdInput = document.getElementById("loginUserId");
      const saveCheck = document.getElementById("saveLogin");
      if (userIdInput) userIdInput.value = savedId;
      if (saveCheck) saveCheck.checked = true;
    }

    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();

      const userId = (document.getElementById("loginUserId")?.value || "")
        .trim()
        .toLowerCase();
      const password = document.getElementById("loginPassword")?.value || "";
      const errorEl = document.getElementById("loginError");

      /* clear previous error */
      if (errorEl) errorEl.style.display = "none";

      if (!userId || !password) {
        return showLoginError("Please enter your User ID and password.");
      }

      const users = getUsers();
      const user = users.find(
        (u) => u.email === userId && u.password === password,
      );

      if (!user) {
        return showLoginError("Invalid User ID or password. Please try again.");
      }

      /* check status */
      if (user.status && user.status !== "active") {
        return showLoginError("Your account is " + user.status + ". Please contact support.");
      }

      /* save ID checkbox */
      const saveCheck = document.getElementById("saveLogin");
      if (saveCheck && saveCheck.checked) {
        localStorage.setItem("icu_savedLoginId", userId);
      } else {
        localStorage.removeItem("icu_savedLoginId");
      }

      /* log activity */
      logActivity(
        user.id,
        user.firstName + " " + user.lastName,
        "Login",
        "User signed in",
      );

      /* set session & redirect */
      setSession({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });

      window.location.href = "dashboard.html";
    });

    /* Allow Enter key to submit */
    const pwdInput = document.getElementById("loginPassword");
    if (pwdInput) {
      pwdInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          loginBtn.click();
        }
      });
    }
  }

  function showLoginError(msg) {
    const el = document.getElementById("loginError");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  /* ==========================================================
     3. DASHBOARD AUTH GUARD  (dashboard.html)
     ========================================================== */
  const dashHeader = document.querySelector(".dash-header");

  if (dashHeader) {
    const session = getSession();

    if (!session) {
      /* not logged in — kick back to homepage */
      window.location.href = "index.html";
      return;
    }

    /* Greet the user */
    const usernameEl = document.querySelector(".username");
    if (usernameEl) {
      usernameEl.textContent = "Welcome, " + session.firstName;
    }

    /* --- Inject logout button --- */
    const userArea = document.querySelector(".user-area");
    if (userArea) {
      const logoutBtn = document.createElement("button");
      logoutBtn.textContent = "Log Out";
      logoutBtn.className = "logout-btn";
      logoutBtn.style.cssText =
        "margin-left:14px;padding:7px 18px;background:#e53935;color:#fff;" +
        "border:none;border-radius:5px;cursor:pointer;font-size:0.85rem;font-family:Inter,sans-serif;";
      logoutBtn.addEventListener("click", function () {
        logActivity(session.id, session.firstName, "Logout", "User signed out");
        clearSession();
        window.location.href = "index.html";
      });
      userArea.appendChild(logoutBtn);
    }
  }
})();
