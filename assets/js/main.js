/* Reader bar behaviour: reading progress, back-to-top, chapter menu, mobile search toggle. */
(function () {
  var bar = document.querySelector('.site-bar');
  if (!bar) return;

  /* Mobile search toggle */
  var toggle = bar.querySelector('[data-search-open]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var active = bar.classList.toggle('search-active');
      if (active) {
        var input = bar.querySelector('.search-input');
        if (input) input.focus();
      }
    });
  }

  /* Chapter menu: close on link click, outside click or Escape */
  var menu = bar.querySelector('.chap-menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) menu.open = false;
    });
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }

  /* Reading progress, back-to-top and current chapter */
  var progress = bar.querySelector('.read-progress span');
  var toTop = document.querySelector('.to-top');
  var menuLinks = menu ? Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]')) : [];
  var chapters = menuLinks.map(function (a) {
    return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
  });
  var current = -1;
  var ticking = false;

  function update() {
    ticking = false;
    var doc = document.documentElement;
    var y = window.scrollY || doc.scrollTop;
    var max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
    if (toTop) toTop.classList.toggle('is-visible', y > 800);

    if (chapters.length) {
      var offset = bar.offsetHeight + 40;
      var idx = -1;
      for (var i = 0; i < chapters.length; i++) {
        if (chapters[i] && chapters[i].getBoundingClientRect().top <= offset) idx = i;
        else if (chapters[i]) break;
      }
      if (idx !== current) {
        if (current >= 0) menuLinks[current].removeAttribute('aria-current');
        if (idx >= 0) menuLinks[idx].setAttribute('aria-current', 'true');
        current = idx;
      }
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* The books are very long; the browser's own jump to #section can land in the wrong place
     while fonts and maths are still laying out, so jump again once everything has loaded. */
  function jumpToHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    var el = id && document.getElementById(id);
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }
  if (location.hash) {
    window.addEventListener('load', function () {
      jumpToHash();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(jumpToHash);
    });
  }

  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0 });
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    });
  }
})();
