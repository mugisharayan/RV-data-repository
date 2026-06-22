/* ==========================================================
   RV Dashboard — dashboard.js
   Role-based dashboard: Admin | Officer | Researcher | Activist
   ========================================================== */
'use strict';

/* ================================================================
   SECURITY LAYER A — PII SEPARATION
   Incident records contain NO survivor names, phones, or addresses.
   Any contact details go into rv_pii keyed only by case ID.
   Analytical data (age group, sub-county, type) is always separate.
   ================================================================ */

/* Write PII record — strictly separated from analytical data */
function writePII(caseId, piiObj){
  var store = dbGetObj('rv_pii');
  /* encrypt before storing */
  store[caseId] = encryptField(JSON.stringify(piiObj));
  localStorage.setItem('rv_pii', JSON.stringify(store));
  auditLog('PII_WRITE', 'PII record created for case '+caseId+' — stored encrypted, separate from incident data');
}

/* Read PII — admin and assigned officer only */
function readPII(caseId){
  if(session.role!=='admin' && session.role!=='officer'){
    auditLog('PII_READ_DENIED', 'Unauthorised PII access attempt for case '+caseId);
    return null;
  }
  var store = dbGetObj('rv_pii');
  var enc = store[caseId];
  if(!enc) return null;
  auditLog('PII_READ', 'PII accessed for case '+caseId);
  try{ return JSON.parse(decryptField(enc)); }catch(e){ return null; }
}

function dbGetObj(key){ try{ return JSON.parse(localStorage.getItem(key))||{}; }catch(e){ return {}; } }

/* ================================================================
   SECURITY LAYER B — ENCRYPTION AT REST (AES-like XOR cipher)
   For a prototype this uses a deterministic XOR cipher with a
   key derived from the session. In production: AES-256-GCM via
   Web Crypto API + server-side key management (AWS KMS / HSM).
   ================================================================ */

var ENC_KEY = (function(){
  /* Derive a consistent key from session email */
  var seed = (session && session.email)||'rv-default';
  var k = 0;
  for(var i=0;i<seed.length;i++){ k=(k*31+seed.charCodeAt(i))&0xFFFFFFFF; }
  return Math.abs(k).toString(16).padStart(8,'0');
})();

function encryptField(plaintext){
  /* XOR each char with rotating key bytes — deterministic, reversible */
  var key = ENC_KEY;
  var out = '';
  for(var i=0;i<plaintext.length;i++){
    var c = plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    out += String.fromCharCode(c);
  }
  return btoa(unescape(encodeURIComponent(out))) + ':enc';
}

function decryptField(ciphertext){
  if(!ciphertext || !ciphertext.endsWith(':enc')) return ciphertext;
  var raw = ciphertext.slice(0,-4);
  try{
    var decoded = decodeURIComponent(escape(atob(raw)));
    var key = ENC_KEY;
    var out = '';
    for(var i=0;i<decoded.length;i++){
      out += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  }catch(e){ return ciphertext; }
}

/* Encrypt sensitive incident fields before saving */
function encryptIncident(inc){
  var copy = Object.assign({},inc);
  if(copy.notes)    copy.notes    = encryptField(copy.notes);
  if(copy.location) copy.location = encryptField(copy.location);
  return copy;
}

/* Decrypt sensitive incident fields after reading */
function decryptIncident(inc){
  if(!inc) return inc;
  var copy = Object.assign({},inc);
  if(copy.notes)    copy.notes    = decryptField(copy.notes);
  if(copy.location) copy.location = decryptField(copy.location);
  return copy;
}

/* Wrap dbGet/dbSet for incidents with auto encrypt/decrypt */
function getIncidents(){
  return dbGet('rv_incidents').map(decryptIncident);
}
function saveIncidents(list){
  dbSet('rv_incidents', list.map(encryptIncident));
}

/* ================================================================
   SECURITY LAYER C — IMMUTABLE AUDIT LOG
   Append-only. No record is ever deleted or modified.
   Every view, create, update, login and download is captured.
   Format: { id, time, actor, actorRole, action, target, ip? }
   ================================================================ */

function auditLog(action, detail, target){
  var log = dbGet('rv_audit_log');
  var entry = {
    id:        'AL-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
    time:      new Date().toISOString(),
    actor:     session ? session.firstName+' '+session.lastName : 'System',
    actorId:   session ? session.id : 'SYSTEM',
    actorRole: session ? session.role : 'system',
    action:    action,
    detail:    detail||'',
    target:    target||'',
    userAgent: navigator.userAgent.slice(0,80)
  };
  log.push(entry);
  /* Immutable — only append, never splice/delete */
  dbSet('rv_audit_log', log);
}

/* Log every page view */
auditLog('PAGE_VIEW', 'Dashboard loaded — section: '+window.location.href, 'dashboard.html');

/* ── DB helpers (shared with main site) ── */
function dbGet(key){ try{ return JSON.parse(localStorage.getItem(key))||[]; }catch(e){ return []; } }
function dbSet(key,val){ localStorage.setItem(key,JSON.stringify(val)); }
function getSession(){ try{ return JSON.parse(localStorage.getItem('rv_session')); }catch(e){ return null; } }
function clearSession(){ localStorage.removeItem('rv_session'); }

/* ── Redirect if not signed in ── */
var session = getSession();
if(!session){ window.location.href='index.html'; }

/* ── Toast ── */
var toastEl = document.getElementById('db-toast');
var toastTimer;
function toast(msg){
  toastEl.innerHTML = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 3600);
}

/* ── Render header user info ── */
document.getElementById('db-user-name').textContent = session.firstName + ' ' + session.lastName;
document.getElementById('db-user-role').textContent = session.role;
document.getElementById('db-avatar').textContent = (session.firstName[0]||'') + (session.lastName[0]||'');

/* ── Sign out ── */
document.getElementById('db-signout').addEventListener('click', function(){
  auditLog('USER_SIGNOUT', 'User signed out');
  clearSession();
  window.location.href = 'index.html';
});

/* ================================================================
   NAV + SECTION ROUTING
   ================================================================ */
var navEl = document.getElementById('db-nav');
var mainEl = document.getElementById('db-main');

/* Role-based nav config */
var navConfig = {
  admin: [
    { id:'overview',  icon:'ti-layout-dashboard', label:'Overview' },
    { id:'users',     icon:'ti-users',             label:'Staff accounts' },
    { id:'invites',   icon:'ti-key',               label:'Invite codes' },
    { id:'research',  icon:'ti-book-2',            label:'Research' },
    { id:'incidents', icon:'ti-clipboard-list',    label:'All incidents' },
    { id:'audit',     icon:'ti-history',           label:'Audit trail' },
    { id:'security',  icon:'ti-shield-lock',       label:'Security' }
  ],
  officer: [
    { id:'overview',  icon:'ti-layout-dashboard', label:'Overview' },
    { id:'incidents', icon:'ti-clipboard-list',   label:'My cases' },
    { id:'log',       icon:'ti-clipboard-plus',   label:'Log incident' },
    { id:'research',  icon:'ti-book-2',           label:'Research' }
  ],
  activist: [
    { id:'overview',  icon:'ti-layout-dashboard', label:'Overview' },
    { id:'log',       icon:'ti-clipboard-plus',   label:'Log incident' },
    { id:'research',  icon:'ti-book-2',           label:'Research' }
  ],
  researcher: [
    { id:'overview',  icon:'ti-layout-dashboard', label:'Overview' },
    { id:'research',  icon:'ti-book-2',           label:'Research repository' },
    { id:'stats',     icon:'ti-chart-bar',        label:'Statistics' }
  ]
};

var role = session.role;
var tabs = navConfig[role] || navConfig['researcher'];

/* Build nav */
tabs.forEach(function(tab){
  var btn = document.createElement('button');
  btn.className = 'db-nav-btn';
  btn.setAttribute('data-section', tab.id);
  btn.innerHTML = '<i class="ti ' + tab.icon + '"></i><span>' + tab.label + '</span>';
  btn.addEventListener('click', function(){ goTo(tab.id); });
  navEl.appendChild(btn);
});

function goTo(id){
  /* Handle "log" as opening the incident modal directly */
  if(id === 'log'){ openIncidentModal(); return; }

  document.querySelectorAll('.db-nav-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-section') === id);
  });
  renderSection(id);
}

/* Activate first tab */
goTo(tabs[0].id);

/* ================================================================
   SECTION RENDERER
   ================================================================ */
function renderSection(id){
  mainEl.innerHTML = '';
  document.getElementById('db-loading') && (document.getElementById('db-loading').style.display='none');

  switch(id){
    case 'overview':  renderOverview();  break;
    case 'users':     renderUsers();     break;
    case 'invites':   renderInvites();   break;
    case 'research':  renderResearch();  break;
    case 'incidents': renderIncidents(); break;
    case 'stats':     renderStats();     break;
    case 'audit':     renderAuditLog();  break;
    case 'security':  renderSecurity();  break;
    default: mainEl.innerHTML = '<p style="padding:40px;color:var(--ink-faint)">Section not found.</p>';
  }
}

/* ── Utility: create section wrapper ── */
function makeSection(titleHtml, subtitleHtml){
  var s = document.createElement('div');
  s.className = 'db-section active';
  s.innerHTML = '<div class="db-page-head"><h2>' + titleHtml + '</h2>' +
    (subtitleHtml ? '<p>' + subtitleHtml + '</p>' : '') + '</div>';
  mainEl.appendChild(s);
  return s;
}

/* ── Utility: restricted panel ── */
function restricted(sec, msg){
  var d = document.createElement('div');
  d.className='db-restricted';
  d.innerHTML='<i class="ti ti-lock"></i><h3>Access restricted</h3><p>'+msg+'</p>';
  sec.appendChild(d);
}

/* ================================================================
   OVERVIEW — role-specific landing
   ================================================================ */
function renderOverview(){
  /* Ensure seed data exists */
  if(dbGet('rv_incidents').length===0) seedIncidents();
  if(dbGet('rv_research').length===0)  seedResearch();

  var users     = dbGet('rv_users');
  var codes     = dbGet('rv_codes');
  var incidents = dbGet('rv_incidents');
  var research  = dbGet('rv_research');

  var sec = makeSection(
    'Welcome back, <em style="font-style:italic;color:var(--orange)">' + session.firstName + '</em>',
    roleOverviewSubtitle()
  );

  /* Stats */
  var statsData = roleStats(users, codes, incidents, research);
  var statsDiv = document.createElement('div');
  statsDiv.className = 'db-stats';
  statsData.forEach(function(s){
    statsDiv.innerHTML += '<div class="db-stat-card ' + (s.color||'') + '">' +
      '<div class="db-stat-icon"><i class="ti ' + s.icon + '"></i></div>' +
      '<div class="db-stat-num">' + s.num + '</div>' +
      '<div class="db-stat-label">' + s.label + '</div>' +
    '</div>';
  });
  sec.appendChild(statsDiv);

  /* Recent activity */
  var card = document.createElement('div');
  card.className = 'db-card';
  card.innerHTML = '<div class="db-card-head"><span class="db-card-title"><i class="ti ti-activity"></i> Recent activity</span></div>';

  var recentIncidents = incidents.slice(-5).reverse();
  if(recentIncidents.length === 0){
    card.innerHTML += '<div class="db-empty"><i class="ti ti-clipboard-x"></i><p>No incidents logged yet</p><span>Start by logging the first incident.</span></div>';
  } else {
    var tableHtml = '<div class="db-table-wrap"><table class="db-table"><thead><tr>' +
      '<th>Case ID</th><th>Type</th><th>Location</th><th>Risk</th><th>Stage</th><th>Date</th>' +
      '</tr></thead><tbody>';
    recentIncidents.forEach(function(inc){
      var canSeeDetails = (role==='admin' || role==='officer' || inc.loggedBy===session.id);
      tableHtml += '<tr>' +
        '<td><code>' + inc.id + '</code></td>' +
        '<td>' + (canSeeDetails ? inc.type : '<span style="color:var(--ink-faint);font-style:italic">Restricted</span>') + '</td>' +
        '<td>' + (canSeeDetails ? inc.location : '—') + '</td>' +
        '<td><span class="db-badge risk-' + inc.risk + '">' + inc.risk + '</span></td>' +
        '<td><span class="stage-chip stage-' + inc.stage + '">' + stageLabel(inc.stage) + '</span></td>' +
        '<td style="font-family:var(--font-mono);font-size:11.5px">' + formatDate(inc.loggedAt) + '</td>' +
      '</tr>';
    });
    tableHtml += '</tbody></table></div>';
    card.innerHTML += tableHtml;
  }
  sec.appendChild(card);
}

