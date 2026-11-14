// Builds the site: wraps each src/pages/*.html in src/layout.html and writes it to the repo root.
// No dependencies. Run: node tools/build.mjs
//
// Each page starts with a one-line JSON header in an HTML comment:
//   <!--{"title": "...", "description": "...", "nav": "capacity"}-->
// Optional keys: "out" (file name, default <id>.html), "noindex": true, "ogTitle".
// Guides (src/guides/*.html, made by tools/import-guides.mjs) are written to guides/<id>.html.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = readFileSync(join(root, 'src/layout.html'), 'utf8');
const NAV = ['capacity', 'energy', 'sites', 'partners', 'model', 'about', 'guides', 'contact'];

// Cache-busting stamp: changes whenever the stylesheet or script changes.
const version = createHash('sha256')
  .update(readFileSync(join(root, 'styles.css')))
  .update(readFileSync(join(root, 'site.js')))
  // the site model page loads its own files; a change to any of them must bust the cache too
  .update(readFileSync(join(root, 'assets/sizer/sizer.css')))
  .update(readFileSync(join(root, 'assets/sizer/sizer.js')))
  .update(readFileSync(join(root, 'assets/sizer/three.js')))
  .digest('hex').slice(0, 8);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const SITE = 'https://accretioncompute.com';
// visible text of an HTML snippet: tags dropped, entities decoded, spaces collapsed
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#x27;|&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const canonicalOf = (prefix, meta, id) => { const out = prefix + (meta.out || `${id}.html`); return out === 'index.html' ? '' : out.replace(/\.html$/, ''); };
// last real change of a source file: its last commit, or today when it has uncommitted edits
const today = new Date().toISOString().slice(0, 10);
const git = (args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; } };
const lastmod = (rel) => (git(['status', '--porcelain', '--', rel]) ? today : git(['log', '-1', '--format=%cs', '--', rel]) || today);
const sitemap = []; // [url, lastmod]
const llmsPages = new Map(); // id -> { url, title, description }

