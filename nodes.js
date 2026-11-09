/* Node catalogue, icons and config schema for the Agent Builder demo */

const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  save: '<path d="M5 3h11l3 3v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  rocket: '<path d="M5 15c-1 1-2 4-2 6 2 0 5-1 6-2M14 4c3-1 6-1 7-1 0 1 0 4-1 7l-7 7-6-6z"/><circle cx="15.5" cy="8.5" r="1.4"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M15 6.3A6 6 0 1 1 8.5 20M7 7.5h3a1 1 0 0 1 0 2H8a1 1 0 0 0 0 2h3"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 5-12 2-12 7"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5"/>',
  warn: '<path d="M12 4 2.5 20h19zM12 10v4M12 17.5h0"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};

function ico(name, size = 18, sw = 1.8) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;
}

const CATS = [
  { id: 'ai',           name: 'AI / LLM',             color: '#7c3aed', icon: 'sparkles' },
  { id: 'triggers',     name: 'Triggers',             color: '#d97706', icon: 'zap' },
  { id: 'logic',        name: 'Logic & Flow Control', color: '#0d9488', icon: 'branch' },
  { id: 'data',         name: 'Data Processing',      color: '#2563eb', icon: 'data' },
  { id: 'utilities',    name: 'Core Utilities',       color: '#64748b', icon: 'sliders' },
  { id: 'integrations', name: 'Integrations',         color: '#475569', icon: 'plug' },
  { id: 'api',          name: 'API & HTTP',           color: '#ea580c', icon: 'globe' },
  { id: 'knowledge',    name: 'Knowledge / Context',  color: '#db2777', icon: 'book' },
  { id: 'memory',       name: 'Memory & State',       color: '#16a34a', icon: 'layers' }
];

