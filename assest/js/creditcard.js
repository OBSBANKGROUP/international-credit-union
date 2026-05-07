var selectedCard = "";
function openApplication(cardName) {
  selectedCard = cardName;
  document.getElementById("applyLabel").textContent = "Apply for " + cardName;
  document.getElementById("applySection").classList.add("open");
  document
    .getElementById("applySection")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("DOMContentLoaded", function () {
  var session = JSON.parse(localStorage.getItem("icu_session") || "null");
  if (!session) {
    window.location.href = "index.html";
    return;
  }
  var users = JSON.parse(localStorage.getItem("icu_users") || "[]");
  var user = users.find(function (u) {
    return u.id === session.id;
  });
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  var logs = JSON.parse(localStorage.getItem("icu_activity_log") || "[]");
  var txnCount = logs.filter(function (l) {
    return l.userId === session.id;
  }).length;
  var seed = (user.id % 200) + txnCount * 3;
  var score = Math.min(850, Math.max(580, 650 + (seed % 180)));
  document.getElementById("scoreNum").textContent = score;
  var lbl =
    score >= 800
      ? "Excellent"
      : score >= 740
        ? "Very Good"
        : score >= 670
          ? "Good"
          : score >= 580
            ? "Fair"
            : "Poor";
  document.getElementById("scoreLbl").textContent =
    lbl +
    " — " +
    (score >= 670
      ? "You likely qualify for most cards."
      : "You may qualify for select cards.");
  var deg = ((score - 300) / 550) * 180 - 90;
  setTimeout(function () {
    document.getElementById("gaugeNeedle").style.transform =
      "rotate(" + deg + "deg)";
  }, 200);

  document.getElementById("appFirst").value = user.firstName || "";
  document.getElementById("appLast").value = user.lastName || "";
  document.getElementById("appPhone").value = user.phone || "";

  document
    .getElementById("submitAppBtn")
    .addEventListener("click", function () {
      var first = document.getElementById("appFirst").value.trim();
      var last = document.getElementById("appLast").value.trim();
      var employ = document.getElementById("appEmploy").value;
      var income = document.getElementById("appIncome").value;
      var terms = document.getElementById("appTerms").checked;
      if (!first || !last) {
        alert("Please enter your full name.");
        return;
      }
      if (!employ) {
        alert("Please select your employment status.");
        return;
      }
      if (!income) {
        alert("Please enter your annual income.");
        return;
      }
      if (!terms) {
        alert("Please accept the Terms & Conditions.");
        return;
      }
      document.getElementById("applySection").style.display = "none";
      document.getElementById("successCard").style.display = "block";
      document
        .getElementById("successCard")
        .scrollIntoView({ behavior: "smooth" });
    });
});
