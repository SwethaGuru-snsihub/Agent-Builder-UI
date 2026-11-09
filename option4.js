/* Option 4 · Guided Step-by-Step
   A 6-step wizard drives the shared canvas engine (window.AB). The full canvas stays locked
   until the user has picked a trigger and an action. */
(function () {
  const AB = window.AB, DEFS = AB.DEFS;
  const $ = s => document.querySelector(s);
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };

  const STEPS = ['Trigger', 'Action', 'Configure', 'Conditions', 'Test', 'Publish'];

  const TRIGGERS = [
    { id: 'manual', title: 'Run manually', sub: 'Start it yourself with one click. Good for testing.' },
    { id: 'webhook', title: 'Web request', sub: 'Starts when another app or a form calls a URL.' },
    { id: 'schedule', title: 'On a schedule', sub: 'Runs by itself, for example every hour or every day.' }
  ];
  const ACTION_GROUPS = [
    { name: 'AI steps', ids: ['summarizer', 'classifier', 'sentiment', 'extractor', 'translator', 'text-gen'] },
    { name: 'Send and save', ids: ['slack', 'gmail', 'gsheets', 'notion', 'airtable', 'hubspot', 'trello', 'jira', 'teams'] },
    { name: 'Web', ids: ['http'] }
  ];
  const SEARCHABLE = ['ai', 'integrations', 'api', 'knowledge', 'data'];
  const PRESETS = [
    { label: 'Priority is high', left: '{{ priority }}', op: 'equals', right: 'high' },
    { label: 'Message contains "urgent"', left: '{{ message }}', op: 'contains', right: 'urgent' },
    { label: 'Amount is over 100', left: '{{ amount }}', op: 'greater than', right: '100' }
  ];

  const S = { step: 1, max: 1, trig: null, acts: [], cond: null, condDecided: false, tested: false, testing: false, published: false, name: 'My new workflow', open: null, q: '', view: 'guided', results: {} };

  /* ---------- model ---------- */
  const items = () => [S.trig, S.cond, ...S.acts].filter(Boolean);
  function mk(type) {
    const d = DEFS[type];
    return { id: AB.nid(), type, x: 0, y: 0, data: defaultsFor(d, items().map(n => n.data.name)) };
  }
  function sync() {
    const list = items();
    list.forEach((n, i) => { n.x = i * 300; n.y = 0; });
    const edges = list.slice(1).map((n, i) => ({ id: 'e' + n.id + '_' + list[i].id, from: list[i].id, port: 0, to: n.id }));
    AB.load(list, edges, { fit: false, silent: true });
  }
  const dirty = () => { S.tested = false; S.published = false; S.results = {}; };
  const needs = n => AB.needsSetup(n);
  const cfgItems = () => [S.trig, ...S.acts].filter(Boolean);
  const stepDone = n => ({
    1: () => !!S.trig,
    2: () => S.acts.length > 0,
    3: () => cfgItems().length > 0 && cfgItems().every(x => !needs(x)),
    4: () => S.condDecided,
    5: () => S.tested,
    6: () => S.published
  }[n]());
  const canvasReady = () => !!S.trig && S.acts.length > 0;

  /* ---------- small view helpers ---------- */
  function nic(d) {
    if (d.abbr) return `<div class="nic" style="background:${d.color}">${d.abbr}</div>`;
    const c = CATMAP[d.cat];
    return `<div class="nic cat" style="background:${c.color}1f;color:${c.color}">${ico(c.icon, 20)}</div>`;
  }
  function summary(n) {
    const d = DEFS[n.type], x = n.data;
    if (n.type === 'schedule') return 'Runs every ' + x.every;
    if (n.type === 'webhook') return `${x.method} ${x.path}`;
    if (n.type === 'manual') return 'Starts on demand';
    if (n.type === 'if') return `Only if ${x.left} ${x.op} ${x.right}`;
    if (n.type === 'http') return x.url ? `${x.method} ${x.url}` : 'No URL yet';
    if (d.cat === 'ai') return x.prompt ? x.prompt : 'No prompt yet';
    if (d.cat === 'integrations') return x.conn ? (x.target || d.desc) : 'No account connected';
    return d.desc;
  }
  const chip = n => needs(n) ? '<span class="st need">Needs setup</span>' : '<span class="st ready">Ready</span>';

  /* ---------- left: stepper / body / footer ---------- */
  function renderSteps() {
    $('#gNum').textContent = S.step;
    $('#gSteps').innerHTML = STEPS.map((nm, i) => {
      const n = i + 1, done = n < S.step || (n <= S.max && n !== S.step && stepDone(n)), cur = n === S.step, lock = n > S.max;
      return `<div class="gs ${done ? 'done' : ''} ${cur ? 'cur' : ''} ${lock ? 'lock' : ''}">
        <button class="dot" data-go="${n}" title="${n}. ${nm}" ${lock ? 'disabled' : ''}>${done ? ico('check', 14, 2.6) : n}</button>${n < 6 ? '<span class="bar"></span>' : ''}</div>`;
    }).join('');
  }

  function bodyTrigger() {
    return `<span class="tag">STEP 1</span><h2>Choose a trigger</h2>
      <p class="lead">A trigger is the event that starts your workflow. You can change it later.</p>
      <div class="opts">${TRIGGERS.map(t => `<button class="opt ${S.trig && S.trig.type === t.id ? 'sel' : ''}" data-trig="${t.id}">${nic(DEFS[t.id])}<span class="ot"><b>${t.title}</b><span>${t.sub}</span></span></button>`).join('')}</div>`;
  }

  function actionList() {
    const q = S.q.trim().toLowerCase();
    let groups;
    if (q) {
      const hit = NODE_DEFS.filter(d => SEARCHABLE.includes(d.cat) && (d.name + ' ' + d.desc).toLowerCase().includes(q)).slice(0, 24);
      groups = [{ name: hit.length ? 'Results' : '', ids: hit.map(d => d.id) }];
      if (!hit.length) return `<div class="none">Nothing matches "${esc(S.q)}". Try "email" or "summar".</div>`;
    } else groups = ACTION_GROUPS;
    return groups.map(g => `<div class="grp">${g.name}</div><div class="opts">${g.ids.filter(id => DEFS[id]).map(id => {
      const d = DEFS[id], idx = S.acts.findIndex(a => a.type === id), sel = idx >= 0;
      return `<button class="opt ${sel ? 'sel' : ''}" data-act="${id}">${nic(d)}<span class="ot"><b>${d.name}</b><span>${esc(d.desc)}</span></span><span class="ord">${sel ? idx + 1 : ''}</span></button>`;
    }).join('')}</div>`).join('');
  }
  function bodyAction() {
    return `<span class="tag">STEP 2</span><h2>Choose what happens next</h2>
      <p class="lead">Pick one or more actions. They run in the order you pick them.</p>
      <label class="srch">${ico('search', 16)}<input id="actQ" type="text" placeholder="Search apps and AI steps…" value="${esc(S.q)}" autocomplete="off"></label>
      <div id="actList">${actionList()}</div>`;
  }

  function fieldHtml(n, f) {
    const v = n.data[f.k] ?? '', id = `f_${n.id}_${f.k}`;
    const req = (f.k === 'conn' && DEFS[n.type].cat === 'integrations') || (f.k === 'url' && n.type === 'http') || (f.k === 'prompt' && DEFS[n.type].cat === 'ai');
    const bad = req && !v;
    const attrs = `id="${id}" data-n="${n.id}" data-k="${f.k}"`;
    let c;
    if (f.type === 'textarea') c = `<textarea ${attrs} rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
    else if (f.type === 'select') c = `<select ${attrs}>${f.options.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${o === '' ? 'Choose an account…' : esc(o)}</option>`).join('')}</select>`;
    else if (f.type === 'range') c = `<input type="range" ${attrs} min="0" max="1" step="0.1" value="${v || 0.7}">`;
    else c = `<input type="${f.type === 'number' ? 'number' : 'text'}" ${attrs} value="${esc(v)}" placeholder="${esc(f.placeholder || '')}">`;
    return `<div class="fld ${bad ? 'bad' : ''}"><label for="${id}">${f.label}${req ? ' *' : ''}</label>${c}${bad ? '<small>Required to continue</small>' : ''}</div>`;
  }
  function bodyConfigure() {
    const list = cfgItems();
    if (S.open == null || !list.some(x => x.id === S.open)) { const first = list.find(needs) || list[0]; S.open = first && first.id; }
    return `<span class="tag">STEP 3</span><h2>Set up each step</h2>
      <p class="lead">Fill in the required fields (*). Each step shows <b>Ready</b> once it is complete.</p>
      ${list.map((n, i) => {
        const d = DEFS[n.type];
        return `<div class="acc ${n.id === S.open ? 'open' : ''}" data-acc="${n.id}">
          <button class="acc-h" data-toggle="${n.id}">${nic(d)}<span class="t"><b>${esc(n.data.name)}</b><span>${i === 0 ? 'Trigger' : 'Action ' + i}</span></span><span data-chip>${chip(n)}</span></button>
          <div class="acc-b">${fieldsFor(d).filter(f => f.k !== 'notes').map(f => fieldHtml(n, f)).join('')}</div></div>`;
      }).join('')}
      <button class="helpbtn" data-fill>Fill with example values</button>`;
  }
  function autofill() {
    cfgItems().forEach(n => {
      const d = DEFS[n.type], x = n.data;
      if (d.cat === 'ai' && !x.prompt) x.prompt = 'Summarize the incoming request in 3 short bullet points.';
      if (d.cat === 'integrations') { if (!x.conn) x.conn = 'SNS Demo Account'; if (!x.target) x.target = n.type === 'slack' ? '#sales' : n.type === 'gsheets' ? 'Leads' : 'General'; }
      if (n.type === 'http' && !x.url) x.url = 'https://api.example.com/items';
    });
    dirty(); sync(); render(); toast('Example values added');
  }

  function bodyConditions() {
    const c = S.cond;
    let form = '';
    if (c) {
      form = `<div class="grp">Quick picks</div><div class="presets">${PRESETS.map((p, i) => `<button data-preset="${i}">${p.label}</button>`).join('')}</div>
        ${fieldsFor(DEFS.if).filter(f => ['left', 'op', 'right'].includes(f.k)).map(f => fieldHtml(c, f)).join('')}
        <div class="sent" id="condSent"></div>`;
    }
    return `<span class="tag opt">STEP 4 · OPTIONAL</span><h2>Add a condition?</h2>
      <p class="lead">A condition lets the workflow continue only when something is true, for example only for high priority requests.</p>
      <div class="choice"><button data-cond="yes" class="${c ? 'sel' : ''}"><b>Add a condition</b><span>Filter what continues</span></button><button data-cond="no" class="${S.condDecided && !c ? 'sel' : ''}"><b>Skip</b><span>Always run every step</span></button></div>${form}`;
  }
  function condSentence() {
    const el = $('#condSent'); if (!el || !S.cond) return;
    const x = S.cond.data;
    el.innerHTML = `Continue only when <b>${esc(x.left)} ${esc(x.op)} ${esc(x.right)}</b>. Otherwise the workflow stops here.`;
  }

  const SAMPLE = n => {
    const d = DEFS[n.type];
    if (d.cat === 'triggers') return 'Sample received: { "name": "Asha", "priority": "high", "message": "Need a quote" }';
    if (n.type === 'if') return `${n.data.left} ${n.data.op} ${n.data.right} → True, continued`;
    if (d.cat === 'ai') return 'Output: 3 bullet points generated';
    if (d.cat === 'integrations') return `Done via ${n.data.conn || 'account'} · 1 item`;
    if (n.type === 'http') return '200 OK · 124 ms';
    return 'Done';
  };
  function bodyTest() {
    const list = items(), blocked = !stepDone(3);
    const rows = list.map((n, i) => {
      const st = S.results[n.id] || '';
      return `<div class="tr ${st}" data-tr="${n.id}"><span class="tix"><i></i>${st === 'ok' ? ico('check', 13, 3) : ''}</span><span class="tt"><b>${i + 1}. ${esc(n.data.name)}</b>${st === 'ok' ? `<code>${esc(SAMPLE(n))}</code>` : ''}</span></div>`;
    }).join('');
    return `<span class="tag">STEP 5</span><h2>Test your workflow</h2>
      <p class="lead">Runs every step once with sample data. Nothing real is sent during a test.</p>
      <div class="tlist" id="tlist">${rows}</div>
      ${blocked ? '<div class="banner info">Finish step 3 first. Some steps still need setup.</div>' : S.tested ? `<div class="banner good"><b>Test passed.</b> ${list.length} steps ran with no errors.</div>` : ''}
      <div style="margin-top:12px"><button class="btn btn-pri" data-runtest ${blocked || S.testing ? 'disabled' : ''}>${S.testing ? 'Running…' : S.tested ? 'Run test again' : 'Run test'}</button></div>`;
  }
  async function runTest() {
    if (S.testing || !stepDone(3)) return;
    S.testing = true; S.tested = false; S.results = {}; render();
    const list = items();
    for (const n of list) {
      S.results[n.id] = 'run'; paintTest(); await new Promise(r => setTimeout(r, 520));
      S.results[n.id] = 'ok'; paintTest();
    }
    S.testing = false; S.tested = true; render();
  }
  function paintTest() { // update rows in place so the animation is not interrupted
    items().forEach(n => {
      const el = document.querySelector(`[data-tr="${n.id}"]`); if (!el) return;
      const st = S.results[n.id] || '';
      el.className = 'tr ' + st;
      el.querySelector('.tix').innerHTML = '<i></i>' + (st === 'ok' ? ico('check', 13, 3) : '');
      const tt = el.querySelector('.tt'); tt.querySelector('code')?.remove();
      if (st === 'ok') tt.insertAdjacentHTML('beforeend', `<code>${esc(SAMPLE(n))}</code>`);
    });
  }

  function bodyPublish() {
    if (S.published) return `<div class="live"><div class="big">${ico('check', 28, 3)}</div><h2>${esc(S.name)} is live</h2>
      <p class="lead">It will start from your trigger. You can still edit it in the full canvas.</p>
      <div class="row"><button class="btn btn-pri" data-canvas>Open in full canvas</button><button class="btn" data-reset>Build another workflow</button></div></div>`;
    const t = S.trig && DEFS[S.trig.type];
    const chk = [['Trigger chosen', !!S.trig], ['All steps configured', stepDone(3)], ['Test passed', S.tested]];
    return `<span class="tag">STEP 6</span><h2>Review and publish</h2>
      <p class="lead">Give it a name, check the summary and publish.</p>
      <div class="fld"><label for="wfName">Workflow name</label><input type="text" id="wfName" value="${esc(S.name)}"></div>
      <div class="sum"><div><span>Starts with</span><b>${t ? esc(t.name) : '-'}</b></div><div><span>Steps</span><b>${S.acts.map(a => esc(a.data.name)).join(' → ') || '-'}</b></div><div><span>Condition</span><b>${S.cond ? esc(summary(S.cond)) : 'None'}</b></div></div>
      <div class="chk">${chk.map(([l, ok]) => `<div><span class="c ${ok ? '' : 'no'}">${ok ? ico('check', 12, 3) : ''}</span>${l}</div>`).join('')}</div>`;
  }

  function renderBody() {
    const html = [bodyTrigger, bodyAction, bodyConfigure, bodyConditions, bodyTest, bodyPublish][S.step - 1]();
    $('#gBody').innerHTML = html;
    if (S.step === 4) condSentence();
  }

  function renderFoot() {
    const f = $('#gFoot'), n = S.step, ok = stepDone(n);
    if (S.published) { f.innerHTML = ''; return; }
    const hints = { 1: 'Pick a trigger to continue', 2: 'Pick at least one action', 3: 'Complete the required fields', 4: 'Choose to add or skip', 5: 'Run the test to continue', 6: '' };
    const back = n > 1 ? '<button class="btn" data-back>Back</button>' : '';
    const label = n === 6 ? 'Publish' : 'Continue';
    const can = n === 6 ? (stepDone(3) && S.tested) : ok;
    f.innerHTML = `${back}<span class="hint">${can ? '' : hints[n]}</span><button class="btn btn-pri" data-next ${can ? '' : 'disabled'}>${label}</button>`;
  }

  /* ---------- right: guided flow ---------- */
  function card(n, label, cur, pop) {
    const d = DEFS[n.type], showChip = S.max >= 3 && n.type !== 'if';
    return `<button class="gcard ${cur ? 'cur' : ''} ${pop ? 'pop' : ''}" data-card="${n.id}">${nic(d)}<span class="gt"><small>${label}</small><b>${esc(n.data.name)}</b><span>${esc(summary(n))}</span></span>${showChip ? chip(n) : ''}</button>`;
  }
  function empty(label, title, sub, cur) {
    return `<button class="gcard empty ${cur ? 'cur' : ''}" data-empty="${label}"><div class="nic">${ico(label === 'Trigger' ? 'zap' : label === 'Condition' ? 'branch' : 'zap', 22)}</div><span class="gt"><b>${title}</b><span>${sub}</span></span></button>`;
  }
  const link = (cur, dim) => `<div class="link ${cur ? 'cur' : ''} ${dim ? 'dim' : ''}"><i>${ico('plus', 12, 2.6)}</i></div>`;

  let seen = new Set();
  function renderFlow() {
    const out = [], openId = S.step === 3 ? S.open : null;
    const fresh = id => { const p = !seen.has(id); seen.add(id); return p; };
    let num = 1;
    out.push(S.trig ? card(S.trig, `${num}. Trigger`, S.step === 1 || openId === S.trig.id, fresh(S.trig.id)) : empty('Trigger', '1. Trigger', 'An event that starts your workflow', S.step === 1));
    num++;
    if (S.cond) { out.push(link(false)); out.push(card(S.cond, `${num}. Condition`, S.step === 4, fresh(S.cond.id))); num++; }
    else if (S.step === 4) { out.push(link(false)); out.push(empty('Condition', 'Condition (optional)', 'Only continue when something is true', true)); num++; }
    if (S.acts.length) S.acts.forEach((a, i) => { out.push(link(false)); out.push(card(a, `${num + i}. Action`, S.step === 2 || openId === a.id, fresh(a.id))); });
    else { out.push(link(false, !S.trig)); out.push(empty('Action', `${num}. Action`, 'An event your workflow performs after it starts', S.step === 2)); }
    if (S.acts.length) out.push(`<div data-addmore>${link(S.step === 2, false)}</div>`);
    if (S.published) out.push('<div class="published">Live</div>');
    $('#flow').innerHTML = out.join('');
  }

  function renderSeg() {
    const ready = canvasReady();
    $('#segCanvas').classList.toggle('locked', !ready);
    $('#segLock').style.display = ready ? 'none' : 'inline-grid';
    $('#vHint').textContent = ready ? 'Full canvas is unlocked. Switch any time.' : 'Full canvas unlocks once you pick a trigger and an action.';
    $('#seg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S.view));
  }
  function setView(v) {
    if (v === 'canvas' && !canvasReady()) return toast('Pick a trigger and an action first. Then the full canvas unlocks.');
    S.view = v; sync();
    $('#gview').hidden = v !== 'guided'; $('#cview').hidden = v !== 'canvas';
    renderSeg();
    if (v === 'canvas') requestAnimationFrame(() => AB.fit());
  }

  function render() { renderSteps(); renderBody(); renderFoot(); renderFlow(); renderSeg(); }
  function go(n) {
    if (n < 1 || n > 6 || n > S.max) return;
    S.step = n; if (S.view !== 'guided') setView('guided');
    render(); $('#gBody').scrollTop = 0;
  }
  function next() {
    if (S.step === 6) { S.published = true; $('#savedAt').textContent = 'Published'; render(); return toast('Workflow published'); }
    if (!stepDone(S.step)) return;
    S.step++; S.max = Math.max(S.max, S.step); render(); $('#gBody').scrollTop = 0;
  }
  function reset() {
    Object.assign(S, { step: 1, max: 1, trig: null, acts: [], cond: null, condDecided: false, tested: false, testing: false, published: false, name: 'My new workflow', open: null, q: '', results: {} });
    seen = new Set(); $('#savedAt').textContent = 'Draft'; sync(); setView('guided'); render();
  }

  /* ---------- events ---------- */
  $('#gReset').addEventListener('click', reset);
  $('#seg').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) setView(b.dataset.v); });

  $('#gSteps').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) go(+b.dataset.go); });
  $('#gFoot').addEventListener('click', e => {
    if (e.target.closest('[data-back]')) go(S.step - 1);
    else if (e.target.closest('[data-next]')) next();
  });

  $('#gBody').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.trig) {
      if (!S.trig || S.trig.type !== t.dataset.trig) { S.trig = mk(t.dataset.trig); dirty(); sync(); }
      render();
    } else if (t.dataset.act) {
      const i = S.acts.findIndex(a => a.type === t.dataset.act);
      if (i >= 0) S.acts.splice(i, 1);
      else if (S.acts.length >= 5) return toast('Up to 5 actions in this demo');
      else S.acts.push(mk(t.dataset.act));
      dirty(); sync(); renderFlow(); renderFoot(); renderSeg(); $('#actList').innerHTML = actionList();
    } else if (t.dataset.toggle) {
      S.open = S.open === t.dataset.toggle ? null : t.dataset.toggle;
      document.querySelectorAll('.acc').forEach(a => a.classList.toggle('open', a.dataset.acc === S.open)); renderFlow();
    } else if ('fill' in t.dataset) autofill();
    else if (t.dataset.cond) {
      if (t.dataset.cond === 'yes') { if (!S.cond) { S.cond = mk('if'); S.cond.data.left = '{{ priority }}'; S.cond.data.right = 'high'; } }
      else S.cond = null;
      S.condDecided = true; dirty(); sync(); render();
    } else if (t.dataset.preset) {
      const p = PRESETS[+t.dataset.preset]; Object.assign(S.cond.data, { left: p.left, op: p.op, right: p.right });
      dirty(); sync(); render();
    } else if ('runtest' in t.dataset) runTest();
    else if ('canvas' in t.dataset) setView('canvas');
    else if ('reset' in t.dataset) reset();
  });

  function onField(e) {
    const el = e.target;
    if (el.id === 'actQ') { S.q = el.value; $('#actList').innerHTML = actionList(); return; }
    if (el.id === 'wfName') { S.name = el.value || 'My new workflow'; return; }
    if (!el.dataset.n) return;
    const n = items().find(x => x.id === el.dataset.n); if (!n) return;
    n.data[el.dataset.k] = el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value;
    dirty(); sync(); renderFlow(); renderFoot();
    if (S.step === 3) {
      document.querySelectorAll('.acc').forEach(a => { const m = items().find(x => x.id === a.dataset.acc); if (m) a.querySelector('[data-chip]').innerHTML = chip(m); });
      if (e.type === 'change') { const fld = el.closest('.fld'); if (fld) { const req = el.dataset.k === 'conn' || el.dataset.k === 'url' || el.dataset.k === 'prompt'; if (req) { fld.classList.toggle('bad', !el.value); fld.querySelector('small')?.remove(); if (!el.value) fld.insertAdjacentHTML('beforeend', '<small>Required to continue</small>'); } } }
    }
    if (S.step === 4) condSentence();
  }
  $('#gBody').addEventListener('input', onField);
  $('#gBody').addEventListener('change', onField);

  $('#flow').addEventListener('click', e => {
    if (e.target.closest('[data-addmore]')) return go(2);
    const c = e.target.closest('[data-card]');
    if (c) {
      const id = c.dataset.card;
      if (S.trig && S.trig.id === id) return go(1);
      if (S.cond && S.cond.id === id) return go(S.max >= 4 ? 4 : S.step);
      if (S.max >= 3) { S.open = id; return go(3); }
      return go(2);
    }
    const em = e.target.closest('[data-empty]');
    if (em) go(em.dataset.empty === 'Trigger' ? 1 : em.dataset.empty === 'Action' ? 2 : 4);
  });

  // the canvas Home button etc. are handled by app.js. Keep the canvas and the wizard in sync.
  AB.listeners.push(() => { if (S.view === 'canvas') { /* edits made on the canvas stay in AB.state */ } });

  render();
})();
