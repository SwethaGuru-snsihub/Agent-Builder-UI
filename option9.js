/* Combined experience: the recommendation from the UX document, assembled from the other demos.
   Entry screen (AI / template / guided / sample / scratch) -> editor with library, contextual + canvas,
   basic/advanced settings, AI assistant, validation and a publish review. Options 3, 5, 6 and 7 scripts run underneath. */
(function () {
  const AB = window.AB, DEFS = AB.DEFS;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const N = () => AB.state.nodes, E = () => AB.state.edges;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
  const landing = $('#landing');
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));
  const MODE_LABEL = { ai: 'Built with AI', template: 'From a template', guided: 'Guided creation', sample: 'Sample workflow', scratch: 'From scratch' };

  let mode = 'scratch', published = false, pubSig = '', tplName = '', guideOff = false;

  /* ---------- helpers ---------- */
  const mk = (type, x, y, over) => ({ id: AB.nid(), type, x, y, data: Object.assign(defaultsFor(DEFS[type], []), over || {}) });
  const structSig = () => JSON.stringify([N().map(n => [n.id, n.type, n.data]), E().map(e => [e.from, e.port, e.to])]);
  function closeEntry(m) { if (m) mode = m; landing.classList.add('out'); setTimeout(() => { landing.hidden = true; }, 320); }
  const tab = t => { const b = document.querySelector(`.rt[data-t="${t}"]`); if (b) b.click(); };
  const setName = n => { $('#wfName').value = n; };

  /* ---------- entry screen ---------- */
  // option3.js owns the prompt box, examples and "start from scratch". We only note which way the user went.
  $('#landSend').addEventListener('click', () => { mode = 'ai'; }, true);
  $('#landInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) mode = 'ai'; }, true);
  $('#landBlank').addEventListener('click', () => { mode = 'scratch'; }, true);
  $('#landX').addEventListener('click', () => { mode = 'scratch'; }, true);

  new MutationObserver(() => {
    if (landing.hidden) {
      published = false; guideOff = false; setStatus(); paintGuide(true);
      if (mode === 'ai') tab('ai'); else tab('cfg');
      if (mode === 'guided') setTimeout(() => { if (!N().length) $('#startBtn').click(); }, 450);
    } else { published = false; setStatus(); $('#guide').hidden = true; }
  }).observe(landing, { attributes: true, attributeFilter: ['hidden'] });

  $('#modeGuide').addEventListener('click', () => closeEntry('guided'));
  $('#modeSample').addEventListener('click', () => {
    const a = mk('manual', 0, 0, { name: 'Start manually' });
    const b = mk('summarizer', 300, 0, { name: 'Summarise the request', prompt: 'Summarize the incoming request in 3 short bullet points.' });
    const c = mk('slack', 600, 0, { name: 'Post to the team', conn: 'SNS Demo Account', target: '#team' });
    AB.load([a, b, c], [{ id: AB.eid(), from: a.id, port: 0, to: b.id }, { id: AB.eid(), from: b.id, port: 0, to: c.id }]);
    tplName = 'Sample: summarise and notify'; setName(tplName); closeEntry('sample');
    toast('A working sample. Click a node to explore it, then press Test.');
  });

  /* ---------- template gallery ---------- */
  function tplCards() {
    const q = $('#tplQ').value.trim().toLowerCase();
    const list = TEMPLATES.filter(t => !q || (t.name + ' ' + t.desc + ' ' + t.cat).toLowerCase().includes(q));
    $('#tplGrid').innerHTML = list.length ? list.map(t => {
      const types = [...new Set(t.nodes.map(n => n.type))].slice(0, 5).map(id => { const d = DEFS[id]; return `<i style="background:${d.color || CATMAP[d.cat].color}">${d.abbr || d.name.slice(0, 2)}</i>`; }).join('');
      return `<button class="tc" data-id="${t.id}"><b>${esc(t.name)}</b><p>${esc(t.desc)}</p><div class="meta"><span class="ab">${types}</span><span>${t.nodes.length} steps</span><span>${esc(t.level)}</span></div></button>`;
    }).join('') : '<p style="grid-column:1/-1;color:var(--mute);font-size:13px">No template matches that search.</p>';
  }
  const openTpl = () => { $('#tplModal').hidden = false; $('#tplQ').value = ''; tplCards(); setTimeout(() => $('#tplQ').focus(), 50); };
  const closeTpl = () => { $('#tplModal').hidden = true; };
  $('#modeTpl').addEventListener('click', openTpl);
  $('#tplX').addEventListener('click', closeTpl);
  $('#tplModal').addEventListener('pointerdown', e => { if (e.target.id === 'tplModal') closeTpl(); });
  $('#tplQ').addEventListener('input', tplCards);
  $('#tplGrid').addEventListener('click', e => {
    const c = e.target.closest('.tc[data-id]'); if (!c) return;
    const t = TEMPLATES.find(x => x.id === c.dataset.id), idOf = {};
    const nodes = t.nodes.map(n => { const id = AB.nid(); idOf[n.k] = id; const data = Object.assign(defaultsFor(DEFS[n.type], []), n.data || {}); data.name = n.name; return { id, type: n.type, x: n.c * 300, y: n.r * 130, data }; });
    const edges = t.edges.map(([a, p, b]) => ({ id: AB.eid(), from: idOf[a], port: p, to: idOf[b] }));
    AB.load(nodes, edges);
    tplName = t.name; setName(t.name); closeTpl(); closeEntry('template');
    const first = nodes.find(n => AB.needsSetup(n)); if (first) setTimeout(() => AB.select({ type: 'node', id: first.id }), 380);
  });

  /* ---------- path to publish (guide card) ---------- */
  const needing = () => N().filter(n => AB.needsSetup(n));
  const ITEMS = [
    { t: 'Add a trigger', s: () => 'Choose what starts the workflow', done: () => N().some(n => DEFS[n.type].cat === 'triggers'),
      act: () => { if (!N().length) $('#startBtn').click(); else { document.body.classList.remove('lib-off'); toast('Pick a trigger under "Start" in the library.'); } } },
    { t: 'Add and connect an action', s: () => 'Use the + after a step. It connects for you', done: () => E().length >= 1,
      act: () => { const p = document.querySelector('.plus:not(.mid)'); if (p) p.click(); else toast('Add a trigger first.'); } },
    { t: 'Finish setup', s: () => needing().length ? `${needing().length} step${needing().length > 1 ? 's' : ''} still need setup` : 'Fill in what each step needs', done: () => N().length >= 2 && needing().length === 0,
      act: () => { if (needing().length) $('#issueGo').click(); else toast('Nothing left to set up yet.'); } },
    { t: 'Test your workflow', s: () => 'Run it once with sample data', done: () => AB.ran,
      act: () => { const b = $('#btnRun'); if (b.disabled) toast('Add some steps first.'); else b.click(); } },
    { t: 'Publish', s: () => 'Review the checks and go live', done: () => published, act: () => openPub() }
  ];
  let gSig = '';
  function paintGuide(force) {
    const g = $('#guide');
    const show = !landing.hidden ? false : mode !== 'scratch' && !guideOff;
    g.hidden = !show; if (!show) return;
    const done = ITEMS.map(i => i.done()), n = done.filter(Boolean).length, next = done.indexOf(false);
    const sig = done.join() + next + needing().length + mode + tplName;
    if (sig === gSig && !force) return; gSig = sig;
    $('#gdMode').textContent = MODE_LABEL[mode];
    $('#gdTitle').textContent = tplName || 'Path to publish';
    $('#gdBar').style.width = (n / ITEMS.length * 100) + '%';
    $('#gdCount').textContent = `${n} of ${ITEMS.length} done`;
    $('#gdList').innerHTML = ITEMS.map((it, i) => `<button class="gd-item ${done[i] ? 'done' : ''} ${i === next ? 'next' : ''}" data-i="${i}"><span class="bx">${done[i] ? ico('check', 11, 3.2) : ''}</span><span><b>${it.t}</b>${done[i] ? '' : `<small>${esc(it.s())}</small>`}</span></button>`).join('');
  }
  $('#gdList').addEventListener('click', e => { const b = e.target.closest('.gd-item'); if (b) ITEMS[+b.dataset.i].act(); });
  $('#gdMin').addEventListener('click', () => $('#guide').classList.toggle('min'));
  $('#gdX').addEventListener('click', () => { guideOff = true; $('#guide').hidden = true; });

  /* ---------- publish review ---------- */
  function setStatus() { const s = $('#wfStatus'); s.textContent = published ? 'Published' : 'Draft'; s.classList.toggle('live', published); }
  function checks() {
    const nodes = N(), edges = E(), bad = needing();
    const trig = nodes.filter(n => DEFS[n.type].cat === 'triggers');
    const orphan = nodes.filter(n => DEFS[n.type].inputs && !edges.some(e => e.to === n.id));
    return [
      { ok: trig.length > 0, t: 'Starts with a trigger', s: 'Add a trigger so the workflow knows when to start.', fix: ['Add', () => { closePub(); ITEMS[0].act(); }] },
      { ok: nodes.length > 1 && orphan.length === 0, t: 'Every step is connected', s: nodes.length < 2 ? 'Add at least one action after the trigger.' : `${orphan.length} step${orphan.length > 1 ? 's have' : ' has'} no incoming connection.`, fix: ['Show', () => { closePub(); if (orphan[0]) { AB.focus(orphan[0].id); AB.select({ type: 'node', id: orphan[0].id }); } }] },
      { ok: nodes.length > 0 && bad.length === 0, t: 'All steps are set up', s: `${bad.length} step${bad.length === 1 ? '' : 's'} still need setup.`, fix: ['Fix', () => { closePub(); if (bad[0]) { AB.focus(bad[0].id); AB.select({ type: 'node', id: bad[0].id }); } }] },
      { ok: !!AB.ran, t: 'Preview run completed', s: 'Run a preview to see the result before you go live.', fix: ['Run', () => runPreview()] }
    ];
  }
  let pubTimer = null, pubChecksCache = [];
  function paintPub() {
    if (published && !$('#pubModal').hidden) return;
    pubChecksCache = checks();
    $('#pubChecks').innerHTML = pubChecksCache.map((c, i) => `<div class="pc ${c.ok ? 'ok' : 'bad'}"><span class="bx">${c.ok ? ico('check', 12, 3.2) : '!'}</span><div><b>${c.t}</b>${c.ok ? '' : `<span>${esc(c.s)}</span>`}</div>${c.ok ? '' : `<button class="mini fix" data-i="${i}">${c.fix[0]}</button>`}</div>`).join('');
    const all = pubChecksCache.every(c => c.ok);
    $('#pubGo').disabled = !all;
    $('#pubSub').textContent = all ? 'All checks passed. You can publish now.' : 'Fix the items below, or run a preview first.';
  }
  function runPreview() { const b = $('#btnRun'); if (b.disabled) return toast('Add some steps first.'); $('#pubSub').textContent = 'Running the preview…'; b.click(); }
  function openPub() {
    if (!landing.hidden) return;
    published = false; setStatus();
    $('#pubModal').hidden = false; $('#pubRun').hidden = false; $('#pubGo').hidden = false; $('#pubCancel').textContent = 'Not yet';
    paintPub(); clearInterval(pubTimer); pubTimer = setInterval(() => { if ($('#pubModal').hidden) clearInterval(pubTimer); else paintPub(); }, 500);
  }
  function closePub() { $('#pubModal').hidden = true; clearInterval(pubTimer); }
  $('#btnPublish').addEventListener('click', openPub);
  $('#pubX').addEventListener('click', closePub); $('#pubCancel').addEventListener('click', closePub);
  $('#pubModal').addEventListener('pointerdown', e => { if (e.target.id === 'pubModal') closePub(); });
  $('#pubRun').addEventListener('click', runPreview);
  $('#pubChecks').addEventListener('click', e => { const b = e.target.closest('.fix'); if (b) pubChecksCache[+b.dataset.i].fix[1](); });
  $('#pubGo').addEventListener('click', () => {
    published = true; pubSig = structSig(); setStatus(); clearInterval(pubTimer);
    $('#pubChecks').innerHTML = '<div class="live-ok"><b>Your workflow is live.</b><br>This is a demo, so nothing was really published. Edit it any time and it goes back to Draft until you publish again.</div>';
    $('#pubSub').textContent = 'Published'; $('#pubRun').hidden = true; $('#pubGo').hidden = true; $('#pubCancel').textContent = 'Close';
    paintGuide(true);
  });

  /* ---------- top navigation ---------- */
  const key = (k, shift) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: true, shiftKey: !!shift, bubbles: true }));
  $('#btnUndo').addEventListener('click', () => key('z'));
  $('#btnRedo').addEventListener('click', () => key('y'));
  $('#btnNew').addEventListener('click', () => { tplName = ''; setName('Untitled workflow'); $('#chatNew').click(); });
  $('#wfName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  /* ---------- library click auto-connects to the selected (or last) node ---------- */
  document.addEventListener('click', e => {
    if (!e.target.closest('#ess .li, #cats .tool')) return;
    const s = AB.state.sel, before = N().length;
    const anchor = (s && s.type === 'node' && AB.byId(s.id)) || N()[N().length - 1];
    if (!anchor) return;
    setTimeout(() => {
      if (N().length !== before + 1) return;
      const node = N()[N().length - 1], d = DEFS[node.type];
      if (!d.inputs) return;
      const outs = DEFS[anchor.type].outputs, port = outs.findIndex((_, i) => !E().some(x => x.from === anchor.id && x.port === i));
      if (port < 0) return;
      AB.load(N().slice(), [...E(), { id: AB.eid(), from: anchor.id, port, to: node.id }], { fit: false });
      toast('Connected automatically');
    }, 80);
  }, true);

  /* ---------- keep things in sync ---------- */
  function tick() {
    if (published && structSig() !== pubSig) { published = false; setStatus(); }
    paintGuide();
  }
  AB.listeners.push(tick); setInterval(tick, 400);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#tplModal').hidden) closeTpl(); else if (!$('#pubModal').hidden) closePub(); } });
})();
