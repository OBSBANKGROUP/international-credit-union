document.addEventListener("DOMContentLoaded", () => {
  if (window._initThemeToggle) {
    window._initThemeToggle("darkToggle");
  }
  /* ===================================================
     DEMO USER DATA (ADMIN / BACKEND LATER)
  =================================================== */

  /* ================= LOAD USER DATA ================= */
  const USERS_KEY = "icu_users";
  const SESSION_KEY = "icu_session";

  function getSession() {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  }

  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return;
  }

  const users = getUsers();
  const currentUser = users.find(u => u.id === session.id);
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  const userData = {
    photo: currentUser.profilePic || "assest/images/profile.png",
    fullName: currentUser.firstName + " " + currentUser.lastName,
    accountId: "ICU" + currentUser.id,
    dob: currentUser.dob || "—",
    ssn: currentUser.ssn || "•••-••-••••",
    phone: currentUser.phone || "—",
    email: currentUser.email,
    address: currentUser.address || "—",
    accountNumber: currentUser.accountNumber || "— — — —",
    routingNumber: "021000021",
  };

  /* ===================================================
     LOAD PROFILE
  =================================================== */

  const profilePhoto = document.getElementById("profilePhoto");
  if (profilePhoto) profilePhoto.src = userData.photo;

  const fullName = document.getElementById("fullName");
  if (fullName) fullName.innerText = userData.fullName;

  const accountId = document.getElementById("accountId");
  if (accountId) accountId.innerText = userData.accountId;

  /* ===================================================
     LOAD FIELDS
  =================================================== */

  setValue("nameField", userData.fullName);
  setValue("dobField", userData.dob);
  setValue("ssnField", userData.ssn);
  setValue("phoneField", userData.phone);
  setValue("emailField", userData.email);
  setValue("addressField", userData.address);
  setValue("accNumberField", userData.accountNumber);
  setValue("routingField", userData.routingNumber);

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  /* ===================================================
     CHANGE PASSWORD
  =================================================== */

  const passBtn = document.getElementById("changePassBtn");
  const passModal = document.getElementById("passwordModal");
  const closePassBtn = document.getElementById("closePassModal");
  const passForm = document.getElementById("passwordForm");

  const passError = document.getElementById("passError");

  const passOtpSection = document.getElementById("otpSection");
  const passOtpInput = document.getElementById("otpCode");
  const passVerifyBtn = document.getElementById("verifyOtpBtn");

  let passOTP = "";

  /* Open */

  if (passBtn && passModal) {
    passBtn.addEventListener("click", () => {
      passModal.style.display = "flex";
      resetPasswordModal();
    });
  }

  /* Close */

  if (closePassBtn) {
    closePassBtn.addEventListener("click", closePasswordModal);
  }

  function closePasswordModal() {
    passModal.style.display = "none";
    resetPasswordModal();
  }

  /* Reset */

  function resetPasswordModal() {
    if (passForm) passForm.reset();

    if (passOtpSection) passOtpSection.classList.add("hidden");

    if (passError) passError.innerText = "";

    if (passOtpInput) passOtpInput.value = "";
  }

  /* Submit */

  if (passForm) {
    passForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const newPass = document.getElementById("newPass").value;

      const confirmPass = document.getElementById("confirmPass").value;

      if (newPass !== confirmPass) {
        passError.innerText = "New password must match. Try again.";

        return;
      }

      passError.innerText = "";

      sendPasswordOTP();

      passOtpSection.classList.remove("hidden");
    });
  }

  /* Send OTP */

  function sendPasswordOTP() {
    passOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("Password OTP:", passOTP);

    alert("Verification code sent to your email.");
  }

  /* Verify OTP */

  if (passVerifyBtn) {
    passVerifyBtn.addEventListener("click", () => {
      if (passOtpInput.value === passOTP) {
        alert("Password updated successfully.");

        closePasswordModal();
      } else {
        alert("Invalid OTP.");
      }
    });
  }

  /* ===================================================
     CHANGE SECURITY QUESTIONS
  =================================================== */

  const secBtn = document.getElementById("securityQBtn");

  const secModal = document.getElementById("securityQModal");

  const closeSecBtn = document.getElementById("closeSecurityQModal");

  const secVerifySection = document.getElementById("verifySection");

  const secSendOtpBtn = document.getElementById("sendVerifyOtpBtn");

  const secOtpSection = document.getElementById("securityOtpSection");

  const secOtpInput = document.getElementById("securityOtpInput");

  const secVerifyOtpBtn = document.getElementById("verifySecurityOtpBtn");

  const secForm = document.getElementById("securityQForm");

  let secOTP = "";

  /* Open */

  if (secBtn && secModal) {
    secBtn.addEventListener("click", () => {
      secModal.style.display = "flex";

      resetSecurityModal();
    });
  }

  /* Close */

  if (closeSecBtn) {
    closeSecBtn.addEventListener("click", closeSecurityModal);
  }

  function closeSecurityModal() {
    secModal.style.display = "none";

    resetSecurityModal();
  }

  /* Reset */

  function resetSecurityModal() {
    if (secVerifySection) secVerifySection.classList.remove("hidden");

    if (secOtpSection) secOtpSection.classList.add("hidden");

    if (secForm) secForm.classList.add("hidden");

    if (secOtpInput) secOtpInput.value = "";

    if (secForm) secForm.reset();
  }

  /* Send OTP */

  if (secSendOtpBtn) {
    secSendOtpBtn.addEventListener("click", () => {
      sendSecurityOTP();

      secVerifySection.classList.add("hidden");

      secOtpSection.classList.remove("hidden");
    });
  }

  function sendSecurityOTP() {
    secOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("Security OTP:", secOTP);

    alert("Verification code sent to your email.");
  }

  /* Verify */

  if (secVerifyOtpBtn) {
    secVerifyOtpBtn.addEventListener("click", () => {
      if (secOtpInput.value === secOTP) {
        secOtpSection.classList.add("hidden");

        secForm.classList.remove("hidden");
      } else {
        alert("Invalid verification code.");
      }
    });
  }

  /* Save Questions */

  if (secForm) {
    secForm.addEventListener("submit", (e) => {
      e.preventDefault();

      alert("Security questions updated successfully.");

      closeSecurityModal();
    });
  }
});
