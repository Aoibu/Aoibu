/* ==========================================================================
   Aoibu | مكتبة كونان — الكود المشترك لكل الصفحات
   - يحمّل البيانات من مجلد data/ (ملفات JSON)
   - يرسم الهيدر والفوتر وشريط الجوال والبحث الشامل
   - لا تحتاج تعديل هذا الملف لإضافة حلقات؛ عدّل ملفات data/*.json فقط
   ========================================================================== */
(function () {
  "use strict";

  const DATA_VERSION = "2"; // غيّره لو أردت إجبار المتصفحات على تحميل البيانات من جديد
  const STORE = "aoibu:";

  /* ---------------- أدوات عامة ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(STORE + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) { /* وضع خاص */ } },
  };
  const qs = (k) => new URLSearchParams(location.search).get(k);

  /* أيقونات SVG */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    tv: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m8 21 4-3 4 3"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/>',
    next: '<path d="m15 18-6-6 6-6"/>',
    prev: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    reply: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    theater: '<rect x="2" y="6" width="20" height="12" rx="2"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    news: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v10a2 2 0 0 1-2 2"/><path d="M8 8h5M8 12h5M8 16h3"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    telegram: '<path d="M21.5 4.5 2.5 11.8l6.2 2.1 2.3 6.6 3.5-4.3 5 3.7z"/><path d="m8.7 13.9 9.3-6.4-6.9 8.1"/>',
    x: '<path d="M4 4l16 16M20 4 4 20"/>',
  };
  const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  /* ---------------- تطبيع النص العربي للبحث ---------------- */
  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
      .replace(/[ً-ٰٟـ]/g, "") // تشكيل وتطويل
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[^\w؀-ۿ\s.]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  /* ---------------- الأنواع ---------------- */
  const TYPES = {
    manga: { label: "مانجا", cls: "badge-manga", long: "حلقة من المانجا (أساسية)" },
    filler: { label: "فلر", cls: "badge-filler", long: "حلقة فلر (غير أساسية)" },
    remaster: { label: "مُعاد إنتاجها", cls: "badge-remaster", long: "حلقة كلاسيكية مُعاد إنتاجها" },
    special: { label: "خاصة", cls: "badge-special", long: "حلقة خاصة" },
  };

  /* ---------------- تحويل الروابط تلقائياً ---------------- */
  const driveId = (u) => (String(u || "").match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/) || [])[1];
  const megaKey = (u) => (String(u || "").match(/mega\.nz\/(?:file|embed)\/([^/?\s]+)/) || [])[1];
  function toEmbed(u) {
    u = String(u || "").trim();
    const d = driveId(u);
    if (d) return `https://drive.google.com/file/d/${d}/preview`;
    const m = megaKey(u);
    if (m) return `https://mega.nz/embed/${m}`;
    const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return u;
  }
  function hostName(u) {
    const map = [["drive.google", "Google Drive"], ["mega.nz", "Mega"], ["mediafire", "MediaFire"], ["gofile", "Gofile"], ["tokyoinsider", "TokyoInsider"], ["streamtape", "Streamtape"], ["4shared", "4Shared"], ["4s.io", "4Shared"], ["subsource", "Subsource"], ["subdl", "SubDL"], ["nyaa", "Nyaa"], ["wistia", "Wistia"], ["vimeo", "Vimeo"], ["movearnpre", "EarnVids"], ["mivalyo", "EarnVids"], ["jumpshare", "Jumpshare"], ["youtube", "YouTube"], ["cubari", "Cubari"]];
    const hit = map.find(([k]) => String(u).includes(k));
    if (hit) return hit[1];
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "رابط"; }
  }

  /* يحوّل عنصر JSON إلى شكل كامل (سيرفرات/تحميل/سوفت سب) */
  function expand(item, kind) {
    const it = Object.assign({}, item);
    it.kind = kind;
    it.id = String(it.id);
    if (it.number == null) it.number = parseFloat(it.id.replace(/[^\d.]/g, "")) || 0;
    const servers = [], downloads = [], soft = [];
    if (it.drive) {
      servers.push({ name: "Google Drive", note: "متعدد الجودات", url: toEmbed(it.drive) });
      downloads.push({ host: "Google Drive", quality: it.quality || "1080p", url: it.drive });
    }
    if (it.mega) {
      servers.push({ name: "Mega", note: it.quality || "1080p", url: toEmbed(it.mega) });
      downloads.push({ host: "Mega", quality: it.quality || "1080p", url: it.mega });
    }
    (it.servers || []).forEach((s) => s && s.url && servers.push({ name: s.name || hostName(s.url), note: s.note || "", url: toEmbed(s.url) }));
    (it.downloads || []).forEach((d) => d && d.url && downloads.push({ host: d.host || hostName(d.url), quality: d.quality || d.format || "", url: d.url }));
    if (it.raw) soft.push({ label: "الفيديو الخام (RAW)", kind: "raw", url: it.raw });
    if (it.sub) soft.push({ label: "ملف الترجمة (ASS)", kind: "sub", url: it.sub });
    (it.softsub || []).forEach((s) => s && s.url && soft.push({ label: s.label || hostName(s.url), kind: /ترجمة|sub/i.test(s.label || "") ? "sub" : "raw", url: s.url }));
    it._servers = servers; it._downloads = downloads; it._soft = soft;
    it._title = it.title || (kind === "manga" ? (it.special ? "فصل خاص" : `الفصل ${it.number}`) : `الحلقة ${it.id}`);
    it._url = kind === "manga" ? `read.html?id=${encodeURIComponent(it.id)}` : `watch.html?id=${encodeURIComponent(it.id)}`;
    it._search = norm([it.id, it.number, it.title, it.titleEn, it.type && TYPES[it.type] ? TYPES[it.type].label : "", (it.tags || []).join(" "), kind === "movie" ? "فيلم movie" : kind === "manga" ? "مانجا فصل" : "حلقة"].join(" "));
    return it;
  }

  /* ---------------- تحميل البيانات ---------------- */
  const cache = {};
  async function loadJSON(name) {
    if (cache[name]) return cache[name];
    cache[name] = (async () => {
      const url = `data/${name}.json?v=${DATA_VERSION}`;
      let res;
      try { res = await fetch(url, { cache: "no-cache" }); } catch (e) { throw new DataError(name, "تعذّر الاتصال. تأكد من الإنترنت أو افتح الموقع عبر رابط GitHub Pages (وليس بفتح الملف مباشرة).", e); }
      if (!res.ok) throw new DataError(name, `الملف غير موجود (HTTP ${res.status})`);
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) { throw new DataError(name, describeJSONError(text, e), e); }
    })();
    return cache[name];
  }
  class DataError extends Error { constructor(file, msg, cause) { super(msg); this.file = file; this.cause = cause; } }
  function describeJSONError(text, e) {
    const m = String(e.message).match(/position (\d+)/);
    if (!m) return "خطأ في صيغة JSON: " + e.message;
    const pos = +m[1];
    const before = text.slice(0, pos);
    const line = before.split("\n").length;
    const lines = text.split("\n");
    const from = Math.max(0, line - 3);
    const snippet = lines.slice(from, line + 1).map((l, i) => `${String(from + i + 1).padStart(4)} | ${l}`).join("\n");
    return `خطأ في صيغة JSON عند السطر ${line}.\nغالباً فاصلة ( , ) ناقصة أو زائدة، أو علامة تنصيص " غير مغلقة.\n\n${snippet}`;
  }

  async function loadSite() {
    try { return await loadJSON("site"); } catch (e) { console.warn(e); return {}; }
  }
  async function loadLibrary(parts = ["episodes", "movies", "manga"]) {
    const kinds = { episodes: "episode", movies: "movie", manga: "manga" };
    const out = {};
    await Promise.all(parts.map(async (p) => {
      const raw = await loadJSON(p);
      if (!Array.isArray(raw)) throw new DataError(p, "يجب أن يكون الملف قائمة تبدأ بـ [ وتنتهي بـ ]");
      out[p] = raw.map((x, i) => Object.assign(expand(x, kinds[p]), { _order: i }));
    }));
    return out;
  }
  const byNumber = (a, b) => a.number - b.number || a._order - b._order;
  const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "") || b._order - a._order;

  function showDataError(err, target) {
    console.error(err);
    const box = document.createElement("div");
    box.className = "container";
    box.innerHTML = `<div class="error-box" role="alert"><h2>تعذّر تحميل المكتبة</h2><p style="color:var(--text-2);margin-bottom:12px">${err.file ? `مشكلة في الملف <b dir="ltr">data/${esc(err.file)}.json</b>` : "حدث خطأ غير متوقع"}</p><pre>${esc(err.message)}</pre><p style="margin-top:12px;font-size:14px;color:var(--text-3)">يمكنك فحص الملف عبر صفحة <a href="admin.html#validate" style="color:var(--brand)">أداة الإضافة والفحص</a>.</p></div>`;
    (target || $("main") || document.body).replaceChildren(box);
  }

  /* ---------------- سجل المشاهدة ---------------- */
  const history = {
    list() { return store.get("history", []); },
    push(kind, id) {
      const l = history.list().filter((h) => !(h.kind === kind && h.id === id));
      l.unshift({ kind, id, t: Date.now() });
      store.set("history", l.slice(0, 30));
    },
    watched() { return store.get("watched", {}); },
    isWatched(kind, id) { return !!history.watched()[kind + ":" + id]; },
    setWatched(kind, id, v) { const w = history.watched(); if (v) w[kind + ":" + id] = Date.now(); else delete w[kind + ":" + id]; store.set("watched", w); },
  };

  /* ---------------- التواريخ ---------------- */
  const fmtDate = (d) => {
    if (!d) return "";
    try { return new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return d; }
  };
  const isNew = (d, days = 14) => d && (Date.now() - new Date(d + "T12:00:00").getTime()) / 864e5 <= days;

  /* ---------------- رسم البطاقات ---------------- */
  function typeBadge(it) {
    if (it.kind === "movie") return `<span class="badge badge-movie">فيلم ${it.number}</span>`;
    if (it.kind === "manga") return it.special ? `<span class="badge badge-special">فصل خاص</span>` : `<span class="badge badge-manga">مانجا</span>`;
    const t = TYPES[it.type] || TYPES.filler;
    return `<span class="badge ${t.cls}">${t.label}</span>`;
  }
  function tagBadges(it) { return (it.tags || []).map((t) => `<span class="badge badge-tag">${esc(t)}</span>`).join(""); }
  function img(src, alt) {
    if (!src) return "";
    return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('is-loaded')" onerror="this.remove()">`;
  }
  function mangaCover(it) {
    return `<div class="manga-cover"><div class="mc-top"><span>CONAN</span><span>${it.translator ? esc(it.translator) : "AOIBU"}</span></div><div><div class="mc-label">${it.special ? "فصل خاص" : "الفصل"}</div><div class="mc-num">${it.special ? "★" : esc(it.number)}</div></div></div>`;
  }
  function card(it) {
    const watched = history.isWatched(it.kind, it.id);
    const label = it.kind === "movie" ? "فيلم" : it.kind === "manga" ? (it.special ? "فصل خاص" : "الفصل") : "الحلقة";
    const media = it.kind === "manga" ? mangaCover(it) : img(it.poster, it._title);
    const fresh = isNew(it.date) ? `<span class="badge badge-new">جديد</span>` : "";
    const metaRight = it.kind === "movie" ? (it.year ? `${it.year}` : "") : it.kind === "manga" ? (it._downloads.length ? "قراءة + تحميل" : "قراءة أونلاين") : (TYPES[it.type] || {}).label || "";
    return `<a class="card is-${it.kind} reveal" href="${it._url}" data-id="${esc(it.id)}">
      <div class="card-media">${media}
        <div class="card-flags">${fresh}${it.kind === "episode" ? typeBadge(it) : ""}${tagBadges(it)}</div>
        ${it.kind !== "manga" ? `<div class="card-num"><small>${label}</small>${esc(it.kind === "movie" ? it.number : it.id)}</div>` : ""}
        ${watched ? `<span class="card-watched" title="شاهدتها">${icon("check")}</span>` : ""}
        <span class="card-play">${icon(it.kind === "manga" ? "book" : "play", it.kind === "manga" ? "" : "fill")}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(it.kind === "manga" && !it.title ? `الفصل ${it.number}` : it._title)}</div>
        <div class="card-meta"><span>${esc(metaRight)}</span><span>${esc(fmtDate(it.date))}</span></div>
      </div></a>`;
  }

  /* ظهور تدريجي عند التمرير */
  let io;
  function reveal(root = document) {
    const els = $$(".reveal:not(.in)", root);
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
  }

  /* ---------------- رسالة منبثقة ---------------- */
  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  async function share(title, url = location.href) {
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (e) { if (e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast("تم نسخ الرابط ✓"); } catch (e) { prompt("انسخ الرابط:", url); }
  }

  /* ---------------- الثيم ---------------- */
  function applyTheme(t) { document.documentElement.setAttribute("data-theme", t); const m = $('meta[name="theme-color"]'); if (m) m.content = t === "light" ? "#f4f6fc" : "#060a17"; }
  function toggleTheme() { const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light"; applyTheme(next); store.set("theme", next); }

  /* ---------------- الهيدر والفوتر وشريط الجوال ---------------- */
  const NAV = [
    { key: "home", href: "./", label: "الرئيسية", icon: "home" },
    { key: "episodes", href: "./?tab=episodes#library", label: "الحلقات", icon: "tv" },
    { key: "movies", href: "./?tab=movies#library", label: "الأفلام", icon: "film" },
    { key: "manga", href: "./?tab=manga#library", label: "المانجا", icon: "book" },
    { key: "news", href: "news.html", label: "أخبار كونانية", icon: "news", dot: true },
  ];
  function renderChrome(site) {
    let page = document.body.dataset.page || "";
    if (page === "home" && ["episodes", "movies", "manga"].includes(qs("tab"))) page = qs("tab");
    if (page === "watch") page = /^m\d/i.test(qs("id") || "") ? "movies" : "episodes";
    const header = $("#site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `<div class="container">
        <a class="brand" href="./" aria-label="Aoibu — الصفحة الرئيسية">
          <img class="logo-light" src="assets/img/wordmark-light.png" alt="Aoibu" width="67" height="30">
          <img class="logo-dark" src="assets/img/wordmark.png" alt="Aoibu" width="67" height="30">
          <span class="brand-sub">مكتبة كونان</span>
        </a>
        <nav class="main-nav" aria-label="القائمة الرئيسية">
          ${NAV.map((n) => `<a href="${n.href}" data-nav="${n.key}" ${n.key === page ? 'aria-current="page"' : ""}>${n.dot ? '<span class="dot"></span>' : ""}${n.label}</a>`).join("")}
        </nav>
        <div class="header-actions">
          <button class="search-trigger" type="button" data-open-search aria-label="بحث">${icon("search")}<span>ابحث برقم الحلقة أو اسمها…</span><kbd>/</kbd></button>
          <a class="icon-btn only-mobile" href="news.html" aria-label="الأخبار">${icon("news")}</a>
          <button class="icon-btn theme-toggle" type="button" aria-label="تبديل الوضع الليلي/النهاري">${icon("moon", "i-moon")}${icon("sun", "i-sun")}</button>
        </div></div>`;
      $(".theme-toggle", header).addEventListener("click", toggleTheme);
    }
    const tab = document.createElement("div");
    tab.className = "tabbar";
    tab.innerHTML = `<nav aria-label="تنقل سريع">
      ${NAV.slice(0, 4).map((n) => `<a href="${n.href}" data-nav="${n.key}" ${n.key === page ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span></a>`).join("")}
      <button type="button" data-open-search>${icon("search")}<span>بحث</span></button></nav>`;
    document.body.appendChild(tab);

    const footer = $("#site-footer");
    if (footer) {
      footer.className = "site-footer";
      const social = (site.social || []).map((s) => `<a class="icon-btn" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">${icon(s.icon || "external")}</a>`).join("");
      footer.innerHTML = `<div class="container">
        <div class="footer-about"><img class="logo-light-f" src="assets/img/wordmark-light.png" alt="Aoibu" width="76" height="34"><p>${esc(site.description || "فريق اويبو للترجمة — المحقق كونان مترجم للعربية.")}</p><div class="footer-social">${social}</div></div>
        <div><h4>المكتبة</h4><ul><li><a href="./?tab=episodes#library">كل الحلقات</a></li><li><a href="./?tab=movies#library">الأفلام</a></li><li><a href="./?tab=manga#library">فصول المانجا</a></li><li><a href="news.html">أخبار كونانية</a></li></ul></div>
        <div><h4>المجتمع</h4><ul><li><a href="Gift.html">إهداء للفريق 🎁</a></li><li><a href="congrats.html">سجل التهاني</a></li><li><a href="Vote.html">نتائج تصويت الأفلام</a></li><li><a href="download.html">تطبيق أندرويد</a></li></ul></div>
        <div><h4>تابعنا</h4><ul>${(site.social || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join("")}<li><a href="rss.xml">خلاصة RSS</a></li><li><a href="privacy-policy.html">سياسة الخصوصية</a></li></ul></div>
      </div>
      <div class="footer-bottom"><div class="container"><span>© ${new Date().getFullYear()} Aoibu Team — جميع الحقوق محفوظة</span><span>صُنع بحب لمحبي المحقق كونان 💙</span></div></div>`;
      if (document.documentElement.getAttribute("data-theme") === "light") $(".logo-light-f", footer).src = "assets/img/wordmark.png";
    }
  }

  /* ---------------- البحث الشامل ---------------- */
  let searchData = null, searchSel = 0, searchItems = [];
  function buildSearch() {
    const ov = document.createElement("div");
    ov.className = "search-overlay";
    ov.innerHTML = `<div class="search-dialog" role="dialog" aria-modal="true" aria-label="البحث في المكتبة">
      <div class="search-input-row">${icon("search")}<input type="search" placeholder="رقم الحلقة، اسمها، فيلم، فصل مانجا…" autocomplete="off" enterkeyhint="go" aria-label="بحث"><button class="icon-btn" type="button" data-close aria-label="إغلاق">${icon("close")}</button></div>
      <div class="search-results" role="listbox"></div>
      <div class="search-foot hide-mobile"><span><kbd>↑</kbd> <kbd>↓</kbd> للتنقل</span><span><kbd>Enter</kbd> للفتح</span><span><kbd>Esc</kbd> للإغلاق</span></div></div>`;
    document.body.appendChild(ov);
    const input = $("input", ov), results = $(".search-results", ov);
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-close]")) closeSearch(); });
    input.addEventListener("input", () => runSearch(input.value, results));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); searchSel = Math.max(0, Math.min(searchItems.length - 1, searchSel + (e.key === "ArrowDown" ? 1 : -1))); paintSel(results); }
      if (e.key === "Enter" && searchItems[searchSel]) location.href = searchItems[searchSel]._url;
    });
    return ov;
  }
  async function openSearch() {
    const ov = $(".search-overlay") || buildSearch();
    ov.classList.add("open"); document.documentElement.style.overflow = "hidden";
    const input = $("input", ov); setTimeout(() => input.focus(), 30);
    if (!searchData) {
      $(".search-results", ov).innerHTML = `<div class="search-hint"><div class="spinner" style="margin:auto"></div></div>`;
      try { const lib = await loadLibrary(); searchData = [...lib.episodes, ...lib.movies, ...lib.manga]; } catch (e) { $(".search-results", ov).innerHTML = `<div class="search-hint">تعذّر تحميل البيانات</div>`; return; }
    }
    runSearch(input.value, $(".search-results", ov));
  }
  function closeSearch() { const ov = $(".search-overlay"); if (ov) ov.classList.remove("open"); document.documentElement.style.overflow = ""; }
  function scoreItem(it, q, tokens) {
    const id = norm(it.id);
    if (id === q || String(it.number) === q) return 100;
    if (id.startsWith(q)) return 80;
    if (!tokens.every((t) => it._search.includes(t))) return 0;
    return 40 + (norm(it.title).startsWith(q) ? 20 : 0);
  }
  function runSearch(raw, results) {
    if (!searchData) return;
    const q = norm(raw);
    if (!q) {
      const recent = history.list().slice(0, 6).map((h) => searchData.find((x) => x.kind === h.kind && x.id === h.id)).filter(Boolean);
      const latest = searchData.slice().sort(byDateDesc).slice(0, 6);
      searchItems = recent.length ? recent : latest;
      results.innerHTML = `<div class="search-group">${recent.length ? "شاهدتها مؤخراً" : "أحدث الإضافات"}</div>` + searchItems.map(searchRow).join("");
    } else {
      const tokens = q.split(" ");
      searchItems = searchData.map((it) => [it, scoreItem(it, q, tokens)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1] || b[0].number - a[0].number).slice(0, 30).map((x) => x[0]);
      results.innerHTML = searchItems.length ? searchItems.map((it) => searchRow(it, raw)).join("") : `<div class="search-hint">لا توجد نتائج لـ «${esc(raw)}»<br><small>جرّب رقم الحلقة فقط، مثل: 1204</small></div>`;
    }
    searchSel = 0; paintSel(results);
  }
  function searchRow(it) {
    const kind = it.kind === "movie" ? `فيلم ${it.number}${it.year ? " • " + it.year : ""}` : it.kind === "manga" ? (it.special ? "فصل خاص" : `مانجا • الفصل ${it.number}`) : `الحلقة ${it.id} • ${(TYPES[it.type] || {}).label || ""}`;
    const th = it.kind === "manga" ? `<span>${it.special ? "★" : esc(it.number)}</span>` : it.poster ? `<img src="${esc(it.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
    return `<a class="search-item" role="option" href="${it._url}"><span class="thumb">${th}</span><span class="info"><b>${esc(it.kind === "episode" ? `${it.id} — ${it._title}` : it._title)}</b><span>${esc(kind)}</span></span></a>`;
  }
  function paintSel(results) { $$(".search-item", results).forEach((el, i) => el.setAttribute("aria-selected", i === searchSel ? "true" : "false")); const s = $$(".search-item", results)[searchSel]; if (s) s.scrollIntoView({ block: "nearest" }); }

  /* ---------------- التهيئة ---------------- */
  async function init() {
    const site = await loadSite();
    renderChrome(site);
    document.addEventListener("click", (e) => { if (e.target.closest("[data-open-search]")) { e.preventDefault(); openSearch(); } });
    document.addEventListener("keydown", (e) => {
      const typing = /input|textarea|select/i.test((e.target.tagName || "")) || e.target.isContentEditable;
      if (!typing && (e.key === "/" || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)))) { e.preventDefault(); openSearch(); }
      if (e.key === "Escape") closeSearch();
    });
    reveal();
    return site;
  }

  const ready = new Promise((r) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", r) : r()));
  const siteReady = ready.then(init);

  window.Aoibu = { $, $$, esc, icon, norm, store, qs, TYPES, expand, describeJSONError, loadJSON, loadLibrary, loadSite, siteReady, showDataError, history, fmtDate, isNew, card, typeBadge, tagBadges, reveal, toast, share, byNumber, byDateDesc, hostName, toEmbed, openSearch, DataError };
})();
