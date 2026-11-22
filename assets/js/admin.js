/* ==========================================================================
   لوحة النشر — تنشر الحلقات/الأفلام/الفصول مباشرة في مستودع GitHub
   تعمل عبر GitHub API بمفتاح (Token) يُحفظ في متصفحك فقط.
   ========================================================================== */
(async function () {
  "use strict";
  const A = window.Aoibu;
  const { $, $$, esc, icon } = A;
  await A.siteReady;

  /* ---------------- الإعدادات والمفتاح ---------------- */
  const DEF = { owner: "Aoibu", repo: "Aoibu", branch: "main", token: "" };
  let cfg = Object.assign({}, DEF, A.store.get("admin", {}));
  const saveCfg = () => A.store.set("admin", cfg);
  const FILES = { episode: "episodes", movie: "movies", manga: "manga" };
  const KIND_AR = { episode: "الحلقة", movie: "الفيلم", manga: "الفصل" };

  /* ---------------- أدوات Base64 مع دعم العربية ---------------- */
  const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const blobToB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });

  /* ---------------- تنسيق JSON (نفس تنسيق ملفات الموقع) ---------------- */
  const pj = (v) => Array.isArray(v) ? "[" + v.map(pj).join(", ") + "]" : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + pj(x)).join(", ") + "}" : JSON.stringify(v);
  function itemStr(d, ind = "  ") {
    const lines = Object.entries(d).filter(([, v]) => v !== undefined).map(([k, v]) => {
      if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && !Array.isArray(v[0])) return `${ind}  ${JSON.stringify(k)}: [\n${v.map((x) => `${ind}    ${pj(x)}`).join(",\n")}\n${ind}  ]`;
      if (v && typeof v === "object" && !Array.isArray(v) && ["team", "endpoints", "announcement"].includes(k)) return `${ind}  ${JSON.stringify(k)}: {\n${Object.entries(v).map(([a, b]) => `${ind}    ${JSON.stringify(a)}: ${pj(b)}`).join(",\n")}\n${ind}  }`;
      return `${ind}  ${JSON.stringify(k)}: ${pj(v)}`;
    });
    return ind + "{\n" + lines.join(",\n") + "\n" + ind + "}";
  }
  const serializeList = (arr) => "[\n" + arr.map((x) => itemStr(x)).join(",\n") + "\n]\n";
  const serializeObj = (o) => itemStr(o, "") + "\n";

  /* ---------------- GitHub API ---------------- */
  const gh = {
    async req(path, opts = {}) {
      const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${cfg.token}` };
      if (opts.body) headers["Content-Type"] = "application/json";
      let r;
      try { r = await fetch(`https://api.github.com${path}`, Object.assign({}, opts, { headers: Object.assign(headers, opts.headers || {}) })); }
      catch (e) { const er = new Error("تعذّر الاتصال بـ GitHub — تأكد من الإنترنت"); er.status = 0; throw er; }
      if (!r.ok) {
        let m = ""; try { m = (await r.json()).message || ""; } catch (e) {}
        const er = new Error(m || r.statusText); er.status = r.status; throw er;
      }
      return r.status === 204 ? null : r.json();
    },
    path: (p) => `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${p.split("/").map(encodeURIComponent).join("/")}`,
    async getFile(p) {
      const d = await gh.req(`${gh.path(p)}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`, { cache: "no-store" });
      let text;
      if (d.content && d.encoding === "base64") text = b64decode(d.content);
      else text = await (await fetch(`https://api.github.com${gh.path(p)}?ref=${encodeURIComponent(cfg.branch)}`, { headers: { Accept: "application/vnd.github.raw+json", Authorization: `Bearer ${cfg.token}` }, cache: "no-store" })).text();
      return { sha: d.sha, text };
    },
    putFile(p, b64, message, sha) {
      return gh.req(gh.path(p), { method: "PUT", body: JSON.stringify(Object.assign({ message, content: b64, branch: cfg.branch }, sha ? { sha } : {})) });
    },
  };
  function ghError(e) {
    if (e.status === 401) return "المفتاح (Token) غير صحيح أو انتهت صلاحيته. أنشئ مفتاحاً جديداً من قسم «ربط GitHub».";
    if (e.status === 403) return "المفتاح لا يملك صلاحية الكتابة. تأكد أنك اخترت Contents: Read and write للمستودع Aoibu.";
    if (e.status === 404) return "المستودع أو الملف غير موجود، أو المفتاح لا يملك صلاحية على هذا المستودع.";
    if (e.status === 409 || e.status === 422) return "حدث تعارض مع تعديل آخر في نفس اللحظة. أعد المحاولة.";
    return e.message || "خطأ غير معروف";
  }

  /* يقرأ أحدث نسخة من الملف، يعدّلها، ويحفظها (مع إعادة المحاولة عند التعارض) */
  async function commitJSON(file, mutate, message) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { sha, text } = await gh.getFile(`data/${file}.json`);
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`ملف data/${file}.json على GitHub فيه خطأ صيغة — افتح تبويب «فحص» لمعرفة السطر.`); }
      const next = mutate(data);
      const out = Array.isArray(next) ? serializeList(next) : serializeObj(next);
      JSON.parse(out);
      if (out === text) return next;
      try { await gh.putFile(`data/${file}.json`, b64encode(out), message, sha); return next; }
      catch (e) { if ((e.status === 409 || e.status === 422) && attempt < 2) continue; throw e; }
    }
  }

  /* ---------------- حالة الاتصال ---------------- */
  const connBox = $("#conn");
  let me = null;
  async function checkConn() {
    if (!cfg.token) { me = null; renderConn(); return false; }
    connBox.innerHTML = `<div class="panel" style="margin-top:0;display:flex;align-items:center;gap:12px"><span class="spinner" style="width:22px;height:22px;border-width:2px"></span> جاري التحقق من الاتصال بـ GitHub…</div>`;
    try {
      me = await gh.req("/user");
      await gh.req(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`);
      renderConn(); return true;
    } catch (e) { me = null; renderConn(ghError(e)); return false; }
  }
  function renderConn(err) {
    document.body.classList.toggle("is-connected", !!me);
    if (me) {
      connBox.innerHTML = `<div class="conn-ok"><span class="avatar" style="width:36px;height:36px">${me.avatar_url ? `<img src="${esc(me.avatar_url)}&s=72" alt="" style="width:100%;height:100%;border-radius:50%">` : esc(me.login[0])}</span>
        <div style="flex:1;min-width:0"><b>متصل بـ GitHub ✓</b><span>@${esc(me.login)} — المستودع ${esc(cfg.owner)}/${esc(cfg.repo)}</span></div>
        <button class="btn btn-sm btn-ghost" type="button" id="logout">${icon("close")} قطع الاتصال</button></div>`;
      $("#logout").onclick = () => { if (!confirm("قطع الاتصال وحذف المفتاح من هذا الجهاز؟")) return; cfg.token = ""; saveCfg(); me = null; renderConn(); };
      return;
    }
    connBox.innerHTML = `<section class="panel setup" style="margin-top:0">
      <h2 class="panel-title">🔑 ربط اللوحة بـ GitHub (مرة واحدة فقط)</h2>
      ${err ? `<div class="status err" style="margin-bottom:12px">${esc(err)}</div>` : ""}
      <p style="color:var(--text-2);font-size:14px;margin-bottom:10px">حتى يقدر زر «نشر» يضيف الحلقات للموقع، يحتاج مفتاح (Token) من حسابك. سوّه مرة وحدة من الجوال:</p>
      <ol class="steps">
        <li>افتح هذا الرابط وأنت مسجّل دخول: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">إنشاء مفتاح جديد ↗</a></li>
        <li><b>Token name:</b> اكتب <code dir="ltr">Aoibu Admin</code> — و <b>Expiration:</b> اختر المدة (مثلاً 1 year).</li>
        <li><b>Resource owner:</b> اختر <code dir="ltr">${esc(cfg.owner)}</code>.</li>
        <li><b>Repository access:</b> اختر <b>Only select repositories</b> ثم المستودع <code dir="ltr">${esc(cfg.owner)}/${esc(cfg.repo)}</code>.</li>
        <li><b>Permissions:</b> اضغط <b>Add permissions</b> (أو Repository permissions) ← <b>Contents</b> ← اختر <b>Read and write</b>.</li>
        <li>اضغط <b>Generate token</b> وانسخ المفتاح (يبدأ بـ <code dir="ltr">github_pat_</code>) والصقه هنا:</li>
      </ol>
      <div class="form-grid" style="margin-top:10px">
        <input class="input" id="token-in" dir="ltr" placeholder="github_pat_…" autocomplete="off" spellcheck="false">
        <details><summary style="cursor:pointer;color:var(--text-3);font-size:13px">إعدادات متقدمة (اسم المستودع والفرع)</summary>
          <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-top:10px">
            <label>المالك<input class="input" id="cfg-owner" dir="ltr" value="${esc(cfg.owner)}"></label>
            <label>المستودع<input class="input" id="cfg-repo" dir="ltr" value="${esc(cfg.repo)}"></label>
            <label>الفرع<input class="input" id="cfg-branch" dir="ltr" value="${esc(cfg.branch)}"></label>
          </div></details>
        <button class="btn btn-primary" type="button" id="token-save">حفظ وتجربة الاتصال</button>
      </div>
      <p class="hint">🔒 المفتاح يُحفظ في متصفح هذا الجهاز فقط ولا يُرسل لأي مكان غير GitHub. لا تشاركه مع أحد ولا تصوّره. تقدر تلغيه أي وقت من نفس صفحة GitHub.</p>
    </section>`;
    $("#token-save").onclick = async () => {
      const t = $("#token-in").value.trim();
      if (!t) return A.toast("الصق المفتاح أولاً");
      cfg.token = t; cfg.owner = $("#cfg-owner").value.trim() || DEF.owner; cfg.repo = $("#cfg-repo").value.trim() || DEF.repo; cfg.branch = $("#cfg-branch").value.trim() || DEF.branch;
      saveCfg();
      if (await checkConn()) { A.toast("تم الربط بنجاح ✓"); await loadData(true); }
    };
  }

  /* ---------------- البيانات الحالية ---------------- */
  let data = { episode: [], movie: [], manga: [] }, siteCfg = {};
  async function loadData(fromGitHub) {
    const useGH = fromGitHub && me;
    try {
      for (const k of Object.keys(FILES)) {
        if (useGH) data[k] = JSON.parse((await gh.getFile(`data/${FILES[k]}.json`)).text);
        else { const r = await fetch(`data/${FILES[k]}.json?t=${Date.now()}`, { cache: "no-store" }); data[k] = await r.json(); }
      }
      siteCfg = useGH ? JSON.parse((await gh.getFile("data/site.json")).text) : await (await fetch(`data/site.json?t=${Date.now()}`, { cache: "no-store" })).json();
    } catch (e) { A.toast("تعذّر تحميل البيانات الحالية"); console.warn(e); }
    renderManage(); fillBanner(); update();
  }

  /* ---------------- محرّر الصفوف (سيرفرات/تحميل/طاقم) ---------------- */
  function rows(el, fields, addLabel) {
    const list = document.createElement("div"); list.className = "rows";
    const add = document.createElement("button"); add.type = "button"; add.className = "btn btn-sm btn-ghost"; add.innerHTML = `${icon("sparkle")} ${addLabel}`;
    el.append(list, add);
    const addRow = (v = {}) => {
      const r = document.createElement("div"); r.className = "row";
      r.innerHTML = fields.map((f) => `<input class="input" data-k="${f.k}" placeholder="${esc(f.ph)}" ${f.ltr ? 'dir="ltr"' : ""} value="${esc(v[f.k] || "")}" style="flex:${f.flex || 1}">`).join("") + `<button type="button" class="icon-btn" aria-label="حذف">${icon("close")}</button>`;
      $("button", r).onclick = () => { r.remove(); update(); };
      list.appendChild(r);
    };
    add.onclick = () => { addRow(); update(); };
    return {
      get: () => $$(".row", list).map((r) => Object.fromEntries($$("input", r).map((i) => [i.dataset.k, i.value.trim()]))).filter((o) => Object.values(o).some(Boolean) && (o.url !== undefined ? o.url : true)),
      set: (arr) => { list.innerHTML = ""; (arr || []).forEach(addRow); },
    };
  }
  const rServers = rows($("#rows-servers"), [{ k: "name", ph: "اسم السيرفر" }, { k: "url", ph: "رابط المشغّل", ltr: 1, flex: 2 }], "إضافة سيرفر");
  const rDownloads = rows($("#rows-downloads"), [{ k: "host", ph: "الموقع (MediaFire…)" }, { k: "quality", ph: "الجودة" }, { k: "url", ph: "رابط التحميل", ltr: 1, flex: 2 }], "إضافة رابط تحميل");
  const rSoft = rows($("#rows-soft"), [{ k: "label", ph: "الوصف (خام 2، ترجمة 2…)" }, { k: "url", ph: "الرابط", ltr: 1, flex: 2 }], "إضافة رابط");
  const rMangaDl = rows($("#rows-mangadl"), [{ k: "host", ph: "الموقع" }, { k: "format", ph: "PDF / ZIP" }, { k: "url", ph: "الرابط", ltr: 1, flex: 2 }], "إضافة رابط تحميل");
  const rCredits = rows($("#rows-credits"), [{ k: "role", ph: "الدور (ترجمة، تصميم…)" }, { k: "name", ph: "الاسم", ltr: 1 }], "إضافة عضو");

  /* ---------------- النموذج ---------------- */
  const form = $("#pub-form");
  const F = (n) => form.elements.namedItem(n);
  let kind = "episode", editing = null; // editing = {kind, id}
  const today = () => new Date().toISOString().slice(0, 10);

  function setKind(k, keep) {
    kind = k;
    $$("#kind-tabs .tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.k === k));
    $$("[data-for]", form).forEach((el) => (el.hidden = !el.dataset.for.split(" ").includes(k)));
    $("#lbl-id").textContent = k === "movie" ? "رقم الفيلم *" : k === "manga" ? "رقم الفصل *" : "رقم الحلقة *";
    F("id").placeholder = k === "movie" ? "M29" : k === "manga" ? "1153 أو SP2" : "1205";
    if (!keep) { resetForm(); }
    update();
  }
  $("#kind-tabs").addEventListener("click", (e) => { const t = e.target.closest("[data-k]"); if (!t) return; if (editing && !confirm("إلغاء التعديل الحالي؟")) return; editing = null; setKind(t.dataset.k); });

  function nextId(k) {
    const nums = (data[k] || []).map((x) => parseFloat(String(x.id).replace(/[^\d.]/g, ""))).filter((n) => !isNaN(n) && n > 0);
    const n = nums.length ? Math.floor(Math.max(...nums)) + 1 : 1;
    return k === "movie" ? "M" + n : String(n);
  }
  function resetForm() {
    form.reset(); editing = null;
    [rServers, rDownloads, rSoft, rMangaDl, rCredits].forEach((r) => r.set([]));
    F("date").value = today();
    F("id").value = nextId(kind);
    F("defaultCredits").checked = true;
    $("#poster-prev").innerHTML = "";
    $("#editing-bar").hidden = true;
    $("#publish-btn .lbl").textContent = "نشر";
    update();
  }

  function build() {
    const f = Object.fromEntries(new FormData(form).entries());
    const s = (k) => (f[k] || "").trim();
    const id = s("id");
    const o = { id };
    const num = parseFloat(id.replace(/[^\d.]/g, ""));
    if (kind === "manga" && /^sp/i.test(id)) o.number = 0; else if (!isNaN(num)) o.number = num;
    if (s("title")) o.title = s("title");
    if (kind === "episode") o.type = f.type || "filler";
    if (kind === "movie") { if (s("titleEn")) o.titleEn = s("titleEn"); if (s("year")) o.year = +s("year") || s("year"); }
    if (kind === "manga" && /^sp/i.test(id)) o.special = true;
    const tags = s("tags").split(/[،,]/).map((x) => x.trim()).filter(Boolean); if (tags.length) o.tags = tags;
    if (kind === "manga" && s("translator")) o.translator = s("translator");
    if (s("date")) o.date = s("date");
    if (kind === "manga") {
      o.reader = s("reader");
      const d = rMangaDl.get().filter((x) => x.url); if (d.length) o.downloads = d.map((x) => ({ host: x.host || A.hostName(x.url), format: x.format || (/\.zip/i.test(x.url) ? "ZIP" : "PDF"), url: x.url }));
      return o;
    }
    if (s("poster")) o.poster = s("poster");
    if (s("drive")) o.drive = s("drive");
    if (s("mega")) o.mega = s("mega");
    const sv = rServers.get().filter((x) => x.url); if (sv.length) o.servers = sv.map((x) => ({ name: x.name || A.hostName(x.url), url: x.url }));
    const dl = rDownloads.get().filter((x) => x.url); if (dl.length) o.downloads = dl.map((x) => Object.assign({ host: x.host || A.hostName(x.url) }, x.quality ? { quality: x.quality } : {}, { url: x.url }));
    if (s("raw")) o.raw = s("raw");
    if (s("sub")) o.sub = s("sub");
    const so = rSoft.get().filter((x) => x.url); if (so.length) o.softsub = so.map((x) => ({ label: x.label || A.hostName(x.url), url: x.url }));
    if (kind === "movie" && s("trailer")) o.trailer = s("trailer");
    if (s("story")) o.story = s("story");
    if (kind === "episode") {
      if (s("note")) o.note = s("note");
      if (F("defaultCredits").checked) o.credits = "default";
      else { const c = rCredits.get().filter((x) => x.name); if (c.length) o.credits = c.map((x) => ({ role: x.role, name: x.name })); }
    }
    return o;
  }
  /* عند التعديل: نحافظ على أي حقول إضافية قديمة غير موجودة في النموذج */
  const MANAGED = ["id", "number", "title", "type", "titleEn", "year", "special", "tags", "translator", "date", "reader", "poster", "drive", "mega", "servers", "downloads", "raw", "sub", "softsub", "trailer", "story", "note", "credits"];
  function merge(orig, fresh) {
    const out = Object.assign({}, fresh);
    Object.keys(orig || {}).forEach((k) => { if (!MANAGED.includes(k)) out[k] = orig[k]; });
    return out;
  }

  function validate(o) {
    const errs = [], warns = [];
    if (!o.id) errs.push("رقم الحلقة مطلوب");
    if (kind === "movie" && o.id && !/^m\d+/i.test(o.id)) errs.push("رقم الفيلم يجب أن يبدأ بحرف M (مثل M29)");
    const dup = (data[kind] || []).some((x) => String(x.id).toLowerCase() === o.id.toLowerCase());
    if (dup && (!editing || editing.id.toLowerCase() !== o.id.toLowerCase())) errs.push(`الرقم ${o.id} موجود مسبقاً — استخدم «إدارة المنشور» لتعديله`);
    if (kind !== "manga" && !o.title) errs.push("العنوان مطلوب");
    if (kind === "manga" && !o.reader) errs.push("رابط القارئ مطلوب");
    if (kind !== "manga" && !o.drive && !o.mega && !(o.servers || []).length) errs.push("أضف رابط Drive أو Mega أو سيرفر واحد على الأقل");
    if (o.drive && !/drive\.google\.com\/(file\/d\/|open\?id=)/.test(o.drive)) warns.push("رابط Drive غير معتاد (المفروض يحتوي drive.google.com/file/d/)");
    if (o.mega && !/mega\.nz\/(file|embed)\//.test(o.mega)) warns.push("رابط Mega المفروض يكون بصيغة mega.nz/file/…");
    ["poster", "drive", "mega", "raw", "sub", "reader", "trailer"].forEach((k) => { if (o[k] && !/^https?:\/\//.test(o[k]) && !(k === "poster" && /^assets\//.test(o[k]))) errs.push(`الرابط في «${k}» يجب أن يبدأ بـ https://`); });
    if (kind !== "manga" && !o.poster) warns.push("ما في صورة — يُفضّل إضافة صورة للحلقة");
    return { errs, warns };
  }

  function update() {
    const o = build();
    const { errs, warns } = validate(o);
    const it = A.expand(Object.assign({ date: today() }, o), kind);
    const src = F("poster") && F("poster").value.trim();
    if (src && /^assets\//.test(src) && $("#poster-prev").dataset.local) it.poster = $("#poster-prev").dataset.local;
    $("#preview").innerHTML = `<div style="max-width:320px">${A.card(it).replace("reveal", "in").replace(/<a /, '<div ').replace(/<\/a>$/, "</div>")}</div>`;
    $("#checks").innerHTML = errs.map((x) => `<div class="chk bad">⛔ ${esc(x)}</div>`).join("") + warns.map((x) => `<div class="chk warn">⚠️ ${esc(x)}</div>`).join("") + (!errs.length ? `<div class="chk ok">✓ جاهز للنشر</div>` : "");
    $("#out").textContent = itemStr(merge(editing ? (data[kind] || []).find((x) => String(x.id) === editing.id) : null, o));
    const btn = $("#publish-btn");
    btn.disabled = !!errs.length || !me;
    $("#publish-hint").textContent = !me ? "اربط اللوحة بـ GitHub أولاً (بالأعلى)" : errs.length ? "أكمل الحقول المطلوبة" : editing ? `سيتم حفظ التعديلات على ${KIND_AR[kind]} ${o.id}` : `سيتم نشر ${KIND_AR[kind]} ${o.id} في الموقع`;
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);

  /* ---------------- رفع صورة من الجهاز ---------------- */
  $("#poster-file").addEventListener("change", async (e) => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    if (!me) return A.toast("اربط اللوحة بـ GitHub أولاً لرفع الصور");
    const prev = $("#poster-prev");
    prev.innerHTML = `<span class="spinner" style="width:22px;height:22px;border-width:2px"></span> جاري تجهيز الصورة ورفعها…`;
    try {
      const blob = await shrink(file, 1280);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const id = (F("id").value.trim() || "new").replace(/[^\w.-]/g, "");
      const path = `assets/posters/${kind}-${id}-${Date.now().toString(36)}.${ext}`;
      await gh.putFile(path, await blobToB64(blob), `رفع صورة ${KIND_AR[kind]} ${id}`);
      F("poster").value = path;
      const local = URL.createObjectURL(blob);
      prev.dataset.local = local;
      prev.innerHTML = `<img src="${local}" alt="" style="max-height:90px;border-radius:10px"> <span style="color:var(--c-success)">✓ تم رفع الصورة (${Math.round(blob.size / 1024)}KB)</span>`;
      update();
    } catch (er) { prev.innerHTML = `<span style="color:var(--c-danger)">تعذّر رفع الصورة: ${esc(ghError(er))}</span>`; }
  });
  function shrink(file, max) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => {
          if (b && b.type === "image/webp") return res(b);
          c.toBlob((j) => (j ? res(j) : rej(new Error("فشل تحويل الصورة"))), "image/jpeg", 0.86);
        }, "image/webp", 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => rej(new Error("الملف ليس صورة صالحة"));
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------------- النشر ---------------- */
  $("#publish-btn").addEventListener("click", async () => {
    const o = build();
    const { errs } = validate(o);
    if (errs.length) return A.toast(errs[0]);
    const btn = $("#publish-btn"); btn.disabled = true;
    const lbl = $(".lbl", btn), old = lbl.textContent; lbl.textContent = "جاري النشر…";
    const wasEditing = editing;
    try {
      const file = FILES[kind];
      const msg = wasEditing ? `تعديل ${KIND_AR[kind]} ${o.id}${o.title ? " — " + o.title : ""}` : `إضافة ${KIND_AR[kind]} ${o.id}${o.title ? " — " + o.title : ""}`;
      data[kind] = await commitJSON(file, (arr) => {
        if (wasEditing) {
          const i = arr.findIndex((x) => String(x.id).toLowerCase() === wasEditing.id.toLowerCase());
          if (i < 0) throw new Error("لم يتم العثور على العنصر الأصلي (ربما حُذف)");
          if (o.id.toLowerCase() !== wasEditing.id.toLowerCase() && arr.some((x) => String(x.id).toLowerCase() === o.id.toLowerCase())) throw new Error(`الرقم ${o.id} موجود مسبقاً`);
          arr[i] = merge(arr[i], o);
        } else {
          if (arr.some((x) => String(x.id).toLowerCase() === o.id.toLowerCase())) throw new Error(`الرقم ${o.id} موجود مسبقاً على الموقع`);
          arr.push(o);
        }
        return arr;
      }, msg);
      showDone(o, !!wasEditing);
      renderManage();
    } catch (e) {
      A.toast("فشل النشر");
      $("#checks").insertAdjacentHTML("afterbegin", `<div class="chk bad">⛔ فشل النشر: ${esc(e.status !== undefined ? ghError(e) : e.message)}</div>`);
    } finally { lbl.textContent = old; update(); }
  });

  /* نافذة النجاح + متابعة ظهور الحلقة على الموقع */
  let pollTimer;
  function showDone(o, edited) {
    const url = (kind === "manga" ? "read.html?id=" : "watch.html?id=") + encodeURIComponent(o.id);
    const dlg = $("#done");
    $("#done-body").innerHTML = `<div style="font-size:56px;line-height:1">✅</div>
      <h2 style="font-size:24px;margin:10px 0 6px">${edited ? "تم حفظ التعديلات" : "تم النشر بنجاح"}</h2>
      <p style="color:var(--text-2)">${KIND_AR[kind]} <b>${esc(o.id)}</b>${o.title ? ` — ${esc(o.title)}` : ""}</p>
      <div class="live" id="live"><span class="spinner" style="width:18px;height:18px;border-width:2px"></span> جاري تحديث الموقع… (عادةً أقل من دقيقتين)</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:18px">
        <a class="btn btn-primary" href="${url}" target="_blank" rel="noopener">${icon("external")} فتح في الموقع</a>
        <button class="btn" type="button" id="done-new">${icon("sparkle")} إضافة ${kind === "movie" ? "فيلم" : kind === "manga" ? "فصل" : "حلقة"} جديد${kind === "episode" ? "ة" : ""}</button>
      </div>`;
    dlg.hidden = false;
    $("#done-new").onclick = () => { dlg.hidden = true; resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    clearInterval(pollTimer);
    const started = Date.now(), file = FILES[kind], target = JSON.stringify(o);
    pollTimer = setInterval(async () => {
      try {
        const live = await (await fetch(`data/${file}.json?t=${Date.now()}`, { cache: "no-store" })).json();
        const hit = live.find((x) => String(x.id).toLowerCase() === o.id.toLowerCase());
        if (hit && (!edited || JSON.stringify(Object.fromEntries(Object.keys(o).map((k) => [k, hit[k]]))) === target)) {
          clearInterval(pollTimer);
          const l = $("#live"); if (l) l.innerHTML = `<span style="color:var(--c-success)">🎉 ظهرت الآن على الموقع للجميع!</span>`;
        }
      } catch (e) {}
      if (Date.now() - started > 5 * 60e3) { clearInterval(pollTimer); const l = $("#live"); if (l) l.innerHTML = "تم الحفظ على GitHub ✓ — إذا ما ظهرت بعد، تأكد من تبويب Actions في GitHub."; }
    }, 8000);
  }
  $("#done").addEventListener("click", (e) => { if (e.target.id === "done" || e.target.closest("[data-close-done]")) $("#done").hidden = true; });

  /* ---------------- إدارة المنشور (تعديل/حذف) ---------------- */
  let mKind = "episode";
  function renderManage() {
    const box = $("#manage-list"); if (!box) return;
    const q = A.norm($("#manage-q").value);
    $$("#manage-kinds .chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.k === mKind));
    const items = (data[mKind] || []).map((x, i) => A.expand(Object.assign({ _i: i }, x), mKind)).filter((x) => !q || x._search.includes(q)).sort((a, b) => b.number - a.number || b._i - a._i);
    box.innerHTML = items.length ? items.map((x) => `<div class="m-row">
      <span class="thumb">${x.kind === "manga" ? `<span>${x.special ? "★" : esc(x.number)}</span>` : x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span>
      <span class="info"><b>${esc(x.kind === "episode" ? x.id + " — " + x._title : x._title)}</b><span>${esc(x.kind === "episode" ? (A.TYPES[x.type] || {}).label || "" : x.kind === "movie" ? "فيلم" : "مانجا")}${x.date ? " • " + esc(x.date) : ""}</span></span>
      <a class="icon-btn" href="${x._url}" target="_blank" rel="noopener" aria-label="فتح">${icon("eye")}</a>
      <button class="icon-btn" type="button" data-edit="${esc(x.id)}" aria-label="تعديل" title="تعديل">✏️</button>
      <button class="icon-btn" type="button" data-del="${esc(x.id)}" aria-label="حذف" title="حذف">🗑️</button></div>`).join("") : `<div class="empty-state">لا توجد نتائج</div>`;
  }
  $("#manage-kinds").addEventListener("click", (e) => { const c = e.target.closest("[data-k]"); if (c) { mKind = c.dataset.k; renderManage(); } });
  $("#manage-q").addEventListener("input", renderManage);
  $("#manage-list").addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
    if (ed) startEdit(mKind, ed.dataset.edit);
    if (del) {
      if (!me) return A.toast("اربط اللوحة بـ GitHub أولاً");
      const id = del.dataset.del;
      if (!confirm(`حذف ${KIND_AR[mKind]} ${id} نهائياً من الموقع؟`)) return;
      del.disabled = true;
      try {
        data[mKind] = await commitJSON(FILES[mKind], (arr) => arr.filter((x) => String(x.id).toLowerCase() !== id.toLowerCase()), `حذف ${KIND_AR[mKind]} ${id}`);
        A.toast(`تم حذف ${KIND_AR[mKind]} ${id} ✓`); renderManage();
      } catch (er) { A.toast("فشل الحذف: " + ghError(er)); del.disabled = false; }
    }
  });
  function startEdit(k, id) {
    const it = (data[k] || []).find((x) => String(x.id) === String(id));
    if (!it) return;
    setTab("publish"); setKind(k, true); resetForm();
    editing = { kind: k, id: String(it.id) };
    F("id").value = it.id;
    ["title", "titleEn", "year", "date", "poster", "drive", "mega", "raw", "sub", "trailer", "story", "note", "reader", "translator"].forEach((f) => { if (F(f)) F(f).value = it[f] != null ? it[f] : ""; });
    F("tags").value = (it.tags || []).join("، ");
    if (k === "episode") $$('input[name="type"]', form).forEach((r) => (r.checked = r.value === (it.type || "filler")));
    rServers.set(it.servers); rSoft.set(it.softsub);
    if (k === "manga") rMangaDl.set(it.downloads); else rDownloads.set(it.downloads);
    if (k === "episode") {
      F("defaultCredits").checked = !it.credits || it.credits === "default";
      rCredits.set(Array.isArray(it.credits) ? it.credits : []);
      if (!it.credits) F("defaultCredits").checked = false;
    }
    $("#poster-prev").innerHTML = ""; delete $("#poster-prev").dataset.local;
    if (it.servers || it.downloads || it.softsub || Array.isArray(it.credits)) $("#extra").open = true;
    $("#editing-bar").hidden = false;
    $("#editing-what").textContent = `${KIND_AR[k]} ${it.id}`;
    $("#publish-btn .lbl").textContent = "حفظ التعديلات";
    syncCredits(); update();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("#cancel-edit").onclick = () => { editing = null; resetForm(); };
  function syncCredits() { $("#rows-credits").hidden = F("defaultCredits").checked; }
  F("defaultCredits").addEventListener("change", syncCredits);

  /* ---------------- البانر ---------------- */
  const bForm = $("#banner-form");
  const BF = (n) => bForm.elements.namedItem(n);
  function fillBanner() {
    const a = siteCfg.announcement || {};
    BF("show").checked = !!a.show; BF("image").value = a.image || ""; BF("link").value = a.link || ""; BF("alt").value = a.alt || "";
    const sel = BF("featured");
    const eps = (data.episode || []).slice().sort((x, y) => (parseFloat(y.id) || 0) - (parseFloat(x.id) || 0));
    sel.innerHTML = `<option value="">تلقائي — أحدث حلقة مضافة</option>` + eps.map((e) => `<option value="${esc(e.id)}">${esc(e.id)} — ${esc(e.title || "")}</option>`).join("") + (data.movie || []).map((m) => `<option value="${esc(m.id)}">فيلم ${esc(m.number)} — ${esc(m.title || "")}</option>`).join("");
    sel.value = siteCfg.featured || "";
    bannerPrev();
  }
  function bannerPrev() { const v = BF("image").value.trim(); $("#banner-prev").innerHTML = v ? `<img src="${esc(bForm.dataset.local || v)}" alt="" style="width:100%;border-radius:12px;border:1px solid var(--line)" onerror="this.remove()">` : ""; }
  bForm.addEventListener("input", bannerPrev);
  $("#banner-file").addEventListener("change", async (e) => {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    if (!me) return A.toast("اربط اللوحة بـ GitHub أولاً");
    A.toast("جاري رفع البانر…");
    try {
      const blob = await shrink(file, 2400);
      const path = `assets/posters/banner-${Date.now().toString(36)}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
      await gh.putFile(path, await blobToB64(blob), "رفع بانر جديد");
      BF("image").value = path; bForm.dataset.local = URL.createObjectURL(blob); bannerPrev(); A.toast("تم رفع البانر ✓ — اضغط حفظ");
    } catch (er) { A.toast("فشل رفع البانر: " + ghError(er)); }
  });
  $("#banner-save").addEventListener("click", async () => {
    if (!me) return A.toast("اربط اللوحة بـ GitHub أولاً");
    const btn = $("#banner-save"); btn.disabled = true;
    try {
      siteCfg = await commitJSON("site", (s) => {
        s.announcement = Object.assign({}, s.announcement, { show: BF("show").checked, image: BF("image").value.trim(), link: BF("link").value.trim() || "#", alt: BF("alt").value.trim() });
        const f = BF("featured").value;
        if (f) s.featured = f; else delete s.featured;
        return s;
      }, "تحديث البانر والواجهة");
      A.toast("تم حفظ البانر ✓ — يظهر خلال دقيقة");
    } catch (er) { A.toast("فشل الحفظ: " + ghError(er)); }
    finally { btn.disabled = false; }
  });

  /* ---------------- الفحص ---------------- */
  function lint(name, arr) {
    const issues = [], ids = {};
    if (!Array.isArray(arr)) return ["الملف يجب أن يبدأ بـ [ وينتهي بـ ]"];
    arr.forEach((x, i) => {
      const where = `العنصر ${i + 1}${x && x.id ? ` (${x.id})` : ""}`;
      if (!x || typeof x !== "object") return issues.push(`${where}: ليس عنصراً صحيحاً`);
      if (!x.id) issues.push(`${where}: لا يوجد id`);
      else if (ids[String(x.id).toLowerCase()]) issues.push(`${where}: الرقم مكرر`); else ids[String(x.id).toLowerCase()] = 1;
      if (name !== "manga") {
        if (!x.title) issues.push(`${where}: لا يوجد عنوان`);
        if (!x.drive && !x.mega && !(x.servers || []).length) issues.push(`${where}: لا يوجد سيرفر مشاهدة`);
        if (name === "episodes" && x.type && !A.TYPES[x.type]) issues.push(`${where}: النوع "${x.type}" غير معروف`);
      } else if (!x.reader) issues.push(`${where}: لا يوجد رابط قارئ`);
    });
    return issues;
  }
  $("#check-live").addEventListener("click", async () => {
    const box = $("#check-out"); box.innerHTML = '<div class="spinner"></div>';
    const out = [];
    for (const n of ["episodes", "movies", "manga", "site"]) {
      try {
        const t = me ? (await gh.getFile(`data/${n}.json`)).text : await (await fetch(`data/${n}.json?t=${Date.now()}`, { cache: "no-store" })).text();
        let d; try { d = JSON.parse(t); } catch (e) { out.push(`<div class="error-box" style="margin:0"><b dir="ltr">data/${n}.json</b><pre>${esc(A.describeJSONError(t, e))}</pre></div>`); continue; }
        const iss = n === "site" ? [] : lint(n, d);
        out.push(iss.length ? `<div class="chk warn"><b dir="ltr">data/${n}.json</b> — ${iss.length} ملاحظة:<br>${iss.map(esc).join("<br>")}</div>` : `<div class="chk ok">✓ <b dir="ltr">data/${n}.json</b> سليم${Array.isArray(d) ? ` (${d.length})` : ""}</div>`);
      } catch (e) { out.push(`<div class="chk bad">تعذّر تحميل data/${n}.json</div>`); }
    }
    box.innerHTML = out.join("");
  });

  /* ---------------- النسخ اليدوي (بديل بدون GitHub) ---------------- */
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); A.toast("تم النسخ ✓"); } catch (e) { prompt("انسخ:", t); } };
  $("#copy-btn").onclick = () => copy(",\n" + $("#out").textContent);

  /* ---------------- التبويبات الرئيسية ---------------- */
  function setTab(t) {
    $$("#main-tabs .tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.t === t));
    $$("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== t));
    if (t === "manage") renderManage();
    if (location.hash.slice(1) !== t) history.replaceState(null, "", "#" + t);
  }
  $("#main-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) setTab(b.dataset.t); });
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (["publish", "manage", "banner", "validate"].includes(h)) setTab(h); });

  /* ---------------- البدء ---------------- */
  setTab(["manage", "banner", "validate"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "publish");
  setKind("episode");
  syncCredits();
  await checkConn();
  await loadData(true);
  resetForm();
  window.addEventListener("beforeunload", (e) => { if (editing) { e.preventDefault(); e.returnValue = ""; } });
})();
