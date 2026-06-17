document.addEventListener("DOMContentLoaded", function () {
  var SESSION_KEY = "icu_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

  var session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  /* Fetch user + logs fresh from Supabase (single source of truth) */
  var SB_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
  var SB_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
  var SB_H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

  var users = [],
    logs = [],
    user = null;

  if (session.email) {
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
        user = {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          accountNumber: row.account_number,
          routingNumber: row.routing_number,
          accountType: row.account_type || "checking",
          accounts: row.accounts || {},
          status: row.status || "active",
          businessName: row.business_name,
          profilePic: row.profile_pic,
        };
        if (row.data && typeof row.data === "object")
          Object.assign(user, row.data);
        users = [user];

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
            logs = Array.isArray(logRows)
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
            if (window.icuDedupeLogs) logs = window.icuDedupeLogs(logs);
            localStorage.setItem(LOG_KEY, JSON.stringify(logs));
            runBusinessDashboard();
          });
      })
      .catch(function () {
        /* Fallback to localStorage */
        users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
        logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
        user = users.find(function (u) {
          return String(u.id) === String(session.id);
        });
        if (!user) {
          window.location.href = "index.html";
          return;
        }
        logs = logs.filter(function (l) {
          return String(l.userId) === String(user.id);
        });
        runBusinessDashboard();
      });
  } else {
    users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    user = users.find(function (u) {
      return String(u.id) === String(session.id);
    });
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    runBusinessDashboard();
  }

  function fmt(n) {
    return (
      "$" +
      parseFloat(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function runBusinessDashboard() {
    /* ── Find all business account keys for this user ───────────────
     Supports both legacy "business" key and new "business_0", "business_1" etc.
  ──────────────────────────────────────────────────────────────── */
    var accts = user.accounts || {};
    var bizKeys = Object.keys(accts).filter(function (k) {
      var val = accts[k];
      return (
        (k === "business" || k.indexOf("business") === 0) &&
        (val === true || (val && val.enabled !== false))
      );
    });

    // Fallback — if no business accounts in user.accounts, check if any log has business targetAccount
    if (bizKeys.length === 0) {
      logs.forEach(function (l) {
        if (
          String(l.userId) === String(user.id) &&
          l.targetAccount &&
          l.targetAccount.indexOf("business") === 0 &&
          bizKeys.indexOf(l.targetAccount) === -1
        ) {
          bizKeys.push(l.targetAccount);
        }
      });
    }

    // Default to ["business"] if still nothing found
    if (bizKeys.length === 0) bizKeys = ["business"];

    /* ── Get the display name for a business account key ──
     Tries every format: new object, top-level businessName, legacy key name
  ─────────────────────────────────────────────────────── */
    function getBizName(key) {
      // 1. New format: accounts["business_0"] = { name: "Knightsplash LLC" }
      var val = accts[key];
      if (val && typeof val === "object" && val.name && val.name.trim()) {
        return val.name.trim();
      }
      // 2. Top-level businessName saved by admin
      if (user.businessName && user.businessName.trim()) {
        return user.businessName.trim();
      }
      // 3. Legacy format: accounts["business"] = true
      // Check if there's any key with a name
      var allKeys = Object.keys(accts);
      for (var i = 0; i < allKeys.length; i++) {
        var k = allKeys[i];
        var v = accts[k];
        if (
          k.indexOf("business") === 0 &&
          v &&
          typeof v === "object" &&
          v.name &&
          v.name.trim()
        ) {
          return v.name.trim();
        }
      }
      return "Business Account";
    }

    /* ── Use the first (or only) business account for the hero display ── */
    var primaryBizKey = bizKeys[0];
    var primaryBizName = getBizName(primaryBizKey);

    /* ── Calculate balance across ALL business accounts combined ── */
    var now = Date.now();
    var mo30 = 30 * 24 * 60 * 60 * 1000;
    var bal = 0,
      cr30 = 0,
      db30 = 0,
      cnt30 = 0;

    // Filter all logs that belong to any business account key
    var bizLogs = logs.filter(function (l) {
      if (String(l.userId) !== String(user.id) || l.amount == null)
        return false;
      /* Use shared matcher — matches business, business_0, business_1, etc */
      if (window.icuAcctMatches)
        return window.icuAcctMatches(l.targetAccount, "business", "checking");
      var ta = (l.targetAccount || "").toLowerCase();
      return ta.indexOf("business") === 0;
    });
    /* Dedupe so nothing double-counts */
    if (window.icuDedupeLogs) bizLogs = window.icuDedupeLogs(bizLogs);

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

    /* ── Populate hero ── */
    document.getElementById("bizBalance").textContent = fmt(bal);
    document.getElementById("bizBalStat").textContent = fmt(bal);
    document.getElementById("credits30").textContent = fmt(cr30);
    document.getElementById("debits30").textContent = fmt(db30);
    document.getElementById("txnCount").textContent = cnt30;

    // h4 title = "Business Account" stays as is
    var bizNameEl = document.getElementById("bizName");
    if (bizNameEl) bizNameEl.textContent = "Business Account";

    // p below balance = business name from admin + account holder
    var bizMemberEl = document.getElementById("bizMember");
    if (bizMemberEl)
      bizMemberEl.textContent =
        primaryBizName + " \u2014 " + user.firstName + " " + user.lastName;

    // Business ATM card name = the actual business name (uppercase)
    var bizCardNameEl = document.getElementById("bizCardName");
    if (bizCardNameEl)
      bizCardNameEl.textContent = (
        primaryBizName || user.firstName + " " + user.lastName
      ).toUpperCase();

    /* ── If user has multiple business accounts, show a selector ── */
    if (bizKeys.length > 1) {
      var heroText = document.getElementById("bizMember");
      if (heroText) {
        var selector = document.createElement("select");
        selector.style.cssText =
          "margin-top:10px;background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:6px 12px;font-size:.83rem;font-family:'Inter',sans-serif;cursor:pointer;display:block";
        bizKeys.forEach(function (k) {
          var opt = document.createElement("option");
          opt.value = k;
          opt.textContent = getBizName(k);
          selector.appendChild(opt);
        });
        heroText.parentNode.appendChild(selector);

        selector.addEventListener("change", function () {
          var key = selector.value;
          var name = getBizName(key);
          var b = 0,
            c30 = 0,
            d30 = 0,
            n30 = 0;
          logs
            .filter(function (l) {
              return (
                String(l.userId) === String(user.id) &&
                l.amount != null &&
                l.targetAccount === key
              );
            })
            .forEach(function (l) {
              if (l.txnType === "credit") b += parseFloat(l.amount);
              else if (l.txnType === "debit") b -= parseFloat(l.amount);
              var age = now - new Date(l.timestamp).getTime();
              if (age < mo30) {
                n30++;
                if (l.txnType === "credit") c30 += parseFloat(l.amount);
                else d30 += parseFloat(l.amount);
              }
            });
          document.getElementById("bizBalance").textContent = fmt(b);
          if (document.getElementById("bizName"))
            document.getElementById("bizName").textContent = "Business Account";
          if (document.getElementById("bizMember"))
            document.getElementById("bizMember").textContent =
              name + " \u2014 " + user.firstName + " " + user.lastName;
          document.getElementById("bizBalStat").textContent = fmt(b);
          document.getElementById("credits30").textContent = fmt(c30);
          document.getElementById("debits30").textContent = fmt(d30);
          document.getElementById("txnCount").textContent = n30;
          renderTxns(key);
        });
      }
    }

    /* ── Recent transactions ── */
    function renderTxns(filterKey) {
      var filtered = filterKey
        ? bizLogs.filter(function (l) {
            if (window.icuAcctMatches)
              return window.icuAcctMatches(
                l.targetAccount,
                filterKey,
                "checking",
              );
            return l.targetAccount === filterKey;
          })
        : bizLogs;
      var recent = filtered
        .slice()
        .sort(function (a, b) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        })
        .slice(0, 15);

      var box = document.getElementById("bizTxns");
      if (!box) return;
      if (recent.length === 0) {
        box.innerHTML =
          '<p class="empty-txn">No business transactions yet.</p>';
        return;
      }
      box.innerHTML = "";
      recent.forEach(function (l) {
        var isC = l.txnType === "credit";
        var row = document.createElement("div");
        row.className = "txn-row";
        row.innerHTML =
          '<div class="txn-left">' +
          '<div class="txn-dot ' +
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
          (l.details ? l.details + " \u00b7 " : "") +
          new Date(l.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }) +
          "</span>" +
          "</div>" +
          "</div>" +
          '<div class="txn-amt ' +
          (isC ? "cr" : "db") +
          '">' +
          (isC ? "+" : "-") +
          fmt(l.amount) +
          "</div>";
        box.appendChild(row);
      });
    }

    renderTxns(null);
  } // end runBusinessDashboard
});
