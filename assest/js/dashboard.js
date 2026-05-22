document.addEventListener("DOMContentLoaded", () => {
  /* ================= DATA HELPERS ================= */
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";

  function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  function getLogs() {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  }

  function formatCurrency(num) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  }

  /* ================= LOAD USER DATA ================= */
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  const users = getUsers();
  const currentUser = users.find((u) => u.id === session.id);
  if (!currentUser) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
    return;
  }

  // Show suspended overlay if account is on hold
  if (window.checkSuspended && window.checkSuspended()) return;

  // Update Profile Name and Picture
  const usernameEls = document.querySelectorAll(".username");
  usernameEls.forEach((el) => {
    el.textContent = currentUser.firstName + " " + currentUser.lastName;
  });

  const profilePicEl = document.getElementById("profileBtn");
  if (profilePicEl && currentUser.profilePic) {
    profilePicEl.src = currentUser.profilePic;
  }

  /* ================= CALCULATE BALANCE =================
     Wrapped in initDashboard() so it can be called AFTER
     db.js has finished loading data from Supabase into
     localStorage. Without this, getLogs() returns [] because
     the async Supabase load hasn't finished yet.
  ================= */
  function initDashboard() {
    // Re-fetch current user from localStorage (now populated by db.js)
    const freshUsers = getUsers();
    const me =
      freshUsers.find((u) => String(u.id) === String(session.id)) ||
      currentUser;

    const logs = getLogs();
    const primary = (currentUser.accountType || "checking").toLowerCase();

    function getAccBalance(userId, type) {
      let bal = 0;
      logs.forEach((l) => {
        if (l.userId !== userId || !l.amount) return;
        // Use explicit targetAccount if set; otherwise fall back to user's primary
        const acct = (l.targetAccount || primary).toLowerCase();
        if (type && acct !== type.toLowerCase()) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      });
      return bal;
    }

    function getAccBalFixed(userId, type) {
      let bal = 0;
      logs.forEach((l) => {
        if (l.userId !== userId || l.amount == null) return;
        // If log has an explicit targetAccount, use it
        // If no targetAccount, count it only toward the primary account
        const acct = l.targetAccount ? l.targetAccount.toLowerCase() : primary;
        if (type && acct !== type.toLowerCase()) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      });
      return bal;
    }

    /* ── Get account name from user.accounts (supports new {enabled,name} format
     and old {checking:true} format) ── */
    function getAcctName(key, fallback) {
      const accts = currentUser.accounts || {};
      const val = accts[key];
      if (!val) return fallback;
      if (typeof val === "object" && val.name) return val.name;
      return fallback;
    }

    /* ── Find all business account keys (business_0, business_1, or legacy "business") ── */
    function getBizKeys() {
      const accts = currentUser.accounts || {};
      return Object.keys(accts).filter(
        (k) => k !== "checking" && k !== "savings" && accts[k],
      );
    }

    const checkingBalance = getAccBalFixed(currentUser.id, "checking");
    const savingsBalance = getAccBalFixed(currentUser.id, "savings");
    const bizKeys = getBizKeys();

    // Total = checking + savings + all business accounts
    let totalBalance = checkingBalance + savingsBalance;
    bizKeys.forEach((k) => {
      totalBalance += getAccBalFixed(currentUser.id, k);
    });

    // Update total balance display
    document.querySelectorAll(".balance").forEach((el) => {
      el.textContent = formatCurrency(totalBalance);
    });
    const mainBalanceH1 = document.querySelector(".balance-card h1");
    if (mainBalanceH1) mainBalanceH1.textContent = formatCurrency(totalBalance);

    /* ── Update account box labels and balances ── */
    // Checking
    const ckLabel = document.getElementById("acctLabel_checking");
    const ckBal = document.getElementById("acctBal_checking");
    if (ckLabel) ckLabel.textContent = getAcctName("checking", "Checking");
    if (ckBal) ckBal.textContent = formatCurrency(checkingBalance);

    // Savings
    const svLabel = document.getElementById("acctLabel_savings");
    const svBal = document.getElementById("acctBal_savings");
    if (svLabel) svLabel.textContent = getAcctName("savings", "Savings");
    if (svBal) svBal.textContent = formatCurrency(savingsBalance);

    // Business — show first biz account in the 3rd box, with correct name
    const bizBox = document.getElementById("acctBox_business");
    const bizLabel = document.getElementById("acctLabel_business");
    const bizBal = document.getElementById("acctBal_business");
    if (bizKeys.length > 0) {
      const firstBizKey = bizKeys[0];
      const firstBizBal = getAccBalFixed(currentUser.id, firstBizKey);
      const firstBizName = getAcctName(firstBizKey, "Business");
      if (bizLabel) bizLabel.textContent = firstBizName;
      if (bizBal) bizBal.textContent = formatCurrency(firstBizBal);
      if (bizBox) bizBox.style.display = "";
    } else {
      // No business account — hide the box
      if (bizBox) bizBox.style.display = "none";
    }

    // Card number
    const cardNumEl = document.getElementById("acctCardNum");
    if (cardNumEl)
      cardNumEl.textContent = currentUser.accountNumber || "— — — —";

    /* ================= NOTIFICATIONS ================= */
    const notifyBar = document.getElementById("notifyBar");
    function updateNotifyBar() {
      const notifications = JSON.parse(
        localStorage.getItem("icu_notifications") || "[]",
      );
      const unread = notifications.filter((n) => n.unread);
      if (notifyBar && unread.length > 0) {
        const latest = unread[0];
        notifyBar.innerHTML = `
        <div class="notify-pill">
          <span class="material-icons-outlined">notifications_active</span>
          <p>${latest.title}: ${latest.message}</p>
          <button onclick="this.parentElement.parentElement.style.display='none'">✕</button>
        </div>
      `;
        notifyBar.style.display = "block";
      } else if (notifyBar) {
        notifyBar.style.display = "none";
      }
    }
    updateNotifyBar();

    /* ================= RECENT TRANSACTIONS ================= */
    const transSection = document.querySelector(".transactions");
    if (transSection) {
      const allLogs = getLogs();
      const userLogs = allLogs.filter(
        (l) => l.userId === currentUser.id && l.amount,
      );
      const recentLogs = userLogs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

      if (recentLogs.length > 0) {
        transSection.innerHTML = `
        <div class="section-header">
          <h3>Recent Activity</h3>
          <a href="transaction.html">View All</a>
        </div>
        <div class="txn-list"></div>
      `;

        const listContainer = transSection.querySelector(".txn-list");
        recentLogs.forEach((l) => {
          const isCredit = l.txnType === "credit";
          const sign = isCredit ? "+" : "-";
          const amtClass = isCredit ? "txn-credit" : "txn-debit";
          const icon = isCredit ? "arrow_downward" : "arrow_upward";
          const iconClass = isCredit ? "txn-icon-credit" : "txn-icon-debit";

          const row = document.createElement("div");
          row.className = "txn-row";
          row.innerHTML = `
          <div class="txn-left">
            <div class="txn-icon ${iconClass}">
              <span class="material-icons-outlined">${icon}</span>
            </div>
            <div class="txn-info">
              <strong>${l.action}</strong>
              <span>${new Date(l.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </div>
          <div class="txn-amount ${amtClass}">${sign}${formatCurrency(l.amount)}</div>
        `;
          listContainer.appendChild(row);
        });
      }
    }

    /* ================= UI LOGIC ================= */
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn) {
      profileBtn.addEventListener("click", () => {
        window.location.href = "settings.html";
      });
    }

    const switchBtn = document.getElementById("switchBtn");
    const switchBtnCard = document.getElementById("switchBtnCard");
    const goToBusiness = () =>
      (window.location.href = "bussiness-dashboard.html");
    if (switchBtn) switchBtn.addEventListener("click", goToBusiness);
    if (switchBtnCard) switchBtnCard.addEventListener("click", goToBusiness);

    const menuBtn = document.getElementById("menuBtn");
    const menuPanel = document.getElementById("menuPanel");
    if (menuBtn && menuPanel) {
      menuBtn.addEventListener("click", () => {
        menuPanel.classList.toggle("open");
      });
    }

    /* DARK MODE */
    if (window._initThemeToggle) {
      window._initThemeToggle("darkToggle");
    }
  } // end initDashboard

  /* Wait for db.js to finish syncing from Supabase, then run dashboard */
  function runWhenReady() {
    if (window._icuLoadCache) {
      window
        ._icuLoadCache()
        .then(function () {
          // Re-check user exists after fresh load
          var freshUsers = JSON.parse(
            localStorage.getItem("icu_users") || "[]",
          );
          var freshUser = freshUsers.find(function (u) {
            return String(u.id) === String(session.id);
          });
          if (!freshUser) {
            window.location.href = "index.html";
            return;
          }
          initDashboard();
        })
        .catch(function () {
          // Supabase failed — use whatever is in localStorage
          initDashboard();
        });
    } else {
      initDashboard();
    }
  }
  runWhenReady();
});

