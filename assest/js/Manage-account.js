document.addEventListener("DOMContentLoaded", () => {
  /* ================= DEMO DATA (ADMIN LATER) ================= */

  const personalAccounts = [
    {
      name: "Checking Account",
      balance: 0,
      number: "****2841",
    },
    {
      name: "Savings Account",
      balance: 0,
      number: "****8892",
    },
  ];

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

  /* ================= LOAD PERSONAL ACCOUNTS ================= */

  const personalContainer = document.getElementById("personalAccounts");

  personalAccounts.forEach((acc) => {
    const card = document.createElement("div");

    card.classList.add("account-card");

    card.innerHTML = `
<div class="account-name">${acc.name}</div>
<div class="account-balance">$${acc.balance.toFixed(2)}</div>
<p>Account • ${acc.number}</p>
`;

    personalContainer.appendChild(card);
  });

  /* ================= LOAD BUSINESS ACCOUNTS ================= */

  const businessContainer = document.getElementById("businessAccounts");

  businessAccounts.forEach((acc) => {
    const name = acc.name ? acc.name : "No Business Account";

    const number = acc.number ? acc.number : "---- ----";

    const card = document.createElement("div");

    card.classList.add("account-card");

    card.innerHTML = `
<div class="account-name">${name}</div>
<div class="account-balance">$${acc.balance.toFixed(2)}</div>
<p>Account • ${number}</p>
`;

    businessContainer.appendChild(card);
  });

  /* ================= TOTAL BALANCE ================= */

  let total = 0;

  personalAccounts.forEach((acc) => {
    total += acc.balance;
  });

  businessAccounts.forEach((acc) => {
    total += acc.balance;
  });

  document.getElementById("totalBalance").innerText =
    "$" +
    total.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    });
});
