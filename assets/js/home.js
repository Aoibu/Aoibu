/* الصفحة الرئيسية: الواجهة + آخر الإضافات + المكتبة بالفلاتر */
(async function () {
  "use strict";
  const A = window.Aoibu;
  const { $, $$, esc, icon } = A;
  const site = await A.siteReady;

  let lib;
  try { lib = await A.loadLibrary(); } catch (e) { A.showDataError(e); return; }
  const all = [...lib.episodes, ...lib.movies, ...lib.manga];

  /* ---------- الواجهة (Hero) ---------- */
  const latestEp = lib.episodes.slice().sort(A.byDateDesc)[0];
  const featured = (site.featured && all.find((x) => x.id === String(site.featured))) || latestEp;
  const hero = $("#hero");
  if (featured) {
    const isEp = featured.kind === "episode";
    hero.innerHTML = `
      <div class="hero-bg">${featured.poster ? `<img src="${esc(featured.poster)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</div>
      <div class="container">
        <div>
          <div class="hero-eyebrow"><span class="live"></span>${isEp ? "أحدث حلقة مترجمة" : "مميز الآن"}</div>
          <h1><span class="num">${isEp ? `المحقق كونان — الحلقة ${esc(featured.id)}` : featured.kind === "movie" ? `الفيلم ${featured.number}` : ""}</span>${esc(featured._title)}</h1>
          <div class="hero-meta">${A.typeBadge(featured)}${A.tagBadges(featured)}${featured.date ? `<span class="badge no-dot">${icon("clock")} ${esc(A.fmtDate(featured.date))}</span>` : ""}</div>
          ${featured.story ? `<p class="hero-story">${esc(featured.story)}</p>` : ""}
          <div class="hero-actions">
            <a class="btn btn-primary" href="${featured._url}">${icon("play", "fill")} شاهد الآن</a>
            <a class="btn" href="#library">${icon("list")} تصفّح المكتبة</a>
          </div>
          <div class="hero-stats">
            <div><b>${lib.episodes.length}</b><span>حلقة مترجمة</span></div>
            <div><b>${lib.movies.length}</b><span>أفلام</span></div>
            <div><b>${lib.manga.length}</b><span>فصل مانجا</span></div>
          </div>
        </div>
        <a class="hero-poster" href="${featured._url}" aria-label="شاهد ${esc(featured._title)}">
          ${featured.poster ? `<img src="${esc(featured.poster)}" alt="${esc(featured._title)}" referrerpolicy="no-referrer" fetchpriority="high">` : ""}
          <span class="play-ring"><span class="play-circle">${icon("play", "fill")}</span></span>
        </a>
      </div>`;
  }

  /* ---------- البانر ---------- */
  const ann = site.announcement;
  if (ann && ann.show && ann.image) {
    $("#promo").innerHTML = `<div class="container section" style="padding-bottom:0"><a class="promo reveal" href="${esc(ann.link || "#")}"><img src="${esc(ann.image)}" alt="${esc(ann.alt || "")}" loading="lazy" width="2257" height="784"></a></div>`;
  }

  /* ---------- الشرائط الأفقية ---------- */
  function rail(id, title, subtitle, items, moreHref) {
    if (!items.length) return "";
    return `<section class="section" id="${id}"><div class="container">
      <div class="section-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
        <div class="rail-nav hide-mobile"><button class="icon-btn" data-rail="${id}" data-dir="1" aria-label="السابق">${icon("prev")}</button><button class="icon-btn" data-rail="${id}" data-dir="-1" aria-label="التالي">${icon("next")}</button></div>
        ${moreHref ? `<a class="link-more m" href="${moreHref}">عرض الكل ${icon("next")}</a>` : ""}
      </div>
      <div class="rail"><div class="rail-track">${items.map(A.card).join("")}</div></div>
    </div></section>`;
  }
  const hist = A.history.list().map((h) => all.find((x) => x.kind === h.kind && x.id === h.id)).filter(Boolean).slice(0, 12);
  const latest = all.slice().sort(A.byDateDesc).slice(0, 14);
  $("#rails").innerHTML =
    rail("continue", "تابع من حيث توقفت", "آخر ما شاهدته على هذا الجهاز", hist) +
    rail("latest", "أحدث الإضافات", "آخر ما أضافه فريق اويبو", latest, "./?tab=episodes&sort=added#library");
  $$("[data-rail]").forEach((b) => b.addEventListener("click", () => {
    const track = $(`#${b.dataset.rail} .rail-track`);
    track.scrollBy({ left: track.clientWidth * 0.85 * (b.dataset.dir === "1" ? 1 : -1), behavior: "smooth" });
  }));

  /* ---------- المكتبة ---------- */
  const TABS = {
    episodes: { label: "الحلقات", icon: "tv", items: lib.episodes },
    movies: { label: "الأفلام", icon: "film", items: lib.movies },
    manga: { label: "المانجا", icon: "book", items: lib.manga },
  };
  const FILTERS = {
    episodes: [["all", "الكل"], ["manga", "مانجا (أساسية)"], ["filler", "فلر"], ["remaster", "مُعاد إنتاجها"], ["unwatched", "لم أشاهدها"]],
    movies: [["all", "الكل"]],
    manga: [["all", "الكل"], ["chapters", "الفصول"], ["special", "فصول خاصة"]],
  };
  const params = new URLSearchParams(location.search);
  const state = {
    tab: TABS[params.get("tab")] ? params.get("tab") : "episodes",
    type: params.get("type") || "all",
    sort: params.get("sort") || "desc",
    q: params.get("q") || "",
  };

  const tabsEl = $("#lib-tabs"), chipsEl = $("#lib-chips"), grid = $("#lib-grid"), info = $("#lib-info");
  const searchEl = $("#lib-search"), sortEl = $("#lib-sort");
  tabsEl.innerHTML = Object.entries(TABS).map(([k, t]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === state.tab}">${icon(t.icon)}${t.label}<span class="count">${t.items.length}</span></button>`).join("");
  searchEl.value = state.q;
  sortEl.value = state.sort;

  function filtered() {
    const t = TABS[state.tab];
    let items = t.items.slice();
    const f = state.type;
    if (state.tab === "episodes" && f !== "all") items = f === "unwatched" ? items.filter((x) => !A.history.isWatched(x.kind, x.id)) : items.filter((x) => x.type === f);
    if (state.tab === "manga" && f !== "all") items = items.filter((x) => (f === "special" ? x.special : !x.special));
    const q = A.norm(state.q);
    if (q) { const tokens = q.split(" "); items = items.filter((x) => tokens.every((tk) => x._search.includes(tk))); }
    if (state.sort === "added") items.sort(A.byDateDesc);
    else items.sort(A.byNumber), state.sort === "desc" && items.reverse();
    return items;
  }
  function countFor(tab, key) {
    const items = TABS[tab].items;
    if (key === "all") return items.length;
    if (tab === "episodes") return key === "unwatched" ? items.filter((x) => !A.history.isWatched(x.kind, x.id)).length : items.filter((x) => x.type === key).length;
    if (tab === "manga") return items.filter((x) => (key === "special" ? x.special : !x.special)).length;
    return 0;
  }
  function render() {
    $$(".tab", tabsEl).forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === state.tab));
    const fl = FILTERS[state.tab];
    if (!fl.some(([k]) => k === state.type)) state.type = "all";
    chipsEl.innerHTML = fl.length > 1 ? fl.map(([k, l]) => `<button class="chip" data-type="${k}" aria-pressed="${k === state.type}">${l}<span class="count">${countFor(state.tab, k)}</span></button>`).join("") : "";
    const items = filtered();
    grid.className = "grid" + (state.tab === "movies" ? " grid-movies" : "");
    grid.innerHTML = items.length ? items.map(A.card).join("") : `<div class="empty-state" style="grid-column:1/-1">${icon("search")}<p>لا توجد نتائج مطابقة${state.q ? ` لـ «${esc(state.q)}»` : ""}.</p></div>`;
    info.textContent = `${items.length} ${state.tab === "episodes" ? "حلقة" : state.tab === "movies" ? "فيلم" : "فصل"}${state.q ? ` تطابق «${state.q}»` : ""}`;
    A.reveal(grid);
    const p = new URLSearchParams();
    if (state.tab !== "episodes") p.set("tab", state.tab);
    if (state.type !== "all") p.set("type", state.type);
    if (state.sort !== "desc") p.set("sort", state.sort);
    if (state.q) p.set("q", state.q);
    const qsStr = p.toString();
    history.replaceState(null, "", (qsStr ? "?" + qsStr : location.pathname) + location.hash);
  }
  tabsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; state.tab = b.dataset.tab; state.type = "all"; render(); });
  chipsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-type]"); if (!b) return; state.type = b.dataset.type; render(); });
  let t;
  searchEl.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.q = searchEl.value.trim(); render(); }, 120); });
  sortEl.addEventListener("change", () => { state.sort = sortEl.value; render(); });

  /* الانتقال للقسم عند الضغط على روابط التبويب من الهيدر/الشريط السفلي */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href*="?tab="]');
    if (!a || !a.href.includes(location.pathname.replace(/index\.html$/, ""))) return;
    const u = new URL(a.href);
    if (u.pathname.replace(/index\.html$/, "") !== location.pathname.replace(/index\.html$/, "")) return;
    e.preventDefault();
    state.tab = u.searchParams.get("tab") || "episodes"; state.type = "all"; state.q = ""; searchEl.value = "";
    if (u.searchParams.get("sort")) { state.sort = u.searchParams.get("sort"); sortEl.value = state.sort; }
    render();
    $("#library").scrollIntoView({ behavior: "smooth" });
  });

  /* اقتراح عشوائي */
  $("#random-btn").addEventListener("click", () => {
    const pool = filtered();
    if (!pool.length) return A.toast("لا توجد عناصر مطابقة");
    const pick = pool[Math.floor(Math.random() * pool.length)];
    A.toast(`🎲 ${pick.kind === "episode" ? "الحلقة " + pick.id : pick._title}`);
    setTimeout(() => (location.href = pick._url), 650);
  });

  render();
  A.reveal();
  if (location.hash === "#library") setTimeout(() => $("#library").scrollIntoView(), 50);
})();