/* LINK ACCOUNT MODAL */
(function () {
  const linkBtn = document.getElementById("linkAccountBtn");
  const modal = document.getElementById("linkAccountModal");
  if (!modal) return;

  const step1 = document.getElementById("linkStep1");
  const step2 = document.getElementById("linkStep2");
  const step3 = document.getElementById("trialDepositStep");
  const step4 = document.getElementById("linkOtpStep");
  let generatedOTP = "";

  if (linkBtn) {
    linkBtn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.classList.remove("hidden");
    });
  }

  document.querySelectorAll(".regionBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      step1.classList.add("hidden");
      step2.classList.remove("hidden");
    });
  });

  document.querySelectorAll(".accountTypeBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      step2.classList.add("hidden");
      step3.classList.remove("hidden");
    });
  });

  const sendOtpBtn = document.getElementById("sendTrialOtp");
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", () => {
      const acc = document.getElementById("accountNumber").value;
      const confirm = document.getElementById("confirmAccountNumber").value;
      if (acc !== confirm) {
        alert("Account numbers do not match");
        return;
      }
      generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

      if (window._sendOTP) {
        window
          ._sendOTP(currentUser.email, generatedOTP, currentUser.firstName)
          .then(() => alert("Verification code sent to your email."))
          .catch(() => alert("Error sending code."));
      } else {
        console.log("Link Account OTP:", generatedOTP);
        alert("Verification code sent to your email.");
      }

      step3.classList.add("hidden");
      step4.classList.remove("hidden");
    });
  }

  const verifyOtpBtn = document.getElementById("verifyLinkOtp");
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", () => {
      const input = document.getElementById("linkOtpInput").value;
      if (input === generatedOTP) {
        alert(
          "Trial transaction initiated. It will take 2-3 working days to complete.",
        );
        modal.classList.add("hidden");
      } else {
        alert("Invalid verification code");
      }
    });
  }
})();
