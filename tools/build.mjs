// Builds the site: wraps each src/pages/*.html in src/layout.html and writes it to the repo root.
// No dependencies. Run: node tools/build.mjs
//
// Each page starts with a one-line JSON header in an HTML comment:
//   <!--{"title": "...", "description": "...", "nav": "capacity"}-->
// Optional keys: "out" (file name, default <id>.html), "noindex": true, "ogTitle".

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = readFileSync(join(root, 'src/layout.html'), 'utf8');
const NAV = ['capacity', 'energy', 'sites', 'partners', 'about', 'contact'];

// Cache-busting stamp: changes whenever the stylesheet or script changes.
const version = createHash('sha256')
  .update(readFileSync(join(root, 'styles.css')))
  .update(readFileSync(join(root, 'site.js')))
  .digest('hex').slice(0, 8);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const sitemap = [];

for (const file of readdirSync(join(root, 'src/pages')).filter((f) => f.endsWith('.html')).sort()) {
  const id = file.replace(/\.html$/, '');
  const src = readFileSync(join(root, 'src/pages', file), 'utf8');
  const m = src.match(/^<!--(\{.*?\})-->\r?\n/);
  if (!m) throw new Error(`${file}: missing JSON header`);
  const meta = JSON.parse(m[1]);
  for (const k of ['title', 'description']) if (!meta[k]) throw new Error(`${file}: missing ${k}`);

  const out = meta.out || `${id}.html`;
  // Cloudflare Pages serves pages without ".html" (and redirects the .html address there), so canonicals,
  // the sitemap and internal links all use the short address. GitHub Pages serves the short address too.
  const canonical = out === 'index.html' ? '' : out.replace(/\.html$/, '');
  // <!--include:name--> pulls in src/partials/name.html
  const include = (text, depth = 0) => {
    if (depth > 5) throw new Error(`${file}: includes nested too deep`);
    return text.replace(/<!--include:([a-z0-9-]+)-->/g, (_, n) =>
      include(readFileSync(join(root, 'src/partials', `${n}.html`), 'utf8').trim(), depth + 1));
  };
  const body = include(src.slice(m[0].length).trimEnd());
  let html = layout
    .replace('{{content}}', () => body)
    .replaceAll('{{title}}', esc(meta.title))
    .replaceAll('{{ogTitle}}', esc(meta.ogTitle || meta.title))
    .replaceAll('{{description}}', esc(meta.description))
    .replaceAll('{{canonical}}', canonical)
    .replaceAll('{{id}}', id)
    .replaceAll('{{version}}', version)
    .replace('{{robots}}', meta.noindex ? '<meta name="robots" content="noindex">' : '');
  for (const n of NAV) html = html.replace(`{{nav:${n}}}`, meta.nav === n ? ' aria-current="page"' : '');

  // internal page links: href="capacity.html#x" -> href="capacity#x" (only local page names, never assets)
  html = html.replace(/href="([a-z0-9-]+)\.html(#[^"]*)?"/g, (_, name, hash) => `href="${name === 'index' ? './' : name}${hash || ''}"`);
  if (/href="[a-z0-9-]+\.html/.test(html)) throw new Error(`${file}: an internal .html link survived`);

  const left = html.match(/\{\{[^}]+\}\}/);
  if (left) throw new Error(`${file}: unfilled placeholder ${left[0]}`);
  writeFileSync(join(root, out), html.replace(/\r\n/g, '\n'));
  if (!meta.noindex) sitemap.push(`https://accretioncompute.com/${canonical}`);
  console.log(`built ${out}`);
}

writeFileSync(join(root, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log(`sitemap: ${sitemap.length} pages, assets v=${version}`);