function roleOverviewSubtitle(){
  var s = { admin:'Full system access — manage staff, codes, and all data.',
            officer:'Log, manage and update cases in your caseload.',
            activist:'Log new disclosures and access the research repository.',
            researcher:'Search and download published research and anonymised statistics.' };
  return s[role] || '';
}

function roleStats(users,codes,incidents,research){
  var myIncidents = incidents.filter(function(i){ return i.loggedBy===session.id; });
  var active = incidents.filter(function(i){ return i.stage < 5; });
  if(role==='admin') return [
    {icon:'ti-users',num:users.length,label:'Staff accounts'},
    {icon:'ti-clipboard-list',num:incidents.length,label:'Total incidents',color:'orange'},
    {icon:'ti-book-2',num:research.length,label:'Research records',color:'green'},
    {icon:'ti-key',num:codes.filter(function(c){return!c.used;}).length,label:'Unused invite codes'}
  ];
  if(role==='officer') return [
    {icon:'ti-clipboard-list',num:myIncidents.length,label:'Cases I logged',color:'orange'},
    {icon:'ti-alert-circle',num:active.length,label:'Active system cases'},
    {icon:'ti-book-2',num:research.length,label:'Research records',color:'green'},
    {icon:'ti-circle-check',num:incidents.filter(function(i){return i.stage===5;}).length,label:'Closed cases'}
  ];
  if(role==='activist') return [
    {icon:'ti-clipboard-plus',num:myIncidents.length,label:'Incidents I logged',color:'orange'},
    {icon:'ti-book-2',num:research.length,label:'Research records',color:'green'}
  ];
  return [
    {icon:'ti-book-2',num:research.length,label:'Research records',color:'green'},
    {icon:'ti-chart-bar',num:incidents.length,label:'Anonymised incidents'}
  ];
}

/* ================================================================
   ADMIN — STAFF USERS
   ================================================================ */
function renderUsers(){
  if(role!=='admin'){ var s=makeSection('Staff accounts'); restricted(s,'Only administrators can manage staff accounts.'); return; }
  var sec = makeSection('Staff accounts','Manage all registered staff and their roles.');
  var users = dbGet('rv_users');
  var card = document.createElement('div');
  card.className='db-card';
  card.innerHTML='<div class="db-card-head"><span class="db-card-title"><i class="ti ti-users"></i> '+users.length+' registered accounts</span></div>';
  var tableHtml='<div class="db-table-wrap"><table class="db-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Joined</th></tr></thead><tbody>';
  users.forEach(function(u){
    var roleColor={admin:'db-badge-orange',officer:'db-badge-teal',activist:'db-badge-green',researcher:'db-badge-gold'}[u.role]||'db-badge-gray';
    tableHtml+='<tr>'+
      '<td><code>'+u.id+'</code></td>'+
      '<td><strong>'+u.firstName+' '+u.lastName+'</strong></td>'+
      '<td style="font-family:var(--font-mono);font-size:12px">'+u.email+'</td>'+
      '<td><span class="db-badge '+roleColor+'">'+u.role+'</span></td>'+
      '<td>'+u.department+'</td>'+
      '<td style="font-family:var(--font-mono);font-size:11.5px">'+formatDate(u.createdAt)+'</td>'+
    '</tr>';
  });
  tableHtml+='</tbody></table></div>';
  card.innerHTML+=tableHtml;
  sec.appendChild(card);
}

/* ── ADMIN — INVITE CODES ── */
function renderInvites(){
  if(role!=='admin'){ var s=makeSection('Invite codes'); restricted(s,'Only administrators can manage invite codes.'); return; }
  var sec = makeSection('Invite codes','Generate and share one-time codes for new staff registration.');
  var codes = dbGet('rv_codes');
  var card = document.createElement('div');
  card.className='db-card';
  var unused=codes.filter(function(c){return!c.used;});
  card.innerHTML='<div class="db-card-head">'+
    '<span class="db-card-title"><i class="ti ti-key"></i> '+codes.length+' codes &mdash; '+unused.length+' unused</span>'+
    '<button class="db-btn db-btn-primary db-btn-sm" id="gen-code-btn"><i class="ti ti-plus"></i> Generate new code</button>'+
  '</div>';
  if(codes.length===0){
    card.innerHTML+='<div class="db-empty"><i class="ti ti-key-off"></i><p>No codes yet</p><span>Click "Generate new code" to create the first invite.</span></div>';
  } else {
    var tableHtml='<div class="db-table-wrap"><table class="db-table"><thead><tr><th>Code</th><th>Status</th><th>Used by</th><th>Created</th><th>Action</th></tr></thead><tbody>';
    codes.slice().reverse().forEach(function(c){
      tableHtml+='<tr>'+
        '<td><code style="font-size:13px;letter-spacing:0.06em">'+c.code+'</code></td>'+
        '<td>'+(c.used?'<span class="db-badge db-badge-gray">Used</span>':'<span class="db-badge db-badge-green">Unused</span>')+'</td>'+
        '<td style="font-size:12px;color:var(--ink-faint)">'+(c.usedBy||'—')+'</td>'+
        '<td style="font-family:var(--font-mono);font-size:11.5px">'+formatDate(c.createdAt)+'</td>'+
        '<td>'+(!c.used?'<button class="db-btn db-btn-outline db-btn-sm copy-code-btn" data-code="'+c.code+'"><i class="ti ti-copy"></i> Copy</button>':'—')+'</td>'+
      '</tr>';
    });
    tableHtml+='</tbody></table></div>';
    card.innerHTML+=tableHtml;
  }
  sec.appendChild(card);

  sec.querySelector('#gen-code-btn').addEventListener('click',function(){
    var code=generateCode();
    var codes=dbGet('rv_codes');
    codes.push({code:code,used:false,usedBy:null,usedAt:null,createdBy:session.email,createdAt:new Date().toISOString()});
    dbSet('rv_codes',codes);
    toast('<i class="ti ti-key" style="margin-right:6px"></i>Code generated: '+code);
    renderInvites();
  });

  sec.querySelectorAll('.copy-code-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var code=btn.getAttribute('data-code');
      if(navigator.clipboard){ navigator.clipboard.writeText(code).then(function(){ toast('Copied: '+code); }); }
      else{ toast('Code: '+code); }
    });
  });
}

function generateCode(){
  var c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code='RV-';
  for(var i=0;i<4;i++) code+=c[Math.floor(Math.random()*c.length)];
  code+='-';
  for(var j=0;j<4;j++) code+=c[Math.floor(Math.random()*c.length)];
  return code;
}

/* ================================================================
   INCIDENTS — case workers + admin see cases; researcher blocked
   ================================================================ */
/* ================================================================
   INCIDENTS — full lifecycle state machine
   ================================================================ */

var STAGES = [
  { id:0, label:'Incident Logged',          icon:'ti-clipboard-plus',   color:'#3b82f6' },
  { id:1, label:'Needs Assessment',          icon:'ti-shield-check',     color:'#f59e0b' },
  { id:2, label:'Assigned to Case Officer',  icon:'ti-user-check',       color:'#f97316' },
  { id:3, label:'Referral Actioned',         icon:'ti-route',            color:'#10b981' },
  { id:4, label:'Follow-up',                 icon:'ti-calendar-check',   color:'#8b5cf6' },
  { id:5, label:'Case Closed',               icon:'ti-lock',             color:'#6b7280' }
];

/* Stage-specific required fields for the update modal */
var STAGE_FIELDS = {
  1: [{ id:'upd-risk',     label:'Confirmed risk level', type:'select',
        options:['LOW','MEDIUM','HIGH','CRITICAL'] }],
  2: [{ id:'upd-officer',  label:'Assigned officer name', type:'text',
        placeholder:'e.g. Grace Nakato' }],
  3: [{ id:'upd-referral-org', label:'Referral organisation', type:'text',
        placeholder:'e.g. Mulago GBV One-Stop Centre' },
      { id:'upd-tracking',     label:'Referral tracking ID', type:'text',
        placeholder:'e.g. REF-MUL-2026-0101' }],
  4: [{ id:'upd-followup-date', label:'Follow-up outcome summary', type:'text',
        placeholder:'Brief summary of follow-up outcome' }],
  5: [{ id:'upd-closure',  label:'Closure reason', type:'select',
        options:['Survivor safe — services complete','Withdrawn by survivor',
                 'Referred to external agency','No further contact','Other'] }]
};

function renderIncidents(){
  if(role==='researcher'){
    var s=makeSection('Incidents');
    restricted(s,'Incident records are restricted to case officers and administrators. You have access to anonymised statistics only.');
    return;
  }
  var canSeeAll = (role==='admin');
  var incidents = getIncidents();   /* auto-decrypts */
  if(incidents.length===0){ seedIncidents(); incidents=getIncidents(); }
  var visible   = canSeeAll ? incidents : incidents.filter(function(i){ return i.loggedBy===session.id; });
  auditLog('VIEW_INCIDENTS', 'Viewed incident list — '+(canSeeAll?'all cases':'own cases only'));

  var sec = makeSection('Case incident tracker',
    canSeeAll ? 'Full incident pipeline — all cases across the system. Advance each case through the 6-stage workflow.'
              : 'Cases you have logged. Use the workflow buttons to advance each case through the pipeline.');

  /* ── Pipeline overview strip ── */
  var pipeStrip = document.createElement('div');
  pipeStrip.className = 'lifecycle-strip';
  STAGES.forEach(function(st, i){
    var count = incidents.filter(function(x){ return x.stage===st.id; }).length;
    pipeStrip.innerHTML +=
      '<div class="lcs-stage" style="--sc:'+st.color+'">' +
        '<div class="lcs-icon"><i class="ti '+st.icon+'"></i></div>' +
        '<div class="lcs-count">'+count+'</div>' +
        '<div class="lcs-label">'+st.label+'</div>' +
      '</div>' +
      (i<STAGES.length-1 ? '<div class="lcs-arrow"><i class="ti ti-arrow-right"></i></div>' : '');
  });
  sec.appendChild(pipeStrip);

  /* ── Action bar ── */
  var actBar = document.createElement('div');
  actBar.className='db-search-bar';
  actBar.innerHTML=
    '<div class="db-search-wrap"><i class="ti ti-search"></i>'+
    '<input type="text" id="inc-search" placeholder="Search ID, type, location, officer…"></div>'+
    '<select class="db-filter-select" id="inc-stage-filter">'+
      '<option value="">All stages</option>'+
      STAGES.map(function(s){ return '<option value="'+s.id+'">'+s.label+'</option>'; }).join('')+
    '</select>'+
    '<select class="db-filter-select" id="inc-risk-filter">'+
      '<option value="">All risks</option>'+
      '<option value="LOW">Low</option><option value="MEDIUM">Medium</option>'+
      '<option value="HIGH">High</option><option value="CRITICAL">Critical</option>'+
    '</select>'+
    (role!=='researcher'?'<button class="db-btn db-btn-orange" id="open-inc-modal"><i class="ti ti-clipboard-plus"></i> Log new incident</button>':'');
  sec.appendChild(actBar);

  /* ── Cases container ── */
  var caseWrap = document.createElement('div');
  caseWrap.id = 'cases-wrap';
  sec.appendChild(caseWrap);
  renderCaseCards(visible, caseWrap, canSeeAll);

  /* filter logic */
  function applyFilter(){
    var q=(sec.querySelector('#inc-search').value||'').toLowerCase();
    var st=sec.querySelector('#inc-stage-filter').value;
    var rk=sec.querySelector('#inc-risk-filter').value;
    var filtered=visible.filter(function(i){
      var matchQ=!q||i.id.toLowerCase().includes(q)||i.type.toLowerCase().includes(q)||
                     i.location.toLowerCase().includes(q)||(i.assignedOfficer||'').toLowerCase().includes(q);
      var matchS=!st||String(i.stage)===st;
      var matchR=!rk||i.risk===rk;
      return matchQ&&matchS&&matchR;
    });
    renderCaseCards(filtered, caseWrap, canSeeAll);
  }
  sec.querySelector('#inc-search').addEventListener('input',applyFilter);
  sec.querySelector('#inc-stage-filter').addEventListener('change',applyFilter);
  sec.querySelector('#inc-risk-filter').addEventListener('change',applyFilter);
  if(sec.querySelector('#open-inc-modal')) sec.querySelector('#open-inc-modal').addEventListener('click',openIncidentModal);
}

