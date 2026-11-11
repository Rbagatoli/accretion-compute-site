// accretion-intake-mail: emails a notice for each form message. Reached only through the
// MAILER service binding of the Pages project (no public route), so it needs no other check.
// Sending is free to verified destination addresses in the Cloudflare account.

const LABEL = {
  about: 'About', name: 'Name', org: 'Company', email: 'Email', phone: 'Phone', message: 'Message',
  country: 'Country', place: 'Nearest town or address', state: 'State or province', coords: 'Coordinates',
  acres: 'Land (acres)', source: 'Energy', size: 'How much', unit: 'Measured in', contract: 'Sold today',
  pipe: 'Gas pipeline', fiber: 'Fiber', role: 'Role', authority: 'Can make a deal', notes: 'Notes', consent: 'Consent'
};

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('method', { status: 405 });
    const lead = await request.json();
    const f = lead.fields || {};
    const lines = Object.keys(LABEL).filter((k) => f[k]).map((k) => LABEL[k] + ': ' + f[k]);
    lines.push('', 'Reference: ' + lead.ref, 'Received: ' + lead.receivedAt, 'Country (from the connection): ' + (lead.country || 'unknown'),
      'First page of the visit: ' + (lead.visit?.page || ''), 'Came from: ' + (lead.visit?.from || 'direct'));
    const what = lead.form === 'site' ? 'Site submission: ' + [f.place, f.state].filter(Boolean).join(', ') : 'Contact form: ' + (f.about || 'General');
    try {
      await env.EMAIL.send({
        to: env.NOTIFY_TO,
        from: env.NOTIFY_FROM,
        replyTo: f.email,
        subject: what + ' (' + lead.ref + ')',
        text: lines.join('\n')
      });
      return new Response('sent');
    } catch (e) {
      console.log('send failed', e && e.code, e && e.message);
      return new Response('failed: ' + (e && e.code), { status: 502 });
    }
  }
};
