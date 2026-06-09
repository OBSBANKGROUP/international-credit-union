document.addEventListener("DOMContentLoaded", function () {
  /* ── Storage keys ── */
  var SESSION_KEY = "icu_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

  /* ── Load data — always fetch from Supabase ── */
  var session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!session || !session.email) {
    window.location.href = "index.html";
    return;
  }

  var SB_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
  var SB_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
  var SB_H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

  /* Show loading */
  document.body.style.opacity = "0.5";

  /* Fetch user from Supabase by email */
  fetch(
    SB_URL +
      "/rest/v1/users?email=eq." +
      encodeURIComponent(session.email.toLowerCase().trim()) +
      "&select=*",
    { headers: SB_H },
  )
    .then(function (r) {
      return r.json();
    })
    .then(function (rows) {
      if (!rows || !rows[0]) {
        window.location.href = "index.html";
        return;
      }
      var row = rows[0];
      var user = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        accountNumber: row.account_number,
        routingNumber: row.routing_number,
        accountType: row.account_type || "checking",
        accounts: row.accounts || {},
        status: row.status || "active",
        transactionPin: row.transaction_pin,
        businessName: row.business_name,
        profilePic: row.profile_pic,
      };
      if (row.data && typeof row.data === "object")
        Object.assign(user, row.data);

      /* Fetch logs for this user from Supabase */
      return fetch(
        SB_URL +
          "/rest/v1/logs?user_id=eq." +
          row.id +
          "&order=timestamp.desc&select=*",
        { headers: SB_H },
      )
        .then(function (r2) {
          return r2.json();
        })
        .then(function (logRows) {
          var allLogs = Array.isArray(logRows)
            ? logRows.map(function (l) {
                return {
                  id: l.id,
                  userId: l.user_id,
                  action: l.action,
                  details: l.details,
                  amount: l.amount,
                  txnType: l.txn_type,
                  targetAccount: l.target_account,
                  timestamp: l.timestamp,
                  status: l.status,
                  txnId: l.txn_id,
                };
              })
            : [];

          /* Cache locally */
          var cached = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
          var ci = cached.findIndex(function (u) {
            return u.email === user.email;
          });
          if (ci >= 0) cached[ci] = user;
          else cached.push(user);
          localStorage.setItem(USERS_KEY, JSON.stringify(cached));
          localStorage.setItem(LOG_KEY, JSON.stringify(allLogs));

          document.body.style.opacity = "1";
          runPage(user, allLogs);
        });
    })
    .catch(function () {
      /* Fallback to localStorage */
      document.body.style.opacity = "1";
      var users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      var user = users.find(function (u) {
        return (
          (u.email || "").toLowerCase() ===
            (session.email || "").toLowerCase() ||
          String(u.id) === String(session.id)
        );
      });
      if (!user) {
        window.location.href = "index.html";
        return;
      }
      var allLogs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      runPage(user, allLogs);
    });

  function runPage(user, allLogs) {
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
      var mine = allLogs.filter(function (l) {
        return String(l.userId) === String(user.id);
      });
      if (window.icuBalance)
        return window.icuBalance(mine, accountType, primary);
      var b = 0;
      mine.forEach(function (l) {
        if (l.amount == null) return;
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
      return s
        ? s.charAt(0).toUpperCase() + s.slice(1) + " Account"
        : "Account";
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
    accountTypes.forEach(function (t) {
      balances[t] = calcBal(t);
    });
    /* TOTAL via shared module — guaranteed to match every page */
    var myLogs = allLogs.filter(function (l) {
      return String(l.userId) === String(user.id);
    });
    var totalBal = window.icuBalance
      ? window.icuBalance(myLogs, null, primary)
      : (function () {
          var t = 0;
          myLogs.forEach(function (l) {
            if (l.amount == null) return;
            if (l.txnType === "credit") t += parseFloat(l.amount);
            else if (l.txnType === "debit") t -= parseFloat(l.amount);
          });
          return t;
        })();

    /* ── Hero ── */
    el("totalBalance").textContent = fmt(totalBal);
    el("memberName").textContent = user.firstName + " " + user.lastName;

    var heroAccNum = el("heroAccNum");
    var heroRouting = el("heroRouting");
    if (heroAccNum)
      heroAccNum.textContent = user.accountNumber
        ? "\u2022\u2022\u2022\u2022 " + String(user.accountNumber).slice(-4)
        : "N/A";
    if (heroRouting)
      heroRouting.textContent = user.routingNumber || "021000021";

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
        makePill(
          "orange",
          "trending_down",
          "Total Withdrawn",
          fmt(totalDebits),
        ) +
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
  } // end runPage
});