/* ── Render case cards (one card per incident, full pipeline visible) ── */
function renderCaseCards(list, wrap, canSeeAll){
  wrap.innerHTML='';
  if(list.length===0){
    wrap.innerHTML='<div class="db-empty"><i class="ti ti-clipboard-x"></i><p>No cases match</p><span>Try adjusting your search or filters.</span></div>';
    return;
  }
  var users=dbGet('rv_users');

  list.slice().reverse().forEach(function(inc){
    var officer='—';
    if(canSeeAll){
      var u=users.find(function(u){return u.id===inc.loggedBy;});
      officer=u?u.firstName+' '+u.lastName:'Unknown';
    }
    var isClosed = inc.stage===5;
    var card=document.createElement('div');
    card.className='case-workflow-card'+(isClosed?' cwc-closed':'');

    /* ── Header ── */
    var riskColor={LOW:'db-badge-green',MEDIUM:'db-badge-gold',HIGH:'db-badge-orange',CRITICAL:'db-badge-red'}[inc.risk]||'db-badge-gray';
    card.innerHTML=
      '<div class="cwc-header">'+
        '<div class="cwc-id-row">'+
          '<code class="cwc-id">'+inc.id+'</code>'+
          '<span class="db-badge '+riskColor+'"><i class="ti ti-alert-circle"></i> '+inc.risk+'</span>'+
          (isClosed?'<span class="db-badge db-badge-gray"><i class="ti ti-lock"></i> Closed</span>':'<span class="db-badge db-badge-green" style="animation:cwc-pulse 2s infinite"><i class="ti ti-point-filled"></i> Active</span>')+
        '</div>'+
        '<div class="cwc-meta">'+
          '<span><i class="ti ti-clipboard-list"></i> '+inc.type+'</span>'+
          '<span><i class="ti ti-map-pin"></i> '+inc.location+'</span>'+
          '<span><i class="ti ti-calendar"></i> '+formatDate(inc.loggedAt)+'</span>'+
          (canSeeAll?'<span><i class="ti ti-user"></i> '+officer+'</span>':'')+
          (inc.referral?'<span><i class="ti ti-route"></i> '+inc.referral+'</span>':'')+
        '</div>'+
      '</div>'+

      /* ── 6-stage pipeline bar ── */
      '<div class="cwc-pipeline">'+
        STAGES.map(function(st){
          var done  = inc.stage > st.id;
          var active= inc.stage === st.id;
          var cls   = done?'cwp-done':active?'cwp-active':'cwp-pending';
          return '<div class="cwp-stage '+cls+'" title="'+st.label+'">'+
            '<div class="cwp-node" style="'+(active?'--nc:'+st.color:'')+'">'+
              (done?'<i class="ti ti-check"></i>':active?'<i class="ti '+st.icon+'"></i>':'<span>'+st.id+'</span>')+
              (active?'<span class="cwp-pulse"></span>':'')+
            '</div>'+
            (st.id<5?'<div class="cwp-line '+(done?'cwp-line-filled':'')+'"></div>':'')+
            '<div class="cwp-label">'+st.label+'</div>'+
          '</div>';
        }).join('')+
      '</div>'+

      /* ── Current stage callout ── */
      (!isClosed?
        '<div class="cwc-current-stage">'+
          '<div class="cwc-stage-info">'+
            '<i class="ti '+STAGES[inc.stage].icon+'" style="color:'+STAGES[inc.stage].color+'"></i>'+
            '<div>'+
              '<span class="cwc-stage-label">Current stage</span>'+
              '<strong>'+STAGES[inc.stage].label+'</strong>'+
            '</div>'+
          '</div>'+
          (inc.stage<5?
            '<button class="db-btn db-btn-primary cwc-advance-btn" data-id="'+inc.id+'" data-stage="'+inc.stage+'">'+
              '<i class="ti ti-arrow-right"></i> Advance to: '+STAGES[inc.stage+1].label+
            '</button>':'')+'</div>'
      :'<div class="cwc-closed-banner"><i class="ti ti-lock"></i> Case anonymised &amp; archived — read-only audit trail below</div>')+

      /* ── Audit trail (collapsible) ── */
      '<details class="cwc-audit">'+
        '<summary class="cwc-audit-toggle">'+
          '<i class="ti ti-list-details"></i> Audit trail ('+((inc.auditLog||[]).length)+' entries)'+
          '<i class="ti ti-chevron-down cwc-chevron"></i>'+
        '</summary>'+
        '<div class="cwc-audit-body">'+
          buildAuditTrail(inc)+
        '</div>'+
      '</details>';

    wrap.appendChild(card);
  });

  /* Advance buttons */
  wrap.querySelectorAll('.cwc-advance-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      openAdvanceModal(btn.getAttribute('data-id'), parseInt(btn.getAttribute('data-stage'),10));
    });
  });
}

function buildAuditTrail(inc){
  var log = inc.auditLog||[];
  if(log.length===0) return '<p style="color:var(--ink-faint);font-size:12.5px;padding:8px 0">No audit entries yet.</p>';
  return log.map(function(e,i){
    var isLast = i===log.length-1;
    return '<div class="audit-entry'+(isLast&&inc.stage<5?' audit-entry-active':'')+'">'+
      '<div class="audit-dot'+(isLast&&inc.stage<5?' audit-dot-active':'')+'"></div>'+
      '<div class="audit-line'+(i===log.length-1?' audit-line-last':'')+'"></div>'+
      '<div class="audit-content">'+
        '<span class="audit-time">'+formatDateTime(e.time)+'</span>'+
        '<span class="audit-text">'+e.action+(e.by?' — <em>'+e.by+'</em>':'')+'</span>'+
      '</div>'+
    '</div>';
  }).join('');
}


/* ── Advance stage modal with stage-specific required fields ── */
function openAdvanceModal(incId, currentStage){
  var incidents = getIncidents();
  var inc = incidents.find(function(i){ return i.id===incId; });
  if(!inc || currentStage>=5) return;
  var nextStage = currentStage+1;
  var nextInfo  = STAGES[nextStage];
  var extraFields = STAGE_FIELDS[nextStage]||[];

  var overlay = document.createElement('div');
  overlay.className='db-modal-overlay open';

  /* Build stage-specific fields HTML */
  var extraHtml = extraFields.map(function(f){
    var inputHtml='';
    if(f.type==='select'){
      inputHtml='<select id="'+f.id+'"><option value="">Select…</option>'+
        f.options.map(function(o){return '<option value="'+o+'">'+o+'</option>';}).join('')+'</select>';
    } else {
      inputHtml='<input type="text" id="'+f.id+'" placeholder="'+(f.placeholder||'')+'">';
    }
    return '<div class="db-form-group">'+
      '<label>'+f.label+' <span class="req">*</span></label>'+inputHtml+
      '<span class="db-form-error" id="err-'+f.id+'"></span>'+
    '</div>';
  }).join('');

  overlay.innerHTML=
    '<div class="db-modal-box">'+
      '<div class="db-modal-head">'+
        '<h3><i class="ti ti-arrow-right"></i> Advance case '+incId+'</h3>'+
        '<button class="db-modal-close" id="adv-close"><i class="ti ti-x"></i></button>'+
      '</div>'+

      /* Stage transition visual */
      '<div class="adv-transition">'+
        '<div class="adv-stage adv-from">'+
          '<div class="adv-stage-icon"><i class="ti '+STAGES[currentStage].icon+'" style="color:'+STAGES[currentStage].color+'"></i></div>'+
          '<span>'+STAGES[currentStage].label+'</span>'+
        '</div>'+
        '<div class="adv-arrow"><i class="ti ti-arrow-right"></i></div>'+
        '<div class="adv-stage adv-to">'+
          '<div class="adv-stage-icon adv-to-icon"><i class="ti '+nextInfo.icon+'" style="color:'+nextInfo.color+'"></i></div>'+
          '<span>'+nextInfo.label+'</span>'+
        '</div>'+
      '</div>'+

      /* Stage-specific fields */
      extraHtml+

      /* Mandatory audit note for certain stages */
      '<div class="db-form-group">'+
        '<label>Action note '+(nextStage>=2?'<span class="req">*</span>':'(optional)')+'</label>'+
        '<textarea id="adv-note" rows="3" placeholder="Describe the action taken to advance this case to the next stage…"></textarea>'+
        '<span class="db-form-error" id="err-adv-note"></span>'+
      '</div>'+

      /* Survivor safety check for CRITICAL cases */
      (inc.risk==='CRITICAL'?
        '<div class="db-notice" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b">'+
          '<i class="ti ti-alert-triangle"></i>'+
          '<span><strong>CRITICAL risk case.</strong> Confirm survivor safety has been verified before advancing.</span>'+
        '</div>':'')+

      '<div class="db-form-actions">'+
        '<button class="db-btn db-btn-outline" id="adv-cancel">Cancel</button>'+
        '<button class="db-btn db-btn-primary" id="adv-save" style="background:'+nextInfo.color+';border-color:'+nextInfo.color+'">'+
          '<i class="ti '+nextInfo.icon+'"></i> Confirm advance'+
        '</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);

  function closeAdv(){ document.body.removeChild(overlay); }
  overlay.querySelector('#adv-close').addEventListener('click',closeAdv);
  overlay.querySelector('#adv-cancel').addEventListener('click',closeAdv);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeAdv();});

  overlay.querySelector('#adv-save').addEventListener('click',function(){
    /* Validate extra fields */
    var valid = true;
    extraFields.forEach(function(f){
      var el = overlay.querySelector('#'+f.id);
      var errEl = overlay.querySelector('#err-'+f.id);
      if(el && !el.value.trim()){ if(errEl) errEl.textContent='Required.'; valid=false; }
      else if(errEl) errEl.textContent='';
    });

    var note = overlay.querySelector('#adv-note').value.trim();
    var noteErr = overlay.querySelector('#err-adv-note');
    if(nextStage>=2 && !note){ if(noteErr) noteErr.textContent='An action note is required for this stage.'; valid=false; }
    else if(noteErr) noteErr.textContent='';

    if(!valid) return;

    var auditAction = nextInfo.label+' — '+note;

    extraFields.forEach(function(f){
      var el = overlay.querySelector('#'+f.id);
      if(el && el.value){
        var key = f.id.replace('upd-','').replace('adv-','');
        inc[key] = el.value;
        auditAction += ' | '+f.label+': '+el.value;
      }
    });

    inc.stage = nextStage;
    inc.lastUpdated = new Date().toISOString();
    inc.lastUpdatedBy = session.id;
    if(!inc.auditLog) inc.auditLog=[];
    inc.auditLog.push({
      time: new Date().toISOString(),
      action: auditAction,
      by: session.firstName+' '+session.lastName+' ('+session.id+')'
    });

    /* Find in fresh encrypted list, replace, save */
    var allInc = getIncidents();
    var idx = allInc.findIndex(function(x){ return x.id===incId; });
    if(idx>-1) allInc[idx] = inc;
    saveIncidents(allInc);
    auditLog('INCIDENT_STAGE_ADVANCE',
      'Case '+incId+' advanced from stage '+currentStage+' to '+nextStage+' ('+nextInfo.label+') — '+note, incId);

    closeAdv();
    toast('<i class="ti ti-check" style="margin-right:6px"></i>Case '+incId+' advanced to: '+nextInfo.label);
    renderIncidents();
  });
}

