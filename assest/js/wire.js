document.addEventListener("DOMContentLoaded", function () {
  var session = JSON.parse(localStorage.getItem("icu_session") || "null");
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  var logs = JSON.parse(localStorage.getItem("icu_activity_log") || "[]");
  var bal = 0;
  logs
    .filter(function (l) {
      return l.userId === session.id && l.amount;
    })
    .forEach(function (l) {
      if (l.txnType === "credit") bal += parseFloat(l.amount);
      else if (l.txnType === "debit") bal -= parseFloat(l.amount);
    });
  document.getElementById("availBal").textContent =
    "$" +
    Math.max(0, bal).toLocaleString("en-US", { minimumFractionDigits: 2 });
  document
    .getElementById("openAppModal")
    .addEventListener("click", function () {
      document.getElementById("appModal").classList.add("open");
    });
  document.getElementById("closeModal").addEventListener("click", function () {
    document.getElementById("appModal").classList.remove("open");
  });
});
