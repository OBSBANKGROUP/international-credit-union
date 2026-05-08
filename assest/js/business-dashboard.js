document.addEventListener("DOMContentLoaded", function () {
  var SESSION_KEY = "icu_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

  var session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  var users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
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
      parseFloat(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

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
        l.userId === session.id &&
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
    return (
      l.userId === session.id &&
      l.amount != null &&
      bizKeys.indexOf(l.targetAccount || "") !== -1
    );
  });

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
              l.userId === session.id &&
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
          return l.targetAccount === filterKey;
        })
      : bizLogs;
    var recent = filtered
      .slice()
      .sort(function (a, b) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      })
      .slice(0, 6);

    var box = document.getElementById("bizTxns");
    if (!box) return;
    if (recent.length === 0) {
      box.innerHTML = '<p class="empty-txn">No business transactions yet.</p>';
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
});
