/* ============================================================
   DASHBOARD.JS — Populates the user dashboard with real data
   from localStorage (icu_users, icu_activity_log, icu_session)
   ============================================================ */
(function () {
  "use strict";

  var SESSION_KEY = "icu_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

  function getSession() {
    var d = localStorage.getItem(SESSION_KEY);
    return d ? JSON.parse(d) : null;
  }
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }
  function getLogs() {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  }

  function formatMoney(n) {
    return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  var session = getSession();
  if (!session) return;

  var users = getUsers();
  var user = users.find(function (u) {
    return u.id === session.id;
  });

  /* ---------- Account Number ---------- */
  var acctEl = document.getElementById("acctNumber");
  if (acctEl && user) {
    acctEl.textContent = "ICU-" + ("00000000" + user.id).slice(-8);
  }

  /* ---------- Balance from transaction history ---------- */
  var logs = getLogs();
  var userTxns = logs.filter(function (l) {
    return l.userId === session.id && l.amount;
  });

  var totalBalance = 0;
  userTxns.forEach(function (t) {
    if (t.txnType === "credit") totalBalance += t.amount;
    else if (t.txnType === "debit") totalBalance -= t.amount;
  });

  var balEl = document.getElementById("totalBalance");
  if (balEl) balEl.textContent = formatMoney(totalBalance);

  /* ---------- Account type balances ---------- */
  var acctType =
    user && user.accountType ? user.accountType.toLowerCase() : "checking";
  var checkEl = document.getElementById("checkingBal");
  var saveEl = document.getElementById("savingsBal");
  var cdEl = document.getElementById("cdBal");

  if (checkEl)
    checkEl.textContent =
      acctType === "checking" ? formatMoney(totalBalance) : "$0.00";
  if (saveEl)
    saveEl.textContent =
      acctType === "savings" ? formatMoney(totalBalance) : "$0.00";
  if (cdEl) cdEl.textContent = "$0.00";

  /* ---------- Transaction List ---------- */
  var txnList = document.getElementById("txnList");
  var txnEmpty = document.getElementById("txnEmptyBox");

  if (txnList) {
    if (userTxns.length === 0) {
      txnList.style.display = "none";
      if (txnEmpty) txnEmpty.style.display = "block";
    } else {
      if (txnEmpty) txnEmpty.style.display = "none";
      txnList.style.display = "block";

      // Show most recent first, limit to 10
      var recent = userTxns.slice().reverse().slice(0, 10);
      txnList.innerHTML = recent
        .map(function (t) {
          var isCredit = t.txnType === "credit";
          var sign = isCredit ? "+" : "-";
          var cls = isCredit ? "txn-credit" : "txn-debit";
          var icon = isCredit ? "arrow_downward" : "arrow_upward";
          var iconCls = isCredit ? "txn-icon-credit" : "txn-icon-debit";
          return (
            '<div class="txn-row">' +
            '<div class="txn-left">' +
            '<div class="txn-icon ' +
            iconCls +
            '"><span class="material-icons-outlined">' +
            icon +
            "</span></div>" +
            '<div class="txn-info">' +
            "<strong>" +
            escHtml(t.details || t.action) +
            "</strong>" +
            "<span>" +
            formatDate(t.timestamp) +
            "</span>" +
            "</div>" +
            "</div>" +
            '<div class="txn-amount ' +
            cls +
            '">' +
            sign +
            formatMoney(t.amount) +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    }
  }

  /* "View All" toggle to show all transactions */
  var viewAllBtn = document.getElementById("viewAllTxns");
  var showingAll = false;
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showingAll = !showingAll;
      if (showingAll) {
        viewAllBtn.textContent = "Show Less";
        renderTxns(userTxns.slice().reverse());
      } else {
        viewAllBtn.textContent = "View All";
        renderTxns(userTxns.slice().reverse().slice(0, 10));
      }
    });
  }

  function renderTxns(list) {
    if (!txnList) return;
    txnList.innerHTML = list
      .map(function (t) {
        var isCredit = t.txnType === "credit";
        var sign = isCredit ? "+" : "-";
        var cls = isCredit ? "txn-credit" : "txn-debit";
        var icon = isCredit ? "arrow_downward" : "arrow_upward";
        var iconCls = isCredit ? "txn-icon-credit" : "txn-icon-debit";
        return (
          '<div class="txn-row">' +
          '<div class="txn-left">' +
          '<div class="txn-icon ' +
          iconCls +
          '"><span class="material-icons-outlined">' +
          icon +
          "</span></div>" +
          '<div class="txn-info">' +
          "<strong>" +
          escHtml(t.details || t.action) +
          "</strong>" +
          "<span>" +
          formatDate(t.timestamp) +
          "</span>" +
          "</div>" +
          "</div>" +
          '<div class="txn-amount ' +
          cls +
          '">' +
          sign +
          formatMoney(t.amount) +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function escHtml(s) {
    var el = document.createElement("span");
    el.textContent = s;
    return el.innerHTML;
  }

  /* ---------- Profile button ---------- */
  var profBtn = document.getElementById("profileBtn");
  if (profBtn) {
    profBtn.addEventListener("click", function () {
      window.location.href = "profile.html";
    });
  }

  /* ---------- Business switch ---------- */
  var switchBtn = document.getElementById("switchBtn");
  if (switchBtn) {
    switchBtn.addEventListener("click", function () {
      window.location.href = "business-dashboard.html";
    });
  }
})();