// [category, id, name, description, options]
const RAW_NODES = [
  // AI / LLM (13)
  ['ai', 'llm-chat', 'LLM Chat', 'Chat with a language model'],
  ['ai', 'text-gen', 'Text Generation', 'Generate text from a prompt'],
  ['ai', 'summarizer', 'Summarizer', 'Condense text into key points'],
  ['ai', 'classifier', 'Classifier', 'Label text by category or priority'],
  ['ai', 'sentiment', 'Sentiment Analysis', 'Detect tone and sentiment'],
  ['ai', 'extractor', 'Entity Extractor', 'Pull names, dates and amounts'],
  ['ai', 'translator', 'Translator', 'Translate between languages'],
  ['ai', 'embeddings', 'Embeddings', 'Convert text into vectors'],
  ['ai', 'image-gen', 'Image Generation', 'Create images from text'],
  ['ai', 'vision', 'Vision Analyzer', 'Understand images and screenshots'],
  ['ai', 'stt', 'Speech to Text', 'Transcribe audio'],
  ['ai', 'tts', 'Text to Speech', 'Generate spoken audio'],
  ['ai', 'agent', 'AI Agent', 'Autonomous agent with tools'],
  // Triggers (3)
  ['triggers', 'manual', 'Manual Trigger', 'Start the workflow on demand'],
  ['triggers', 'webhook', 'Webhook', 'Start when a URL is called'],
  ['triggers', 'schedule', 'Schedule', 'Run on a timer or cron'],
  // Logic & Flow Control (8)
  ['logic', 'if', 'If / Else', 'Branch on a condition', { outputs: ['True', 'False'] }],
  ['logic', 'switch', 'Switch', 'Route to one of many paths', { outputs: ['Case 1', 'Case 2', 'Default'] }],
  ['logic', 'loop', 'Loop', 'Repeat for each item', { outputs: ['Each item', 'Done'] }],
  ['logic', 'merge', 'Merge', 'Combine branches into one'],
  ['logic', 'split', 'Split', 'Run branches in parallel', { outputs: ['Branch A', 'Branch B'] }],
  ['logic', 'wait', 'Wait', 'Pause for a time or event'],
  ['logic', 'retry', 'Retry', 'Retry a step on failure'],
  ['logic', 'stop', 'Stop & Error', 'End the run with an error', { outputs: [] }],
  // Data Processing (13)
  ['data', 'set', 'Set Fields', 'Add or rename fields'],
  ['data', 'filter', 'Filter', 'Keep items that match'],
  ['data', 'sort', 'Sort', 'Order items by a field'],
  ['data', 'aggregate', 'Aggregate', 'Group and summarise items'],
  ['data', 'map', 'Map', 'Transform every item'],
  ['data', 'json-parse', 'JSON Parse', 'Turn text into JSON'],
  ['data', 'json-str', 'JSON Stringify', 'Turn JSON into text'],
  ['data', 'csv', 'CSV Parser', 'Read rows from CSV'],
  ['data', 'regex', 'Regex Extract', 'Extract text with a pattern'],
  ['data', 'template', 'Template', 'Fill a text template'],
  ['data', 'dedupe', 'Deduplicate', 'Remove duplicate items'],
  ['data', 'date', 'Date Formatter', 'Format and shift dates'],
  ['data', 'code', 'Code (JS)', 'Run custom JavaScript'],
  // Core Utilities (4)
  ['utilities', 'note', 'Sticky Note', 'Leave a comment on the canvas'],
  ['utilities', 'logger', 'Logger', 'Write a message to the run log'],
  ['utilities', 'timer', 'Timer', 'Measure how long a step takes'],
  ['utilities', 'uuid', 'UUID Generator', 'Create a unique ID'],
  // Integrations (30)
  ['integrations', 'slack', 'Slack', 'Send messages to channels', { color: '#4a154b', abbr: 'Sl' }],
  ['integrations', 'gmail', 'Gmail', 'Read and send email', { color: '#d93025', abbr: 'Gm' }],
  ['integrations', 'outlook', 'Outlook', 'Read and send email', { color: '#0a64ad', abbr: 'Ol' }],
  ['integrations', 'gsheets', 'Google Sheets', 'Read and write rows', { color: '#188038', abbr: 'Gs' }],
  ['integrations', 'gdrive', 'Google Drive', 'Manage files and folders', { color: '#f4b400', abbr: 'Gd' }],
  ['integrations', 'gcal', 'Google Calendar', 'Create and read events', { color: '#1a73e8', abbr: 'Gc' }],
  ['integrations', 'notion', 'Notion', 'Pages and databases', { color: '#18181b', abbr: 'No' }],
  ['integrations', 'airtable', 'Airtable', 'Bases and records', { color: '#2d7ff9', abbr: 'At' }],
  ['integrations', 'trello', 'Trello', 'Boards and cards', { color: '#0079bf', abbr: 'Tr' }],
  ['integrations', 'jira', 'Jira', 'Issues and projects', { color: '#0052cc', abbr: 'Ji' }],
  ['integrations', 'asana', 'Asana', 'Tasks and projects', { color: '#f06a6a', abbr: 'As' }],
  ['integrations', 'github', 'GitHub', 'Issues, PRs and repos', { color: '#24292f', abbr: 'Gh' }],
  ['integrations', 'gitlab', 'GitLab', 'Issues and pipelines', { color: '#fc6d26', abbr: 'Gl' }],
  ['integrations', 'discord', 'Discord', 'Post to servers', { color: '#5865f2', abbr: 'Dc' }],
  ['integrations', 'telegram', 'Telegram', 'Send bot messages', { color: '#229ed9', abbr: 'Tg' }],
  ['integrations', 'whatsapp', 'WhatsApp', 'Send business messages', { color: '#25d366', abbr: 'Wa' }],
  ['integrations', 'twilio', 'Twilio', 'SMS and voice', { color: '#f22f46', abbr: 'Tw' }],
  ['integrations', 'sendgrid', 'SendGrid', 'Transactional email', { color: '#1a82e2', abbr: 'Sg' }],
  ['integrations', 'stripe', 'Stripe', 'Payments and customers', { color: '#635bff', abbr: 'St' }],
  ['integrations', 'shopify', 'Shopify', 'Orders and products', { color: '#5e8e3e', abbr: 'Sh' }],
  ['integrations', 'hubspot', 'HubSpot', 'Contacts and deals', { color: '#ff7a59', abbr: 'Hs' }],
  ['integrations', 'salesforce', 'Salesforce', 'Leads and accounts', { color: '#00a1e0', abbr: 'Sf' }],
  ['integrations', 'zendesk', 'Zendesk', 'Support tickets', { color: '#03363d', abbr: 'Zd' }],
  ['integrations', 'intercom', 'Intercom', 'Conversations and users', { color: '#1f8ded', abbr: 'Ic' }],
  ['integrations', 'dropbox', 'Dropbox', 'Files and sharing', { color: '#0061ff', abbr: 'Db' }],
  ['integrations', 's3', 'AWS S3', 'Buckets and objects', { color: '#e25444', abbr: 'S3' }],
  ['integrations', 'mysql', 'MySQL', 'Run SQL queries', { color: '#00758f', abbr: 'My' }],
  ['integrations', 'postgres', 'PostgreSQL', 'Run SQL queries', { color: '#336791', abbr: 'Pg' }],
  ['integrations', 'mongodb', 'MongoDB', 'Documents and collections', { color: '#13aa52', abbr: 'Mg' }],
  ['integrations', 'teams', 'Microsoft Teams', 'Post to channels', { color: '#5059c9', abbr: 'Mt' }],
  // API & HTTP (4)
  ['api', 'http', 'HTTP Request', 'Call any REST API'],
  ['api', 'graphql', 'GraphQL', 'Query a GraphQL endpoint'],
  ['api', 'respond', 'Webhook Response', 'Reply to the caller'],
  ['api', 'oauth', 'OAuth2 Auth', 'Authorise with OAuth2'],
  // Knowledge / Context (1)
  ['knowledge', 'kb', 'Knowledge Base', 'Search your documents'],
  // Memory & State (4)
  ['memory', 'conv-mem', 'Conversation Memory', 'Remember the chat history'],
  ['memory', 'kv', 'Key-Value Store', 'Store and read values'],
  ['memory', 'vec-mem', 'Vector Memory', 'Semantic long-term memory'],
  ['memory', 'session', 'Session State', 'Share data across steps']
];