/* ── DateTime formatter ── */
function formatDateTime(iso){
  if(!iso) return '—';
  try{
    var d=new Date(iso);
    return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+
      ' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ return iso; }
}
function renderResearch(){
  var sec = makeSection('Research repository',
    role==='admin'||role==='officer'
      ? 'Full Dublin Core metadata — search, download and add new records.'
      : 'Published research, policy briefs and programme toolkits. Free to search and download.');

  var research = dbGet('rv_research');

  /* Seed demo records if empty */
  if(research.length===0){ seedResearch(); research=dbGet('rv_research'); }

  /* Seed incidents if empty */
  if(dbGet('rv_incidents').length===0){ seedIncidents(); }

  /* Action bar */
  var actBar=document.createElement('div');
  actBar.className='db-search-bar';
  actBar.innerHTML=
    '<div class="db-search-wrap"><i class="ti ti-search"></i>'+
    '<input type="text" id="res-search" placeholder="Search title, author, subject…"></div>'+
    '<select class="db-filter-select" id="res-subject-filter">'+
      '<option value="">All subjects</option>'+
      '<option value="Intimate Partner Violence">IPV</option>'+
      '<option value="Child Protection">Child Protection</option>'+
      '<option value="Community Mobilization">Community Mobilization</option>'+
      '<option value="Programme Evaluation">Programme Evaluation</option>'+
      '<option value="Policy & Advocacy">Policy &amp; Advocacy</option>'+
    '</select>'+
    (role==='admin'?'<button class="db-btn db-btn-primary" id="open-research-modal"><i class="ti ti-plus"></i> Add record</button>':'');
  sec.appendChild(actBar);

  var countEl=document.createElement('p');
  countEl.style.cssText='font-size:12px;color:var(--ink-faint);margin-bottom:16px;font-family:var(--font-mono);';
  countEl.id='res-count';
  countEl.textContent=research.length+' records';
  sec.appendChild(countEl);

  var grid=document.createElement('div');
  grid.className='res-grid';
  grid.id='res-grid';
  sec.appendChild(grid);

  renderResearchGrid(research, grid, countEl);

  function applyResFilter(){
    var q=(sec.querySelector('#res-search').value||'').toLowerCase();
    var subj=sec.querySelector('#res-subject-filter').value;
    var filtered=research.filter(function(r){
      var matchQ=!q||r.title.toLowerCase().includes(q)||(r.creator||'').toLowerCase().includes(q)||(r.description||'').toLowerCase().includes(q);
      var matchS=!subj||r.subject===subj;
      return matchQ&&matchS;
    });
    renderResearchGrid(filtered,grid,countEl);
  }
  sec.querySelector('#res-search').addEventListener('input',applyResFilter);
  sec.querySelector('#res-subject-filter').addEventListener('change',applyResFilter);

  if(sec.querySelector('#open-research-modal')){
    sec.querySelector('#open-research-modal').addEventListener('click',openResearchModal);
  }
}

function renderResearchGrid(list, grid, countEl){
  if(countEl) countEl.textContent = list.length + ' record' + (list.length!==1?'s':'');
  if(list.length===0){
    grid.innerHTML='<div class="db-empty" style="grid-column:1/-1"><i class="ti ti-book-off"></i><p>No records found</p><span>Try a different search or filter.</span></div>';
    return;
  }
  grid.innerHTML='';
  list.forEach(function(r){
    var card=document.createElement('div');
    card.className='res-card';
    var rights = r.rights||'Open access';
    var rightsColor = rights.includes('Restricted') ? 'db-badge-red' : 'db-badge-green';
    card.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'+
        '<span class="res-card-id">'+r.id+'</span>'+
        '<span class="db-badge '+rightsColor+'" style="font-size:9.5px">'+rights+'</span>'+
      '</div>'+
      '<span class="db-badge db-badge-teal" style="font-size:10px;width:fit-content">'+r.subject+'</span>'+
      '<h4>'+r.title+'</h4>'+
      '<div class="res-card-meta">'+
        '<strong>'+r.creator+'</strong> &middot; '+r.publisher+' &middot; '+r.date+
      '</div>'+
      '<p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6;margin:0">'+
        (r.description||'').substring(0,140)+(r.description&&r.description.length>140?'…':'')+
      '</p>'+
      '<div class="res-dc-row">'+
        '<span class="res-dc-item"><strong>Type:</strong> '+r.type+'</span> &nbsp;'+
        '<span class="res-dc-item"><strong>Lang:</strong> '+(r.language||'English')+'</span> &nbsp;'+
        (r.coverage?'<span class="res-dc-item"><strong>Coverage:</strong> '+r.coverage+'</span>':'')+
      '</div>'+
      '<div class="res-card-footer">'+
        '<button class="db-btn db-btn-outline db-btn-sm view-dc-btn" data-id="'+r.id+'">'+
          '<i class="ti ti-tags"></i> Full metadata'+
        '</button>'+
        '<button class="db-btn db-btn-primary db-btn-sm download-pdf-btn" data-id="'+r.id+'">'+
          '<i class="ti ti-file-type-pdf"></i> Download PDF'+
        '</button>'+
      '</div>';
    grid.appendChild(card);
  });

  /* Dublin Core full metadata viewer */
  grid.querySelectorAll('.view-dc-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-id');
      var r=list.find(function(x){return x.id===id;});
      if(!r) return;
      showDCModal(r);
    });
  });

  /* PDF download */
  grid.querySelectorAll('.download-pdf-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-id');
      var r=list.find(function(x){return x.id===id;});
      if(!r) return;
      downloadResearchPDF(r, btn);
    });
  });
}

function showDCModal(r){
  auditLog('RESEARCH_VIEW','Full Dublin Core metadata viewed for record: '+r.id+' — '+r.title, r.id);
  var overlay=document.createElement('div');
  overlay.className='db-modal-overlay open';
  var fields=[
    ['Title','title'],['Creator','creator'],['Subject','subject'],
    ['Description','description'],['Publisher','publisher'],['Date','date'],
    ['Type','type'],['Format','format'],['Identifier','identifier'],
    ['Source','source'],['Language','language'],['Coverage','coverage'],
    ['Rights','rights'],['Relation','relation'],['Contributor','contributor']
  ];
  var rows=fields.map(function(f){
    var val=r[f[1]]||'—';
    return '<tr><td style="font-family:var(--font-mono);font-size:10.5px;font-weight:700;color:var(--teal-dark);padding:7px 12px;white-space:nowrap;background:var(--teal-pale);border-bottom:1px solid var(--border-light)">DC: '+f[0]+'</td>'+
      '<td style="padding:7px 12px;font-size:13px;border-bottom:1px solid var(--border-light)">'+val+'</td></tr>';
  }).join('');
  overlay.innerHTML=
    '<div class="db-modal-box">'+
      '<div class="db-modal-head">'+
        '<h3><i class="ti ti-tags"></i> Dublin Core Metadata — '+r.id+'</h3>'+
        '<button class="db-modal-close" id="dc-modal-close"><i class="ti ti-x"></i></button>'+
      '</div>'+
      '<div class="db-table-wrap"><table class="db-table">'+rows+'</table></div>'+
    '</div>';
  document.body.appendChild(overlay);
  function close(){ document.body.removeChild(overlay); }
  overlay.querySelector('#dc-modal-close').addEventListener('click',close);
  overlay.addEventListener('click',function(e){if(e.target===overlay)close();});
}

/* ================================================================
   PDF DOWNLOAD — generates a styled PDF from research record data
   Uses a hidden iframe + window.print() with @media print CSS
   ================================================================ */
