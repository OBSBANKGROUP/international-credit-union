document.addEventListener("DOMContentLoaded", function () {
  var session = JSON.parse(localStorage.getItem("icu_session") || "null");
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
  var logs = JSON.parse(localStorage.getItem("icu_activity_log") || "[]");
  var user = users.find(function (u) {
    return u.id === session.id;
  });
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  function fmt(n) {
    return (
      "$" +
      parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })
    );
  }
  var now = Date.now(),
    mo30 = 30 * 24 * 60 * 60 * 1000;
  var bizLogs = logs.filter(function (l) {
    return (
      l.userId === session.id && l.amount && l.targetAccount === "business"
    );
  });
  var bal = 0,
    cr30 = 0,
    db30 = 0,
    cnt30 = 0;
  bizLogs.forEach(function (l) {
    if (l.txnType === "credit") bal += parseFloat(l.amount);
    else if (l.txnType === "debit") bal -= parseFloat(l.amount);
    var age = now - new Date(l.timestamp).getTime();
    if (age < mo30) {
      cnt30++;
      if (l.txnType === "credit") cr30 += parseFloat(l.amount);
      else db30 += parseFloat(l.amount);
    }
  });
  document.getElementById("bizBalance").textContent = fmt(bal);
  document.getElementById("bizMember").textContent =
    user.firstName + " " + user.lastName + " — Business Account";
  document.getElementById("bizBalStat").textContent = fmt(bal);
  document.getElementById("credits30").textContent = fmt(cr30);
  document.getElementById("debits30").textContent = fmt(db30);
  document.getElementById("txnCount").textContent = cnt30;

  var recent = bizLogs
    .sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    })
    .slice(0, 6);
  if (recent.length > 0) {
    var box = document.getElementById("bizTxns");
    box.innerHTML = "";
    recent.forEach(function (l) {
      var isC = l.txnType === "credit";
      var row = document.createElement("div");
      row.className = "txn-row";
      row.innerHTML =
        '<div class="txn-left"><div class="txn-dot ' +
        (isC ? "cr" : "db") +
        '"><span class="material-icons-outlined" style="font-size:.9rem">' +
        (isC ? "arrow_downward" : "arrow_upward") +
        "</span></div>" +
        '<div class="txn-info"><strong>' +
        l.action +
        "</strong><span>" +
        new Date(l.timestamp).toLocaleDateString() +
        "</span></div></div>" +
        '<div class="txn-amt ' +
        (isC ? "cr" : "db") +
        '">' +
        (isC ? "+" : "-") +
        fmt(l.amount) +
        "</div>";
      box.appendChild(row);
    });
  }
});
