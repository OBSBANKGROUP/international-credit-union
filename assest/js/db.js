/* ================================================================
   ICU DATABASE LAYER — Supabase
   Replaces localStorage for users, logs and sessions.
   All other code (auth.js, admin.js, dashboard.js etc.)
   calls the same getUsers / saveUsers / getLogs / saveLogs
   functions as before — this file intercepts them and talks
   to Supabase instead.
================================================================ */

(function () {
  "use strict";

  var SUPABASE_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
  var SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";

  var HEADERS = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    Prefer: "return=representation",
  };

  /* ── Generic fetch helpers ── */
  function api(path, options) {
    return fetch(
      SUPABASE_URL + "/rest/v1/" + path,
      Object.assign({ headers: HEADERS }, options),
    ).then(function (r) {
      return r.json();
    });
  }

  function get(table, params) {
    return api(table + "?" + (params || ""), { method: "GET" });
  }

  function post(table, body) {
    return api(table, { method: "POST", body: JSON.stringify(body) });
  }

  function patch(table, filter, body) {
    return api(table + "?" + filter, {
      method: "PATCH",
      headers: Object.assign({}, HEADERS, { Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
  }

  function del(table, filter) {
    return api(table + "?" + filter, { method: "DELETE" });
  }

  /* ================================================================
     USER FUNCTIONS
  ================================================================ */

  /* Convert Supabase row → app user object */
  function rowToUser(row) {
    if (!row) return null;
    var base = {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      accountNumber: row.account_number,
      routingNumber: row.routing_number,
      accountType: row.account_type,
      accounts: row.accounts,
      status: row.status || "active",
      transactionPin: row.transaction_pin,
      businessName: row.business_name,
      profilePic: row.profile_pic,
      createdAt: row.created_at,
    };
    // Merge any extra fields stored in data column
    if (row.data && typeof row.data === "object") {
      Object.assign(base, row.data);
    }
    return base;
  }

  /* Convert app user object → Supabase row */
  function userToRow(user) {
    var core = {
      email: (user.email || "").toLowerCase().trim(),
      password: user.password || "",
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      account_number: user.accountNumber || "",
      routing_number: user.routingNumber || "021000021",
      account_type: user.accountType || "checking",
      accounts: user.accounts || null,
      status: user.status || "active",
      transaction_pin: user.transactionPin || "",
      business_name: user.businessName || "",
      profile_pic: user.profilePic || null,
    };
    // Store any extra fields in the data column
    var extra = {};
    var coreKeys = [
      "id",
      "email",
      "password",
      "firstName",
      "lastName",
      "accountNumber",
      "routingNumber",
      "accountType",
      "accounts",
      "status",
      "transactionPin",
      "businessName",
      "profilePic",
      "createdAt",
    ];
    Object.keys(user).forEach(function (k) {
      if (coreKeys.indexOf(k) === -1) extra[k] = user[k];
    });
    if (Object.keys(extra).length) core.data = extra;
    return core;
  }

  /* Get all users */
  window._dbGetUsers = function () {
    return get("users", "select=*&order=id.asc").then(function (rows) {
      return Array.isArray(rows) ? rows.map(rowToUser) : [];
    });
  };

  /* Get single user by email */
  window._dbGetUserByEmail = function (email) {
    return get(
      "users",
      "email=eq." +
        encodeURIComponent((email || "").toLowerCase().trim()) +
        "&select=*",
    ).then(function (rows) {
      return rows && rows[0] ? rowToUser(rows[0]) : null;
    });
  };

  /* Get single user by id */
  window._dbGetUserById = function (id) {
    return get("users", "id=eq." + id + "&select=*").then(function (rows) {
      return rows && rows[0] ? rowToUser(rows[0]) : null;
    });
  };

  /* Create user — returns new user with id */
  window._dbCreateUser = function (user) {
    var row = userToRow(user);
    return post("users", row).then(function (rows) {
      return rows && rows[0] ? rowToUser(rows[0]) : null;
    });
  };

  /* Update user */
  window._dbUpdateUser = function (id, updates) {
    // If updates is a full user object, convert it
    var row =
      updates.firstName !== undefined || updates.email !== undefined
        ? userToRow(updates)
        : updates;
    return patch("users", "id=eq." + id, row).then(function (rows) {
      return rows && rows[0] ? rowToUser(rows[0]) : null;
    });
  };

  /* Delete user */
  window._dbDeleteUser = function (id) {
    return del("users", "id=eq." + id);
  };

  /* Save all users (admin bulk save) */
  window._dbSaveAllUsers = function (users) {
    // Upsert all — update existing, insert new
    var rows = users.map(userToRow);
    // Add id back for upsert
    users.forEach(function (u, i) {
      if (u.id) rows[i].id = u.id;
    });
    return api("users", {
      method: "POST",
      headers: Object.assign({}, HEADERS, {
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(rows),
    });
  };

  /* ================================================================
     LOG FUNCTIONS
  ================================================================ */

  function rowToLog(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      details: row.details,
      reason: row.reason,
      amount: row.amount,
      txnType: row.txn_type,
      targetAccount: row.target_account,
      timestamp: row.timestamp,
      status: row.status,
      txnId: row.txn_id,
    };
  }

  function logToRow(log) {
    return {
      user_id: log.userId,
      user_name: log.userName || "",
      action: log.action || "",
      details: log.details || "",
      reason: log.reason || "",
      amount: parseFloat(log.amount) || 0,
      txn_type: log.txnType || "debit",
      target_account: log.targetAccount || null,
      timestamp: log.timestamp || new Date().toISOString(),
      status: log.status || "completed",
      txn_id: log.txnId || "",
    };
  }

  /* Get all logs for a user */
  window._dbGetLogs = function (userId) {
    var q = userId
      ? "user_id=eq." + userId + "&order=timestamp.desc&select=*"
      : "order=timestamp.desc&select=*";
    return get("logs", q).then(function (rows) {
      return Array.isArray(rows) ? rows.map(rowToLog) : [];
    });
  };

  /* Get all logs (admin) */
  window._dbGetAllLogs = function () {
    return get("logs", "order=timestamp.desc&select=*").then(function (rows) {
      return Array.isArray(rows) ? rows.map(rowToLog) : [];
    });
  };

  /* Add a single log entry */
  window._dbAddLog = function (log) {
    return post("logs", logToRow(log)).then(function (rows) {
      return rows && rows[0] ? rowToLog(rows[0]) : null;
    });
  };

  /* Add multiple log entries */
  window._dbAddLogs = function (logs) {
    return post("logs", logs.map(logToRow));
  };

  /* Delete a log entry */
  window._dbDeleteLog = function (id) {
    return del("logs", "id=eq." + id);
  };

  /* Update a log entry */
  window._dbUpdateLog = function (id, updates) {
    return patch("logs", "id=eq." + id, logToRow(updates));
  };

  /* ================================================================
     LOCALSTORAGE SHIM
     Keeps all existing code working by intercepting localStorage
     reads/writes for icu_users and icu_activity_log and syncing
     with Supabase in the background.
  ================================================================ */

  /* Cache so pages don't hammer the API on every read */
  window._icuCache = { users: null, logs: null };

  /* Preload users and logs into cache on page load */
  window._icuLoadCache = function () {
    return Promise.all([
      window._dbGetUsers().then(function (u) {
        window._icuCache.users = u;
        localStorage.setItem("icu_users", JSON.stringify(u));
        console.log("ICU DB: loaded " + u.length + " users");
      }),
      window._dbGetAllLogs().then(function (l) {
        window._icuCache.logs = l;
        localStorage.setItem("icu_activity_log", JSON.stringify(l));
        console.log("ICU DB: loaded " + l.length + " logs");
      }),
    ]).catch(function (err) {
      console.warn(
        "ICU DB: cache load failed, using localStorage fallback",
        err,
      );
    });
  };

  /* Show loading indicator while syncing */
  function showSyncOverlay() {
    if (document.getElementById("_icuSyncOverlay")) return;
    var el = document.createElement("div");
    el.id = "_icuSyncOverlay";
    el.style.cssText = [
      "position:fixed;inset:0;background:rgba(2,22,51,.85);",
      "display:flex;flex-direction:column;align-items:center;justify-content:center;",
      "z-index:99998;color:white;font-family:Inter,sans-serif;gap:16px",
    ].join("");
    el.innerHTML =
      '<div style="width:42px;height:42px;border:3px solid rgba(255,255,255,.2);border-top-color:#4b38f5;border-radius:50%;animation:icuSpin .8s linear infinite"></div>' +
      '<div style="font-size:.9rem;opacity:.8">Connecting to secure server...</div>';
    var style = document.createElement("style");
    style.textContent = "@keyframes icuSpin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
    document.body.appendChild(el);
  }

  function hideSyncOverlay() {
    var el = document.getElementById("_icuSyncOverlay");
    if (el) el.remove();
  }

  /* ── Ready promise — other scripts wait on this ── */
  var _resolveReady;
  window._icuReady = new Promise(function (resolve) {
    _resolveReady = resolve;
  });

  /* Load ALL users + logs into cache (used by admin) */
  window._icuLoadCacheUsersOnly = function () {
    return window
      ._dbGetUsers()
      .then(function (u) {
        window._icuCache.users = u;
        localStorage.setItem("icu_users", JSON.stringify(u));
      })
      .catch(function () {});
  };

  /* Auto-load on every page */
  document.addEventListener("DOMContentLoaded", function () {
    var isLoginPage = !!document.getElementById("loginBtn");
    var isAdminPage =
      !!document.getElementById("adminPanel") ||
      /admin/i.test(location.pathname);

    if (isLoginPage) {
      _resolveReady();
      return;
    }

    if (isAdminPage) {
      /* Admin needs ALL users + ALL logs */
      window
        ._icuLoadCache()
        .then(function () {
          hideSyncOverlay();
          _resolveReady();
        })
        .catch(function () {
          hideSyncOverlay();
          _resolveReady();
        });
    } else {
      /* User pages: load ONLY users list, NOT all logs.
         Each page fetches its own user's logs — prevents mixing balances. */
      showSyncOverlay();
      window
        ._icuLoadCacheUsersOnly()
        .then(function () {
          hideSyncOverlay();
          _resolveReady();
        })
        .catch(function () {
          hideSyncOverlay();
          _resolveReady();
        });
    }
  });

  console.log("ICU DB: Supabase layer loaded");
})();
