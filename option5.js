/* Option 5 · Split-Screen
   Left: node library (engine tool list). Centre: canvas. Right: config for the selected node + AI chat (option3.js). */
(function () {
  const AB = window.AB;
  const $ = s => document.querySelector(s);
  const body = document.body;

  /* ---------- right pane tabs ---------- */
  function tab(t) {
    body.classList.remove('r-off');
    document.querySelectorAll('.rt').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('#paneCfg').hidden = t !== 'cfg'; $('#paneAI').hidden = t !== 'ai';
    if (t === 'ai') setTimeout(() => $('#chatInput').focus(), 50);
  }
  document.querySelector('.rtabs').addEventListener('click', e => { const b = e.target.closest('.rt'); if (b) tab(b.dataset.t); });
  $('#btnAI').addEventListener('click', () => tab('ai'));

  // selecting a node shows its settings; nothing selected shows a hint
  const cv = $('#configView'), empty = $('#cfgEmpty');
  const syncCfg = () => { empty.hidden = !cv.hidden; };
  new MutationObserver(() => { syncCfg(); if (!cv.hidden) tab('cfg'); }).observe(cv, { attributes: true, attributeFilter: ['hidden'] });
  syncCfg();

  /* ---------- collapsing panes (screen-space management) ---------- */
  const toggle = (cls, on) => { body.classList.toggle(cls, on); setTimeout(() => AB.fit && 0, 250); };
  $('#libX').addEventListener('click', () => toggle('lib-off', true));
  $('#openLib').addEventListener('click', () => toggle('lib-off', false));
  $('#rX').addEventListener('click', () => toggle('r-off', true));
  $('#openRight').addEventListener('click', () => toggle('r-off', false));

  /* ---------- issues banner ---------- */
  const banner = $('#issues');
  banner.addEventListener('pointerdown', e => e.stopPropagation());
  let dismissedAt = -1;
  const bad = () => AB.state.nodes.filter(n => AB.needsSetup(n));
  function issues() {
    const list = bad(), n = list.length, badge = $('#issueN');
    badge.hidden = !n; badge.textContent = n;
    banner.hidden = !n || dismissedAt === n;
    if (!n) dismissedAt = -1;
    $('#issueText').textContent = n === 1 ? '1 step needs setup' : `${n} steps need setup`;
  }
  $('#issueGo').addEventListener('click', () => { const n = bad()[0]; if (n) { AB.focus(n.id); AB.select({ type: 'node', id: n.id }); tab('cfg'); } });
  $('#issueX').addEventListener('click', () => { dismissedAt = bad().length; banner.hidden = true; });
  AB.listeners.push(issues);
  issues();

  /* ---------- AI greeting (the landing screen from option 3 is not used) ---------- */
  function greet() {
    if ($('#msgs').children.length) return;
    $('#msgs').innerHTML = `<div class="msg ai"><div class="av">${ico('sparkles', 14)}</div><div class="body"><p>Hi! Tell me what to build or change and I will update the canvas. You can also add tools from the library and I will help refine them.</p></div></div>`;
  }
  greet();
  $('#chatNew').addEventListener('click', () => setTimeout(greet, 0));
})();
