/* Option 7 · Progressive Disclosure
   Essentials first. The engine renders every field into #cfgForm; this script re-sorts those inputs into
   "essential" (always visible) and "Advanced settings" (collapsed), and adds execution controls only for steps where they make sense. */
(function () {
  const AB = window.AB, DEFS = AB.DEFS;
  const $ = s => document.querySelector(s);
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- left: essentials library ---------- */
  const GROUPS = [
    ['Start', ['manual', 'webhook', 'schedule']],
    ['AI', ['llm-chat', 'summarizer', 'classifier', 'agent']],
    ['Apps', ['slack', 'gmail', 'gsheets', 'notion']],
    ['Logic', ['if', 'loop', 'wait']],
    ['Web', ['http']]
  ];
  function tile(d) {
    if (d.abbr) return `<span class="tl" style="background:${d.color}">${d.abbr}</span>`;
    const c = CATMAP[d.cat]; return `<span class="tl" style="background:${c.color}">${ico(c.icon, 15)}</span>`;
  }
  $('#ess').innerHTML = GROUPS.map(([g, ids]) => `<div class="lg">${g}</div>` + ids.filter(id => DEFS[id]).map(id => `<button class="li" draggable="true" data-id="${id}">${tile(DEFS[id])}${esc(DEFS[id].name)}</button>`).join('')).join('');
  $('#ess').addEventListener('click', e => {
    const b = e.target.closest('.li'); if (!b) return;
    const name = DEFS[b.dataset.id].name;
    const t = [...document.querySelectorAll('#cats .tool')].find(x => x.querySelector('.tool-name').textContent === name);
    if (t) t.click(); // reuse the engine's own "add after the last node" behaviour
  });
  $('#ess').addEventListener('dragstart', e => { const b = e.target.closest('.li'); if (!b) return; e.dataTransfer.setData('text/plain', 'node:' + b.dataset.id); e.dataTransfer.effectAllowed = 'copy'; });
  $('#libMore').addEventListener('click', () => $('#lib').classList.add('all'));
  $('#libBack').addEventListener('click', () => $('#lib').classList.remove('all'));

  /* ---------- right: essentials vs advanced ---------- */
  const ESS = d => {
    if (d.cat === 'ai') return ['prompt', 'model'];
    if (d.cat === 'integrations') return ['conn', 'op', 'target'];
    if (d.id === 'http') return ['method', 'url'];
    if (d.id === 'if') return ['left', 'op', 'right'];
    if (d.id === 'switch') return ['field'];
    if (d.id === 'loop') return ['items'];
    if (d.id === 'schedule') return ['every'];
    if (d.id === 'webhook') return ['method', 'path'];
    if (d.id === 'wait') return ['secs'];
    if (d.id === 'logger') return ['message'];
    if (d.id === 'note') return ['text'];
    if (d.cat === 'api') return ['url'];
    if (d.cat === 'data') return ['expr'];
    if (d.cat === 'knowledge') return ['source'];
    if (d.cat === 'memory') return ['key'];
    return [];
  };
  const sel = (k, label, options, def) => ({ k, label, type: 'select', options, def });
  const num = (k, label, def) => ({ k, label, type: 'number', def });
  const chk = (k, label, def) => ({ k, label, type: 'check', def });
  const EXTRA = d => {
    const ex = [];
    const ext = ['ai', 'integrations', 'api', 'knowledge'].includes(d.cat) || d.id === 'http';
    if (ext) ex.push(sel('retries', 'Retry on failure', ['Off', '1 time', '2 times', '3 times'], 'Off'), num('timeout', 'Timeout (seconds)', 30), sel('onError', 'If this step fails', ['Stop the workflow', 'Continue anyway', 'Run the error path'], 'Stop the workflow'));
    if (d.cat === 'ai') ex.push(chk('cache', 'Reuse answers for identical inputs', false));
    if (d.id === 'webhook') ex.push(sel('auth', 'Authentication', ['None', 'Secret header', 'Signed request'], 'None'), sel('respond', 'Respond to the caller', ['Immediately', 'After the workflow finishes'], 'Immediately'));
    if (d.id === 'schedule') ex.push(sel('tz', 'Time zone', ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'], 'Asia/Kolkata'));
    if (d.id === 'loop') ex.push(num('maxIter', 'Max iterations', 100));
    return ex;
  };

  const pref = { get: () => { try { return localStorage.getItem('ab.opt7.adv') === '1'; } catch (e) { return false; } }, set: v => { try { localStorage.setItem('ab.opt7.adv', v ? '1' : '0'); } catch (e) { /* ignore */ } } };
  const openSet = new Set();
  const form = $('#cfgForm'), cfgConn = $('#cfgConn'), cfgBody = document.querySelector('.cfg-body');

  function extraEl(node, f) {
    const v = node.data[f.k] ?? f.def, lab = document.createElement('label'); lab.className = 'field';
    if (f.type === 'check') {
      lab.innerHTML = `<div class="sw"><input type="checkbox" ${v ? 'checked' : ''}> ${esc(f.label)}</div>`;
    } else if (f.type === 'select') {
      lab.innerHTML = `<span>${esc(f.label)}</span><select>${f.options.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else lab.innerHTML = `<span>${esc(f.label)}</span><input type="number" value="${esc(v)}">`;
    const inp = lab.querySelector('input,select');
    const read = () => f.type === 'check' ? inp.checked : f.type === 'number' ? Number(inp.value) : inp.value;
    inp.addEventListener('input', () => { node.data[f.k] = read(); });
    inp.addEventListener('change', () => { node.data[f.k] = read(); AB.load(AB.state.nodes, AB.state.edges, { fit: false }); });
    lab._isDirty = () => String(node.data[f.k] ?? f.def) !== String(f.def);
    return lab;
  }

  function rebuild() {
    const labels = [...form.children].filter(c => c.matches && c.matches('label.field'));
    if (!labels.length) return; // our own moves trigger this observer too
    const s = AB.state.sel, node = s && s.type === 'node' && AB.byId(s.id); if (!node) return;
    const d = DEFS[node.type], fields = fieldsFor(d);
    if (fields.length !== labels.length) return;

    cfgBody.insertBefore(cfgConn, form); // park it before we rebuild
    const old = $('#pdWrap'); if (old) old.remove();
    const wrap = document.createElement('div'); wrap.id = 'pdWrap';

    const keys = ESS(d), ess = document.createElement('div'), advLabels = [];
    labels.forEach((l, i) => {
      const f = fields[i];
      if (f.k === 'name' || keys.includes(f.k)) ess.appendChild(l);
      else { l._isDirty = () => String(node.data[f.k] ?? '') !== String(f.def ?? ''); advLabels.push(l); }
    });
    const extras = EXTRA(d).map(f => extraEl(node, f));
    const adv = [...advLabels, ...extras], total = adv.length;
    wrap.appendChild(ess);

    const btn = document.createElement('button'); btn.className = 'pd-adv-btn' + (total ? '' : ' none'); btn.type = 'button';
    const panel = document.createElement('div'); panel.className = 'pd-adv';
    const inner = document.createElement('div'); inner.className = 'inner';
    const box = document.createElement('div'); box.appendChild(inner); panel.appendChild(box);
    if (total) {
      inner.insertAdjacentHTML('beforeend', '<div class="pd-hint">The defaults work for most workflows. Change these only if you need to.</div>');
      advLabels.forEach(l => inner.appendChild(l));
      if (extras.length) { inner.insertAdjacentHTML('beforeend', '<div class="grp-title">Execution</div>'); extras.forEach(l => inner.appendChild(l)); }
      inner.appendChild(cfgConn);
    }
    const isOpen = () => panel.classList.contains('open');
    const paint = () => {
      const mod = adv.filter(l => l._isDirty()).length;
      adv.forEach(l => l.classList.toggle('cust', l._isDirty()));
      btn.setAttribute('aria-expanded', isOpen());
      btn.innerHTML = total
        ? `<span class="chv">${ico('chevron', 16)}</span>Advanced settings${mod ? `<span class="mod">${mod} changed</span>` : ''}<span class="cnt">${total} option${total > 1 ? 's' : ''}</span>`
        : 'No advanced settings for this step';
    };
    if (total && (pref.get() || openSet.has(node.id))) panel.classList.add('open');
    btn.addEventListener('click', () => { if (!total) return; panel.classList.toggle('open'); isOpen() ? openSet.add(node.id) : openSet.delete(node.id); paint(); });
    wrap.addEventListener('input', paint); wrap.addEventListener('change', paint);
    wrap.append(btn, panel);

    if (total) {
      const o = document.createElement('label'); o.className = 'pd-opt';
      o.innerHTML = `<input type="checkbox" ${pref.get() ? 'checked' : ''}> Always show advanced settings`;
      o.querySelector('input').addEventListener('change', e => { pref.set(e.target.checked); panel.classList.toggle('open', e.target.checked); if (!e.target.checked) openSet.delete(node.id); paint(); });
      wrap.appendChild(o);
    }
    paint();
    form.after(wrap);
  }
  new MutationObserver(rebuild).observe(form, { childList: true });

  // settings panel exists only while a node is selected
  const cv = $('#configView'), panelEl = $('#panel');
  if (!document.body.dataset.hybrid) new MutationObserver(() => { if (cv.hidden) panelEl.classList.add('closed'); }).observe(cv, { attributes: true, attributeFilter: ['hidden'] });
})();
