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
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  const allLogs = getLogs();
  const userLogs = allLogs.filter(l => l.userId === session.id && l.amount).reverse();

  /* ================= DISPLAY ================= */
  if (userLogs.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  userLogs.forEach((tx) => {
    const card = document.createElement("div");
    card.className = "history-card";
    
    const isCredit = tx.txnType === "credit";
    const sign = isCredit ? "+" : "-";
    const amountClass = isCredit ? "received" : "sent";

    card.innerHTML = `
      <div class="history-left">
        <h3>${tx.action}</h3>
        <p>${tx.details || "Transaction"}</p>
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
});

/* ================= BUTTONS ================= */

function goBack() {
  window.history.back();
}

function printPage() {
  window.print();
}
