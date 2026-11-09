/* Workflow template catalogue for Option 2.
   Node: { k: key, type: node id, c: column, r: row, name, data: {overrides} }
   Edge: [fromKey, outputPort, toKey] */

const TPL_CATS = ['All', 'Sales', 'Support', 'Productivity', 'Marketing', 'HR', 'Reporting', 'Documents', 'AI Agents'];

const TEMPLATES = [
  {
    id: 'enquiry-priority', name: 'Contact form to sales alert', cat: 'Sales', featured: true, level: 'Beginner', time: '5 min',
    desc: 'When a customer submits a contact form, analyse the enquiry, classify its priority and notify the sales team.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 1, name: 'Contact form submitted', data: { path: '/hooks/contact-form' } },
      { k: 'b', type: 'classifier', c: 1, r: 1, name: 'Classify priority', data: { prompt: 'Read the enquiry and classify its priority as high, medium or low. Return only the label.' } },
      { k: 'c', type: 'if', c: 2, r: 1, name: 'Is it high priority?', data: { left: '{{ priority }}', op: 'equals', right: 'high' } },
      { k: 'd', type: 'slack', c: 3, r: 0, name: 'Alert sales team', data: { op: 'Send', target: '#sales-leads' } },
      { k: 'e', type: 'gmail', c: 3, r: 2, name: 'Send auto-reply', data: { op: 'Send', target: '{{ email }}' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd'], ['c', 1, 'e']]
  },
  {
    id: 'email-digest', name: 'Daily email digest to Slack', cat: 'Productivity', featured: true, level: 'Beginner', time: '3 min',
    desc: 'Every weekday morning, fetch unread emails, summarise them with action items and post the digest to a Slack channel.',
    nodes: [
      { k: 'a', type: 'schedule', c: 0, r: 0, name: 'Every weekday 9am', data: { every: '1 day' } },
      { k: 'b', type: 'gmail', c: 1, r: 0, name: 'Fetch unread emails', data: { op: 'Get', target: 'INBOX' } },
      { k: 'c', type: 'summarizer', c: 2, r: 0, name: 'Summarise emails', data: { prompt: 'Summarise these emails into five bullet points and list any action items.' } },
      { k: 'd', type: 'slack', c: 3, r: 0, name: 'Post digest', data: { op: 'Send', target: '#daily-digest' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd']]
  },
  {
    id: 'meeting-notes', name: 'Meeting notes to tasks', cat: 'Productivity', featured: true, level: 'Intermediate', time: '8 min',
    desc: 'Transcribe a meeting recording, write a summary for the team and turn action items into tasks automatically.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 1, name: 'Recording uploaded', data: { path: '/hooks/recording' } },
      { k: 'b', type: 'stt', c: 1, r: 1, name: 'Transcribe meeting', data: { prompt: 'Transcribe the audio and label each speaker.' } },
      { k: 'c', type: 'summarizer', c: 2, r: 0, name: 'Write meeting summary', data: { prompt: 'Write a short summary with decisions and open questions.' } },
      { k: 'd', type: 'extractor', c: 2, r: 2, name: 'Extract action items', data: { prompt: 'List every action item with an owner and due date.' } },
      { k: 'e', type: 'slack', c: 3, r: 0, name: 'Share summary', data: { op: 'Send', target: '#team' } },
      { k: 'f', type: 'asana', c: 3, r: 2, name: 'Create tasks', data: { op: 'Create', target: 'Team project' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['b', 0, 'd'], ['c', 0, 'e'], ['d', 0, 'f']]
  },
  {
    id: 'support-triage', name: 'Support ticket triage', cat: 'Support', featured: true, level: 'Intermediate', time: '10 min',
    desc: 'Read the sentiment and topic of each new ticket, then route it to billing, engineering or an automatic FAQ reply.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 1, name: 'New support ticket', data: { path: '/hooks/ticket' } },
      { k: 'b', type: 'sentiment', c: 1, r: 1, name: 'Detect sentiment', data: { prompt: 'Rate the customer sentiment as positive, neutral or negative.' } },
      { k: 'c', type: 'classifier', c: 2, r: 1, name: 'Classify topic', data: { prompt: 'Classify the ticket as billing, technical or general.' } },
      { k: 'd', type: 'switch', c: 3, r: 1, name: 'Route by topic', data: { field: '{{ topic }}' } },
      { k: 'e', type: 'zendesk', c: 4, r: 0, name: 'Assign to billing', data: { op: 'Update', target: 'Billing queue' } },
      { k: 'f', type: 'slack', c: 4, r: 1, name: 'Alert engineering', data: { op: 'Send', target: '#eng-support' } },
      { k: 'g', type: 'gmail', c: 4, r: 2, name: 'Reply with FAQ', data: { op: 'Send', target: '{{ email }}' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd'], ['d', 0, 'e'], ['d', 1, 'f'], ['d', 2, 'g']]
  },
  {
    id: 'lead-enrichment', name: 'Lead enrichment to CRM', cat: 'Sales', level: 'Beginner', time: '6 min',
    desc: 'Enrich every new lead with company data and create a clean contact record in your CRM.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 0, name: 'New lead', data: { path: '/hooks/lead' } },
      { k: 'b', type: 'http', c: 1, r: 0, name: 'Enrich company data', data: { method: 'POST', url: 'https://api.example.com/v1/enrich' } },
      { k: 'c', type: 'set', c: 2, r: 0, name: 'Map fields', data: { expr: '{ "name": {{ name }}, "company": {{ company.name }}, "size": {{ company.size }} }' } },
      { k: 'd', type: 'hubspot', c: 3, r: 0, name: 'Create contact', data: { op: 'Create', target: 'Contacts' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd']]
  },
  {
    id: 'resume-screening', name: 'Resume screening', cat: 'HR', level: 'Intermediate', time: '10 min',
    desc: 'Parse incoming resumes, score each candidate against the job, then shortlist or send a polite rejection.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 1, name: 'Application received', data: { path: '/hooks/application' } },
      { k: 'b', type: 'extractor', c: 1, r: 1, name: 'Parse resume', data: { prompt: 'Extract name, email, years of experience and key skills from the resume.' } },
      { k: 'c', type: 'agent', c: 2, r: 1, name: 'Score candidate', data: { prompt: 'Score the candidate from 1 to 10 against the job description and explain briefly.' } },
      { k: 'd', type: 'if', c: 3, r: 1, name: 'Score above 6?', data: { left: '{{ score }}', op: 'greater than', right: '6' } },
      { k: 'e', type: 'gsheets', c: 4, r: 0, name: 'Log shortlisted', data: { op: 'Create', target: 'Shortlist' } },
      { k: 'f', type: 'gmail', c: 4, r: 2, name: 'Send rejection email', data: { op: 'Send', target: '{{ email }}' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd'], ['d', 0, 'e'], ['d', 1, 'f']]
  },
  {
    id: 'weekly-report', name: 'Weekly metrics report', cat: 'Reporting', level: 'Intermediate', time: '8 min',
    desc: 'Every Monday, query last week’s numbers, write a short narrative of the trends and email it to the team.',
    nodes: [
      { k: 'a', type: 'schedule', c: 0, r: 0, name: 'Every Monday 8am', data: { every: '1 day' } },
      { k: 'b', type: 'postgres', c: 1, r: 0, name: 'Query weekly metrics', data: { op: 'Get', target: 'SELECT * FROM weekly_metrics' } },
      { k: 'c', type: 'aggregate', c: 2, r: 0, name: 'Summarise numbers', data: { expr: '{{ sum(revenue) }}, {{ count(signups) }}' } },
      { k: 'd', type: 'text-gen', c: 3, r: 0, name: 'Write insights', data: { prompt: 'Write a short report that explains the biggest changes and anomalies versus last week.' } },
      { k: 'e', type: 'gmail', c: 4, r: 0, name: 'Email report', data: { op: 'Send', target: 'team@company.com' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd'], ['d', 0, 'e']]
  },
  {
    id: 'social-comments', name: 'Social comment tagging', cat: 'Marketing', level: 'Beginner', time: '5 min',
    desc: 'Tag every new social comment by sentiment and topic and save it to a Notion database for the marketing team.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 0, name: 'New comment', data: { path: '/hooks/comment' } },
      { k: 'b', type: 'sentiment', c: 1, r: 0, name: 'Detect sentiment', data: { prompt: 'Rate the comment as positive, neutral or negative.' } },
      { k: 'c', type: 'classifier', c: 2, r: 0, name: 'Tag topic', data: { prompt: 'Tag the comment as product, pricing, support or other.' } },
      { k: 'd', type: 'notion', c: 3, r: 0, name: 'Save to database', data: { op: 'Create', target: 'Comments' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd']]
  },
  {
    id: 'invoice-extraction', name: 'Invoice data extraction', cat: 'Documents', level: 'Beginner', time: '6 min',
    desc: 'Read uploaded invoices (PDF or image), pull out the key fields and add them to your finance spreadsheet.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 0, name: 'Invoice uploaded', data: { path: '/hooks/invoice' } },
      { k: 'b', type: 'vision', c: 1, r: 0, name: 'Read invoice', data: { prompt: 'Extract vendor, invoice number, date, line items and total as JSON.' } },
      { k: 'c', type: 'json-parse', c: 2, r: 0, name: 'Parse fields', data: { expr: '{{ $json.text }}' } },
      { k: 'd', type: 'gsheets', c: 3, r: 0, name: 'Add to ledger', data: { op: 'Create', target: 'Invoices' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd']]
  },
  {
    id: 'kb-bot', name: 'Knowledge base Q&A bot', cat: 'AI Agents', level: 'Intermediate', time: '7 min',
    desc: 'Answer questions from your own documents. Search the knowledge base, draft an answer and reply to the user.',
    nodes: [
      { k: 'a', type: 'webhook', c: 0, r: 0, name: 'Question received', data: { path: '/hooks/ask' } },
      { k: 'b', type: 'kb', c: 1, r: 0, name: 'Search company docs', data: { source: 'Company docs', topk: 4 } },
      { k: 'c', type: 'llm-chat', c: 2, r: 0, name: 'Answer question', data: { prompt: 'Answer using only the provided passages. If you are not sure, say you do not know.' } },
      { k: 'd', type: 'respond', c: 3, r: 0, name: 'Reply to user', data: { url: 'https://example.com/reply' } }
    ],
    edges: [['a', 0, 'b'], ['b', 0, 'c'], ['c', 0, 'd']]
  }
];