const NODE_DEFS = RAW_NODES.map(([cat, id, name, desc, o = {}]) => ({
  cat, id, name, desc,
  inputs: cat === 'triggers' ? 0 : 1,
  outputs: o.outputs || [''],
  color: o.color || null,
  abbr: o.abbr || null
}));

const MODELS = ['Claude Sonnet 5.5', 'Claude Opus 5.5', 'Claude Haiku 5.5', 'GPT-4o', 'Gemini 2.5 Pro'];

// Settings form for each node type. `def` is the default value.
function fieldsFor(d) {
  const name = { k: 'name', label: 'Node name', type: 'text' };
  const notes = { k: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Add a note for your team…' };
  let f = [];
  switch (d.id) {
    case 'webhook':
      f = [{ k: 'method', label: 'HTTP method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'], def: 'POST' },
           { k: 'path', label: 'Path', type: 'text', def: '/hooks/new-request' }]; break;
    case 'schedule':
      f = [{ k: 'every', label: 'Run every', type: 'select', options: ['5 minutes', '15 minutes', '1 hour', '1 day', 'Custom cron'], def: '1 hour' }]; break;
    case 'manual': f = []; break;
    case 'if':
      f = [{ k: 'left', label: 'Value', type: 'text', def: '{{ priority }}' },
           { k: 'op', label: 'Operator', type: 'select', options: ['equals', 'not equals', 'contains', 'greater than', 'less than', 'is empty'], def: 'equals' },
           { k: 'right', label: 'Compare to', type: 'text', def: 'high' }]; break;
    case 'switch':
      f = [{ k: 'field', label: 'Switch on', type: 'text', def: '{{ category }}' }]; break;
    case 'loop':
      f = [{ k: 'items', label: 'Items', type: 'text', def: '{{ items }}' },
           { k: 'batch', label: 'Batch size', type: 'number', def: 1 }]; break;
    case 'wait':
      f = [{ k: 'secs', label: 'Wait (seconds)', type: 'number', def: 5 }]; break;
    case 'note':
      return [name, { k: 'text', label: 'Text', type: 'textarea', rows: 5, def: '' }];
    case 'logger':
      f = [{ k: 'message', label: 'Message', type: 'text', def: 'Reached {{ node }}' }]; break;
    case 'http':
      f = [{ k: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], def: 'GET' },
           { k: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/items', def: '' },
           { k: 'headers', label: 'Headers (JSON)', type: 'textarea', rows: 3, def: '{}' }]; break;
    default:
      switch (d.cat) {
        case 'ai':
          f = [{ k: 'model', label: 'Model', type: 'select', options: MODELS, def: MODELS[0] },
               { k: 'prompt', label: 'Prompt', type: 'textarea', rows: 5, placeholder: 'Describe what the AI should do. Use {{ variables }} from earlier steps.', def: '' },
               { k: 'temp', label: 'Creativity', type: 'range', def: 0.7 }]; break;
        case 'integrations':
          f = [{ k: 'conn', label: 'Connection', type: 'select', options: ['', 'SNS Demo Account'], def: '' },
               { k: 'op', label: 'Operation', type: 'select', options: ['Send', 'Get', 'Create', 'Update', 'Delete'], def: 'Send' },
               { k: 'target', label: 'Target', type: 'text', placeholder: 'Channel, sheet, table or ID', def: '' }]; break;
        case 'api':
          f = [{ k: 'url', label: 'Endpoint', type: 'text', placeholder: 'https://api.example.com/graphql', def: '' }]; break;
        case 'data':
          f = [{ k: 'expr', label: 'Expression', type: 'textarea', rows: 4, def: '{{ $json }}' }]; break;
        case 'knowledge':
          f = [{ k: 'source', label: 'Source', type: 'select', options: ['Company docs', 'Support articles', 'Uploaded files'], def: 'Company docs' },
               { k: 'topk', label: 'Results to return', type: 'number', def: 4 }]; break;
        case 'memory':
          f = [{ k: 'key', label: 'Key', type: 'text', def: 'session_id' },
               { k: 'ttl', label: 'Keep for', type: 'select', options: ['1 hour', '1 day', '30 days', 'Forever'], def: '1 day' }]; break;
        default: f = [];
      }
  }
  return [name, ...f, notes];
}

function defaultsFor(d, existingNames) {
  const data = {};
  for (const f of fieldsFor(d)) if (f.def !== undefined) data[f.k] = f.def;
  let base = d.name, nm = base, i = 2;
  while (existingNames.includes(nm)) nm = `${base} ${i++}`;
  data.name = nm;
  return data;
}
