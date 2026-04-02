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
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
    return;
  }

  // Update Profile Name and Picture
  const usernameEls = document.querySelectorAll(".username");
  usernameEls.forEach(el => {
    el.textContent = currentUser.firstName + " " + currentUser.lastName;
  });

  const profilePicEl = document.getElementById("profileBtn");
  if (profilePicEl && currentUser.profilePic) {
    profilePicEl.src = currentUser.profilePic;
  }

  /* ================= CALCULATE BALANCE ================= */
  const logs = getLogs();
  
  function getAccBalance(userId, type) {
    let bal = 0;
    logs.forEach(l => {
      if (l.userId === userId && l.amount) {
        if (type && l.targetAccount !== type) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      }
    });
    return bal;
  }

  const totalBalance = getAccBalance(currentUser.id);
  const checkingBalance = getAccBalance(currentUser.id, "checking");
  const savingsBalance = getAccBalance(currentUser.id, "savings");

  // Update Balance Labels
  document.querySelectorAll(".balance").forEach(el => {
    el.textContent = formatCurrency(totalBalance);
  });
  
  const mainBalanceH1 = document.querySelector(".balance-card h1");
  if (mainBalanceH1) mainBalanceH1.textContent = formatCurrency(totalBalance);

  // Update Account Boxes
  const accountBoxes = document.querySelectorAll(".account-grid .account-box p");
  if (accountBoxes.length >= 4) {
    accountBoxes[0].textContent = formatCurrency(checkingBalance);
    accountBoxes[1].textContent = formatCurrency(savingsBalance);
    accountBoxes[2].textContent = formatCurrency(0); // CD
    accountBoxes[3].textContent = currentUser.accountNumber || "— — — —";
  }

  /* ================= NOTIFICATIONS ================= */
  const notifyBar = document.getElementById("notifyBar");
  function updateNotifyBar() {
    const notifications = JSON.parse(localStorage.getItem("icu_notifications") || "[]");
    const unread = notifications.filter(n => n.unread);
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
    const userLogs = allLogs.filter(l => l.userId === currentUser.id && l.amount);
    const recentLogs = userLogs.slice(-5).reverse();
    
    if (recentLogs.length > 0) {
      transSection.innerHTML = `
        <div class="section-header">
          <h3>Recent Activity</h3>
          <a href="transaction.html">View All</a>
        </div>
        <div class="txn-list"></div>
      `;
      
      const listContainer = transSection.querySelector(".txn-list");
      recentLogs.forEach(l => {
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
              <span>${new Date(l.timestamp).toLocaleDateString()}</span>
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
  const goToBusiness = () => window.location.href = "bussiness-dashboard.html";
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
  const darkToggle = document.getElementById("darkToggle");
  if (darkToggle) {
    darkToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode");
    });
  }
});

/* LINK ACCOUNT MODAL */
(function() {
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
            window._sendOTP(currentUser.email, generatedOTP, currentUser.firstName)
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
        alert("Trial transaction initiated. It will take 2-3 working days to complete.");
        modal.classList.add("hidden");
      } else {
        alert("Invalid verification code");
      }
    });
  }
})();
