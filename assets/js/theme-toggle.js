// assets/js/theme-toggle.js
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  // ----- 동적 스타일 태그 (CSS를 한방에 덮어쓰는 용도) -----
  var dyn = document.getElementById('dynamic-theme');
  if (!dyn) {
    dyn = document.createElement('style');
    dyn.id = 'dynamic-theme';
    document.head.appendChild(dyn);
  }

  // ----- 플로팅 버튼 없으면 생성 -----
  var btn = document.getElementById('theme-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-fab';
    document.body.appendChild(btn);
  }

  // 버튼 기본 스타일(별도 SCSS 없이도 예쁘게)
  var fabCSS = document.getElementById('theme-fab-style');
  if (!fabCSS) {
    fabCSS = document.createElement('style');
    fabCSS.id = 'theme-fab-style';
    fabCSS.textContent = `
      .theme-fab{
        position:fixed;right:18px;bottom:18px;width:48px;height:48px;
        display:grid;place-items:center;border-radius:999px;border:0;
        cursor:pointer;z-index:9999;box-shadow:0 6px 18px rgba(0,0,0,.35);
        transition:background-color .15s,color .15s,transform .15s;
      }
      .theme-fab:hover{ transform: translateY(-1px); }
    `;
    document.head.appendChild(fabCSS);
  }

  function cssFor(mode){
    // 페이지 전체에 강하게 먹이는 ‘핵심’ 오버라이드
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
        code,pre{ background:#ffffff !important; color:#111111 !important; }
        /* FAB: 라이트=달+검정 */
        #theme-toggle{ background:#000 !important; color:#fff !important; }
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
        code,pre{ background:#0f0f0f !important; color:#e5e5e5 !important; }
        /* FAB: 다크=해+하양 */
        #theme-toggle{ background:#fff !important; color:#000 !important; }
      `;
    }
  }

  function apply(mode){
    root.setAttribute('data-theme', mode);
    localStorage.setItem(KEY, mode);
    document.documentElement.style.colorScheme = mode;
    dyn.textContent = cssFor(mode);
    btn.textContent = (mode === 'dark') ? '☀️' : '🌙';
  }

  // 초기 모드: 저장값 없으면 라이트
  var saved = localStorage.getItem(KEY) || 'light';
  apply(saved);

  btn.addEventListener('click', function(){
    var next = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    apply(next);
  });
})();
