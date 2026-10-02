/* Light/dark theme. Loaded synchronously in <head> so the theme is set before first paint.
   Uses the stored choice if there is one, otherwise follows the OS setting. */
(function () {
  var KEY = 'mte-theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* storage unavailable */ }
  }
  function resolved() {
    var s = stored();
    if (s === 'light' || s === 'dark') return s;
    return mq && mq.matches ? 'dark' : 'light';
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', label);
      buttons[i].setAttribute('title', label);
    }
  }

  apply(resolved());

  if (mq) {
    var onChange = function () { if (!stored()) apply(resolved()); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  document.addEventListener('DOMContentLoaded', function () { apply(resolved()); });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store(next);
    apply(next);
  });
})();
