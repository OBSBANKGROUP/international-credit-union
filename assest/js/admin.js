/* ============================================================
   ADMIN.JS — Full admin dashboard with real data & all tabs
   Reads from localStorage: icu_users, icu_activity_log
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Constants ---------- */
  var ADMIN_SESSION = "icu_admin_session";
  var USERS_KEY = "icu_users";
  var LOG_KEY = "icu_activity_log";

  /* ═══════════════════════════════════════════════════════
     ACCOUNT MANAGER HELPERS
     Supports: checking, savings, multiple business accounts
     Business accounts stored as: accounts["business_0"], accounts["business_1"] etc.
     Each entry: { enabled: true, name: "My Biz LLC" }
  ═══════════════════════════════════════════════════════ */

  var editBizCount = 0;
  var addBizCount = 0;

  /* ---- Toggle name field visibility when checkbox changes ---- */
  function wireToggle(chkId, wrapId) {
    var chk = document.getElementById(chkId);
    var wrap = document.getElementById(wrapId);
    if (!chk || !wrap) return;
    wrap.style.display = chk.checked ? "block" : "none";
    chk.closest(".acct-row") &&
      chk.closest(".acct-row").classList.toggle("enabled", chk.checked);
    chk.addEventListener("change", function () {
      wrap.style.display = chk.checked ? "block" : "none";
      chk.closest(".acct-row") &&
        chk.closest(".acct-row").classList.toggle("enabled", chk.checked);
    });
  }
  wireToggle("addChk_checking", "addNameWrap_checking");
  wireToggle("addChk_savings", "addNameWrap_savings");
  wireToggle("editChk_checking", "editNameWrap_checking");
  wireToggle("editChk_savings", "editNameWrap_savings");

  /* ---- Add a business account row ---- */
  function addBizRow(listId, prefix, idx, name, deposit) {
    var list = document.getElementById(listId);
    if (!list) return;
    var div = document.createElement("div");
    div.className = "biz-acct-row";
    div.id = prefix + "BizRow_" + idx;
    div.innerHTML =
      '<div class="biz-row-top">' +
      '<span class="biz-title"><span class="material-icons-outlined" style="font-size:.95rem">business_center</span> Business Account ' +
      (idx + 1) +
      "</span>" +
      '<button type="button" class="biz-remove-btn" onclick="removeBizRow(\'' +
      listId +
      "', '" +
      prefix +
      "BizRow_" +
      idx +
      "')\">Remove</button>" +
      "</div>" +
      '<input type="text" id="' +
      prefix +
      "BizName_" +
      idx +
      '" placeholder="Business name e.g. Knightsplash LLC" value="' +
      (name || "") +
      '" style="margin-bottom:8px"/>' +
      '<input type="number" id="' +
      prefix +
      "BizDeposit_" +
      idx +
      '" placeholder="Initial deposit for this account ($)" value="' +
      (deposit || "") +
      '" min="0" step="0.01"/>';
    list.appendChild(div);
  }

  function removeBizRow(listId, rowId) {
    var row = document.getElementById(rowId);
    if (row) row.remove();
  }

  /* ---- Add Business button handlers ---- */
  var addBizBtn = document.getElementById("addAddBizBtn");
  if (addBizBtn) {
    addBizBtn.addEventListener("click", function () {
      addBizRow("addBusinessList", "add", addBizCount, "", "");
      addBizCount++;
    });
  }
  var editBizBtn = document.getElementById("editAddBizBtn");
  if (editBizBtn) {
    editBizBtn.addEventListener("click", function () {
      addBizRow("editBusinessList", "edit", editBizCount, "", "");
      editBizCount++;
    });
  }

  /* ---- Collect accounts from Add form ---- */
  function collectAddAccounts() {
    var accounts = {};
    var logs_to_add = [];

    // Checking
    if (
      document.getElementById("addChk_checking") &&
      document.getElementById("addChk_checking").checked
    ) {
      var name =
        (document.getElementById("addAcctName_checking") &&
          document.getElementById("addAcctName_checking").value.trim()) ||
        "Checking Account";
      accounts.checking = { enabled: true, name: name };
    }
    // Savings
    if (
      document.getElementById("addChk_savings") &&
      document.getElementById("addChk_savings").checked
    ) {
      var name =
        (document.getElementById("addAcctName_savings") &&
          document.getElementById("addAcctName_savings").value.trim()) ||
        "Savings Account";
      accounts.savings = { enabled: true, name: name };
    }
    // Business accounts
    var bizList = document.getElementById("addBusinessList");
    if (bizList) {
      var rows = bizList.querySelectorAll(".biz-acct-row");
      rows.forEach(function (row, i) {
        var nameEl = row.querySelector("input[type=text]");
        var depositEl = row.querySelector("input[type=number]");
        var bizName = nameEl ? nameEl.value.trim() : "";
        var bizDep = depositEl ? parseFloat(depositEl.value) || 0 : 0;
        accounts["business_" + i] = {
          enabled: true,
          name: bizName || "Business Account " + (i + 1),
          deposit: bizDep,
        };
      });
    }
    return accounts;
  }

  /* ---- Collect accounts from Edit form ---- */
  function collectEditAccounts() {
    var accounts = {};
    if (
      document.getElementById("editChk_checking") &&
      document.getElementById("editChk_checking").checked
    ) {
      var name =
        (document.getElementById("editAcctName_checking") &&
          document.getElementById("editAcctName_checking").value.trim()) ||
        "Checking Account";
      accounts.checking = { enabled: true, name: name };
    }
    if (
      document.getElementById("editChk_savings") &&
      document.getElementById("editChk_savings").checked
    ) {
      var name =
        (document.getElementById("editAcctName_savings") &&
          document.getElementById("editAcctName_savings").value.trim()) ||
        "Savings Account";
      accounts.savings = { enabled: true, name: name };
    }
    var bizList = document.getElementById("editBusinessList");
    if (bizList) {
      var rows = bizList.querySelectorAll(".biz-acct-row");
      rows.forEach(function (row, i) {
        var nameEl = row.querySelector("input[type=text]");
        var depositEl = row.querySelector("input[type=number]");
        var bizName = nameEl ? nameEl.value.trim() : "";
        var bizDep = depositEl ? parseFloat(depositEl.value) || 0 : 0;
        accounts["business_" + i] = {
          enabled: true,
          name: bizName || "Business Account " + (i + 1),
          deposit: bizDep,
        };
      });
    }
    return accounts;
  }

  /* ---- Load user accounts into Edit modal ---- */
  function loadEditAccounts(user) {
    // Reset biz counter and list
    editBizCount = 0;
    var bizList = document.getElementById("editBusinessList");
    if (bizList) bizList.innerHTML = "";

    var accts = user.accounts || {};

    // Checking
    var chkEl = document.getElementById("editChk_checking");
    var nameEl = document.getElementById("editAcctName_checking");
    var wrapEl = document.getElementById("editNameWrap_checking");
    if (chkEl) {
      var hasCk = !!(
        accts.checking ||
        (typeof accts.checking === "object" && accts.checking)
      );
      chkEl.checked = hasCk;
      if (nameEl && typeof accts.checking === "object")
        nameEl.value = accts.checking.name || "Checking Account";
      if (wrapEl) wrapEl.style.display = hasCk ? "block" : "none";
      if (chkEl.closest(".acct-row"))
        chkEl.closest(".acct-row").classList.toggle("enabled", hasCk);
    }

    // Savings
    var savEl = document.getElementById("editChk_savings");
    var savName = document.getElementById("editAcctName_savings");
    var savWrap = document.getElementById("editNameWrap_savings");
    if (savEl) {
      var hasSv = !!accts.savings;
      savEl.checked = hasSv;
      if (savName && typeof accts.savings === "object")
        savName.value = accts.savings.name || "Savings Account";
      if (savWrap) savWrap.style.display = hasSv ? "block" : "none";
      if (savEl.closest(".acct-row"))
        savEl.closest(".acct-row").classList.toggle("enabled", hasSv);
    }

    // Business accounts
    Object.keys(accts).forEach(function (key) {
      if (key === "checking" || key === "savings") return;
      if (!accts[key]) return;
      var name =
        typeof accts[key] === "object"
          ? accts[key].name
          : key === "business"
            ? "Business Account"
            : key;
      var dep = typeof accts[key] === "object" ? accts[key].deposit || 0 : 0;
      addBizRow(
        "editBusinessList",
        "edit",
        editBizCount,
        name,
        dep > 0 ? dep : "",
      );
      editBizCount++;
    });

    // Legacy: if accounts had {business: true}, load it as one biz account
    if (accts.business === true && editBizCount === 0) {
      addBizRow(
        "editBusinessList",
        "edit",
        editBizCount,
        user.businessName || "Business Account",
        "",
      );
      editBizCount++;
    }
  }

  /* ---------- Auth Guard ---------- */
  if (!localStorage.getItem(ADMIN_SESSION)) {
    window.location.href = "admin-login.html";
    return;
  }

  /* ---------- Data Helpers ---------- */
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }
  function saveUsers(u) {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  }
  function getLogs() {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  }
  function saveLogs(l) {
    localStorage.setItem(LOG_KEY, JSON.stringify(l));
  }

  /* Save a single new log entry to Supabase */
  /* Always fetches the real Supabase user_id fresh by email to avoid ID mismatch */
  function saveLogToSupabase(log) {
    var SUPABASE_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
    var SUPABASE_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
    var HEADERS = {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };

    /* Step 1: find the local user to get their email */
    var users = getUsers();
    var user = users.find(function (u) {
      return String(u.id) === String(log.userId);
    });
    if (!user || !user.email) {
      console.warn("saveLogToSupabase: user not found for id", log.userId);
      return;
    }

    /* Step 2: look up the REAL Supabase numeric id by email (always fresh) */
    fetch(
      SUPABASE_URL +
        "/rest/v1/users?email=eq." +
        encodeURIComponent(user.email.toLowerCase().trim()) +
        "&select=id",
      {
        headers: HEADERS,
      },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) {
          console.warn(
            "saveLogToSupabase: user not found in Supabase for email",
            user.email,
          );
          return;
        }
        var realSupabaseId =
          rows[0].id; /* This is guaranteed to be the correct Supabase ID */

        var row = {
          user_id: realSupabaseId /* ← always the real Supabase ID */,
          user_name: log.userName || "",
          action: log.action || "",
          details: log.details || "",
          reason: log.reason || "",
          amount: parseFloat(log.amount) || 0,
          txn_type: log.txnType || "credit",
          target_account: log.targetAccount || null,
          timestamp: log.timestamp || new Date().toISOString(),
          status: log.status || "completed",
          txn_id: log.txnId || String(Date.now()),
        };

        console.log(
          "Saving log to Supabase:",
          row.action,
          "for user_id:",
          realSupabaseId,
          "(email:",
          user.email + ")",
        );

        return fetch(SUPABASE_URL + "/rest/v1/logs", {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify(row),
        });
      })
      .then(function (res) {
        if (res && !res.ok)
          res.text().then(function (t) {
            console.warn("Supabase log error:", t);
          });
        else console.log("Log saved to Supabase:", log.action);
      })
      .catch(function (e) {
        console.warn("Supabase log save failed:", e);
      });
  }

  function formatNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    var m = [
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
    return d.getDate() + " " + m[d.getMonth()] + " " + d.getFullYear();
  }
  function formatDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    var m = [
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
    var h = d.getHours();
    var min = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return (
      d.getDate() +
      " " +
      m[d.getMonth()] +
      " " +
      d.getFullYear() +
      ", " +
      h +
      ":" +
      (min < 10 ? "0" : "") +
      min +
      " " +
      ampm
    );
  }
  function esc(s) {
    var e = document.createElement("span");
    e.textContent = s;
    return e.innerHTML;
  }
  function initials(u) {
    return ((u.firstName || "")[0] || "") + ((u.lastName || "")[0] || "");
  }
  /* Generate a realistic 10-digit account number
     Format: 2-digit branch prefix + 8-digit unique number
     e.g. 4800012847, 4800019253  */
  function genAcctNum(id) {
    var seed = parseInt(id) || 1001;
    var branch = "48"; /* ICU branch code */
    var unique = String((seed * 9973 + 31337) % 100000000).padStart(8, "0");
    return branch + unique;
  }

  /* Generate a real-format ABA routing number
     Format: 9 digits — first 4 = Federal Reserve routing symbol,
     next 4 = institution identifier, last 1 = check digit
     We use a fixed real-looking prefix for ICU */
  function genRoutingNum() {
    return "091000022"; /* Fixed ICU routing number — looks like a real ABA */
  }

  /* ---------- Initialization ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (window._initThemeToggle) {
      window._initThemeToggle("darkToggle");
    }
  });

  /* ---------- Balance Calculator ---------- */
  function getUserBalance(userId, accountType) {
    var logs = getLogs();
    var balance = 0;
    // Get user's primary account type for fallback
    var allUsers = getUsers();
    var thisUser = allUsers.find(function (u) {
      return u.id === userId;
    });
    var userPrimary = thisUser
      ? (thisUser.accountType || "checking").toLowerCase()
      : "checking";

    logs.forEach(function (l) {
      if (l.userId === userId && l.amount) {
        // Use explicit targetAccount if set; else fall back to user primary
        var acct = l.targetAccount
          ? l.targetAccount.toLowerCase()
          : userPrimary;
        if (accountType && acct !== accountType.toLowerCase()) return;
        if (l.txnType === "credit") balance += parseFloat(l.amount);
        else if (l.txnType === "debit") balance -= parseFloat(l.amount);
      }
    });
    return balance;
  }

  function getUserTxns(userId, accountType) {
    var logs = getLogs();
    var allUsers = getUsers();
    var thisUser = allUsers.find(function (u) {
      return u.id === userId;
    });
    var userPrimary = thisUser
      ? (thisUser.accountType || "checking").toLowerCase()
      : "checking";
    return logs.filter(function (l) {
      if (l.userId !== userId || !l.amount) return false;
      var acct = l.targetAccount ? l.targetAccount.toLowerCase() : userPrimary;
      if (accountType && acct !== accountType.toLowerCase()) return false;
      return true;
    });
  }

  /* ── Admin debug helper (console only) ──
     In browser console type: _icuDebugUser("email@example.com")
     Shows stored email + password so you can verify they match ── */
  window._icuDebugUser = function (email) {
    var users = getUsers();
    var u = users.find(function (x) {
      return (
        (x.email || "").toLowerCase().trim() ===
        (email || "").toLowerCase().trim()
      );
    });
    if (!u) {
      console.log("No user found with email:", email);
      return;
    }
    console.log("=== ICU USER DEBUG ===");
    console.log("Email stored:   [" + u.email + "]");
    console.log("Password stored:[" + u.password + "]");
    console.log("Status:         ", u.status);
    console.log("ID:             ", u.id);
    console.log("Account type:   ", u.accountType);
    console.log("=====================");
    console.log("To login use email exactly as stored above.");
  };

  /* ---------- Logout ---------- */
  document
    .getElementById("adminLogout")
    .addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem(ADMIN_SESSION);
      window.location.href = "admin-login.html";
    });

  /* ==========================================================
     TAB / PAGE SWITCHING
     ========================================================== */
  var navLinks = document.querySelectorAll(".nav-link[data-page]");
  var pages = document.querySelectorAll(".page-section");

  function switchPage(name) {
    pages.forEach(function (p) {
      p.classList.remove("active");
    });
    navLinks.forEach(function (l) {
      l.classList.remove("active");
    });
    var target = document.getElementById("page-" + name);
    if (target) target.classList.add("active");
    var link = document.querySelector('.nav-link[data-page="' + name + '"]');
    if (link) link.classList.add("active");
    // refresh data for the page
    if (pageRenderers[name]) pageRenderers[name]();
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      switchPage(this.getAttribute("data-page"));
    });
  });

  // "View All" links that go to another tab
  document.querySelectorAll("[data-goto]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      switchPage(this.getAttribute("data-goto"));
    });
  });

  /* Sidebar toggle */
  var toggleBtn = document.getElementById("sidebarToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      document.getElementById("sidebar").classList.toggle("collapsed");
    });
  }

  /* ==========================================================
     PAGE RENDERERS — each tab has a function
     ========================================================== */
  var pageRenderers = {};

  /* ----------------------------------------------------------
     DASHBOARD
     ---------------------------------------------------------- */
  pageRenderers.dashboard = function () {
    var users = getUsers();
    var logs = getLogs();

    // Stat cards
    setText("statMembers", users.length);

    // Total deposits = sum of all credit transactions
    var totalDeposits = 0;
    var totalWithdrawals = 0;
    logs.forEach(function (l) {
      if (l.txnType === "credit" && l.amount) totalDeposits += l.amount;
      if (l.txnType === "debit" && l.amount) totalWithdrawals += l.amount;
    });
    setText("statDeposits", "$" + formatNum(totalDeposits.toFixed(2)));

    // Login rate: users who logged in more than once
    var loginCounts = {};
    logs.forEach(function (l) {
      if (l.action === "Login")
        loginCounts[l.userId] = (loginCounts[l.userId] || 0) + 1;
    });
    var multiLogin = Object.values(loginCounts).filter(function (c) {
      return c > 1;
    }).length;
    var loginRate =
      users.length > 0 ? Math.round((multiLogin / users.length) * 100) : 0;
    setText("statLoginRate", loginRate + " %");

    // Average balance (real calculation from user balances)
    var avgBal = 0;
    if (users.length > 0) {
      var totalBal = 0;
      users.forEach(function (u) {
        totalBal += getUserBalance(u.id);
      });
      avgBal = Math.round(totalBal / users.length);
    }
    setText("statAvgBalance", "$" + formatNum(Math.abs(avgBal)));

    // Conversion rate: users with at least one transaction / total users
    var usersWithTxn = {};
    logs.forEach(function (l) {
      if (l.amount && l.userId) usersWithTxn[l.userId] = true;
    });
    var convRate =
      users.length > 0
        ? ((Object.keys(usersWithTxn).length / users.length) * 100).toFixed(1)
        : 0;
    setText("statConversion", convRate + " %");

    // Most active accounts
    var activeEl = document.getElementById("activeAccounts");
    if (activeEl) {
      if (users.length === 0) {
        activeEl.innerHTML =
          '<li style="color:#8b949e;padding:20px;text-align:center">No users yet</li>';
      } else {
        // sort by login count
        var sorted = users
          .slice()
          .sort(function (a, b) {
            return (loginCounts[b.id] || 0) - (loginCounts[a.id] || 0);
          })
          .slice(0, 5);
        activeEl.innerHTML = sorted
          .map(function (u) {
            var count = loginCounts[u.id] || 0;
            return (
              '<li><div class="pl-avatar">' +
              initials(u) +
              "</div>" +
              '<div class="pl-info"><strong>' +
              esc(u.firstName + " " + u.lastName) +
              "</strong>" +
              "<span>" +
              esc(genAcctNum(u.id)) +
              "</span></div>" +
              '<span class="pl-stat">' +
              count +
              " Logins</span></li>"
            );
          })
          .join("");
      }
    }

    // Recent activity (last 5 logs)
    var actBody = document.getElementById("recentActivity");
    if (actBody) {
      var recent = logs.slice(-5).reverse();
      if (recent.length === 0) {
        actBody.innerHTML =
          '<tr><td colspan="5" style="text-align:center;color:#8b949e;padding:20px">No activity yet</td></tr>';
      } else {
        actBody.innerHTML = recent
          .map(function (l) {
            var badge = actionBadge(l.action);
            return (
              '<tr><td><div class="user-cell"><div class="cl-avatar" style="width:32px;height:32px;font-size:.72rem">' +
              esc((l.userName || "?")[0]) +
              '</div><span class="customer-name">' +
              esc(l.userName || "Unknown") +
              "</span></div></td><td>" +
              esc(l.action) +
              "</td><td>#" +
              l.id +
              "</td><td>" +
              formatDate(l.timestamp) +
              '</td><td><span class="badge ' +
              badge +
              '">' +
              esc(l.status || "completed") +
              "</span></td></tr>"
            );
          })
          .join("");
      }
    }

    // Top members (by earliest signup)
    var topEl = document.getElementById("topMembers");
    if (topEl) {
      if (users.length === 0) {
        topEl.innerHTML =
          '<li style="color:#8b949e;padding:20px;text-align:center">No members yet</li>';
      } else {
        var top = users.slice(-5).reverse();
        topEl.innerHTML = top
          .map(function (u) {
            var txCount = logs.filter(function (l) {
              return l.userId === u.id;
            }).length;
            return (
              '<li><div class="cl-avatar">' +
              initials(u) +
              "</div>" +
              '<div class="cl-info"><strong>' +
              esc(u.firstName + " " + u.lastName) +
              "</strong>" +
              "<span>" +
              txCount +
              " Activities</span></div>" +
              '<button class="cl-view" data-goto-user="' +
              u.id +
              '">View</button></li>'
            );
          })
          .join("");
      }
    }

    // Chart — use selected period
    var chartPeriodEl = document.getElementById("chartPeriodFilter");
    var chartDays = chartPeriodEl ? parseInt(chartPeriodEl.value, 10) : 7;
    renderChart(logs, chartDays);
  };

  function actionBadge(action) {
    if (action === "Account Created") return "approved";
    if (action === "Login") return "shipped";
    if (action === "Logout") return "pending";
    if (action === "Deposit") return "approved";
    if (action === "Withdrawal") return "cancelled";
    return "active";
  }

  /* ----------------------------------------------------------
     USERS
     ---------------------------------------------------------- */
  pageRenderers.users = function () {
    var users = getUsers();
    var search = (
      document.getElementById("userSearch")?.value || ""
    ).toLowerCase();
    var statusFilter = document.getElementById("userStatusFilter")?.value || "";

    var filtered = users.filter(function (u) {
      var name = (u.firstName + " " + u.lastName + " " + u.email).toLowerCase();
      var matchSearch = !search || name.indexOf(search) > -1;
      var st = u.status || "active";
      var matchStatus = !statusFilter || st === statusFilter;
      return matchSearch && matchStatus;
    });

    setText(
      "userCount",
      filtered.length + " user" + (filtered.length !== 1 ? "s" : ""),
    );
    var body = document.getElementById("usersBody");
    var empty = document.getElementById("usersEmpty");

    if (filtered.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    var grid = document.getElementById("usersGrid");
    if (!grid) {
      /* fallback to old tbody if grid not found */
      var body2 = document.getElementById("usersBody");
      if (body2)
        body2.innerHTML = filtered
          .map(function (u) {
            return (
              "<tr><td>" +
              esc(u.firstName + " " + u.lastName) +
              "</td><td>" +
              esc(u.email) +
              "</td><td>" +
              '<span class="badge ' +
              (u.status || "active") +
              '">' +
              capitalize(u.status || "active") +
              "</span></td>" +
              '<td><button class="btn-sm blue" onclick="window._adminViewUser(' +
              u.id +
              ')">View</button></td></tr>'
            );
          })
          .join("");
      return;
    }

    /* Calculate each user's total balance from logs */
    var allLogs = getLogs();
    function getUserBalance(uid) {
      var bal = 0;
      allLogs.forEach(function (l) {
        if (String(l.userId) !== String(uid) || !l.amount) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      });
      return bal;
    }

    grid.innerHTML = filtered
      .map(function (u) {
        var st = u.status || "active";
        var bal = getUserBalance(u.id);
        var initStr = (
          (u.firstName || "?")[0] + (u.lastName || "?")[0]
        ).toUpperCase();
        var colors = [
          "#4b38f5",
          "#00a878",
          "#c9a227",
          "#e53935",
          "#0288d1",
          "#7b1fa2",
        ];
        var color = colors[Math.abs(u.id || 0) % colors.length];
        var txnCount = allLogs.filter(function (l) {
          return String(l.userId) === String(u.id) && l.amount;
        }).length;
        var cardAvatarHtml = u.profilePic
          ? '<img src="' +
            u.profilePic +
            '" style="width:46px;height:46px;border-radius:14px;object-fit:cover;flex-shrink:0" alt="photo"/>'
          : '<div class="user-card-avatar" style="background:' +
            color +
            '">' +
            initStr +
            "</div>";
        return (
          '<div class="user-card">' +
          '<div class="user-card-top">' +
          cardAvatarHtml +
          '<div class="user-card-info">' +
          '<div class="user-card-name">' +
          esc(u.firstName + " " + u.lastName) +
          "</div>" +
          '<div class="user-card-email">' +
          esc(u.email) +
          "</div>" +
          "</div>" +
          '<span class="badge ' +
          st +
          '">' +
          capitalize(st) +
          "</span>" +
          "</div>" +
          '<div class="user-card-bal">' +
          '<div class="user-card-bal-label">Total Balance</div>' +
          '<div class="user-card-bal-amt' +
          (bal < 0 ? " neg" : "") +
          '">' +
          fmt(Math.abs(bal)) +
          "</div>" +
          "</div>" +
          '<div class="user-card-meta">' +
          '<div class="user-card-meta-item"><span>Account #</span><strong>' +
          esc(u.accountNumber || "—") +
          "</strong></div>" +
          '<div class="user-card-meta-item"><span>Transactions</span><strong>' +
          txnCount +
          "</strong></div>" +
          '<div class="user-card-meta-item"><span>Joined</span><strong>' +
          formatDate(u.createdAt) +
          "</strong></div>" +
          "</div>" +
          '<div class="user-card-actions">' +
          '<button class="btn-sm blue"   onclick="window._adminViewUser(' +
          u.id +
          ')">&#128065; View</button>' +
          '<button class="btn-sm green"  onclick="window._adminCreditAcct(' +
          u.id +
          ',&quot;checking&quot;,&quot;Checking&quot;)">&#8595; Credit</button>' +
          '<button class="btn-sm red"    onclick="window._adminDebitAcct(' +
          u.id +
          ',&quot;checking&quot;,&quot;Checking&quot;)">&#8593; Debit</button>' +
          '<button class="btn-sm" style="background:#6b7280;color:white" onclick="window._adminDeleteUser(' +
          u.id +
          ')">&#128465;</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  };

  // search & filter listeners
  ["userSearch", "userStatusFilter"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("input", function () {
        pageRenderers.users();
      });
  });

  /* ----------------------------------------------------------
     ACCOUNTS
     ---------------------------------------------------------- */
  /* ----------------------------------------------------------
     ACCOUNTS — shows each user with their sub-accounts
     each user appears ONCE with all their accounts below
     ---------------------------------------------------------- */
  pageRenderers.accounts = function () {
    var users = getUsers();
    var logs = getLogs();
    var q = (document.getElementById("acctSearch") || {}).value || "";
    var filtered = users.filter(function (u) {
      var name = (u.firstName + " " + u.lastName + " " + u.email).toLowerCase();
      return !q || name.includes(q.toLowerCase());
    });

    // Stats
    var ckCount = 0,
      svCount = 0,
      bzCount = 0;
    users.forEach(function (u) {
      var accts = getAccountKeys(u);
      if (accts.checking) ckCount++;
      if (accts.savings) svCount++;
      if (
        Object.keys(accts).filter(function (k) {
          return k !== "checking" && k !== "savings";
        }).length
      )
        bzCount++;
    });
    setText("acctTotal", users.length);
    setText("acctChecking", ckCount);
    setText("acctSavings", svCount);
    setText("acctBusiness", bzCount);
    setText(
      "acctCount",
      filtered.length + " user" + (filtered.length !== 1 ? "s" : ""),
    );

    var container = document.getElementById("accountsUserList");
    var empty = document.getElementById("accountsEmpty");
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    /* Get all account keys for a user — always include checking + savings + all business */
    function getAccountKeys(u) {
      var accts = {};

      /* Start with checking and savings — every user has these */
      accts["checking"] = true;
      accts["savings"] = true;

      /* Add any explicit business accounts */
      if (u.accounts && typeof u.accounts === "object") {
        Object.keys(u.accounts).forEach(function (k) {
          if (u.accounts[k]) accts[k] = u.accounts[k];
        });
      }

      /* If user has a businessName but no business key yet, add one */
      var bizKeys = Object.keys(accts).filter(function (k) {
        return k !== "checking" && k !== "savings";
      });
      if (u.businessName && bizKeys.length === 0) {
        accts["business"] = { name: u.businessName };
      }

      return accts;
    }

    /* Balance per account type for this user — isolated by userId */
    function getAcctBalance(uid, acctType) {
      var bal = 0;
      logs.forEach(function (l) {
        if (String(l.userId) !== String(uid) || !l.amount) return;
        var primary = "checking";
        var u2 = users.find(function (u) {
          return String(u.id) === String(uid);
        });
        if (u2) primary = (u2.accountType || "checking").toLowerCase();
        var ta = (l.targetAccount || primary).toLowerCase();
        if (ta !== acctType.toLowerCase()) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount) || 0;
        else if (l.txnType === "debit") bal -= parseFloat(l.amount) || 0;
      });
      return bal;
    }

    var colors = [
      "#4b38f5",
      "#00a878",
      "#c9a227",
      "#e53935",
      "#0288d1",
      "#7b1fa2",
    ];
    var acctIcons = {
      checking: "account_balance",
      savings: "savings",
      business: "business_center",
    };

    container.innerHTML = filtered
      .map(function (u) {
        var st = u.status || "active";
        var accts = getAccountKeys(u);
        var acctKeys = Object.keys(accts);
        var initStr = (
          (u.firstName || "?")[0] + (u.lastName || "?")[0]
        ).toUpperCase();
        var color = colors[Math.abs(parseInt(u.id) || 0) % colors.length];
        var acctAvatarHtml = u.profilePic
          ? '<img src="' +
            u.profilePic +
            '" class="acct-user-avatar-img" alt="' +
            esc(u.firstName) +
            '" style="width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0"/>'
          : '<div class="acct-user-avatar" style="background:' +
            color +
            '">' +
            initStr +
            "</div>";
        var totalBal = 0;
        acctKeys.forEach(function (k) {
          totalBal += getAcctBalance(u.id, k);
        });
        var txnCount = logs.filter(function (l) {
          return String(l.userId) === String(u.id) && l.amount;
        }).length;

        // Sub-account rows
        var subRows = acctKeys
          .map(function (k) {
            var bal = getAcctBalance(u.id, k);
            var label =
              typeof accts[k] === "object" && accts[k].name
                ? accts[k].name
                : capitalize(k);
            var icon = acctIcons[k] || "account_balance_wallet";
            var balColor = bal < 0 ? "color:#e53935" : "color:#00a878";
            return (
              '<div class="acct-sub-row">' +
              '<span class="material-icons-outlined acct-sub-icon">' +
              icon +
              "</span>" +
              '<span class="acct-sub-label">' +
              esc(label) +
              "</span>" +
              '<span class="acct-sub-bal" style="' +
              balColor +
              '">$' +
              formatNum(bal.toFixed(2)) +
              "</span>" +
              '<div class="acct-sub-btns">' +
              '<button class="btn-sm green" onclick="window._adminCreditAcct(' +
              JSON.stringify(u.id) +
              "," +
              JSON.stringify(k) +
              "," +
              JSON.stringify(label) +
              ')">&#8595; Credit</button>' +
              '<button class="btn-sm red"   onclick="window._adminDebitAcct(' +
              JSON.stringify(u.id) +
              "," +
              JSON.stringify(k) +
              "," +
              JSON.stringify(label) +
              ')">&#8593; Debit</button>' +
              '<button class="btn-sm blue"  onclick="window._adminViewHistory(' +
              JSON.stringify(u.id) +
              ')">History</button>' +
              "</div>" +
              "</div>"
            );
          })
          .join("");

        return (
          '<div class="acct-user-block" id="acctBlock_' +
          u.id +
          '">' +
          '<div class="acct-user-header">' +
          acctAvatarHtml +
          '<div class="acct-user-info">' +
          '<div class="acct-user-name">' +
          esc(u.firstName + " " + u.lastName) +
          "</div>" +
          '<div class="acct-user-email">' +
          esc(u.email) +
          "</div>" +
          "</div>" +
          '<div class="acct-user-stats">' +
          '<span class="badge ' +
          st +
          '">' +
          capitalize(st) +
          "</span>" +
          '<span class="acct-user-txncount">' +
          txnCount +
          " txns</span>" +
          "</div>" +
          '<div class="acct-user-total">' +
          '<span class="acct-total-label">Total</span>' +
          '<span class="acct-total-val">$' +
          formatNum(totalBal.toFixed(2)) +
          "</span>" +
          "</div>" +
          '<div class="acct-user-actions">' +
          '<button class="btn-sm blue"   onclick="window._adminEditUser(' +
          u.id +
          ')">Edit</button>' +
          '<button class="btn-sm purple" onclick="window._adminViewHistory(' +
          u.id +
          ')">History</button>' +
          '<button class="btn-sm red"    onclick="window._adminDeleteUserFull(' +
          JSON.stringify(u.id) +
          ')">Delete</button>' +
          "</div>" +
          "</div>" +
          '<div class="acct-sub-list">' +
          subRows +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    // Search live filter
    var searchEl = document.getElementById("acctSearch");
    if (searchEl && !searchEl._wired) {
      searchEl._wired = true;
      searchEl.addEventListener("input", function () {
        pageRenderers.accounts();
      });
    }

    // Wire addUserBtn2
    var addBtn2 = document.getElementById("addUserBtn2");
    if (addBtn2 && !addBtn2._wired) {
      addBtn2._wired = true;
      addBtn2.addEventListener("click", function () {
        document.getElementById("addUserBtn") &&
          document.getElementById("addUserBtn").click();
      });
    }
  };

  pageRenderers.transactions = function () {
    var logs = getLogs();
    var search = (
      document.getElementById("txnSearch")?.value || ""
    ).toLowerCase();
    var typeFilter = document.getElementById("txnTypeFilter")?.value || "";

    var filtered = logs
      .filter(function (l) {
        var text = (
          (l.userName || "") +
          " " +
          (l.action || "") +
          " " +
          (l.details || "")
        ).toLowerCase();
        var matchSearch = !search || text.indexOf(search) > -1;
        var matchType = !typeFilter || l.action === typeFilter;
        return matchSearch && matchType;
      })
      .reverse(); // newest first

    setText(
      "txnCount",
      filtered.length + " entr" + (filtered.length !== 1 ? "ies" : "y"),
    );
    var body = document.getElementById("txnBody");
    var empty = document.getElementById("txnEmpty");

    if (filtered.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    var timeline = document.getElementById("txnTimeline");
    if (!timeline) return;

    /* Group by date */
    var groups = {};
    filtered.slice(0, 150).forEach(function (l) {
      var d = "";
      try {
        d = new Date(l.timestamp).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {
        d = "Unknown Date";
      }
      if (!groups[d]) groups[d] = [];
      groups[d].push(l);
    });

    var html = "";
    Object.keys(groups).forEach(function (date) {
      html +=
        '<div class="txn-date-group"><div class="txn-date-label">' +
        date +
        "</div>";
      groups[date].forEach(function (l) {
        var isCredit = l.txnType === "credit";
        var isDebit = l.txnType === "debit";
        var iconBg = isCredit ? "#e6f9f3" : isDebit ? "#ffeef0" : "#f0f2ff";
        var iconColor = isCredit ? "#00a878" : isDebit ? "#e53935" : "#4b38f5";
        var iconChar = isCredit ? "&#8593;" : isDebit ? "&#8595;" : "&#8801;";
        var amtStr = l.amount
          ? (isDebit ? "-" : "+") + fmt(Math.abs(l.amount))
          : "";
        var amtClass = isCredit
          ? "txn-tl-credit"
          : isDebit
            ? "txn-tl-debit"
            : "";
        var time = "";
        try {
          time = new Date(l.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (e) {}

        html +=
          '<div class="txn-tl-item">' +
          '<div class="txn-tl-icon" style="background:' +
          iconBg +
          ";color:" +
          iconColor +
          '">' +
          iconChar +
          "</div>" +
          '<div class="txn-tl-body">' +
          '<div class="txn-tl-row">' +
          '<div class="txn-tl-left">' +
          '<span class="txn-tl-name">' +
          esc(l.userName || "Unknown") +
          "</span>" +
          '<span class="txn-tl-action">' +
          esc(l.action || "") +
          "</span>" +
          '<span class="txn-tl-detail">' +
          esc(l.details || "") +
          "</span>" +
          "</div>" +
          '<div class="txn-tl-right">' +
          (amtStr
            ? '<span class="txn-tl-amt ' + amtClass + '">' + amtStr + "</span>"
            : "") +
          '<span class="txn-tl-time">' +
          time +
          "</span>" +
          '<div class="txn-tl-btns">' +
          '<button class="btn-sm blue" onclick="window._adminEditTxn(' +
          l.id +
          ')">Edit</button>' +
          '<button class="btn-sm red" onclick="window._adminDeleteTxn(' +
          l.id +
          ')">Del</button>' +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>";
      });
      html += "</div>";
    });
    timeline.innerHTML = html;
  };

  ["txnSearch", "txnTypeFilter"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("input", function () {
        pageRenderers.transactions();
      });
  });

  /* ----------------------------------------------------------
     REVIEW
     ---------------------------------------------------------- */
  pageRenderers.review = function () {
    var users = getUsers();
    var pending = users.filter(function (u) {
      return (u.status || "active") === "pending";
    });

    setText("reviewCount", pending.length + " pending");
    var badge = document.getElementById("reviewBadge");
    if (badge)
      badge.textContent =
        pending.length < 10 ? "0" + pending.length : pending.length;

    var body = document.getElementById("reviewBody");
    var empty = document.getElementById("reviewEmpty");

    if (pending.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    body.innerHTML = pending
      .map(function (u) {
        return (
          "<tr>" +
          '<td><div class="user-cell"><div class="cl-avatar" style="width:34px;height:34px;font-size:.75rem">' +
          initials(u) +
          "</div>" +
          "<strong>" +
          esc(u.firstName + " " + u.lastName) +
          "</strong></div></td>" +
          "<td>" +
          esc(u.email) +
          "</td>" +
          "<td>" +
          capitalize(u.accountType || "Checking") +
          "</td>" +
          "<td>" +
          formatDate(u.createdAt) +
          "</td>" +
          '<td><span class="badge pending">Pending</span></td>' +
          '<td><div class="action-btns">' +
          '<button class="btn-sm green" onclick="window._adminApproveUser(' +
          u.id +
          ')">Approve</button>' +
          '<button class="btn-sm red" onclick="window._adminSuspendUser(' +
          u.id +
          ')">Reject</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  };

  /* ----------------------------------------------------------
     PAYMENTS
     ---------------------------------------------------------- */
  pageRenderers.payments = function () {
    var logs = getLogs();
    var payLogs = logs
      .filter(function (l) {
        return (
          l.action === "Deposit" ||
          l.action === "Withdrawal" ||
          l.action === "Wire Transfer" ||
          l.action === "Payment"
        );
      })
      .reverse();

    var completed = payLogs.filter(function (l) {
      return l.status === "completed";
    }).length;
    var pending = payLogs.filter(function (l) {
      return l.status === "pending";
    }).length;
    var failed = payLogs.filter(function (l) {
      return l.status === "failed";
    }).length;

    setText("payTotal", payLogs.length);
    setText("payCompleted", completed);
    setText("payPending", pending);
    setText("payFailed", failed);
    setText(
      "payCount",
      payLogs.length + " payment" + (payLogs.length !== 1 ? "s" : ""),
    );

    var body = document.getElementById("paymentsBody");
    var empty = document.getElementById("paymentsEmpty");

    if (payLogs.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    body.innerHTML = payLogs
      .slice(0, 50)
      .map(function (l) {
        var isCredit = l.txnType === "credit";
        var amount = (isCredit ? "+" : "-") + "$" + formatNum(l.amount || 0);
        var method =
          l.action === "Wire Transfer"
            ? "Wire"
            : l.action === "Deposit"
              ? "Internal"
              : "Card";
        var badge =
          l.status === "completed"
            ? "completed"
            : l.status === "pending"
              ? "pending"
              : "failed";
        return (
          "<tr>" +
          "<td>" +
          esc(l.userName || "Unknown") +
          "</td>" +
          "<td>ICU System</td>" +
          "<td>" +
          amount +
          "</td>" +
          "<td>" +
          method +
          "</td>" +
          "<td>" +
          formatDate(l.timestamp) +
          "</td>" +
          '<td><span class="badge ' +
          badge +
          '">' +
          capitalize(l.status || "completed") +
          "</span></td>" +
          '<td><div class="action-btns">' +
          '<button class="btn-sm blue" onclick="window._adminEditTxn(' +
          l.id +
          ')">Edit</button>' +
          '<button class="btn-sm red" onclick="window._adminDeleteTxn(' +
          l.id +
          ')">Delete</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  };

  /* ----------------------------------------------------------
     INTEGRATION (static UI — no dynamic data needed)
     ---------------------------------------------------------- */
  pageRenderers.integration = function () {
    /* static */
  };

  /* ----------------------------------------------------------
     SETTINGS
     ---------------------------------------------------------- */
  pageRenderers.settings = function () {
    /* static */
  };

  var saveBtn = document.getElementById("saveSettings");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      const systemDate = document.getElementById("systemDateOverride").value;
      if (systemDate) {
        localStorage.setItem("icu_system_date", systemDate);
      } else {
        localStorage.removeItem("icu_system_date");
      }
      alert("Settings saved successfully!");
    });
  }

  /* ----------------------------------------------------------
     HELP (static)
     ---------------------------------------------------------- */
  pageRenderers.help = function () {
    /* static */
  };

  /* ----------------------------------------------------------
     MANAGE USERS
     ---------------------------------------------------------- */
  pageRenderers.manage = function () {
    var users = getUsers();
    var search = (
      document.getElementById("manageSearch")?.value || ""
    ).toLowerCase();

    var filtered = users.filter(function (u) {
      var text = (u.firstName + " " + u.lastName + " " + u.email).toLowerCase();
      return !search || text.indexOf(search) > -1;
    });

    setText(
      "manageCount",
      filtered.length + " user" + (filtered.length !== 1 ? "s" : ""),
    );
    var body = document.getElementById("manageBody");
    var empty = document.getElementById("manageEmpty");

    if (filtered.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    body.innerHTML = filtered
      .map(function (u) {
        var st = u.status || "active";
        return (
          "<tr>" +
          '<td><div class="user-cell"><div class="cl-avatar" style="width:34px;height:34px;font-size:.75rem">' +
          initials(u) +
          "</div>" +
          "<strong>" +
          esc(u.firstName + " " + u.lastName) +
          "</strong></div></td>" +
          "<td>" +
          esc(u.email) +
          "</td>" +
          "<td>" +
          esc(u.password || "—") +
          "</td>" +
          "<td>" +
          esc(u.transactionPin || "—") +
          "</td>" +
          "<td>" +
          esc(u.phone || "—") +
          "</td>" +
          "<td>" +
          (Object.keys(u.accounts || {})
            .map(capitalize)
            .join(", ") || "—") +
          "</td>" +
          '<td><span class="badge ' +
          st +
          '">' +
          capitalize(st) +
          "</span></td>" +
          '<td><div class="action-btns">' +
          '<button class="btn-sm blue" onclick="window._adminEditUser(' +
          u.id +
          ')">Edit</button>' +
          '<button class="btn-sm green" onclick="window._adminAddTxn(' +
          u.id +
          ')">Add Txn</button>' +
          '<button class="btn-sm blue" onclick="window._adminViewHistory(' +
          u.id +
          ')">History</button>' +
          (st === "active"
            ? '<button class="btn-sm orange" onclick="window._adminSuspendUser(' +
              u.id +
              ')">Suspend</button>'
            : '<button class="btn-sm green" onclick="window._adminActivateUser(' +
              u.id +
              ')">Activate</button>') +
          '<button class="btn-sm red" onclick="window._adminDeleteUser(' +
          u.id +
          ')">Delete</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  };

  var manageSearchEl = document.getElementById("manageSearch");
  if (manageSearchEl)
    manageSearchEl.addEventListener("input", function () {
      pageRenderers.manage();
    });

  /* ==========================================================
     GLOBAL ACTION HANDLERS (attached to window for onclick)
     ========================================================== */

  /* View user — switch to users tab and highlight */
  window._adminViewUser = function (id) {
    switchPage("users");
    // could scroll/highlight — for now it switches tab
  };

  /* Edit user — open modal */
  window._adminEditUser = function (id) {
    var users = getUsers();
    var u = users.find(function (x) {
      return x.id === id;
    });
    if (!u) return;

    document.getElementById("editUserId").value = u.id;
    document.getElementById("editFirstName").value = u.firstName || "";
    document.getElementById("editLastName").value = u.lastName || "";
    document.getElementById("editEmail").value = u.email || "";
    document.getElementById("editPhone").value = u.phone || "";
    document.getElementById("editBusinessName").value = u.businessName || "";
    document.getElementById("editStatus").value = u.status || "active";
    document.getElementById("editPassword").value = "";

    // Load account manager
    loadEditAccounts(u);

    // Set card balances
    document.getElementById("editCard1Balance").value = u.card1Balance || 0;
    document.getElementById("editCard2Balance").value = u.card2Balance || 0;

    /* Show current profile pic or initials */
    var previewEl = document.getElementById("editProfilePreview");
    var initialsEl = document.getElementById("editProfileInitials");
    if (u.profilePic) {
      if (previewEl) {
        previewEl.src = u.profilePic;
        previewEl.style.display = "block";
      }
      if (initialsEl) initialsEl.style.display = "none";
    } else {
      if (previewEl) previewEl.style.display = "none";
      if (initialsEl) {
        initialsEl.style.display = "flex";
        initialsEl.textContent = (
          (u.firstName || "?")[0] + (u.lastName || "?")[0]
        ).toUpperCase();
      }
    }
    var picInput = document.getElementById("editProfilePic");
    if (picInput) picInput.value = "";

    document.getElementById("editModal").classList.add("show");
  };

  /* Close modal */
  /* ── CREDIT MODAL ── */
  ["closeCreditModal", "cancelCreditModal"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("creditModal").classList.remove("show");
      });
  });

  var creditForm = document.getElementById("creditForm");
  if (creditForm) {
    creditForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var userId = document.getElementById("creditUserId").value;
      var accountType = document.getElementById("creditAccountType").value;
      var amount = parseFloat(document.getElementById("creditAmount").value);
      var description = document
        .getElementById("creditDescription")
        .value.trim();
      var dtVal = document.getElementById("creditDateTime").value;

      if (!amount || amount <= 0) {
        document.getElementById("creditError").textContent =
          "Please enter a valid amount.";
        document.getElementById("creditError").style.display = "block";
        return;
      }

      var users = getUsers();
      var u = users.find(function (x) {
        return String(x.id) === String(userId);
      });
      if (!u) return;

      var newLog = {
        id: Date.now(),
        userId: u.id,
        userName: u.firstName + " " + u.lastName,
        action: "Credit — " + capitalize(accountType),
        details:
          description || "Credit to " + capitalize(accountType) + " account",
        amount: amount,
        txnType: "credit",
        targetAccount: accountType,
        timestamp: dtVal
          ? new Date(dtVal).toISOString()
          : new Date().toISOString(),
        status: "completed",
        txnId: "TXN" + Date.now(),
      };

      var logs = getLogs();
      logs.push(newLog);
      saveLogs(logs);
      saveLogToSupabase(newLog);

      document.getElementById("creditModal").classList.remove("show");
      showToast(
        "Credit of $" +
          formatNum(amount.toFixed(2)) +
          " added to " +
          u.firstName +
          "'s " +
          capitalize(accountType) +
          " account",
        "success",
      );
      refreshCurrentPage();
    });
  }

  /* ── DEBIT MODAL ── */
  ["closeDebitModal", "cancelDebitModal"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("debitModal").classList.remove("show");
      });
  });

  var debitForm = document.getElementById("debitForm");
  if (debitForm) {
    debitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var userId = document.getElementById("debitUserId").value;
      var accountType = document.getElementById("debitAccountType").value;
      var amount = parseFloat(document.getElementById("debitAmount").value);
      var description = document
        .getElementById("debitDescription")
        .value.trim();
      var dtVal = document.getElementById("debitDateTime").value;

      if (!amount || amount <= 0) {
        document.getElementById("debitError").textContent =
          "Please enter a valid amount.";
        document.getElementById("debitError").style.display = "block";
        return;
      }

      var users = getUsers();
      var u = users.find(function (x) {
        return String(x.id) === String(userId);
      });
      if (!u) return;

      var newLog = {
        id: Date.now(),
        userId: u.id,
        userName: u.firstName + " " + u.lastName,
        action: "Debit — " + capitalize(accountType),
        details:
          description || "Debit from " + capitalize(accountType) + " account",
        amount: amount,
        txnType: "debit",
        targetAccount: accountType,
        timestamp: dtVal
          ? new Date(dtVal).toISOString()
          : new Date().toISOString(),
        status: "completed",
        txnId: "TXN" + Date.now(),
      };

      var logs = getLogs();
      logs.push(newLog);
      saveLogs(logs);
      saveLogToSupabase(newLog);

      document.getElementById("debitModal").classList.remove("show");
      showToast(
        "Debit of $" +
          formatNum(amount.toFixed(2)) +
          " applied to " +
          u.firstName +
          "'s " +
          capitalize(accountType) +
          " account",
        "success",
      );
      refreshCurrentPage();
    });
  }

  ["closeModal", "cancelEdit"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("editModal").classList.remove("show");
      });
  });

  /* Save edit */
  var editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var id = Number(document.getElementById("editUserId").value);
      var users = getUsers();
      var idx = users.findIndex(function (x) {
        return x.id === id;
      });
      if (idx === -1) return;

      users[idx].firstName = document
        .getElementById("editFirstName")
        .value.trim();
      users[idx].lastName = document
        .getElementById("editLastName")
        .value.trim();
      users[idx].email = document
        .getElementById("editEmail")
        .value.trim()
        .toLowerCase();
      users[idx].phone = document.getElementById("editPhone").value.trim();
      users[idx].businessName = document
        .getElementById("editBusinessName")
        .value.trim();
      users[idx].status = document.getElementById("editStatus").value;

      // Save accounts from account manager
      var selectedAccounts = collectEditAccounts();
      users[idx].accounts = selectedAccounts;
      // Also save first business name at top-level for easy access
      var bizKeys2 = Object.keys(selectedAccounts).filter(function (k) {
        return k !== "checking" && k !== "savings";
      });
      if (bizKeys2.length > 0) {
        var firstBiz = selectedAccounts[bizKeys2[0]];
        users[idx].businessName =
          firstBiz && firstBiz.name ? firstBiz.name : "";
      }
      // Also log new business deposits
      var editLogs = getLogs();
      Object.keys(selectedAccounts).forEach(function (key) {
        if (key === "checking" || key === "savings") return;
        var acct = selectedAccounts[key];
        if (acct && acct.deposit && acct.deposit > 0) {
          editLogs.push({
            id: Date.now() + Math.random(),
            userId: id,
            userName: users[idx].firstName + " " + users[idx].lastName,
            action: "Deposit",
            details: "Business account deposit — " + (acct.name || key),
            amount: acct.deposit,
            txnType: "credit",
            targetAccount: key,
            timestamp: new Date().toISOString(),
            status: "completed",
          });
        }
      });
      saveLogs(editLogs);

      // Save card balances
      users[idx].card1Balance =
        parseFloat(document.getElementById("editCard1Balance").value) || 0;
      users[idx].card2Balance =
        parseFloat(document.getElementById("editCard2Balance").value) || 0;

      var newPass = document.getElementById("editPassword").value;
      if (newPass) users[idx].password = newPass;

      /* Save profile pic if a new one was uploaded */
      var editPicFile = document.getElementById("editProfilePic");
      if (editPicFile && editPicFile.files && editPicFile.files[0]) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          users[idx].profilePic = ev.target.result;
          saveUsers(users);
          if (window._dbUpdateUser)
            window
              ._dbUpdateUser(users[idx].id, users[idx])
              .catch(function () {});
          refreshCurrentPage();
        };
        reader.readAsDataURL(editPicFile.files[0]);
        return; /* async — will refresh after read */
      }

      saveUsers(users);
      /* Sync updated user to Supabase */
      if (window._dbUpdateUser) {
        window._dbUpdateUser(users[idx].id, users[idx]).catch(function (e) {
          console.warn("DB sync failed:", e);
        });
      }
      document.getElementById("editModal").classList.remove("show");

      // Log activity
      addLog(
        id,
        users[idx].firstName + " " + users[idx].lastName,
        "Account Updated",
        "Admin edited user profile",
      );

      pageRenderers.manage();
    });
  }

  /* Suspend user */
  window._adminSuspendUser = function (id) {
    if (!confirm("Suspend this user?")) return;
    var users = getUsers();
    var u = users.find(function (x) {
      return x.id === id;
    });
    if (u) {
      u.status = "suspended";
      saveUsers(users);
      addLog(
        id,
        u.firstName + " " + u.lastName,
        "Account Suspended",
        "Admin suspended account",
      );
      refreshCurrentPage();
    }
  };

  /* Activate user */
  window._adminActivateUser = function (id) {
    var users = getUsers();
    var u = users.find(function (x) {
      return x.id === id;
    });
    if (u) {
      u.status = "active";
      saveUsers(users);
      addLog(
        id,
        u.firstName + " " + u.lastName,
        "Account Activated",
        "Admin activated account",
      );
      refreshCurrentPage();
    }
  };

  /* Approve user (from review) */
  window._adminApproveUser = function (id) {
    var users = getUsers();
    var u = users.find(function (x) {
      return x.id === id;
    });
    if (u) {
      u.status = "active";
      saveUsers(users);
      addLog(
        id,
        u.firstName + " " + u.lastName,
        "Account Approved",
        "Admin approved account application",
      );
      pageRenderers.review();
    }
  };

  /* Delete user */
  window._adminDeleteUser = function (id) {
    window._adminDeleteUserFull(id);
  };

  /* Permanently delete user + ALL their transaction history from Supabase */
  window._adminDeleteUserFull = function (id) {
    if (
      !confirm(
        "Permanently delete this user and ALL their transaction history? This cannot be undone.",
      )
    )
      return;

    var SUPABASE_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
    var SUPABASE_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
    var H = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };

    var users = getUsers();
    var u = users.find(function (x) {
      return String(x.id) === String(id);
    });

    function doLocalDelete() {
      saveUsers(
        users.filter(function (x) {
          return String(x.id) !== String(id);
        }),
      );
      var logs = getLogs().filter(function (l) {
        return String(l.userId) !== String(id);
      });
      saveLogs(logs);
      refreshCurrentPage();
    }

    if (!u || !u.email) {
      doLocalDelete();
      return;
    }

    /* Delete from Supabase — logs cascade-delete automatically via ON DELETE CASCADE */
    fetch(
      SUPABASE_URL +
        "/rest/v1/users?email=eq." +
        encodeURIComponent(u.email.toLowerCase().trim()),
      {
        method: "DELETE",
        headers: H,
      },
    )
      .then(function (r) {
        console.log("User deleted from Supabase:", u.email, r.status);
        doLocalDelete();
      })
      .catch(function (e) {
        console.warn("Supabase delete failed, deleting locally:", e);
        doLocalDelete();
      });
  };

  /* Open Credit modal for a specific account */
  window._adminCreditAcct = function (userId, accountType, accountLabel) {
    var users = getUsers();
    var u = users.find(function (x) {
      return String(x.id) === String(userId);
    });
    if (!u) return;
    document.getElementById("creditUserId").value = userId;
    document.getElementById("creditAccountType").value = accountType;
    document.getElementById("creditAmount").value = "";
    document.getElementById("creditDescription").value = "";
    document.getElementById("creditDateTime").value = "";
    document.getElementById("creditError").style.display = "none";
    var sub = document.getElementById("creditModalSubtitle");
    if (sub)
      sub.textContent =
        u.firstName +
        " " +
        u.lastName +
        " — " +
        (accountLabel || accountType) +
        " Account";
    document.getElementById("creditModal").classList.add("show");
  };

  /* Open Debit modal for a specific account */
  window._adminDebitAcct = function (userId, accountType, accountLabel) {
    var users = getUsers();
    var u = users.find(function (x) {
      return String(x.id) === String(userId);
    });
    if (!u) return;
    document.getElementById("debitUserId").value = userId;
    document.getElementById("debitAccountType").value = accountType;
    document.getElementById("debitAmount").value = "";
    document.getElementById("debitDescription").value = "";
    document.getElementById("debitDateTime").value = "";
    document.getElementById("debitError").style.display = "none";
    var sub = document.getElementById("debitModalSubtitle");
    if (sub)
      sub.textContent =
        u.firstName +
        " " +
        u.lastName +
        " — " +
        (accountLabel || accountType) +
        " Account";
    document.getElementById("debitModal").classList.add("show");
  };

  /* Also keep _adminAddTxnAcct as alias for backward compat */
  window._adminAddTxnAcct = function (userId, accountType) {
    window._adminCreditAcct(userId, accountType, accountType);
  };

  /* Add log helper */
  function addLog(userId, userName, action, details) {
    var logs = getLogs();
    logs.push({
      id: Date.now(),
      userId: userId,
      userName: userName,
      action: action,
      details: details || "",
      timestamp: new Date().toISOString(),
      status: "completed",
    });
    if (logs.length > 500) logs = logs.slice(-500);
    saveLogs(logs);
  }

  /* Refresh current active page */
  function refreshCurrentPage() {
    var active = document.querySelector(".page-section.active");
    if (active) {
      var id = active.id.replace("page-", "");
      if (pageRenderers[id]) pageRenderers[id]();
    }
  }

  /* ==========================================================
     CHART (Dashboard)
     ========================================================== */
  var chartInstance = null;
  function renderChart(logs, numDays) {
    var ctx = document.getElementById("summaryChart");
    if (!ctx || typeof Chart === "undefined") return;

    numDays = numDays || 7;

    // Build data from real transaction logs
    var days = [];
    var deposits = [];
    var withdrawals = [];
    var now = new Date();
    for (var i = numDays - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      // Adjust label format based on period length
      var dayStr;
      if (numDays <= 7) {
        dayStr = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      } else if (numDays <= 30) {
        dayStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        dayStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      days.push(dayStr);

      var dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      var dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      var dayLogs = logs.filter(function (l) {
        var t = new Date(l.timestamp);
        return t >= dayStart && t < dayEnd;
      });

      // Sum actual transaction amounts
      var dep = 0;
      var wth = 0;
      dayLogs.forEach(function (l) {
        if (l.txnType === "credit" && l.amount) dep += l.amount;
        if (l.txnType === "debit" && l.amount) wth += l.amount;
      });

      deposits.push(dep);
      withdrawals.push(wth);
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx.getContext("2d"), {
      type: "line",
      data: {
        labels: days,
        datasets: [
          {
            label: "Deposits",
            data: deposits,
            borderColor: "#18a058",
            backgroundColor: "rgba(24,160,88,.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#18a058",
          },
          {
            label: "Withdrawals",
            data: withdrawals,
            borderColor: "#1a73e8",
            backgroundColor: "rgba(26,115,232,.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#1a73e8",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0d1117",
            titleFont: { family: "Inter" },
            bodyFont: { family: "Inter" },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (c) {
                return c.dataset.label + ": $" + formatNum(c.parsed.y);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "Inter", size: 11 }, color: "#8b949e" },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { family: "Inter", size: 11 },
              color: "#8b949e",
              callback: function (v) {
                return v >= 1000 ? v / 1000 + "K" : v;
              },
            },
            grid: { color: "#f0f2f5" },
          },
        },
      },
    });
  }

  /* ==========================================================
     HELPERS
     ========================================================== */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  /* ========== ADD USER MODAL ========== */
  var addUserBtn = document.getElementById("addUserBtn");
  if (addUserBtn) {
    addUserBtn.addEventListener("click", function () {
      document.getElementById("addUserForm").reset();
      document.getElementById("addUserError").style.display = "none";

      // Auto-generate account number for the new user
      var users = getUsers();
      var nextId =
        users.length > 0
          ? Math.max.apply(
              Math,
              users.map(function (u) {
                return u.id;
              }),
            ) + 1
          : 1001;
      if (nextId < 1001) nextId = 1001; // start from 1001
      document.getElementById("addAccountNumber").value = genAcctNum(nextId);

      document.getElementById("addUserModal").classList.add("show");
    });
  }

  /* Wire Manage page Add User button to same modal */
  var addUserBtnManage = document.getElementById("addUserBtnManage");
  if (addUserBtnManage) {
    addUserBtnManage.addEventListener("click", function () {
      var origBtn = document.getElementById("addUserBtn");
      if (origBtn) origBtn.click();
    });
  }

  ["closeAddUser", "cancelAddUser"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("addUserModal").classList.remove("show");
      });
  });

  var addUserForm = document.getElementById("addUserForm");
  if (addUserForm) {
    addUserForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var errEl = document.getElementById("addUserError");
      if (errEl) errEl.style.display = "none";

      try {
        var firstNameEl = document.getElementById("addFirstName");
        var lastNameEl = document.getElementById("addLastName");
        var emailEl = document.getElementById("addEmail");
        var phoneEl = document.getElementById("addPhone");
        var dobEl = document.getElementById("addDOB");
        var accountTypeCheckboxes = document.querySelectorAll(
          'input[name="accountType"]:checked',
        );
        var depositEl = document.getElementById("addDeposit");
        var card1BalanceEl = document.getElementById("addCard1Balance");
        var card2BalanceEl = document.getElementById("addCard2Balance");
        var ssnEl = document.getElementById("addSSN");
        var addressEl = document.getElementById("addAddress");
        var passwordEl = document.getElementById("addPassword");
        var confirmPwEl = document.getElementById("addConfirmPassword");
        var profilePicEl = document.getElementById("addProfilePic");

        if (!firstNameEl || !lastNameEl || !emailEl || !passwordEl) {
          throw new Error("Required form elements not found.");
        }

        var firstName = firstNameEl.value.trim();
        var lastName = lastNameEl.value.trim();
        var email = emailEl.value.trim().toLowerCase();
        var phone = phoneEl ? phoneEl.value.trim() : "";
        var dob = dobEl ? dobEl.value : "";
        var selectedAccounts = {};
        accountTypeCheckboxes.forEach(function (cb) {
          selectedAccounts[cb.value] = true;
        });
        var deposit = depositEl ? parseFloat(depositEl.value) || 0 : 0;
        var card1Balance = card1BalanceEl
          ? parseFloat(card1BalanceEl.value) || 0
          : 0;
        var card2Balance = card2BalanceEl
          ? parseFloat(card2BalanceEl.value) || 0
          : 0;
        var ssn = ssnEl ? ssnEl.value.trim() : "";
        var address = addressEl ? addressEl.value.trim() : "";
        var password = passwordEl.value;
        var confirmPw = confirmPwEl ? confirmPwEl.value : "";
        var profilePicFile =
          profilePicEl && profilePicEl.files ? profilePicEl.files[0] : null;

        if (!firstName || !lastName) {
          if (errEl) {
            errEl.textContent = "First and last name are required.";
            errEl.style.display = "block";
          }
          return;
        }
        if (!email) {
          if (errEl) {
            errEl.textContent = "Email is required.";
            errEl.style.display = "block";
          }
          return;
        }
        var pinEl = document.getElementById("addPin");
        var confirmPinEl = document.getElementById("addConfirmPin");
        var pin = pinEl ? pinEl.value.trim() : "";
        var confirmPin = confirmPinEl ? confirmPinEl.value.trim() : "";
        if (!/^[0-9]{4,6}$/.test(pin)) {
          document.getElementById("addUserError").textContent =
            "PIN must be 4–6 digits.";
          document.getElementById("addUserError").style.display = "block";
          return;
        }
        if (pin !== confirmPin) {
          document.getElementById("addUserError").textContent =
            "PINs do not match.";
          document.getElementById("addUserError").style.display = "block";
          return;
        }
        if (password.length < 6) {
          if (errEl) {
            errEl.textContent = "Password must be at least 6 characters.";
            errEl.style.display = "block";
          }
          return;
        }
        if (password !== confirmPw) {
          if (errEl) {
            errEl.textContent = "Passwords do not match.";
            errEl.style.display = "block";
          }
          return;
        }

        var finalizeAddUser = function (profilePicBase64) {
          try {
            var users = getUsers();
            if (
              users.find(function (u) {
                return u.email === email;
              })
            ) {
              if (errEl) {
                errEl.textContent = "A user with this email already exists.";
                errEl.style.display = "block";
              }
              return;
            }

            // Safer ID generation
            var maxId = 1000;
            for (var i = 0; i < users.length; i++) {
              var uid = parseInt(users[i].id, 10);
              if (!isNaN(uid) && uid > maxId) maxId = uid;
            }
            var nextId = maxId + 1;
            if (nextId < 1001) nextId = 1001;

            var newUser = {
              id: nextId,
              firstName: firstName,
              lastName: lastName,
              email: email,
              contactEmail: email,
              phone: phone,
              dob: dob,
              accountNumber: genAcctNum(nextId),
              routingNumber: genRoutingNum(),
              ssn: ssn,
              address: address,
              password: (password || "").trim(), // trim whitespace on save
              transactionPin: pin,
              accounts: selectedAccounts,
              businessName: (function () {
                var bk = Object.keys(selectedAccounts).filter(function (k) {
                  return k !== "checking" && k !== "savings";
                });
                if (!bk.length) return "";
                var fb = selectedAccounts[bk[0]];
                return fb && fb.name ? fb.name : "";
              })(),
              card1Balance: card1Balance,
              card2Balance: card2Balance,
              profilePic: profilePicBase64 || null,
              status: "active",
              createdAt: new Date().toISOString(),
            };
            users.push(newUser);
            saveUsers(users);
            /* Sync new user to Supabase */
            if (window._dbCreateUser) {
              window
                ._dbCreateUser(newUser)
                .then(function (dbUser) {
                  if (dbUser && dbUser.id) {
                    // Update local copy with real DB id
                    newUser.id = dbUser.id;
                    saveUsers(users);
                  }
                  console.log("User saved to database:", newUser.email);
                })
                .catch(function (e) {
                  console.warn("DB sync failed:", e);
                });
            }
            /* If a history clone is pending, apply it now */
            if (window._applyCloneAfterCreate)
              window._applyCloneAfterCreate(newUser.id);

            addLog(
              newUser.id,
              firstName + " " + lastName,
              "Account Created",
              "Admin created accounts: " +
                Object.keys(selectedAccounts).join(", "),
            );

            if (deposit > 0) {
              var logs = getLogs();
              // Deposit into first enabled account
              var targetAccount = "checking";
              if (selectedAccounts.checking) targetAccount = "checking";
              else if (selectedAccounts.savings) targetAccount = "savings";
              else {
                var bizKeys = Object.keys(selectedAccounts).filter(
                  function (k) {
                    return k !== "checking" && k !== "savings";
                  },
                );
                if (bizKeys.length) targetAccount = bizKeys[0];
              }
              logs.push({
                id: Date.now() + 1,
                userId: newUser.id,
                userName: firstName + " " + lastName,
                action: "Deposit",
                details: "Initial deposit",
                amount: deposit,
                txnType: "credit",
                targetAccount: targetAccount,
                timestamp: new Date().toISOString(),
                status: "completed",
              });
              // Also deposit into each business account that has its own deposit amount
              Object.keys(selectedAccounts).forEach(function (key) {
                if (key === "checking" || key === "savings") return;
                var acct = selectedAccounts[key];
                if (acct && acct.deposit && acct.deposit > 0) {
                  logs.push({
                    id: Date.now() + Math.random(),
                    userId: newUser.id,
                    userName: firstName + " " + lastName,
                    action: "Deposit",
                    details: "Initial deposit — " + (acct.name || key),
                    amount: acct.deposit,
                    txnType: "credit",
                    targetAccount: key,
                    timestamp: new Date().toISOString(),
                    status: "completed",
                  });
                }
              });
              saveLogs(logs);
            }

            document.getElementById("addUserModal").classList.remove("show");
            if (typeof refreshCurrentPage === "function") refreshCurrentPage();
          } catch (internalErr) {
            console.error("Internal add user error:", internalErr);
            if (errEl) {
              errEl.textContent = "Error saving user: " + internalErr.message;
              errEl.style.display = "block";
            }
          }
        };

        if (profilePicFile) {
          var reader = new FileReader();
          reader.onloadend = function () {
            finalizeAddUser(reader.result);
          };
          reader.onerror = function () {
            finalizeAddUser(null);
          };
          reader.readAsDataURL(profilePicFile);
        } else {
          finalizeAddUser(null);
        }
      } catch (err) {
        console.error("Add user submission error:", err);
        if (errEl) {
          errEl.textContent = "An error occurred: " + err.message;
          errEl.style.display = "block";
        }
      }
    });
  }

  /* ========== EDIT TRANSACTION LOGIC ========== */
  window._adminEditTxn = function (logId) {
    var logs = getLogs();
    var log = logs.find(function (l) {
      return l.id === logId;
    });
    if (!log) return;

    var form = document.getElementById("editTxnForm");
    form.reset();
    document.getElementById("editTxnError").style.display = "none";

    document.getElementById("editTxnLogId").value = log.id;
    document.getElementById("editTxnUserName").value = log.userName;
    document.getElementById("editTxnType").value =
      log.txnType || (log.action === "Deposit" ? "credit" : "debit");
    document.getElementById("editTxnAmount").value = log.amount || 0;
    document.getElementById("editTxnDescription").value =
      log.details || log.action;

    // Format timestamp for datetime-local (YYYY-MM-DDTHH:mm)
    var date = new Date(log.timestamp);
    var pad = function (n) {
      return n < 10 ? "0" + n : n;
    };
    var localTime =
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes());
    document.getElementById("editTxnDateTime").value = localTime;

    document.getElementById("editTxnModal").classList.add("show");
  };

  window._adminDeleteTxn = function (logId) {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This will affect the user's balance.",
      )
    )
      return;
    var logs = getLogs();
    var filtered = logs.filter(function (l) {
      return l.id !== logId;
    });
    saveLogs(filtered);
    refreshCurrentPage();
  };

  var editTxnForm = document.getElementById("editTxnForm");
  if (editTxnForm) {
    editTxnForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var logId = parseInt(document.getElementById("editTxnLogId").value, 10);
      var type = document.getElementById("editTxnType").value;
      var amount = parseFloat(document.getElementById("editTxnAmount").value);
      var details = document.getElementById("editTxnDescription").value;
      var timestamp = document.getElementById("editTxnDateTime").value;

      var logs = getLogs();
      var idx = logs.findIndex(function (l) {
        return l.id === logId;
      });
      if (idx > -1) {
        logs[idx].txnType = type;
        logs[idx].amount = amount;
        logs[idx].details = details;
        logs[idx].timestamp = timestamp
          ? new Date(timestamp).toISOString()
          : logs[idx].timestamp;

        saveLogs(logs);
        document.getElementById("editTxnModal").classList.remove("show");
        refreshCurrentPage();
      }
    });
  }

  ["closeEditTxn", "cancelEditTxn"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("editTxnModal").classList.remove("show");
      });
  });

  /* ========== ADD TRANSACTION MODAL ========== */
  function openTxnModal(preselectedUserId) {
    document.getElementById("addTxnForm").reset();
    document.getElementById("addTxnError").style.display = "none";
    // Populate user dropdown
    var sel = document.getElementById("txnUserId");
    var users = getUsers();
    sel.innerHTML =
      '<option value="">— Select User —</option>' +
      users
        .map(function (u) {
          var selected = u.id === preselectedUserId ? " selected" : "";
          return (
            '<option value="' +
            u.id +
            '"' +
            selected +
            ">" +
            esc(u.firstName + " " + u.lastName) +
            " (" +
            esc(u.email) +
            ")</option>"
          );
        })
        .join("");
    document.getElementById("addTxnModal").classList.add("show");
  }

  var addTxnBtn = document.getElementById("addTxnBtn");
  if (addTxnBtn) {
    addTxnBtn.addEventListener("click", function () {
      openTxnModal(null);
    });
  }
  ["closeAddTxn", "cancelAddTxn"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("addTxnModal").classList.remove("show");
      });
  });

  window._adminAddTxn = function (userId) {
    openTxnModal(userId);
  };

  var addTxnForm = document.getElementById("addTxnForm");
  if (addTxnForm) {
    addTxnForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var errEl = document.getElementById("addTxnError");
      errEl.style.display = "none";

      var userId = Number(document.getElementById("txnUserId").value);
      var txnType = document.getElementById("txnType").value;
      var targetAccount = document.getElementById("txnAccountType").value;
      var amount = parseFloat(document.getElementById("txnAmount").value);
      var description = document.getElementById("txnDescription").value.trim();

      if (!userId) {
        errEl.textContent = "Please select a user.";
        errEl.style.display = "block";
        return;
      }
      if (!amount || amount <= 0) {
        errEl.textContent = "Amount must be greater than 0.";
        errEl.style.display = "block";
        return;
      }

      var users = getUsers();
      var user = users.find(function (u) {
        return u.id === userId;
      });
      if (!user) {
        errEl.textContent = "User not found.";
        errEl.style.display = "block";
        return;
      }

      // Check sufficient balance for debit
      if (txnType === "debit") {
        var currentBal = getUserBalance(userId, targetAccount);
        if (amount > currentBal) {
          errEl.textContent =
            "Insufficient balance in " +
            targetAccount +
            ". Current balance: $" +
            currentBal.toFixed(2);
          errEl.style.display = "block";
          return;
        }
      }

      var action = txnType === "credit" ? "Deposit" : "Withdrawal";
      var logs = getLogs();
      var newLog = {
        id: Date.now(),
        userId: userId,
        userName: user.firstName + " " + user.lastName,
        action: action,
        details: description || (txnType === "credit" ? "Credit" : "Debit"),
        amount: amount,
        txnType: txnType,
        targetAccount: targetAccount,
        timestamp: (function () {
          var dtInput = document.getElementById("addTxnDateTime");
          if (dtInput && dtInput.value)
            return new Date(dtInput.value).toISOString();
          return new Date().toISOString();
        })(),
        status: "completed",
      };
      logs.push(newLog);
      saveLogs(logs);
      saveLogToSupabase(newLog); /* Sync to Supabase so any device can see it */

      document.getElementById("addTxnModal").classList.remove("show");
      refreshCurrentPage();
    });
  }

  /* ========== TRANSACTION HISTORY MODAL ========== */
  window._adminViewHistory = function (userId) {
    var users = getUsers();
    var user = users.find(function (u) {
      return String(u.id) === String(userId);
    });
    if (!user) return;

    _historyCurrentUserId = userId;
    document.getElementById("historyTitle").textContent =
      user.firstName + " " + user.lastName + " — History";

    var txns = getUserTxns(userId);
    var timeline = document.getElementById("historyTimeline");
    var empty = document.getElementById("historyEmpty");
    var summary = document.getElementById("historySummary");

    /* Summary stats */
    var totalCredits = 0,
      totalDebits = 0;
    txns.forEach(function (t) {
      if (t.txnType === "credit") totalCredits += parseFloat(t.amount) || 0;
      else totalDebits += parseFloat(t.amount) || 0;
    });
    var balance = totalCredits - totalDebits;

    summary.innerHTML =
      '<div class="history-stats">' +
      '<div class="hs-item hs-credit"><span>Credits</span><strong>+$' +
      formatNum(totalCredits.toFixed(2)) +
      "</strong></div>" +
      '<div class="hs-item hs-debit"><span>Debits</span><strong>-$' +
      formatNum(totalDebits.toFixed(2)) +
      "</strong></div>" +
      '<div class="hs-item hs-balance"><span>Balance</span><strong>$' +
      formatNum(balance.toFixed(2)) +
      "</strong></div>" +
      "</div>";

    if (txns.length === 0) {
      timeline.innerHTML = "";
      empty.style.display = "block";
      document.getElementById("historyModal").classList.add("show");
      return;
    }
    empty.style.display = "none";

    /* Group by date */
    var groups = {};
    var sorted = txns.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    sorted.forEach(function (t) {
      var d = "";
      try {
        d = new Date(t.timestamp).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {
        d = "Unknown Date";
      }
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    /* Running balance (forward order) */
    var runBal = 0;
    var balMap = {};
    txns
      .slice()
      .sort(function (a, b) {
        return new Date(a.timestamp) - new Date(b.timestamp);
      })
      .forEach(function (t) {
        if (t.txnType === "credit") runBal += parseFloat(t.amount) || 0;
        else runBal -= parseFloat(t.amount) || 0;
        balMap[t.id] = runBal;
      });

    var html = "";
    Object.keys(groups).forEach(function (date) {
      html += '<div class="hist-tl-group">';
      html += '<div class="hist-tl-date">' + date + "</div>";
      groups[date].forEach(function (t) {
        var isCredit = t.txnType === "credit";
        var iconBg = isCredit ? "#e6f9f3" : "#ffeef0";
        var iconColor = isCredit ? "#00a878" : "#e53935";
        var arrow = isCredit
          ? "&#8595;"
          : "&#8593;"; /* green down = in, red up = out */
        var sign = isCredit ? "+" : "-";
        var amtClass = isCredit ? "hist-credit" : "hist-debit";
        var bal =
          balMap[t.id] !== undefined
            ? "$" + formatNum(balMap[t.id].toFixed(2))
            : "";
        var time = "";
        try {
          time = new Date(t.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (e) {}
        var acct = t.targetAccount
          ? ' <span class="hist-acct-tag">' +
            capitalize(t.targetAccount) +
            "</span>"
          : "";

        html +=
          '<div class="hist-tl-item">' +
          '<div class="hist-tl-icon" style="background:' +
          iconBg +
          ";color:" +
          iconColor +
          '">' +
          arrow +
          "</div>" +
          '<div class="hist-tl-body">' +
          '<div class="hist-tl-top">' +
          '<div class="hist-tl-left">' +
          '<span class="hist-tl-action">' +
          esc(t.action || "Transaction") +
          acct +
          "</span>" +
          '<span class="hist-tl-detail">' +
          esc(t.details || "") +
          "</span>" +
          "</div>" +
          '<div class="hist-tl-right">' +
          '<span class="hist-tl-amt ' +
          amtClass +
          '">' +
          sign +
          "$" +
          formatNum((parseFloat(t.amount) || 0).toFixed(2)) +
          "</span>" +
          '<span class="hist-tl-bal">Bal: ' +
          bal +
          "</span>" +
          '<span class="hist-tl-time">' +
          time +
          "</span>" +
          "</div>" +
          "</div>" +
          '<div class="hist-tl-actions">' +
          '<button class="btn-sm blue" onclick="_adminEditTxn(' +
          JSON.stringify(t.id) +
          "," +
          userId +
          ')">Edit</button>' +
          '<button class="btn-sm red" onclick="_adminDeleteTxn(' +
          JSON.stringify(t.id) +
          "," +
          userId +
          ')">Delete</button>' +
          "</div>" +
          "</div>" +
          "</div>";
      });
      html += "</div>";
    });
    timeline.innerHTML = html;
    document.getElementById("historyModal").classList.add("show");
  };

  /* ── Delete transaction ── */
  window._adminDeleteTxn = function (txnId, userId) {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    var logs = getLogs();
    var idx = logs.findIndex(function (l) {
      return l.id === txnId;
    });
    if (idx !== -1) {
      logs.splice(idx, 1);
      saveLogs(logs);
      window._adminViewHistory(userId);
    }
  };

  /* ── Edit transaction ── */
  window._adminEditTxn = function (txnId, userId) {
    var logs = getLogs();
    var txn = logs.find(function (l) {
      return l.id === txnId;
    });
    if (!txn) return;
    var newAmount = prompt(
      "Edit amount (current: $" + txn.amount + "):",
      txn.amount,
    );
    if (newAmount === null) return;
    newAmount = parseFloat(newAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Invalid amount.");
      return;
    }
    var newDesc = prompt(
      "Edit description (current: " + (txn.details || "") + "):",
      txn.details || "",
    );
    if (newDesc === null) return;
    var newDate = prompt(
      "Edit date (YYYY-MM-DD HH:MM, current: " +
        txn.timestamp.slice(0, 16).replace("T", " ") +
        "):",
      txn.timestamp.slice(0, 16).replace("T", " "),
    );
    if (newDate === null) return;
    txn.amount = newAmount;
    txn.details = newDesc;
    if (newDate.trim()) {
      try {
        txn.timestamp = new Date(newDate.trim()).toISOString();
      } catch (e) {}
    }
    saveLogs(logs);
    window._adminViewHistory(userId);
  };

  /* ── Clone user with same transaction history ── */
  window._adminCloneTxn = function (txnId, userId) {
    var users = getUsers();
    var srcUser = users.find(function (u) {
      return u.id === userId;
    });
    if (!srcUser) return;
    var newFirst = prompt("New user first name:", srcUser.firstName);
    if (!newFirst) return;
    var newLast = prompt("New user last name:", srcUser.lastName);
    if (!newLast) return;
    var newEmail = prompt("New user email:");
    if (!newEmail) return;
    var newPass = prompt("New user password (min 6 chars):");
    if (!newPass || newPass.length < 6) {
      alert("Password too short.");
      return;
    }

    // Clone user object
    var newId = Date.now();
    var newUser = JSON.parse(JSON.stringify(srcUser));
    newUser.id = newId;
    newUser.firstName = newFirst.trim();
    newUser.lastName = newLast.trim();
    newUser.email = newEmail.trim().toLowerCase();
    newUser.password = newPass;
    newUser.createdAt = new Date().toISOString();
    newUser.accountNumber = genAcctNum(newId);
    newUser.routingNumber = genRoutingNum();
    users.push(newUser);
    saveUsers(users);

    // Clone all logs for this user with new userId
    var logs = getLogs();
    var srcLogs = logs.filter(function (l) {
      return l.userId === userId;
    });
    srcLogs.forEach(function (l) {
      var newLog = JSON.parse(JSON.stringify(l));
      newLog.id = Date.now() + Math.random();
      newLog.userId = newId;
      newLog.userName = newFirst + " " + newLast;
      logs.push(newLog);
    });
    saveLogs(logs);
    alert("User cloned successfully! New email: " + newEmail);
    refreshCurrentPage();
  };

  /* ── Open Add Transaction modal from within History modal ── */
  var _historyCurrentUserId = null;

  window._adminOpenAddTxnFromHistory = function () {
    if (!_historyCurrentUserId) return;
    // Pre-select user in the add transaction modal
    var userSelect = document.getElementById("addTxnUser");
    if (userSelect) {
      userSelect.value = _historyCurrentUserId;
    }
    document.getElementById("historyModal").classList.remove("show");
    var addModal = document.getElementById("addTxnModal");
    if (addModal) addModal.classList.add("show");
  };

  /* ═══════════════════════════════════════════════════════
     CLONE HISTORY TO NEW ACCOUNT
     Stores the source userId, closes history modal, opens
     Add User modal. After user is saved the history is copied.
  ═══════════════════════════════════════════════════════ */
  var _pendingCloneSourceId = null;

  window._adminCloneHistoryToNewAccount = function () {
    if (!_historyCurrentUserId) return;
    _pendingCloneSourceId = _historyCurrentUserId;

    // Close history modal
    document.getElementById("historyModal").classList.remove("show");

    // Show a banner inside the Add User modal so admin knows why they're creating a user
    var addModal = document.getElementById("addUserModal");
    if (addModal) {
      // Remove any old banner
      var oldBanner = document.getElementById("cloneBanner");
      if (oldBanner) oldBanner.remove();

      var srcUsers = getUsers();
      var srcUser = srcUsers.find(function (u) {
        return u.id === _pendingCloneSourceId;
      });
      var srcName = srcUser
        ? srcUser.firstName + " " + srcUser.lastName
        : "selected account";

      var banner = document.createElement("div");
      banner.id = "cloneBanner";
      banner.style.cssText = [
        "background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:1.5px solid #a5d6a7;",
        "border-radius:12px;padding:14px 18px;margin-bottom:20px;",
        "font-size:.85rem;color:#2e7d32;display:flex;align-items:center;gap:10px",
      ].join("");
      banner.innerHTML =
        '<span class="material-icons-outlined" style="font-size:1.2rem;flex-shrink:0">content_copy</span>' +
        "<span>Cloning transaction history from <strong>" +
        esc(srcName) +
        "</strong>.<br>" +
        "Fill in the new user&#39;s details below. All transactions will be copied automatically once the account is created.</span>";

      // Inject at top of modal body (after modal-header)
      var modalHeader = addModal.querySelector(".modal-header");
      if (modalHeader && modalHeader.nextSibling) {
        addModal
          .querySelector(".modal")
          .insertBefore(banner, modalHeader.nextSibling);
      }

      addModal.classList.add("show");
    }
  };

  /* Hook into the existing Add User save to check if a clone is pending */
  var _origSaveAddUser = null; // will be set below after existing submit handler

  function _applyCloneAfterCreate(newUserId) {
    if (!_pendingCloneSourceId) return;
    var srcId = _pendingCloneSourceId;
    _pendingCloneSourceId = null;

    // Remove clone banner
    var banner = document.getElementById("cloneBanner");
    if (banner) banner.remove();

    var logs = getLogs();
    var srcLogs = logs.filter(function (l) {
      return l.userId === srcId;
    });

    if (srcLogs.length === 0) {
      alert("No transactions found to clone.");
      return;
    }

    // Clone every log with new userId + new timestamps offset preserved
    srcLogs.forEach(function (l) {
      var newLog = JSON.parse(JSON.stringify(l));
      newLog.id = Date.now() + Math.random();
      newLog.userId = newUserId;
      var users = getUsers();
      var newUser = users.find(function (u) {
        return u.id === newUserId;
      });
      newLog.userName = newUser
        ? newUser.firstName + " " + newUser.lastName
        : newLog.userName;
      logs.push(newLog);
    });
    saveLogs(logs);
    alert(
      "Transaction history successfully cloned to the new account! (" +
        srcLogs.length +
        " transactions copied)",
    );
  }

  /* Expose so the add-user submit handler can call it */
  window._applyCloneAfterCreate = _applyCloneAfterCreate;

  ["closeHistory"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el)
      el.addEventListener("click", function () {
        document.getElementById("historyModal").classList.remove("show");
      });
  });

  /* ==========================================================
     CHART PERIOD FILTER
     ========================================================== */
  var chartPeriodEl = document.getElementById("chartPeriodFilter");
  if (chartPeriodEl) {
    chartPeriodEl.addEventListener("change", function () {
      var logs = getLogs();
      renderChart(logs, parseInt(this.value, 10));
    });
  }

  /* ==========================================================
     INITIAL RENDER — Dashboard
     ========================================================== */
  pageRenderers.dashboard();

  // Also set review badge on load
  var users = getUsers();
  var pendingCount = users.filter(function (u) {
    return (u.status || "active") === "pending";
  }).length;
  var badge = document.getElementById("reviewBadge");
  if (badge)
    badge.textContent = pendingCount < 10 ? "0" + pendingCount : pendingCount;
})();

function showToast(msg, type) {
  var t = document.createElement("div");
  t.style.cssText =
    "position:fixed;bottom:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:12px;font-size:.88rem;font-weight:600;color:white;box-shadow:0 6px 20px rgba(0,0,0,.2);max-width:320px;animation:fadeInUp .3s ease";
  t.style.background = type === "success" ? "#00a878" : "#e53935";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () {
    t.remove();
  }, 3500);
}
