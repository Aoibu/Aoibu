// يفحص ملفات data/*.json ثم يولّد sitemap.xml و rss.xml تلقائياً.
// يعمل تلقائياً عبر GitHub Actions عند كل تعديل على مجلد data/ — لا تحتاج تشغيله يدوياً.
// للتشغيل اليدوي (اختياري): node scripts/build-feeds.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const errors = [];

function load(name) {
  const text = read(`data/${name}.json`);
  try {
    return JSON.parse(text);
  } catch (e) {
    const pos = Number((String(e.message).match(/position (\d+)/) || [])[1]);
    const line = Number.isFinite(pos) ? text.slice(0, pos).split("\n").length : "?";
    errors.push(`data/${name}.json: خطأ في صيغة JSON قرب السطر ${line} — ${e.message}`);
    return null;
  }
}

const site = load("site") || {};
const SITE = (site.siteUrl || "https://aoibu.github.io/Aoibu/").replace(/\/?$/, "/");
const sets = { episodes: load("episodes"), movies: load("movies"), manga: load("manga") };

for (const [name, arr] of Object.entries(sets)) {
  if (!arr) continue;
  if (!Array.isArray(arr)) { errors.push(`data/${name}.json: يجب أن يكون قائمة [ ... ]`); continue; }
  const seen = new Set();
  arr.forEach((x, i) => {
    const where = `data/${name}.json → العنصر ${i + 1}${x && x.id ? ` (id ${x.id})` : ""}`;
    if (!x || !x.id) return errors.push(`${where}: لا يوجد id`);
    const key = String(x.id).toLowerCase();
    if (seen.has(key)) errors.push(`${where}: id مكرر`);
    seen.add(key);
    if (name === "manga" ? !x.reader : !(x.drive || x.mega || (x.servers || []).length)) errors.push(`${where}: لا يوجد رابط مشاهدة/قراءة`);
  });
}

if (errors.length) {
  console.error("❌ توجد أخطاء في ملفات البيانات:\n" + errors.map((e) => " - " + e).join("\n"));
  process.exit(1);
}

const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const items = [
  ...sets.episodes.map((x) => ({ ...x, url: `watch.html?id=${encodeURIComponent(x.id)}`, label: `الحلقة ${x.id}`, kind: "episode" })),
  ...sets.movies.map((x) => ({ ...x, url: `watch.html?id=${encodeURIComponent(x.id)}`, label: `الفيلم ${x.number ?? x.id}`, kind: "movie" })),
  ...sets.manga.map((x) => ({ ...x, url: `read.html?id=${encodeURIComponent(x.id)}`, label: x.special ? "فصل خاص" : `مانجا الفصل ${x.number ?? x.id}`, kind: "manga" })),
];
const today = new Date().toISOString().slice(0, 10);
const newest = items.map((x) => x.date).filter(Boolean).sort().pop() || today;

// ---------- sitemap.xml ----------
const pages = [["", newest, "1.0", "daily"], ["news.html", null, "0.8", "daily"], ["Vote.html", null, "0.4", "monthly"], ["congrats.html", null, "0.4", "weekly"], ["Gift.html", null, "0.4", "monthly"], ["download.html", null, "0.4", "monthly"], ["privacy-policy.html", null, "0.2", "yearly"]];
const urls = [
  ...pages.map(([p, d, pr, cf]) => ({ loc: SITE + p, lastmod: d, priority: pr, changefreq: cf })),
  ...items.map((x) => ({ loc: SITE + x.url, lastmod: x.date, priority: x.kind === "manga" ? "0.6" : "0.8", changefreq: "monthly" })),
];
writeFileSync(join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<!-- يُولَّد تلقائياً من data/*.json — لا تعدّله يدوياً -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

// ---------- rss.xml ----------
const typeAr = { manga: "مانجا", filler: "فلر", remaster: "مُعاد إنتاجها", special: "خاصة" };
const latest = items.filter((x) => x.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
writeFileSync(join(ROOT, "rss.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
  `  <title>${xml(site.siteName || "Aoibu | مكتبة كونان")}</title>\n  <link>${SITE}</link>\n  <description>${xml(site.description || "آخر الحلقات والأفلام وفصول المانجا من فريق اويبو.")}</description>\n  <language>ar</language>\n  <atom:link href="${SITE}rss.xml" rel="self" type="application/rss+xml" />\n  <lastBuildDate>${new Date(newest + "T12:00:00Z").toUTCString()}</lastBuildDate>\n` +
  latest.map((x) => `  <item>\n    <title>${xml(`${x.label}${x.title ? " — " + x.title : ""}`)}</title>\n    <link>${xml(SITE + x.url)}</link>\n    <guid isPermaLink="true">${xml(SITE + x.url)}</guid>\n    <pubDate>${new Date(x.date + "T12:00:00Z").toUTCString()}</pubDate>\n    <description>${xml(x.story ? x.story.slice(0, 300) : `${x.label}${x.type ? " (" + (typeAr[x.type] || "") + ")" : ""} من المحقق كونان مترجمة للعربية — فريق اويبو.`)}</description>${x.poster ? `\n    <enclosure url="${xml(x.poster)}" type="image/jpeg" length="0" />` : ""}\n  </item>`).join("\n") +
  `\n</channel>\n</rss>\n`);

console.log(`✅ البيانات سليمة: ${sets.episodes.length} حلقة، ${sets.movies.length} أفلام، ${sets.manga.length} فصول. تم تحديث sitemap.xml و rss.xml`);
