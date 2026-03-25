document.addEventListener("DOMContentLoaded", () => {
  const historyList = document.getElementById("historyList");
  const emptyMsg = document.getElementById("emptyMsg");

  /* ================= LOAD DATA ================= */

  // From wire transfer (local)
  const localHistory =
    JSON.parse(localStorage.getItem("transactionHistory")) || [];

  // From admin (future backend)
  const adminHistory =
    JSON.parse(localStorage.getItem("adminTransactions")) || [];

  // Combine (admin first later)
  const allHistory = [...localHistory, ...adminHistory];

  // Limit to 28
  const recent = allHistory.slice(0, 28);

  /* ================= DISPLAY ================= */

  if (recent.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }

  recent.forEach((tx) => {
    const card = document.createElement("div");
    card.className = "history-card";

    card.innerHTML = `

      <div class="history-left">

        <h3>${tx.name}</h3>

        <p>${tx.bank}</p>

        <p>From: ${tx.from}</p>

      </div>


      <div class="history-right">

        <div class="history-amount sent">
          -$${tx.amount}
        </div>

        <div class="history-date">
          ${tx.date}
        </div>

      </div>

    `;

    historyList.appendChild(card);
  });
});

/* ================= BUTTONS ================= */

function goBack() {
  window.history.back();
}

function printPage() {
  window.print();
}
