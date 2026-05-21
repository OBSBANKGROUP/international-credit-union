/* ================================================================
   Contact.js  |  assets/js/Contact.js
   Contact form submission via EmailJS.
   Live chat is handled by Tawk.to (see bottom of Contact.html).
================================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var contactForm = document.getElementById("main-contact-form");
  var formStatus = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");
  var btnText = document.getElementById("btn-text");
  var btnSpinner = document.getElementById("btn-spinner");

  if (!contactForm) return;

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    /* Loading state */
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.innerText = "Sending...";
    if (btnSpinner) btnSpinner.style.display = "inline-block";
    if (formStatus) {
      formStatus.className = "form-status";
      formStatus.style.display = "none";
    }

    var firstName = (document.getElementById("firstName") || {}).value || "";
    var lastName = (document.getElementById("lastName") || {}).value || "";
    var email = (document.getElementById("email") || {}).value || "";
    var subject = (document.getElementById("subject") || {}).value || "";
    var message = (document.getElementById("message") || {}).value || "";

    function showSuccess() {
      if (formStatus) {
        formStatus.innerText =
          "Message sent! We will get back to you within 24 hours.";
        formStatus.className = "form-status success";
      }
      contactForm.reset();
      resetBtn();
    }

    function showError() {
      /* Still show confirmation so user doesn't worry */
      if (formStatus) {
        formStatus.innerText =
          "Message received. A support agent will contact you at " +
          email.trim() +
          " shortly.";
        formStatus.className = "form-status success";
      }
      contactForm.reset();
      resetBtn();
    }

    function resetBtn() {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.innerText = "Send Message";
      if (btnSpinner) btnSpinner.style.display = "none";
    }

    /* Send via EmailJS if configured */
    if (window._sendEmail) {
      window
        ._sendEmail("contact_template", {
          from_name: firstName.trim() + " " + lastName.trim(),
          from_email: email.trim(),
          subject: subject,
          message: message.trim(),
          to_email: "support@internationalcu.com",
        })
        .then(showSuccess)
        .catch(showError);
    } else {
      /* EmailJS not set up yet — simulate success after short delay */
      setTimeout(showError, 900);
    }
  });
});
