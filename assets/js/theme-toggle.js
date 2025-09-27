// assets/js/theme-toggle.js
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  // 동적 스타일 태그
  var dyn = document.getElementById('dynamic-theme');
  if (!dyn) {
    dyn = document.createElement('style');
    dyn.id = 'dynamic-theme';
    document.head.appendChild(dyn);
  }

  // FAB 없으면 생성
  var btn = document.getElementById('theme-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-fab';
    document.body.appendChild(btn);
  }

  // FAB 기본 스타일(별도 SCSS 없이도 동작)
  var fabCSS = document.getElementById('theme-fab-style');
  if (!fabCSS) {
    fabCSS = document.createElement('style');
    fabCSS.id = 'theme-fab-style';
    fabCSS.textContent = `
      .theme-fab{
        position:fixed;right:18px;bottom:18px;width:48px;height:48px;
        display:grid;place-items:center;border:0;border-radius:999px;
        cursor:pointer;z-index:9999;box-shadow:0 6px 18px rgba(0,0,0,.35);
        transition:background-color .15s,color .15s,transform .15s;
      }
      .theme-fab:hover{ transform: translateY(-1px); }
    `;
    document.head.appendChild(fabCSS);
  }

  function cssFor(mode){
    // 공유 영역은 전역 비노출
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
        /* 본문 링크는 파란색 */
        a{ color:#1a73e8 !important; }

        /* 사이드바(왼쪽 메뉴바) 링크와 아이콘은 진한 글자색으로 고정 */
        .author__urls a,
        .author__urls .fa, .author__urls .fab, .author__urls .fas, .author__urls .far,
        .author__urls svg { color:#111111 !important; opacity:1 !important; }

        /* 코드 배경도 밝게 */
        code,pre{ background:#ffffff !important; color:#111111 !important; }

        /* FAB: 라이트=달+검정 */
        #theme-toggle{ background:#000 !important; color:#fff !important; }

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
        /* 본문 링크는 밝은 파란색 */
        a{ color:#8ab4ff !important; }

        /* 사이드바(왼쪽 메뉴바) 링크와 아이콘은 흰색으로 고정 */
        .author__urls a,
        .author__urls .fa, .author__urls .fab, .author__urls .fas, .author__urls .far,
        .author__urls svg { color:#ffffff !important; opacity:1 !important; }

        /* 코드 배경도 어둡게 */
        code,pre{ background:#0f0f0f !important; color:#e5e5e5 !important; }

        /* FAB: 다크=해+하양 */
        #theme-toggle{ background:#fff !important; color:#000 !important; }

        ${shareOff}
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

  // 초기: 저장값 없으면 라이트
  var saved = localStorage.getItem(KEY) || 'light';
  apply(saved);

  btn.addEventListener('click', function(){
    var next = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    apply(next);
  });
})();
