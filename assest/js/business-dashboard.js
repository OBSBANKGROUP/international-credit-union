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

  /* ================= LOAD TRANSACTIONS ================= */
  const transContainer = document.getElementById("businessTransactions");
  if (transContainer) {
    const allLogs = getLogs();
    const businessLogs = allLogs.filter(l => l.userId === currentUser.id && l.targetAccount === "business");
    const sortedLogs = businessLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    if (sortedLogs.length > 0) {
      transContainer.innerHTML = ""; // Clear "No transactions yet"
      sortedLogs.forEach(l => {
        const isCredit = l.txnType === "credit";
        const amt = (isCredit ? "+" : "-") + "$" + parseFloat(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
        const row = document.createElement("div");
        row.className = "transaction-row" + (isCredit ? " credit" : " debit");
        row.innerHTML = `
          <div class="trans-left">
            <span class="trans-action">${l.action}</span>
            <span class="trans-date">${new Date(l.timestamp).toLocaleDateString()}</span>
          </div>
          <div class="trans-right">
            <span class="trans-amount">${amt}</span>
          </div>
        `;
        transContainer.appendChild(row);
      });
    }
  }

  /* ================= SWITCH BACK TO PERSONAL ================= */


  const switchBtn = document.getElementById("switchPersonalBtn");

  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }
});
