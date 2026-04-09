document.addEventListener("DOMContentLoaded", () => {
  const historyList = document.getElementById("historyList");
  const emptyMsg = document.getElementById("emptyMsg");

  /* ================= DATA HELPERS ================= */
  const SESSION_KEY = "icu_session";
  const LOG_KEY = "icu_activity_log";

  function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  function getLogs() {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  }

  function formatNum(n) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ================= LOAD DATA ================= */
  const typeFilter = document.getElementById("typeFilter");
  const historySubtitle = document.getElementById("historySubtitle");

  function renderHistory() {
    const session = getSession();
    if (!session) {
      window.location.href = "index.html";
      return;
    }

    const allLogs = getLogs();
    const filterType = typeFilter.value;
    
    // Filter by User. If filterType is not 'all', also filter by targetAccount.
    let userLogs = allLogs.filter(l => l.userId === session.id && l.amount);
    
    if (filterType !== "all") {
      userLogs = userLogs.filter(l => l.targetAccount === filterType);
    }

    // Sort Newest First
    userLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    /* ================= DISPLAY ================= */
    if (historyList) historyList.innerHTML = "";

    if (userLogs.length === 0) {
      if (emptyMsg) emptyMsg.style.display = "block";
      if (historySubtitle) historySubtitle.textContent = "No activity found for this account.";
      return;
    }
    if (emptyMsg) emptyMsg.style.display = "none";
    if (historySubtitle) historySubtitle.textContent = `Showing ${userLogs.length} activity entries`;

    userLogs.forEach((tx) => {
      const card = document.createElement("div");
      card.className = "history-card";
      
      const isCredit = tx.txnType === "credit";
      const sign = isCredit ? "+" : "-";
      const amountClass = isCredit ? "received" : "sent";

      card.innerHTML = `
        <div class="history-left">
          <h3>${tx.action} ${tx.targetAccount ? '<span class="acct-tag">(' + tx.targetAccount + ")</span>" : ""}</h3>
          <p>${tx.details || "Transaction"}</p>
          ${tx.reason ? `<p class="tx-reason"><strong>Reason:</strong> ${tx.reason}</p>` : ""}
          <p>Ref: #${tx.id}</p>
        </div>
        <div class="history-right">
          <div class="history-amount ${amountClass}">
            ${sign}$${formatNum(tx.amount)}
          </div>
          <div class="history-date">
            ${new Date(tx.timestamp).toLocaleDateString()}
          </div>
        </div>
      `;

      if (historyList) historyList.appendChild(card);
    });
  }

  if (typeFilter) {
    typeFilter.addEventListener("change", renderHistory);
  }

  // Initial render
  renderHistory();
});

/* ================= BUTTONS ================= */

function goBack() {
  window.history.back();
}

function printPage() {
  window.print();
}
