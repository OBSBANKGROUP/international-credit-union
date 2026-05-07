/* ========== LIVE CHAT SYSTEM ========== */

const chatBtn = document.getElementById("chat-btn");
const chatBox = document.getElementById("chat-box");
const closeBtn = document.getElementById("close-chat");

const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const messages = document.getElementById("chat-messages");

/* Open chat */

chatBtn.addEventListener("click", () => {
  chatBox.style.display = "flex";
});

/* Close chat */

closeBtn.addEventListener("click", () => {
  chatBox.style.display = "none";
});

/* Send message */

function sendMessage() {
  const text = input.value.trim();

  if (text === "") return;

  /* User message */

  const userMsg = document.createElement("div");
  userMsg.classList.add("message", "user");
  userMsg.innerText = text;

  messages.appendChild(userMsg);

  input.value = "";

  messages.scrollTop = messages.scrollHeight;

  /* Auto reply */

  setTimeout(() => {
    const botMsg = document.createElement("div");
    botMsg.classList.add("message", "support");

    botMsg.innerText =
      "Thank you for contacting International Credit Union. A support agent will assist you shortly.";

    messages.appendChild(botMsg);

    messages.scrollTop = messages.scrollHeight;
  }, 1200);
}

/* Button click */

sendBtn.addEventListener("click", sendMessage);

/* Enter key */

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

/* ========== CONTACT FORM SUBMISSION ========== */

const contactForm = document.getElementById("main-contact-form");
const formStatus = document.getElementById("form-status");
const submitBtnForm = document.getElementById("submit-btn");
const btnText = document.getElementById("btn-text");
const btnSpinner = document.getElementById("btn-spinner");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // UI Loading State
    submitBtnForm.disabled = true;
    btnText.innerText = "Sending...";
    btnSpinner.style.display = "inline-block";
    formStatus.className = "form-status";
    formStatus.style.display = "none";
    
    // Gather data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch("http://localhost:3000/send-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        formStatus.innerText = "Message sent successfully! We will get back to you soon.";
        formStatus.className = "form-status success";
        contactForm.reset();
      } else {
        throw new Error(result.error || "Failed to send message.");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      formStatus.innerText = "An error occurred. Please try again later.";
      formStatus.className = "form-status error";
    } finally {
      // Reset UI state
      submitBtnForm.disabled = false;
      btnText.innerText = "Send Message";
      btnSpinner.style.display = "none";
    }
  });
}
