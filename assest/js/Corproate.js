/* SCROLL REVEAL */

const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
  const windowHeight = window.innerHeight;

  reveals.forEach((el) => {
    const top = el.getBoundingClientRect().top;

    if (top < windowHeight - 100) {
      el.classList.add("active");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);
revealOnScroll();
/* ========== SOLUTIONS SLIDER ========== */

const solutionSlides = document.querySelectorAll(".solution-slide");
const dots = document.querySelectorAll(".dot");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");

let current = 0;

function showSolution(index) {
  solutionSlides.forEach((slide) => {
    slide.classList.remove("active");
  });

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  solutionSlides[index].classList.add("active");
  dots[index].classList.add("active");
}

function nextSolution() {
  current++;

  if (current >= solutionSlides.length) {
    current = 0;
  }

  showSolution(current);
}

function prevSolution() {
  current--;

  if (current < 0) {
    current = solutionSlides.length - 1;
  }

  showSolution(current);
}

/* Buttons */

nextBtn.addEventListener("click", nextSolution);
prevBtn.addEventListener("click", prevSolution);

/* Dots */

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    current = index;
    showSolution(current);
  });
});

/* Auto Slide */

setInterval(nextSolution, 6000);

/* Start */

showSolution(current);