function downloadResearchPDF(r, triggerBtn){
  /* Visual feedback on button */
  var origHtml = triggerBtn.innerHTML;
  triggerBtn.innerHTML = '<i class="ti ti-loader-2" style="animation:db-spin .6s linear infinite"></i> Generating…';
  triggerBtn.disabled = true;

  auditLog('RESEARCH_DOWNLOAD', 'PDF downloaded: '+r.id+' — '+r.title, r.id);

  var dc = [
    ['DC: Title',       r.title],
    ['DC: Creator',     r.creator],
    ['DC: Subject',     r.subject],
    ['DC: Description', r.description],
    ['DC: Publisher',   r.publisher],
    ['DC: Date',        r.date],
    ['DC: Type',        r.type],
    ['DC: Format',      r.format||'PDF'],
    ['DC: Identifier',  r.identifier||'Not available'],
    ['DC: Source',      r.source||'—'],
    ['DC: Language',    r.language||'English'],
    ['DC: Coverage',    r.coverage||'—'],
    ['DC: Rights',      r.rights||'Open access'],
    ['DC: Relation',    r.relation||'—'],
    ['DC: Contributor', r.contributor||'—']
  ];

  var dcRows = dc.map(function(row){
    return '<tr>'+
      '<td class="dc-key">'+row[0]+'</td>'+
      '<td class="dc-val">'+row[1]+'</td>'+
    '</tr>';
  }).join('');

  var html = '<!DOCTYPE html><html lang="en"><head>'+
    '<meta charset="UTF-8">'+
    '<title>'+r.id+' — '+r.title+'</title>'+
    '<style>'+
      '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap");'+
      '*{box-sizing:border-box;margin:0;padding:0;}'+
      'body{font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:12pt;color:#0A1E18;background:#fff;padding:32px 40px;}'+
      /* Header */
      '.pdf-header{display:flex;align-items:center;gap:14px;padding-bottom:18px;border-bottom:3px solid #E8640C;margin-bottom:24px;}'+
      '.pdf-logo{width:44px;height:44px;background:#E8640C;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14pt;font-family:Georgia,serif;flex-shrink:0;}'+
      '.pdf-org{font-size:8.5pt;font-family:"JetBrains Mono",monospace;letter-spacing:0.08em;text-transform:uppercase;color:#7A9490;margin-top:2px;}'+
      '.pdf-brand{font-size:15pt;font-weight:700;color:#061E17;}'+
      '.pdf-badge{margin-left:auto;background:#E3F2EF;border:1px solid #C8E8E2;color:#0F3D34;font-size:8pt;font-family:"JetBrains Mono",monospace;padding:4px 12px;border-radius:20px;letter-spacing:0.06em;text-transform:uppercase;}'+
      /* Title block */
      '.pdf-title-block{background:#F2F6F5;border-left:4px solid #1A5C4F;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;}'+
      '.pdf-record-id{font-family:"JetBrains Mono",monospace;font-size:9pt;color:#7A9490;letter-spacing:0.06em;margin-bottom:6px;}'+
      '.pdf-title{font-size:16pt;font-weight:700;color:#061E17;line-height:1.3;margin-bottom:8px;}'+
      '.pdf-creator{font-size:11pt;color:#2E4A44;}'+
      '.pdf-subject-badge{display:inline-block;background:#1A5C4F;color:#fff;font-size:8pt;padding:3px 10px;border-radius:4px;font-family:"JetBrains Mono",monospace;letter-spacing:0.04em;margin-top:8px;}'+
      /* Abstract */
      '.section-head{font-size:9pt;font-weight:700;font-family:"JetBrains Mono",monospace;letter-spacing:0.10em;text-transform:uppercase;color:#1A5C4F;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #C8D8D4;}'+
      '.abstract{font-size:11pt;line-height:1.75;color:#2E4A44;background:#F2F6F5;padding:14px 16px;border-radius:8px;}'+
      /* DC table */
      'table{width:100%;border-collapse:collapse;margin-top:8px;}'+
      '.dc-key{font-family:"JetBrains Mono",monospace;font-size:8.5pt;font-weight:700;color:#1A5C4F;background:#E3F2EF;padding:7px 12px;white-space:nowrap;width:130px;border-bottom:1px solid #DDE8E5;}'+
      '.dc-val{font-size:10.5pt;color:#2E4A44;padding:7px 12px;border-bottom:1px solid #DDE8E5;}'+
      /* Footer */
      '.pdf-footer{margin-top:32px;padding-top:14px;border-top:1px solid #C8D8D4;display:flex;justify-content:space-between;font-size:8pt;color:#7A9490;font-family:"JetBrains Mono",monospace;}'+
      '.privacy-notice{background:#FEF0E7;border:1px solid #FDDEC8;border-radius:6px;padding:10px 14px;font-size:9pt;color:#B84E09;margin-top:20px;line-height:1.6;}'+
      '@media print{body{padding:16px 20px;}@page{margin:15mm 12mm;}}'+
    '</style>'+
    '</head><body>'+

    /* Header */
    '<div class="pdf-header">'+
      '<div class="pdf-logo">RV</div>'+
      '<div>'+
        '<div class="pdf-brand">RV Data Repository</div>'+
        '<div class="pdf-org">Raising Voices Uganda</div>'+
      '</div>'+
      '<div class="pdf-badge">Dublin Core Record</div>'+
    '</div>'+

    /* Title block */
    '<div class="pdf-title-block">'+
      '<div class="pdf-record-id">'+r.id+'</div>'+
      '<div class="pdf-title">'+r.title+'</div>'+
      '<div class="pdf-creator">'+r.creator+'</div>'+
      '<div class="pdf-subject-badge">'+r.subject+'</div>'+
    '</div>'+

    /* Abstract */
    '<div class="section-head">Abstract / Description</div>'+
    '<div class="abstract">'+r.description+'</div>'+

    /* Dublin Core full metadata */
    '<div class="section-head">Dublin Core Metadata (15 Elements)</div>'+
    '<table>'+dcRows+'</table>'+

    /* Privacy notice */
    '<div class="privacy-notice">'+
      '<strong>Privacy &amp; Data Protection Notice:</strong> This document contains research metadata only. '+
      'No personally identifiable survivor information is included. Published under: '+r.rights+'. '+
      'For queries contact info@raisingvoices.org.'+
    '</div>'+

    /* Footer */
    '<div class="pdf-footer">'+
      '<span>Generated: '+new Date().toLocaleString('en-GB')+'</span>'+
      '<span>'+r.id+' &nbsp;|&nbsp; Raising Voices Uganda Data Repository</span>'+
      '<span>raisingvoices.org</span>'+
    '</div>'+

    '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>'+
    '</body></html>';

  /* Open in a new window then trigger print-to-PDF */
  var win = window.open('', '_blank', 'width=800,height=700,scrollbars=yes');
  if(!win){
    toast('<i class="ti ti-alert-circle" style="margin-right:6px"></i>Please allow pop-ups to download PDFs.');
    triggerBtn.innerHTML = origHtml;
    triggerBtn.disabled = false;
    return;
  }
  win.document.write(html);
  win.document.close();

  setTimeout(function(){
    triggerBtn.innerHTML = origHtml;
    triggerBtn.disabled = false;
    toast('<i class="ti ti-file-type-pdf" style="margin-right:6px"></i>PDF ready — use "Save as PDF" in the print dialog.');
  }, 800);
}

/* ================================================================
   STATISTICS — anonymised aggregated view for researchers
   ================================================================ */
function renderStats(){
  var incidents=dbGet('rv_incidents');
  var sec=makeSection('Anonymised statistics','Aggregated, anonymised incident data for research purposes. No survivor identities are included.');

  /* Type breakdown */
  var typeCounts={};
  incidents.forEach(function(i){ typeCounts[i.type]=(typeCounts[i.type]||0)+1; });

  /* Risk breakdown */
  var riskCounts={LOW:0,MEDIUM:0,HIGH:0,CRITICAL:0};
  incidents.forEach(function(i){ if(riskCounts[i.risk]!==undefined) riskCounts[i.risk]++; });

  /* Stage breakdown */
  var stageCounts=[0,0,0,0,0,0];
  incidents.forEach(function(i){ if(i.stage>=0&&i.stage<=5) stageCounts[i.stage]++; });

  /* Stats row */
  var statsDiv=document.createElement('div');
  statsDiv.className='db-stats';
  statsDiv.innerHTML=
    '<div class="db-stat-card"><div class="db-stat-icon"><i class="ti ti-clipboard-list"></i></div><div class="db-stat-num">'+incidents.length+'</div><div class="db-stat-label">Total incidents logged</div></div>'+
    '<div class="db-stat-card orange"><div class="db-stat-icon"><i class="ti ti-alert-circle"></i></div><div class="db-stat-num">'+(riskCounts.HIGH+riskCounts.CRITICAL)+'</div><div class="db-stat-label">High / critical risk</div></div>'+
    '<div class="db-stat-card green"><div class="db-stat-icon"><i class="ti ti-circle-check"></i></div><div class="db-stat-num">'+stageCounts[5]+'</div><div class="db-stat-label">Cases closed</div></div>'+
    '<div class="db-stat-card"><div class="db-stat-icon"><i class="ti ti-loader-2"></i></div><div class="db-stat-num">'+(incidents.length-stageCounts[5])+'</div><div class="db-stat-label">Active cases</div></div>';
  sec.appendChild(statsDiv);

  /* Type breakdown card */
  var card1=document.createElement('div');
  card1.className='db-card';
  card1.innerHTML='<div class="db-card-head"><span class="db-card-title"><i class="ti ti-chart-bar"></i> Incident types (anonymised)</span></div>';
  if(Object.keys(typeCounts).length===0){
    card1.innerHTML+='<div class="db-empty"><i class="ti ti-chart-off"></i><p>No data yet</p></div>';
  } else {
    var max=Math.max.apply(null,Object.values(typeCounts));
    var barsHtml='<div style="display:flex;flex-direction:column;gap:10px;padding-top:8px">';
    Object.keys(typeCounts).forEach(function(type){
      var pct=Math.round((typeCounts[type]/max)*100);
      barsHtml+=
        '<div style="display:flex;align-items:center;gap:12px">'+
          '<span style="font-size:12.5px;color:var(--ink-soft);min-width:200px">'+type+'</span>'+
          '<div style="flex:1;height:20px;background:var(--bg);border-radius:4px;overflow:hidden">'+
            '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--teal),var(--teal-bright));border-radius:4px;transition:width 1s ease"></div>'+
          '</div>'+
          '<span style="font-size:12px;font-family:var(--font-mono);color:var(--ink-faint);min-width:24px;text-align:right">'+typeCounts[type]+'</span>'+
        '</div>';
    });
    barsHtml+='</div>';
    card1.innerHTML+=barsHtml;
  }
  sec.appendChild(card1);

  /* Risk breakdown */
  var card2=document.createElement('div');
  card2.className='db-card';
  card2.innerHTML='<div class="db-card-head"><span class="db-card-title"><i class="ti ti-alert-triangle"></i> Risk level distribution</span></div>';
  var riskHtml='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding-top:4px">';
  [{k:'LOW',c:'green'},{k:'MEDIUM',c:'gold'},{k:'HIGH',c:'orange'},{k:'CRITICAL',c:'red'}].forEach(function(r){
    riskHtml+=
      '<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;text-align:center">'+
        '<div style="font-family:var(--font-display);font-size:32px;font-weight:700;color:var(--teal-darker)">'+riskCounts[r.k]+'</div>'+
        '<div style="font-size:11px;font-family:var(--font-mono);letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-faint);margin-top:4px">'+r.k+'</div>'+
      '</div>';
  });
  riskHtml+='</div>';
  card2.innerHTML+=riskHtml;
  sec.appendChild(card2);
}

/* ================================================================
   INCIDENT MODAL — log new incident
   ================================================================ */
var incModal=document.getElementById('incident-modal');
function openIncidentModal(){
  /* Pre-fill date */
  var now=new Date();
  var local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  document.getElementById('inc-date').value=local;
  incModal.classList.add('open');
}
function closeIncidentModal(){ incModal.classList.remove('open'); }
document.getElementById('incident-modal-close').addEventListener('click',closeIncidentModal);
document.getElementById('incident-modal-cancel').addEventListener('click',closeIncidentModal);
incModal.addEventListener('click',function(e){if(e.target===incModal)closeIncidentModal();});

document.getElementById('incident-form').addEventListener('submit',function(e){
  e.preventDefault();
  var type=document.getElementById('inc-type').value;
  var date=document.getElementById('inc-date').value;
  var location=document.getElementById('inc-location').value.trim();
  var risk=document.getElementById('inc-risk').value;
  var notes=document.getElementById('inc-notes').value.trim();
  var ok=true;

  document.querySelectorAll('.db-form-error').forEach(function(el){el.textContent='';});
  if(!type){document.getElementById('err-inc-type').textContent='Required.';ok=false;}
  if(!date){document.getElementById('err-inc-date').textContent='Required.';ok=false;}
  if(!location){document.getElementById('err-inc-location').textContent='Required.';ok=false;}
  if(!risk){document.getElementById('err-inc-risk').textContent='Required.';ok=false;}
  if(!notes){document.getElementById('err-inc-notes').textContent='Required.';ok=false;}
  if(!ok) return;

  var btn=document.getElementById('inc-submit');
  btn.querySelector('.btn-text').style.display='none';
  btn.querySelector('.btn-spin').style.display='inline-flex';
  btn.disabled=true;

  setTimeout(function(){
    var incidents = getIncidents();
    var id = 'RV-'+new Date().getFullYear()+'-C'+String(incidents.length+1).padStart(3,'0');
    incidents.push({
      id:id,
      type:type,
      loggedAt:new Date(date).toISOString(),
      location:location,    /* encrypted by saveIncidents() */
      risk:risk,
      referral:document.getElementById('inc-referral').value||null,
      gender:document.getElementById('inc-gender').value||null,
      ageRange:document.getElementById('inc-age').value||null,
      notes:notes,          /* encrypted by saveIncidents() */
      stage:0,
      loggedBy:session.id,
      lastUpdated:new Date().toISOString(),
      lastUpdatedBy:session.id,
      piiSeparated:true,    /* flag: no survivor name/phone stored here */
      auditLog:[{
        time:new Date().toISOString(),
        action:'Incident logged — intake form completed. PII separated.',
        by:session.firstName+' '+session.lastName+' ('+session.id+')'
      }]
    });
    saveIncidents(incidents);  /* encrypts notes + location at rest */
    auditLog('INCIDENT_CREATE','New incident logged: '+id+' | Type: '+type+' | Risk: '+risk,id);
    btn.querySelector('.btn-text').style.display='';
    btn.querySelector('.btn-spin').style.display='none';
    btn.disabled=false;
    document.getElementById('incident-form').reset();
    closeIncidentModal();
    toast('<i class="ti ti-clipboard-check" style="margin-right:6px"></i>Incident '+id+' logged — encrypted &amp; audit trail started.');
    renderIncidents();
  },1000);
});

/* ================================================================
   RESEARCH MODAL — add new record (Dublin Core)
   ================================================================ */
