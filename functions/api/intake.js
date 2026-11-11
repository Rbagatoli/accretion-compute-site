// POST /api/intake: the contact form and the submit-a-site form.
// Checks the fields, keeps each message in the LEADS KV store and, when the MAILER service is bound,
// asks it to email a notice. The reply carries a reference number the page shows to the visitor.
// Spam checks: a hidden field people never fill, a minimum fill time and a per-visitor hourly limit.

const FORMS = {
  contact: {
    required: ['name', 'email', 'message'],
    fields: { about: 40, name: 160, org: 180, email: 254, message: 5000 }
  },
  site: {
    required: ['place', 'state', 'source', 'role', 'authority', 'name', 'email', 'consent'],
    fields: {
      country: 2, place: 200, state: 40, coords: 80, acres: 20, source: 20, size: 20, unit: 10,
      contract: 10, pipe: 30, fiber: 30, role: 40, authority: 60, name: 160, org: 180,
      email: 254, phone: 80, notes: 3000, consent: 3
    }
  }
};
const MAX_BODY = 20000;
const MIN_FILL_MS = 2500;
const PER_HOUR = 6;
const ORIGINS = /^https:\/\/((www\.)?accretioncompute\.com|([a-z0-9-]+\.)?accretion-compute-site\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  });
}

function makeRef(now) {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(6));
  let s = '';
  for (const x of b) s += abc[x % abc.length];
  return 'AC-' + now.toISOString().slice(0, 10).replace(/-/g, '') + '-' + s;
}

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function onRequestPost({ request, env, waitUntil }) {
  const origin = request.headers.get('Origin') || '';
  if (!ORIGINS.test(origin)) return reply(403, { received: false, error: 'origin' });
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return reply(415, { received: false, error: 'type' });
  if (!env.LEADS) return reply(503, { received: false, error: 'storage' });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return reply(413, { received: false, error: 'size' });
  let body;
  try { body = JSON.parse(raw); } catch { return reply(400, { received: false, error: 'json' }); }

  const spec = FORMS[body && body.form];
  if (!spec) return reply(400, { received: false, error: 'form' });

  const now = new Date();
  // Bots: answer as if it worked, keep nothing.
  if (body.website || !(Number(body.elapsed) >= MIN_FILL_MS)) return reply(200, { received: true, ref: makeRef(now) });

  const input = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const fields = {};
  for (const [k, max] of Object.entries(spec.fields)) {
    const v = input[k] == null ? '' : String(input[k]).replace(/\r\n?/g, '\n').trim();
    if (v.length > max) return reply(400, { received: false, error: 'long', field: k });
    if (v) fields[k] = v;
  }
  const missing = spec.required.filter((k) => !fields[k]);
  if (missing.length) return reply(400, { received: false, error: 'missing', fields: missing });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return reply(400, { received: false, error: 'email' });

  // Hourly limit per visitor. Only a one-way hash of the address and the hour is kept, for an hour.
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = 'rl:' + (await sha256(ip + '|' + now.toISOString().slice(0, 13)));
  const count = Number(await env.LEADS.get(rlKey)) || 0;
  if (count >= PER_HOUR) return reply(429, { received: false, error: 'limit' });

  const visit = body.visit && typeof body.visit === 'object' ? body.visit : {};
  const ref = makeRef(now);
  const lead = {
    ref,
    form: body.form,
    receivedAt: now.toISOString(),
    fields,
    visit: {
      page: String(visit.page || '').slice(0, 200),
      from: String(visit.from || '').slice(0, 200),
      formPage: String(body.page || '').slice(0, 200)
    },
    country: (request.cf && request.cf.country) || ''
  };

  await env.LEADS.put('lead:' + lead.receivedAt + ':' + ref, JSON.stringify(lead), {
    metadata: { ref, form: lead.form, name: fields.name.slice(0, 80), email: fields.email.slice(0, 120) }
  });
  waitUntil(env.LEADS.put(rlKey, String(count + 1), { expirationTtl: 3600 }));

  if (env.MAILER) {
    waitUntil(
      env.MAILER.fetch('https://mailer/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      }).catch(() => {})
    );
  }

  return reply(200, { received: true, ref });
}

export function onRequest() {
  return reply(405, { received: false, error: 'method' });
}
