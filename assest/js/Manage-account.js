document.addEventListener("DOMContentLoaded", function () {
  /* ── Storage keys ── */
  var SESSION_KEY = "icu_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

  /* ── Load data ── */
  var session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  var users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  var allLogs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");

  if (!session) {
    window.location.href = "index.html";
    return;
  }
  var user = users.find(function (u) {
    return u.id === session.id;
  });
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* ── Helpers ── */
  function fmt(n) {
    return (
      "$" +
      parseFloat(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  function el(id) {
    return document.getElementById(id);
  }

  /* ── Balance per account type ──────────────────────────────
     Falls back: logs with no targetAccount go to the user's
     primary accountType (same fix as wire-transfer.js)
  ─────────────────────────────────────────────────────────── */
  var primary = (user.accountType || "checking").toLowerCase();

  function calcBal(accountType) {
    var b = 0;
    allLogs.forEach(function (l) {
      if (String(l.userId) !== String(session.id) || l.amount == null) return;
      var acct = (l.targetAccount || primary).toLowerCase();
      if (acct !== accountType.toLowerCase()) return;
      if (l.txnType === "credit") b += parseFloat(l.amount);
      else if (l.txnType === "debit") b -= parseFloat(l.amount);
    });
    return b;
  }

  function calcCredits(accountType) {
    var b = 0;
    allLogs.forEach(function (l) {
      if (String(l.userId) !== String(session.id) || l.amount == null) return;
      var acct = (l.targetAccount || primary).toLowerCase();
      if (acct !== accountType.toLowerCase()) return;
      if (l.txnType === "credit") b += parseFloat(l.amount);
    });
    return b;
  }

  function calcDebits(accountType) {
    var b = 0;
    allLogs.forEach(function (l) {
      if (String(l.userId) !== String(session.id) || l.amount == null) return;
      var acct = (l.targetAccount || primary).toLowerCase();
      if (acct !== accountType.toLowerCase()) return;
      if (l.txnType === "debit") b += parseFloat(l.amount);
    });
    return b;
  }

  /* ── Determine which accounts are active ───────────────────
     Supports both old format {checking:true} and new format
     {checking:{enabled:true,name:"Checking"}, business_0:{...}}
     Also discovers accounts from activity logs as fallback
  ─────────────────────────────────────────────────────────── */
  var activeAccounts = {};

  // Method 1: read user.accounts from admin
  if (user.accounts && typeof user.accounts === "object") {
    Object.keys(user.accounts).forEach(function (k) {
      var val = user.accounts[k];
      if (val === true || (val && val.enabled !== false)) {
        activeAccounts[k] = {
          name:
            typeof val === "object" && val.name
              ? val.name
              : capitalise(k.replace(/_\d+$/, "")),
          key: k,
        };
      }
    });
  }

  // Method 2: scan logs for any targetAccount not already found
  allLogs.forEach(function (l) {
    if (
      String(l.userId) === String(session.id) &&
      l.targetAccount &&
      !activeAccounts[l.targetAccount]
    ) {
      activeAccounts[l.targetAccount] = {
        name: capitalise(l.targetAccount.replace(/_\d+$/, "")),
        key: l.targetAccount,
      };
    }
  });

  // Method 3: always include primary account type
  if (primary && !activeAccounts[primary]) {
    activeAccounts[primary] = { name: capitalise(primary), key: primary };
  }

  function capitalise(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) + " Account" : "Account";
  }

  // Sort: checking first, savings second, business_* after
  var accountTypes = Object.keys(activeAccounts).sort(function (a, b) {
    var order = { checking: 0, savings: 1 };
    var oa = order[a] !== undefined ? order[a] : 2;
    var ob = order[b] !== undefined ? order[b] : 2;
    return oa - ob;
  });

  /* ── Balances ── */
  var balances = {};
  var totalBal = 0;
  accountTypes.forEach(function (t) {
    balances[t] = calcBal(t);
    totalBal += balances[t];
  });

  /* ── Hero ── */
  el("totalBalance").textContent = fmt(totalBal);
  el("memberName").textContent = user.firstName + " " + user.lastName;

  var heroAccNum = el("heroAccNum");
  var heroRouting = el("heroRouting");
  if (heroAccNum)
    heroAccNum.textContent = user.accountNumber
      ? "\u2022\u2022\u2022\u2022 " + String(user.accountNumber).slice(-4)
      : "N/A";
  if (heroRouting) heroRouting.textContent = user.routingNumber || "021000021";

  /* ── Summary pills ── */
  var pillsEl = el("accountsPills");
  if (pillsEl) {
    var totalCredits = 0,
      totalDebits = 0;
    accountTypes.forEach(function (t) {
      totalCredits += calcCredits(t);
      totalDebits += calcDebits(t);
    });

    // Accounts linked count
    pillsEl.innerHTML =
      makePill(
        "blue",
        "account_balance",
        "Accounts Linked",
        accountTypes.length +
          " Account" +
          (accountTypes.length !== 1 ? "s" : ""),
      ) +
      makePill("teal", "trending_up", "Total Deposits", fmt(totalCredits)) +
      makePill("orange", "trending_down", "Total Withdrawn", fmt(totalDebits)) +
      makePill(
        "grey",
        "receipt_long",
        "Transactions",
        allLogs.filter(function (l) {
          return String(l.userId) === String(session.id);
        }).length + " Total",
      );
  }

  function makePill(color, icon, label, value) {
    return (
      '<div class="summary-pill">' +
      '<div class="pill-icon ' +
      color +
      '"><span class="material-icons-outlined">' +
      icon +
      "</span></div>" +
      '<div class="pill-text"><span>' +
      label +
      "</span><strong>" +
      value +
      "</strong></div>" +
      "</div>"
    );
  }

  /* ── Account cards ── */
  var CONFIG = {
    checking: { icon: "account_balance", cls: "checking" },
    savings: { icon: "savings", cls: "savings" },
  };
  function getBizCls(key) {
    return "business";
  }
  function getBizIcon() {
    return "business_center";
  }

  var personalEl = el("personalAccounts");
  var businessEl = el("businessAccounts");
  var last4 = user.accountNumber
    ? String(user.accountNumber).slice(-4)
    : "****";
  var routing = user.routingNumber || "021000021";

  if (accountTypes.length === 0) {
    personalEl.innerHTML =
      '<p style="color:#aaa;padding:20px;font-size:.9rem">No accounts linked yet. Contact your admin.</p>';
  }

  accountTypes.forEach(function (type) {
    var acctInfo = activeAccounts[type];
    var label = acctInfo ? acctInfo.name : capitalise(type);
    var isBiz = type !== "checking" && type !== "savings";
    var cfg = !isBiz
      ? CONFIG[type]
      : { icon: getBizIcon(), cls: getBizCls(type) };

    var bal = calcBal(type);
    var cr = calcCredits(type);
    var db = calcDebits(type);
    var txns = allLogs.filter(function (l) {
      return (
        String(l.userId) === String(session.id) &&
        (l.targetAccount || primary) === type
      );
    }).length;

    var card = document.createElement("div");
    card.className = "acc-card " + cfg.cls;
    card.innerHTML =
      '<div class="acc-card-top">' +
      '<div class="acc-card-icon"><span class="material-icons-outlined">' +
      cfg.icon +
      "</span></div>" +
      '<span class="acc-status-badge">Active</span>' +
      "</div>" +
      "<h4>" +
      label +
      "</h4>" +
      '<div class="acc-balance">' +
      fmt(bal) +
      "</div>" +
      '<div class="acc-balance-sub">Available Balance</div>' +
      '<div class="acc-num">\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' +
      last4 +
      "</div>" +
      '<div class="acc-routing">Routing: ' +
      routing +
      "</div>" +
      '<div class="acc-stats">' +
      '<div class="acc-stat"><span>Total In</span><strong class="green">' +
      fmt(cr) +
      "</strong></div>" +
      '<div class="acc-stat"><span>Total Out</span><strong class="red">' +
      fmt(db) +
      "</strong></div>" +
      '<div class="acc-stat"><span>Transactions</span><strong>' +
      txns +
      "</strong></div>" +
      '<div class="acc-stat"><span>Status</span><strong style="color:#2e7d32">Active</strong></div>' +
      "</div>" +
      '<div class="acc-card-actions">' +
      '<a href="transaction.html" class="acc-mini-btn primary">History</a>' +
      '<a href="wire-transfer.html" class="acc-mini-btn success">Transfer</a>' +
      '<a href="deposit-check.html" class="acc-mini-btn neutral">Deposit</a>' +
      "</div>";

    if (isBiz) {
      businessEl.appendChild(card);
    } else {
      personalEl.appendChild(card);
    }
  });

  if (personalEl.children.length === 0) {
    personalEl.innerHTML =
      '<p style="color:#aaa;padding:20px;font-size:.9rem">No personal accounts linked. Contact your admin to add accounts.</p>';
  }
  if (businessEl.children.length === 0) {
    businessEl.innerHTML =
      '<p style="color:#aaa;padding:20px;font-size:.9rem">No business account linked. Contact your admin to add a business account.</p>';
  }

  /* ── Transactions ── */
  var txnFilter = "all";
  var userLogs = allLogs
    .filter(function (l) {
      return String(l.userId) === String(session.id) && l.amount != null;
    })
    .sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  function renderTxns() {
    var filtered =
      txnFilter === "all"
        ? userLogs
        : userLogs.filter(function (l) {
            return (l.targetAccount || primary).toLowerCase() === txnFilter;
          });

    var txnList = el("txnList");
    if (!filtered.length) {
      txnList.innerHTML = '<p class="empty-txn">No transactions found.</p>';
      return;
    }

    txnList.innerHTML = "";
    filtered.slice(0, 10).forEach(function (l) {
      var isC = l.txnType === "credit";
      var acct = l.targetAccount || primary;
      var row = document.createElement("div");
      row.className = "txn-row";
      row.innerHTML =
        '<div class="txn-left">' +
        '<div class="txn-icon-wrap ' +
        (isC ? "cr" : "db") +
        '">' +
        '<span class="material-icons-outlined" style="font-size:.9rem">' +
        (isC ? "arrow_downward" : "arrow_upward") +
        "</span>" +
        "</div>" +
        '<div class="txn-info">' +
        "<strong>" +
        (l.action || "Transaction") +
        "</strong>" +
        "<span>" +
        new Date(l.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }) +
        "</span>" +
        "</div>" +
        "</div>" +
        '<div class="txn-right">' +
        '<div class="txn-amount ' +
        (isC ? "cr" : "db") +
        '">' +
        (isC ? "+" : "-") +
        fmt(l.amount) +
        "</div>" +
        '<span class="txn-acct-tag">' +
        acct.charAt(0).toUpperCase() +
        acct.slice(1) +
        "</span>" +
        "</div>";
      txnList.appendChild(row);
    });
  }

  renderTxns();

  // Filter buttons
  document.querySelectorAll(".txn-filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".txn-filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      txnFilter = btn.dataset.filter;
      renderTxns();
    });
  });
});
