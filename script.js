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

  /* ---------- About: counter + stat bar ---------- */
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

  var aboutObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !aboutTriggered) {
        aboutTriggered = true;
        counterEls.forEach(animateCounter);
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
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 3200);
  }

  /* ---------- Lifecycle stepper accordion ---------- */
  var stepperItems = document.querySelectorAll('.stepper-item');

  stepperItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var isActive = item.classList.contains('active');
      stepperItems.forEach(function(s) { s.classList.remove('active'); });
      if (!isActive) item.classList.add('active');
    });
  });

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

  /* ---------- Repository search, filter, sort, highlight, expand ---------- */
  var searchInput  = document.getElementById('repo-search-input');
  var subjectFilter= document.getElementById('repo-subject-filter');
  var sortSelect   = document.getElementById('repo-sort');
  var searchBtn    = document.getElementById('repo-search-btn');
  var repoClear    = document.getElementById('repo-clear');
  var recordGrid   = document.getElementById('record-grid');
  var records      = Array.prototype.slice.call(document.querySelectorAll('.record-card'));
  var noResults    = document.getElementById('no-results');
  var repoCount    = document.getElementById('repo-count');
  var totalRecords = records.length;

  function highlight(text, query) {
    if (!query) return text;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  function applyFilter() {
    var query   = searchInput.value.trim().toLowerCase();
    var subject = subjectFilter.value;
    var sort    = sortSelect.value;
    var visible = [];

    /* show/hide + highlight */
    records.forEach(function (card) {
      var rawTitle   = card.getAttribute('data-title') || '';
      var metaEl     = card.querySelector('.record-meta');
      var meta       = metaEl ? metaEl.textContent : '';
      var cardSubject= card.getAttribute('data-subject') || '';
      var matchQ     = query === '' || rawTitle.toLowerCase().indexOf(query) !== -1 || meta.toLowerCase().indexOf(query) !== -1;
      var matchS     = subject === 'all' || cardSubject === subject;

      if (matchQ && matchS) {
        card.style.display = '';
        visible.push(card);
        var h4 = card.querySelector('h4');
        h4.innerHTML = highlight(rawTitle, query);
      } else {
        card.style.display = 'none';
        card.querySelector('h4').textContent = rawTitle;
      }
    });

    /* sort visible cards */
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

    /* update count */
    repoCount.textContent = visible.length;
    noResults.classList.toggle('show', visible.length === 0);

    /* show/hide clear button */
    repoClear.classList.toggle('show', query.length > 0);
  }

  searchBtn.addEventListener('click', applyFilter);
  searchInput.addEventListener('input', applyFilter);
  subjectFilter.addEventListener('change', applyFilter);
  sortSelect.addEventListener('change', applyFilter);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyFilter(); }
  });
  repoClear.addEventListener('click', function () {
    searchInput.value = '';
    applyFilter();
    searchInput.focus();
  });

  /* View entry expand/collapse */
  document.querySelectorAll('.view-entry-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.record-card');
      var isOpen = card.classList.contains('expanded');
      /* close all others */
      document.querySelectorAll('.record-card.expanded').forEach(function (c) {
        c.classList.remove('expanded');
        var b = c.querySelector('.view-entry-btn');
        if (b) { b.textContent = 'View entry'; b.classList.remove('active'); }
      });
      if (!isOpen) {
        card.classList.add('expanded');
        btn.textContent = 'Close entry';
        btn.classList.add('active');
      }
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

});