const sources = [['src/pages', '']];
if (existsSync(join(root, 'src/guides'))) sources.push(['src/guides', 'guides/']);
for (const [dir, prefix] of sources) for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith('.html')).sort()) {
  const id = file.replace(/\.html$/, '');
  const src = readFileSync(join(root, dir, file), 'utf8');
  const m = src.match(/^<!--(\{.*?\})-->\r?\n/);
  if (!m) throw new Error(`${file}: missing JSON header`);
  const meta = JSON.parse(m[1]);
  for (const k of ['title', 'description']) if (!meta[k]) throw new Error(`${file}: missing ${k}`);

  const out = prefix + (meta.out || `${id}.html`);
  // Cloudflare Pages serves pages without ".html" (and redirects the .html address there), so canonicals,
  // the sitemap and internal links all use the short address. GitHub Pages serves the short address too.
  const canonical = out === 'index.html' ? '' : out.replace(/\.html$/, '');
  // <!--include:name--> pulls in src/partials/name.html
  const include = (text, depth = 0) => {
    if (depth > 5) throw new Error(`${file}: includes nested too deep`);
    return text.replace(/<!--include:([a-z0-9-]+)-->/g, (_, n) =>
      include(readFileSync(join(root, 'src/partials', `${n}.html`), 'utf8').trim(), depth + 1));
  };
  let body = include(src.slice(m[0].length).trimEnd());
  // Structured data made from what the page shows, so the markup can never drift from the visible text:
  // a BreadcrumbList from the page's crumbs, and a FAQPage from its <details> FAQ. Guides carry their own.
  const ld = [];
  const crumbs = body.match(/<p class="crumbs">(.*?)<\/p>/s);
  if (crumbs && !body.includes('"BreadcrumbList"')) {
    const items = crumbs[1].split(' / ').map((part, i, all) => {
      const a = part.match(/<a href="([^"]*)">(.*?)<\/a>/);
      const name = plain(a ? a[2] : part);
      const href = a ? a[1] : (i === all.length - 1 ? canonicalOf(prefix, meta, id) : '');
      const url = `${SITE}/${href === './' ? '' : href.replace(/^\//, '').replace(/\.html$/, '')}`;
      return { '@type': 'ListItem', position: i + 1, name, item: url };
    });
    ld.push({ '@type': 'BreadcrumbList', itemListElement: items });
  }
  const faq = body.match(/<div class="faq">([\s\S]*?)\n\s*<\/div>/);
  if (faq && !body.includes('"FAQPage"')) {
    const qa = [...faq[1].matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
      .map(([, q, a]) => ({ '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) } }));
    if (qa.length) ld.push({ '@type': 'FAQPage', mainEntity: qa });
  }
  if (ld.length) body = `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c')}\n</script>\n${body}`;
  let html = layout
    .replace('{{content}}', () => body)
    .replaceAll('{{title}}', esc(meta.title))
    .replaceAll('{{ogTitle}}', esc(meta.ogTitle || meta.title))
    .replaceAll('{{description}}', esc(meta.description))
    .replaceAll('{{canonical}}', canonical)
    .replaceAll('{{id}}', id)
    .replaceAll('{{version}}', version)
    .replaceAll('{{ogImage}}', meta.ogImage || 'assets/og-image.png')
    .replaceAll('{{ogType}}', prefix === 'guides/' ? 'article' : 'website')
    .replace('{{robots}}', meta.noindex ? '<meta name="robots" content="noindex">' : '');
  for (const n of NAV) html = html.replace(`{{nav:${n}}}`, meta.nav === n ? ' aria-current="page"' : '');

  // internal page links: href="capacity.html#x" -> href="capacity#x" (only local page names, never assets)
  html = html.replace(/href="([a-z0-9-]+)\.html(#[^"]*)?"/g, (_, name, hash) => `href="${name === 'index' ? './' : name}${hash || ''}"`);
  if (/href="[a-z0-9-]+\.html/.test(html)) throw new Error(`${file}: an internal .html link survived`);

  // a page one folder down reaches the shared files and pages through ../
  if (prefix || out.includes('/')) html = html.replace(/(href|src)="(?![a-z][a-z0-9+.-]*:|\/|#)(\.\/)?/g, '$1="../');
  // the 404 page is served at any missing address, folders included, so it links from the site root
  if (out === '404.html') html = html.replace(/(href|src)="(?![a-z][a-z0-9+.-]*:|\/|#)(\.\/)?/g, '$1="/');

  const left = html.match(/\{\{[^}]+\}\}/);
  if (left) throw new Error(`${file}: unfilled placeholder ${left[0]}`);
  if (prefix) mkdirSync(join(root, prefix), { recursive: true });
  writeFileSync(join(root, out), html.replace(/\r\n/g, '\n'));
  if (!meta.noindex) {
    sitemap.push([`${SITE}/${canonical}`, lastmod(`${dir}/${file}`)]);
    llmsPages.set(id, { url: `${SITE}/${canonical}`, title: plain(meta.title.split(' | ')[0]), description: meta.description });
  }
  console.log(`built ${out}`);
}

writeFileSync(join(root, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemap.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n') + '\n</urlset>\n');
console.log(`sitemap: ${sitemap.length} pages, assets v=${version}`);

// /llms.txt: a plain-text map of the site for language models, made from the same pages as the sitemap.
// The summary repeats the About page's "In short" text; the guides follow the Guides hub's own groups.
const about = readFileSync(join(root, 'src/pages/about.html'), 'utf8').match(/<p class="in-short"><strong>In short<\/strong>(.*?)<\/p>/s);
if (!about) throw new Error('about.html: no In short block for llms.txt');
const summary = plain(about[1]).split('. ').slice(0, 2).join('. ') + '.';
const line = (id, label) => { const p = llmsPages.get(id); if (!p) throw new Error(`llms.txt: no page ${id}`); return `- [${label || p.title}](${p.url}): ${p.description}`; };
let llms = `# Accretion Compute\n\n> ${summary} Tenants bring and own their hardware.\n\n` +
  'Accretion Compute is a capacity provider, not a cloud: it does not rent out GPUs or sell GPU-hours. It is evaluating sites in Canada and the United States. ' +
  'Its energy partner, Proton Mining, runs Bitcoin mining on flare and interruptible gas. Contact is by email or the forms on the site.\n\n' +
  '## Company\n\n' + [['capacity', 'Capacity'], ['energy', 'Energy'], ['partners', 'Partners'], ['sites', 'Site selection'], ['about', 'About'], ['contact', 'Contact']].map(([id, l]) => line(id, l)).join('\n') +
  '\n\n## Tools\n\n' + [['site-model', 'Site model'], ['site-check', 'Site check'], ['fit', 'Will it fit?'], ['submit-a-site', 'Submit a site']].map(([id, l]) => line(id, l)).join('\n') + '\n';
const hub = readFileSync(join(root, 'src/partials/guides-list.html'), 'utf8');
for (const g of hub.split('<h2 class="guide-group">').slice(1)) {
  llms += `\n## Guides: ${plain(g.slice(0, g.indexOf('</h2>')))}\n\n`;
  for (const [, slug, h1] of g.matchAll(/href="\/guides\/([a-z0-9-]+)"><h3>(.*?)<\/h3>/g)) llms += line(slug, plain(h1)) + '\n';
}
writeFileSync(join(root, 'llms.txt'), llms);
console.log('llms.txt written');
