/* صفحة المشاهدة: watch.html?id=1204  أو  watch.html?id=M28 */
(async function () {
  "use strict";
  const A = window.Aoibu;
  const { $, $$, esc, icon } = A;
  const site = await A.siteReady;
  const main = $("main");

  const id = (A.qs("id") || "").trim();
  let lib;
  try { lib = await A.loadLibrary(["episodes", "movies"]); } catch (e) { A.showDataError(e); return; }

  const isMovie = /^m\d/i.test(id);
  const list = (isMovie ? lib.movies : lib.episodes).slice().sort(A.byNumber);
  const item = list.find((x) => x.id.toLowerCase() === id.toLowerCase());

  if (!item) {
    document.title = "غير موجود | Aoibu";
    main.innerHTML = `<div class="container center-card"><div class="panel" style="padding:40px 24px">
      <div style="font-size:52px">🔍</div><h1 style="font-size:26px;margin:8px 0">${id ? `الحلقة «${esc(id)}» غير متوفرة` : "لم يتم تحديد حلقة"}</h1>
      <p style="color:var(--text-2)">قد تكون لم تُترجم بعد أو الرابط غير صحيح.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px"><a class="btn btn-primary" href="./">${icon("home")} الرئيسية</a><button class="btn" data-open-search>${icon("search")} ابحث عن حلقة</button></div></div></div>`;
    return;
  }

  const kindWord = isMovie ? "الفيلم" : "الحلقة";
  const label = isMovie ? `الفيلم ${item.number}` : `الحلقة ${item.id}`;
  const idx = list.indexOf(item);
  const prev = list[idx - 1], next = list[idx + 1];

  /* ---------- SEO ---------- */
  const fullTitle = `المحقق كونان ${label} مترجم${isMovie ? "" : "ة"}: ${item._title} | Aoibu`;
  const desc = (item.story ? item.story.slice(0, 150) + "…" : `مشاهدة وتحميل ${label} من المحقق كونان مترجمة للعربية بجودة عالية — ${item._title}. ترجمة فريق اويبو.`);
  document.title = fullTitle;
  const setMeta = (sel, attr, val) => { let m = $(sel); if (!m) { m = document.createElement("meta"); const [k, v] = sel.replace(/[\[\]"]/g, "").replace("meta", "").split("="); m.setAttribute(k, v); document.head.appendChild(m); } m.setAttribute(attr, val); };
  setMeta('meta[name="description"]', "content", desc);
  setMeta('meta[property="og:title"]', "content", fullTitle);
  setMeta('meta[property="og:description"]', "content", desc);
  if (item.poster) setMeta('meta[property="og:image"]', "content", item.poster);
  const canon = $('link[rel="canonical"]'); if (canon) canon.href = `${site.siteUrl || ""}watch.html?id=${encodeURIComponent(item.id)}`;
  const ld = document.createElement("script"); ld.type = "application/ld+json";
  ld.textContent = JSON.stringify(isMovie
    ? { "@context": "https://schema.org", "@type": "Movie", name: `المحقق كونان: ${item._title}`, alternateName: item.titleEn ? `Detective Conan: ${item.titleEn}` : undefined, image: item.poster, description: desc, dateCreated: item.year ? String(item.year) : undefined, inLanguage: "ar" }
    : { "@context": "https://schema.org", "@type": "TVEpisode", name: item._title, episodeNumber: String(item.id), image: item.poster, description: desc, inLanguage: "ar", partOfSeries: { "@type": "TVSeries", name: "المحقق كونان (Detective Conan)" }, datePublished: item.date });
  document.head.appendChild(ld);

  A.history.push(item.kind, item.id);

  /* ---------- البناء ---------- */
  const servers = item._servers;
  const prefer = A.store.get("server", "");
  let current = Math.max(0, servers.findIndex((s) => s.name === prefer));
  const credits = item.credits === "default" ? site.defaultCredits || [] : Array.isArray(item.credits) ? item.credits : [];
  const team = site.team || {};
  const meta = !isMovie ? (A.TYPES[item.type] || A.TYPES.filler) : null;

  main.innerHTML = `
  <div class="container">
    <nav class="crumbs" aria-label="مسار التنقل"><a href="./">الرئيسية</a>${icon("next")}<a href="./?tab=${isMovie ? "movies" : "episodes"}#library">${isMovie ? "الأفلام" : "الحلقات"}</a>${icon("next")}<span aria-current="page">${esc(label)}</span></nav>
    <div class="watch-layout">
      <div class="watch-main">
        <div class="player-shell" id="player-shell">
          <div class="player" id="player">
            ${servers.length ? `<button class="player-cover" id="player-cover" type="button" aria-label="تشغيل ${esc(label)}">
              ${item.poster ? `<img src="${esc(item.poster)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
              <span class="pc-inner"><span class="play-circle">${icon("play", "fill")}</span><span class="pc-hint">اضغط للتشغيل • ${esc(servers[current].name)}</span></span>
            </button>` : `<div class="player-cover" style="cursor:default"><span class="pc-inner"><span class="pc-hint">لا يوجد سيرفر مشاهدة — استخدم روابط التحميل بالأسفل</span></span></div>`}
          </div>
          ${servers.length ? `<div class="server-bar"><span class="label">${icon("server")} السيرفرات</span><div class="server-list" role="group" aria-label="اختيار السيرفر">
            ${servers.map((s, i) => `<button class="server-btn" type="button" data-server="${i}" aria-pressed="${i === current}">${esc(s.name)}${s.note ? `<span class="q">${esc(s.note)}</span>` : ""}</button>`).join("")}
          </div></div>` : ""}
        </div>

        <div class="watch-toolbar">
          ${list.length > 1 ? `<div class="ep-nav">
            <a class="btn btn-sm ${prev ? "" : "is-disabled"}" ${prev ? `href="${prev._url}"` : 'aria-disabled="true"'} title="${prev ? esc(prev._title) : ""}">${icon("prev")}<span class="btn-label">${kindWord} السابق${isMovie ? "" : "ة"}</span></a>
            <a class="btn btn-sm ${next ? "btn-primary" : "is-disabled"}" ${next ? `href="${next._url}"` : 'aria-disabled="true"'} title="${next ? esc(next._title) : ""}"><span class="btn-label">${kindWord} التالي${isMovie ? "" : "ة"}</span>${icon("next")}</a>
          </div>` : ""}
          <span class="spacer hide-mobile"></span>
          <button class="btn btn-sm" type="button" id="watched-btn" aria-pressed="false">${icon("check")}<span class="btn-label">تمت المشاهدة</span></button>
          <button class="btn btn-sm hide-mobile" type="button" id="theater-btn">${icon("theater")}<span class="btn-label">وضع السينما</span></button>
          <button class="btn btn-sm icon-only" type="button" id="share-btn" title="مشاركة" aria-label="مشاركة">${icon("share")}<span class="btn-label">مشاركة</span></button>
          <button class="btn btn-sm icon-only" type="button" id="report-btn" title="إبلاغ عن مشكلة" aria-label="إبلاغ عن مشكلة">${icon("flag")}<span class="btn-label">إبلاغ</span></button>
        </div>

        <header class="watch-title">
          <div class="kicker">${isMovie ? `<span class="badge badge-movie">الفيلم ${item.number}</span>${item.year ? `<span class="badge no-dot">${item.year}</span>` : ""}` : `<span>المحقق كونان — الحلقة ${esc(item.id)}</span>${A.typeBadge(item)}`}${A.tagBadges(item)}${item.date ? `<span class="badge no-dot">${icon("clock")} ${esc(A.fmtDate(item.date))}</span>` : ""}</div>
          <h1>${esc(item._title)}</h1>
          ${item.titleEn ? `<p class="en">Detective Conan: ${esc(item.titleEn)}</p>` : ""}
        </header>

        ${item.story || item.note || meta ? `<section class="panel"><h2 class="panel-title">${icon("info")} ${isMovie ? "قصة الفيلم" : "عن الحلقة"}</h2>
          ${item.story ? `<p class="story">${esc(item.story)}</p>` : `<p class="story" style="color:var(--text-3)">${meta ? meta.long : ""}.</p>`}
          ${item.note ? `<div class="note">${icon("book")}<span>${esc(item.note)}</span></div>` : ""}
        </section>` : ""}

        ${item.trailer ? `<section class="panel"><h2 class="panel-title">${icon("play")} الإعلان الرسمي</h2><div class="player" style="border-radius:12px;overflow:hidden"><iframe src="${esc(A.toEmbed(item.trailer))}" title="الإعلان" loading="lazy" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe></div></section>` : ""}

        ${item._downloads.length ? `<section class="panel" id="downloads"><h2 class="panel-title">${icon("download")} روابط التحميل</h2><div class="dl-grid">
          ${item._downloads.map((d) => dlItem(d.host, d.quality ? `جودة ${d.quality}` : "تحميل مباشر", d.url)).join("")}
        </div></section>` : ""}

        ${item._soft.length ? `<section class="panel"><h2 class="panel-title">${icon("file")} ملفات السوفت سب (Soft-sub)</h2>
          <p style="color:var(--text-3);font-size:14px;margin:-6px 0 14px">حمّل الفيديو الخام وملف الترجمة المنفصل للمشاهدة بأعلى جودة على مشغّلك المفضّل.</p>
          <div class="dl-grid">${item._soft.map((s) => dlItem(s.label, A.hostName(s.url), s.url, s.kind === "sub" ? "ASS" : "RAW")).join("")}</div></section>` : ""}

        ${credits.length ? `<section class="panel"><h2 class="panel-title">${icon("users")} طاقم العمل</h2><div class="credits">
          ${credits.map((c) => { const link = c.link || team[c.name]; const tag = link ? "a" : "div"; return `<${tag} class="credit" ${link ? `href="${esc(link)}" target="_blank" rel="noopener"` : ""}><span class="avatar">${esc((c.name || "?").replace(/[^A-Za-z؀-ۿ]/g, "").charAt(0).toUpperCase() || "?")}</span><div><b>${esc(c.name)}</b><span>${esc(c.role)}</span></div></${tag}>`; }).join("")}
        </div></section>` : ""}

        <section class="panel"><h2 class="panel-title">${icon("star")} قيّم ${kindWord}</h2>
          <div class="rating"><div class="stars" id="stars" role="radiogroup" aria-label="التقييم">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-rate="${n}" aria-label="${n} من 5">★</button>`).join("")}</div><span class="rating-msg" id="rating-msg">شاركنا رأيك</span></div>
        </section>

        <section class="panel" id="comments"><h2 class="panel-title">${icon("chat")} التعليقات</h2>
          <form class="comment-form" id="comment-form">
            <div class="reply-status" id="reply-status"><span>الرد على <b id="reply-name"></b></span><button type="button" class="btn btn-sm btn-ghost" id="reply-cancel">${icon("close")} إلغاء</button></div>
            <input class="input" id="c-name" maxlength="40" placeholder="الاسم (اختياري)" autocomplete="nickname">
            <textarea class="textarea" id="c-content" maxlength="1500" placeholder="اكتب تعليقك هنا… (تجنّب الحرق 🙏)" required></textarea>
            <div><button class="btn btn-primary" type="submit">${icon("chat")} إرسال التعليق</button></div>
          </form>
          <div class="comment-list" id="comment-list"><div class="spinner" style="margin:20px auto"></div></div>
        </section>
      </div>

      <aside class="side">
        <div class="ep-list-panel">
          <div class="ep-list-head"><h3>${isMovie ? "كل الأفلام" : "قائمة الحلقات"} <small>${idx + 1} / ${list.length}</small></h3>
            ${list.length > 8 ? `<label class="field">${icon("search")}<input id="ep-filter" type="search" inputmode="search" placeholder="انتقل لحلقة… (مثال: 1187)"></label>` : ""}
          </div>
          <div class="ep-list" id="ep-list">${list.map(epRow).join("")}</div>
        </div>
      </aside>
    </div>
  </div>`;

  function dlItem(title, sub, url, logo) {
    const name = logo || title.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "⇩";
    return `<a class="dl-item" href="${esc(url)}" target="_blank" rel="noopener nofollow"><span class="dl-logo" style="${logoColor(title)}">${esc(name)}</span><span class="dl-info"><b>${esc(title)}</b><span>${esc(sub)}</span></span>${icon("download")}</a>`;
  }
  function logoColor(t) {
    const s = t.toLowerCase();
    const c = s.includes("mega") ? "#d9272e" : s.includes("drive") ? "#1a73e8" : s.includes("mediafire") ? "#1299f3" : s.includes("gofile") ? "#3b6fe0" : s.includes("tokyo") ? "#7b3fe4" : s.includes("ترجمة") || s.includes("ass") ? "#0f9a6a" : s.includes("خام") || s.includes("raw") ? "#e07a12" : "";
    return c ? `background:${c}` : "";
  }
  function epRow(e) {
    const cur = e === item;
    const seen = A.history.isWatched(e.kind, e.id);
    return `<a class="ep-row" href="${e._url}" ${cur ? 'aria-current="true"' : ""} data-s="${esc(e._search)}">
      <span class="thumb">${e.poster ? `<img src="${esc(e.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span class="n">${esc(e.kind === "movie" ? "M" + e.number : e.id)}</span>${cur ? `<span class="now">${icon("play", "fill")}</span>` : ""}</span>
      <span class="info"><b>${esc(e._title)}</b><span>${e.kind === "movie" ? (e.year || "") : esc((A.TYPES[e.type] || {}).label || "")}${seen ? ` • <span class="seen">${icon("check")} شاهدتها</span>` : ""}</span></span></a>`;
  }

  /* ---------- المشغّل ---------- */
  const player = $("#player");
  function load(i) {
    const s = servers[i]; if (!s) return;
    current = i;
    $$(".server-btn").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.server === i)));
    const isFile = /\.(mp4|webm|m3u8)(\?|$)/i.test(s.url);
    player.innerHTML = `<div class="player-loading"><div class="spinner"></div></div>` + (isFile
      ? `<video src="${esc(s.url)}" controls autoplay playsinline ${item.poster ? `poster="${esc(item.poster)}"` : ""}></video>`
      : `<iframe src="${esc(s.url)}" title="${esc(label)} — ${esc(s.name)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="origin"></iframe>`);
    const media = $("iframe, video", player);
    media.addEventListener(isFile ? "loadeddata" : "load", () => { const l = $(".player-loading", player); if (l) l.remove(); }, { once: true });
    setTimeout(() => { const l = $(".player-loading", player); if (l) l.remove(); }, 8000);
    A.store.set("server", s.name);
    if (!A.history.isWatched(item.kind, item.id)) setWatched(true, true);
  }
  const cover = $("#player-cover");
  if (cover) cover.addEventListener("click", () => load(current));
  $$(".server-btn").forEach((b) => b.addEventListener("click", () => load(+b.dataset.server)));

  /* ---------- الأزرار ---------- */
  const wBtn = $("#watched-btn");
  function setWatched(v, silent) {
    A.history.setWatched(item.kind, item.id, v);
    wBtn.setAttribute("aria-pressed", String(v));
    wBtn.classList.toggle("btn-accent", false);
    wBtn.style.borderColor = v ? "var(--c-success)" : "";
    wBtn.style.color = v ? "var(--c-success)" : "";
    $(".btn-label", wBtn).textContent = v ? "شاهدتها ✓" : "تمت المشاهدة";
    if (!silent) A.toast(v ? "تمت الإضافة لما شاهدته" : "أزيلت من المشاهَد");
  }
  setWatched(A.history.isWatched(item.kind, item.id), true);
  wBtn.addEventListener("click", () => setWatched(wBtn.getAttribute("aria-pressed") !== "true"));
  $("#theater-btn").addEventListener("click", () => { document.body.classList.toggle("theater"); $("#player-shell").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#share-btn").addEventListener("click", () => A.share(`المحقق كونان ${label}: ${item._title}`));
  $("#report-btn").addEventListener("click", () => {
    const srv = servers[current] ? ` (السيرفر: ${servers[current].name})` : "";
    const text = `يوجد مشكلة في ${label} من انمي المحقق كونان${srv}، يرجى الإصلاح.\n${location.href}`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&screen_name=${encodeURIComponent(site.reportTo || "TheConanSign")}`, "_blank", "noopener");
  });
  document.addEventListener("keydown", (e) => {
    if (/input|textarea/i.test(e.target.tagName)) return;
    if (e.key === "Escape") document.body.classList.remove("theater");
    if (e.altKey && e.key === "ArrowLeft" && next) location.href = next._url;
    if (e.altKey && e.key === "ArrowRight" && prev) location.href = prev._url;
  });

  /* ---------- قائمة الحلقات الجانبية ---------- */
  const epList = $("#ep-list");
  const curRow = $('.ep-row[aria-current="true"]', epList);
  if (curRow) epList.scrollTop = curRow.offsetTop - epList.clientHeight / 2 + curRow.clientHeight / 2;
  const filter = $("#ep-filter");
  if (filter) {
    filter.addEventListener("input", () => {
      const q = A.norm(filter.value);
      $$(".ep-row", epList).forEach((r) => { r.style.display = !q || r.dataset.s.includes(q) ? "" : "none"; });
    });
    filter.addEventListener("keydown", (e) => { if (e.key === "Enter") { const first = $$(".ep-row", epList).find((r) => r.style.display !== "none"); if (first) location.href = first.href; } });
  }

  /* ---------- التقييم ---------- */
  const ep = site.endpoints || {};
  const rated = A.store.get("rated", {});
  const stars = $$("#stars button"), msg = $("#rating-msg");
  const paint = (n) => stars.forEach((s, i) => s.classList.toggle("on", i < n));
  if (rated[item.id]) { paint(rated[item.id]); msg.textContent = `قيّمتها ${rated[item.id]}/5 — شكراً لك!`; }
  stars.forEach((s) => {
    s.addEventListener("mouseenter", () => !rated[item.id] && paint(+s.dataset.rate));
    s.addEventListener("click", async () => {
      if (rated[item.id]) return A.toast("سبق وقيّمت هذه الحلقة");
      const n = +s.dataset.rate; paint(n); msg.textContent = `جاري إرسال تقييمك (${n}/5)…`;
      try {
        if (ep.rating) await fetch(`${ep.rating}?episode=${encodeURIComponent(item.id)}&rating=${n}`, { method: "POST", mode: "no-cors" });
        rated[item.id] = n; A.store.set("rated", rated); msg.textContent = `تم تسجيل تقييمك (${n}/5) — شكراً!`; msg.style.color = "var(--c-success)";
      } catch (e) { msg.textContent = "تعذّر الإرسال، حاول لاحقاً"; msg.style.color = "var(--c-danger)"; }
    });
  });
  $("#stars").addEventListener("mouseleave", () => paint(rated[item.id] || 0));

  /* ---------- التعليقات ---------- */
  const cList = $("#comment-list"), form = $("#comment-form");
  let parentId = "";
  const nameEl = $("#c-name");
  nameEl.value = A.store.get("name", "");
  const liked = A.store.get("liked", {});

  async function fetchComments() {
    if (!ep.comments) { cList.innerHTML = ""; return; }
    try {
      const r = await fetch(`${ep.comments}?episode=${encodeURIComponent(item.id)}`);
      const data = await r.json();
      renderComments(Array.isArray(data) ? data : []);
    } catch (e) { cList.innerHTML = `<p style="color:var(--text-3);text-align:center">تعذّر تحميل التعليقات حالياً.</p>`; }
  }
  function renderComments(data) {
    if (!data.length) { cList.innerHTML = `<p style="color:var(--text-3);text-align:center;padding:10px">لا توجد تعليقات بعد — كن أول من يعلّق! ✨</p>`; return; }
    const map = {}; data.forEach((c) => { c.children = []; map[c.id] = c; });
    const roots = [];
    data.forEach((c) => (c.parent_id && map[c.parent_id] ? map[c.parent_id].children.push(c) : roots.push(c)));
    roots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    cList.innerHTML = roots.map(commentHTML).join("");
  }
  function commentHTML(c) {
    const name = c.name || "متابع";
    const d = c.timestamp ? new Date(c.timestamp) : null;
    return `<div class="comment"><span class="avatar">${esc(name.trim().charAt(0) || "؟")}</span>
      <div class="comment-box"><div class="comment-head"><b>${esc(name)}</b>${d && !isNaN(d) ? `<time>${d.toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" })}</time>` : ""}</div>
      <div class="comment-body">${esc(c.content)}</div>
      <div class="comment-actions"><button type="button" class="${liked[c.id] ? "liked" : ""}" data-like="${esc(c.id)}">${icon("heart")} <span>${+c.likes || 0}</span></button><button type="button" data-reply="${esc(c.id)}" data-name="${esc(name)}">${icon("reply")} رد</button></div></div>
      ${c.children.length ? `<div class="comment-replies">${c.children.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(commentHTML).join("")}</div>` : ""}</div>`;
  }
  cList.addEventListener("click", (e) => {
    const like = e.target.closest("[data-like]");
    if (like) {
      const cid = like.dataset.like; if (liked[cid]) return;
      const span = $("span", like); span.textContent = +span.textContent + 1; like.classList.add("liked");
      liked[cid] = 1; A.store.set("liked", liked);
      const fd = new FormData(); fd.append("action", "like"); fd.append("id", cid);
      fetch(ep.comments, { method: "POST", body: fd }).catch(() => {});
    }
    const rep = e.target.closest("[data-reply]");
    if (rep) { parentId = rep.dataset.reply; $("#reply-name").textContent = rep.dataset.name; $("#reply-status").classList.add("show"); $("#c-content").focus(); }
  });
  $("#reply-cancel").addEventListener("click", () => { parentId = ""; $("#reply-status").classList.remove("show"); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = $("#c-content").value.trim(); if (!content) return;
    const btn = $("button[type=submit]", form); btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> جاري الإرسال…`;
    A.store.set("name", nameEl.value.trim());
    const fd = new FormData();
    fd.append("action", "add_comment"); fd.append("episode", item.id); fd.append("name", nameEl.value.trim()); fd.append("content", content); fd.append("parent_id", parentId);
    try {
      const r = await fetch(ep.comments, { method: "POST", body: fd }); const d = await r.json();
      if (d.result === "success") { $("#c-content").value = ""; parentId = ""; $("#reply-status").classList.remove("show"); A.toast("تم نشر تعليقك ✓"); fetchComments(); }
      else A.toast("حدث خطأ أثناء الإرسال");
    } catch (err) { A.toast("فشل الاتصال، حاول مرة أخرى"); }
    finally { btn.disabled = false; btn.innerHTML = old; }
  });
  if ("IntersectionObserver" in window) {
    const ob = new IntersectionObserver((en) => { if (en[0].isIntersecting) { ob.disconnect(); fetchComments(); } }, { rootMargin: "400px" });
    ob.observe($("#comments"));
  } else fetchComments();
})();