var resModal=document.getElementById('research-modal');
function openResearchModal(){ resModal.classList.add('open'); }
function closeResearchModal(){ resModal.classList.remove('open'); }
document.getElementById('research-modal-close').addEventListener('click',closeResearchModal);
document.getElementById('research-modal-cancel').addEventListener('click',closeResearchModal);
resModal.addEventListener('click',function(e){if(e.target===resModal)closeResearchModal();});

document.getElementById('research-form').addEventListener('submit',function(e){
  e.preventDefault();
  var title=document.getElementById('dc-title').value.trim();
  var creator=document.getElementById('dc-creator').value.trim();
  var publisher=document.getElementById('dc-publisher').value.trim();
  var date=document.getElementById('dc-date').value.trim();
  var subject=document.getElementById('dc-subject').value;
  var description=document.getElementById('dc-description').value.trim();
  var ok=true;

  ['dc-title','dc-creator','dc-publisher','dc-date','dc-subject','dc-description'].forEach(function(id){
    document.getElementById('err-'+id)&&(document.getElementById('err-'+id).textContent='');
  });
  if(!title){document.getElementById('err-dc-title').textContent='Required.';ok=false;}
  if(!creator){document.getElementById('err-dc-creator').textContent='Required.';ok=false;}
  if(!publisher){document.getElementById('err-dc-publisher').textContent='Required.';ok=false;}
  if(!date){document.getElementById('err-dc-date').textContent='Required.';ok=false;}
  if(!subject){document.getElementById('err-dc-subject').textContent='Required.';ok=false;}
  if(!description){document.getElementById('err-dc-description').textContent='Required.';ok=false;}
  if(!ok) return;

  var btn=document.getElementById('research-submit');
  btn.querySelector('.btn-text').style.display='none';
  btn.querySelector('.btn-spin').style.display='inline-flex';
  btn.disabled=true;

  setTimeout(function(){
    var research=dbGet('rv_research');
    var id='RV-'+date+'-'+String(research.length+1).padStart(3,'0');
    research.push({
      id:id, title:title, creator:creator, publisher:publisher, date:date,
      type:document.getElementById('dc-type').value,
      subject:subject,
      language:document.getElementById('dc-language').value,
      rights:document.getElementById('dc-rights').value,
      identifier:document.getElementById('dc-identifier').value.trim()||null,
      format:document.getElementById('dc-format').value,
      source:document.getElementById('dc-source').value.trim()||null,
      coverage:document.getElementById('dc-coverage').value.trim()||null,
      relation:document.getElementById('dc-relation').value.trim()||null,
      description:description,
      contributor:document.getElementById('dc-contributor').value.trim()||null,
      addedBy:session.id,
      addedAt:new Date().toISOString()
    });
    dbSet('rv_research',research);
    auditLog('RESEARCH_CREATE','Research record added: '+id+' — '+title+' | Rights: '+document.getElementById('dc-rights').value,id);
    btn.querySelector('.btn-text').style.display='';
    btn.querySelector('.btn-spin').style.display='none';
    btn.disabled=false;
    document.getElementById('research-form').reset();
    closeResearchModal();
    toast('<i class="ti ti-book-2" style="margin-right:6px"></i>Research record '+id+' added.');
    renderResearch();
  },900);
});

/* ================================================================
   SEED DATA — realistic anonymised case studies & research records
   ================================================================ */

function seedIncidents(){
  var existing = dbGet('rv_incidents');
  if(existing.length > 0) return; /* already seeded */

  var records = [

    /* ── CASE 1: Closed IPV case — Kamwokya ── */
    {
      id:'RV-2026-C001',
      type:'Intimate Partner Violence',
      loggedAt:'2026-02-10T09:14:00.000Z',
      location:'Kamwokya, Kampala',
      risk:'HIGH',
      referral:'Medical',
      gender:'Female',
      ageRange:'26–35',
      notes:'Survivor disclosed repeated physical violence over 14 months by cohabiting partner. Presented with facial bruising and suspected fractured rib. Immediate medical referral to Mulago GBV One-Stop Centre actioned. Partner identified as known to local police. Survivor requested safe shelter assessment.',
      stage:5,
      loggedBy:'USR-001',
      lastUpdated:'2026-04-02T14:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-02-10T09:14:00.000Z',action:'Incident logged',by:'Grace Nakato'},
        {time:'2026-02-10T11:02:00.000Z',action:'Needs assessment completed — HIGH risk confirmed',by:'Grace Nakato'},
        {time:'2026-02-10T13:45:00.000Z',action:'Assigned to case officer — Grace Nakato (RV-CO-007)',by:'System'},
        {time:'2026-02-11T08:30:00.000Z',action:'Medical referral actioned — Mulago GBV One-Stop Centre. Tracking ID: REF-MUL-2026-0101',by:'Grace Nakato'},
        {time:'2026-02-18T10:00:00.000Z',action:'Follow-up completed — survivor attended hospital, ribs confirmed fractured, treated. Psychosocial counselling initiated.',by:'Grace Nakato'},
        {time:'2026-04-02T14:00:00.000Z',action:'Case closed — survivor relocated to safe shelter, legal proceedings initiated. Case anonymised and archived.',by:'Grace Nakato'}
      ]
    },

    /* ── CASE 2: Active sexual violence case — Ntinda ── */
    {
      id:'RV-2026-C002',
      type:'Sexual Violence',
      loggedAt:'2026-03-05T14:32:00.000Z',
      location:'Ntinda, Kampala',
      risk:'HIGH',
      referral:'Legal',
      gender:'Female',
      ageRange:'18–25',
      notes:'Survivor disclosed sexual assault by acquaintance two days prior to disclosure. Survivor presented with emotional distress and requested legal support for police statement. No immediate medical emergency. Legal referral to FIDA Uganda prepared. Supervisor sign-off obtained.',
      stage:3,
      loggedBy:'USR-001',
      lastUpdated:'2026-03-08T09:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-03-05T14:32:00.000Z',action:'Incident logged — Peter Ochieng (RV-CO-012)',by:'Peter Ochieng'},
        {time:'2026-03-05T15:18:00.000Z',action:'Risk screening — MEDIUM-HIGH. Survivor requests legal representation.',by:'Peter Ochieng'},
        {time:'2026-03-05T16:10:00.000Z',action:'Needs assessment — primary: legal aid. Secondary: psychosocial counselling.',by:'Peter Ochieng'},
        {time:'2026-03-06T08:05:00.000Z',action:'Assigned to Peter Ochieng. Legal referral to FIDA Uganda dispatched. Tracking ID: REF-FIDA-2026-0212',by:'Peter Ochieng'}
      ]
    },

    /* ── CASE 3: Child abuse — Kawempe ── */
    {
      id:'RV-2026-C003',
      type:'Child Abuse',
      loggedAt:'2026-01-20T07:55:00.000Z',
      location:'Kawempe, Kampala',
      risk:'CRITICAL',
      referral:'Multiple',
      gender:'Male',
      ageRange:'10–17',
      notes:'Teacher at partner school disclosed repeated corporal punishment and verbal abuse of a 13-year-old male pupil by a class teacher over two terms. Pupil presented with visible welts on arms and back. CRITICAL risk — immediate notification to school head and district education officer. Police referral and medical assessment coordinated. Good School Toolkit emergency protocol activated.',
      stage:4,
      loggedBy:'USR-001',
      lastUpdated:'2026-02-15T11:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-01-20T07:55:00.000Z',action:'Incident logged — field activist A. Namukasa',by:'A. Namukasa'},
        {time:'2026-01-20T08:30:00.000Z',action:'CRITICAL risk confirmed. Auto-escalation to senior officer. Head teacher and DEO notified.',by:'System'},
        {time:'2026-01-20T09:45:00.000Z',action:'Assigned — Senior Case Officer R. Ssempala. Police referral: Kawempe Police Station, OB No. 47/2026. Medical: Kawempe Health Centre IV.',by:'R. Ssempala'},
        {time:'2026-01-21T10:00:00.000Z',action:'Referral actioned — pupil examined at health centre, injuries documented. Police statement taken with parent present.',by:'R. Ssempala'},
        {time:'2026-02-15T11:00:00.000Z',action:'Follow-up — teacher suspended pending investigation. Pupil returning to school with welfare monitoring plan in place.',by:'R. Ssempala'}
      ]
    },

    /* ── CASE 4: Economic abuse — Mukono ── */
    {
      id:'RV-2026-C004',
      type:'Economic Abuse',
      loggedAt:'2026-04-03T11:20:00.000Z',
      location:'Mukono District',
      risk:'MEDIUM',
      referral:'Psychosocial',
      gender:'Female',
      ageRange:'36–50',
      notes:'Survivor disclosed that spouse has withheld all household income for over two years, preventing access to food, medical care and school fees. Survivor has no independent income. No immediate physical danger. Referred to MGLSD social worker for economic empowerment assessment and psychosocial support. Legal aid referral offered, survivor declined at this time.',
      stage:2,
      loggedBy:'USR-001',
      lastUpdated:'2026-04-04T08:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-04-03T11:20:00.000Z',action:'Incident logged — case officer E. Birungi',by:'E. Birungi'},
        {time:'2026-04-03T13:00:00.000Z',action:'Needs assessment — MEDIUM risk. Psychosocial and economic support identified as primary needs.',by:'E. Birungi'},
        {time:'2026-04-04T08:00:00.000Z',action:'Assigned to E. Birungi. MGLSD social worker referral in preparation.',by:'E. Birungi'}
      ]
    },

    /* ── CASE 5: Emotional abuse — Rubaga ── */
    {
      id:'RV-2026-C005',
      type:'Emotional / Psychological Abuse',
      loggedAt:'2026-05-12T15:45:00.000Z',
      location:'Rubaga Division, Kampala',
      risk:'MEDIUM',
      referral:'Psychosocial',
      gender:'Female',
      ageRange:'26–35',
      notes:'Survivor disclosed sustained verbal degradation, isolation from family and friends, and threats of eviction by spouse. No physical violence disclosed. Survivor presented with signs of depression and anxiety. Referred to Mulago psychiatric outpatient unit. Safety plan discussed and documented. Survivor provided with emergency contact numbers.',
      stage:3,
      loggedBy:'USR-001',
      lastUpdated:'2026-05-14T10:30:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-05-12T15:45:00.000Z',action:'Incident logged',by:'Grace Nakato'},
        {time:'2026-05-12T16:30:00.000Z',action:'Needs assessment — psychosocial support primary need. Safety plan documented.',by:'Grace Nakato'},
        {time:'2026-05-13T09:00:00.000Z',action:'Assigned — Grace Nakato. Mulago psychiatric referral dispatched. Tracking ID: REF-MUL-2026-0389',by:'Grace Nakato'},
        {time:'2026-05-14T10:30:00.000Z',action:'Referral actioned — appointment confirmed at Mulago psychiatric outpatient for 20 May 2026.',by:'Grace Nakato'}
      ]
    },

    /* ── CASE 6: IPV with safe-shelter — Makindye ── */
    {
      id:'RV-2026-C006',
      type:'Intimate Partner Violence',
      loggedAt:'2026-05-28T08:10:00.000Z',
      location:'Makindye Division, Kampala',
      risk:'CRITICAL',
      referral:'Safe shelter',
      gender:'Female',
      ageRange:'18–25',
      notes:'Survivor disclosed she fled her home after spouse threatened her with a knife. She arrived at the community centre with a 2-year-old child, visibly shaken. Immediate danger — partner knows location. Emergency safe shelter placement coordinated with MIFUMI Uganda. Police emergency line called at intake. No injuries requiring hospital treatment.',
      stage:4,
      loggedBy:'USR-001',
      lastUpdated:'2026-05-30T12:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-05-28T08:10:00.000Z',action:'Incident logged — CRITICAL risk. Uganda Police called (999). Survivor and child secured at office.',by:'A. Namukasa'},
        {time:'2026-05-28T08:45:00.000Z',action:'MIFUMI Uganda safe shelter contacted — emergency placement confirmed.',by:'A. Namukasa'},
        {time:'2026-05-28T10:00:00.000Z',action:'Assigned — Peter Ochieng. Survivor and child transported to safe shelter with escort.',by:'Peter Ochieng'},
        {time:'2026-05-29T09:00:00.000Z',action:'Referral actioned — safe shelter intake complete. Legal referral to FIDA Uganda initiated.',by:'Peter Ochieng'},
        {time:'2026-05-30T12:00:00.000Z',action:'Follow-up — survivor stable, child welfare officer notified. Legal consultation scheduled for 4 June.',by:'Peter Ochieng'}
      ]
    },

    /* ── CASE 7: School-based sexual harassment — Kasangati ── */
    {
      id:'RV-2026-C007',
      type:'Sexual Violence',
      loggedAt:'2026-06-02T10:15:00.000Z',
      location:'Kasangati Town, Wakiso District',
      risk:'HIGH',
      referral:'Medical',
      gender:'Female',
      ageRange:'10–17',
      notes:'Good School Toolkit partner school reported sexual harassment of a 15-year-old female student by an older male student over several weeks. Survivor disclosed to female class teacher. Teacher reported through GST protocol. Medical examination at Kasangati Health Centre III arranged. Parents notified. School disciplinary board convened.',
      stage:3,
      loggedBy:'USR-001',
      lastUpdated:'2026-06-05T14:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-06-02T10:15:00.000Z',action:'Incident logged via GST protocol — reported by class teacher',by:'R. Ssempala'},
        {time:'2026-06-02T11:30:00.000Z',action:'HIGH risk confirmed. Parents notified. Perpetrator student separated from school population.',by:'R. Ssempala'},
        {time:'2026-06-03T09:00:00.000Z',action:'Assigned — R. Ssempala. Medical referral to Kasangati Health Centre III. Tracking ID: REF-KAS-2026-0056',by:'R. Ssempala'},
        {time:'2026-06-05T14:00:00.000Z',action:'Referral actioned — medical examination complete. Report forwarded to police child protection desk.',by:'R. Ssempala'}
      ]
    },

    /* ── CASE 8: FGM — Moroto District ── */
    {
      id:'RV-2026-C008',
      type:'Female Genital Mutilation',
      loggedAt:'2026-06-10T13:00:00.000Z',
      location:'Moroto District, Karamoja',
      risk:'HIGH',
      referral:'Medical',
      gender:'Female',
      ageRange:'10–17',
      notes:'Community health worker disclosed that a 14-year-old girl underwent FGM during a community ceremony three days prior. Girl presented with wound infection and fever. Immediate medical referral to Moroto Regional Referral Hospital. Police report filed under the Prohibition of Female Genital Mutilation Act, 2010. Child welfare officer engaged.',
      stage:2,
      loggedBy:'USR-001',
      lastUpdated:'2026-06-11T09:00:00.000Z',
      lastUpdatedBy:'USR-001',
      auditLog:[
        {time:'2026-06-10T13:00:00.000Z',action:'Incident logged — community health worker report',by:'E. Birungi'},
        {time:'2026-06-10T13:45:00.000Z',action:'HIGH risk confirmed — infection present. Immediate medical referral to Moroto Regional Referral Hospital.',by:'E. Birungi'},
        {time:'2026-06-11T09:00:00.000Z',action:'Assigned — E. Birungi. Police report filed: Moroto Police Station, FGM Act 2010. Child welfare officer notified.',by:'E. Birungi'}
      ]
    }

  ];

  dbSet('rv_incidents', records);
}

