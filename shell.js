/* Dashboard shell: sidebar navigation + option pages */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  Object.assign(ICON, {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>'
  });

  // level -> pips (1..5)
  const LV = { 'Very Low': 1, Low: 2, Medium: 3, Easy: 4, High: 4, 'Very Easy': 5, 'Very High': 5 };

  const OPTIONS = [
    { id: 1, key: 'blank', title: 'Blank Canvas', file: 'option1.html', ready: true,
      short: 'Empty canvas with a node library. Users drag, connect and configure everything themselves.',
      source: 'n8n workflow builder (DataCamp tutorial)',
      suitable: 'Experienced developers and automation specialists',
      ease: 'Medium', flex: 'Very High', curve: 'High',
      steps: ['User opens the Agent Builder.', 'A blank canvas appears.', 'Node Library is available on the side.', 'User drags nodes onto the canvas.', 'User connects and configures the nodes.'],
      pros: 'Maximum freedom and flexibility.', cons: 'Beginners may not know where to start.' },
    { id: 2, key: 'template', title: 'Template-First', file: 'option2.html', ready: true,
      short: 'Start from a ready-made workflow template and adapt it on the canvas.',
      source: 'Lark: 16 Best AI Productivity Tools',
      suitable: 'Beginners and business users',
      ease: 'Very Easy', flex: 'Medium', curve: 'Low',
      steps: ['User opens Agent Builder.', 'The system displays ready-made workflow templates.', 'User selects a template.', 'The workflow opens on the canvas.', 'User modifies the nodes and configurations.'],
      pros: 'Users do not need to build everything from scratch.', cons: 'Users may struggle when their requirements do not match the available templates.' },
    { id: 3, key: 'prompt', title: 'AI Prompt-First', file: 'option3.html', ready: true,
      short: 'Describe the automation in plain language and AI generates the workflow.',
      source: 'Softr: What is workflow automation?',
      suitable: 'All user categories, particularly beginners',
      ease: 'Very Easy', flex: 'High', curve: 'Low',
      steps: ['User opens Agent Builder.', 'A prompt interface appears.', 'User describes the required automation. Example: “Whenever a customer submits a contact form, analyse the enquiry, classify its priority and notify the sales team.”', 'AI generates the workflow.', 'The generated workflow opens in the visual canvas.', 'User can modify and execute it.'],
      pros: 'Very easy for non-technical users.', cons: 'AI-generated workflows need validation and user review.' },
    { id: 4, key: 'guided', title: 'Guided Step-by-Step', file: 'option4.html', ready: true,
      short: 'A wizard walks the user through trigger, action, conditions, test and publish.',
      source: 'Zapier Copilot (Beta)',
      suitable: 'First-time users and non-technical business users',
      ease: 'Very Easy', flex: 'Medium', curve: 'Very Low',
      steps: ['Select a trigger.', 'Select an action.', 'Configure the action.', 'Add conditions.', 'Test the workflow.', 'Publish.'],
      pros: 'Easy learning experience and fewer mistakes.', cons: 'Less convenient for complex workflows.' },
    { id: 5, key: 'split', title: 'Split-Screen', file: 'option5.html', ready: true,
      short: 'Node library, canvas and a configuration + AI assistant panel in one workspace.',
      source: 'Microsoft Copilot Agents Labs',
      suitable: 'Professional workflow development',
      ease: 'Easy', flex: 'High', curve: 'Medium',
      steps: ['Left: Node Library.', 'Centre: Workflow Canvas.', 'Right: Configuration and AI Assistant.', 'Selecting a node opens its configuration on the right.', 'Asking the AI to modify the workflow updates the canvas.'],
      pros: 'Everything is accessible in one workspace.', cons: 'Requires careful screen-space management.' },
    { id: 6, key: 'contextual', title: 'Contextual Canvas', file: 'option6.html', ready: true,
      short: 'A “+” after each node opens suggested next actions and connects them automatically.',
      source: 'Kore.ai: Manage Nodes in Flows',
      suitable: 'Users who prefer a simple, guided visual experience',
      ease: 'Very Easy', flex: 'High', curve: 'Low',
      steps: ['User creates the first node.', 'A plus (+) button appears after the node.', 'User clicks it and a contextual menu suggests next actions.', 'User selects the next node.', 'The system connects it automatically. Example: Email Trigger → (+) → AI Summarization → (+) → Slack Notification.'],
      pros: 'Reduces manual connections and makes creation intuitive.', cons: 'Complex branching needs additional interaction patterns.' },
    { id: 7, key: 'progressive', title: 'Progressive Disclosure', file: 'option7.html', ready: true,
      short: 'Show only essential settings first, with Advanced Settings revealed when needed.',
      source: 'Helply: ChatGPT Agent Builder (2026)',
      suitable: 'Products serving both beginners and experienced developers',
      ease: 'Easy', flex: 'High', curve: 'Low',
      steps: ['Do not expose every configuration at once.', 'Initially show only essential node settings.', 'Provide an Advanced Settings option.', 'Show additional configuration when needed.', 'Display advanced execution controls only when relevant.'],
      pros: 'Reduces cognitive load and avoids overwhelming beginners.', cons: 'Advanced users may need additional clicks.' },
    { id: 8, key: 'onboarding', title: 'Interactive Onboarding Canvas', file: 'option8.html', ready: true,
      short: 'A first-run tour introduces the library, canvas and connections, then runs a sample.',
      source: 'Dribbble: Workflow Builder App by Synergy Codes',
      suitable: 'New users and enterprise onboarding',
      ease: 'Easy', flex: 'High', curve: 'Low',
      steps: ['Introduce the Node Library.', 'Highlight the canvas workspace.', 'Demonstrate how to add nodes.', 'Explain node connections.', 'Guide users through their first workflow.', 'Allow users to execute a sample workflow.'],
      pros: 'Reduces the learning curve and improves adoption.', cons: 'Requires onboarding maintenance and should not interrupt experienced users.' },
    { id: 9, key: 'hybrid', hybrid: true, title: 'Combined Experience', file: 'option9.html', ready: true,
      short: 'The recommendation: five ways to start, then one editor that combines the best of every approach.',
      source: 'Combined recommendation for SNS Square',
      suitable: 'Everyone: beginners, business users and developers',
      ease: 'Easy', flex: 'Very High', curve: 'Low',
      steps: ['Entry screen: describe it with AI, use a template, guided creation, explore a sample or start from scratch.', 'Editor with a searchable library (essentials first), an infinite canvas and contextual + controls.', 'Right panel with essential settings, advanced settings on request, and an AI assistant.', 'Real-time validation and a path-to-publish checklist.', 'Undo and redo, auto-connect, and a preview run before publishing.'],
      pros: 'Every kind of user has a natural starting point and nobody is blocked.', cons: 'More surface area to design, build and keep consistent.' }
  ];
  const APPROACHES = OPTIONS.filter(o => !o.hybrid);
  const optBy = n => OPTIONS.find(o => o.id === n);
  const readyCount = APPROACHES.filter(o => o.ready).length;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const meter = (label, lv) => `<div class="meter"><em>${label}</em><span class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= LV[lv] ? 'f' : ''}"></i>`).join('')}</span><span>${lv}</span></div>`;
  const badge = o => o.ready ? '<span class="badge ready">Demo ready</span>' : '<span class="badge">Planned</span>';

  /* ---------- sidebar ---------- */
  function renderNav(route) {
    let h = `<button class="nav-item${route === 'home' ? ' active' : ''}" data-go="#/"><span class="nav-ico">${ico('grid', 18)}</span><span class="nav-text">Dashboard</span></button>`;
    h += '<div class="nav-label">UX approaches</div>';
    for (const o of OPTIONS) {
      if (o.hybrid) h += '<div class="nav-label">Recommendation</div>';
      h += `<button class="nav-item${route === o.id ? ' active' : ''}" data-go="#/option/${o.id}" title="${esc(o.title)}"><span class="nav-num">${o.hybrid ? '★' : o.id}</span><span class="nav-text">${esc(o.title)}</span><span class="dot${o.ready ? ' ready' : ''}"></span></button>`;
    }
    $('#nav').innerHTML = h;
    $('#sideNote').textContent = `${readyCount} of ${OPTIONS.length} demos ready`;
  }
  $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) location.hash = b.dataset.go; });

  const narrow = () => matchMedia('(max-width: 960px)').matches;
  $('#collapse').innerHTML = ico('left', 18);
  $('#collapse').addEventListener('click', () => {
    const s = $('#shell');
    if (narrow()) s.classList.toggle('expanded'); else s.classList.toggle('collapsed');
  });

  /* ---------- pages ---------- */
  function homePage() {
    const cards = APPROACHES.map(o => `
      <button class="opt" data-go="#/option/${o.id}">
        <div class="opt-top"><span class="opt-num">${o.id}</span>${badge(o)}</div>
        <h3>${esc(o.title)}</h3>
        <p>${esc(o.short)}</p>
        <div class="opt-meta">${meter('Ease of use', o.ease)}${meter('Flexibility', o.flex)}${meter('Learning curve', o.curve)}</div>
        <div class="opt-cta">${o.ready ? 'Open live demo' : 'View details'} ${ico('arrow', 14)}</div>
      </button>`).join('');
    const rows = APPROACHES.map(o => `<tr class="link" data-go="#/option/${o.id}"><td><b>${o.id}. ${esc(o.title)}</b></td><td>${meter('', o.ease)}</td><td>${meter('', o.flex)}</td><td>${meter('', o.curve)}</td><td>${esc(o.suitable)}</td><td>${badge(o)}</td></tr>`).join('');
    const entry = [
      ['Describe your workflow', 'Tell AI what to automate. It builds the workflow for you.', 3, 'Recommended for beginners'],
      ['Start from Scratch', 'Open an empty visual canvas and build it yourself.', 1, ''],
      ['Use a Template', 'Start with a pre-built workflow.', 2, ''],
      ['Guided Creation', 'Build your workflow step by step.', 4, ''],
      ['Explore a Sample', 'Learn by exploring an interactive example.', 8, '']
    ].map(([t, d, n, tag]) => `<button class="entry-row${tag ? ' star' : ''}" data-go="#/option/${n}"><span class="nav-num">${n}</span><span class="grow"><b>${t}</b><span>${d}</span></span>${tag ? `<span class="tag">${tag}</span>` : ''}</button>`).join('');
    const areas = [['Top navigation', 'Workflow name, Save, Undo, Redo, Test, Publish'], ['Left panel', 'Searchable node library with categories'], ['Centre', 'Infinite canvas with contextual Add Node controls'], ['Right panel', 'Node configuration with basic and advanced settings'], ['Bottom panel', 'Execution history, logs, errors and output'], ['AI assistant', 'Expandable assistant to create and modify workflows']]
      .map(([a, b]) => `<div class="area"><b>${a}</b><span>${b}</span></div>`).join('');
    return `<div class="page">
      <div class="eyebrow">SNS Square · Agent Builder</div>
      <h1>UX Approaches Explorer</h1>
      <p class="lead">Eight ways a user can start building an agent workflow. Open each one from the sidebar to try the live demo. The recommendation at the bottom combines them into one experience.</p>
      <div class="stats">
        <div class="card stat"><b>${APPROACHES.length}</b><span>UX approaches</span></div>
        <div class="card stat"><b>${readyCount}</b><span>Live demos ready</span></div>
        <div class="card stat"><b>1</b><span>Combined experience</span></div>
        <div class="card stat" style="min-width:220px"><b>${Math.round(readyCount / APPROACHES.length * 100)}%</b><span>Demo build progress</span><div class="bar-progress"><i style="width:${readyCount / APPROACHES.length * 100}%"></i></div></div>
      </div>
      <section class="section"><h2>All approaches</h2><div class="grid">${cards}</div></section>
      <section class="section"><h2>Comparison</h2><div class="card table-wrap"><table>
        <thead><tr><th>Approach</th><th>Ease of use</th><th>Flexibility</th><th>Learning curve</th><th>Suitable for</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      <section class="section"><h2>Recommendation for SNS Square: one combined experience</h2>
        <button class="entry-row star" data-go="#/option/9" style="margin-bottom:14px;width:100%"><span class="nav-num">★</span><span class="grow"><b>Open the combined experience demo</b><span>Entry screen with five ways to start, then one editor that uses the best of all eight approaches.</span></span><span class="tag">Live demo</span></button>
        <div class="two">
          <div class="card entry"><h3>Entry screen: “How would you like to create your workflow?”</h3><div class="entry-list">${entry}</div></div>
          <div class="card entry"><h3>Editor structure</h3>${areas}<div class="src">Plus: auto-connect compatible nodes, recommended next nodes, real-time validation, undo/redo, and an execution preview before publishing.</div></div>
        </div>
      </section>
    </div>`;
  }

  function infoBody(o) {
    return `<div class="eyebrow">Reference: ${esc(o.source)}</div>
      <h3 style="margin-top:18px">User experience</h3>
      <ol class="steps">${o.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="pc" style="margin-top:6px">
        <div class="card pros"><h3>Advantages</h3><p>${esc(o.pros)}</p></div>
        <div class="card cons"><h3>Disadvantages</h3><p>${esc(o.cons)}</p></div>
      </div>
      <div class="card" style="margin-top:14px;padding:16px 18px"><h3>Suitable for</h3><p style="margin:0;color:var(--ink-2);font-size:13px">${esc(o.suitable)}</p></div>`;
  }
  function plannedPage(o) {
    return `<div class="page" style="max-width:820px">
      <div class="eyebrow">Option ${o.id} · ${esc(o.key)}</div>
      <h1>${esc(o.title)}</h1>
      <p class="lead">${esc(o.short)}</p>
      <div class="soon"><div class="soon-ico">${ico('hourglass', 20)}</div><div><b>Live demo coming next</b><span>This page will load <code>${o.file}</code> using the same shell, so it plugs in without touching anything else.</span></div></div>
      <div style="margin-top:28px">${infoBody(o)}</div>
    </div>`;
  }

  /* ---------- routing ---------- */
  let aboutOpen = false;
  function setAbout(on, o) {
    aboutOpen = on;
    $('#about').hidden = !on; $('#barAbout').classList.toggle('on', on);
    if (on && o) $('#about').innerHTML = `<h2>About this approach</h2>${infoBody(o)}`;
  }
  function route() {
    const m = location.hash.match(/^#\/option\/(\d+)/);
    const o = m && optBy(+m[1]);
    const stage = $('#stage'), bar = $('#bar');
    setAbout(false);
    const shellEl = $('#shell'); shellEl.classList.remove('expanded'); shellEl.classList.toggle('collapsed', !!(o && o.ready));
    if (!o) {
      renderNav('home'); bar.hidden = true; stage.innerHTML = homePage(); stage.scrollTop = 0;
      document.title = 'Agent Builder UX Explorer'; return;
    }
    renderNav(o.id); bar.hidden = false;
    document.title = o.hybrid ? `Recommendation · ${o.title}` : `Option ${o.id} · ${o.title}`;
    $('#barNum').textContent = o.hybrid ? 'Recommendation' : `Option ${o.id}`; $('#barName').textContent = o.title;
    $('#barChip').textContent = o.ready ? 'Live demo' : 'Planned'; $('#barChip').className = 'chip' + (o.ready ? ' ready' : '');
    $('#barPrev').disabled = o.id === 1; $('#barNext').disabled = o.id === OPTIONS.length;
    $('#barAbout').style.display = o.ready ? '' : 'none';
    if (o.ready) { stage.innerHTML = `<iframe src="${o.file}?v=5" title="${esc(o.title)} demo"></iframe>`; }
    else { stage.innerHTML = plannedPage(o); stage.scrollTop = 0; }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    if (e.target.closest('.nav')) return;
    const g = e.target.closest('#stage [data-go]'); if (g) location.hash = g.dataset.go;
  });
  window.addEventListener('message', e => { if (e.data && e.data.type === 'ux-nav') location.hash = e.data.to; });

  $('#barHome').innerHTML = ico('left', 18);
  $('#barHome').addEventListener('click', () => { location.hash = '#/'; });
  $('#barAbout').innerHTML = `${ico('info', 16)}About`;
  $('#barAbout').addEventListener('click', () => {
    const m = location.hash.match(/^#\/option\/(\d+)/); setAbout(!aboutOpen, m && optBy(+m[1]));
  });
  $('#barPrev').innerHTML = ico('left', 16); $('#barNext').innerHTML = ico('right', 16);
  const step = d => { const m = location.hash.match(/^#\/option\/(\d+)/); if (m) location.hash = `#/option/${+m[1] + d}`; };
  $('#barPrev').addEventListener('click', () => step(-1)); $('#barNext').addEventListener('click', () => step(1));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && aboutOpen) setAbout(false); });

  route();
})();
