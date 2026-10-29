// Imports rendered guide pages into the site: one src/guides/<slug>.html per guide, plus the list on the
// Guides hub (src/partials/guides-list.html). Then run node tools/build.mjs as usual.
// Run: node tools/import-guides.mjs <folder with <slug>.fragment.html and <slug>.meta.json>

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = process.argv[2];
if (!from) throw new Error('usage: node tools/import-guides.mjs <rendered folder>');
mkdirSync(join(root, 'src/guides'), { recursive: true });

const SITE = 'https://accretioncompute.com';
const groups = new Map(); // cluster label -> [{ slug, h1, dek }]

for (const f of readdirSync(from).filter((n) => n.endsWith('.fragment.html')).sort()) {
  const slug = f.replace(/\.fragment\.html$/, '');
  const meta = JSON.parse(readFileSync(join(from, `${slug}.meta.json`), 'utf8'));
  let frag = readFileSync(join(from, f), 'utf8');
  // Links back into this site become root-relative, so a local preview stays local.
  frag = frag.replaceAll(`href="${SITE}/`, 'href="/');

  const crumbs = frag.match(/<nav class="breadcrumbs"[^>]*>(.*?)<\/nav>\n?/s);
  const parts = crumbs ? crumbs[1].split('›').map((s) => s.trim()) : ['Guides', 'Guide'];
  const cluster = parts.length > 2 ? parts[1] : 'Guides';
  const head = frag.match(/<header class="guide-header">(.*?)<\/header>\n?/s);
  if (!head) throw new Error(`${slug}: no guide header`);
  const h1 = head[1].match(/<h1>(.*?)<\/h1>/s)[1];
  const dek = (head[1].match(/<p class="dek">(.*?)<\/p>/s) || [, ''])[1];
  const metaRow = (head[1].match(/<p class="meta-row">.*?<\/p>/s) || [''])[0];

  frag = frag.replace(crumbs ? crumbs[0] : '', '').replace(head[0], '');
  // The hub lives at /guides (no trailing slash).
  frag = frag.replaceAll(`"${SITE}/guides/"`, `"${SITE}/guides"`);
  const [article, ...after] = frag.split('</article>');

  const header = { title: meta.title_tag, description: meta.meta_description, ogTitle: meta.og?.['og:title'] || meta.title_tag, nav: 'guides', ogImage: `assets/og/${slug}.png` };
  const page = `<!--${JSON.stringify(header)}-->
<section class="pagehead guidehead dark">
  <div class="pagehead-disk"><!--include:disk--></div>
  <div class="wrap">
    <p class="crumbs"><a href="./">Home</a> / <a href="guides.html">Guides</a> / ${parts[parts.length - 1]}</p>
    <p class="eyebrow">${cluster}</p>
    <h1>${h1}</h1>
    <p class="lede">${dek}</p>
    ${metaRow}
  </div>
</section>

<section class="band tight guide-band">
  <div class="wrap">
${article.trim()}
</article>
  </div>
</section>
${after.join('</article>').trim()}
`;
  writeFileSync(join(root, 'src/guides', `${slug}.html`), page);
  if (!groups.has(cluster)) groups.set(cluster, []);
  groups.get(cluster).push({ slug, h1, dek });
  console.log(`imported ${slug}`);
}

let list = '';
for (const [cluster, items] of groups) {
  list += `<h2 class="guide-group">${cluster}</h2>\n<div class="grid g3 guide-cards">\n`;
  for (const g of items) list += `  <a class="card" href="/guides/${g.slug}"><h3>${g.h1}</h3><p>${g.dek}</p><span class="link">Read the guide <span class="arrow"></span></span></a>\n`;
  list += '</div>\n';
}
writeFileSync(join(root, 'src/partials/guides-list.html'), list);
console.log(`guides list: ${groups.size} groups`);
