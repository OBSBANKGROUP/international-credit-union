document.addEventListener("DOMContentLoaded", () => {
  /* ================= LOAD USER DATA ================= */
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

  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  const users = getUsers();
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  const hasBusiness = currentUser.accounts && currentUser.accounts.business;
  
  const getAccBalance = (userId, type) => {
    const logs = getLogs();
    let bal = 0;
    logs.forEach(l => {
      if (l.userId === userId && l.amount) {
        if (type && l.targetAccount !== type) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      }
    });
    return bal;
  };

  const businessAccounts = [
    {
      name: hasBusiness ? (currentUser.firstName + " " + currentUser.lastName + " Business") : "nil",
      balance: hasBusiness ? getAccBalance(currentUser.id, "business") : "nil",
      number: hasBusiness ? (currentUser.accountNumber || "ICU-BM-" + currentUser.id) : "---- ----",
    }
  ];

  /* ================= LOAD ACCOUNTS ================= */

  const container = document.getElementById("businessAccounts");

  businessAccounts.forEach((account) => {
    const card = document.createElement("div");
    card.classList.add("account-card");

    card.innerHTML = `
      <h3>${account.name}</h3>
      <div class="account-balance">${typeof account.balance === 'number' ? ("$" + account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })) : account.balance}</div>
      <p>Account • ${account.number}</p>
    `;

    container.appendChild(card);
  });

  /* ================= SWITCH BACK TO PERSONAL ================= */

  const switchBtn = document.getElementById("switchPersonalBtn");

  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }
});
