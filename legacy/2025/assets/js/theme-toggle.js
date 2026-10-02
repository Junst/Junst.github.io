// assets/js/theme-toggle.js
// The theme button itself (and its click handler) lives in _includes/head/custom.html,
// which just flips the `data-theme` attribute on <html>. This file reacts to that
// change by painting the heavier per-mode CSS overrides (sidebar, links, code blocks, etc).
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  // Dynamic style tag we own.
  var dyn = document.getElementById('dynamic-theme');
  if (!dyn) {
    dyn = document.createElement('style');
    dyn.id = 'dynamic-theme';
    document.head.appendChild(dyn);
  }

  // FAB fallback style (only used if no other CSS sized the button).
  var fabCSS = document.getElementById('theme-fab-style');
  if (!fabCSS) {
    fabCSS = document.createElement('style');
    fabCSS.id = 'theme-fab-style';
    fabCSS.textContent = `
      .theme-fab{
        display:grid;place-items:center;border:0;border-radius:999px;
        cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35);
        transition:background-color .15s,color .15s,transform .15s;
      }
      .theme-fab:hover{ transform: translateY(-1px); }
    `;
    document.head.appendChild(fabCSS);
  }

  function cssFor(mode){
    // Always-off elements.
    var shareOff = `
      .page__share, .page__share-title, .share, .share-links { display:none !important; }
    `;

    if (mode === 'light') {
      return `
        html,body,
        .masthead,.greedy-nav,
        .sidebar,.author__avatar,.author__content,.author__urls-wrapper,
        .page,.page__inner-wrap,.page__content,.archive,.initial-content,
        .page__footer,.site-footer{
          background:#ffffff !important; color:#111111 !important;
          background-image:none !important; box-shadow:none !important; border:0 !important;
        }
        a{ color:#1a73e8 !important; }
        .author__urls a,
        .author__urls .fa, .author__urls .fab, .author__urls .fas, .author__urls .far,
        .author__urls svg { color:#111111 !important; opacity:1 !important; }
        code,pre{ background:#ffffff !important; color:#111111 !important; }
        #theme-toggle{ background:#000 !important; color:#fff !important; }
        ::selection      { background:#000000 !important; color:#ffffff !important; }
        ::-moz-selection { background:#000000 !important; color:#ffffff !important; }
        ${shareOff}
      `;
    } else {
      return `
        html,body,
        .masthead,.greedy-nav,
        .sidebar,.author__avatar,.author__content,.author__urls-wrapper,
        .page,.page__inner-wrap,.page__content,.archive,.initial-content,
        .page__footer,.site-footer{
          background:#000000 !important; color:#e5e5e5 !important;
          background-image:none !important; box-shadow:none !important; border:0 !important;
        }
        a{ color:#8ab4ff !important; }
        .author__urls a,
        .author__urls .fa, .author__urls .fab, .author__urls .fas, .author__urls .far,
        .author__urls svg { color:#ffffff !important; opacity:1 !important; }
        code,pre{ background:#0f0f0f !important; color:#e5e5e5 !important; }
        #theme-toggle{ background:#fff !important; color:#000 !important; }
        ::selection      { background:#ffffff !important; color:#000000 !important; }
        ::-moz-selection { background:#ffffff !important; color:#000000 !important; }
        ${shareOff}
      `;
    }
  }

  // Pure paint — does NOT mutate data-theme (head's click handler owns that).
  function paint(mode){
    if (mode !== 'light' && mode !== 'dark') mode = 'light';
    localStorage.setItem(KEY, mode);
    document.documentElement.style.colorScheme = mode;
    dyn.textContent = cssFor(mode);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = (mode === 'dark') ? '☀️' : '🌙';
  }

  // Initial paint reflects whatever head/custom.html already set.
  paint(root.getAttribute('data-theme') || localStorage.getItem(KEY) || 'light');

  // React to data-theme changes from the head's click handler (single source of truth).
  new MutationObserver(function(muts){
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].attributeName === 'data-theme') {
        paint(root.getAttribute('data-theme'));
        return;
      }
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