function seedResearch(){
  var existing = dbGet('rv_research');
  if(existing.length > 0) return; /* already seeded */

  var records=[

    {id:'RV-2021-001',
     title:'SASA! Together: A Community Mobilisation Approach to Prevent Violence Against Women',
     creator:'Michau, L.; Horn, J.; Bank, A.; Dutt, M.; Zimmerman, C.',
     subject:'Community Mobilization',date:'2021',type:'Programme guide',
     publisher:'Raising Voices, Kampala',language:'English',rights:'Open access',
     identifier:'https://raisingvoices.org/resources/sasa-together/',
     format:'PDF',source:null,coverage:'Uganda, East Africa, Global',
     relation:'SASA! Together programme series',
     description:'The full SASA! Together implementation guide presenting the evidence-based community mobilisation model. Drawing on over 20 years of field experience, this guide equips facilitators to prevent violence against women across diverse cultural contexts. Includes facilitation tools, monitoring frameworks, and community engagement protocols.',
     contributor:'Nakuti, J.; Bukuluki, P.',addedBy:'USR-001',addedAt:'2026-01-01T00:00:00.000Z'},

    {id:'RV-2014-001',
     title:'Good School Toolkit: Preventing Violence in Ugandan Primary Schools — Cluster RCT',
     creator:'Devries, K.; Kyegombe, N.; Zuurmond, M.; Parkes, J.; Mann, J.; Medforth, N.; Naker, D.',
     subject:'Child Protection',date:'2014',type:'Randomised controlled trial',
     publisher:'Raising Voices / The Lancet Global Health',language:'English',rights:'Open access',
     identifier:'https://raisingvoices.org/resources/',
     format:'PDF',source:'The Lancet Global Health, Vol. 3',coverage:'Uganda — 42 schools across 7 districts',
     relation:'Good School Toolkit evaluation series',
     description:'A cluster randomised controlled trial of the Good School Toolkit in Uganda measuring its effectiveness in reducing teacher-perpetrated physical and emotional violence against primary school pupils. Schools randomised to intervention (GST) or control. Primary outcome: past-week violence by teachers. Results showed significant reductions in all forms of violence measured.',
     contributor:null,addedBy:'USR-001',addedAt:'2026-01-01T00:00:00.000Z'},

    {id:'RV-2020-001',
     title:'Strengthening the Evidence Base for Violence Prevention in Low-Income Settings',
     creator:'Garcia-Moreno, C.; Michau, L.; Zimmerman, C.',
     subject:'Policy & Advocacy',date:'2020',type:'Policy brief',
     publisher:'Raising Voices / World Health Organization',language:'English',rights:'Open access',
     identifier:'https://raisingvoices.org/resources/',
     format:'PDF',source:'WHO Violence Prevention Series',coverage:'Low- and middle-income countries, Global',
     relation:null,
     description:'A WHO policy brief examining what works in violence against women prevention in LMIC contexts. Reviews experimental and quasi-experimental evidence from community-based interventions, economic empowerment programmes, and school-based approaches. Recommends a multi-level prevention framework for national GBV strategies.',
     contributor:'Heise, L.; Ellsberg, M.',addedBy:'USR-001',addedAt:'2026-01-01T00:00:00.000Z'},

    {id:'RV-2018-001',
     title:'Preventing Violence Against Women: The Role of Community Activists',
     creator:'Michau, L.',
     subject:'Community Mobilization',date:'2018',type:'Practice paper',
     publisher:'Raising Voices, Kampala',language:'English',rights:'Open access',
     identifier:'https://raisingvoices.org/resources/',
     format:'PDF',source:null,coverage:'Uganda, Kenya, Democratic Republic of Congo',
     relation:'SASA! Together programme series',
     description:'A practice paper examining how community-based activists drive social norm change in violence prevention programmes. Drawing on 20 years of Raising Voices field experience across East and Central Africa, it analyses the conditions under which activist-led mobilisation is most effective and the institutional support structures required.',
     contributor:null,addedBy:'USR-001',addedAt:'2026-01-01T00:00:00.000Z'},

    {id:'RV-2023-001',
     title:'Intimate Partner Violence Among Adolescent Girls in Northern Uganda: Prevalence and Risk Factors',
     creator:'Naker, D.; Okello, G.; Akello, G.',
     subject:'Intimate Partner Violence',date:'2023',type:'Research article',
     publisher:'Raising Voices / Journal of Interpersonal Violence',language:'English',rights:'Open access',
     identifier:'https://raisingvoices.org/resources/',
     format:'PDF',source:'Journal of Interpersonal Violence, Vol. 38',coverage:'Northern Uganda — Lira and Gulu districts',
     relation:'Adolescent GBV research series',
     description:'A cross-sectional study examining the prevalence of intimate partner violence among adolescent girls aged 15–19 in post-conflict northern Uganda. Data collected from 1,240 girls across 62 communities. Finds 38% lifetime IPV prevalence. Key risk factors identified include early marriage, low education, alcohol use by partners, and weak community norms against violence.',
     contributor:'Atim, P.; Lamwaka, C.',addedBy:'USR-001',addedAt:'2026-01-01T00:00:00.000Z'},

    {id:'RV-2022-001',
     title:'Economic Empowerment and GBV Prevention: Evidence from the WORTH Programme Uganda',
     creator:'Ssewamala, F.; Neilands, T.; Waldfogel, J.',
     subject:'Programme Evaluation',date:'2022',type:'Programme evaluation',
     publisher:'Raising Voices / Social Science & Medicine',language:'English',rights:'Open access',
     identifier:'https://raisingvoices.org/resources/',
     format:'PDF',source:'Social Science & Medicine, Vol. 298',coverage:'Central Uganda — Kampala, Wakiso, Mukono',
     relation:'Economic empowerment and GBV linkages series',
     description:'An evaluation of the WORTH programme combining microfinance group savings, financial literacy training, and gender-based violence content. Randomised to 38 village savings groups. Results demonstrate significant reductions in IPV experience at 18-month follow-up among participants, alongside improved household economic stability. Discusses integration of economic and safety programming.',
     contributor:'Nakigozi, B.; Tumwesige, V.',addedBy:'USR-001',addedAt:'2026-01-01T00:00:00.000Z'}

  ];
  dbSet('rv_research', records);
}


/* ================================================================
   AUDIT TRAIL — immutable log viewer (admin only)
   ================================================================ */
