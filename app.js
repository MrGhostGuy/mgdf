/* MGDF app.js */
(function(){
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Boot ----------
  const boot = document.getElementById('boot');
  const bootFill = document.getElementById('boot-fill');
  const bootLog = document.getElementById('boot-log');
  const bootLines = [
    'Initializing holographic core...',
    'Loading archive index...',
    'Mounting particle array...',
    'Calibrating arc reactor...',
    'Syncing game links...',
    'Frontier ready.'
  ];
  let bp = 0;
  const bootStart = performance.now();
  const bootDur = 1500;
  function bootTick(t){
    const el = t - bootStart;
    const p = Math.min(100, (el/bootDur)*100);
    bootFill.style.width = p + '%';
    const li = Math.min(bootLines.length-1, Math.floor((p/100)*bootLines.length));
    if (li !== bp){ bp = li; bootLog.textContent = bootLines[li]; }
    if (p < 100) requestAnimationFrame(bootTick);
    else {
      setTimeout(()=> boot.classList.add('ready'), 300);
    }
  }
  requestAnimationFrame(bootTick);

  // ---------- Data ----------
  const GAMES = (typeof MGDF_GAMES !== 'undefined') ? MGDF_GAMES : [];
  const total = GAMES.length;
  const instantCount = GAMES.filter(g=>g.instant).length;
  const multiCount = GAMES.filter(g=>g.multiplayer).length;
  const filesCount = GAMES.filter(g=>g.needsFiles).length;

  // stats
  function setStat(id,val){ const e=document.getElementById(id); if(e) e.textContent = val; }
  setStat('stat-total', total);
  setStat('hs-total', total);
  setStat('hs-instant', instantCount);
  setStat('hs-multi', multiCount);
  setStat('hs-files', filesCount);
  setStat('results-total', total);
  setStat('intel-total', total);

  // ---------- Background canvas ----------
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W=0,H=0, nodes=[];
  const NODES = reduceMotion ? 0 : 55;
  const mouse = {x:-9999,y:-9999};
  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function initNodes(){
    nodes = [];
    for(let i=0;i<NODES;i++){
      nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.6+0.6});
    }
  }
  function drawBg(){
    ctx.clearRect(0,0,W,H);
    // subtle radial
    const g = ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,Math.max(W,H)*.7);
    g.addColorStop(0,'rgba(77,234,255,0.06)');
    g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // nodes
    for(const n of nodes){
      n.x += n.vx; n.y += n.vy;
      if(n.x<0||n.x>W) n.vx*=-1;
      if(n.y<0||n.y>H) n.vy*=-1;
      // mouse attract slight
      const dx=mouse.x-n.x,dy=mouse.y-n.y,d=Math.hypot(dx,dy);
      if(d<160){ n.vx += dx/d*.015; n.vy += dy/d*.015; }
      // damp
      n.vx*=.995; n.vy*=.995;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle='rgba(77,234,255,0.6)';ctx.fill();
    }
    // connections
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<130){
          ctx.strokeStyle='rgba(77,234,255,'+(0.14*(1-d/130))+')';
          ctx.lineWidth=.6;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
    }
    if(!reduceMotion) requestAnimationFrame(drawBg);
  }
  resize();initNodes();drawBg();
  window.addEventListener('resize',()=>{resize();initNodes();});
  window.addEventListener('mousemove',(e)=>{mouse.x=e.clientX;mouse.y=e.clientY;
    const cg=document.getElementById('cursor-glow'); if(cg){cg.style.left=e.clientX+'px';cg.style.top=e.clientY+'px';}
  });

  // ---------- Router ----------
  const views = {
    home: document.getElementById('view-home'),
    arsenal: document.getElementById('view-arsenal'),
    intel: document.getElementById('view-intel')
  };
  // routing is wired up at the bottom of this module

  // ---------- Helpers ----------
  function initials(title){
    return title.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,3).map(w=>w[0]).join('').toUpperCase() || 'GM';
  }
  function safe(str){ return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // categories/platforms
  const categories = ['ALL'].concat([...new Set(GAMES.map(g=>g.category))].sort());
  const platforms = ['ALL'].concat([...new Set(GAMES.map(g=>g.platform))].sort());

  // ---------- Filters UI ----------
  function makeChips(container, items, stateKey, multi=false){
    const el = document.getElementById(container);
    if(!el) return;
    el.innerHTML='';
    items.forEach((it,idx)=>{
      const b = document.createElement('button');
      b.className = 'chip-btn' + ( (it==='ALL'||idx===0) ? ' active' : '');
      b.textContent = it;
      b.dataset.val = it;
      b.dataset.key = stateKey;
      el.appendChild(b);
    });
  }
  const filters = { category:'ALL', platform:'ALL', access:'ALL', query:'' };
  makeChips('cat-filters', categories, 'category');
  makeChips('plat-filters', platforms, 'platform');
  makeChips('access-filters', ['ALL','INSTANT','FILES','MULTI'], 'access');

  document.addEventListener('click',(e)=>{
    const btn = e.target.closest('.chip-btn');
    if(!btn) return;
    const group = btn.parentElement;
    group.querySelectorAll('.chip-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.key;
    let val = btn.dataset.val;
    if(key==='access'){
      // map
      filters.access = val==='ALL'?'ALL': val==='INSTANT'?'instant': val==='FILES'?'files':'multi';
    } else {
      filters[key]=val;
    }
    applyFilters();
  });

  // search
  const searchInput = document.getElementById('search');
  let searchTimer;
  searchInput.addEventListener('input',()=>{
    clearTimeout(searchTimer);
    searchTimer = setTimeout(()=>{ filters.query = searchInput.value.trim().toLowerCase(); applyFilters(); }, 120);
  });
  // focus shortcut /
  document.addEventListener('keydown',(e)=>{
    if(e.key==='/' && document.activeElement !== searchInput){
      e.preventDefault();
      // ensure arsenal view
      if(currentRoute!=='arsenal') location.hash='#arsenal';
      setTimeout(()=>searchInput.focus(),50);
    }
    if(e.key==='Escape'){
      closeModal();
    }
  });

  // ---------- Rendering ----------
  const grid = document.getElementById('game-grid');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('results-count');
  function match(g){
    if(filters.category!=='ALL' && g.category!==filters.category) return false;
    if(filters.platform!=='ALL' && g.platform!==filters.platform) return false;
    if(filters.access==='instant' && !g.instant) return false;
    if(filters.access==='files' && !g.needsFiles) return false;
    if(filters.access==='multi' && !g.multiplayer) return false;
    if(filters.query && !g.title.toLowerCase().includes(filters.query)) return false;
    return true;
  }
  function badgeClass(g){
    if(g.needsFiles) return 'files';
    if(g.instant) return 'instant';
    return 'multi';
  }
  function buildCard(g, i){
    const art = document.createElement('article');
    art.className='card';
    art.style.animationDelay = Math.min(i*0.02,0.6)+'s';
    art.dataset.id = g.id;

    const cover = document.createElement('div');
    cover.className='card-cover';
    const img = document.createElement('img');
    img.src = g.img; img.alt = g.title + ' cover'; img.loading='lazy'; img.decoding='async';
    img.onerror = function(){ this.style.opacity='.25'; };
    const overlay = document.createElement('div'); overlay.className='cover-overlay';
    const em = document.createElement('span'); em.className='emblem'; em.textContent=initials(g.title);
    const catBadge = document.createElement('span'); catBadge.className='badge cat'; catBadge.textContent=g.category;
    const extra = document.createElement('div'); extra.className='badges-extra';
    const chips = [];
    if(g.instant) chips.push('<span class="chip instant">INSTANT</span>');
    if(g.needsFiles) chips.push('<span class="chip files">FILES</span>');
    if(g.multiplayer) chips.push('<span class="chip multi">MULTI</span>');
    extra.innerHTML = chips.join('');
    const scan = document.createElement('div'); scan.className='card-scan';
    cover.append(img,overlay,em,catBadge,extra,scan);

    const body = document.createElement('div'); body.className='card-body';
    const title = document.createElement('h3'); title.className='card-title'; title.textContent=g.title;
    const meta = document.createElement('div'); meta.className='card-meta';
    const plat = document.createElement('span'); plat.className='platform'; plat.textContent=g.platform;
    const st = document.createElement('span'); st.className='status-list'; st.textContent=g.statuses.join(' · ');
    meta.append(plat,st);
    const actions = document.createElement('div'); actions.className='card-actions';
    const lb = document.createElement('button'); lb.className='launch-mini'; lb.textContent='LAUNCH';
    lb.addEventListener('click',(ev)=>{ ev.stopPropagation(); window.open(g.url,'_blank','noopener'); });
    const ib = document.createElement('button'); ib.className='info-mini'; ib.textContent='INFO';
    ib.addEventListener('click',(ev)=>{ ev.stopPropagation(); openModal(g); });
    actions.append(lb,ib);
    body.append(title,meta,actions);
    art.append(cover,body);

    // tilt
    if(!reduceMotion){
      art.addEventListener('mousemove',(ev)=>{
        const r=art.getBoundingClientRect();
        const x=(ev.clientX-r.left)/r.width - .5;
        const y=(ev.clientY-r.top)/r.height - .5;
        art.style.transform = `perspective(900px) rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-4px)`;
      });
      art.addEventListener('mouseleave',()=>{ art.style.transform=''; });
    }
    art.addEventListener('click',()=> openModal(g));
    // keyboard
    art.tabIndex=0;
    art.setAttribute('role','article');
    art.addEventListener('keydown',(ev)=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); openModal(g);} });
    return art;
  }

  function renderList(list, container, limit){
    const c = document.getElementById(container);
    if(!c) return;
    c.innerHTML='';
    const frag = document.createDocumentFragment();
    const n = limit? Math.min(limit,list.length) : list.length;
    for(let i=0;i<n;i++){ frag.appendChild(buildCard(list[i],i)); }
    c.appendChild(frag);
  }

  // arsenal render tracking uses window.__arsenalRendered
  window.__arsenalRendered = false;

  function renderArsenal(){
    const filtered = GAMES.filter(match);
    renderList(filtered,'game-grid');
    countEl.textContent = filtered.length;
    emptyState.hidden = filtered.length !== 0;
  }
  function applyFilters(){ if(window.__arsenalRendered) renderArsenal(); }
  // initial arsenal render when view opens handled by route; but render now if active
  // We'll let route call. Also render featured now.
  const featured = GAMES.slice(0,8);
  renderList(featured,'featured-grid');

  // route handling needs render trigger
  // patch route defined earlier? redeclare safe: update the view activation block via event listener? 
  // We'll instead set a global hook.
  window.addEventListener('hashchange',()=>{ if(location.hash==='#arsenal' && !window.__arsenalRendered){ window.__arsenalRendered=true; renderArsenal(); } });
  if(location.hash==='#arsenal'){ window.__arsenalRendered=true; renderArsenal(); }

  // ---------- Modal ----------
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalKicker = document.getElementById('modal-kicker');
  const modalMeta = document.getElementById('modal-meta');
  const modalBadges = document.getElementById('modal-badges');
  const modalDesc = document.getElementById('modal-desc');
  const modalLaunch = document.getElementById('modal-launch');
  function openModal(g){
    modalImg.src = g.img;
    modalImg.alt = g.title;
    modalTitle.textContent = g.title;
    modalKicker.textContent = g.category + ' · ' + g.platform;
    modalMeta.innerHTML = g.statuses.map(s=>`<span class="platform">${safe(s)}</span>`).join('');
    modalBadges.innerHTML = [
      g.instant?'<span class="chip instant">INSTANT PLAY</span>':'',
      g.needsFiles?'<span class="chip files">NEEDS FILES</span>':'',
      g.multiplayer?'<span class="chip multi">MULTIPLAYER</span>':''
    ].join('');
    modalDesc.textContent = 'Launches in a new tab on the original community host. Some projects require game files from a copy you own.';
    modalLaunch.href = g.url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  modal.addEventListener('click',(e)=>{ if(e.target.dataset.close!==undefined || e.target.classList.contains('modal-backdrop')) closeModal(); });
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModal));

  // fix render arsenal flag linkage with chip changes: applyFilters calls renderArsenal only if rendered
  const _apply = applyFilters;
  window.applyFilters = () => {
    if (window.__arsenalRendered) renderArsenal();
  };
  // update chip click handler invocation already calls applyFilters (global). Ensure global exists:
  // redefine click handling by overriding? We'll append a new listener instead is messy; instead set window.applyFilters = window.applyFilters.
  // The closure 'applyFilters' already references; but chip handler calls applyFilters() from same scope, okay.

  // ---------- routing currentRoute tracking ----------
  // The first route() call happens below; ensure currentRoute init.
  let currentRoute = null;

  // Re-run route logic (define after currentRoute)
  function route(){
    const h = (location.hash||'#home').replace('#','') || 'home';
    const target = views[h] ? h : 'home';
    if (target === currentRoute) return;
    const swap = () => {
      Object.keys(views).forEach(k=> views[k].classList.toggle('active', k===target));
      document.querySelectorAll('.nav-link').forEach(a=> a.classList.toggle('active', a.dataset.route===target));
      currentRoute = target;
      if(target==='arsenal' && !window.__arsenalRendered){ window.__arsenalRendered=true; renderArsenal(); }
    };
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(swap); else swap();
  }
  window.addEventListener('hashchange',route);
  if(!location.hash) location.hash='#home';
  route();

  // ---------- featured render already done, but counts for chips filter active ----------
  // nothing else.

  // ---------- filter chips selection initial active already in CSS via first items; ensure state defaults match first values
  // cat first is ALL (categories[0]='ALL'), platform first ALL, access first 'ALL'. good.

  // ---------- search modal activation on arsenal view if not ----------
  // done.

})();
