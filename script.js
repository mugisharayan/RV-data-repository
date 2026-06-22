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
  var sectionIds = ['top', 'about', 'modules', 'lifecycle', 'active-cases', 'repository', 'support', 'contact'];

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

  /* ---------- Staff portal modal (sign-in + sign-up) ---------- */
  var loginModal    = document.getElementById('login-modal');
  var openers       = ['open-login','open-login-hero','open-login-cta','open-login-qa']
    .map(function(id){ return document.getElementById(id); }).filter(Boolean);
  var closeBtn      = document.getElementById('close-login');
  var loginForm     = document.getElementById('staff-login-form');
  var modalSuccess  = document.getElementById('modal-success');
  var successClose  = document.getElementById('modal-success-close');
  var loginSubmit   = document.getElementById('login-submit');

  /* ── Tab switching ── */
  var tabBtns       = document.querySelectorAll('.modal-tab');
  var tabIndicator  = document.getElementById('modal-tab-indicator');
  var panelSignin   = document.getElementById('panel-signin');
  var panelSignup   = document.getElementById('panel-signup');

  function switchTab(target) {
    tabBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    var activeBtn = document.getElementById('tab-' + target);
    if(activeBtn){ activeBtn.classList.add('active'); activeBtn.setAttribute('aria-selected','true'); }

    if(target === 'signup'){
      tabIndicator.classList.add('to-signup');
      panelSignin.classList.add('modal-panel-hidden');   panelSignin.classList.remove('modal-panel');
      panelSignup.classList.remove('modal-panel-hidden'); panelSignup.classList.add('modal-panel');
    } else {
      tabIndicator.classList.remove('to-signup');
      panelSignup.classList.add('modal-panel-hidden');   panelSignup.classList.remove('modal-panel');
      panelSignin.classList.remove('modal-panel-hidden'); panelSignin.classList.add('modal-panel');
    }
    /* scroll modal box to top */
    loginModal.querySelector('.modal-box').scrollTop = 0;
  }

  tabBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  /* "Register" / "Sign in" cross-links */
  document.querySelectorAll('.modal-switch-link').forEach(function(link){
    link.addEventListener('click', function(){
      switchTab(link.getAttribute('data-switch'));
    });
  });

  /* Focusable elements inside modal for focus trap */
  function getFocusable(){
    return Array.prototype.slice.call(
      loginModal.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')
    ).filter(function(el){ return !el.disabled && el.offsetParent !== null; });
  }

  function openModal(){
    loginModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    /* reset sign-in form */
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
    /* reset tabs to sign-in */
    switchTab('signin');
    /* reset sign-up wizard */
    goToRegStep(0);
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

  /* ================================================================
     RV DATA REPOSITORY — localStorage Auth Engine
     ================================================================
     Storage keys:
       rv_users   : array of user objects
       rv_codes   : array of invite code objects
       rv_session : current logged-in user object (null if logged out)
     ================================================================ */

  /* ── Seed admin account on first load ── */
  function dbGet(key){ try{ return JSON.parse(localStorage.getItem(key)) || []; }catch(e){ return []; } }
  function dbSet(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

  function initDB(){
    var users = dbGet('rv_users');
    var hasAdmin = users.some(function(u){ return u.role === 'admin'; });
    if(!hasAdmin){
      users.push({
        id: 'USR-001',
        firstName: 'System',
        lastName:  'Administrator',
        email:     'admin@raisingvoices.org',
        password:  'Admin@2026',
        role:      'admin',
        department:'Administration',
        createdAt: new Date().toISOString(),
        twofa:     true
      });
      dbSet('rv_users', users);
    }
  }
  initDB();

  /* ── Simple hash (XOR + base36, not cryptographic — prototype only) ── */
  function hashPw(pw){
    var h = 0;
    for(var i=0;i<pw.length;i++){ h = ((h<<5)-h)+pw.charCodeAt(i); h|=0; }
    return Math.abs(h).toString(36);
  }

  /* ── Session helpers ── */
  function getSession(){ try{ return JSON.parse(localStorage.getItem('rv_session')); }catch(e){ return null; } }
  function setSession(user){ localStorage.setItem('rv_session',JSON.stringify(user)); }
  function clearSession(){ localStorage.removeItem('rv_session'); }

  /* ── Update header sign-in button when logged in ── */
  function updateHeaderAuth(){
    var session = getSession();
    var btns = document.querySelectorAll('#open-login, #open-login-hero, #open-login-cta, #open-login-qa');
    if(session){
      btns.forEach(function(btn){
        btn.innerHTML = '<i class="ti ti-user-circle"></i><span>' + session.firstName + '</span>';
        btn.style.background = 'var(--green)';
      });
    } else {
      btns.forEach(function(btn){
        btn.innerHTML = '<i class="ti ti-lock"></i><span>Staff sign-in</span>';
        btn.style.background = '';
      });
    }
  }
  updateHeaderAuth();

  /* ---------- Forgot password toast ---------- */
  var forgotLink = document.getElementById('forgot-link');
  if(forgotLink){
    forgotLink.addEventListener('click', function(){
      showToast('Password reset must be requested from your system administrator.');
    });
  }

  /* ---------- Form submit (sign-in) — REAL AUTH ── */
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    clearErrors();
    var role  = document.getElementById('staff-role').value;
    var email = document.getElementById('staff-email').value.trim().toLowerCase();
    var pw    = document.getElementById('staff-password').value;
    var valid = true;

    if(!role){ showError('err-role','fg-role','Please select your role.'); valid=false; }
    if(!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)){ showError('err-email','fg-email','Please enter a valid work email.'); valid=false; }
    if(pw.length < 6){ showError('err-password','fg-password','Password must be at least 6 characters.'); valid=false; }
    if(!valid) return;

    loginSubmit.classList.add('loading');
    loginSubmit.disabled = true;

    setTimeout(function(){
      loginSubmit.classList.remove('loading');
      loginSubmit.disabled = false;

      var users = dbGet('rv_users');
      var user  = users.find(function(u){
        return u.email.toLowerCase() === email && u.password === pw;
      });

      if(!user){
        showError('err-password','fg-password','Incorrect email or password.');
        return;
      }
      if(user.role !== role && role !== 'admin'){
        showError('err-role','fg-role','Role does not match your registered account.');
        return;
      }

      /* ✅ Sign in success */
      setSession(user);
      updateHeaderAuth();
      loginForm.style.display = 'none';

      if(user.role === 'admin'){
        /* Show admin dashboard inside modal */
        document.getElementById('success-heading').textContent = 'Welcome back, ' + user.firstName;
        document.getElementById('success-body').textContent = '';
        modalSuccess.classList.add('show');
        showAdminDashboard();
      } else {
        document.getElementById('success-heading').textContent = 'Signed in — ' + user.firstName + ' ' + user.lastName;
        document.getElementById('success-body').textContent = 'Welcome back. You are signed in as ' + user.role + '. Your session is active.';
        modalSuccess.classList.add('show');
      }
    }, 1200);
  });

  /* ---------- Registration wizard ---------- */
  var currentRegStep = 0;
  var regPanels = document.querySelectorAll('.reg-panel');
  var regStepDots = document.querySelectorAll('.reg-step');
  var regStepLines = document.querySelectorAll('.reg-step-line');

  function goToRegStep(idx) {
    regPanels.forEach(function(p){ p.classList.remove('active'); });
    var target = document.getElementById('reg-step-' + idx);
    if(target) target.classList.add('active');
    currentRegStep = idx;

    /* Update dot states */
    regStepDots.forEach(function(dot, i){
      dot.classList.remove('active','done');
      if(i < idx) dot.classList.add('done');
      else if(i === idx) dot.classList.add('active');
    });
    /* Update connector lines */
    regStepLines.forEach(function(line, i){
      line.classList.toggle('filled', i < idx);
    });
  }

  /* Next buttons */
  document.querySelectorAll('.reg-next-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var next = parseInt(btn.getAttribute('data-next'), 10);
      if(!validateRegStep(currentRegStep)) return;
      goToRegStep(next);
      loginModal.querySelector('.modal-box').scrollTop = 0;
    });
  });

  /* Back buttons */
  document.querySelectorAll('.reg-back-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var back = parseInt(btn.getAttribute('data-back'), 10);
      goToRegStep(back);
      loginModal.querySelector('.modal-box').scrollTop = 0;
    });
  });

  /* Validate each step before proceeding */
  function validateRegStep(step) {
    var ok = true;
    if(step === 0){
      var fn = document.getElementById('reg-firstname').value.trim();
      var ln = document.getElementById('reg-lastname').value.trim();
      var em = document.getElementById('reg-email').value.trim();
      var inv = document.getElementById('reg-invite').value.trim();
      if(!fn){ showRegError('err-reg-firstname','reg-firstname','Required.'); ok=false; }
      else clearRegError('err-reg-firstname','reg-firstname');
      if(!ln){ showRegError('err-reg-lastname','reg-lastname','Required.'); ok=false; }
      else clearRegError('err-reg-lastname','reg-lastname');
      if(!em || !/^[^@]+@[^@]+\.[^@]+$/.test(em)){ showRegError('err-reg-email','reg-email','Enter a valid email.'); ok=false; }
      else clearRegError('err-reg-email','reg-email');
      if(!inv || inv.length < 6){ showRegError('err-reg-invite','reg-invite','Enter a valid invite code.'); ok=false; }
      else clearRegError('err-reg-invite','reg-invite');
    }
    if(step === 1){
      var roleVal = document.querySelector('input[name="reg-role"]:checked');
      var dept = document.getElementById('reg-department').value;
      if(!roleVal){ showRegError('err-reg-role','role-cards','Please select your role.'); ok=false; }
      else clearRegError('err-reg-role','role-cards');
      if(!dept){ showRegError('err-reg-department','reg-department','Please select your department.'); ok=false; }
      else clearRegError('err-reg-department','reg-department');
    }
    return ok;
  }

  function showRegError(errId, inputId, msg){
    var errEl = document.getElementById(errId);
    if(errEl) errEl.textContent = msg;
    var inputEl = document.getElementById(inputId);
    if(inputEl){
      var wrap = inputEl.closest('.form-input-wrap, .form-select-wrap');
      if(wrap) wrap.classList.add('error');
    }
  }
  function clearRegError(errId, inputId){
    var errEl = document.getElementById(errId);
    if(errEl) errEl.textContent = '';
    var inputEl = document.getElementById(inputId);
    if(inputEl){
      var wrap = inputEl.closest('.form-input-wrap, .form-select-wrap');
      if(wrap) wrap.classList.remove('error');
    }
  }

  /* Registration submit — REAL ACCOUNT CREATION */
  var regSubmitBtn = document.getElementById('reg-submit');
  if(regSubmitBtn){
    regSubmitBtn.addEventListener('click', function(){
      var pw1   = document.getElementById('reg-password').value;
      var pw2   = document.getElementById('reg-confirm').value;
      var terms = document.getElementById('reg-terms');
      var ok    = true;

      if(pw1.length < 8){ showRegError('err-reg-password','reg-password','Password must be at least 8 characters.'); ok=false; }
      else clearRegError('err-reg-password','reg-password');
      if(pw1 !== pw2){ showRegError('err-reg-confirm','reg-confirm','Passwords do not match.'); ok=false; }
      else clearRegError('err-reg-confirm','reg-confirm');
      if(!terms || !terms.checked){ showRegError('err-reg-terms','reg-terms','You must accept the terms.'); ok=false; }
      else clearRegError('err-reg-terms','reg-terms');
      if(!ok) return;

      /* Pull data from previous steps */
      var fn      = document.getElementById('reg-firstname').value.trim();
      var ln      = document.getElementById('reg-lastname').value.trim();
      var em      = document.getElementById('reg-email').value.trim().toLowerCase();
      var invCode = document.getElementById('reg-invite').value.trim().toUpperCase();
      var roleVal = document.querySelector('input[name="reg-role"]:checked');
      var dept    = document.getElementById('reg-department').value;

      /* Validate invite code */
      var codes   = dbGet('rv_codes');
      var codeObj = codes.find(function(c){ return c.code === invCode && !c.used; });
      if(!codeObj){
        goToRegStep(0);
        showRegError('err-reg-invite','reg-invite','Invalid or already used invite code.');
        return;
      }

      /* Check email not already registered */
      var users = dbGet('rv_users');
      if(users.find(function(u){ return u.email.toLowerCase() === em; })){
        goToRegStep(0);
        showRegError('err-reg-email','reg-email','This email is already registered.');
        return;
      }

      regSubmitBtn.classList.add('loading');
      regSubmitBtn.disabled = true;

      setTimeout(function(){
        regSubmitBtn.classList.remove('loading');
        regSubmitBtn.disabled = false;

        /* Create account */
        var newUser = {
          id:         'USR-' + String(users.length + 1).padStart(3,'0'),
          firstName:  fn,
          lastName:   ln,
          email:      em,
          password:   pw1,
          role:       roleVal ? roleVal.value : 'activist',
          department: dept,
          createdAt:  new Date().toISOString(),
          twofa:      document.getElementById('reg-2fa') ? document.getElementById('reg-2fa').checked : false
        };
        users.push(newUser);
        dbSet('rv_users', users);

        /* Mark invite code as used */
        codeObj.used       = true;
        codeObj.usedBy     = em;
        codeObj.usedAt     = new Date().toISOString();
        dbSet('rv_codes', codes);

        /* Show success */
        panelSignup.classList.add('modal-panel-hidden');
        panelSignup.classList.remove('modal-panel');
        document.getElementById('success-heading').textContent = 'Account created!';
        document.getElementById('success-body').textContent    = 'Welcome, ' + fn + '. Your account has been created. You can now sign in using your email and password.';
        modalSuccess.classList.add('show');
      }, 1400);
    });
  }

  /* Registration password strength + requirements */
  var regPwInput       = document.getElementById('reg-password');
  var regPwStrength    = document.getElementById('reg-pw-strength');
  var regPwFill        = document.getElementById('reg-pw-strength-fill');
  var regPwLabel       = document.getElementById('reg-pw-strength-label');

  function checkPwRequirements(pw){
    var reqs = {
      'req-length':  pw.length >= 8,
      'req-upper':   /[A-Z]/.test(pw),
      'req-number':  /[0-9]/.test(pw),
      'req-special': /[^A-Za-z0-9]/.test(pw)
    };
    Object.keys(reqs).forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.classList.toggle('met', reqs[id]);
    });
  }

  if(regPwInput && regPwStrength){
    regPwInput.addEventListener('input', function(){
      var val = regPwInput.value;
      if(!val){ regPwStrength.classList.remove('show'); return; }
      regPwStrength.classList.add('show');
      var lvl = strengthLevels[scorePassword(val)];
      regPwFill.style.width = lvl.pct + '%';
      regPwFill.style.background = lvl.color;
      regPwLabel.textContent = lvl.label;
      regPwLabel.style.color = lvl.color;
      checkPwRequirements(val);
    });
  }

  /* Registration password show/hide */
  var toggleRegPw   = document.getElementById('toggle-reg-pw');
  var toggleRegIcon = document.getElementById('toggle-reg-pw-icon');
  var regPwField    = document.getElementById('reg-password');
  if(toggleRegPw){
    toggleRegPw.addEventListener('click', function(){
      var isHidden = regPwField.type === 'password';
      regPwField.type = isHidden ? 'text' : 'password';
      toggleRegIcon.className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
      toggleRegPw.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  }

  /* ================================================================
     ADMIN DASHBOARD
     ================================================================ */

  function generateCode(){
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code  = 'RV-';
    for(var i=0;i<4;i++) code += chars[Math.floor(Math.random()*chars.length)];
    code += '-';
    for(var j=0;j<4;j++) code += chars[Math.floor(Math.random()*chars.length)];
    return code;
  }

  function showAdminDashboard(){
    var dash = document.getElementById('admin-dashboard');
    if(!dash) return;
    dash.style.display = 'block';

    /* Update stats */
    var users = dbGet('rv_users');
    var codes = dbGet('rv_codes');
    var usedCodes = codes.filter(function(c){ return c.used; });
    var statUsers = document.getElementById('adm-stat-users');
    var statCodes = document.getElementById('adm-stat-codes');
    var statUsed  = document.getElementById('adm-stat-used');
    if(statUsers) statUsers.textContent = users.length;
    if(statCodes) statCodes.textContent = codes.length;
    if(statUsed)  statUsed.textContent  = usedCodes.length;

    renderAdminUsers();
    renderAdminCodes();
  }

  function renderAdminUsers(){
    var list  = document.getElementById('admin-users-list');
    if(!list) return;
    var users = dbGet('rv_users');
    list.innerHTML = '';
    users.forEach(function(u){
      var row = document.createElement('div');
      row.className = 'adm-row';
      row.innerHTML =
        '<div class="adm-row-left">' +
          '<div class="adm-avatar">' + u.firstName[0] + u.lastName[0] + '</div>' +
          '<div>' +
            '<span class="adm-name">' + u.firstName + ' ' + u.lastName + '</span>' +
            '<span class="adm-email">' + u.email + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="adm-row-right">' +
          '<span class="adm-role-badge adm-role-' + u.role + '">' + u.role + '</span>' +
        '</div>';
      list.appendChild(row);
    });
  }

  function renderAdminCodes(){
    var list  = document.getElementById('admin-codes-list');
    if(!list) return;
    var codes = dbGet('rv_codes');
    list.innerHTML = '';
    if(!codes.length){
      list.innerHTML = '<p class="adm-empty">No invite codes generated yet.</p>';
      return;
    }
    codes.slice().reverse().forEach(function(c){
      var row = document.createElement('div');
      row.className = 'adm-code-row';
      row.innerHTML =
        '<code class="adm-code' + (c.used ? ' adm-code-used' : '') + '">' + c.code + '</code>' +
        '<span class="adm-code-status">' + (c.used ? '<i class="ti ti-check"></i> Used by ' + c.usedBy : '<i class="ti ti-clock"></i> Unused') + '</span>' +
        '<span class="adm-code-date">' + new Date(c.createdAt).toLocaleDateString() + '</span>' +
        (!c.used ? '<button class="adm-copy-btn" data-code="' + c.code + '" title="Copy code"><i class="ti ti-copy"></i></button>' : '<span></span>');
      list.appendChild(row);
    });

    /* copy buttons */
    list.querySelectorAll('.adm-copy-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var code = btn.getAttribute('data-code');
        if(navigator.clipboard){
          navigator.clipboard.writeText(code).then(function(){
            btn.innerHTML = '<i class="ti ti-check"></i>';
            setTimeout(function(){ btn.innerHTML = '<i class="ti ti-copy"></i>'; }, 2000);
          });
        } else {
          showToast('Code: ' + code);
        }
      });
    });
  }

  /* Generate invite code button */
  var genCodeBtn = document.getElementById('admin-gen-code');
  if(genCodeBtn){
    genCodeBtn.addEventListener('click', function(){
      var session = getSession();
      if(!session || session.role !== 'admin'){ showToast('Admin access required.'); return; }
      var code = generateCode();
      var codes = dbGet('rv_codes');
      codes.push({ code:code, used:false, usedBy:null, usedAt:null, createdBy:session.email, createdAt:new Date().toISOString() });
      dbSet('rv_codes', codes);
      renderAdminCodes();
      showToast('<i class="ti ti-key" style="margin-right:6px"></i>Code generated: ' + code);
    });
  }

  /* Sign out button */
  var signOutBtn = document.getElementById('admin-sign-out');
  if(signOutBtn){
    signOutBtn.addEventListener('click', function(){
      clearSession();
      updateHeaderAuth();
      closeModal();
      showToast('You have been signed out.');
    });
  }

  /* Check if already signed in when modal opens */
  var origOpenModal = openModal;
  /* Patch openModal to show dashboard if admin is already signed in */
  document.querySelectorAll('#open-login,#open-login-hero,#open-login-cta,#open-login-qa').forEach(function(btn){
    btn.addEventListener('click', function(){
      var session = getSession();
      if(session && session.role === 'admin'){
        loginModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        loginForm.style.display = 'none';
        modalSuccess.classList.add('show');
        document.getElementById('success-heading').textContent = 'Admin Dashboard';
        document.getElementById('success-body').textContent = '';
        showAdminDashboard();
      }
    });
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
     ACTIVE CASES TRACKER
     ===================================================== */

  /* Case timestamps — fixed reference points */
  var case1ActiveSince = new Date('2026-06-15T08:30:00'); // referral actioned
  var case2ActiveSince = new Date('2026-06-20T08:05:00'); // assigned to officer
  var case1Logged      = new Date('2026-06-14T09:14:00');
  var case2Logged      = new Date('2026-06-19T14:32:00');

  function timeAgo(date) {
    var now = new Date();
    var diff = Math.floor((now - date) / 1000); // seconds
    if (diff < 60)   return diff + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400){
      var h = Math.floor(diff/3600);
      var m = Math.floor((diff%3600)/60);
      return h + 'h ' + (m > 0 ? m + 'm ' : '') + 'ago';
    }
    var d = Math.floor(diff/86400);
    var h2 = Math.floor((diff%86400)/3600);
    return d + 'd ' + (h2 > 0 ? h2 + 'h ' : '') + 'ago';
  }

  function elapsedSince(date) {
    var now = new Date();
    var diff = Math.floor((now - date) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return 'Active ' + Math.floor(diff/60) + 'm';
    if (diff < 86400){
      var h = Math.floor(diff/3600);
      var m = Math.floor((diff%3600)/60);
      return 'Active ' + h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
    }
    var d = Math.floor(diff/86400);
    var h2 = Math.floor((diff%86400)/3600);
    return 'Active ' + d + 'd' + (h2 > 0 ? ' ' + h2 + 'h' : '');
  }

  /* Initial render */
  var c1LoggedEl   = document.getElementById('case1-logged');
  var c2LoggedEl   = document.getElementById('case2-logged');
  var c1ElapsedEl  = document.getElementById('case1-elapsed');
  var c2ElapsedEl  = document.getElementById('case2-elapsed');

  function updateCaseTimes() {
    if (c1LoggedEl)  c1LoggedEl.textContent  = timeAgo(case1Logged);
    if (c2LoggedEl)  c2LoggedEl.textContent  = timeAgo(case2Logged);
    if (c1ElapsedEl) c1ElapsedEl.textContent = elapsedSince(case1ActiveSince);
    if (c2ElapsedEl) c2ElapsedEl.textContent = elapsedSince(case2ActiveSince);
  }
  updateCaseTimes();
  setInterval(updateCaseTimes, 30000); // refresh every 30s

  /* Search + filter */
  var caseSearchInput  = document.getElementById('case-search');
  var caseSearchClear  = document.getElementById('case-search-clear');
  var casePills        = document.querySelectorAll('.cases-pill');
  var caseCards        = document.querySelectorAll('#cases-grid .case-card');
  var casesNoResults   = document.getElementById('cases-no-results');
  var casesResetBtn    = document.getElementById('cases-reset-btn');
  var activeCaseFilter = 'all';

  function applyCaseFilter() {
    var query = caseSearchInput ? caseSearchInput.value.trim().toLowerCase() : '';
    var visible = 0;

    caseCards.forEach(function(card) {
      var keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
      var id       = (card.getAttribute('data-id') || '').toLowerCase();
      var type     = (card.getAttribute('data-type') || '').toLowerCase();
      var location = (card.getAttribute('data-location') || '').toLowerCase();
      var officer  = (card.getAttribute('data-officer') || '').toLowerCase();
      var stageNum = parseInt(card.getAttribute('data-stage'), 10);

      /* Stage name map for search */
      var stageNames = ['incident logged','needs assessment','assigned to officer',
                        'referral actioned','follow-up','case closed'];
      var stageName  = stageNames[stageNum] || '';

      var matchQ = query === '' ||
        id.includes(query) || keywords.includes(query) ||
        type.includes(query) || location.includes(query) ||
        officer.includes(query) || stageName.includes(query);

      var matchF = activeCaseFilter === 'all' || type === activeCaseFilter;

      if (matchQ && matchF) {
        card.classList.remove('hidden');
        visible++;
      } else {
        card.classList.add('hidden');
      }
    });

    if (casesNoResults) casesNoResults.classList.toggle('show', visible === 0);
    if (caseSearchClear) caseSearchClear.classList.toggle('show', query.length > 0);
  }

  if (caseSearchInput) {
    caseSearchInput.addEventListener('input', applyCaseFilter);
    caseSearchInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); applyCaseFilter(); }
    });
  }

  if (caseSearchClear) {
    caseSearchClear.addEventListener('click', function(){
      caseSearchInput.value = '';
      applyCaseFilter();
      caseSearchInput.focus();
    });
  }

  casePills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      casePills.forEach(function(p){ p.classList.remove('active'); });
      pill.classList.add('active');
      activeCaseFilter = pill.getAttribute('data-filter');
      applyCaseFilter();
    });
  });

  if (casesResetBtn) {
    casesResetBtn.addEventListener('click', function(){
      if (caseSearchInput) caseSearchInput.value = '';
      casePills.forEach(function(p){ p.classList.remove('active'); });
      var allPill = document.querySelector('.cases-pill[data-filter="all"]');
      if (allPill) allPill.classList.add('active');
      activeCaseFilter = 'all';
      applyCaseFilter();
    });
  }

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
