document.addEventListener("DOMContentLoaded", function () {
  var session = JSON.parse(localStorage.getItem("icu_session") || "null");
  var logs = JSON.parse(localStorage.getItem("icu_activity_log") || "[]");
  var ICO = {
    credit: '<span class="material-icons-outlined">arrow_downward</span>',
    debit: '<span class="material-icons-outlined">arrow_upward</span>',
    alert: '<span class="material-icons-outlined">warning_amber</span>',
    info: '<span class="material-icons-outlined">info</span>',
    security: '<span class="material-icons-outlined">lock</span>',
  };

  function buildNotifications() {
    var notifs = [];
    notifs.push({
      type: "info",
      category: "info",
      title: "Welcome to ICU Online Banking",
      msg: "Your account is active and ready to use. Explore your dashboard to get started.",
      ts: Date.now() - 86400000 * 3,
    });
    notifs.push({
      type: "security",
      category: "security",
      title: "Security Reminder",
      msg: "Make sure your password is strong and unique. Enable email alerts for added protection.",
      ts: Date.now() - 86400000 * 2,
    });
    if (session) {
      var userLogs = logs
        .filter(function (l) {
          return l.userId === session.id && l.amount;
        })
        .sort(function (a, b) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        })
        .slice(0, 20);
      userLogs.forEach(function (l) {
        var isC = l.txnType === "credit";
        notifs.push({
          type: isC ? "credit" : "debit",
          category: "transaction",
          title: isC ? "Deposit Received" : l.action,
          msg:
            (isC ? "+" : "-") +
            "$" +
            parseFloat(l.amount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) +
            (l.details ? " — " + l.details : ""),
          ts: new Date(l.timestamp).getTime(),
        });
      });
    }
    return notifs.sort(function (a, b) {
      return b.ts - a.ts;
    });
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts,
      mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(ts).toLocaleDateString();
  }

  var currentFilter = "all",
    allNotifs = buildNotifications();

  function render() {
    var list = document.getElementById("notifList");
    var filtered =
      currentFilter === "all"
        ? allNotifs
        : allNotifs.filter(function (n) {
            return n.category === currentFilter;
          });
    if (!filtered.length) {
      list.innerHTML =
        '<div class="empty-state"><span class="material-icons-outlined">notifications_none</span><p>No notifications</p><span>Nothing here for this category yet.</span></div>';
      return;
    }
    var todayStr = new Date().toDateString(),
      yestStr = new Date(Date.now() - 86400000).toDateString();
    var groups = { Today: [], Yesterday: [], Earlier: [] };
    filtered.forEach(function (n) {
      var ds = new Date(n.ts).toDateString();
      if (ds === todayStr) groups.Today.push(n);
      else if (ds === yestStr) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });
    var html = "";
    ["Today", "Yesterday", "Earlier"].forEach(function (g) {
      if (!groups[g].length) return;
      html += '<div class="notif-group-label">' + g + "</div>";
      groups[g].forEach(function (n) {
        html +=
          '<div class="notif-card"><div class="notif-icon ' +
          n.type +
          '">' +
          ICO[n.type] +
          "</div>" +
          '<div class="notif-body"><div class="notif-title">' +
          n.title +
          "</div>" +
          '<div class="notif-msg">' +
          n.msg +
          "</div>" +
          '<div class="notif-time">' +
          timeAgo(n.ts) +
          "</div></div></div>";
      });
    });
    list.innerHTML = html;
  }

  render();

  document.querySelectorAll(".filter-tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-tab").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  document.getElementById("markAllBtn").addEventListener("click", function () {
    render();
  });
});
