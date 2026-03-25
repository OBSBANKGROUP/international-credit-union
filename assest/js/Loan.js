document.addEventListener("DOMContentLoaded", () => {
  /* ================= ADMIN DATA (LATER FROM ADMIN PANEL) ================= */

  const loanData = {
    balance: 0,
    active: false,
  };

  const balanceEl = document.getElementById("loanBalance");
  const statusEl = document.getElementById("loanStatus");

  if (balanceEl) {
    balanceEl.innerText = "$" + loanData.balance.toFixed(2);
  }

  if (statusEl) {
    if (loanData.active) {
      statusEl.innerText =
        "You have an active loan with International Credit Union.";
    } else {
      statusEl.innerText = "You currently have no active loans.";
    }
  }

  /* ================= APPLY FOR LOAN ================= */

  const applyBtns = document.querySelectorAll(".applyLoanBtn");
  const loanFormSection = document.getElementById("loanApplication");

  if (applyBtns.length && loanFormSection) {
    applyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        loanFormSection.classList.remove("hidden");

        loanFormSection.scrollIntoView({
          behavior: "smooth",
        });
      });
    });
  }

  /* ================= FORM + OTP SYSTEM ================= */

  const loanForm = document.getElementById("loanForm");
  const loanOtpSection = document.getElementById("loanOtpSection");
  const loanOtpInput = document.getElementById("loanOtpInput");
  const verifyLoanOtpBtn = document.getElementById("verifyLoanOtpBtn");

  let generatedLoanOTP = "";

  /* ===== Submit Loan Form ===== */

  if (loanForm && loanOtpSection) {
    loanForm.addEventListener("submit", (e) => {
      e.preventDefault();

      /* Generate OTP */

      generatedLoanOTP = Math.floor(100000 + Math.random() * 900000).toString();

      console.log("Loan OTP:", generatedLoanOTP);

      alert("A verification code has been sent to your email.");

      /* Show OTP section */

      loanOtpSection.classList.remove("hidden");

      loanOtpSection.scrollIntoView({
        behavior: "smooth",
      });
    });
  }

  /* ===== Verify OTP ===== */

  if (verifyLoanOtpBtn && loanOtpInput) {
    verifyLoanOtpBtn.addEventListener("click", () => {
      if (loanOtpInput.value === generatedLoanOTP) {
        alert(
          "Your loan application has been submitted successfully. Our support team will contact you via support@internationalcu.com for follow up information and further processing.",
        );

        loanForm.reset();
        loanOtpInput.value = "";

        if (loanOtpSection) {
          loanOtpSection.classList.add("hidden");
        }

        if (loanFormSection) {
          loanFormSection.classList.add("hidden");
        }
      } else {
        alert("Invalid verification code. Please try again.");
      }
    });
  }
});
