// /* ========== COUNT UP ANIMATION ========== */

// document.addEventListener("DOMContentLoaded", () => {
//   const counters = document.querySelectorAll(".counter");
//   const speed = 200; // Lower = Faster

//   counters.forEach((counter) => {
//     const updateCount = () => {
//       const target = +counter.getAttribute("data-target");
//       const count = +counter.innerText;

//       const increment = target / speed;

//       if (count < target) {
//         counter.innerText = Math.ceil(count + increment);

//         setTimeout(updateCount, 20);
//       } else {
//         counter.innerText = target.toLocaleString();
//       }
//     };

//     updateCount();
//   });
// });

/* ========== COUNTER ANIMATION ========== */

document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".count");
  const speed = 180; // Animation speed

  counters.forEach((counter) => {
    const update = () => {
      const target = +counter.dataset.target;
      let current = +counter.innerText.replace(/,/g, "");

      const increment = target / speed;

      if (current < target) {
        current += increment;

        counter.innerText = Math.ceil(current).toLocaleString();

        setTimeout(update, 15);
      } else {
        counter.innerText = target.toLocaleString();
      }
    };

    update();
  });
});
