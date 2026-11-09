/* Option 3 · AI Prompt-First
   Prompt screen -> AI builds the workflow -> review on canvas -> keep refining in chat.
   The "AI" here is a rule-based mock planner so the demo works offline. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const DEFS = AB.DEFS;
  const CATMAP = Object.fromEntries(CATS.map(c => [c.id, c]));
  const colorOf = type => DEFS[type].color || CATMAP[DEFS[type].cat].color;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* =====================================================
     Mock planner
     ===================================================== */
  const RECIPIENT = /\b(?:to|notify|alert|email|message|tell|inform)\s+(?:the\s+|our\s+|my\s+|a\s+)?((?:[a-z]+\s)?(?:team|customers?|clients?|users?|managers?|admins?|sender|requester|everyone))\b/;
  const VERB = { slack: 'Notify', teams: 'Notify', gmail: 'Email', outlook: 'Email', discord: 'Post to', telegram: 'Message', whatsapp: 'Message', twilio: 'Text' };
  const DEFN = { slack: 'Send Slack message', gmail: 'Send email', outlook: 'Send email', teams: 'Send Teams message', discord: 'Post to Discord', telegram: 'Send Telegram message', whatsapp: 'Send WhatsApp message', twilio: 'Send SMS', gsheets: 'Add row to Google Sheets', notion: 'Save to Notion', airtable: 'Save to database', jira: 'Create Jira issue', asana: 'Create task', hubspot: 'Update CRM', salesforce: 'Update Salesforce', zendesk: 'Create ticket', github: 'Create GitHub issue', gdrive: 'Save to Google Drive', dropbox: 'Save to Dropbox', s3: 'Upload to S3', stripe: 'Create invoice' };
  const CHANNELS = ['slack', 'gmail', 'outlook', 'teams', 'discord', 'telegram', 'whatsapp', 'twilio'];
  const STORES = ['gsheets', 'notion', 'airtable', 'gdrive', 'dropbox', 's3', 'asana', 'jira', 'hubspot', 'salesforce', 'zendesk', 'github'];

  const dest = (type, re) => ({
    type, re,
    name: t => destName(type, t),
    data: t => {
      const m = t.match(RECIPIENT), who = m ? m[1] : '';
      const target = type === 'slack' || type === 'teams' || type === 'discord' ? '#' + ((who.split(' ')[0] || 'general').replace(/s$/, '') || 'general')
        : type === 'gmail' || type === 'outlook' ? (/customer|client|user|sender|requester/.test(who) ? '{{ email }}' : 'team@company.com') : '';
      return { op: CHANNELS.includes(type) ? 'Send' : 'Create', target };
    }
  });
  function destName(type, t) {
    const m = t.match(RECIPIENT);
    return m && VERB[type] ? `${VERB[type]} ${m[1]}` : (DEFN[type] || 'Send to ' + DEFS[type].name);
  }

  const AIP = {
    classifier: t => /priorit/.test(t) ? 'Classify the priority of the incoming item as high, medium or low. Return only the label.' : 'Classify the item into the most fitting category. Return only the category.',
    summarizer: () => 'Summarise the input in three short bullet points.',
    sentiment: () => 'Rate the sentiment as positive, neutral or negative.',
    extractor: () => 'Extract the key details (names, dates, amounts, action items) from the input.',
    translator: t => { const m = t.match(/translat\w+.*?\bto\s+([a-z]+)/); return `Translate the text to ${m ? cap(m[1]) : 'English'}.`; },
    stt: () => 'Transcribe the audio and label each speaker.'
  };

  const TRIGGERS = [
    { key: 'form', re: /\b(contact form|form submi\w*|submits? (?:a |the |an |our )?(?:\w+ )?form|fills? (?:in|out) (?:a |the |our )?(?:\w+ )?form)/, make: () => ({ type: 'webhook', name: 'Form submitted', data: { path: '/hooks/form' } }) },
    { key: 'sched', re: /\b(every\s+(?:\d+\s+)?(?:day|morning|evening|night|week|weekday|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hour|minute)s?|daily|weekly|monthly|hourly|each\s+(?:morning|day|week|month)|schedule[d]?)\b(?:\s+at\s+\d{1,2}(?::\d{2})?\s?(?:am|pm)?)?/, make: (t, m) => ({ type: 'schedule', name: /^schedule[d]?$/.test(m[0]) ? 'On a schedule' : cap(m[0]), data: { every: /hour/.test(m[0]) ? '1 hour' : /minute/.test(m[0]) ? '15 minutes' : '1 day' } }) },
    { key: 'event', re: /\b(?:when|whenever|once|after|as soon as)\s+(?:a|an|the|any|each|every)?\s*(?:new\s+)?([a-z]+(?:\s[a-z]+){0,2}?)\s+(?:is\s+|are\s+|gets?\s+|has been\s+|have been\s+)?(?:created|added|received|arrives?|submitted|uploaded|posted|comes? in|updated)\b/, make: (t, m) => ({ type: 'webhook', name: 'New ' + m[1].trim(), data: { path: '/hooks/' + m[1].trim().replace(/\s+/g, '-') } }) },
    { key: 'email', re: /\b(?:new|incoming) e-?mails?\b|\b(?:receive|get)s? an? e-?mails?\b/, make: () => ({ type: 'webhook', name: 'New email received', data: { path: '/hooks/email' } }) },
    { key: 'hook', re: /\bwebhook\b/, make: () => ({ type: 'webhook', name: 'Webhook received', data: { path: '/hooks/incoming' } }) },
    { key: 'manual', re: /\b(manual(?:ly)?|on demand|click a button|button)\b/, make: () => ({ type: 'manual', name: 'Start manually', data: {} }) }
  ];

  const STEPS = [
    { type: 'http', re: /\b(scrape|crawl|web ?pages?|websites?|fetch (?:the |a )?(?:page|url|data)|call (?:an |the )?api|http request)\b/, name: t => /scrape|crawl|web|page/.test(t) ? 'Fetch webpage' : 'Call API', data: t => ({ method: 'GET', url: (t.match(/https?:\/\/\S+/) || [''])[0] }) },
    { type: 'stt', re: /\btranscri\w+/, name: () => 'Transcribe audio', data: t => ({ prompt: AIP.stt(t) }) },
    { type: 'kb', re: /\b(knowledge base|search (?:our |the |my )?(?:docs|documents|help ?center)|faq)\b/, name: () => 'Search knowledge base', data: () => ({}) },
    { type: 'extractor', re: /\b(extract|pull out|parse)\b/, name: t => /action item/.test(t) ? 'Extract action items' : 'Extract details', data: t => ({ prompt: AIP.extractor(t) }) },
    { type: 'sentiment', re: /\b(sentiment|tone|mood)\b/, name: () => 'Detect sentiment', data: t => ({ prompt: AIP.sentiment(t) }) },
    { type: 'classifier', re: /\b(classif\w+|categori[sz]\w*|prioriti[sz]\w*|triage|priority)\b/, name: t => /priorit/.test(t) ? 'Classify priority' : 'Classify', data: t => ({ prompt: AIP.classifier(t) }) },
    { type: 'summarizer', re: /\b(summari[sz]\w*|tl;?dr|digest|condense)\b/, name: t => /web ?page|article|page/.test(t) ? 'Summarise page' : 'Summarise', data: t => ({ prompt: AIP.summarizer(t) }) },
    { type: 'translator', re: /\btranslat\w+/, name: () => 'Translate text', data: t => ({ prompt: AIP.translator(t) }) },
    { type: 'text-gen', key: 'analyse', re: /\b(analy[sz]\w*|understand|evaluate|assess)\b/, name: t => { const m = t.match(/analy[sz]\w*\s+(?:the\s+|each\s+|every\s+|a\s+)?([a-z]+)/); return m ? 'Analyse ' + m[1] : 'Analyse'; }, data: () => ({ prompt: 'Analyse the input and describe what the sender wants and any important details.' }) },
    { type: 'text-gen', key: 'draft', re: /\b(draft|write|compose|generate)\b/, name: () => 'Draft reply', data: () => ({ prompt: 'Draft a clear, friendly reply to the input.' }) },
    dest('slack', /\bslack\b/), dest('gmail', /\b(gmail|e-?mails?|inbox)\b/), dest('outlook', /\boutlook\b/), dest('teams', /\b(microsoft )?teams\b/),
    dest('discord', /\bdiscord\b/), dest('telegram', /\btelegram\b/), dest('whatsapp', /\bwhatsapp\b/), dest('twilio', /\b(sms|text message|twilio)\b/),
    dest('gsheets', /\b(google sheets?|spreadsheet|sheets?)\b/), dest('notion', /\bnotion\b/), dest('airtable', /\b(airtable|database|softr)\b/),
    dest('jira', /\bjira\b/), dest('asana', /\b(asana|tasks?)\b/), dest('hubspot', /\b(hubspot|crm)\b/), dest('salesforce', /\bsalesforce\b/),
    dest('zendesk', /\bzendesk\b/), dest('github', /\bgithub\b/), dest('gdrive', /\bgoogle drive\b/), dest('dropbox', /\bdropbox\b/), dest('s3', /\b(s3|aws bucket)\b/)
  ];
  const keyOf = s => s.key || s.type;
  const nodeSpec = (s, t, m) => ({ type: s.type, name: s.name(t, m), data: s.data(t, m), key: keyOf(s) });

  function findTrigger(t) {
    let best = null;
    for (const tr of TRIGGERS) {
      const m = tr.re.exec(t);
      if (m && (!best || m.index < best.idx)) best = { tr, idx: m.index, end: m.index + m[0].length, m };
    }
    return best ? { spec: best.tr.make(t, best.m), idx: best.idx, end: best.end } : null;
  }
  function matchSteps(t) {
    const out = [];
    for (const s of STEPS) { const m = s.re.exec(t); if (m) out.push({ s, idx: m.index, len: m[0].length, m }); }
    return out.sort((a, b) => a.idx - b.idx);
  }
  // steps mentioned in the text, plus the implied ones (notification channel, where to save)
  function resolveSteps(t, trig) {
    const notes = [];
    let found = matchSteps(t);
    if (trig) found = found.filter(f => !(f.idx >= trig.idx && f.idx < trig.end));
    const seen = new Set(); found = found.filter(f => !seen.has(keyOf(f.s)) && seen.add(keyOf(f.s)));
    const nm = /\b(notif\w+|alert|let .{1,30} know|ping)\b/.exec(t);
    const inTrig = nm && trig && nm.index >= trig.idx && nm.index < trig.end;
    if (nm && !inTrig && !found.some(f => CHANNELS.includes(f.s.type))) {
      const s = STEPS.find(x => x.type === 'slack'); found.push({ s, idx: nm.index, len: nm[0].length, m: nm });
      notes.push('You asked for a notification but did not name a channel, so I used Slack.');
    }
    const sv = /\b(store|save|log|keep|record)\b/.exec(t);
    if (sv && !found.some(f => STORES.includes(f.s.type))) {
      const s = STEPS.find(x => x.type === 'gsheets'); found.push({ s, idx: sv.index, len: sv[0].length, m: sv });
      notes.push('You did not say where to save the results, so I used Google Sheets.');
    }
    found.sort((a, b) => a.idx - b.idx);
    return { found, notes };
  }

  function plan(prompt) {
    const t = prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    const trig = findTrigger(t);
    const { found, notes } = resolveSteps(t, trig);
    let steps = found.map(f => nodeSpec(f.s, t, f.m));
    if (!steps.length) return { steps: [], notes: [] };

    // optional "only if urgent / high priority" check
    const wantIf = /\bif\b|\bunless\b|only (?:if|when)|urgent|high[- ]priority/.test(t);
    if (wantIf) {
      const urgent = /urgent|priorit/.test(t);
      const isAI = x => x.type === 'classifier' || x.type === 'sentiment';
      let ai = -1; steps.forEach((x, i) => { if (isAI(x)) ai = i; });
      const firstDest = steps.findIndex(x => CHANNELS.includes(x.type) || STORES.includes(x.type));
      if (urgent && !steps.some(x => x.type === 'classifier')) {
        const at = firstDest >= 0 ? firstDest : steps.length;
        steps.splice(at, 0, { type: 'classifier', name: 'Classify urgency', key: 'classifier', data: { prompt: 'Classify how urgent the item is: high, medium or low. Return only the label.' } });
        ai = at; notes.push('Nothing in your request produced an urgency value, so I added a classifier to feed the check.');
      }
      if (ai >= 0 && ai < steps.length - 1) {
        const neg = !urgent && steps.some(x => x.type === 'sentiment') && /negative|angry|unhappy/.test(t);
        steps.splice(ai + 1, 0, neg
          ? { type: 'if', name: 'Is sentiment negative?', key: 'if', data: { left: '{{ sentiment }}', op: 'equals', right: 'negative' } }
          : { type: 'if', name: /urgent/.test(t) ? 'Is it urgent?' : 'Is it high priority?', key: 'if', data: { left: '{{ priority }}', op: 'equals', right: 'high' } });
        notes.push('The “No” branch of the check is empty. Add steps there if something should happen otherwise.');
      }
    }

    let trigSpec = trig ? trig.spec : { type: 'manual', name: 'Start manually', data: {} };
    if (!trig) notes.unshift('No trigger was mentioned, so the workflow starts manually.');
    else if (trigSpec.type === 'webhook') notes.unshift('The trigger listens on a webhook URL. Paste it into your form or app so it can call this workflow.');
    if (/\bsoftr\b/.test(t) && steps.some(x => x.type === 'airtable')) notes.push('Softr is not a connected app yet, so I used Airtable as the database. You can swap it later.');
    if (steps.some(x => DEFS[x.type].cat === 'ai')) notes.push('AI steps use Claude Sonnet 5.5 with prompts I drafted. Edit them if you want different behaviour.');

    const all = [trigSpec, ...steps].map((s, i) => ({ ...s, k: 'k' + i }));
    const edges = all.slice(1).map((s, i) => [all[i].k, 0, s.k]);
    return { steps: all, edges, notes };
  }

  /* =====================================================
     Editing an existing workflow from chat
     ===================================================== */
  const cloneG = () => ({ nodes: JSON.parse(JSON.stringify(AB.state.nodes)), edges: JSON.parse(JSON.stringify(AB.state.edges)) });
  function mkNode(spec, x, y) {
    const data = Object.assign(defaultsFor(DEFS[spec.type], []), spec.data || {}); data.name = spec.name;
    return { id: AB.nid(), type: spec.type, x, y, data };
  }
  function tailNode(g) {
    const leaves = g.nodes.filter(n => !g.edges.some(e => e.from === n.id) && n.type !== 'stop');
    return (leaves.length ? leaves : g.nodes).reduce((a, b) => (b.x > a.x ? b : a), (leaves.length ? leaves : g.nodes)[0]);
  }
  function findTarget(frag, nodes) {
    frag = frag.trim(); if (!frag || !nodes.length) return null;
    if (/\b(last|final)\b/.test(frag)) return tailNode({ nodes, edges: AB.state.edges });
    if (/\b(trigger|first|start)\b/.test(frag)) return nodes.find(n => DEFS[n.type].cat === 'triggers') || null;
    let best = null, score = 0;
    for (const n of nodes) {
      const words = n.data.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
      const s = words.filter(w => frag.includes(w)).length; if (s > score) { score = s; best = n; }
    }
    if (best) return best;
    for (const n of nodes) { const sp = STEPS.find(s => s.type === n.type); if (sp && sp.re.test(frag)) return n; }
    return null;
  }
  function removeNode(g, id) {
    const preds = g.edges.filter(e => e.to === id), succs = g.edges.filter(e => e.from === id);
    g.edges = g.edges.filter(e => e.from !== id && e.to !== id);
    for (const p of preds) for (const s of succs) {
      if (p.from !== s.to && !g.edges.some(e => e.from === p.from && e.port === p.port && e.to === s.to)) g.edges.push({ id: AB.eid(), from: p.from, port: p.port, to: s.to });
    }
    g.nodes = g.nodes.filter(n => n.id !== id);
  }
  function swapNode(g, n, spec) {
    n.type = spec.type; n.data = Object.assign(defaultsFor(DEFS[spec.type], []), spec.data || {}); n.data.name = spec.name;
    const d = DEFS[spec.type];
    g.edges = g.edges.filter(e => !(e.from === n.id && e.port >= d.outputs.length) && !(e.to === n.id && !d.inputs));
  }
  function addAfter(g, anchor, spec) {
    const out = g.edges.filter(e => e.from === anchor.id);
    const node = mkNode(spec, anchor.x + 300, anchor.y);
    if (out.length) {
      g.nodes.forEach(n => { if (n.x > anchor.x) n.x += 300; });
      g.edges = g.edges.filter(e => !out.includes(e));
      g.nodes.push(node);
      [...new Set(out.map(e => e.port))].forEach(p => g.edges.push({ id: AB.eid(), from: anchor.id, port: p, to: node.id }));
      out.forEach(e => g.edges.push({ id: AB.eid(), from: node.id, port: 0, to: e.to }));
    } else {
      while (g.nodes.some(n => Math.abs(n.x - node.x) < 250 && Math.abs(n.y - node.y) < 100)) node.y += 130;
      g.nodes.push(node); g.edges.push({ id: AB.eid(), from: anchor.id, port: 0, to: node.id });
    }
    return node;
  }

  const HELP = 'I can add, remove or swap steps. Try “add a Slack notification”, “add an email to the customer”, “remove the last step” or “change the trigger to schedule”.';
  function applyEdit(text) {
    const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const g = cloneG(); let m;

    if ((m = /\b(?:remove|delete|drop|get rid of|take out)\b\s*(.*)$/.exec(t))) {
      const n = findTarget(m[1], g.nodes);
      if (!n) return { reply: `I could not tell which step to remove. Name it, for example “remove ${g.nodes[g.nodes.length - 1].data.name}”.` };
      const wasTrig = DEFS[n.type].cat === 'triggers';
      removeNode(g, n.id);
      return { g, fit: false, reply: `Removed **${n.data.name}** and reconnected the steps around it.${wasTrig ? ' The workflow now has no trigger, so add one before deploying.' : ''}` };
    }

    if ((m = /\b(?:replace|swap|change|switch)\s+(?:the\s+)?(.+?)\s+(?:with|to|for|by)\s+(?:a\s+|an\s+|the\s+)?(.+)$/.exec(t))) {
      const left = m[1], right = m[2];
      if (/\b(trigger|start)\b/.test(left)) {
        const tr = findTrigger(right); const cur = g.nodes.find(n => DEFS[n.type].cat === 'triggers');
        if (!tr) return { reply: 'Which trigger should I use? For example “change the trigger to schedule” or “…to a webhook”.' };
        if (!cur) return { reply: 'There is no trigger to change yet. Say “add a schedule trigger” and I will add one.' };
        const old = cur.data.name; swapNode(g, cur, tr.spec);
        return { g, fit: false, ids: [cur.id], reply: `Changed the trigger from **${old}** to **${cur.data.name}**.` };
      }
      const target = findTarget(left, g.nodes);
      const spec = matchSteps(right)[0];
      if (!target) return { reply: 'I could not find that step on the canvas. Try naming it the way it appears on the node.' };
      if (!spec) return { reply: 'I do not know that step yet. Try Slack, email, Google Sheets, Notion, Asana, an AI step like summarise or classify, or an API call.' };
      const old = target.data.name; swapNode(g, target, nodeSpec(spec.s, right, spec.m));
      return { g, fit: false, ids: [target.id], reply: `Replaced **${old}** with **${target.data.name}**.` };
    }

    if (/\b(add|insert|include|also|then|append|plus)\b/.test(t)) {
      const am = /\bafter\s+(?:the\s+)?(.+)$/.exec(t);
      const head = am ? t.slice(0, am.index) : t;
      let found = matchSteps(head).map(f => ({ s: f.s, m: f.m }));
      const seen = new Set(); found = found.filter(f => !seen.has(keyOf(f.s)) && seen.add(keyOf(f.s)));
      if (!found.length && /\b(notif\w+|alert|ping)\b/.test(head)) found = [{ s: STEPS.find(x => x.type === 'slack'), m: null }];
      if (!found.length) return { reply: 'I do not recognise that step yet. Try Slack, email, Google Sheets, Notion, Asana, or an AI step like summarise, classify or translate.' };
      let anchor = tailNode(g);
      if (am) { anchor = findTarget(am[1], g.nodes); if (!anchor) return { reply: 'I could not find the step to add it after. Name it the way it appears on the node.' }; }
      if (!anchor) return { reply: 'The canvas is empty. Describe the whole workflow first and I will build it.' };
      const ids = []; const names = [];
      for (const f of found) { const node = addAfter(g, anchor, nodeSpec(f.s, head, f.m)); ids.push(node.id); names.push(node.data.name); anchor = node; }
      const needs = g.nodes.filter(n => ids.includes(n.id) && AB.needsSetup(n)).length;
      return { g, fit: true, ids, reply: `Added **${names.join('**, **')}** ${am ? 'after ' + findTarget(am[1], g.nodes).data.name : 'at the end'}.${needs ? ' It needs a connection, so click it to finish setup.' : ''}` };
    }
    return { reply: HELP };
  }

  /* =====================================================
     Chat UI
     ===================================================== */
  const msgs = $('#msgs'), input = $('#chatInput');
  let busy = false, reviewIds = [], reviewHost = null;

  const scroll = () => { msgs.scrollTop = msgs.scrollHeight; };
  function addUser(text) { const d = document.createElement('div'); d.className = 'msg user'; d.textContent = text; msgs.appendChild(d); scroll(); }
  function addAI() {
    const d = document.createElement('div'); d.className = 'msg ai';
    d.innerHTML = `<div class="av">${ico('sparkles', 14)}</div><div class="body"></div>`; msgs.appendChild(d); scroll();
    return $('.body', d);
  }
  async function say(body, text) {
    const p = document.createElement('p'); body.appendChild(p);
    const words = text.split(' ');
    let cur = '';
    for (const w of words) { cur += (cur ? ' ' : '') + w; p.innerHTML = fmt(cur); scroll(); await sleep(14); }
    return p;
  }
  async function think(body, labels, gap = 420) {
    const box = document.createElement('div'); box.className = 'think'; body.appendChild(box);
    box.innerHTML = labels.map(l => `<div class="wait"><i></i>${esc(l)}</div>`).join(''); scroll();
    const rows = [...box.children];
    for (let i = 0; i < rows.length; i++) {
      rows[i].className = ''; await sleep(gap);
      rows[i].className = 'ok'; rows[i].querySelector('i').innerHTML = ico('check', 9, 4);
    }
    await sleep(120); box.remove();
  }
  function flash(ids) {
    (ids || []).forEach(id => { const el = document.querySelector(`.node[data-id="${id}"]`); if (el) { el.classList.add('fresh'); setTimeout(() => el.classList.remove('fresh'), 900); } });
  }

  /* review card (AI output always needs a human check) */
  const fixText = n => { const d = DEFS[n.type]; return d.cat === 'integrations' ? `Connect ${d.name}` : d.id === 'http' ? 'Add the URL' : 'Write the prompt'; };
  function renderReview() {
    if (!reviewHost || !reviewHost.isConnected) return;
    const items = reviewIds.map(id => { const n = AB.byId(id); return { id, n, done: !n || !AB.needsSetup(n) }; });
    const total = items.length + 1, done = items.filter(i => i.done).length + (AB.ran ? 1 : 0);
    reviewHost.className = 'review' + (done === total ? ' good' : '');
    let h = `<h5>Review before you run <small>${done} of ${total} done</small></h5>`;
    for (const i of items) h += `<button class="rv${i.done ? ' done' : ''}" data-id="${i.id}"><span class="box">${i.done ? ico('check', 11, 3) : ''}</span><span class="t">${esc(i.n ? i.n.data.name : 'Removed step')}</span><small>${i.n ? fixText(i.n) : ''}</small></button>`;
    h += `<button class="rv${AB.ran ? ' done' : ''}" data-run="1"><span class="box">${AB.ran ? ico('check', 11, 3) : ''}</span><span class="t">Run a test</span><small>Press Run Workflow</small></button>`;
    if (done === total) h += '<div class="ready">Looks good. Ready to deploy when you are.</div>';
    reviewHost.innerHTML = h;
  }
  msgs.addEventListener('click', e => {
    const b = e.target.closest('.rv'); if (!b) return;
    if (b.dataset.run) return $('#btnRun').click();
    const n = AB.byId(b.dataset.id); if (n) { AB.focus(n.id); AB.select({ type: 'node', id: n.id }); }
  });
  AB.listeners.push(renderReview);

  function pathHTML(steps) {
    return `<div class="path">${steps.map((s, i) => `${i ? '<em>→</em>' : ''}<span><i style="background:${colorOf(s.type)}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  }

  /* generate a brand new workflow */
  async function build(text) {
    const body = addAI();
    const p = plan(text);
    await think(body, ['Reading your request', 'Choosing the right steps', 'Connecting the steps', 'Checking what still needs setup']);
    if (p.steps.length < 2) {
      await say(body, 'I could not turn that into steps yet. Mention what should start it (for example “when a form is submitted” or “every morning”), what should happen (summarise, classify, fetch a page) and where the result should go (Slack, email, a spreadsheet).');
      return;
    }
    const nodes = p.steps.map((s, i) => {
      const id = AB.nid(); s._id = id;
      const data = Object.assign(defaultsFor(DEFS[s.type], []), s.data || {}); data.name = s.name;
      return { id, type: s.type, x: i * 300, y: 0, data };
    });
    const idOf = Object.fromEntries(p.steps.map(s => [s.k, s._id]));
    const edges = p.edges.map(([a, port, b]) => ({ id: AB.eid(), from: idOf[a], port, to: idOf[b] }));

    // set the view for the finished graph, then draw it step by step
    AB.load(nodes, edges, { silent: true });
    AB.load([], [], { fit: false, silent: true });
    for (let i = 0; i < nodes.length; i++) {
      const ids = new Set(nodes.slice(0, i + 1).map(n => n.id));
      AB.load(nodes.slice(0, i + 1), edges.filter(e => ids.has(e.from) && ids.has(e.to)), { fit: false, silent: true });
      flash([nodes[i].id]); await sleep(330);
    }
    AB.load(nodes, edges, { fit: false });

    reviewIds = nodes.filter(n => AB.needsSetup(n)).map(n => n.id);
    await say(body, `Done. I built a ${nodes.length}-step workflow:`);
    body.insertAdjacentHTML('beforeend', pathHTML(p.steps));
    if (p.notes.length) body.insertAdjacentHTML('beforeend', `<div class="assume"><h5>What I assumed</h5><ul>${p.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`);
    reviewHost = document.createElement('div'); body.appendChild(reviewHost); renderReview();
    await say(body, 'Check the highlighted steps, then ask me to change anything, for example “add an email to the customer”.');
  }

  /* change the workflow that is already on the canvas */
  async function modify(text) {
    const body = addAI();
    await think(body, ['Understanding the change', 'Updating the workflow'], 350);
    const r = applyEdit(text);
    if (r.g) {
      AB.load(r.g.nodes, r.g.edges, { fit: r.fit !== false });
      flash(r.ids);
      (r.ids || []).forEach(id => { const n = AB.byId(id); if (n && AB.needsSetup(n) && !reviewIds.includes(id)) reviewIds.push(id); });
      renderReview();
    }
    await say(body, r.reply);
  }

  async function send(text) {
    text = (text || '').trim(); if (!text || busy) return;
    busy = true; $('#chatSend').disabled = true;
    hideLanding(); addUser(text); input.value = '';
    try { if (AB.state.nodes.length) await modify(text); else await build(text); }
    finally { busy = false; $('#chatSend').disabled = false; renderSugg(); }
  }

  function renderSugg() {
    const has = AB.state.nodes.length > 0;
    const list = has ? ['Add a Slack notification', 'Add an email to the customer', 'Change the trigger to schedule', 'Remove the last step'] : [];
    $('#sugg').innerHTML = list.map(s => `<button>${esc(s)}</button>`).join('');
  }
  $('#sugg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(b.textContent); });

  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  $('#chatSend').innerHTML = ico('arrow', 16); $('#chatSend').addEventListener('click', () => send(input.value));

  /* =====================================================
     Landing (step 1) and wiring
     ===================================================== */
  const EXAMPLES = [
    'Whenever a customer submits a contact form, analyse the enquiry, classify its priority and send a notification to the sales team.',
    'Every weekday at 9am, fetch my unread emails, summarise them and post the digest to Slack.',
    'When a new support ticket is created, detect the sentiment and alert the support team on Slack if it is urgent.',
    'A workflow to summarize webpages and store them in my Softr database',
    'When a meeting recording is uploaded, transcribe it, extract the action items and create tasks in Asana.'
  ];
  $('#landEx').innerHTML = EXAMPLES.map(e => `<button class="ex">${ico('sparkles', 14)}<span>${esc(e)}</span></button>`).join('');
  $('#landEx').addEventListener('click', e => { const b = e.target.closest('.ex'); if (b) $('#landInput').value = b.textContent.trim(); $('#landInput').focus(); });
  $('#landSend').innerHTML = ico('arrow', 18);
  $('#landSend').addEventListener('click', () => send($('#landInput').value));
  $('#landInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('#landInput').value); } });

  function hideLanding() { const l = $('#landing'); l.classList.add('out'); setTimeout(() => { l.hidden = true; }, 320); }
  function showLanding() { const l = $('#landing'); l.hidden = false; requestAnimationFrame(() => l.classList.remove('out')); $('#landInput').value = ''; $('#landInput').focus(); }
  function greet() {
    const b = addAI();
    b.innerHTML = '<p>Hi! Tell me what you want to automate and I will build it on the canvas. Say what starts it, what should happen, and where the result goes.</p>';
  }
  $('#landBlank').addEventListener('click', () => { hideLanding(); if (!msgs.children.length) greet(); });
  $('#landX').addEventListener('click', () => { hideLanding(); if (!msgs.children.length) greet(); });
  $('#landTpl').addEventListener('click', () => { if (window.parent !== window) window.parent.postMessage({ type: 'ux-nav', to: '#/option/2' }, '*'); });

  $('#chatNew').addEventListener('click', () => {
    if (busy) return;
    msgs.innerHTML = ''; reviewIds = []; reviewHost = null;
    AB.load([], [], { fit: false }); renderSugg(); showLanding();
  });
  $('#btnAI').addEventListener('click', () => { if (!$('#landing').hidden) return; input.focus(); });

  renderSugg();
  setTimeout(() => $('#landInput').focus(), 100);
})();
