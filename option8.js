/* Option 8 · Interactive Onboarding Canvas
   A skippable welcome, then a 6-step spotlight tour. Interactive steps wait for the user to really do the action. */
(function () {
  const AB = window.AB, DEFS = AB.DEFS;
  const $ = s => document.querySelector(s);
  const KEY = 'ab.opt8.never';
  const never = { get: () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }, set: v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* ignore */ } } };
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
  const N = () => AB.state.nodes, E = () => AB.state.edges;

  /* ---------- helpers that act on the canvas ---------- */
  function mk(type, x, y, over) {
    const d = DEFS[type];
    return { id: AB.nid(), type, x, y, data: Object.assign(defaultsFor(d, N().map(n => n.data.name)), over || {}) };
  }
  function addSecondNode() {
    const last = N()[N().length - 1];
    const n = mk('summarizer', last ? last.x + 300 : 120, last ? last.y : 120);
    AB.load([...N(), n], E().slice(), { fit: false }); AB.fit();
  }
  function connectFirstTwo() {
    const a = N()[0], b = N()[1]; if (!a || !b) return;
    AB.load(N().slice(), [...E(), { id: AB.eid(), from: a.id, port: 0, to: b.id }], { fit: false });
  }
  let sampleLoaded = false;
  function loadSample() {
    const a = mk('manual', 0, 0), b = mk('summarizer', 300, 0, { prompt: 'Summarize the incoming request in 3 short bullet points.' }), c = mk('slack', 600, 0, { conn: 'SNS Demo Account', target: '#team' });
    AB.load([a, b, c], [{ id: AB.eid(), from: a.id, port: 0, to: b.id }, { id: AB.eid(), from: b.id, port: 0, to: c.id }], { fit: true });
    sampleLoaded = true;
  }
  function openTriggers() {
    $('#panel').classList.remove('closed');
    const cat = [...document.querySelectorAll('#cats .cat')].find(c => c.querySelector('.cat-name').textContent === 'Triggers');
    if (cat && !cat.classList.contains('open')) cat.querySelector('.cat-head').click();
  }

  /* ---------- steps ---------- */
  const IL = {
    1: '<div class="rows"><s class="hl"></s><s></s><s></s><s></s></div><div class="chip a" style="right:22px;top:24px"><i></i>Trigger</div>',
    2: '<div class="chip a" style="left:26px;top:30px"><i></i>Trigger</div><div class="chip" style="left:120px;top:70px"><i></i>Summarize</div><div class="hand" style="left:206px;top:38px"></div>',
    3: '<div class="rows"><s class="hl"></s><s></s><s></s></div><div class="chip a drop"><i></i>Trigger</div>',
    4: '<div class="chip a" style="left:22px;top:46px"><i></i>Trigger</div><div class="chip" style="right:22px;top:46px"><i></i>Summarize</div><svg class="ln" viewBox="0 0 300 128" preserveAspectRatio="none"><path d="M100 66 C140 66 160 66 196 66"/></svg><div class="hand"></div>',
    5: '<div class="chip" style="left:24px;top:48px;border-color:#2f6bff"><i></i>Summarize</div><div class="panelm"><s class="t"></s><s></s><s class="t"></s><s></s></div>',
    6: '<div class="chip a" style="left:12px;top:50px"><i></i>Trigger</div><div class="chip" style="left:106px;top:50px"><i></i>Summarize</div><div class="chip c" style="left:208px;top:50px"><i></i>Slack</div>'
  };
  const nodeEl = n => n && document.querySelector(`#nodes .node[data-id="${n.id}"]`);
  const STEPS = [
    { t: 'Meet the node library', x: 'Every building block lives here. Triggers start a workflow, AI and app nodes do the work, and logic nodes make decisions.', target: () => $('#panel'), il: 1 },
    { t: 'This is your canvas', x: 'Build your workflow here. Drag the background to move around and scroll to zoom. The map in the corner shows where you are.', target: () => $('#canvas'), il: 2 },
    { t: 'Add your first node', x: 'Click Manual Trigger in the library, or drag it onto the canvas. Every workflow starts with a trigger.', il: 3,
      enter: openTriggers,
      target: () => [...document.querySelectorAll('#cats .tool')].find(t => t.querySelector('.tool-name').textContent === 'Manual Trigger') || $('#panel'),
      task: 'Add a node to the canvas', need: () => N().length >= 1 },
    { t: 'Connect your nodes', x: 'Drag from the dot on the right edge of a node to the dot on the left edge of the next one. Data flows along that line.', il: 4,
      target: () => { const a = N().find(n => !E().some(e => e.from === n.id)) || N()[0]; const el = N().length > 1 && nodeEl(a); return (el && el.querySelector('.port.out')) || $('#canvas'); },
      task: 'Connect two nodes', need: () => E().length >= 1,
      helper: () => N().length < 2 ? ['Add a second node', addSecondNode] : ['Connect them for me', connectFirstTwo] },
    { t: 'Open a node to set it up', x: 'Click any node to see its settings. A node with an orange warning still needs something filled in.', il: 5,
      enter: () => AB.select(null), target: () => nodeEl(N()[0]) || $('#canvas'),
      task: 'Click a node', need: () => !!(AB.state.sel && AB.state.sel.type === 'node') },
    { t: 'Run a sample workflow', x: 'Load a ready-made sample, then press Run. Each node lights up in turn and the logs show what happened.', il: 6,
      target: () => $('#btnRun'), task: 'Run a workflow', need: () => AB.ran,
      helper: () => sampleLoaded ? ['Run it now', () => { const b = $('#btnRun'); if (!b.disabled) b.click(); }] : ['Load the sample workflow', loadSample] }
  ];

  /* ---------- tour engine ---------- */
  let cur = -1, active = false, lastEnter = -1;
  const tour = $('#tour'), spot = $('#spot'), card = $('#tcard');

  function place() {
    const s = STEPS[cur], el = s.target && s.target();
    const vw = innerWidth, vh = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, G = 16;
    let cx, cy;
    if (el) {
      const r = el.getBoundingClientRect(), pad = el.matches('#canvas,#panel') ? 0 : 6;
      spot.classList.remove('off');
      spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
      if (r.width > vw * .55) { cx = r.left + 28; cy = r.top + 28; if (cy + ch > vh - 10) cy = vh - ch - 10; }
      else if (r.right + G + cw <= vw - 10) { cx = r.right + G; cy = r.top; }
      else if (r.left - G - cw >= 10) { cx = r.left - G - cw; cy = r.top; }
      else if (r.bottom + G + ch <= vh - 10) { cx = r.left; cy = r.bottom + G; }
      else { cx = r.left; cy = Math.max(10, r.top - G - ch); }
    } else { spot.classList.add('off'); cx = (vw - cw) / 2; cy = (vh - ch) / 2; }
    card.style.left = Math.max(10, Math.min(cx, vw - cw - 10)) + 'px';
    card.style.top = Math.max(10, Math.min(cy, vh - ch - 10)) + 'px';
  }

  function paint() {
    const s = STEPS[cur], done = s.need ? s.need() : true, last = cur === STEPS.length - 1;
    $('#tNum').textContent = `${cur + 1}/${STEPS.length}`;
    $('#ringFg').style.strokeDashoffset = 94.25 * (1 - (cur + (done ? 1 : 0)) / STEPS.length);
    $('#tTitle').textContent = s.t; $('#tText').textContent = s.x;
    const il = $('#tIl'); if (il.dataset.k != s.il) { il.dataset.k = s.il; il.className = 'il il-' + ['', 'lib', 'canvas', 'add', 'conn', 'cfg', 'run'][s.il]; il.innerHTML = IL[s.il]; }
    const doEl = $('#tDo'); let h = '';
    if (s.task) h += `<div class="task ${done ? 'done' : ''}"><i>${done ? ico('check', 11, 3.2) : ''}</i>${done ? 'Done. ' : ''}${s.task}</div>`;
    const hp = !done && s.helper ? s.helper() : null;
    if (hp) h += `<button class="help" id="tHelp">${hp[0]}</button>`;
    if (doEl.dataset.h !== h) { doEl.dataset.h = h; doEl.innerHTML = h; const hb = $('#tHelp'); if (hb) hb.onclick = () => { hp[1](); setTimeout(update, 120); }; }
    $('#tBack').hidden = cur === 0;
    $('#tNext').disabled = !done; $('#tNext').textContent = last ? 'Finish' : 'Next';
  }
  function update() { if (!active) return; paint(); place(); }

  function go(i) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[cur];
    if (lastEnter !== cur && s.enter) s.enter();
    lastEnter = cur;
    $('#tDo').dataset.h = ''; update();
  }
  function start() {
    $('#welcome').hidden = true; tour.hidden = false; active = true; lastEnter = -1;
    $('#btnTour').classList.remove('pulse'); $('#panel').classList.remove('closed');
    go(0);
  }
  function end(finished) {
    active = false; tour.hidden = true;
    if (finished) toast('Tour complete. You can replay it any time from the Tour button.');
    else toast('Tour closed. Restart it any time from the Tour button.');
  }

  $('#tNext').addEventListener('click', () => { if (cur === STEPS.length - 1) end(true); else go(cur + 1); });
  $('#tBack').addEventListener('click', () => go(cur - 1));
  $('#tEnd').addEventListener('click', () => end(false));
  $('#wStart').addEventListener('click', () => { if ($('#wNever').checked) never.set(true); start(); });
  $('#wSkip').addEventListener('click', () => { if ($('#wNever').checked) never.set(true); $('#welcome').hidden = true; $('#btnTour').classList.add('pulse'); });
  $('#btnTour').addEventListener('click', () => { never.set(false); if (active) return; start(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && active) end(false); });
  addEventListener('resize', update);
  setInterval(update, 200);

  if (!never.get()) $('#welcome').hidden = false;
})();
