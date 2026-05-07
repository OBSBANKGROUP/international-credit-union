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

  function previewFile(input, previewEl, zoneEl, iconEl) {
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        previewEl.src = e.target.result;
        previewEl.style.display = "block";
        iconEl.style.display = "none";
        zoneEl.classList.add("has-image");
      };
      reader.readAsDataURL(file);
    });
  }

  previewFile(
    document.getElementById("frontCheck"),
    document.getElementById("frontPreview"),
    document.getElementById("frontZone"),
    document.querySelector("#frontZone .z-icon"),
  );
  previewFile(
    document.getElementById("backCheck"),
    document.getElementById("backPreview"),
    document.getElementById("backZone"),
    document.querySelector("#backZone .z-icon"),
  );

  document.getElementById("reviewBtn").addEventListener("click", function () {
    var acc = document.getElementById("depositAccount").value;
    var amt = parseFloat(document.getElementById("checkAmount").value);
    var front = document.getElementById("frontCheck").files[0];
    var back = document.getElementById("backCheck").files[0];
    if (!acc) {
      alert("Please select a deposit account.");
      return;
    }
    if (!amt || amt < 0.01) {
      alert("Please enter a valid check amount.");
      return;
    }
    if (!front) {
      alert("Please upload the front of the check.");
      return;
    }
    if (!back) {
      alert("Please upload the back of the check.");
      return;
    }
    document.getElementById("rvAccount").textContent =
      acc.charAt(0).toUpperCase() + acc.slice(1) + " Account";
    document.getElementById("rvAmount").textContent =
      "$" + amt.toLocaleString("en-US", { minimumFractionDigits: 2 });
    document.getElementById("rvFront").src =
      document.getElementById("frontPreview").src;
    document.getElementById("rvBack").src =
      document.getElementById("backPreview").src;
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "block";
  });

  document.getElementById("backBtn").addEventListener("click", function () {
    document.getElementById("step2").style.display = "none";
    document.getElementById("step1").style.display = "block";
  });

  document.getElementById("submitBtn").addEventListener("click", function () {
    var acc = document.getElementById("depositAccount").value;
    var amt = parseFloat(document.getElementById("checkAmount").value);
    if (window._logActivity) {
      window._logActivity(
        session.id,
        user.firstName + " " + user.lastName,
        "Check Deposit",
        "Mobile check deposit (pending review)",
        amt,
        "credit",
        acc,
      );
    } else {
      var allLogs = JSON.parse(
        localStorage.getItem("icu_activity_log") || "[]",
      );
      allLogs.push({
        id: Date.now(),
        userId: session.id,
        userName: user.firstName + " " + user.lastName,
        action: "Check Deposit",
        details: "Mobile check deposit (pending review)",
        amount: amt,
        txnType: "credit",
        targetAccount: acc,
        timestamp: new Date().toISOString(),
        status: "pending",
      });
      localStorage.setItem("icu_activity_log", JSON.stringify(allLogs));
    }
    document.getElementById("depositSummary").textContent =
      "$" +
      amt.toLocaleString("en-US", { minimumFractionDigits: 2 }) +
      " deposited to " +
      acc.charAt(0).toUpperCase() +
      acc.slice(1) +
      " Account";
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";
  });
});
