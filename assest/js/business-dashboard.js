document.addEventListener("DOMContentLoaded", () => {
  /* ================= DEMO ADMIN DATA ================= */

  const businessAccounts = [
    {
      name: null,
      balance: 0,
      number: null,
    },
    {
      name: null,
      balance: 0,
      number: null,
    },
    {
      name: null,
      balance: 0,
      number: null,
    },
  ];

  /* ================= LOAD ACCOUNTS ================= */

  const container = document.getElementById("businessAccounts");

  businessAccounts.forEach((account) => {
    const card = document.createElement("div");

    card.classList.add("account-card");

    const name = account.name ? account.name : "No Business Account";

    const number = account.number ? account.number : "---- ----";

    const balance =
      "$" +
      account.balance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      });

    card.innerHTML = `

<h3>${name}</h3>

<div class="account-balance">${balance}</div>

<p>Account • ${number}</p>

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
