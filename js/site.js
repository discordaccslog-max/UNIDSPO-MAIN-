/* United Dispo — site header behaviour (all pages).
   - Adds a shadow and tightens the header once the page scrolls.
   - On phones, tucks the nav row away while scrolling down and brings it
     back when scrolling up, so the sticky header stays small. */
(function () {
  var head = document.querySelector('[data-masthead]');
  if (!head) return;
  var lastY = window.scrollY || 0, ticking = false;
  var mq = window.matchMedia('(max-width: 749px)');
  function update() {
    ticking = false;
    var y = window.scrollY || 0;
    head.classList.toggle('is-scrolled', y > 24);
    if (mq.matches) {
      if (y > 140 && y > lastY + 4) head.classList.add('is-tucked');
      else if (y < lastY - 4 || y <= 140) head.classList.remove('is-tucked');
    } else {
      head.classList.remove('is-tucked');
    }
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  /* keyboard users always see the nav */
  head.addEventListener('focusin', function () { head.classList.remove('is-tucked'); });
  update();
})();
