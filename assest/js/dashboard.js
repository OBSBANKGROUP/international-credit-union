document.addEventListener("DOMContentLoaded", function () {
  var SESSION_KEY = "icu_session";
  var SUPABASE_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
  var SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";

  var HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
  };

  function formatCurrency(n) {
    return (
      "$" +
      parseFloat(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  /* ── Session ── */
  var session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  if (window.checkSuspended && window.checkSuspended()) return;

  /* ── Show loading spinner ── */
  var spinner = document.createElement("div");
  spinner.id = "_dbSpinner";
  spinner.style.cssText =
    "position:fixed;inset:0;background:rgba(2,22,51,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;color:white;font-family:Inter,sans-serif;gap:16px";
  spinner.innerHTML =
    '<div style="width:44px;height:44px;border:3px solid rgba(255,255,255,.2);border-top-color:#4b38f5;border-radius:50%;animation:spin .8s linear infinite"></div><div style="font-size:.9rem;opacity:.75">Loading your account...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(spinner);

  function hideSpinner() {
    var el = document.getElementById("_dbSpinner");
    if (el) el.remove();
  }

  /* ── Fetch user directly from Supabase by email ── */
  function fetchUser() {
    var email = session.email || "";
    if (!email) return Promise.reject("no email in session");
    return fetch(
      SUPABASE_URL +
        "/rest/v1/users?email=eq." +
        encodeURIComponent(email.toLowerCase().trim()) +
        "&select=*",
      { headers: HEADERS },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) throw new Error("User not found in database");
        return rows[0];
      });
  }

  /* ── Fetch logs for this user from Supabase ── */
  function fetchLogs(userId) {
    return fetch(
      SUPABASE_URL +
        "/rest/v1/logs?user_id=eq." +
        userId +
        "&order=timestamp.desc&select=*",
      { headers: HEADERS },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (rows) {
        return Array.isArray(rows) ? rows : [];
      });
  }

  /* ── Convert Supabase row to app format ── */
  function toUser(row) {
    var u = {
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
    };
    if (row.data && typeof row.data === "object") Object.assign(u, row.data);
    return u;
  }

  function toLog(row) {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      details: row.details,
      amount: row.amount,
      txnType: row.txn_type,
      targetAccount: row.target_account,
      timestamp: row.timestamp,
      status: row.status,
      txnId: row.txn_id,
    };
  }

  /* ── Main: fetch from Supabase then render ── */
  fetchUser()
    .then(function (rawUser) {
      var currentUser = toUser(rawUser);

      /* Update session with real Supabase ID */
      session.id = currentUser.id;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      /* Also cache user in localStorage for other pages */
      var cached = JSON.parse(localStorage.getItem("icu_users") || "[]");
      var idx = cached.findIndex(function (u) {
        return u.email === currentUser.email;
      });
      if (idx >= 0) cached[idx] = currentUser;
      else cached.push(currentUser);
      localStorage.setItem("icu_users", JSON.stringify(cached));

      return fetchLogs(currentUser.id).then(function (rawLogs) {
        var logs = rawLogs.map(toLog);

        /* Cache logs too */
        localStorage.setItem("icu_activity_log", JSON.stringify(logs));

        renderDashboard(currentUser, logs);
        hideSpinner();
      });
    })
    .catch(function (err) {
      console.error("Dashboard load error:", err);
      /* Fallback to localStorage if Supabase fails */
      var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
      var user = users.find(function (u) {
        return (
          (u.email || "").toLowerCase() ===
            (session.email || "").toLowerCase() ||
          String(u.id) === String(session.id)
        );
      });
      if (!user) {
        hideSpinner();
        window.location.href = "index.html";
        return;
      }
      var logs = JSON.parse(localStorage.getItem("icu_activity_log") || "[]");
      renderDashboard(user, logs);
      hideSpinner();
    });

  /* ── Render dashboard with user + logs ── */
  function renderDashboard(currentUser, logs) {
    var primary = (currentUser.accountType || "checking").toLowerCase();
    var uid = currentUser.id;

    /* Balance calc */
    function calcBalance(type) {
      /* Logs are already filtered by user_id in Supabase query */
      var bal = 0;
      logs.forEach(function (l) {
        if (!l.amount) return;
        var acct = (l.targetAccount || primary).toLowerCase();
        if (type && acct !== type) return;
        if (l.txnType === "credit") bal += parseFloat(l.amount);
        else if (l.txnType === "debit") bal -= parseFloat(l.amount);
      });
      return bal;
    }

    var checkingBal = calcBalance("checking");
    var savingsBal = calcBalance("savings");
    var totalBal = 0;
    logs.forEach(function (l) {
      if (!l.amount) return; /* logs already filtered by user */
      if (l.txnType === "credit") totalBal += parseFloat(l.amount);
      else if (l.txnType === "debit") totalBal -= parseFloat(l.amount);
    });

    /* ── User info ── */
    document
      .querySelectorAll(".user-name, .welcome-name")
      .forEach(function (el) {
        el.textContent = currentUser.firstName || "Member";
      });
    document.querySelectorAll(".user-email").forEach(function (el) {
      el.textContent = currentUser.email || "";
    });
    document.querySelectorAll(".user-initials").forEach(function (el) {
      el.textContent = (
        (currentUser.firstName || "?")[0] + (currentUser.lastName || "?")[0]
      ).toUpperCase();
    });

    /* ── Balances ── */
    /* Total balance — update all matching elements */
    var totalEls = document.querySelectorAll(
      "#totalBalance,.total-balance,.balance-amount,.bal-amount,#panelBalance,.balance",
    );
    totalEls.forEach(function (el) {
      el.textContent = formatCurrency(totalBal);
    });

    var ckEl = document.getElementById("acctBal_checking");
    var svEl = document.getElementById("acctBal_savings");
    var bzEl = document.getElementById("acctBal_business");
    if (ckEl) ckEl.textContent = formatCurrency(checkingBal);
    if (svEl) svEl.textContent = formatCurrency(savingsBal);

    /* Business balance — logs are already filtered by user from Supabase */
    var businessBal = 0;
    logs.forEach(function (l) {
      if (!l.amount) return;
      var ta = (l.targetAccount || "").toLowerCase();
      /* Match "business", "business_0", "business_1", etc */
      if (ta && (ta === "business" || ta.indexOf("business") === 0)) {
        if (l.txnType === "credit") businessBal += parseFloat(l.amount);
        else if (l.txnType === "debit") businessBal -= parseFloat(l.amount);
      }
    });
    if (bzEl) bzEl.textContent = formatCurrency(businessBal);
    /* Always show the business box */
    var bizBox = document.getElementById("acctBox_business");
    if (bizBox) bizBox.style.display = "";

    /* Generic account boxes fallback */
    var boxes = document.querySelectorAll(".account-balance,.acct-bal");
    if (boxes[0] && !ckEl) boxes[0].textContent = formatCurrency(checkingBal);
    if (boxes[1] && !svEl) boxes[1].textContent = formatCurrency(savingsBal);

    /* Account number */
    var last4 = currentUser.accountNumber
      ? String(currentUser.accountNumber).slice(-4)
      : "----";
    document
      .querySelectorAll(".account-number,.acct-number,.user-acct-num")
      .forEach(function (el) {
        el.textContent = "•••• " + last4;
      });

    /* User name on ATM card overlay */
    var cardFullName = (
      (currentUser.firstName || "") +
      " " +
      (currentUser.lastName || "")
    )
      .trim()
      .toUpperCase();
    document
      .querySelectorAll(".db-atm-name.user-name, .db-card-name.user-name")
      .forEach(function (el) {
        el.textContent = cardFullName || "MEMBER NAME";
      });

    /* Business card — show if user has a business account */
    var bizCardEl = document.getElementById("businessCardEl");
    var bizCardName = document.getElementById("bizCardName");
    var accts = currentUser.accounts || {};
    var bizKeys = Object.keys(accts).filter(function (k) {
      return k !== "checking" && k !== "savings" && accts[k];
    });
    var hasBizAcct = bizKeys.length > 0 || !!currentUser.businessName;
    if (hasBizAcct) {
      if (bizCardEl) bizCardEl.style.display = "";
      if (bizCardName) {
        var bName = "";
        if (bizKeys.length > 0) {
          var bk = accts[bizKeys[0]];
          bName =
            typeof bk === "object" && bk.name
              ? bk.name
              : currentUser.businessName || "";
        } else {
          bName = currentUser.businessName || "";
        }
        bizCardName.textContent = bName.toUpperCase() || "BUSINESS";
      }
    }

    /* User pic in menu */
    var menuAvatar = document.getElementById("menuAvatar");
    if (menuAvatar && currentUser.profilePic)
      menuAvatar.src = currentUser.profilePic;

    /* Update user pic on hero too */
    var heroPic = document.querySelector(".db-user-pic");
    if (heroPic && currentUser.profilePic) heroPic.src = currentUser.profilePic;

    /* ── Transactions — show last 10 on dashboard ── */
    var userLogs = logs
      .filter(function (l) {
        return l.amount;
      }) /* logs pre-filtered by Supabase */
      .sort(function (a, b) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

    var txnList =
      document.getElementById("dashTxnList") ||
      document.querySelector(
        ".transaction-list,.history-list,#transactionList,.recent-txns",
      );

    if (txnList) {
      if (userLogs.length === 0) {
        txnList.innerHTML =
          '<div class="empty-box">' +
          "<p>No transactions yet.</p>" +
          "<span>Your activity will appear here.</span>" +
          "</div>";
      } else {
        txnList.innerHTML = "";
        /* Show last 10 only */
        userLogs.slice(0, 10).forEach(function (l) {
          var isCredit = l.txnType === "credit";
          var date = "";
          try {
            date = new Date(l.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          } catch (e) {
            date = "";
          }
          var div = document.createElement("div");
          div.className = "history-card";
          div.innerHTML =
            '<div class="history-left">' +
            '<div class="txn-icon ' +
            (isCredit ? "txn-icon-credit" : "txn-icon-debit") +
            '">' +
            (isCredit ? "&#8593;" : "&#8595;") +
            "</div>" +
            '<div class="history-text-col">' +
            '<span class="history-title">' +
            (l.action || "Transaction") +
            "</span>" +
            '<span class="history-detail">' +
            (l.details || "") +
            "</span>" +
            '<span class="history-date">' +
            date +
            "</span>" +
            "</div>" +
            "</div>" +
            '<div class="txn-amount-col">' +
            '<span class="' +
            (isCredit ? "txn-credit" : "txn-debit") +
            '">' +
            (isCredit ? "+" : "-") +
            formatCurrency(Math.abs(l.amount)) +
            "</span>" +
            "</div>";
          txnList.appendChild(div);
        });

        /* See More link — only show if more than 10 */
        if (userLogs.length > 10) {
          var seeMore = document.getElementById("seeMoreTxn");
          if (seeMore) seeMore.style.display = "";
        } else {
          var seeMore = document.getElementById("seeMoreTxn");
          if (seeMore) seeMore.textContent = "View All";
        }
      }
    }

    /* ── Session timer ── */
    if (window.startSessionTimer) window.startSessionTimer();

    /* ── NOTIFICATION SYSTEM ── */
    function buildNotifications(logs, uid) {
      /* Save each transaction as a notification in localStorage */
      var stored = JSON.parse(
        localStorage.getItem("icu_notifications") || "[]",
      );
      var storedIds = stored.map(function (n) {
        return n.id;
      });
      var newOnes = [];

      logs
        .filter(function (l) {
          return l.amount;
        })
        .forEach(function (l) {
          var nid = "txn_" + l.id;
          if (storedIds.indexOf(nid) === -1) {
            var isCredit = l.txnType === "credit";
            newOnes.push({
              id: nid,
              type: isCredit ? "credit" : "debit",
              title: l.action || "Transaction",
              desc:
                (isCredit ? "+" : "-") +
                formatCurrency(Math.abs(l.amount)) +
                " — " +
                (l.details || ""),
              time: l.timestamp,
              read: false,
            });
          }
        });

      /* Add new ones at the front */
      stored = newOnes.concat(stored).slice(0, 50);
      localStorage.setItem("icu_notifications", JSON.stringify(stored));
      return stored;
    }

    var allNotifs = buildNotifications(logs, uid);
    var unreadCount = allNotifs.filter(function (n) {
      return !n.read;
    }).length;

    /* Update badge */
    var notifDot = document.getElementById("notifDot");
    var notifBadge = document.querySelector(".notif-badge");
    if (unreadCount > 0) {
      if (notifDot) notifDot.style.display = "block";
      if (notifBadge)
        notifBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    }

    /* Build notification panel */
    var notifPanel = document.getElementById("notifPanel");
    if (!notifPanel) {
      notifPanel = document.createElement("div");
      notifPanel.id = "notifPanel";
      notifPanel.className = "notif-panel";
      notifPanel.innerHTML =
        '<div class="notif-panel-head">' +
        "<h4>Notifications</h4>" +
        '<button class="notif-clear" id="notifClearBtn">Mark all read</button>' +
        "</div>" +
        '<div class="notif-list" id="notifList"></div>';
      document.body.appendChild(notifPanel);
    }

    function renderNotifList() {
      var stored = JSON.parse(
        localStorage.getItem("icu_notifications") || "[]",
      );
      var listEl = document.getElementById("notifList");
      if (!listEl) return;
      if (stored.length === 0) {
        listEl.innerHTML =
          '<div class="notif-empty">No notifications yet</div>';
        return;
      }
      listEl.innerHTML = "";
      stored.slice(0, 20).forEach(function (n) {
        var timeStr = "";
        try {
          timeStr =
            new Date(n.time).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) +
            " " +
            new Date(n.time).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
        } catch (e) {
          timeStr = n.time || "";
        }
        var iconClass =
          n.type === "credit"
            ? "credit"
            : n.type === "debit"
              ? "debit"
              : "info";
        var iconChar =
          n.type === "credit"
            ? "&#8593;"
            : n.type === "debit"
              ? "&#8595;"
              : "&#x2139;";
        var item = document.createElement("div");
        item.className = "notif-item" + (n.read ? "" : " unread");
        item.innerHTML =
          '<div class="notif-dot-icon ' +
          iconClass +
          '">' +
          iconChar +
          "</div>" +
          '<div class="notif-body">' +
          '<div class="notif-title">' +
          n.title +
          "</div>" +
          '<div class="notif-desc">' +
          n.desc +
          "</div>" +
          '<span class="notif-time">' +
          timeStr +
          "</span>" +
          "</div>";
        listEl.appendChild(item);
      });
    }
    renderNotifList();

    /* Bell button toggle */
    var notifBtn = document.getElementById("notifyBtn");
    if (notifBtn) {
      notifBtn.onclick = function (e) {
        e.stopPropagation();
        notifPanel.classList.toggle("open");
        /* Mark all as read when opened */
        if (notifPanel.classList.contains("open")) {
          var stored = JSON.parse(
            localStorage.getItem("icu_notifications") || "[]",
          );
          stored.forEach(function (n) {
            n.read = true;
          });
          localStorage.setItem("icu_notifications", JSON.stringify(stored));
          if (notifDot) notifDot.style.display = "none";
          if (notifBadge) notifBadge.textContent = "";
          renderNotifList();
        }
      };
      document.addEventListener("click", function (e) {
        if (
          notifPanel &&
          !notifPanel.contains(e.target) &&
          e.target !== notifBtn
        ) {
          notifPanel.classList.remove("open");
        }
      });
    }

    /* Clear button */
    document.addEventListener("click", function (e) {
      if (e.target && e.target.id === "notifClearBtn") {
        localStorage.removeItem("icu_notifications");
        renderNotifList();
        if (notifDot) notifDot.style.display = "none";
      }
    });

    /* ── Hide/Show balance eye button ── */
    var eyeBtn = document.getElementById("eyeBtn");
    var totalEl2 = document.getElementById("totalBalance");
    var panelBal2 = document.getElementById("panelBalance");
    var balHidden = false;
    if (eyeBtn) {
      eyeBtn.addEventListener("click", function () {
        balHidden = !balHidden;
        var mask = "••••••";
        if (balHidden) {
          if (totalEl2) {
            eyeBtn._savedTotal = totalEl2.textContent;
            totalEl2.textContent = mask;
          }
          if (panelBal2) {
            eyeBtn._savedPanel = panelBal2.textContent;
            panelBal2.textContent = mask;
          }
          eyeBtn.innerHTML =
            '<span class="material-icons-outlined" style="font-size:1rem">visibility_off</span>';
        } else {
          if (totalEl2 && eyeBtn._savedTotal)
            totalEl2.textContent = eyeBtn._savedTotal;
          if (panelBal2 && eyeBtn._savedPanel)
            panelBal2.textContent = eyeBtn._savedPanel;
          eyeBtn.innerHTML =
            '<span class="material-icons-outlined" style="font-size:1rem">visibility</span>';
        }
      });
    }

    /* ── Profile button → menu panel toggle ── */
    var profileBtn = document.getElementById("profileBtn");
    var menuPanel = document.getElementById("menuPanel");
    if (profileBtn && menuPanel) {
      profileBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        menuPanel.classList.toggle("open");
      });
    }

    /* ── Logout buttons ── */
    document
      .querySelectorAll(".logout-btn, #logoutBtn, .sign-out-btn")
      .forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          localStorage.removeItem("icu_session");
          window.location.href = "index.html";
        });
      });

    /* ── Link Account button → show modal ── */
    var linkBtn = document.getElementById("linkAccountBtn");
    var linkModal = document.getElementById("linkAccountModal");
    if (linkBtn && linkModal) {
      linkBtn.addEventListener("click", function (e) {
        e.preventDefault();
        linkModal.classList.remove("hidden");
        linkModal.style.display = "flex";
      });
    }
    /* Close modals on overlay click */
    document.querySelectorAll(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        if (e.target === m) {
          m.classList.add("hidden");
          m.style.display = "none";
        }
      });
    });

    /* ── Switch / Business Mode buttons → go to manage account ── */
    ["switchBtn", "switchBtnCard"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", function () {
          window.location.href = "bussiness-dashboard.html";
        });
      }
    });

    /* ── Dark mode toggle ── */
    if (window._initThemeToggle) {
      window._initThemeToggle("darkToggle");
    } else {
      /* Fallback if theme.js didn't expose _initThemeToggle */
      var darkTgl = document.getElementById("darkToggle");
      if (darkTgl) {
        var savedTheme = localStorage.getItem("icu_theme") || "light";
        darkTgl.checked = savedTheme === "dark";
        darkTgl.addEventListener("change", function () {
          if (darkTgl.checked) {
            document.body.classList.add("dark-mode");
            localStorage.setItem("icu_theme", "dark");
          } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("icu_theme", "light");
          }
        });
      }
    }

    /* ── Hamburger / Slide Menu ── */
    var menuBtn = document.getElementById("menuBtn");
    var menuPanel2 = document.getElementById("menuPanel");
    var menuOverlay = document.getElementById("menuOverlay");
    var menuCloseEl = document.getElementById("menuCloseBtn");
    function openMenu() {
      if (menuPanel2) menuPanel2.classList.add("open");
      if (menuOverlay) menuOverlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function closeMenu() {
      if (menuPanel2) menuPanel2.classList.remove("open");
      if (menuOverlay) menuOverlay.classList.remove("open");
      document.body.style.overflow = "";
    }
    if (menuBtn)
      menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openMenu();
      });
    if (menuCloseEl) menuCloseEl.addEventListener("click", closeMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);
    if (document.getElementById("profileBtn"))
      document
        .getElementById("profileBtn")
        .addEventListener("click", function (e) {
          e.stopPropagation();
          openMenu();
        });
  }
});
