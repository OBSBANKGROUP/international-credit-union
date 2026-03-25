document.addEventListener("DOMContentLoaded", () => {
  /* PROFILE */

  const profileBtn = document.getElementById("profileBtn");

  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  /* ================= BUSINESS SWITCH ================= */

  const switchBtn = document.getElementById("switchBtn");
  const switchBtnCard = document.getElementById("switchBtnCard");

  function goToBusiness() {
    window.location.href = "bussiness-dashboard.html";
  }

  if (switchBtn) {
    switchBtn.addEventListener("click", goToBusiness);
  }

  if (switchBtnCard) {
    switchBtnCard.addEventListener("click", goToBusiness);
  }
  /* MENU */

  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");

  if (menuBtn && menuPanel) {
    menuBtn.addEventListener("click", () => {
      menuPanel.classList.toggle("open");
    });
  }

  // /* NOTIFICATIONS */

  // const notifyBar = document.getElementById("notifyBar");

  // function showNotify(msg) {
  //   if (!notifyBar) return;

  //   notifyBar.innerText = msg;

  //   notifyBar.style.display = "block";

  //   setTimeout(() => {
  //     notifyBar.style.display = "none";
  //   }, 4000);
  // }

  // Demo alerts (remove later when backend is ready)

  setTimeout(() => {
    showNotify("🔐 New device login detected");
  }, 2000);

  setTimeout(() => {
    showNotify("💳 Transaction completed");
  }, 6000);

  /* DARK MODE */

  const darkToggle = document.getElementById("darkToggle");

  if (darkToggle) {
    darkToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode");
    });
  }
});

// testing
/* ===== LINK EXTERNAL ACCOUNT ===== */

const linkBtn = document.getElementById("linkAccountBtn");
const modal = document.getElementById("linkAccountModal");

const step1 = document.getElementById("linkStep1");
const step2 = document.getElementById("linkStep2");
const step3 = document.getElementById("trialDepositStep");
const step4 = document.getElementById("linkOtpStep");

let generatedOTP = "";

/* OPEN MODAL */

if (linkBtn) {
  linkBtn.addEventListener("click", (e) => {
    e.preventDefault();

    modal.classList.remove("hidden");
  });
}

/* STEP 1 → STEP 2 */

document.querySelectorAll(".regionBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
  });
});

/* STEP 2 → STEP 3 */

document.querySelectorAll(".accountTypeBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    step2.classList.add("hidden");
    step3.classList.remove("hidden");
  });
});

/* SEND OTP */

const sendOtpBtn = document.getElementById("sendTrialOtp");

if (sendOtpBtn) {
  sendOtpBtn.addEventListener("click", () => {
    const acc = document.getElementById("accountNumber").value;
    const confirm = document.getElementById("confirmAccountNumber").value;

    if (acc !== confirm) {
      alert("Account numbers do not match");
      return;
    }

    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("Link Account OTP:", generatedOTP);

    alert("Verification code sent to your email.");

    step3.classList.add("hidden");
    step4.classList.remove("hidden");
  });
}

/* VERIFY OTP */

const verifyOtpBtn = document.getElementById("verifyLinkOtp");

if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener("click", () => {
    const input = document.getElementById("linkOtpInput").value;

    if (input === generatedOTP) {
      alert(
        "Trial transaction initiated. It will take 2-3 working days to complete.",
      );

      modal.classList.add("hidden");
    } else {
      alert("Invalid verification code");
    }
  });
}
