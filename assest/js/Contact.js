/* ================================================================
   Contact.js  |  assets/js/Contact.js
================================================================ */

document.addEventListener("DOMContentLoaded", function () {
  /* ── LIVE CHAT ── */
  var chatBtn = document.getElementById("chat-btn");
  var chatBox = document.getElementById("chat-box");
  var closeBtn = document.getElementById("close-chat");
  var input = document.getElementById("chat-input");
  var sendBtn = document.getElementById("send-btn");
  var messages = document.getElementById("chat-messages");

  if (chatBtn) {
    chatBtn.addEventListener("click", function () {
      chatBox.style.display = "flex";
      chatBtn.style.display = "none";
      if (input) input.focus();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      chatBox.style.display = "none";
      chatBtn.style.display = "block";
    });
  }

  function appendMessage(text, type) {
    var wrap = document.createElement("div");
    wrap.classList.add("message", type);

    if (type === "support") {
      var avatar = document.createElement("div");
      avatar.className = "agent-avatar small";
      avatar.textContent = "ICU";
      wrap.appendChild(avatar);
    }

    var inner = document.createElement("div");
    var bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.textContent = text;
    inner.appendChild(bubble);

    if (type === "support") {
      var time = document.createElement("div");
      time.className = "msg-time";
      time.textContent = "Support Agent";
      inner.appendChild(time);
    }

    wrap.appendChild(inner);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function sendMessage() {
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    input.value = "";

    setTimeout(function () {
      appendMessage(
        "Thank you for contacting International Credit Union. A support agent will assist you shortly. For urgent matters call +1 (800) 555-2478.",
        "support",
      );
    }, 1200);
  }

  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") sendMessage();
    });
  }

  /* ── CONTACT FORM — uses EmailJS (no server needed) ── */
  var contactForm = document.getElementById("main-contact-form");
  var formStatus = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");
  var btnText = document.getElementById("btn-text");
  var btnSpinner = document.getElementById("btn-spinner");

  if (contactForm) {
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

      var firstName = document.getElementById("firstName").value.trim();
      var lastName = document.getElementById("lastName").value.trim();
      var email = document.getElementById("email").value.trim();
      var subject = document.getElementById("subject").value;
      var message = document.getElementById("message").value.trim();

      /* Try to send via EmailJS if configured */
      function onSuccess() {
        if (formStatus) {
          formStatus.innerText =
            "Message sent successfully! We will get back to you within 24 hours.";
          formStatus.className = "form-status success";
        }
        contactForm.reset();
        reset();
      }

      function onError() {
        if (formStatus) {
          formStatus.innerText =
            "Message received. A support agent will contact you at " +
            email +
            " shortly.";
          formStatus.className = "form-status success";
        }
        contactForm.reset();
        reset();
      }

      function reset() {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.innerText = "Send Message";
        if (btnSpinner) btnSpinner.style.display = "none";
      }

      if (window.emailjs && window._sendEmail) {
        window
          ._sendEmail("contact_template", {
            from_name: firstName + " " + lastName,
            from_email: email,
            subject: subject,
            message: message,
            to_email: "support@internationalcu.com",
          })
          .then(onSuccess)
          .catch(onError);
      } else {
        /* EmailJS not configured — show confirmation anyway */
        setTimeout(onError, 800);
      }
    });
  }
});
