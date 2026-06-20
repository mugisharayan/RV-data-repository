/* =========================================================
   Raising Voices Uganda — GBV Data Repository
   script.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Page load reveal ---------- */
  document.body.classList.remove('page-loading');
  document.body.classList.add('page-ready');

  /* ---------- Scroll progress bar ---------- */
  var progressFill = document.getElementById('scroll-progress-fill');
  function updateProgress() {
    var docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    progressFill.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------- Sticky header ---------- */
  var header = document.getElementById('site-header');
  function onScrollHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Mobile nav toggle (slide-in drawer + overlay) ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var navClose = document.getElementById('nav-close');
  var navLinks = document.getElementById('nav-links');

  // Inject overlay element
  var navOverlay = document.createElement('div');
  navOverlay.className = 'nav-overlay';
  document.body.appendChild(navOverlay);

  function openNav() {
    navLinks.classList.add('open');
    navOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.innerHTML = '<i class="ti ti-x"></i>';
  }
  function closeNav() {
    navLinks.classList.remove('open');
    navOverlay.classList.remove('show');
    document.body.style.overflow = '';
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.innerHTML = '<i class="ti ti-menu-2"></i>';
  }

  navToggle.addEventListener('click', function () {
    navLinks.classList.contains('open') ? closeNav() : openNav();
  });
  navClose.addEventListener('click', closeNav);
  navOverlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) closeNav();
  });
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  /* ---------- Active nav link on scroll (scroll-spy) ---------- */
  var sectionIds = ['top', 'about', 'modules', 'lifecycle', 'repository', 'support', 'contact'];

  var spySections = sectionIds.map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);
  var navAnchors = Array.prototype.slice.call(navLinks.querySelectorAll('a'));

  function onScrollSpy() {
    var current = spySections[0];
    var scrollPos = window.scrollY + 140;
    spySections.forEach(function (sec) {
      if (sec.offsetTop <= scrollPos) current = sec;
    });
    navAnchors.forEach(function (a) {
      var href = a.getAttribute('href');
      a.classList.toggle('active', href === '#' + current.id);
    });
  }
  onScrollSpy();
  window.addEventListener('scroll', onScrollSpy, { passive: true });

  /* ---------- About: counter + stat bar + SVG rings ---------- */
  var counterEls = document.querySelectorAll('.counter');
  var aboutLeft  = document.querySelector('.about-left');
  var aboutTriggered = false;

  function easeOut(t){ return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(easeOut(progress) * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
  }

  function animateRings() {
    document.querySelectorAll('.about-ring-fill').forEach(function(circle) {
      var pct = parseFloat(circle.getAttribute('data-pct')) || 0;
      var circumference = 2 * Math.PI * 32; /* r=32 */
      var offset = circumference * (1 - pct / 100);
      circle.style.strokeDasharray  = circumference;
      circle.style.strokeDashoffset = circumference;
      /* Force reflow then animate */
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          circle.style.strokeDashoffset = offset;
        });
      });
    });
  }

  var aboutObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !aboutTriggered) {
        aboutTriggered = true;
        counterEls.forEach(animateCounter);
        animateRings();
        if (aboutLeft) aboutLeft.classList.add('in');
        aboutObserver.disconnect();
      }
    });
  }, { threshold: 0.2 });

  var aboutSection = document.getElementById('about');
  if (aboutSection) aboutObserver.observe(aboutSection);

  /* ---------- Standards marquee — pause if reduced motion ---------- */
  if (prefersReducedMotion) {
    var track = document.getElementById('standards-track');
    if (track) track.style.animationPlayState = 'paused';
  }

  /* ---------- Hero entrance animation ---------- */
  document.querySelectorAll('.hero-anim').forEach(function (el) {
    el.style.animationPlayState = 'running';
  });

  /* ---------- CTA band stats counter ---------- */
  var ctaBand = document.querySelector('.cta-band');
  var ctaTriggered = false;
  if (ctaBand) {
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !ctaTriggered) {
          ctaTriggered = true;
          ctaBand.querySelectorAll('.counter').forEach(animateCounter);
          ctaObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });
    ctaObserver.observe(ctaBand);
  }

  /* ---------- Footer: staggered column reveal ---------- */
  var footerCols = document.querySelectorAll('.footer-col-reveal');
  if (footerCols.length) {
    var footerObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          footerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    footerCols.forEach(function (col) { footerObserver.observe(col); });
  }

  /* ---------- Newsletter form ---------- */
  var newsletterForm = document.getElementById('newsletter-form');
  var newsletterFeedback = document.getElementById('newsletter-feedback');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      newsletterForm.style.display = 'none';
      newsletterFeedback.classList.add('show');
    });
  }

  /* ---------- Back to top ---------- */
  var backToTop = document.getElementById('back-to-top');
  function onScrollBackTop() {
    backToTop.classList.toggle('show', window.scrollY > 480);
  }
  onScrollBackTop();
  window.addEventListener('scroll', onScrollBackTop, { passive: true });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Staff sign-in modal ---------- */
  var loginModal    = document.getElementById('login-modal');
  var openers       = ['open-login','open-login-hero','open-login-cta','open-login-qa']
    .map(function(id){ return document.getElementById(id); }).filter(Boolean);
  var closeBtn      = document.getElementById('close-login');
  var loginForm     = document.getElementById('staff-login-form');
  var modalSuccess  = document.getElementById('modal-success');
  var successClose  = document.getElementById('modal-success-close');
  var loginSubmit   = document.getElementById('login-submit');

  /* Focusable elements inside modal for focus trap */
  function getFocusable(){
    return Array.prototype.slice.call(
      loginModal.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')
    ).filter(function(el){ return !el.disabled && el.offsetParent !== null; });
  }

  function openModal(){
    loginModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    /* reset form state */
    loginForm.style.display = '';
    loginForm.reset();
    modalSuccess.classList.remove('show');
    loginSubmit.classList.remove('loading');
    clearErrors();
    /* reset role banner */
    if(roleBanner){ roleBanner.classList.remove('has-role'); }
    if(mrbIcon){ mrbIcon.innerHTML = '<i class="ti ti-users"></i>'; }
    if(mrbTitle){ mrbTitle.textContent = 'Select your role'; }
    if(mrbDesc){ mrbDesc.textContent = 'Choose your staff role to continue'; }
    /* reset strength */
    if(pwStrength){ pwStrength.classList.remove('show'); }
    setTimeout(function(){
      var f = getFocusable();
      if(f.length) f[0].focus();
    }, 50);
  }
  function closeModal(){
    loginModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openers.forEach(function(btn){ btn.addEventListener('click', openModal); });
  closeBtn.addEventListener('click', closeModal);
  if(successClose) successClose.addEventListener('click', closeModal);
  loginModal.addEventListener('click', function(e){
    if(e.target === loginModal) closeModal();
  });
  document.addEventListener('keydown', function(e){
    if(!loginModal.classList.contains('open')) return;
    if(e.key === 'Escape'){ closeModal(); return; }
    /* Focus trap */
    if(e.key === 'Tab'){
      var focusable = getFocusable();
      if(!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    }
  });

  /* ---------- Inline validation ---------- */
  function showError(fieldId, wrapId, msg){
    var el = document.getElementById(fieldId);
    var wrap = document.getElementById(wrapId);
    if(el) el.textContent = msg;
    if(wrap) {
      var inputWrap = wrap.querySelector('.form-input-wrap, .form-select-wrap');
      if(inputWrap) inputWrap.classList.toggle('error', msg !== '');
    }
  }
  function clearErrors(){
    ['err-role','err-email','err-password'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.textContent = '';
    });
    document.querySelectorAll('.form-input-wrap, .form-select-wrap').forEach(function(w){
      w.classList.remove('error');
    });
  }

  /* Live clear on input */
  ['staff-role','staff-email','staff-password'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', function(){
      var errId = 'err-' + id.replace('staff-','');
      showError(errId, 'fg-' + id.replace('staff-',''), '');
    });
  });

  /* ---------- Password show/hide ---------- */
  var togglePw   = document.getElementById('toggle-pw');
  var toggleIcon = document.getElementById('toggle-pw-icon');
  var pwInput    = document.getElementById('staff-password');
  if(togglePw){
    togglePw.addEventListener('click', function(){
      var isHidden = pwInput.type === 'password';
      pwInput.type = isHidden ? 'text' : 'password';
      toggleIcon.className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
      togglePw.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  }

  /* ---------- Password strength indicator ---------- */
  var pwStrength      = document.getElementById('pw-strength');
  var pwStrengthFill  = document.getElementById('pw-strength-fill');
  var pwStrengthLabel = document.getElementById('pw-strength-label');
  var strengthLevels  = [
    { label:'Too short',  color:'#C0392B', pct:10 },
    { label:'Weak',       color:'#E8640C', pct:30 },
    { label:'Fair',       color:'#C9920A', pct:55 },
    { label:'Good',       color:'#2E9478', pct:78 },
    { label:'Strong',     color:'#1A7A46', pct:100 }
  ];
  function scorePassword(pw){
    if(pw.length < 6) return 0;
    var score = 1;
    if(pw.length >= 10) score++;
    if(/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if(/[0-9]/.test(pw)) score++;
    if(/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }
  if(pwInput && pwStrength){
    pwInput.addEventListener('input', function(){
      var val = pwInput.value;
      if(!val){ pwStrength.classList.remove('show'); return; }
      pwStrength.classList.add('show');
      var lvl = strengthLevels[scorePassword(val)];
      pwStrengthFill.style.width = lvl.pct + '%';
      pwStrengthFill.style.background = lvl.color;
      pwStrengthLabel.textContent = lvl.label;
      pwStrengthLabel.style.color = lvl.color;
    });
  }

  /* ---------- Role-based icon/illustration ---------- */
  var staffRole   = document.getElementById('staff-role');
  var roleBanner  = document.getElementById('modal-role-banner');
  var mrbIcon     = document.getElementById('mrb-icon');
  var mrbTitle    = document.getElementById('mrb-title');
  var mrbDesc     = document.getElementById('mrb-desc');
  var roleData = {
    activist:   { icon:'ti-heart-handshake', title:'Field activist',        desc:'Community mobilisation & first response' },
    officer:    { icon:'ti-clipboard-heart', title:'Case officer',           desc:'Incident intake, tracking & referrals' },
    researcher: { icon:'ti-microscope',      title:'Researcher',             desc:'Research repository & analytics access' },
    admin:      { icon:'ti-shield-cog',      title:'System administrator',   desc:'Full system & user management access' }
  };
  if(staffRole && roleBanner){
    staffRole.addEventListener('change', function(){
      var val = staffRole.value;
      if(!val){
        roleBanner.classList.remove('has-role');
        mrbIcon.innerHTML = '<i class="ti ti-users"></i>';
        mrbTitle.textContent = 'Select your role';
        mrbDesc.textContent  = 'Choose your staff role to continue';
        return;
      }
      var d = roleData[val];
      if(!d) return;
      roleBanner.classList.add('has-role');
      mrbIcon.innerHTML = '<i class="ti ' + d.icon + '"></i>';
      mrbTitle.textContent = d.title;
      mrbDesc.textContent  = d.desc;
    });
  }

  /* ---------- Forgot password toast ---------- */
  var forgotLink = document.getElementById('forgot-link');
  if(forgotLink){
    forgotLink.addEventListener('click', function(){
      showToast('Password reset must be requested from your system administrator.');
    });
  }

  /* ---------- Form submit ---------- */
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    clearErrors();
    var role  = document.getElementById('staff-role').value;
    var email = document.getElementById('staff-email').value.trim();
    var pw    = document.getElementById('staff-password').value;
    var valid = true;

    if(!role){
      showError('err-role','fg-role','Please select your role.'); valid=false;
    }
    if(!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)){
      showError('err-email','fg-email','Please enter a valid work email.'); valid=false;
    }
    if(pw.length < 6){
      showError('err-password','fg-password','Password must be at least 6 characters.'); valid=false;
    }
    if(!valid) return;

    /* Loading state */
    loginSubmit.classList.add('loading');
    loginSubmit.disabled = true;

    setTimeout(function(){
      loginSubmit.classList.remove('loading');
      loginSubmit.disabled = false;
      loginForm.style.display = 'none';
      modalSuccess.classList.add('show');
    }, 1600);
  });

  /* ---------- Toast helper ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 3800);
  }

  /* ---------- Lifecycle horizontal timeline ---------- */
  var lcSteps      = document.querySelectorAll('.lc-step');
  var lcFill       = document.getElementById('lc-progress-fill');
  var lcLabel      = document.getElementById('lc-progress-label');
  var lcWrap       = document.querySelector('.lc-timeline-wrap');
  var totalSteps   = lcSteps.length;

  function setActiveStep(idx) {
    lcSteps.forEach(function(s, i) {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('done',   i < idx);
    });
    if (lcFill)  lcFill.style.width  = ((idx + 1) / totalSteps * 100) + '%';
    if (lcLabel) lcLabel.textContent = 'Step ' + (idx + 1) + ' of ' + totalSteps;
    /* Scroll active card into view inside the wrapper */
    if (lcWrap) {
      var activeEl = lcSteps[idx];
      if (activeEl) {
        var wrapLeft  = lcWrap.scrollLeft;
        var wrapWidth = lcWrap.offsetWidth;
        var elLeft    = activeEl.offsetLeft;
        var elWidth   = activeEl.offsetWidth;
        var target    = elLeft - (wrapWidth / 2) + (elWidth / 2);
        lcWrap.scrollTo({ left: target, behavior: 'smooth' });
      }
    }
  }

  lcSteps.forEach(function(step, i) {
    step.addEventListener('click', function() { setActiveStep(i); });
  });

  /* Drag-to-scroll on the timeline wrapper */
  if (lcWrap && !prefersReducedMotion) {
    var isDown = false, startX, scrollLeft;
    lcWrap.addEventListener('mousedown',  function(e) { isDown = true; startX = e.pageX - lcWrap.offsetLeft; scrollLeft = lcWrap.scrollLeft; });
    lcWrap.addEventListener('mouseleave', function()  { isDown = false; });
    lcWrap.addEventListener('mouseup',    function()  { isDown = false; });
    lcWrap.addEventListener('mousemove',  function(e) {
      if (!isDown) return;
      e.preventDefault();
      lcWrap.scrollLeft = scrollLeft - (e.pageX - lcWrap.offsetLeft - startX);
    });
  }

  /* ---------- Support filter tabs ---------- */
  var supTabs = document.querySelectorAll('.sup-tab');
  var supCards = document.querySelectorAll('#support-grid .support-card');

  supTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      supTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var cat = tab.getAttribute('data-cat');
      supCards.forEach(function (card) {
        card.classList.toggle('hidden', cat !== 'all' && card.getAttribute('data-cat') !== cat);
      });
    });
  });

  /* ---------- Copy phone number ---------- */
  document.querySelectorAll('.copy-phone').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var phone = btn.getAttribute('data-phone');
      navigator.clipboard.writeText(phone).then(function () {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="ti ti-check"></i>';
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="ti ti-copy"></i>';
        }, 2000);
      });
    });
  });

  /* ---------- Modules filter tabs ---------- */
  var modTabs = document.querySelectorAll('.mod-tab');
  var modCards = document.querySelectorAll('#modules-grid .mod-card');

  modTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      modTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var filter = tab.getAttribute('data-filter');
      modCards.forEach(function (card) {
        var access = card.getAttribute('data-access');
        var show = filter === 'all' || access === filter;
        card.classList.toggle('hidden', !show);
      });
    });
  });

  /* ---------- Module cards: 3D tilt + SVG connectors ---------- */
  if (!prefersReducedMotion) {
    modCards.forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        var r = card.getBoundingClientRect();
        var mx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        var my = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        var rx = -my * 8;
        var ry =  mx * 8;
        card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(8px)';
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });

    /* Draw SVG connector lines between card centres */
    var connSvg = document.getElementById('mod-connectors');
    var grid    = document.getElementById('modules-grid');
    if (connSvg && grid) {
      function drawConnectors() {
        var visCards = Array.prototype.slice.call(grid.querySelectorAll('.mod-card:not(.hidden)'));
        connSvg.innerHTML = '';
        if (visCards.length < 2) return;
        var gRect = grid.getBoundingClientRect();
        var centres = visCards.map(function(c) {
          var r = c.getBoundingClientRect();
          return { x: r.left - gRect.left + r.width/2, y: r.top - gRect.top + r.height/2 };
        });
        for (var i = 0; i < centres.length - 1; i++) {
          var a = centres[i], b = centres[i + 1];
          var line = document.createElementNS('http://www.w3.org/2000/svg','line');
          line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
          line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
          line.setAttribute('class','mod-connector-line');
          connSvg.appendChild(line);
          var dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
          dot.setAttribute('cx', a.x); dot.setAttribute('cy', a.y); dot.setAttribute('r','5');
          dot.setAttribute('class','mod-connector-node');
          connSvg.appendChild(dot);
        }
        var last = centres[centres.length - 1];
        var lastDot = document.createElementNS('http://www.w3.org/2000/svg','circle');
        lastDot.setAttribute('cx', last.x); lastDot.setAttribute('cy', last.y); lastDot.setAttribute('r','5');
        lastDot.setAttribute('class','mod-connector-node');
        connSvg.appendChild(lastDot);
      }
      drawConnectors();
      window.addEventListener('resize', drawConnectors, { passive: true });
      /* Redraw when filter changes */
      modTabs.forEach(function(tab) { tab.addEventListener('click', function(){ setTimeout(drawConnectors, 50); }); });
    }
  }

  /* ---------- Repository search, filter, sort, highlight, expand ---------- */
  var searchInput  = document.getElementById('repo-search-input');
  var sortSelect   = document.getElementById('repo-sort');
  var searchBtn    = document.getElementById('repo-search-btn');
  var repoClear    = document.getElementById('repo-clear');
  var recordGrid   = document.getElementById('record-grid');
  var records      = Array.prototype.slice.call(document.querySelectorAll('.record-card'));
  var noResults    = document.getElementById('no-results');
  var repoCount    = document.getElementById('repo-count');
  var activeSubject = 'all';

  /* Subject pill filter */
  document.querySelectorAll('#repo-subject-pills .repo-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      document.querySelectorAll('#repo-subject-pills .repo-pill').forEach(function(p){ p.classList.remove('active'); });
      pill.classList.add('active');
      activeSubject = pill.getAttribute('data-subject');
      applyFilter();
    });
  });

  /* Animated search placeholder */
  var searchPlaceholders = [
    'Search by title, author or keyword…',
    'Try “SASA! Together”…',
    'Try “community mobilisation”…',
    'Try “intimate partner violence”…',
    'Try “school toolkit”…',
    'Try “policy brief”…'
  ];
  var phIdx = 0, phCharIdx = 0, phDeleting = false;
  function phTick() {
    if (document.activeElement === searchInput) { setTimeout(phTick, 400); return; }
    var current = searchPlaceholders[phIdx];
    if (!phDeleting) {
      phCharIdx++;
      searchInput.setAttribute('placeholder', current.slice(0, phCharIdx));
      if (phCharIdx === current.length) { phDeleting = true; setTimeout(phTick, 1800); return; }
      setTimeout(phTick, 42);
    } else {
      phCharIdx--;
      searchInput.setAttribute('placeholder', current.slice(0, phCharIdx));
      if (phCharIdx === 0) {
        phDeleting = false;
        phIdx = (phIdx + 1) % searchPlaceholders.length;
        setTimeout(phTick, 300);
        return;
      }
      setTimeout(phTick, 22);
    }
  }
  if (!prefersReducedMotion) setTimeout(phTick, 1000);

  function highlight(text, query) {
    if (!query) return text;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  function applyFilter() {
    var query   = searchInput.value.trim().toLowerCase();
    var sort    = sortSelect.value;
    var visible = [];

    records.forEach(function (card) {
      var rawTitle   = card.getAttribute('data-title') || '';
      var metaEl     = card.querySelector('.record-meta');
      var meta       = metaEl ? metaEl.textContent : '';
      var cardSubject= card.getAttribute('data-subject') || '';
      var matchQ     = query === '' || rawTitle.toLowerCase().indexOf(query) !== -1 || meta.toLowerCase().indexOf(query) !== -1;
      var matchS     = activeSubject === 'all' || cardSubject === activeSubject;

      if (matchQ && matchS) {
        card.style.display = '';
        card.classList.remove('flipped');
        visible.push(card);
        var h4 = card.querySelector('.rc-front h4');
        if (h4) h4.innerHTML = highlight(rawTitle, query);
      } else {
        card.style.display = 'none';
        card.classList.remove('flipped');
        var h4b = card.querySelector('.rc-front h4');
        if (h4b) h4b.textContent = rawTitle;
      }
    });

    if (sort !== 'default') {
      visible.sort(function (a, b) {
        if (sort === 'year-desc') return parseInt(b.dataset.year) - parseInt(a.dataset.year);
        if (sort === 'year-asc')  return parseInt(a.dataset.year) - parseInt(b.dataset.year);
        if (sort === 'title-asc') return a.dataset.title.localeCompare(b.dataset.title);
        if (sort === 'title-desc')return b.dataset.title.localeCompare(a.dataset.title);
        return 0;
      });
      visible.forEach(function (card) { recordGrid.appendChild(card); });
    }

    repoCount.textContent = visible.length;
    noResults.classList.toggle('show', visible.length === 0);
    repoClear.classList.toggle('show', query.length > 0);
  }

  if (searchBtn) searchBtn.addEventListener('click', applyFilter);
  searchInput.addEventListener('input', applyFilter);
  sortSelect.addEventListener('change', applyFilter);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyFilter(); }
  });
  repoClear.addEventListener('click', function () {
    searchInput.value = '';
    applyFilter();
    searchInput.focus();
  });

  /* ---------- Citation copy button ---------- */
  document.querySelectorAll('.rc-cite-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var card = btn.closest('.record-card');
      var citation = card.getAttribute('data-citation') || '';
      // decode HTML entities for plain text copy
      var tmp = document.createElement('textarea');
      tmp.innerHTML = citation;
      var plain = tmp.value;
      navigator.clipboard.writeText(plain).then(function() {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
        setTimeout(function() {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="ti ti-quote"></i> Cite';
        }, 2200);
      });
    });
  });

  /* ---------- Repository download intercept ---------- */
  document.querySelectorAll('.record-actions a.btn-navy').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      showToast('<i class="ti ti-lock" style="margin-right:6px"></i>Download available to authorised staff — please sign in.');
    });
  });
  document.querySelectorAll('.rc-flip-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var card = btn.closest('.record-card');
      card.classList.toggle('flipped');
    });
  });

  /* ---------- Smooth anchor scroll with header offset ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href === '#') { e.preventDefault(); return; }
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var headerH = document.getElementById('site-header').offsetHeight;
      var top = target.getBoundingClientRect().top + window.scrollY - headerH - 12;
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      if (navLinks.classList.contains('open')) closeNav();
    });
  });

  /* ---------- Hero particles ---------- */
  if (!prefersReducedMotion) {

    /* Typewriter / morphing headline */
    var twEl = document.getElementById('hero-typewriter');
    if (twEl) {
      var twPhrases = [
        'organised, secure data.',
        'protected survivor records.',
        'role-based access control.',
        'immutable audit trails.',
        'evidence-driven prevention.'
      ];
      var twIdx = 0, twCharIdx = 0, twDeleting = false;
      function twTick() {
        var current = twPhrases[twIdx];
        if (!twDeleting) {
          twCharIdx++;
          twEl.textContent = current.slice(0, twCharIdx);
          if (twCharIdx === current.length) {
            twDeleting = true;
            setTimeout(twTick, 1800);
            return;
          }
          setTimeout(twTick, 55);
        } else {
          twCharIdx--;
          twEl.textContent = current.slice(0, twCharIdx);
          if (twCharIdx === 0) {
            twDeleting = false;
            twIdx = (twIdx + 1) % twPhrases.length;
            setTimeout(twTick, 300);
            return;
          }
          setTimeout(twTick, 28);
        }
      }
      setTimeout(twTick, 1200);
    }

    /* Parallax tilt on hero content layers */
    var heroLeft  = document.querySelector('.hero-left');
    var heroRight = document.querySelector('.hero-right');
    var heroSection = document.getElementById('top');
    if (heroLeft && heroRight && heroSection) {
      document.addEventListener('mousemove', function(e) {
        var rect = heroSection.getBoundingClientRect();
        if (rect.bottom < 0) return;
        var mx = (e.clientX / window.innerWidth  - 0.5) * 2;
        var my = (e.clientY / window.innerHeight - 0.5) * 2;
        heroLeft.style.transform  = 'translate(' + (mx * -6) + 'px,' + (my * -4) + 'px)';
        heroRight.style.transform = 'translate(' + (mx *  8) + 'px,' + (my *  5) + 'px)';
      });
    }

    var hero = document.getElementById('top');
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-particles';
    hero.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var PARTICLE_COUNT = 55;
    var particles = [];

    function resizeCanvas() {
      canvas.width  = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    function randomBetween(a, b) { return a + Math.random() * (b - a); }

    function createParticle() {
      return {
        x:     randomBetween(0, canvas.width),
        y:     randomBetween(0, canvas.height),
        r:     randomBetween(0.8, 2.2),
        alpha: randomBetween(0.08, 0.35),
        vx:    randomBetween(-0.12, 0.12),
        vy:    randomBetween(-0.18, -0.06)
      };
    }

    for (var i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());

    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + p.alpha + ')';
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        /* wrap around edges */
        if (p.y < -4)  p.y = canvas.height + 4;
        if (p.x < -4)  p.x = canvas.width  + 4;
        if (p.x > canvas.width  + 4) p.x = -4;
      });
      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }

  /* =====================================================
     STEP 9 — Mobile Experience
     ===================================================== */

  /* Mobile bottom nav scroll-spy */
  var mbnItems = document.querySelectorAll('.mbn-item');
  var mbnSectionIds = ['top','repository','support','contact'];
  var mbnSections = mbnSectionIds.map(function(id){ return document.getElementById(id); }).filter(Boolean);

  function updateMobileNav(){
    var scrollPos = window.scrollY + window.innerHeight / 2;
    var current = mbnSections[0];
    mbnSections.forEach(function(sec){
      if(sec.offsetTop <= scrollPos) current = sec;
    });
    mbnItems.forEach(function(item){
      item.classList.toggle('active', item.getAttribute('data-section') === current.id);
    });
  }
  updateMobileNav();
  window.addEventListener('scroll', updateMobileNav, { passive:true });

  /* Smooth scroll for bottom nav links */
  mbnItems.forEach(function(item){
    item.addEventListener('click', function(e){
      var href = item.getAttribute('href');
      if(!href || href === '#') return;
      var target = document.querySelector(href);
      if(!target) return;
      e.preventDefault();
      var headerH = document.getElementById('site-header').offsetHeight;
      var top = target.getBoundingClientRect().top + window.scrollY - headerH - 12;
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });

  /* =====================================================
     STEP 8 — Micro-interactions & Animation Polish
     ===================================================== */

  if (!prefersReducedMotion) {

    /* --- 1. Cursor spotlight on dark sections --- */
    var spotlight = document.createElement('div');
    spotlight.className = 'cursor-spotlight hidden';
    document.body.appendChild(spotlight);

    var darkSections = ['.hero','#lifecycle','.cta-band','.site-footer'];
    function isOverDark(x, y) {
      return darkSections.some(function(sel) {
        var el = document.querySelector(sel);
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
    }
    document.addEventListener('mousemove', function(e) {
      spotlight.style.left = e.clientX + 'px';
      spotlight.style.top  = e.clientY + 'px';
      spotlight.classList.toggle('hidden', !isOverDark(e.clientX, e.clientY));
    });
    document.addEventListener('mouseleave', function() {
      spotlight.classList.add('hidden');
    });

    /* --- 2. Magnetic hover on CTA buttons --- */
    document.querySelectorAll('.btn-primary, .btn-navy, .btn-hero, .btn-outline-light').forEach(function(btn) {
      btn.addEventListener('mousemove', function(e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width  / 2)) * 0.28;
        var dy = (e.clientY - (r.top  + r.height / 2)) * 0.28;
        btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.04)';
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.transform = '';
      });
    });

    /* --- 3. Staggered list reveal --- */
    var staggerTargets = document.querySelectorAll(
      '.about-pillar, .support-escalate li, .footer-col li, .lc-tags span'
    );
    staggerTargets.forEach(function(el, i) {
      el.classList.add('stagger-item');
      /* group siblings — reset index per parent */
      var siblings = Array.prototype.slice.call(el.parentElement.children);
      var sibIdx = siblings.indexOf(el);
      el.style.setProperty('--si', (sibIdx * 80) + 'ms');
    });
    var staggerObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          staggerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    staggerTargets.forEach(function(el) { staggerObserver.observe(el); });

    /* --- 4. Odometer rolling-digit counter --- */
    function buildOdometer(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var digits = String(target).split('');
      el.innerHTML = '';
      var wrap = document.createElement('span');
      wrap.className = 'odometer-wrap';
      digits.forEach(function(d) {
        var col = document.createElement('span');
        col.className = 'odometer-digit';
        col.style.transform = 'translateY(100%)';
        col.textContent = d;
        wrap.appendChild(col);
      });
      el.appendChild(wrap);
      el.setAttribute('data-odometer', 'true');
    }

    function rollOdometer(el) {
      el.querySelectorAll('.odometer-digit').forEach(function(col, i) {
        setTimeout(function() {
          col.style.transform = 'translateY(0)';
        }, i * 80);
      });
    }

    /* Replace plain counter animation with odometer on about + cta counters */
    document.querySelectorAll('.counter').forEach(function(el) {
      buildOdometer(el);
    });

    /* Trigger roll when section comes into view */
    var odoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('[data-odometer]').forEach(rollOdometer);
          odoObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    [document.getElementById('about'), document.querySelector('.cta-band')].forEach(function(sec) {
      if (sec) odoObserver.observe(sec);
    });

  } /* end !prefersReducedMotion */

});
