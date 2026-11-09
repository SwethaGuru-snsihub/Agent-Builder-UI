/* Option 2 · Template-First
   Step 1: gallery  ->  Step 2: preview  ->  Step 3: customize on the canvas */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEFS = AB.DEFS;
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));
  const colorOf = type => DEFS[type].color || CATMAP[DEFS[type].cat].color;

  let query = '', activeCat = 'All';
  let tpl = null;            // template currently loaded on the canvas
  let setupIds = [];         // node ids that needed setup when the template loaded
  let dismissed = false;

  /* ---------- helpers ---------- */
  function appsOf(t) {
    const seen = new Map();
    t.nodes.forEach(n => { const d = DEFS[n.type]; if (d.cat === 'integrations') seen.set(d.id, d); });
    return [...seen.values()];
  }
  const hasAI = t => t.nodes.some(n => DEFS[n.type].cat === 'ai');

  function stepper(active) {
    const names = ['Choose a template', 'Preview', 'Customize on canvas'];
    return `<div class="stepper">${names.map((n, i) => {
      const cls = i + 1 === active ? 'on' : i + 1 < active ? 'done' : '';
      return `${i ? '<span class="step-line"></span>' : ''}<span class="step ${cls}"><i>${i + 1 < active ? '✓' : i + 1}</i>${n}</span>`;
    }).join('')}</div>`;
  }

  // Draw the workflow shape as an SVG (small for cards, large for the preview)
  function diagram(t, big) {
    const cw = big ? 196 : 46, ch = big ? 68 : 26, w = big ? 158 : 32, h = big ? 42 : 16;
    const maxC = Math.max(...t.nodes.map(n => n.c)), maxR = Math.max(...t.nodes.map(n => n.r));
    const Wd = maxC * cw + w + 4, Hd = maxR * ch + h + 4;
    const pos = k => { const n = t.nodes.find(x => x.k === k); return { x: n.c * cw + 2, y: n.r * ch + 2 }; };
    let s = `<svg viewBox="0 0 ${Wd} ${Hd}" ${big ? `width="${Wd}"` : ''} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
    for (const [a, , b] of t.edges) {
      const A = pos(a), B = pos(b), x1 = A.x + w, y1 = A.y + h / 2, x2 = B.x, y2 = B.y + h / 2, dx = (x2 - x1) / 2;
      s += `<path d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" fill="none" stroke="#a1a1aa" stroke-width="${big ? 2 : 1.4}"/>`;
    }
    for (const n of t.nodes) {
      const p = pos(n.k), col = colorOf(n.type), d = DEFS[n.type];
      if (big) {
        const nm = n.name.length > 19 ? n.name.slice(0, 18) + '…' : n.name;
        s += `<rect x="${p.x}" y="${p.y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="#e0e0e6" stroke-width="1.4"/>`;
        s += `<rect x="${p.x + 8}" y="${p.y + 9}" width="24" height="24" rx="7" fill="${col}"/>`;
        s += `<text x="${p.x + 40}" y="${p.y + 19}" font-size="11" font-weight="600" fill="#111113" font-family="Poppins,system-ui,sans-serif">${esc(nm)}</text>`;
        s += `<text x="${p.x + 40}" y="${p.y + 33}" font-size="9.5" fill="#8b8b94" font-family="Poppins,system-ui,sans-serif">${esc(d.name)}</text>`;
      } else {
        s += `<rect x="${p.x}" y="${p.y}" width="${w}" height="${h}" rx="4" fill="${col}"/>`;
      }
    }
    return s + '</svg>';
  }

  /* ---------- Step 1: gallery ---------- */
  function openGallery() {
    $('#gallery').hidden = false; query = ''; activeCat = 'All'; renderGallery(); setTimeout(() => $('#gSearch') && $('#gSearch').focus(), 50);
  }
  function closeGallery() { $('#gallery').hidden = true; }

  function matches(t) {
    const q = query.trim().toLowerCase();
    if (activeCat !== 'All' && t.cat !== activeCat) return false;
    if (!q) return true;
    return (t.name + ' ' + t.desc + ' ' + t.cat + ' ' + appsOf(t).map(a => a.name).join(' ')).toLowerCase().includes(q);
  }

  function card(t) {
    const apps = appsOf(t);
    const dots = apps.slice(0, 4).map(a => `<span class="app-dot" style="background:${a.color}" title="${esc(a.name)}">${a.abbr}</span>`).join('');
    const note = apps.length > 4 ? `+${apps.length - 4}` : (!apps.length ? 'No accounts needed' : '');
    return `<button class="tcard" data-id="${t.id}">
      <div class="tprev">${diagram(t, false)}</div>
      <div class="tbody">
        <div class="trow"><b>${esc(t.name)}</b>${t.featured ? '<span class="pop">Popular</span>' : ''}</div>
        <p>${esc(t.desc)}</p>
        <div class="tmeta"><span>${t.nodes.length} steps</span><span>${t.level}</span><span>~${t.time}</span></div>
        <div class="apps">${dots}${hasAI(t) ? '<span class="app-dot" style="background:#7c3aed" title="AI">AI</span>' : ''}<span class="apps-note">${note}</span></div>
      </div></button>`;
  }

  function renderGallery() {
    const g = $('#gallery');
    const counts = Object.fromEntries(TPL_CATS.map(c => [c, c === 'All' ? TEMPLATES.length : TEMPLATES.filter(t => t.cat === c).length]));
    const list = TEMPLATES.filter(matches);
    const popular = !query && activeCat === 'All' ? list.filter(t => t.featured) : [];
    const rest = popular.length ? list.filter(t => !t.featured) : list;
    const blank = `<button class="tcard blank" id="gBlank"><div class="plus">${ico('plus', 22)}</div><b>Start from scratch</b><span>Open an empty canvas and build every step yourself.</span></button>`;
    let body = '';
    if (popular.length) body += `<div class="gal-sub">Popular templates</div><div class="tgrid">${popular.map(card).join('')}</div><div class="gal-sub" style="margin-top:28px">All templates</div>`;
    body += `<div class="tgrid">${rest.map(card).join('')}${list.length ? '' : `<div class="no-match"><b>No template matches “${esc(query)}”</b><p>This is the limit of template-first: if your idea isn’t in the library you have to adapt something close, or start from scratch.</p><button class="btn btn-dark" id="gBlank2">Start from scratch</button></div>`}${blank}</div>`;
    const keepSearch = g.querySelector('#gSearch') ? g.querySelector('#gSearch').value : '';
    g.innerHTML = `
      <div class="gal-head">
        <div>
          ${stepper(1)}
          <h1>What do you want to automate?</h1>
          <p>Pick a ready-made workflow. You can change every step afterwards.</p>
        </div>
        <button class="icon-btn" id="gClose" title="Close gallery">${ico('x', 20)}</button>
      </div>
      <div class="gal-tools">
        <label class="gal-search">${ico('search', 16)}<input id="gSearch" type="text" placeholder="Search templates, e.g. email, support, sales…" autocomplete="off" value="${esc(keepSearch || query)}"></label>
        <div class="chips">${TPL_CATS.map(c => `<button class="chip-btn${c === activeCat ? ' on' : ''}" data-cat="${c}">${c}<small>${counts[c]}</small></button>`).join('')}</div>
      </div>
      <div class="gal-body">${body}</div>`;
    const inp = $('#gSearch', g);
    inp.addEventListener('input', () => {
      query = inp.value; const pos = inp.selectionStart; renderGallery(); const n = $('#gSearch'); n.focus(); n.setSelectionRange(pos, pos);
    });
  }

  $('#gallery').addEventListener('click', e => {
    const c = e.target.closest('.tcard[data-id]'); if (c) return openPreview(TEMPLATES.find(t => t.id === c.dataset.id));
    const ch = e.target.closest('[data-cat]'); if (ch) { activeCat = ch.dataset.cat; return renderGallery(); }
    if (e.target.closest('#gBlank, #gBlank2')) { closeGallery(); return; }
    if (e.target.closest('#gClose')) closeGallery();
  });

  /* ---------- Step 2: preview ---------- */
  function openPreview(t) {
    const order = [...t.nodes].sort((a, b) => a.c - b.c || a.r - b.r);
    const apps = appsOf(t);
    const need = apps.map(a => `<span><i style="background:${a.color}">${a.abbr}</i>${esc(a.name)}</span>`).join('') + (hasAI(t) ? '<span><i style="background:#7c3aed">AI</i>AI model (included)</span>' : '');
    const replacing = AB.state.nodes.length ? '<div class="m-warn">This will replace what is currently on your canvas. You can undo with Ctrl+Z.</div>' : '';
    const wrap = document.createElement('div'); wrap.className = 'modal-back'; wrap.id = 'previewModal';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(t.name)}">
      <button class="icon-btn m-close" id="mClose" title="Close">${ico('x', 18)}</button>
      <div class="m-left">${stepper(2)}<div class="m-diagram">${diagram(t, true)}</div><div class="m-note">Preview of the workflow that will open on the canvas</div></div>
      <div class="m-right">
        <div class="eyebrow">${esc(t.cat)} · ${t.level} · about ${t.time}</div>
        <h2>${esc(t.name)}</h2>
        <p>${esc(t.desc)}</p>
        <h4>How it works</h4>
        <ol class="m-steps">${order.map(n => `<li><b>${esc(n.name)}</b> <small>· ${esc(DEFS[n.type].name)}</small></li>`).join('')}</ol>
        <h4>You’ll need to connect</h4>
        <div class="need">${need || '<span>Nothing, this one runs on its own</span>'}</div>
        ${replacing}
        <div class="m-actions"><button class="btn" id="mBack">Back to templates</button><button class="btn btn-dark" id="mUse">Use this template</button></div>
      </div></div>`;
    document.body.appendChild(wrap);
    $('#mUse', wrap).focus();
    wrap.addEventListener('click', e => {
      if (e.target === wrap || e.target.closest('#mClose, #mBack')) wrap.remove();
      else if (e.target.closest('#mUse')) { wrap.remove(); useTemplate(t); }
    });
  }

  /* ---------- Step 3: load on canvas + customize card ---------- */
  function useTemplate(t) {
    const idOf = {};
    const nodes = t.nodes.map(n => {
      const id = AB.nid(); idOf[n.k] = id;
      const data = Object.assign(defaultsFor(DEFS[n.type], []), n.data || {}); data.name = n.name;
      return { id, type: n.type, x: n.c * 300, y: n.r * 130, data };
    });
    const edges = t.edges.map(([a, p, b]) => ({ id: AB.eid(), from: idOf[a], port: p, to: idOf[b] }));
    AB.load(nodes, edges);
    tpl = t; dismissed = false;
    setupIds = nodes.filter(n => AB.needsSetup(n)).map(n => n.id);
    closeGallery(); $('#tplCard').classList.remove('min'); renderCard();
    const first = setupIds[0];
    if (first) AB.select({ type: 'node', id: first });
  }

  const fixText = n => {
    const d = DEFS[n.type];
    return d.cat === 'integrations' ? `Connect ${d.name}` : d.id === 'http' ? 'Add the API URL' : 'Write the prompt';
  };

  function renderCard() {
    const el = $('#tplCard');
    if (!tpl || dismissed) { el.hidden = true; return; }
    el.hidden = false;
    $('#tplName').textContent = tpl.name;
    const items = setupIds.map(id => { const n = AB.byId(id); return { id, n, done: !n || !AB.needsSetup(n) }; });
    const total = items.length + 1;
    const done = items.filter(i => i.done).length + (AB.ran ? 1 : 0);
    $('#tplBar').style.width = (done / total * 100) + '%';
    $('#tplCount').textContent = done === total ? 'All steps complete' : `${done} of ${total} steps done · click a step to jump to it`;
    let h = '';
    for (const i of items) {
      h += `<button class="tpl-item${i.done ? ' done' : ''}" data-id="${i.id}"><span class="box">${i.done ? ico('check', 12, 3) : ''}</span><span class="t">${esc(i.n ? i.n.data.name : 'Removed step')}</span><small>${i.n ? fixText(i.n) : ''}</small></button>`;
    }
    h += `<button class="tpl-item${AB.ran ? ' done' : ''}" data-run="1"><span class="box">${AB.ran ? ico('check', 12, 3) : ''}</span><span class="t">Run a test</span><small>Press Run Workflow</small></button>`;
    if (done === total) h += '<div class="tpl-ready">Ready to deploy. Use Deploy Live when you are happy with it.</div>';
    $('#tplList').innerHTML = h;
  }

  AB.listeners.push(renderCard);
  $('#tplList').addEventListener('click', e => {
    const b = e.target.closest('.tpl-item'); if (!b) return;
    if (b.dataset.run) return $('#btnRun').click();
    const n = AB.byId(b.dataset.id); if (!n) return;
    AB.focus(n.id); AB.select({ type: 'node', id: n.id });
  });
  $('#tplMin').innerHTML = ico('chevron', 14);
  $('#tplX').innerHTML = ico('x', 14);
  $('#tplMin').addEventListener('click', () => $('#tplCard').classList.toggle('min'));
  $('#tplX').addEventListener('click', () => { dismissed = true; renderCard(); });
  $('#tplReset').addEventListener('click', () => { if (tpl) useTemplate(tpl); });

  $('#btnTemplates').addEventListener('click', openGallery);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const m = $('#previewModal'); if (m) { m.remove(); return; }
    if (!$('#gallery').hidden) closeGallery();
  });

  // Template-first: the gallery is the first thing the user sees
  openGallery();
})();
