(function () {
  "use strict";

  /* ================================================================
     ICU EMAIL CONFIG — EmailJS Only (works on static hosting)
     ----------------------------------------------------------------
     Fill in your 4 credentials from emailjs.com then you're done.
     No server needed — emails send directly from the browser.
     ================================================================ */

  var EMAILJS_PUBLIC_KEY = "_5MKFe0Q8J_H9RvVy"; // Account → Public Key
  var EMAILJS_SERVICE_ID = "service_jzi1nah"; // Email Services → your service
  var EMAILJS_OTP_TEMPLATE_ID = "template_tmsqzp3"; // Email Templates → OTP template
  var EMAILJS_DEBIT_TEMPLATE_ID = "template_47w8bcg"; // Email Templates → Debit alert

  /* ── Init EmailJS ── */
  function isReady() {
    return (
      typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY"
    );
  }

  if (isReady()) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log("EmailJS ready");
  } else {
    console.warn(
      "EmailJS credentials not set yet — OTPs will be logged to console only.",
    );
  }

  /* ── Core send function ── */
  window._sendEmail = function (templateId, params) {
    if (!isReady()) {
      console.log("EMAIL (dev mode):", templateId, params);
      return Promise.resolve({ status: 200, text: "dev-mode" });
    }
    return emailjs
      .send(EMAILJS_SERVICE_ID, templateId, params)
      .then(function (res) {
        console.log("Email sent:", res.status);
        return res;
      })
      .catch(function (err) {
        console.error("Email failed:", err);
        throw err;
      });
  };

  /* ── Send OTP ── */
  window._sendOTP = function (toEmail, otpCode, userName) {
    return window._sendEmail(EMAILJS_OTP_TEMPLATE_ID, {
      to_email: toEmail,
      otp_code: otpCode,
      user_name: userName || "Valued Member",
      app_name: "International Credit Union",
    });
  };

  /* ── Send Debit Alert ── */
  window._sendDebitAlert = function (
    toEmail,
    amount,
    details,
    balance,
    userName,
  ) {
    return window._sendEmail(EMAILJS_DEBIT_TEMPLATE_ID, {
      to_email: toEmail,
      amount: parseFloat(amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      details: details || "",
      balance: parseFloat(balance || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      user_name: userName || "Valued Member",
      app_name: "International Credit Union",
      date: new Date().toLocaleString(),
    });
  };
})();
