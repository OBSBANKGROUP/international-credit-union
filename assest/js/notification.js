const list = document.getElementById("notificationList");

/* GET DATA */

let notifications = JSON.parse(localStorage.getItem("notifications")) || [];

/* DISPLAY */

function renderNotifications() {
  if (notifications.length === 0) {
    list.innerHTML = "<p>No notifications yet.</p>";
    return;
  }

  list.innerHTML = "";

  notifications.forEach((n) => {
    const div = document.createElement("div");

    div.className = "notification-card " + n.type;

    div.innerHTML = `
<p><strong>${n.title}</strong></p>
<p>${n.message}</p>
<p class="notification-time">${n.time}</p>
`;

    list.appendChild(div);
  });
}

renderNotifications();
