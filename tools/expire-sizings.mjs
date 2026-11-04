// Takes sizing pages down 90 days after they went live.
// A page's go-live date is the commit that added sizings/<slug>.html.
// Its old links then open the Site model (lines added to _redirects).
// To keep a page longer, add it to sizings/keep.json: {"<slug>": "YYYY-MM-DD"} (kept until that date).
//   node tools/expire-sizings.mjs              take down what is due
//   node tools/expire-sizings.mjs --dry        list only
//   node tools/expire-sizings.mjs --today 2027-03-01 --dry   test a date
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const DAYS = 90;
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const ti = args.indexOf("--today");
const today = ti >= 0 ? args[ti + 1] : new Date().toISOString().slice(0, 10);
const day = s => Date.parse(s + "T00:00:00Z");
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

const dir = path.join(ROOT, "sizings");
const keepFile = path.join(dir, "keep.json");
const keep = fs.existsSync(keepFile) ? JSON.parse(fs.readFileSync(keepFile, "utf8")) : {};
const redirFile = path.join(ROOT, "_redirects");
let redirects = fs.existsSync(redirFile) ? fs.readFileSync(redirFile, "utf8") : "# Sizing pages past their 90 days open the Site model.\n";

const slugs = fs.readdirSync(dir).filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
const gone = [];
for (const slug of slugs) {
  const added = git("log", "--diff-filter=A", "--format=%cs", "--", `sizings/${slug}.html`).split("\n")[0];
  if (!added) continue; // not published yet
  const due = new Date(day(added) + DAYS * 864e5).toISOString().slice(0, 10);
  const kept = keep[slug] && day(today) < day(keep[slug]);
  const expired = day(today) >= day(due) && !kept;
  console.log(`${slug}: live ${added}, due ${due}${keep[slug] ? `, kept until ${keep[slug]}` : ""}${expired ? "  -> take down" : ""}`);
  if (!expired) continue;
  gone.push(slug);
  if (dry) continue;
  for (const f of [`sizings/${slug}.html`, `sizings/${slug}.pdf`, `src/pages/sizing-${slug}.html`])
    if (fs.existsSync(path.join(ROOT, f))) fs.rmSync(path.join(ROOT, f));
  for (const from of [`/sizings/${slug}`, `/sizings/${slug}.html`, `/sizings/${slug}.pdf`])
    if (!redirects.split("\n").some(l => l.split(/\s+/)[0] === from)) redirects += `${from} /site-model 302\n`;
}
// A page made again for the same site gets its link back.
redirects = redirects.split("\n").filter(l => {
  const m = l.match(/^\/sizings\/([^\s.]+)/);
  return !m || gone.includes(m[1]) || !fs.existsSync(path.join(dir, m[1] + ".html"));
}).join("\n");
if (!dry && (gone.length || fs.existsSync(redirFile))) fs.writeFileSync(redirFile, redirects.replace(/\n*$/, "\n"));
console.log(gone.length ? `${dry ? "would take down" : "took down"}: ${gone.join(", ")}` : "nothing due");
