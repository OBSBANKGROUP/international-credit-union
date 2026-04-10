(function() {
  "use strict";

  /* 
   * EmailJS Configuration (Fallback)
   * Please replace the placeholders below with your actual EmailJS credentials.
   * You can get these from your EmailJS dashboard: https://dashboard.emailjs.com/
   */
  const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY"; // Replace with your Public Key
  const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID"; // Replace with your Service ID
  const EMAILJS_OTP_TEMPLATE_ID = "YOUR_OTP_TEMPLATE_ID"; // Replace with your OTP Template ID
  const EMAILJS_DEBIT_TEMPLATE_ID = "YOUR_DEBIT_TEMPLATE_ID"; // Replace with your Debit Alert Template ID

  // Local Backend Configuration (Primary)
  const LOCAL_BACKEND_URL = "http://localhost:3000";

  // Initialize EmailJS
  if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  /**
   * Universal email sending helper
   */
  window._sendEmail = async function(endpoint, templateId, templateParams) {
    // 1. Try Local Backend
    try {
      const response = await fetch(`${LOCAL_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateParams),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Email sent via Local Backend:", data);
        return data;
      }
    } catch (err) {
      console.warn("Local backend not available, falling back to EmailJS/Console.");
    }

    // 2. Fallback to EmailJS
    if (typeof emailjs === 'undefined') {
      console.warn("EmailJS library not loaded. Logging to console instead.");
      console.log("Email Template:", templateId, "Params:", templateParams);
      return Promise.resolve({ status: 200, text: "Simulated success" });
    }

    if (EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
      console.warn("EmailJS credentials not set. Logging to console instead.");
      console.log("Email Template:", templateId, "Params:", templateParams);
      return Promise.resolve({ status: 200, text: "Simulated success" });
    }

    return emailjs.send(EMAILJS_SERVICE_ID, templateId, templateParams)
      .then(function(response) {
        console.log("Email sent successfully via EmailJS!", response.status, response.text);
        return response;
      }, function(error) {
        console.error("Failed to send email via EmailJS...", error);
        throw error;
      });
  };

  /**
   * Send OTP Code
   */
  window._sendOTP = function(toEmail, otpCode, userName) {
    return window._sendEmail("/send-otp", EMAILJS_OTP_TEMPLATE_ID, {
      to_email: toEmail,
      otp_code: otpCode,
      user_name: userName || "Valued Member",
      app_name: "International Credit Union"
    });
  };

  /**
   * Send Debit/Transfer Alert
   */
  window._sendDebitAlert = function(toEmail, amount, details, balance, userName) {
    return window._sendEmail("/send-alert", EMAILJS_DEBIT_TEMPLATE_ID, {
      to_email: toEmail,
      amount: amount,
      details: details,
      balance: balance,
      user_name: userName || "Valued Member",
      app_name: "International Credit Union",
      date: new Date().toLocaleString()
    });
  };

})();

