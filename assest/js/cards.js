document.addEventListener("DOMContentLoaded", () => {
  /* ADMIN DATA (LATER FROM ADMIN PANEL) */

  const cardData = {
    card1Balance: 0,

    card2Balance: 0,
  };

  /* DISPLAY BALANCE */

  document.getElementById("card1Balance").innerText =
    "$" + cardData.card1Balance.toFixed(2);

  document.getElementById("card2Balance").innerText =
    "$" + cardData.card2Balance.toFixed(2);
});
