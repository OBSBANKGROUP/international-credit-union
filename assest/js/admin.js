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
  function genAcctNum(id) {
    return "ICU-" + ("00000000" + id).slice(-8);
  }

  /* ---------- Balance Calculator ---------- */
  function getUserBalance(userId) {
    var logs = getLogs();
    var balance = 0;
    logs.forEach(function (l) {
      if (l.userId === userId && l.amount) {
        if (l.txnType === "credit") balance += l.amount;
        else if (l.txnType === "debit") balance -= l.amount;
      }
    });
    return balance;
  }

  function getUserTxns(userId) {
    var logs = getLogs();
    return logs.filter(function (l) {
      return l.userId === userId && l.amount;
    });
  }

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
          esc(u.phone || "—") +
          "</td>" +
          "<td>" +
          formatDate(u.createdAt) +
          "</td>" +
          '<td><span class="badge ' +
          st +
          '">' +
          capitalize(st) +
          "</span></td>" +
          '<td><div class="action-btns">' +
          '<button class="btn-sm blue" onclick="window._adminViewUser(' +
          u.id +
          ')">View</button>' +
          "</div></td>" +
          "</tr>"
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
  pageRenderers.accounts = function () {
    var users = getUsers();

    // Count account types (simulated from user data or stored)
    var checking = 0,
      savings = 0,
      business = 0;
    users.forEach(function (u) {
      var type = (u.accountType || "checking").toLowerCase();
      if (type === "checking") checking++;
      else if (type === "savings") savings++;
      else if (type === "business") business++;
      else checking++;
    });

    setText("acctTotal", users.length);
    setText("acctChecking", checking);
    setText("acctSavings", savings);
    setText("acctBusiness", business);
    setText(
      "acctCount",
      users.length + " account" + (users.length !== 1 ? "s" : ""),
    );

    var body = document.getElementById("accountsBody");
    var empty = document.getElementById("accountsEmpty");

    if (users.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    body.innerHTML = users
      .map(function (u) {
        var type = capitalize(u.accountType || "Checking");
        var balance = "$" + formatNum(getUserBalance(u.id).toFixed(2));
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
          esc(genAcctNum(u.id)) +
          "</td>" +
          "<td>" +
          esc(type) +
          "</td>" +
          "<td>" +
          balance +
          "</td>" +
          "<td>" +
          formatDate(u.createdAt) +
          "</td>" +
          '<td><span class="badge ' +
          st +
          '">' +
          capitalize(st) +
          "</span></td>" +
          '<td><div class="action-btns">' +
          '<button class="btn-sm green" onclick="window._adminAddTxn(' +
          u.id +
          ')">Add Txn</button>' +
          '<button class="btn-sm blue" onclick="window._adminViewHistory(' +
          u.id +
          ')">History</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  };

  /* ----------------------------------------------------------
     TRANSACTIONS (activity log)
     ---------------------------------------------------------- */
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

    body.innerHTML = filtered
      .slice(0, 100)
      .map(function (l) {
        var badge = actionBadge(l.action);
        return (
          "<tr>" +
          '<td><div class="user-cell"><div class="cl-avatar" style="width:32px;height:32px;font-size:.72rem">' +
          esc((l.userName || "?")[0]) +
          '</div><span class="customer-name">' +
          esc(l.userName || "Unknown") +
          "</span></div></td>" +
          "<td>" +
          esc(l.action) +
          "</td>" +
          "<td>" +
          esc(l.details || "—") +
          "</td>" +
          "<td>#" +
          l.id +
          "</td>" +
          "<td>" +
          formatDateTime(l.timestamp) +
          "</td>" +
          '<td><span class="badge ' +
          badge +
          '">' +
          capitalize(l.status || "completed") +
          "</span></td>" +
          "</tr>"
        );
      })
      .join("");
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
        var amount = "$" + formatNum(Math.floor(Math.random() * 5000 + 100));
        var method = ["Wire", "ACH", "Card", "Internal"][
          Math.floor(Math.random() * 4)
        ];
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
          esc(u.phone || "—") +
          "</td>" +
          "<td>" +
          capitalize(u.accountType || "Checking") +
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
    document.getElementById("editStatus").value = u.status || "active";
    document.getElementById("editPassword").value = "";

    document.getElementById("editModal").classList.add("show");
  };

  /* Close modal */
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
      users[idx].status = document.getElementById("editStatus").value;

      var newPass = document.getElementById("editPassword").value;
      if (newPass) users[idx].password = newPass;

      saveUsers(users);
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
    if (!confirm("Permanently delete this user? This cannot be undone."))
      return;
    var users = getUsers();
    var u = users.find(function (x) {
      return x.id === id;
    });
    var name = u ? u.firstName + " " + u.lastName : "Unknown";
    users = users.filter(function (x) {
      return x.id !== id;
    });
    saveUsers(users);
    addLog(id, name, "Account Deleted", "Admin permanently deleted account");
    refreshCurrentPage();
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
      document.getElementById("addUserModal").classList.add("show");
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
      errEl.style.display = "none";

      var firstName = document.getElementById("addFirstName").value.trim();
      var lastName = document.getElementById("addLastName").value.trim();
      var email = document
        .getElementById("addEmail")
        .value.trim()
        .toLowerCase();
      var phone = document.getElementById("addPhone").value.trim();
      var accountType = document.getElementById("addAccountType").value;
      var deposit =
        parseFloat(document.getElementById("addDeposit").value) || 0;
      var password = document.getElementById("addPassword").value;
      var confirmPw = document.getElementById("addConfirmPassword").value;

      if (!firstName || !lastName) {
        errEl.textContent = "First and last name are required.";
        errEl.style.display = "block";
        return;
      }
      if (!email) {
        errEl.textContent = "Email is required.";
        errEl.style.display = "block";
        return;
      }
      if (password.length < 6) {
        errEl.textContent = "Password must be at least 6 characters.";
        errEl.style.display = "block";
        return;
      }
      if (password !== confirmPw) {
        errEl.textContent = "Passwords do not match.";
        errEl.style.display = "block";
        return;
      }

      var users = getUsers();
      if (
        users.find(function (u) {
          return u.email === email;
        })
      ) {
        errEl.textContent = "A user with this email already exists.";
        errEl.style.display = "block";
        return;
      }

      var newUser = {
        id: Date.now(),
        firstName: firstName,
        lastName: lastName,
        email: email,
        contactEmail: email,
        phone: phone,
        password: password,
        accountType: accountType,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      saveUsers(users);

      addLog(
        newUser.id,
        firstName + " " + lastName,
        "Account Created",
        "Admin created " + accountType + " account",
      );

      // Add initial deposit as a credit transaction
      if (deposit > 0) {
        var logs = getLogs();
        logs.push({
          id: Date.now() + 1,
          userId: newUser.id,
          userName: firstName + " " + lastName,
          action: "Deposit",
          details: "Initial deposit",
          amount: deposit,
          txnType: "credit",
          timestamp: new Date().toISOString(),
          status: "completed",
        });
        saveLogs(logs);
      }

      document.getElementById("addUserModal").classList.remove("show");
      refreshCurrentPage();
    });
  }

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
        var currentBal = getUserBalance(userId);
        if (amount > currentBal) {
          errEl.textContent =
            "Insufficient balance. Current balance: $" + currentBal.toFixed(2);
          errEl.style.display = "block";
          return;
        }
      }

      var action = txnType === "credit" ? "Deposit" : "Withdrawal";
      var logs = getLogs();
      logs.push({
        id: Date.now(),
        userId: userId,
        userName: user.firstName + " " + user.lastName,
        action: action,
        details: description || (txnType === "credit" ? "Credit" : "Debit"),
        amount: amount,
        txnType: txnType,
        timestamp: new Date().toISOString(),
        status: "completed",
      });
      saveLogs(logs);

      document.getElementById("addTxnModal").classList.remove("show");
      refreshCurrentPage();
    });
  }

  /* ========== TRANSACTION HISTORY MODAL ========== */
  window._adminViewHistory = function (userId) {
    var users = getUsers();
    var user = users.find(function (u) {
      return u.id === userId;
    });
    if (!user) return;

    document.getElementById("historyTitle").textContent =
      "Transaction History — " + user.firstName + " " + user.lastName;

    var txns = getUserTxns(userId);
    var body = document.getElementById("historyBody");
    var empty = document.getElementById("historyEmpty");
    var summary = document.getElementById("historySummary");

    var totalCredits = 0,
      totalDebits = 0;
    txns.forEach(function (t) {
      if (t.txnType === "credit") totalCredits += t.amount;
      else totalDebits += t.amount;
    });
    var balance = totalCredits - totalDebits;

    summary.innerHTML =
      '<div class="history-stats">' +
      '<div class="hs-item hs-credit"><span>Total Credits</span><strong>$' +
      formatNum(totalCredits.toFixed(2)) +
      "</strong></div>" +
      '<div class="hs-item hs-debit"><span>Total Debits</span><strong>$' +
      formatNum(totalDebits.toFixed(2)) +
      "</strong></div>" +
      '<div class="hs-item hs-balance"><span>Balance</span><strong>$' +
      formatNum(balance.toFixed(2)) +
      "</strong></div>" +
      "</div>";

    if (txns.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
    } else {
      empty.style.display = "none";
      var runBal = 0;
      body.innerHTML = txns
        .map(function (t) {
          if (t.txnType === "credit") runBal += t.amount;
          else runBal -= t.amount;
          var cls = t.txnType === "credit" ? "txn-credit" : "txn-debit";
          var sign = t.txnType === "credit" ? "+" : "-";
          return (
            "<tr>" +
            "<td>" +
            formatDateTime(t.timestamp) +
            "</td>" +
            '<td><span class="badge ' +
            (t.txnType === "credit" ? "approved" : "cancelled") +
            '">' +
            capitalize(t.txnType) +
            "</span></td>" +
            "<td>" +
            esc(t.details || "—") +
            "</td>" +
            '<td class="' +
            cls +
            '">' +
            sign +
            "$" +
            formatNum(t.amount.toFixed(2)) +
            "</td>" +
            "<td>$" +
            formatNum(runBal.toFixed(2)) +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    document.getElementById("historyModal").classList.add("show");
  };

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
