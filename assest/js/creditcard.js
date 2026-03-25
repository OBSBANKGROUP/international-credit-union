document.addEventListener("DOMContentLoaded", () => {
  /* ================= CREDIT SCORE ================= */

  const needle = document.getElementById("needle");
  const scoreValue = document.getElementById("scoreValue");

  // Demo Score (later from backend)
  const score = 789; // 0 - 1000

  // Animate Score Number
  animateScore(0, score, 1500);

  // Rotate Needle (-90deg to +90deg)
  const angle = (score / 1000) * 180 - 90;

  setTimeout(() => {
    if (needle) {
      needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
  }, 300);

  function animateScore(start, end, duration) {
    let startTime = null;

    function step(time) {
      if (!startTime) startTime = time;

      const progress = time - startTime;

      const value = Math.min(
        start + (progress / duration) * (end - start),
        end,
      );

      if (scoreValue) {
        scoreValue.innerText = Math.floor(value);
      }

      if (progress < duration) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  /* ================= CREDIT CARD REQUEST ================= */

  const requestBtn = document.querySelector(".request-btn");

  const requestSection = document.getElementById("requestSection");

  const cardForm = document.getElementById("cardForm");

  const successSection = document.getElementById("successSection");

  const doneBtn = document.getElementById("doneBtn");

  /* Show Request Form */

  if (requestBtn && requestSection) {
    requestBtn.addEventListener("click", () => {
      requestSection.classList.remove("hidden");

      requestSection.scrollIntoView({
        behavior: "smooth",
      });
    });
  }

  /* Submit Application */

  if (cardForm && successSection) {
    cardForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Hide form
      requestSection.classList.add("hidden");

      // Show success message
      successSection.classList.remove("hidden");

      successSection.scrollIntoView({
        behavior: "smooth",
      });
    });
  }

  /* Done Button */

  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }

  /* ============ CHANGE SECURITY QUESTIONS ============ */

  const securityQBtn = document.getElementById("securityQBtn");

  const securityQModal = document.getElementById("securityQModal");

  const closeSecurityQModalBtn = document.getElementById("closeSecurityQModal");

  const verifySection = document.getElementById("verifySection");

  const sendVerifyOtpBtn = document.getElementById("sendVerifyOtpBtn");

  const otpSection = document.getElementById("securityOtpSection");

  const otpInput = document.getElementById("securityOtpInput");

  const verifyOtpBtn = document.getElementById("verifySecurityOtpBtn");

  const securityQForm = document.getElementById("securityQForm");

  let securityOTP = "";

  /* Open */

  if (securityQBtn) {
    securityQBtn.addEventListener("click", () => {
      securityQModal.style.display = "flex";

      resetSecurityModal();
    });
  }

  /* Close */

  if (closeSecurityQModalBtn) {
    closeSecurityQModalBtn.addEventListener("click", closeSecurityModal);
  }

  function closeSecurityModal() {
    securityQModal.style.display = "none";

    resetSecurityModal();
  }

  /* Reset */

  function resetSecurityModal() {
    verifySection.classList.remove("hidden");

    otpSection.classList.add("hidden");

    securityQForm.classList.add("hidden");

    otpInput.value = "";

    if (securityQForm) securityQForm.reset();
  }

  /* Send OTP */

  if (sendVerifyOtpBtn) {
    sendVerifyOtpBtn.addEventListener("click", () => {
      sendSecurityOTP();

      verifySection.classList.add("hidden");

      otpSection.classList.remove("hidden");
    });
  }

  function sendSecurityOTP() {
    securityOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("Security OTP (Demo):", securityOTP);

    alert("Verification code sent to your email.");
  }

  /* Verify OTP */

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", () => {
      if (otpInput.value === securityOTP) {
        otpSection.classList.add("hidden");

        securityQForm.classList.remove("hidden");
      } else {
        alert("Invalid verification code.");
      }
    });
  }

  /* Save New Questions */

  if (securityQForm) {
    securityQForm.addEventListener("submit", (e) => {
      e.preventDefault();

      alert("Security questions updated successfully.");

      // Later: Send to backend

      closeSecurityModal();
    });
  }
});
