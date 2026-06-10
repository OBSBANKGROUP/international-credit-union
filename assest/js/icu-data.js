/* ============================================================
   icu-data.js  —  SINGLE SOURCE OF TRUTH
   Every page uses these functions to get user + balance data.
   This guarantees the same accurate numbers everywhere.
   Load this AFTER db.js and BEFORE page scripts.
   ============================================================ */
(function () {
  var SUPABASE_URL = "https://fyuuzoldfzcybgwlbofp.supabase.co";
  var SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dXV6b2xkZnpjeWJnd2xib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjM5MDMsImV4cCI6MjA5NDg5OTkwM30.GKb3ksCyt72HLUzSEgkK66mFzl9lALXk1ryJD5-Gqcw";
  var H = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };

  /* Convert a Supabase user row to app format */
  function rowToUser(row) {
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
      profilePic: row.profile_pic,
    };
    if (row.data && typeof row.data === "object") Object.assign(u, row.data);
    return u;
  }

  /* Convert a Supabase log row to app format */
  function rowToLog(row) {
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
      reason: row.reason,
    };
  }

  /* ── THE shared account-matching rule — used by ALL balance math ── */
  window.icuAcctMatches = function (logAccount, wantType, primary) {
    var acct = (logAccount || primary || "checking").toLowerCase();
    var at = (wantType || "").toLowerCase();
    if (!at) return true; /* no filter = all */
    if (acct === at) return true; /* exact match */
    if (at === "business" && acct.indexOf("business") === 0) return true;
    if (at.indexOf("business") === 0 && acct.indexOf("business") === 0)
      return true;
    return false;
  };

  /* ── Compute balance for a set of logs ── */
  /* type = null/undefined -> TOTAL of all logs.  type="checking"/"savings"/"business" -> that account */
  window.icuBalance = function (logs, type, primary) {
    var bal = 0;
    primary = (primary || "checking").toLowerCase();
    /* Deduplicate by log id so duplicate rows never double-count */
    var seen = {};
    (logs || []).forEach(function (l) {
      if (l.amount == null) return;
      /* Skip if we've already counted this exact log id */
      var key =
        l.id != null
          ? String(l.id)
          : String(l.userId) +
            "|" +
            l.amount +
            "|" +
            l.txnType +
            "|" +
            l.targetAccount +
            "|" +
            l.timestamp;
      if (seen[key]) return;
      seen[key] = true;
      if (type && !window.icuAcctMatches(l.targetAccount, type, primary))
        return;
      if (l.txnType === "credit") bal += parseFloat(l.amount) || 0;
      else if (l.txnType === "debit") bal -= parseFloat(l.amount) || 0;
    });
    return bal;
  };

  /* Deduplicate a logs array by id — use before rendering lists */
  window.icuDedupeLogs = function (logs) {
    var seen = {};
    return (logs || []).filter(function (l) {
      var key =
        l.id != null
          ? String(l.id)
          : String(l.userId) +
            "|" +
            l.amount +
            "|" +
            l.txnType +
            "|" +
            l.targetAccount +
            "|" +
            l.timestamp;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  };

  /* ── Fetch a user + their logs from Supabase by EMAIL ── */
  /* Returns a promise resolving to { user, logs } — the single source of truth */
  window.icuFetchAccount = function (email) {
    if (!email) return Promise.reject("no email");
    var cleanEmail = email.toLowerCase().trim();

    return fetch(
      SUPABASE_URL +
        "/rest/v1/users?email=eq." +
        encodeURIComponent(cleanEmail) +
        "&select=*",
      { headers: H },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) throw new Error("User not found");
        var user = rowToUser(rows[0]);

        return fetch(
          SUPABASE_URL +
            "/rest/v1/logs?user_id=eq." +
            rows[0].id +
            "&order=timestamp.desc&select=*",
          { headers: H },
        )
          .then(function (r2) {
            return r2.json();
          })
          .then(function (logRows) {
            var logs = Array.isArray(logRows) ? logRows.map(rowToLog) : [];

            /* Cache to localStorage so legacy code still works */
            try {
              var cachedUsers = JSON.parse(
                localStorage.getItem("icu_users") || "[]",
              );
              var ui = cachedUsers.findIndex(function (c) {
                return c.email === user.email;
              });
              if (ui >= 0) cachedUsers[ui] = user;
              else cachedUsers.push(user);
              localStorage.setItem("icu_users", JSON.stringify(cachedUsers));

              /* Replace this user's logs in the cache */
              var allLogs = JSON.parse(
                localStorage.getItem("icu_activity_log") || "[]",
              );
              var others = allLogs.filter(function (l) {
                return String(l.userId) !== String(user.id);
              });
              localStorage.setItem(
                "icu_activity_log",
                JSON.stringify(others.concat(logs)),
              );

              /* Update session id to the real Supabase id */
              var sess = JSON.parse(
                localStorage.getItem("icu_session") || "null",
              );
              if (sess) {
                sess.id = user.id;
                localStorage.setItem("icu_session", JSON.stringify(sess));
              }
            } catch (e) {
              /* ignore cache errors */
            }

            return { user: user, logs: logs };
          });
      });
  };

  /* ── Get the list of account keys a user has (checking, savings, business_N) ── */
  window.icuAccountKeys = function (user) {
    var keys = ["checking", "savings"];
    var accts =
      user && user.accounts && typeof user.accounts === "object"
        ? user.accounts
        : {};
    Object.keys(accts).forEach(function (k) {
      if (
        k !== "checking" &&
        k !== "savings" &&
        accts[k] &&
        keys.indexOf(k) === -1
      )
        keys.push(k);
    });
    /* If businessName set but no business key, add a generic "business" */
    var hasBiz = keys.some(function (k) {
      return k !== "checking" && k !== "savings";
    });
    if (user && user.businessName && !hasBiz) keys.push("business");
    return keys;
  };

  /* ── Human label for an account key ── */
  window.icuAccountLabel = function (user, key) {
    if (key === "checking") return "Checking";
    if (key === "savings") return "Savings";
    var accts = (user && user.accounts) || {};
    var v = accts[key];
    if (v && typeof v === "object" && v.name) return v.name;
    return user && user.businessName ? user.businessName : "Business";
  };
})();
