/* Agent Builder demo · Option 1 · Blank Canvas */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const W = 230;
  const STORE_KEY = document.body.dataset.store || 'agentbuilder.option1';
  const DEFS = Object.fromEntries(NODE_DEFS.map(d => [d.id, d]));
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));

  const state = { nodes: [], edges: [], sel: null, credits: 10150, runs: [], running: false };
  const view = { x: 40, y: 0, k: 1 };
  const doneEdges = new Set();
  const nodeStatus = new Map();
  const openCats = new Set();
  let uid = 1, hist = [], hi = -1, newArmed = false, addCount = 0, tempPath = '';

  const canvas = $('#canvas'), world = $('#world'), nodesHost = $('#nodes');
  const byId = id => state.nodes.find(n => n.id === id);
  const nid = () => 'n' + uid++;
  const eid = () => 'e' + uid++;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* ---------- geometry ---------- */
  function dims(n) {
    const outs = DEFS[n.type].outputs.length;
    return { H: outs > 1 ? 28 + outs * 26 : 64, outs };
  }
  function outY(n, i) { const { H, outs } = dims(n); return outs > 1 ? (H / (outs + 1)) * (i + 1) : H / 2; }
  const inPos = n => ({ x: n.x, y: n.y + dims(n).H / 2 });
  const outPos = (n, i) => ({ x: n.x + W, y: n.y + outY(n, i) });
  function curve(a, b) {
    const dx = Math.max(50, Math.abs(b.x - a.x) / 2);
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  }
  function toWorld(cx, cy) {
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
  }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- history / persistence ---------- */
  const snap = () => JSON.stringify({
    nodes: state.nodes,
    edges: state.edges
  });
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ nodes: state.nodes, edges: state.edges, credits: state.credits, uid })); } catch (e) { /* ignore */ }
  }
  function markSaved() { $('#savedAt').textContent = 'Saved ' + clock(); }
  function commit() {
    hist = hist.slice(0, hi + 1); hist.push(snap()); if (hist.length > 100) hist.shift(); hi = hist.length - 1;
    persist(); markSaved(); emitChange();
  }
  function emitChange() { ((window.AB && window.AB.listeners) || []).forEach(f => { try { f(); } catch (e) { /* ignore */ } }); }
  function loadSnap(s) {
    const o = JSON.parse(s);
    state.nodes = o.nodes; state.edges = o.edges; doneEdges.clear(); nodeStatus.clear();
    if (state.sel && !(state.sel.type === 'node' ? byId(state.sel.id) : state.edges.some(e => e.id === state.sel.id))) state.sel = null;
    renderAll(); renderPanel(true); emitChange();
  }
  function undo() { if (hi > 0) { hi--; loadSnap(hist[hi]); persist(); } }
  function redo() { if (hi < hist.length - 1) { hi++; loadSnap(hist[hi]); persist(); } }

  /* ---------- rendering ---------- */
  function needsSetup(n) {
    const d = DEFS[n.type], x = n.data;
    if (d.cat === 'integrations') return !x.conn;
    if (d.id === 'http') return !x.url;
    if (d.cat === 'ai') return !x.prompt;
    return false;
  }
  function setupHint(n) {
    const d = DEFS[n.type];
    if (d.cat === 'integrations') return 'no connection selected';
    if (d.id === 'http') return 'URL is empty';
    return 'prompt is empty';
  }
  function classesFor(el, n) {
    const sel = state.sel && state.sel.type === 'node' && state.sel.id === n.id;
    const st = nodeStatus.get(n.id);
    el.classList.toggle('selected', !!sel);
    el.classList.toggle('warn', needsSetup(n) && st !== 'ok');
    el.classList.toggle('running', st === 'running');
    el.classList.toggle('ok', st === 'ok');
    el.classList.toggle('skipped', st === 'skipped');
  }
  function buildNode(n) {
    const d = DEFS[n.type], cat = CATMAP[d.cat], { H } = dims(n);
    const multi = d.outputs.length > 1;
    const el = document.createElement('div');
    el.className = 'node'; el.dataset.id = n.id;
    el.style.cssText = `left:${n.x}px;top:${n.y}px;height:${H}px;`;
    let h = '';
    if (d.inputs) h += `<div class="port in" style="top:${H / 2 - 8}px"></div>`;
    h += `<div class="node-ico" style="background:${d.color || cat.color}">${d.abbr ? d.abbr : ico(cat.icon, 20)}</div>`;
    h += `<div class="node-txt${multi ? ' pad' : ''}"><div class="node-title"></div><div class="node-sub"></div></div>`;
    h += '<div class="badge"></div>';
    d.outputs.forEach((o, i) => {
      h += `<div class="port out" data-port="${i}" style="top:${outY(n, i) - 8}px"></div>`;
      if (multi) h += `<span class="port-label" style="top:${outY(n, i) - 8}px">${o}</span>`;
    });
    el.innerHTML = h;
    $('.node-title', el).textContent = n.data.name;
    $('.node-sub', el).textContent = d.id === 'note' ? (n.data.text || d.desc) : d.desc;
    classesFor(el, n);
    return el;
  }
  const nodeEl = id => nodesHost.querySelector(`.node[data-id="${id}"]`);
  function renderNodes() {
    nodesHost.innerHTML = '';
    state.nodes.forEach(n => nodesHost.appendChild(buildNode(n)));
    $('#emptyHint').classList.toggle('gone', state.nodes.length > 0);
    $('#btnRun').disabled = state.running || state.nodes.length === 0;
  }
  function renderEdges() {
    let h = '', del = '';
    for (const e of state.edges) {
      const a = byId(e.from), b = byId(e.to); if (!a || !b) continue;
      const A = outPos(a, e.port), B = inPos(b), p = curve(A, B);
      const sel = state.sel && state.sel.type === 'edge' && state.sel.id === e.id;
      h += `<g class="edge${sel ? ' sel' : ''}${doneEdges.has(e.id) ? ' done' : ''}" data-id="${e.id}"><path class="edge-hit" d="${p}"/><path class="edge-line" d="${p}"/></g>`;
      if (sel) del = `<g class="edge-del" data-del="${e.id}" transform="translate(${(A.x + B.x) / 2},${(A.y + B.y) / 2})"><circle r="11"/><path d="M-3.5,-3.5L3.5,3.5M3.5,-3.5L-3.5,3.5"/></g>`;
    }
    $('#edgeLayer').innerHTML = h + del;
    $('#tempEdge').setAttribute('d', tempPath);
  }
  function renderAll() { renderNodes(); renderEdges(); drawMinimap(); }
  function refreshNode(n) { const el = nodeEl(n.id); if (el) classesFor(el, n); }

  /* ---------- view ---------- */
  function applyView() {
    world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`;
    const s = 24 * view.k;
    canvas.style.backgroundSize = `${s}px ${s}px`;
    canvas.style.backgroundPosition = `${view.x}px ${view.y}px`;
    drawMinimap();
  }
  function zoomAt(px, py, f) {
    const nk = Math.min(2, Math.max(0.3, view.k * f));
    view.x = px - (px - view.x) * (nk / view.k);
    view.y = py - (py - view.y) * (nk / view.k);
    view.k = nk; applyView();
  }
  function fitView() {
    const r = canvas.getBoundingClientRect();
    if (!state.nodes.length) { view.x = 40; view.y = 0; view.k = 1; applyView(); return; }
    const bb = bounds();
    const pad = 100;
    const k = Math.min(1.2, (r.width - pad * 2) / (bb.x1 - bb.x0), (r.height - pad * 2) / (bb.y1 - bb.y0));
    view.k = Math.max(0.3, k);
    view.x = r.width / 2 - ((bb.x0 + bb.x1) / 2) * view.k;
    view.y = r.height / 2 - ((bb.y0 + bb.y1) / 2) * view.k;
    applyView();
  }
  function bounds() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of state.nodes) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + W); y1 = Math.max(y1, n.y + dims(n).H); }
    return { x0, y0, x1, y1 };
  }
  const viewCenterWorld = () => { const r = canvas.getBoundingClientRect(); return { x: (r.width / 2 - view.x) / view.k, y: (r.height / 2 - view.y) / view.k }; };

  /* ---------- minimap ---------- */
  let mm = null;
  function drawMinimap() {
    const cv = $('#mmCanvas'), ctx = cv.getContext('2d');
    const CW = 200, CH = 120;
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, CW, CH);
    const r = canvas.getBoundingClientRect();
    const vp = { x0: -view.x / view.k, y0: -view.y / view.k, x1: (-view.x + r.width) / view.k, y1: (-view.y + r.height) / view.k };
    let b = { ...vp };
    if (state.nodes.length) { const nb = bounds(); b = { x0: Math.min(b.x0, nb.x0), y0: Math.min(b.y0, nb.y0), x1: Math.max(b.x1, nb.x1), y1: Math.max(b.y1, nb.y1) }; }
    const pad = 40, bw = b.x1 - b.x0 + pad * 2, bh = b.y1 - b.y0 + pad * 2;
    const s = Math.min(CW / bw, CH / bh);
    const ox = (CW - bw * s) / 2 - (b.x0 - pad) * s, oy = (CH - bh * s) / 2 - (b.y0 - pad) * s;
    mm = { s, ox, oy };
    for (const n of state.nodes) {
      const d = DEFS[n.type];
      ctx.fillStyle = d.color || CATMAP[d.cat].color; ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.roundRect(n.x * s + ox, n.y * s + oy, Math.max(4, W * s), Math.max(3, dims(n).H * s), 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#111113'; ctx.lineWidth = 1.2; ctx.fillStyle = 'rgba(17,17,19,.05)';
    const vx = vp.x0 * s + ox, vy = vp.y0 * s + oy, vw = (vp.x1 - vp.x0) * s, vh = (vp.y1 - vp.y0) * s;
    ctx.fillRect(vx, vy, vw, vh); ctx.strokeRect(vx, vy, vw, vh);
  }
  function minimapPan(e) {
    if (!mm) return;
    const r = $('#minimap').getBoundingClientRect();
    const wx = ((e.clientX - r.left) - mm.ox) / mm.s, wy = ((e.clientY - r.top) - mm.oy) / mm.s;
    const cr = canvas.getBoundingClientRect();
    view.x = cr.width / 2 - wx * view.k; view.y = cr.height / 2 - wy * view.k; applyView();
  }

  /* ---------- selection & panel ---------- */
  function select(sel) {
    const same = JSON.stringify(sel) === JSON.stringify(state.sel);
    state.sel = sel;
    state.nodes.forEach(n => refreshNode(n));
    renderEdges();
    if (!same) renderPanel();
  }
  function renderPanel(force) {
    const node = state.sel && state.sel.type === 'node' ? byId(state.sel.id) : null;
    $('#toolsView').hidden = !!node; $('#configView').hidden = !node;
    if (node) { $('#panel').classList.remove('closed'); $('#tbTools').classList.add('active'); renderConfig(node); }
    else if (force) renderTools();
  }
  function renderTools() {
    const q = $('#toolSearch').value.trim().toLowerCase();
    const host = $('#cats'); host.innerHTML = '';
    let any = false;
    for (const c of CATS) {
      const items = NODE_DEFS.filter(d => d.cat === c.id && (!q || (d.name + ' ' + d.desc).toLowerCase().includes(q)));
      if (q && !items.length) continue;
      any = true;
      const open = q ? true : openCats.has(c.id);
      const sec = document.createElement('div'); sec.className = 'cat' + (open ? ' open' : '');
      sec.innerHTML = `<button class="cat-head"><span class="cat-name"></span><span class="count">${items.length}</span><span class="chev">${ico('chevron', 16)}</span></button><div class="cat-items"></div>`;
      $('.cat-name', sec).textContent = c.name;
      $('.cat-head', sec).addEventListener('click', () => {
        if (q) return;
        openCats.has(c.id) ? openCats.delete(c.id) : openCats.add(c.id);
        sec.classList.toggle('open');
      });
      const list = $('.cat-items', sec);
      for (const d of items) {
        const t = document.createElement('div'); t.className = 'tool'; t.draggable = true;
        t.innerHTML = `<div class="tool-ico" style="background:${d.color || c.color}">${d.abbr ? d.abbr : ico(c.icon, 16)}</div><div><div class="tool-name"></div><div class="tool-desc"></div></div>`;
        $('.tool-name', t).textContent = d.name; $('.tool-desc', t).textContent = d.desc;
        t.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', 'node:' + d.id); e.dataTransfer.effectAllowed = 'copy'; });
        t.addEventListener('click', () => {
          const last = state.nodes[state.nodes.length - 1];
          if (last) return addNode(d.id, last.x + W + 70, last.y);
          const c0 = viewCenterWorld();
          addNode(d.id, c0.x - W / 2, c0.y - 32);
        });
        list.appendChild(t);
      }
      host.appendChild(sec);
    }
    if (!any) host.innerHTML = '<div class="no-results">No tools match your search.</div>';
  }
  function renderConfig(n) {
    const d = DEFS[n.type], cat = CATMAP[d.cat];
    const icoEl = $('#cfgIcon'); icoEl.style.background = d.color || cat.color;
    icoEl.innerHTML = d.abbr ? d.abbr : ico(cat.icon, 20);
    $('#cfgTitle').textContent = n.data.name; $('#cfgSub').textContent = cat.name + ' · ' + d.name;
    const ins = state.edges.filter(e => e.to === n.id).length, outs = state.edges.filter(e => e.from === n.id).length;
    $('#cfgConn').textContent = `${ins} incoming · ${outs} outgoing connection${outs === 1 ? '' : 's'}`;
    const form = $('#cfgForm'); form.innerHTML = '';
    for (const f of fieldsFor(d)) {
      const wrap = document.createElement('label'); wrap.className = 'field';
      const lab = document.createElement('span');
      const setLab = () => { lab.textContent = f.type === 'range' ? `${f.label} · ${Number(n.data[f.k]).toFixed(1)}` : f.label; };
      setLab();
      let inp;
      if (f.type === 'textarea') { inp = document.createElement('textarea'); inp.rows = f.rows || 3; }
      else if (f.type === 'select') {
        inp = document.createElement('select');
        f.options.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o || '— Select —'; inp.appendChild(op); });
      } else {
        inp = document.createElement('input');
        inp.type = f.type === 'range' ? 'range' : f.type === 'number' ? 'number' : 'text';
        if (f.type === 'range') { inp.min = 0; inp.max = 1; inp.step = 0.1; }
      }
      if (f.placeholder) inp.placeholder = f.placeholder;
      inp.value = n.data[f.k] ?? '';
      inp.addEventListener('input', () => {
        n.data[f.k] = (f.type === 'number' || f.type === 'range') ? Number(inp.value) : inp.value;
        if (f.type === 'range') setLab();
        if (f.k === 'name') {
          $('.node-title', nodeEl(n.id)).textContent = n.data.name || d.name; $('#cfgTitle').textContent = n.data.name || d.name;
        }
        if (d.id === 'note' && f.k === 'text') $('.node-sub', nodeEl(n.id)).textContent = n.data.text || d.desc;
        refreshNode(n); emitChange();
      });
      inp.addEventListener('change', commit);
      wrap.append(lab, inp); form.appendChild(wrap);
    }
  }

  /* ---------- graph actions ---------- */
  function addNode(type, x, y) {
    const d = DEFS[type];
    const n = { id: nid(), type, x: Math.round(x), y: Math.round(y), data: defaultsFor(d, state.nodes.map(m => m.data.name)) };
    state.nodes.push(n);
    renderNodes(); renderEdges(); drawMinimap();
    state.sel = null; select({ type: 'node', id: n.id });
    commit();
  }
  function removeNode(id) {
    state.nodes = state.nodes.filter(n => n.id !== id);
    state.edges = state.edges.filter(e => e.from !== id && e.to !== id);
    state.sel = null; renderAll(); renderPanel(true); commit();
  }
  function removeEdge(id) {
    state.edges = state.edges.filter(e => e.id !== id);
    state.sel = null; doneEdges.delete(id); renderEdges(); commit();
  }
  function addEdge(from, port, to) {
    if (from === to) return false;
    if (state.edges.some(e => e.from === from && e.port === port && e.to === to)) { toast('Those nodes are already connected'); return false; }
    state.edges.push({ id: eid(), from, port, to });
    renderEdges(); commit();
    if (state.sel && state.sel.type === 'node') renderConfig(byId(state.sel.id));
    return true;
  }

  /* ---------- pointer interactions ---------- */
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const t = e.target;
    if (t.closest('.toolbar, .minimap, .history-pop, .edge-hit, .edge-del, .tpl-card')) return;
    $('#historyPop').hidden = true;
    const po = t.closest('.port.out');
    if (po) return startConnect(e, po);
    const ne = t.closest('.node');
    if (ne) return startDragNode(e, ne);
    startPan(e);
  });

  function startDragNode(e, el) {
    e.preventDefault();
    const n = byId(el.dataset.id);
    select({ type: 'node', id: n.id });
    const sx = e.clientX, sy = e.clientY, ox = n.x, oy = n.y; let moved = false;
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
      moved = true;
      n.x = Math.round(ox + (ev.clientX - sx) / view.k); n.y = Math.round(oy + (ev.clientY - sy) / view.k);
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
      renderEdges(); drawMinimap();
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); if (moved) commit(); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  }

  function startPan(e) {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, vx = view.x, vy = view.y; let moved = false;
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return;
      moved = true; canvas.classList.add('panning');
      view.x = vx + ev.clientX - sx; view.y = vy + ev.clientY - sy; applyView();
    };
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      canvas.classList.remove('panning');
      if (!moved && state.sel) select(null);
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  }

  function startConnect(e, portEl) {
    e.preventDefault(); e.stopPropagation();
    const n = byId(portEl.closest('.node').dataset.id), port = +portEl.dataset.port;
    const A = outPos(n, port);
    canvas.classList.add('connecting');
    let hover = null;
    const move = ev => {
      const p = toWorld(ev.clientX, ev.clientY);
      tempPath = curve(A, p); $('#tempEdge').setAttribute('d', tempPath);
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const ne = t && t.closest('.node');
      const ok = ne && ne.dataset.id !== n.id && DEFS[byId(ne.dataset.id).type].inputs > 0 ? ne : null;
      if (hover && hover !== ok) hover.classList.remove('drop-ok');
      if (ok) ok.classList.add('drop-ok');
      hover = ok;
    };
    const up = ev => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      canvas.classList.remove('connecting'); if (hover) hover.classList.remove('drop-ok');
      tempPath = ''; $('#tempEdge').setAttribute('d', '');
      if (hover) addEdge(n.id, port, hover.dataset.id);
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  }

  $('#edges').addEventListener('click', e => {
    const del = e.target.closest('.edge-del');
    if (del) return removeEdge(del.dataset.del);
    const g = e.target.closest('.edge');
    if (g) select({ type: 'edge', id: g.dataset.id });
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });

  // drag & drop from the tools panel
  canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    const v = e.dataTransfer.getData('text/plain');
    if (!v.startsWith('node:') || !DEFS[v.slice(5)]) return;
    const p = toWorld(e.clientX, e.clientY);
    addNode(v.slice(5), p.x - W / 2, p.y - 32);
  });

  // minimap
  $('#minimap').addEventListener('pointerdown', e => {
    minimapPan(e);
    const move = ev => minimapPan(ev);
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });
  new ResizeObserver(drawMinimap).observe(canvas);

  /* ---------- toolbar ---------- */
  $('#tbTools').addEventListener('click', () => {
    const p = $('#panel'); p.classList.toggle('closed'); $('#tbTools').classList.toggle('active', !p.classList.contains('closed'));
  });
  $('#panelClose').addEventListener('click', () => { $('#panel').classList.add('closed'); $('#tbTools').classList.remove('active'); });
  $('#cfgBack').addEventListener('click', () => select(null));
  $('#cfgDelete').addEventListener('click', () => { if (state.sel && state.sel.type === 'node') removeNode(state.sel.id); });
  $('#tbZoomIn').addEventListener('click', () => { const r = canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); });
  $('#tbZoomOut').addEventListener('click', () => { const r = canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); });
  $('#tbFit').addEventListener('click', fitView);
  $('#tbNew').addEventListener('click', () => {
    if (!state.nodes.length) return toast('The canvas is already empty');
    if (!newArmed) { newArmed = true; toast('Click “New” again to clear the canvas'); setTimeout(() => newArmed = false, 3000); return; }
    newArmed = false; state.nodes = []; state.edges = []; doneEdges.clear(); nodeStatus.clear(); state.sel = null;
    renderAll(); renderPanel(true); commit(); toast('Canvas cleared · use Undo (Ctrl+Z) to restore');
  });
  $('#tbExport').addEventListener('click', () => {
    if (!state.nodes.length) return toast('Nothing to export yet');
    const blob = new Blob([JSON.stringify({ nodes: state.nodes, edges: state.edges }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'agent-workflow.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Workflow exported');
  });
  $('#tbImport').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const o = JSON.parse(rd.result);
        if (!Array.isArray(o.nodes) || !Array.isArray(o.edges) || o.nodes.some(n => !DEFS[n.type])) throw new Error('bad');
        uid = Math.max(uid, ...o.nodes.concat(o.edges).map(x => parseInt(String(x.id).slice(1), 10) || 0)) + 1;
        state.nodes = o.nodes; state.edges = o.edges; state.sel = null; doneEdges.clear(); nodeStatus.clear();
        renderAll(); renderPanel(true); fitView(); commit(); toast('Workflow imported');
      } catch (err) { toast('That file is not a valid workflow'); }
    };
    rd.readAsText(f); e.target.value = '';
  });
  $('#tbHistory').addEventListener('click', e => {
    e.stopPropagation();
    const pop = $('#historyPop');
    if (!pop.hidden) { pop.hidden = true; return; }
    let h = '<h4>Run history</h4>';
    if (!state.runs.length) h += '<div class="history-empty">No runs yet. Add a few nodes and press Run Workflow.</div>';
    state.runs.slice(0, 20).forEach(r => {
      h += `<div class="history-row"><div>${r.at}<small>${r.nodes} nodes · ${r.credits} credits</small></div><div class="${r.warnings ? 'pill-warn' : 'pill-ok'}">${r.warnings ? r.warnings + ' warning' + (r.warnings > 1 ? 's' : '') : 'Success'}</div></div>`;
    });
    pop.innerHTML = h; pop.hidden = false;
  });

  /* ---------- top bar ---------- */
  $('#btnHome').addEventListener('click', () => {
    if (window.parent !== window) window.parent.postMessage({ type: 'ux-nav', to: '#/' }, '*');
    else toast('Open index.html to see the dashboard');
  });
  $('#btnAI').addEventListener('click', () => {
    if (document.body.dataset.ai) return;
    if (window.parent !== window) window.parent.postMessage({ type: 'ux-nav', to: '#/option/3' }, '*');
    else toast('AI Generate lives in Option 3 · Prompt-First');
  });
  $('#btnMarket').addEventListener('click', () => toast('Marketplace is not part of this demo'));
  $('#btnCredits').addEventListener('click', () => toast('Each AI node costs 5 credits, every other node costs 1'));
  $('#btnSave').addEventListener('click', () => { persist(); markSaved(); toast('Workflow saved'); });
  $('#btnDeploy').addEventListener('click', () => {
    if (!state.nodes.length) return toast('Add some nodes before deploying');
    const bad = state.nodes.filter(needsSetup);
    if (bad.length) { select({ type: 'node', id: bad[0].id }); return toast(`${bad.length} node${bad.length > 1 ? 's' : ''} need setup before deploying`); }
    if (!state.nodes.some(n => DEFS[n.type].cat === 'triggers')) return toast('Add a trigger so the workflow knows when to start');
    toast('Deployed live (demo only, nothing was published)');
  });
  $('#btnRun').addEventListener('click', runWorkflow);

  /* ---------- logs & run ---------- */
  const logs = $('#logs');
  $('#logsHead').addEventListener('click', () => { logs.classList.toggle('open'); setTimeout(drawMinimap, 260); });
  let logN = 0;
  function log(level, who, msg) {
    const row = document.createElement('div'); row.className = 'log-row ' + level;
    const t = document.createElement('span'); t.className = 't'; t.textContent = new Date().toLocaleTimeString([], { hour12: false });
    const w = document.createElement('span'); w.className = 'who'; w.textContent = who;
    const m = document.createElement('span'); m.className = 'msg'; m.textContent = msg;
    row.append(t, w, m); const body = $('#logsBody'); body.appendChild(row); body.scrollTop = body.scrollHeight;
    $('#logCount').textContent = `${++logN} entr${logN === 1 ? 'y' : 'ies'}`;
  }
  function sample(n) {
    const d = DEFS[n.type];
    switch (d.cat) {
      case 'triggers': return 'Received payload { "from": "customer@acme.com", "subject": "Need a quote" }';
      case 'ai': return `${n.data.model || 'Model'} responded · 142 tokens`;
      case 'logic': return d.id === 'if' ? 'Condition is true → “True” branch' : d.id === 'switch' ? 'Matched “Case 1”' : 'Completed';
      case 'data': return 'Processed 3 items';
      case 'integrations': return `${d.name} · ${n.data.op || 'Send'} succeeded`;
      case 'api': return 'HTTP 200 OK · 184 ms';
      case 'knowledge': return `Found ${n.data.topk || 4} relevant passages`;
      case 'memory': return 'State saved';
      default: return n.data.message ? n.data.message : 'Done';
    }
  }
  async function runWorkflow() {
    if (state.running || !state.nodes.length) return;
    state.running = true; $('#btnRun').disabled = true;
    doneEdges.clear(); nodeStatus.clear(); state.nodes.forEach(refreshNode); renderEdges();
    $('#edges').classList.add('flow');
    $('#logsBody').innerHTML = ''; logN = 0; logs.classList.add('open'); setTimeout(drawMinimap, 260);
    log('info', 'Workflow', `Run started · ${state.nodes.length} node${state.nodes.length > 1 ? 's' : ''}`);
    const t0 = performance.now();
    const incoming = new Set(state.edges.map(e => e.to));
    let roots = state.nodes.filter(n => DEFS[n.type].cat === 'triggers'), warnings = 0, cost = 0;
    if (!roots.length) {
      roots = state.nodes.filter(n => !incoming.has(n.id)); warnings++;
      log('warn', 'Workflow', 'No trigger node found, starting from the first unconnected node');
    }
    const seen = new Set(), queue = [...roots];
    while (queue.length) {
      const n = queue.shift(); if (seen.has(n.id)) continue; seen.add(n.id);
      const d = DEFS[n.type]; nodeStatus.set(n.id, 'running'); refreshNode(n);
      await sleep(420 + Math.random() * 380);
      cost += d.cat === 'ai' ? 5 : 1;
      if (needsSetup(n)) { warnings++; log('warn', n.data.name, `Setup incomplete (${setupHint(n)}), ran with sandbox defaults`); }
      if (d.id === 'stop') { nodeStatus.set(n.id, 'ok'); refreshNode(n); log('error', n.data.name, 'Run stopped by Stop & Error node'); break; }
      log('ok', n.data.name, sample(n));
      nodeStatus.set(n.id, 'ok'); refreshNode(n);
      const only = (d.id === 'if' || d.id === 'switch') ? 0 : null;
      state.edges.filter(e => e.from === n.id && (only === null || e.port === only)).forEach(e => { doneEdges.add(e.id); queue.push(byId(e.to)); });
      renderEdges();
    }
    const skipped = state.nodes.filter(n => !seen.has(n.id));
    skipped.forEach(n => {
      nodeStatus.set(n.id, 'skipped'); refreshNode(n);
      if (state.edges.some(e => e.to === n.id && seen.has(e.from))) log('info', n.data.name, 'Skipped: this branch was not taken');
      else { warnings++; log('warn', n.data.name, 'Skipped: not reachable from a trigger'); }
    });
    state.credits = Math.max(0, state.credits - cost); $('#credits').textContent = state.credits.toLocaleString();
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    log('info', 'Workflow', `Run finished in ${secs}s · ${seen.size} node${seen.size === 1 ? '' : 's'} · ${cost} credits${warnings ? ` · ${warnings} warning${warnings > 1 ? 's' : ''}` : ''}`);
    state.runs.unshift({ at: clock(), nodes: seen.size, credits: cost, warnings });
    $('#edges').classList.remove('flow'); state.running = false; $('#btnRun').disabled = false; persist(); if (window.AB) window.AB.ran = true; emitChange();
  }

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', e => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); $('#btnSave').click(); return; }
    if (inField) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel) {
      e.preventDefault(); state.sel.type === 'node' ? removeNode(state.sel.id) : removeEdge(state.sel.id);
    } else if (e.key === 'Escape') { select(null); $('#historyPop').hidden = true; }
  });
  document.addEventListener('click', e => { if (!e.target.closest('#historyPop, #tbHistory')) $('#historyPop').hidden = true; });
  $('#toolSearch').addEventListener('input', renderTools);

  /* ---------- init ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ico(el.dataset.icon, +el.dataset.size || 18); });
  try {
    const saved = document.body.dataset.fresh ? null : JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && Array.isArray(saved.nodes) && saved.nodes.every(n => DEFS[n.type])) {
      state.nodes = saved.nodes; state.edges = saved.edges || []; state.credits = saved.credits ?? state.credits; uid = saved.uid || uid;
      $('#credits').textContent = state.credits.toLocaleString();
    }
  } catch (err) { /* start blank */ }
  hist = [snap()]; hi = 0;
  renderTools(); renderAll(); applyView();
  if (state.nodes.length) fitView();

  // small public API so other demos (templates, AI, guided...) can drive the canvas
  window.AB = {
    listeners: [], ran: false, state, DEFS, needsSetup, setupHint, select, fit: fitView, byId, nid, eid,
    focus(id) {
      const n = byId(id); if (!n) return;
      const r = canvas.getBoundingClientRect();
      view.x = r.width / 2 - (n.x + W / 2) * view.k; view.y = r.height / 2 - (n.y + 32) * view.k; applyView();
    },
    load(nodes, edges, opts = {}) {
      state.nodes = nodes; state.edges = edges; doneEdges.clear(); nodeStatus.clear(); this.ran = false;
      if (!(state.sel && state.sel.type === 'node' && byId(state.sel.id))) state.sel = null;
      renderAll(); renderPanel(true);
      if (opts.fit !== false) fitView();
      if (opts.silent) emitChange(); else commit();
    }
  };
})();
