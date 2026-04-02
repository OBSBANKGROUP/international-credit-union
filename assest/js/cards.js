document.addEventListener("DOMContentLoaded", () => {
  /* ================= LOAD USER DATA ================= */
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";

  function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
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

  const userData = {
    photo: currentUser.profilePic || "assest/images/profile.png",
    fullName: currentUser.firstName + " " + currentUser.lastName,
    accountId: "ICU" + currentUser.id,
    dob: currentUser.dob || "—",
    ssn: currentUser.ssn || "•••-••-••••",
    phone: currentUser.phone || "—",
    email: currentUser.email,
    address: currentUser.address || "—",
    accountNumber: currentUser.accountNumber || "— — — —",
    routingNumber: "021000021", // Static for now as requested
  };

  const cardData = {
    card1Balance: currentUser.card1Balance || 0,
    card2Balance: currentUser.card2Balance || 0,
  };

  /* DISPLAY BALANCE */

  document.getElementById("card1Balance").innerText =
    "$" + cardData.card1Balance.toLocaleString(undefined, { minimumFractionDigits: 2 });

  document.getElementById("card2Balance").innerText =
    "$" + cardData.card2Balance.toLocaleString(undefined, { minimumFractionDigits: 2 });
});
