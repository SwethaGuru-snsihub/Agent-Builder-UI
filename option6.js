/* Option 6 · Contextual Canvas
   No tool library. A + button after each step opens a menu of suggested next steps; the new node is placed and connected automatically. */
(function () {
  const AB = window.AB, DEFS = AB.DEFS, W = 230, STEP = W + 90;
  const $ = s => document.querySelector(s);
  const canvas = $('#canvas'), world = $('#world'), ctx = $('#ctx');
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* what to suggest after each kind of step */
  const SUGG = {
    trigger: ['summarizer', 'classifier', 'gmail', 'slack', 'http', 'if'],
    ai: ['slack', 'gmail', 'gsheets', 'if', 'notion', 'classifier'],
    integrations: ['if', 'gsheets', 'slack', 'wait', 'logger'],
    if: ['slack', 'gmail', 'summarizer', 'gsheets'],
    other: ['slack', 'gmail', 'summarizer', 'if', 'gsheets', 'http']
  };
  const kindOf = n => { const d = DEFS[n.type]; return d.id === 'if' ? 'if' : d.cat === 'triggers' ? 'trigger' : d.cat === 'ai' ? 'ai' : d.cat === 'integrations' ? 'integrations' : 'other'; };

  /* ---------- geometry (mirrors app.js) ---------- */
  const H = n => { const o = DEFS[n.type].outputs.length; return o > 1 ? 28 + o * 26 : 64; };
  const outY = (n, i) => { const o = DEFS[n.type].outputs.length; return o > 1 ? (H(n) / (o + 1)) * (i + 1) : H(n) / 2; };
  const view = () => { const m = /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/.exec(world.style.transform || ''); return m ? { x: +m[1], y: +m[2], k: +m[3] } : { x: 0, y: 0, k: 1 }; };
  const st = () => AB.state;

  function tile(d) {
    if (d.abbr) return `<span class="tl" style="background:${d.color}">${d.abbr}</span>`;
    const c = CATMAP[d.cat]; return `<span class="tl" style="background:${c.color}">${ico(c.icon, 14)}</span>`;
  }

  /* ---------- + buttons ---------- */
  const layer = document.createElement('div'); layer.className = 'plus-layer'; world.appendChild(layer);
  layer.addEventListener('pointerdown', e => e.stopPropagation());
  let menu = null, used = false, lastSig = '';

  function plusHtml(cls, x, y, data, tip, tag) {
    return `<button class="plus ${cls}" style="left:${x - (cls.includes('mid') ? 9 : 12)}px;top:${y - (cls.includes('mid') ? 9 : 12)}px" ${data}>${ico('plus', cls.includes('mid') ? 11 : 14, 2.8)}<span class="tip">${tip}</span>${tag ? `<span class="tag">${tag}</span>` : ''}</button>`;
  }
  function renderPlus() {
    const { nodes, edges } = st();
    let h = '', first = true;
    for (const n of nodes) {
      const d = DEFS[n.type];
      d.outputs.forEach((label, i) => {
        if (edges.some(e => e.from === n.id && e.port === i)) return;
        const open = menu && menu.a.type === 'port' && menu.a.id === n.id && menu.a.port === i;
        const hint = !used && nodes.length === 1 && first;
        h += plusHtml(`${open ? 'open' : ''} ${hint ? 'hint' : ''}`, n.x + W + 32, n.y + outY(n, i), `data-n="${n.id}" data-p="${i}"`, 'Add next step', d.outputs.length > 1 ? '' : '');
        first = false;
      });
    }
    for (const e of edges) {
      const a = nodes.find(n => n.id === e.from), b = nodes.find(n => n.id === e.to); if (!a || !b) continue;
      const open = menu && menu.a.type === 'edge' && menu.a.id === e.id;
      h += plusHtml(`mid ${open ? 'open' : ''}`, (a.x + W + b.x) / 2, (a.y + outY(a, e.port) + b.y + H(b) / 2) / 2, `data-e="${e.id}"`, 'Insert a step here');
    }
    layer.innerHTML = h;
    $('#start').classList.toggle('gone', nodes.length > 0);
    $('#coach').hidden = !(nodes.length === 1 && !used && !menu);
  }

  /* ---------- the contextual menu ---------- */
  const rows = (ids) => ids.filter(id => DEFS[id]).map(id => { const d = DEFS[id]; return `<button class="cx-row" data-add="${id}">${tile(d)}<span class="tx"><b style="font-weight:500">${esc(d.name)}</b><span>${esc(d.desc)}</span></span></button>`; }).join('');
  function reaches(from, to) { // is `to` downstream of `from`?
    const seen = new Set([from]), q = [from];
    while (q.length) { const c = q.shift(); if (c === to) return true; st().edges.filter(e => e.from === c).forEach(e => { if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); } }); }
    return false;
  }
  function srcNode() { return menu.a.type === 'port' ? AB.byId(menu.a.id) : menu.a.type === 'edge' ? AB.byId(st().edges.find(e => e.id === menu.a.id)?.from) : null; }

  function renderMenu() {
    if (!menu) { ctx.hidden = true; return; }
    const src = srcNode(), isStart = menu.a.type === 'start', insert = menu.a.type === 'edge';
    const need = d => insert ? d.outputs.length > 0 : true;
    let h = '';
    if (!isStart) h += `<div class="cx-tabs"><button data-tab="new" class="${menu.tab === 'new' ? 'on' : ''}">Add new</button><button data-tab="existing" class="${menu.tab === 'existing' ? 'on' : ''}" ${insert ? 'disabled title="Not available when inserting"' : ''}>Add existing</button></div>`;
    if (isStart) {
      h += `<div class="cx-h">How should it start?</div><div class="cx-body">${rows(['manual', 'webhook', 'schedule'])}</div>`;
    } else if (menu.tab === 'existing') {
      const ok = st().nodes.filter(n => n.id !== src.id && DEFS[n.type].inputs && !reaches(n.id, src.id) && !st().edges.some(e => e.from === src.id && e.port === menu.a.port && e.to === n.id));
      h += `<div class="cx-body">${ok.length ? `<div class="cx-note">Connect to a step that is already on the canvas.</div>` + ok.map(n => `<button class="cx-row" data-ex="${n.id}">${tile(DEFS[n.type])}<span class="tx"><b style="font-weight:500">${esc(n.data.name)}</b><span>${esc(DEFS[n.type].desc)}</span></span></button>`).join('') : '<div class="cx-none">No other steps to connect to yet.</div>'}</div>`;
    } else {
      const q = menu.q.trim().toLowerCase();
      h += `<label class="cx-search">${ico('search', 15)}<input id="cxQ" type="text" placeholder="Search steps…" value="${esc(menu.q)}" autocomplete="off"></label><div class="cx-body">`;
      if (q) {
        const hit = NODE_DEFS.filter(d => d.cat !== 'triggers' && need(d) && (d.name + ' ' + d.desc).toLowerCase().includes(q)).slice(0, 30);
        h += hit.length ? rows(hit.map(d => d.id)) : `<div class="cx-none">No step matches "${esc(menu.q)}".</div>`;
      } else if (menu.sub) {
        const c = CATMAP[menu.sub];
        h += `<button class="cx-back" data-back>${ico('chevron', 14)}${c.name}</button>` + rows(NODE_DEFS.filter(d => d.cat === menu.sub && need(d)).map(d => d.id));
      } else {
        const sg = (SUGG[kindOf(src)] || SUGG.other).filter(id => need(DEFS[id]));
        h += `<div class="cx-h">Suggested next steps</div>${rows(sg)}<div class="cx-h">All steps</div>`;
        h += CATS.filter(c => c.id !== 'triggers').map(c => `<button class="cx-row" data-cat="${c.id}"><span class="tl" style="background:${c.color}">${ico(c.icon, 14)}</span><span class="tx">${c.name}</span><span class="ct">${NODE_DEFS.filter(d => d.cat === c.id && need(d)).length}</span><span class="ch">${ico('chevron', 14)}</span></button>`).join('');
      }
      h += '</div>';
    }
    ctx.innerHTML = h; ctx.hidden = false; place();
    const qi = $('#cxQ'); if (qi && menu.focusQ) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }
  }
  function place() {
    if (!menu) return;
    const btn = menu.btn && document.body.contains(menu.btn) ? menu.btn : layer.querySelector('.open');
    const cr = canvas.getBoundingClientRect();
    let ax, ay;
    if (btn) { const r = btn.getBoundingClientRect(); ax = r.right - cr.left + 10; ay = r.top - cr.top - 16; }
    else { const r = $('#startBtn').getBoundingClientRect(); ax = r.right - cr.left + 14; ay = r.top - cr.top - 20; }
    const w = 272, hgt = Math.min(ctx.offsetHeight || 380, 420);
    if (ax + w > cr.width - 12) ax = Math.max(12, (btn ? btn.getBoundingClientRect().left - cr.left : ax) - w - 14);
    ay = Math.max(10, Math.min(ay, cr.height - hgt - 70));
    ctx.style.left = ax + 'px'; ctx.style.top = ay + 'px';
  }
  function open(a, btn) {
    menu = { a, tab: 'new', q: '', sub: null, btn, focusQ: true };
    used = true; renderPlus(); renderMenu();
  }
  function close() { if (!menu) return; menu = null; renderMenu(); renderPlus(); }

  /* ---------- adding / connecting ---------- */
  function overlaps(nodes, x, y, h) { return nodes.some(o => x < o.x + W + 20 && x + W + 20 > o.x && y < o.y + H(o) + 16 && y + h + 16 > o.y); }
  function ensureVisible(n) {
    const v = view(), cr = canvas.getBoundingClientRect(), pw = 340;
    const sx = n.x * v.k + v.x, sy = n.y * v.k + v.y, ex = (n.x + W) * v.k + v.x;
    if (sx < 40 || ex > cr.width - pw - 90 || sy < 40 || sy > cr.height - 120) AB.focus(n.id);
  }
  function addNode(type) {
    const nodes = st().nodes.slice(), edges = st().edges.slice(), d = DEFS[type], a = menu.a;
    const node = { id: AB.nid(), type, x: 0, y: 0, data: defaultsFor(d, nodes.map(n => n.data.name)) };
    const h = H(node);
    if (a.type === 'start') {
      const v = view(), cr = canvas.getBoundingClientRect();
      node.x = Math.round((cr.width / 2 - v.x) / v.k - W / 2 - 160); node.y = Math.round((cr.height / 2 - v.y) / v.k - 32 - 20);
    } else if (a.type === 'port') {
      const s = AB.byId(a.id);
      node.x = s.x + STEP; node.y = Math.round(s.y + outY(s, a.port) - h / 2);
      while (overlaps(nodes, node.x, node.y, h)) node.y += 100;
      edges.push({ id: AB.eid(), from: s.id, port: a.port, to: node.id });
    } else { // insert on an edge
      const e = edges.find(x => x.id === a.id), s = AB.byId(e.from), t = AB.byId(e.to);
      const down = new Set([t.id]), q = [t.id];
      while (q.length) { const c = q.shift(); edges.filter(x => x.from === c).forEach(x => { if (!down.has(x.to)) { down.add(x.to); q.push(x.to); } }); }
      nodes.forEach(n => { if (down.has(n.id) && n.id !== s.id) n.x += STEP; });
      node.x = t.x - STEP; node.y = t.y + Math.round((H(t) - h) / 2);
      edges.splice(edges.indexOf(e), 1);
      edges.push({ id: AB.eid(), from: s.id, port: e.port, to: node.id }, { id: AB.eid(), from: node.id, port: 0, to: t.id });
    }
    nodes.push(node);
    menu = null; ctx.hidden = true;
    AB.load(nodes, edges, { fit: false });
    renderPlus();
    ensureVisible(node);
    AB.select({ type: 'node', id: node.id });
  }
  function connectExisting(id) {
    const a = menu.a, edges = st().edges.slice();
    edges.push({ id: AB.eid(), from: a.id, port: a.port, to: id });
    menu = null; ctx.hidden = true;
    AB.load(st().nodes.slice(), edges, { fit: false }); renderPlus();
  }

  /* ---------- events ---------- */
  layer.addEventListener('click', e => {
    const b = e.target.closest('.plus'); if (!b) return;
    if (menu && menu.btn === b) return close();
    if (b.dataset.e) open({ type: 'edge', id: b.dataset.e }, b);
    else open({ type: 'port', id: b.dataset.n, port: +b.dataset.p }, b);
  });
  $('#startBtn').addEventListener('click', () => { if (menu) return close(); open({ type: 'start' }, $('#startBtn')); });
  ctx.addEventListener('pointerdown', e => e.stopPropagation());
  ctx.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.add) addNode(t.dataset.add);
    else if (t.dataset.ex) connectExisting(t.dataset.ex);
    else if (t.dataset.tab) { menu.tab = t.dataset.tab; menu.focusQ = menu.tab === 'new'; renderMenu(); }
    else if (t.dataset.cat) { menu.sub = t.dataset.cat; menu.focusQ = false; renderMenu(); }
    else if ('back' in t.dataset) { menu.sub = null; renderMenu(); }
  });
  ctx.addEventListener('input', e => { if (e.target.id === 'cxQ') { menu.q = e.target.value; menu.focusQ = true; renderMenu(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  canvas.addEventListener('pointerdown', e => { if (menu && !ctx.contains(e.target) && !e.target.closest('.plus') && !e.target.closest('#startBtn')) close(); });
  canvas.addEventListener('wheel', () => close(), { passive: true });

  // the settings panel shows only for a selected node; closing it deselects
  const cv = $('#configView'), panel = $('#panel');
  if (!document.body.dataset.hybrid) new MutationObserver(() => { if (cv.hidden) panel.classList.add('closed'); }).observe(cv, { attributes: true, attributeFilter: ['hidden'] });

  // nodes can be dragged or deleted by the engine; re-draw the + buttons whenever geometry or view changes
  function sig() { const { nodes, edges } = st(); return nodes.map(n => n.id + n.x + ',' + n.y).join('|') + '#' + edges.map(e => e.id + e.port + e.to).join('|') + '#' + world.style.transform; }
  setInterval(() => { const s = sig(); if (s !== lastSig) { const viewChanged = lastSig.split('#')[2] !== s.split('#')[2]; lastSig = s; if (viewChanged && menu) close(); else renderPlus(); } }, 90);
  AB.listeners.push(() => { renderPlus(); });
  renderPlus();
})();
