/* قارئ المانجا: read.html?id=1152  أو  read.html?id=SP1 */
(async function () {
  "use strict";
  const A = window.Aoibu;
  const { $, $$, esc, icon } = A;
  await A.siteReady;
  const main = $("main");
  const id = (A.qs("id") || "").trim();

  let lib;
  try { lib = await A.loadLibrary(["manga"]); } catch (e) { A.showDataError(e); return; }
  const chapters = lib.manga.filter((c) => !c.special).sort(A.byNumber);
  const specials = lib.manga.filter((c) => c.special);
  const all = [...specials, ...chapters];
  const ch = all.find((c) => c.id.toLowerCase() === id.toLowerCase()) || (!id && chapters[chapters.length - 1]);

  if (!ch) {
    main.innerHTML = `<div class="container center-card"><div class="panel" style="padding:40px 24px"><div style="font-size:52px">📚</div><h1 style="font-size:26px;margin:8px 0">الفصل «${esc(id)}» غير متوفر</h1><a class="btn btn-primary" href="./?tab=manga#library" style="margin-top:16px">${icon("book")} كل الفصول</a></div></div>`;
    return;
  }
  const label = ch.special ? `فصل خاص: ${ch._title}` : `الفصل ${ch.number}`;
  document.title = `مانجا المحقق كونان ${label}${ch.title && !ch.special ? " — " + ch.title : ""} مترجم | Aoibu`;
  const d = $('meta[name="description"]'); if (d) d.content = `قراءة وتحميل ${label} من مانجا المحقق كونان مترجم للعربية — فريق اويبو.`;
  A.history.push("manga", ch.id);

  const seq = ch.special ? [] : chapters;
  const i = seq.indexOf(ch);
  const prev = seq[i - 1], next = seq[i + 1];

  main.innerHTML = `<div class="container">
    <nav class="crumbs"><a href="./">الرئيسية</a>${icon("next")}<a href="./?tab=manga#library">المانجا</a>${icon("next")}<span aria-current="page">${esc(label)}</span></nav>
    <header class="watch-title" style="margin:0 0 18px">
      <div class="kicker">${ch.special ? `<span class="badge badge-special">فصل خاص</span>` : `<span class="badge badge-manga">مانجا</span>`}${A.tagBadges(ch)}${ch.translator ? `<span class="badge no-dot">ترجمة ${esc(ch.translator)}</span>` : ""}${ch.date ? `<span class="badge no-dot">${icon("clock")} ${esc(A.fmtDate(ch.date))}</span>` : ""}</div>
      <h1>${esc(label)}${ch.title && !ch.special ? ` — ${esc(ch.title)}` : ""}</h1>
    </header>
    <div class="reader-shell" id="reader"><iframe src="${esc(ch.reader)}" title="${esc(label)}" allowfullscreen loading="eager"></iframe></div>
    <div class="watch-toolbar">
      ${seq.length ? `<div class="ep-nav">
        <a class="btn btn-sm ${prev ? "" : "is-disabled"}" ${prev ? `href="${prev._url}"` : ""}>${icon("prev")}<span class="btn-label">الفصل السابق</span></a>
        <a class="btn btn-sm ${next ? "btn-primary" : "is-disabled"}" ${next ? `href="${next._url}"` : ""}><span class="btn-label">الفصل التالي</span>${icon("next")}</a></div>` : ""}
      <span class="spacer"></span>
      <button class="btn btn-sm" id="fs-btn">${icon("expand")}<span class="btn-label">ملء الشاشة</span></button>
      <a class="btn btn-sm" href="${esc(ch.reader)}" target="_blank" rel="noopener">${icon("external")}<span class="btn-label">فتح في نافذة</span></a>
      <button class="btn btn-sm" id="share-btn">${icon("share")}<span class="btn-label">مشاركة</span></button>
    </div>
    ${ch._downloads.length ? `<section class="panel"><h2 class="panel-title">${icon("download")} تحميل الفصل</h2><div class="dl-grid">
      ${ch._downloads.map((x) => `<a class="dl-item" href="${esc(x.url)}" target="_blank" rel="noopener nofollow"><span class="dl-logo">${esc(x.quality || "PDF")}</span><span class="dl-info"><b>${esc(x.host)}</b><span>ملف ${esc(x.quality || "")}</span></span>${icon("download")}</a>`).join("")}
    </div></section>` : ""}
    <section class="section"><div class="section-head"><h2>فصول أخرى</h2></div><div class="grid">${all.filter((c) => c !== ch).sort((a, b) => b.number - a.number).map(A.card).join("")}</div></section>
  </div>`;

  $("#fs-btn").addEventListener("click", () => { const r = $("#reader"); (r.requestFullscreen || r.webkitRequestFullscreen || (() => window.open(ch.reader))).call(r); });
  $("#share-btn").addEventListener("click", () => A.share(`مانجا المحقق كونان ${label}`));
  A.reveal(main);
})();