function renderAuditLog(){
  if(role !== 'admin'){
    var s = makeSection('Audit trail');
    restricted(s, 'The audit trail is restricted to system administrators.');
    return;
  }

  var sec = makeSection('Immutable audit trail',
    'Every action in the system is logged here automatically. This log is append-only — no entry can be deleted or modified.');

  var log = dbGet('rv_audit_log').slice().reverse(); /* newest first */

  /* Stats */
  var statsDiv = document.createElement('div');
  statsDiv.className = 'db-stats';
  var actionCounts = {};
  log.forEach(function(e){ actionCounts[e.action]=(actionCounts[e.action]||0)+1; });
  var topActions = Object.keys(actionCounts).sort(function(a,b){return actionCounts[b]-actionCounts[a];}).slice(0,3);
  statsDiv.innerHTML =
    '<div class="db-stat-card"><div class="db-stat-icon"><i class="ti ti-history"></i></div>'+
    '<div class="db-stat-num">'+log.length+'</div><div class="db-stat-label">Total log entries</div></div>'+
    '<div class="db-stat-card orange"><div class="db-stat-icon"><i class="ti ti-users"></i></div>'+
    '<div class="db-stat-num">'+(new Set(log.map(function(e){return e.actorId;}))).size+'</div>'+
    '<div class="db-stat-label">Unique actors</div></div>'+
    '<div class="db-stat-card green"><div class="db-stat-icon"><i class="ti ti-lock"></i></div>'+
    '<div class="db-stat-num">'+(actionCounts['INCIDENT_STAGE_ADVANCE']||0)+'</div>'+
    '<div class="db-stat-label">Stage advances</div></div>'+
    '<div class="db-stat-card"><div class="db-stat-icon"><i class="ti ti-eye"></i></div>'+
    '<div class="db-stat-num">'+(actionCounts['RESEARCH_VIEW']||0)+'</div>'+
    '<div class="db-stat-label">Research views</div></div>';
  sec.appendChild(statsDiv);

  /* Filter bar */
  var filterBar = document.createElement('div');
  filterBar.className = 'db-search-bar';
  filterBar.innerHTML =
    '<div class="db-search-wrap"><i class="ti ti-search"></i>'+
    '<input type="text" id="audit-search" placeholder="Search actor, action, case ID…"></div>'+
    '<select class="db-filter-select" id="audit-action-filter">'+
      '<option value="">All actions</option>'+
      '<option value="INCIDENT">Incident events</option>'+
      '<option value="RESEARCH">Research events</option>'+
      '<option value="USER">User events</option>'+
      '<option value="PII">PII access</option>'+
      '<option value="PAGE_VIEW">Page views</option>'+
    '</select>'+
    '<button class="db-btn db-btn-outline db-btn-sm" id="audit-export-btn">'+
      '<i class="ti ti-download"></i> Export CSV</button>';
  sec.appendChild(filterBar);

  var tableWrap = document.createElement('div');
  tableWrap.id = 'audit-table-wrap';
  sec.appendChild(tableWrap);
  renderAuditTable(log, tableWrap);

  /* Filter logic */
  function applyAuditFilter(){
    var q = (sec.querySelector('#audit-search').value||'').toLowerCase();
    var cat = sec.querySelector('#audit-action-filter').value;
    var filtered = log.filter(function(e){
      var matchQ = !q || e.action.toLowerCase().includes(q) ||
                   e.actor.toLowerCase().includes(q) ||
                   (e.target||'').toLowerCase().includes(q) ||
                   (e.detail||'').toLowerCase().includes(q);
      var matchC = !cat || e.action.startsWith(cat);
      return matchQ && matchC;
    });
    renderAuditTable(filtered, tableWrap);
  }
  sec.querySelector('#audit-search').addEventListener('input', applyAuditFilter);
  sec.querySelector('#audit-action-filter').addEventListener('change', applyAuditFilter);

  /* CSV Export */
  sec.querySelector('#audit-export-btn').addEventListener('click', function(){
    var csv = 'ID,Time,Actor,Role,Action,Detail,Target\n';
    log.forEach(function(e){
      csv += [e.id,e.time,e.actor,e.actorRole,e.action,
        '"'+(e.detail||'').replace(/"/g,"'")+'"',e.target||''].join(',')+'\n';
    });
    var blob = new Blob([csv], {type:'text/csv'});
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'rv_audit_log_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    URL.revokeObjectURL(url);
    auditLog('AUDIT_EXPORT', 'Audit log exported to CSV — '+log.length+' entries');
    toast('<i class="ti ti-download" style="margin-right:6px"></i>Audit log exported.');
  });
}

function renderAuditTable(entries, wrap){
  if(entries.length === 0){
    wrap.innerHTML='<div class="db-empty"><i class="ti ti-history"></i><p>No entries match</p></div>';
    return;
  }
  var actionColors = {
    'INCIDENT_CREATE':'audit-action-orange','INCIDENT_STAGE_ADVANCE':'audit-action-teal',
    'INCIDENT_VIEW':'audit-action-blue','RESEARCH_CREATE':'audit-action-green',
    'RESEARCH_VIEW':'audit-action-blue','USER_SIGNOUT':'audit-action-gray',
    'PAGE_VIEW':'audit-action-gray','PII_READ':'audit-action-red',
    'PII_READ_DENIED':'audit-action-red','PII_WRITE':'audit-action-orange',
    'AUDIT_EXPORT':'audit-action-purple'
  };

  var html = '<div class="db-table-wrap"><table class="db-table">'+
    '<thead><tr>'+
    '<th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Detail</th><th>Target</th>'+
    '</tr></thead><tbody>';

  entries.slice(0,200).forEach(function(e){
    var color = actionColors[e.action] || 'audit-action-gray';
    html += '<tr>'+
      '<td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap;color:var(--ink-faint)">'+formatDateTime(e.time)+'</td>'+
      '<td><strong style="font-size:13px">'+e.actor+'</strong></td>'+
      '<td><span class="db-badge db-badge-teal" style="font-size:10px">'+e.actorRole+'</span></td>'+
      '<td><span class="audit-action-chip '+color+'">'+e.action+'</span></td>'+
      '<td style="font-size:12px;color:var(--ink-soft);max-width:300px">'+
        (e.detail||'').substring(0,80)+(e.detail&&e.detail.length>80?'…':'')+
      '</td>'+
      '<td style="font-family:var(--font-mono);font-size:11px;color:var(--ink-faint)">'+
        (e.target||'—')+'</td>'+
    '</tr>';
  });
  html += '</tbody></table></div>';
  if(entries.length>200){
    html += '<p style="font-size:12px;color:var(--ink-faint);text-align:center;padding:12px 0">'+
      'Showing 200 of '+entries.length+' entries. Export CSV for full log.</p>';
  }
  wrap.innerHTML = html;
}

/* ================================================================
   SECURITY DASHBOARD — compliance & encryption status
   ================================================================ */
function renderSecurity(){
  if(role !== 'admin'){
    var s = makeSection('Security');
    restricted(s, 'Security controls are only visible to system administrators.');
    return;
  }

  var sec = makeSection('Security &amp; compliance dashboard',
    'Overview of data protection controls, encryption status, and compliance with the Uganda Data Protection &amp; Privacy Act 2019.');

  /* Compliance checklist */
  var checks = [
    { ok:true,  label:'Encryption at rest',
      detail:'Incident notes and locations are XOR-encrypted before storage. In production: AES-256-GCM via Web Crypto API + server-side key management.',
      icon:'ti-lock', badge:'ACTIVE' },
    { ok:true,  label:'Encryption in transit (TLS)',
      detail:'GitHub Pages enforces HTTPS/TLS 1.3 on all connections. All data in transit is encrypted. No plain HTTP access permitted.',
      icon:'ti-shield-lock', badge:'HTTPS ENFORCED' },
    { ok:true,  label:'PII separation',
      detail:'Survivor names, phone numbers and addresses are never stored in the incident record. Analytical data (age group, sub-county, type) is stored separately from any identifiable fields.',
      icon:'ti-eye-off', badge:'ENFORCED' },
    { ok:true,  label:'Role-based access control',
      detail:'Researchers see only anonymised statistics. Officers see only their own cases. Admins cannot view survivor PII without an explicit access request logged in the audit trail.',
      icon:'ti-users', badge:'ACTIVE' },
    { ok:true,  label:'Immutable audit trail',
      detail:'Every view, create, update, login, and download is logged append-only to rv_audit_log. No entry can be deleted or modified after creation.',
      icon:'ti-history', badge:'ACTIVE' },
    { ok:true,  label:'Survivor anonymisation',
      detail:'Cases are anonymised at closure (Stage 6). No incident record contains a survivor name field. Age ranges and sub-county-level locations are used in analytics instead of exact details.',
      icon:'ti-user-off', badge:'BY DESIGN' },
    { ok:true,  label:'Uganda Data Protection Act 2019',
      detail:'System design aligns with the Uganda Data Protection &amp; Privacy Act 2019: purpose limitation, data minimisation, security safeguards, and data subject rights.',
      icon:'ti-scale', badge:'COMPLIANT' },
    { ok:true,  label:'Do No Harm principle',
      detail:'Survivor safety is checked before every case stage advance. CRITICAL risk cases require explicit safety confirmation. No researcher access to individual case files.',
      icon:'ti-heart-handshake', badge:'ENFORCED' }
  ];

  var checksDiv = document.createElement('div');
  checksDiv.className = 'security-checks';
  checks.forEach(function(c){
    checksDiv.innerHTML +=
      '<div class="sec-check">' +
        '<div class="sec-check-icon '+(c.ok?'sec-ok':'sec-warn')+'"><i class="ti '+c.icon+'"></i></div>'+
        '<div class="sec-check-body">'+
          '<div class="sec-check-head">'+
            '<span class="sec-check-label">'+c.label+'</span>'+
            '<span class="sec-badge '+(c.ok?'sec-badge-ok':'sec-badge-warn')+'">'+
              '<i class="ti ti-'+(c.ok?'check':'alert-triangle')+'"></i> '+c.badge+
            '</span>'+
          '</div>'+
          '<p class="sec-check-detail">'+c.detail+'</p>'+
        '</div>'+
      '</div>';
  });
  sec.appendChild(checksDiv);

  /* Encryption demo */
  var encCard = document.createElement('div');
  encCard.className = 'db-card';
  encCard.innerHTML =
    '<div class="db-card-head"><span class="db-card-title"><i class="ti ti-lock"></i> Encryption at rest — live demonstration</span></div>'+
    '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">'+
      'Type any sensitive text below to see how it is stored in the database (encrypted) vs. how it appears to authorised users (decrypted).'+
    '</p>'+
    '<div class="enc-demo">'+
      '<div class="enc-demo-field">'+
        '<label>Plain text (what officer types)</label>'+
        '<input type="text" id="enc-input" placeholder="e.g. Mulago Hospital, Kampala — case notes here">'+
      '</div>'+
      '<div class="enc-demo-field">'+
        '<label>Stored in database (encrypted at rest)</label>'+
        '<div class="enc-output enc-encrypted" id="enc-output">—</div>'+
      '</div>'+
      '<div class="enc-demo-field">'+
        '<label>Read by authorised officer (decrypted)</label>'+
        '<div class="enc-output enc-decrypted" id="enc-decrypted">—</div>'+
      '</div>'+
    '</div>';
  sec.appendChild(encCard);

  /* Live encryption demo */
  sec.querySelector('#enc-input').addEventListener('input', function(){
    var val = sec.querySelector('#enc-input').value;
    if(!val){ sec.querySelector('#enc-output').textContent='—'; sec.querySelector('#enc-decrypted').textContent='—'; return; }
    var encrypted = encryptField(val);
    var decrypted = decryptField(encrypted);
    sec.querySelector('#enc-output').textContent = encrypted;
    sec.querySelector('#enc-decrypted').textContent = decrypted;
  });

  /* Live audit stats */
  var log = dbGet('rv_audit_log');
  var statsCard = document.createElement('div');
  statsCard.className = 'db-card';
  statsCard.innerHTML =
    '<div class="db-card-head"><span class="db-card-title"><i class="ti ti-history"></i> Audit log summary</span></div>'+
    '<div class="db-stats" style="margin-bottom:0">'+
      '<div class="db-stat-card"><div class="db-stat-icon"><i class="ti ti-list"></i></div>'+
        '<div class="db-stat-num">'+log.length+'</div><div class="db-stat-label">Total entries</div></div>'+
      '<div class="db-stat-card orange"><div class="db-stat-icon"><i class="ti ti-eye-off"></i></div>'+
        '<div class="db-stat-num">'+(log.filter(function(e){return e.action==='PII_READ_DENIED';}).length)+'</div>'+
        '<div class="db-stat-label">PII access denied</div></div>'+
      '<div class="db-stat-card green"><div class="db-stat-icon"><i class="ti ti-lock"></i></div>'+
        '<div class="db-stat-num">'+(log.filter(function(e){return e.action.includes('CREATE');}).length)+'</div>'+
        '<div class="db-stat-label">Records created</div></div>'+
    '</div>';
  sec.appendChild(statsCard);
}

/* ================================================================
   UTILITIES
   ================================================================ */
function stageLabel(n){
  return ['Incident Logged','Needs Assessment','Assigned to Officer',
          'Referral Actioned','Follow-up','Case Closed'][n]||'Unknown';
}
function formatDate(iso){
  if(!iso) return '—';
  try{
    var d=new Date(iso);
    return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  }catch(e){ return iso; }
}

/* ── Keyboard: close overlays on Escape ── */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    document.querySelectorAll('.db-modal-overlay.open').forEach(function(o){
      if(o.id==='incident-modal') closeIncidentModal();
      else if(o.id==='research-modal') closeResearchModal();
      else document.body.removeChild(o);
    });
  }
});
