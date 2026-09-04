/* bias-kb Atlas — 俯瞰 → 研究線 → 主張 → 根拠の鎖 → ノード、と対話的に近づくための単一ファイル UI。
   依存: d3 v7（同梱）。データ: <script id="atlas-data"> の JSON（kb_atlas.py が生成）。 */
(function () {
  "use strict";
  // データは同梱（<script id="atlas-data">）か、外部 JSON（<body data-atlas-src="kb/nodes.json">）から読む
  const inline = document.getElementById("atlas-data");
  const src = document.body.dataset.atlasSrc;
  if (!inline && src) {
    document.getElementById("app").innerHTML = '<div style="padding:40px;font:14px system-ui;color:#5b6577">データ読み込み中 … <code>' + src + '</code></div>';
    fetch(src).then(r => { if (!r.ok) throw new Error(r.status + " " + r.statusText); return r.json(); }).then(d => boot(d)).catch(e => {
      document.getElementById("app").innerHTML = '<div style="padding:40px;font:14px system-ui;color:#b91c1c;max-width:720px"><b>データを読み込めませんでした</b>（' + String(e.message) + '）。<br>このページはローカルの file:// では動きません。<code>python3 -m http.server 8000</code> を実行して <code>http://localhost:8000/</code> で開くか、GitHub Pages の URL で開いてください。</div>';
    });
    return;
  }
  boot(JSON.parse(inline.textContent));
  function boot(DATA) {
  const META = DATA.meta, NODES = DATA.nodes;
  const byId = new Map(NODES.map(n => [n.id, n]));
  const REPO = "https://github.com/" + (META.repo || "jxta/ai4math-lab");
  const TYPES = ["Object", "Quantity", "Evidence", "Claim", "Hypothesis", "Protocol", "ExecutionUnit", "Lesson"];
  const TLET = { Object: "O", Quantity: "Q", Evidence: "E", Claim: "C", Hypothesis: "H", Protocol: "P", ExecutionUnit: "X", Lesson: "L" };
  const TJA = { Object: "対象", Quantity: "量", Evidence: "証拠", Claim: "主張", Hypothesis: "仮説", Protocol: "登録", ExecutionUnit: "実行", Lesson: "教訓" };
  const STATUSES = ["established", "registered-hit", "supported", "promoted", "provisional", "open", "challenged", "rejected", "rejected-recorded", "superseded"];
  const SJA = { established: "確立", "registered-hit": "登録的中", supported: "支持", promoted: "昇格", provisional: "暫定", open: "未決", challenged: "係争", rejected: "棄却", "rejected-recorded": "棄却記録", superseded: "置換済" };
  const REL_JA = { about: "対象", quantities: "量", supported_by: "根拠", refuted_by: "反証", registered_by: "登録", derives_from: "派生元", supersedes: "置換する", superseded_by: "置換された", promoted_to: "昇格先", related: "関連", grounded_in: "接地", supports: "支持する", refutes: "反証する", verifies: "検証する", taught_by: "教えた証拠", constrains: "制約" };
  const LINES = META.lines;
  const LINE_COLORS = { "O-fs-family": "#2a78d6", "O-qec-family": "#eb6834", "O-ecnf-family": "#1baf7a", "O-dihedral-artin-family": "#eda100", "O-cubic-family": "#e87ba4", "O-fingerprint-family": "#008300", "O-ff-q3-family": "#4a3aa7", "dir-A": "#e34948", "dir-B": "#0e7490", principles: "#7c3aed", program: "#6b7280", unassigned: "#a3a9b5" };
  const lineById = new Map(LINES.map(l => [l.id, l]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const typeColor = (t) => css("--c-" + (TLET[t] || "O")) || "#888";
  const statusColor = (s) => css("--s-" + (s || "none")) || css("--s-none");
  const lineColor = (l) => LINE_COLORS[l] || "#999";
  const lineLabel = (l) => (lineById.get(l) || {}).label || l;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtN = (n) => (n == null ? "" : Number(n).toLocaleString("ja-JP"));
  const ID_RE = /\b([OQECHPXL]-[a-z0-9][a-z0-9-]*)\b/g;
  const md = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(ID_RE, (m) => byId.has(m) ? `<a class="nl" data-node="${m}">${m}</a>` : m).replace(/\n/g, "<br>");
  const short = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const plain = (s) => String(s || "").replace(/\*\*/g, "").replace(/`/g, "");
  const textOf = (n) => n.statement || n.definition || n.entry || "";
  const k4Of = (xid) => K4[xid] || null;
  const k4Badge = (xid) => { const r = k4Of(xid); if (!r) return `<span class="badge" style="background:${css("--s-none")}" title="k4 記録なし">再実行記録なし</span>`; const c = r.status === "PASS" ? statusColor("established") : r.status === "PENDING" ? statusColor("provisional") : statusColor("rejected"); const t = r.status === "PASS" ? `再実行 PASS（got ${r.got} / want ${r.want}）` : r.note || r.status; return `<span class="badge" style="background:${c}" title="${esc(t)}">${r.status === "PASS" ? "再実行 PASS" : r.status === "PENDING" ? "再実行 保留（mdx）" : esc(r.status)}</span>`; };
  const reciprocal = (a, b) => { const A = byId.get(a), B = byId.get(b); if (!A || !B) return false; return B._out.some(e => e.to === a); };
  const repoLink = (path) => { if (!path) return ""; const pth = String(path).replace(/^annex:\s*/, ""); if (PUBLIC) { return BUNDLED.has(pth) && PUBREPO ? `<a href="${PUBREPO}/blob/main/${esc(pth)}" target="_blank" rel="noopener"><code>${esc(pth)}</code></a> <span class="badge" style="background:${statusColor("established")}">同梱</span>` : `<code>${esc(pth)}</code> <span class="muted small">（非公開リポジトリ内）</span>`; } return `<a href="${REPO}/blob/main/${esc(pth)}" target="_blank" rel="noopener"><code>${esc(pth)}</code></a>`; };
  const prLink = (p) => { if (p == null || p === "") return ""; const m = String(p).match(/^#?(\d{1,5})$/); return m ? `<a href="${REPO}/pull/${m[1]}" target="_blank" rel="noopener">#${m[1]}</a>` : `<span class="muted">${esc(p)}</span>`; };

  // ------------------------------------------------------------------ state & routing
  const allDates = [...new Set(NODES.map(n => n._date).filter(Boolean))].sort();
  const defaultView = () => META.profile === "public-grounding" ? ((META.guide && META.guide.rows && META.guide.rows.length) ? "guide" : "grounding") : "atlas";
  const state = {
    view: defaultView(), line: null, node: null, trail: [], trailPos: -1,
    f: { types: new Set(TYPES), statuses: new Set([...STATUSES, "none"]), lines: new Set(LINES.map(l => l.id)), tiers: new Set(["full", "accept", "spot", "none"]), d0: 0, d1: allDates.length - 1, actors: new Set(["統率", "meta", "other"]) },
    colorMode: "type", filtersOpen: window.innerWidth > 1100, inspOpen: window.innerWidth > 1100, graphColor: "line", graphFocus: null, graphDepth: 2, tlDay: null,
  };
  function actorOf(n) { const a = ((n.prov || {}).asserted_by || ""); return a.startsWith("統率") ? "統率" : a.includes("meta") ? "meta" : "other"; }
  function tierOf(n) { return n.tier || "none"; }
  function passes(n) {
    const f = state.f;
    if (!f.types.has(n.type)) return false;
    if (!f.statuses.has(n.status || "none")) return false;
    if (!f.lines.has(n._line)) return false;
    if (n.type === "ExecutionUnit" && !f.tiers.has(tierOf(n))) return false;
    if (!f.actors.has(actorOf(n))) return false;
    if (n._date) { const i = allDates.indexOf(n._date); if (i < f.d0 || i > f.d1) return false; }
    return true;
  }
  let VISIBLE = NODES.filter(passes);
  const recompute = () => { VISIBLE = NODES.filter(passes); };
  function pushHash() {
    const p = new URLSearchParams();
    p.set("v", state.view); if (state.line) p.set("line", state.line); if (state.node) p.set("node", state.node);
    if (state.view === "graph" && state.graphFocus) p.set("focus", state.graphFocus);
    const h = "#" + p.toString(); if (location.hash !== h) { suppressHash = true; location.hash = h; }
  }
  let suppressHash = false;
  function readHash() {
    const p = new URLSearchParams(location.hash.replace(/^#/, ""));
    state.view = p.get("v") || defaultView(); state.line = p.get("line"); const nd = p.get("node");
    if (nd && byId.has(nd)) selectNode(nd, false); else if (!nd) state.node = null;
    if (p.get("focus")) state.graphFocus = p.get("focus");
  }
  window.addEventListener("hashchange", () => { if (suppressHash) { suppressHash = false; return; } readHash(); render(); });

  function selectNode(id, addTrail = true) {
    if (!byId.has(id)) return; state.node = id;
    if (addTrail) { state.trail = state.trail.slice(0, state.trailPos + 1); if (state.trail[state.trail.length - 1] !== id) state.trail.push(id); if (state.trail.length > 60) state.trail.shift(); state.trailPos = state.trail.length - 1; }
    state.inspOpen = true;
  }
  function go(view, params = {}) { state.view = view; if ("line" in params) state.line = params.line; if (params.node) selectNode(params.node); render(); }
  function open(id) { selectNode(id); hideTT(); pushHash(); layout(); refreshSelection(); renderInspector(); }
  function refreshSelection() {
    document.querySelectorAll("#stage [data-node]").forEach(el => { if (el.classList.contains("nodecard") || el.tagName === "TR") el.classList.toggle("sel", el.dataset.node === state.node); });
    d3.selectAll("#stage svg [data-nid]").attr("stroke", function () { const d = this.dataset; return d.nid === state.node ? css("--ink") : (d.stroke || null); }).attr("stroke-width", function () { return this.dataset.nid === state.node ? 2.5 : (this.dataset.sw || 1); });
  }

  // ------------------------------------------------------------------ shell
  const app = document.getElementById("app");
  app.innerHTML = `
  <header class="hdr">
    <div class="brand"><b>bias-kb Atlas</b><small>${esc(META.version || "")} · ${fmtN(NODES.length)} nodes · ${esc((META.generated_at || "").slice(0, 10))}</small></div>
    <nav class="tabs" id="tabs"></nav>
    <div class="search"><input id="q" placeholder="ID・ラベル・本文を検索（/ でフォーカス）" autocomplete="off"><span class="kbd">/</span><div class="drop" id="drop"></div></div>
    <button class="iconbtn" id="btnFilters" title="フィルタ列の表示切替">⛭ フィルタ</button>
    <button class="iconbtn" id="btnInsp" title="詳細パネルの表示切替">▤ 詳細</button>
    <button class="iconbtn" id="btnTheme" title="ライト／ダーク">◐</button>
    <button class="iconbtn" id="btnHelp" title="凡例・使い方">?</button>
  </header>
  <div class="help" id="help" hidden><div class="helpbox"><div class="helphd"><b>bias-kb Atlas — 凡例と使い方</b><button class="iconbtn" id="helpClose">✕</button></div><div class="helpbd" id="helpBody"></div></div></div>
  ${META.profile === "public-grounding" ? `<div class="banner" id="banner"><b>公開抜粋</b> — 知識基盤 bias-kb（private リポジトリ <code>${esc(META.repo)}</code>、${esc((META.generated_at || "").slice(0, 10))} 時点 ${fmtN(META.stats.full_n || 0)} ノード）から、<b>主張 → 証拠 → 再実行可能な実行単位</b> の鎖に関わる ${fmtN(NODES.length)} ノードを規則で抜き出したものです（関数体 census 線と Q8 の W 層）。offline 実行単位の凍結入力は同梱され、<code>python3 rerun.py</code> で再実行できます${META.public_repo ? `（<a href="https://github.com/${esc(META.public_repo)}" target="_blank" rel="noopener">${esc(META.public_repo)}</a>）` : ""}。</div>` : ""}
  <div class="body" id="body"><aside class="rail" id="rail"></aside><main class="stage" id="stage"></main><aside class="insp" id="insp"><div class="splitter" id="split"></div><div id="inspBody"></div></aside></div>
  <div class="tt" id="tt"></div>`;
  const $ = (s, r = document) => r.querySelector(s);
  if (META.profile === "public-grounding") app.classList.add("hasbanner");
  const PUBLIC = META.profile === "public-grounding";
  const K4 = META.k4 || {};
  const BUNDLED = new Set(META.bundled || []);
  const PUBREPO = META.public_repo ? "https://github.com/" + META.public_repo : "";
  const HAS_GUIDE = !!(META.guide && META.guide.rows && META.guide.rows.length);
  const VIEWS = [...(HAS_GUIDE ? [["guide", "案内"]] : []), ["grounding", "接地"], ["atlas", "俯瞰"], ["lines", "研究線"], ["timeline", "時間"], ["graph", "グラフ"], ["lessons", "教訓"], ["protocols", "登録・判定"], ["table", "表"]];
  $("#tabs").innerHTML = VIEWS.map(([k, l]) => `<button class="tab" data-v="${k}">${l}</button>`).join("");
  $("#tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) go(b.dataset.v); });
  $("#btnFilters").onclick = () => { state.filtersOpen = !state.filtersOpen; layout(); };
  $("#btnHelp").onclick = () => { renderHelp(); $("#help").hidden = false; };
  $("#helpClose").onclick = () => { $("#help").hidden = true; };
  $("#help").addEventListener("click", e => { if (e.target.id === "help") $("#help").hidden = true; });
  function renderHelp() {
    $("#helpBody").innerHTML = `
      <p>このページは、リポジトリ <code>${esc(META.repo)}</code> の <code>knowledge/</code> にある記録層（ノード JSON）から <code>kb_atlas.py</code> が生成した自己完結の閲覧ツールです（生成 ${esc(META.generated_at)}、ソース ${esc(META.source)} ${esc(META.source_ref)}）。記録層は書き換えません。</p>
      <h4>ノードの 8 型</h4><div class="legend">${TYPES.map(t => `<span class="it"><span class="sw" style="background:${typeColor(t)}"></span><b>${TLET[t]}</b> ${TJA[t]}（${t}）</span>`).join("")}</div>
      <p class="small muted">主張（C）は証拠（E）に、証拠は再実行できる実行単位（X）と凍結 sha 付きの成果物に接地します。仮説（H）は予想、登録（P）は走行前に凍結した事前登録、教訓（L）は失敗から規則へ昇格した知識です。</p>
      <h4>状態（status）</h4><div class="legend">${STATUSES.map(st => `<span class="it"><span class="sw" style="background:${statusColor(st)}"></span>${SJA[st]}（${st}）</span>`).join("")}</div>
      <p class="small muted">棄却された主張も <code>rejected-recorded</code> として残り、<code>supersedes</code> で系譜がつながります。<code>registered-hit</code> は走行前に凍結した予測が的中したものです。</p>
      <h4>リンクの意味</h4><div class="legend">${Object.keys(REL_JA).map(r => `<span class="it"><code>${r}</code> ${REL_JA[r]}</span>`).join("")}</div>
      <h4>研究線への帰属</h4><p class="small muted">対象（O）は <code>derives_from</code> を根まで辿って研究線（O-*-family）に置き、主張・仮説は <code>about</code>、証拠は <code>supported_by</code> の逆リンク、実行単位は <code>verifies</code>、教訓は <code>taught_by</code>、登録は <code>registered_by</code> の逆リンク、量は <code>quantities</code> の逆リンクから多数決で決めます。<code>direction: A/B</code> を持つノードは研究線 A/B、<code>C-principle-*</code> は「横断原理」、根と方向ノードは「プログラム根」です。残りはリンク全体の多数決と ID の接頭辞で置きます（表示上の帰属であり、記録層の値ではありません）。</p>
      <h4>操作</h4><ul class="small"><li><b>接地</b>: 主張ごとに 証拠 → 実行単位（tier・k4 再実行の結果）→ 成果物 sha → 登録 を一覧。「辿る」で詳細へ。実行単位カードの「再実行」欄にコマンド・入力 sha256・期待値・k4 記録。</li><li><b>俯瞰</b>: 円をクリックで近づく（研究線 → 型 → ノード）、背景クリックで一段戻る。葉の色は 型／状態／日付 で切替。</li><li><b>研究線</b>: 主張の梯子（状態別）、対象の派生木、仮説・登録・教訓・証拠・量。</li><li><b>時間</b>: 日ごとの新規ノード。ドラッグで期間を選ぶとフィルタに反映、棒クリックでその日の一覧。</li><li><b>グラフ</b>: ホバーで近傍を強調、クリックで詳細、ダブルクリックでそのノードを中心に近傍だけ表示。</li><li><b>教訓／登録・判定／表</b>: 一覧。表は列見出しで並べ替え、CSV 書き出し。</li><li><b>詳細パネル</b>: 本文中のノード ID はクリックで移動。「根拠の鎖」は 登録 → 主張 → 証拠 → 実行 → 教訓 の並び。← → で履歴。⧉ で URL をコピー（ハッシュに現在地が入ります）。</li><li><b>キー</b>: <code>/</code> 検索、<code>Esc</code> 閉じる。</li></ul>`;
  }
  $("#btnInsp").onclick = () => { state.inspOpen = !state.inspOpen; layout(); };
  (function theme() {
    const saved = (() => { try { return localStorage.getItem("atlas-theme"); } catch (e) { return null; } })();
    const sys = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = saved || (sys ? "dark" : "light");
    $("#btnTheme").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("atlas-theme", t); } catch (e) { } render(); };
  })();
  function layout() { const b = $("#body"); b.classList.toggle("nofilters", !state.filtersOpen); b.classList.toggle("noinsp", !state.inspOpen); document.documentElement.style.setProperty("--hdr-h", ($(".hdr").offsetHeight || 52) + "px"); }
  window.addEventListener("resize", () => layout());
  // splitter for inspector width
  (function splitter() {
    const sp = $("#split"); let dragging = false, w = 440;
    sp.addEventListener("mousedown", e => { dragging = true; e.preventDefault(); });
    window.addEventListener("mousemove", e => { if (!dragging) return; w = Math.max(320, Math.min(window.innerWidth - 500, window.innerWidth - e.clientX)); document.documentElement.style.setProperty("--inspw", w + "px"); $("#body").style.gridTemplateColumns = `${state.filtersOpen ? 250 : 0}px 1fr ${state.inspOpen ? w : 0}px`; });
    window.addEventListener("mouseup", () => { dragging = false; });
  })();
  // tooltip
  const tt = $("#tt");
  function showTT(html, e) { tt.innerHTML = html; tt.style.display = "block"; moveTT(e); }
  function moveTT(e) { const x = Math.min(window.innerWidth - 380, e.clientX + 14), y = Math.min(window.innerHeight - 120, e.clientY + 14); tt.style.left = x + "px"; tt.style.top = y + "px"; }
  function hideTT() { tt.style.display = "none"; }
  function nodeTT(n) { return `<b>${esc(n.id)}</b>${esc(short(n.label, 120))}<br><span style="opacity:.8">${esc(TJA[n.type])}${n.status ? " · " + esc(SJA[n.status] || n.status) : ""} · ${esc(n._date || "")} · ${esc((lineById.get(n._line) || {}).short || "")}</span>`; }
  // delegated clicks on node links / cards
  document.addEventListener("click", e => {
    hideTT();
    const a = e.target.closest("[data-node]"); if (a) { if (!a.dataset.node) return; e.preventDefault(); open(a.dataset.node); return; }
    const l = e.target.closest("[data-line]"); if (l) { go("lines", { line: l.dataset.line }); return; }
    if (!e.target.closest(".search")) $("#drop").classList.remove("show");
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); $("#q").select(); }
    if (e.key === "Escape") { $("#drop").classList.remove("show"); $("#q").blur(); }
  });

  // ------------------------------------------------------------------ search
  const SEARCH_INDEX = NODES.map(n => ({ n, id: n.id.toLowerCase(), lbl: (n.label || "").toLowerCase(), txt: (textOf(n) + " " + (n.counterpoints || "")).toLowerCase() }));
  function search(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const toks = q.split(/\s+/).filter(Boolean); const res = [];
    for (const it of SEARCH_INDEX) {
      let sc = 0, ok = true;
      for (const t of toks) {
        if (it.id === t) sc += 100; else if (it.id.startsWith(t)) sc += 40; else if (it.id.includes(t)) sc += 20;
        else if (it.lbl.includes(t)) sc += 12; else if (it.txt.includes(t)) sc += 4; else { ok = false; break; }
      }
      if (ok) res.push([sc + (passes(it.n) ? 1 : 0), it.n]);
    }
    return res.sort((a, b) => b[0] - a[0]).slice(0, 40).map(r => r[1]);
  }
  let curHit = -1;
  $("#q").addEventListener("input", e => {
    const hits = search(e.target.value); const d = $("#drop"); curHit = -1;
    if (!hits.length) { d.classList.remove("show"); d.innerHTML = ""; return; }
    d.innerHTML = hits.map(n => `<div class="hit" data-node="${n.id}">${badgeType(n)}<div><div class="lbl">${esc(short(n.label, 110))}</div><div class="sub"><code>${esc(n.id)}</code> · ${esc(SJA[n.status] || n.status || TJA[n.type])} · ${esc(n._date)} · ${esc((lineById.get(n._line) || {}).short || "")}</div></div></div>`).join("");
    d.classList.add("show");
  });
  $("#q").addEventListener("keydown", e => {
    const d = $("#drop"), hits = [...d.querySelectorAll(".hit")]; if (!hits.length) return;
    if (e.key === "ArrowDown") { curHit = Math.min(hits.length - 1, curHit + 1); } else if (e.key === "ArrowUp") { curHit = Math.max(0, curHit - 1); } else if (e.key === "Enter") { const h = hits[curHit] || hits[0]; open(h.dataset.node); d.classList.remove("show"); return; } else return;
    hits.forEach((h, i) => h.classList.toggle("cur", i === curHit)); hits[curHit].scrollIntoView({ block: "nearest" }); e.preventDefault();
  });
  $("#q").addEventListener("focus", e => { if (e.target.value) $("#drop").classList.add("show"); });

  // ------------------------------------------------------------------ small renderers
  function badgeType(n) { return `<span class="badge type" style="background:${typeColor(n.type)}">${TLET[n.type]} ${TJA[n.type]}</span>`; }
  function badgeStatus(n) { return n.status ? `<span class="badge" style="background:${statusColor(n.status)}">${esc(SJA[n.status] || n.status)}</span>` : ""; }
  function badgeLine(l) { return `<span class="badge" data-line="${l}" style="background:${lineColor(l)};cursor:pointer" title="研究線ビューへ">${esc((lineById.get(l) || {}).short || l)}</span>`; }
  function chip(id, extra = "") {
    const n = byId.get(id); if (!n) return `<span class="chip"><span class="id">${esc(id)}</span></span>`;
    return `<span class="chip" data-node="${id}" title="${esc(short(n.label, 200))}"><span class="dot" style="background:${typeColor(n.type)}"></span><span class="id">${esc(id)}</span><span class="t">${esc(short(n.label, 70))}</span>${extra}</span>`;
  }
  function card(n, o = {}) {
    return `<div class="nodecard${state.node === n.id ? " sel" : ""}" data-node="${n.id}"><div class="h">${badgeType(n)}${badgeStatus(n)}<span class="id">${esc(n.id)}</span></div><div class="lbl">${esc(short(n.label, o.len || 140))}</div><div class="meta"><span>${esc(n._date)}</span>${o.line !== false ? `<span>${esc((lineById.get(n._line) || {}).short || "")}</span>` : ""}${n.tier ? `<span>tier ${esc(n.tier)}</span>` : ""}<span>次数 ${n._deg}</span></div></div>`;
  }
  function statusBar(nodes) {
    const c = d3.rollup(nodes.filter(n => n.status), v => v.length, n => n.status); const tot = d3.sum([...c.values()]) || 1;
    return `<div class="bar">${STATUSES.filter(s => c.get(s)).map(s => `<i style="width:${100 * c.get(s) / tot}%;background:${statusColor(s)}" title="${esc(SJA[s])} ${c.get(s)}"></i>`).join("")}</div>`;
  }

  // ------------------------------------------------------------------ filter rail
  function renderRail() {
    const rail = $("#rail"); const vis = VISIBLE;
    const cnt = (pred) => NODES.filter(n => pred(n)).length, vcnt = (pred) => vis.filter(n => pred(n)).length;
    const rows = (title, key, items, colorFn, labelFn) => `<h4>${title} <span class="right"></span></h4><div class="mini"><button data-all="${key}">全て</button><button data-none="${key}">なし</button></div>` +
      items.map(it => `<div class="row${state.f[key].has(it) ? "" : " off"}" data-f="${key}" data-val="${esc(it)}"><span class="sw" style="background:${colorFn(it)}"></span><span>${esc(labelFn(it))}</span><span class="cnt">${vcnt(n => keyOf(key, n) === it)}/${cnt(n => keyOf(key, n) === it)}</span></div>`).join("");
    rail.innerHTML = `<div class="hint">表示中 <b class="count">${fmtN(vis.length)}</b> / ${fmtN(NODES.length)} ノード</div>
      ${rows("型", "types", TYPES, typeColor, t => `${TLET[t]} ${TJA[t]}（${t}）`)}
      ${rows("状態", "statuses", [...STATUSES, "none"], s => s === "none" ? css("--s-none") : statusColor(s), s => s === "none" ? "状態なし" : `${SJA[s]}（${s}）`)}
      ${rows("研究線", "lines", LINES.map(l => l.id), lineColor, l => lineLabel(l))}
      <h4>期間</h4><div class="daterange"><span id="dl0">${allDates[state.f.d0]}</span> — <span id="dl1">${allDates[state.f.d1]}</span></div>
      <input type="range" id="r0" min="0" max="${allDates.length - 1}" value="${state.f.d0}"><input type="range" id="r1" min="0" max="${allDates.length - 1}" value="${state.f.d1}">
      ${rows("実行 tier（X のみ）", "tiers", ["full", "accept", "spot", "none"], () => "#94a3b8", t => t)}
      ${rows("主張者", "actors", ["統率", "meta", "other"], () => "#94a3b8", a => ({ "統率": "統率AI", meta: "meta-AI", other: "その他" })[a])}
      <div class="mini" style="margin-top:12px"><button id="fReset">フィルタを初期化</button></div>`;
    rail.onclick = e => {
      const r = e.target.closest(".row[data-f]"); if (r) { const s = state.f[r.dataset.f]; if (s.has(r.dataset.val)) s.delete(r.dataset.val); else s.add(r.dataset.val); update(); return; }
      const a = e.target.closest("[data-all]"); if (a) { const k = a.dataset.all; state.f[k] = new Set(allValues(k)); update(); return; }
      const nn = e.target.closest("[data-none]"); if (nn) { state.f[nn.dataset.none] = new Set(); update(); return; }
      if (e.target.id === "fReset") { state.f = { types: new Set(TYPES), statuses: new Set([...STATUSES, "none"]), lines: new Set(LINES.map(l => l.id)), tiers: new Set(["full", "accept", "spot", "none"]), d0: 0, d1: allDates.length - 1, actors: new Set(["統率", "meta", "other"]) }; update(); }
    };
    const r0 = $("#r0"), r1 = $("#r1");
    r0.oninput = () => { state.f.d0 = Math.min(+r0.value, state.f.d1); $("#dl0").textContent = allDates[state.f.d0]; }; r0.onchange = update;
    r1.oninput = () => { state.f.d1 = Math.max(+r1.value, state.f.d0); $("#dl1").textContent = allDates[state.f.d1]; }; r1.onchange = update;
  }
  function keyOf(key, n) { return key === "types" ? n.type : key === "statuses" ? (n.status || "none") : key === "lines" ? n._line : key === "tiers" ? (n.type === "ExecutionUnit" ? tierOf(n) : null) : actorOf(n); }
  function allValues(k) { return k === "types" ? TYPES : k === "statuses" ? [...STATUSES, "none"] : k === "lines" ? LINES.map(l => l.id) : k === "tiers" ? ["full", "accept", "spot", "none"] : ["統率", "meta", "other"]; }
  function update() { recompute(); render(); }

  // ------------------------------------------------------------------ views
  function render() {
    layout(); pushHash();
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === state.view));
    renderRail(); renderStage(); renderInspector();
  }
  function renderStage() {
    const stage = $("#stage"); stage.innerHTML = "";
    ({ guide: viewGuide, grounding: viewGrounding, atlas: viewAtlas, lines: viewLines, timeline: viewTimeline, graph: viewGraph, lessons: viewLessons, protocols: viewProtocols, table: viewTable }[state.view] || viewAtlas)(stage);
  }

  // ---------- 案内（研究計画調書 図２ との対応） ----------
  function viewGuide(stage) {
    const G = META.guide; if (!G || !G.rows || !G.rows.length) { viewGrounding(stage); return; }
    const rowHtml = G.rows.map(r => `<tr id="gr-${esc(r.key)}" data-key="${esc(r.key)}"><td class="gfig">${esc(r.fig)}</td><td class="gkb">${md(r.kb)}</td><td class="gex">${(r.nodes || []).map(id => chip(id)).join("") || '<span class="muted small">—</span>'}${r.view ? `<div style="margin-top:5px"><button class="iconbtn small" data-go="${esc(r.view)}">${esc(r.view_label || r.view)} →</button></div>` : ""}</td></tr>`).join("");
    const steps = (G.steps || []).map(s => `<li><b>${esc(s.title)}</b> — ${md(s.text)}${s.node ? ` <button class="iconbtn small" data-trace="${esc(s.node)}">開く</button>` : ""}</li>`).join("");
    stage.innerHTML = `<div class="pad guide">
      <h2 class="vt">${esc(G.title)}</h2>
      <p class="vsub">${esc(G.source)}</p>
      <div class="card gfigure">${G.svg || ""}</div>
      <div class="card" style="padding:0;overflow:auto;margin-top:12px"><table class="tbl gtbl"><thead><tr><th>図２の要素</th><th>この知識基盤での実体</th><th>実例（クリックで詳細）／見る場所</th></tr></thead><tbody>${rowHtml}</tbody></table></div>
      <div class="card" style="margin-top:12px"><h3 class="ct">３分で確かめる</h3><ol class="gsteps">${steps}</ol></div>
      <p class="small muted" style="margin-top:8px">この案内は生成器（<code>kb_atlas.py</code> の <code>GUIDE</code>）が埋め込んだもので、実例のノード ID は生成時に記録層で実在を確認している。図の要素・実例・「→」ボタンはすべてこのページ内のビューへ移動する。</p>
    </div>`;
    const svg = stage.querySelector(".gfigure svg");
    const rowOf = (key) => stage.querySelector(`#gr-${CSS.escape(key)}`);
    if (svg) svg.querySelectorAll(".hot").forEach(h => {
      h.addEventListener("click", e => {
        e.stopPropagation(); const key = h.dataset.key, tr = rowOf(key); if (!tr) return;
        svg.querySelectorAll(".hot").forEach(x => x.classList.toggle("on", x === h));
        stage.querySelectorAll(".gtbl tr.on").forEach(x => x.classList.remove("on")); tr.classList.add("on");
        tr.scrollIntoView({ block: "center", behavior: "smooth" });
        const row = G.rows.find(r => r.key === key); if (row && row.nodes && row.nodes.length) open(row.nodes[0]);
      });
      h.addEventListener("mouseenter", () => { const tr = rowOf(h.dataset.key); if (tr) tr.classList.add("hl"); });
      h.addEventListener("mouseleave", () => { const tr = rowOf(h.dataset.key); if (tr) tr.classList.remove("hl"); });
    });
    stage.querySelectorAll(".gtbl tr[data-key]").forEach(tr => {
      tr.addEventListener("mouseenter", () => { if (svg) { const h = svg.querySelector(`.hot[data-key="${tr.dataset.key}"]`); if (h) h.classList.add("on"); } });
      tr.addEventListener("mouseleave", () => { if (svg) { const h = svg.querySelector(`.hot[data-key="${tr.dataset.key}"]`); if (h && !tr.classList.contains("on")) h.classList.remove("on"); } });
    });
    stage.addEventListener("click", e => {
      const g = e.target.closest("[data-go]"); if (g) { e.stopPropagation(); go(g.dataset.go); return; }
      const b = e.target.closest("[data-trace]"); if (b) { e.stopPropagation(); open(b.dataset.trace); }
    });
  }

  // ---------- 接地 ----------
  function chainOf(c) {
    const evs = [...(c.supported_by || []), ...(c.refuted_by || [])].filter(e => byId.has(e));
    const xs = new Set(); evs.forEach(e => { const E = byId.get(e); (E.grounded_in || []).forEach(x => { if (byId.has(x)) xs.add(x); }); E._in.filter(i => i.rel === "verifies").forEach(i => xs.add(i.from)); });
    const ps = new Set([...(c.registered_by || []), ...evs.flatMap(e => byId.get(e).registered_by || [])].filter(p => byId.has(p)));
    const arts = evs.flatMap(e => byId.get(e).artifacts || []);
    const xarr = [...xs].map(x => byId.get(x));
    const k4s = xarr.map(x => k4Of(x.id)).filter(Boolean);
    return { evs, xs: xarr, ps: [...ps], arts, pass: k4s.filter(r => r.status === "PASS").length, pending: k4s.filter(r => r.status === "PENDING").length, offline: xarr.filter(x => (x.env || {}).offline).length, verified: arts.filter(a => a.sha_verified === "verified").length, sha: arts.filter(a => a.sha256).length };
  }
  function viewGrounding(stage) {
    const vis = VISIBLE; const claims = vis.filter(n => n.type === "Claim" || (n.type === "Hypothesis" && (n.supported_by || []).length));
    const rows = claims.map(c => ({ c, ch: chainOf(c) }));
    const grounded = rows.filter(r => r.ch.xs.length).length, withPass = rows.filter(r => r.ch.pass).length;
    const Xall = vis.filter(n => n.type === "ExecutionUnit"); const Xoff = Xall.filter(x => (x.env || {}).offline);
    const k4pass = Xoff.filter(x => (k4Of(x.id) || {}).status === "PASS").length;
    const Eall = vis.filter(n => n.type === "Evidence"); let pairs = 0, bidir = 0; Eall.forEach(E => (E.grounded_in || []).forEach(x => { if (!byId.has(x)) return; pairs++; if ((byId.get(x).verifies || []).includes(E.id)) bidir++; }));
    const arts = Eall.flatMap(E => E.artifacts || []); const artsSha = arts.filter(a => a.sha256).length, artsVer = arts.filter(a => a.sha_verified === "verified").length;
    const Pfrozen = vis.filter(n => n.type === "Protocol" && n.frozen).length, hits = vis.filter(n => n.status === "registered-hit").length;
    const order = { "registered-hit": 0, established: 1, supported: 2, promoted: 2, provisional: 3, open: 4, challenged: 5, rejected: 6, "rejected-recorded": 6 };
    rows.sort((a, b) => (b.ch.pass - a.ch.pass) || ((order[a.c.status] ?? 9) - (order[b.c.status] ?? 9)) || (b.c._date || "").localeCompare(a.c._date || ""));
    const kp = (v, l, s = "") => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
    const cloneCmd = PUBLIC && PUBREPO ? `git clone ${PUBREPO}.git && cd ${esc(META.public_repo.split("/")[1])} && python3 rerun.py` : `git clone git@github.com:${esc(META.repo)}.git && cd ${esc(META.repo.split("/")[1])} && python3 knowledge/tools/kb_k4.py`;
    stage.innerHTML = `<div class="pad">
      <h2 class="vt">接地 — 主張から再実行可能な証拠へ</h2>
      <p class="vsub">「知識グラフ上の各主張を、それを生んだ再現可能な研究に双方向リンクで接地させ、AI の推論が常に再実行可能な証拠に遡れる構造とする」を、この KB がどう実装しているかを、表示中のノードで実測する。</p>
      <div class="grid g3" style="margin-bottom:12px">
        <div class="card"><h3 class="ct">P1 計算接地</h3><div class="small">主張 <code>supported_by</code>→ 証拠 <code>grounded_in</code>→ 実行単位（<code>entry</code> コマンド・<code>inputs</code> の sha256・<code>expected</code>・<code>env</code>）。CI の R9 検査「接地律」が、証拠を持たない主張と実行単位を持たない証拠を拒否する。</div></div>
        <div class="card"><h3 class="ct">P2 双方向性</h3><div class="small">証拠 <code>grounded_in</code> ⇄ 実行単位 <code>verifies</code> は記録層に<b>両方向</b>で書く（下の実測）。主張 ⇄ 証拠の逆向きは <code>backlinks.json</code> を CI が導出し「双方向律」で照合。この画面の「入るリンク」がその逆リンク。</div></div>
        <div class="card"><h3 class="ct">P3 実行粒度</h3><div class="small">実行単位は <code>tier</code>（full = 本走・accept = 受入・spot = 抽出照合）で再実行の範囲とコストを限定。offline 単位は 1 コマンドで再実行でき、<code>kb_k4.py</code> が全単位を再走して一致率を記録する（k4）。</div></div>
      </div>
      <div class="grid g4" style="margin-bottom:12px">
        ${kp(`${claims.length ? Math.round(100 * grounded / claims.length) : 0}%`, "構造接地率（主張 → 証拠 → 実行単位）", `${grounded}/${claims.length} 主張`)}
        ${kp(`${pairs ? Math.round(100 * bidir / pairs) : 0}%`, "双方向ペア（grounded_in ⇄ verifies）", `${bidir}/${pairs} 組が記録層に両方向あり`)}
        ${kp(`${k4pass}<span class="muted small"> / ${Xoff.length}</span>`, "offline 実行単位の再実行一致（k4）", `本走（full）${Xall.filter(x => x.tier === "full").length} · 受入/抽出 ${Xall.filter(x => x.tier !== "full").length}`)}
        ${kp(`${artsVer}<span class="muted small"> / ${artsSha}</span>`, "sha256 実照合済みの成果物", `凍結登録 ${Pfrozen} · 登録的中 ${hits} · 再実行 PASS を持つ主張 ${withPass}`)}
      </div>
      <div class="card" style="margin-bottom:12px"><h3 class="ct">再実行のしかた</h3><div class="small">各実行単位の <code>entry</code> をリポジトリ直下で実行し、<code>expected</code> と比べる。まとめて走らせるには:</div><pre class="raw" style="max-height:none">${esc(cloneCmd)}</pre><div class="small muted">実行単位カードの「再実行」欄に、個別のコマンド・入力の sha256・期待値・k4 の記録（got / want）を示す。</div></div>
      <div class="card" style="padding:0;overflow:auto"><table class="tbl"><thead><tr><th>主張</th><th>状態</th><th>証拠</th><th>実行単位（tier・再実行）</th><th>成果物 sha</th><th>登録</th><th></th></tr></thead><tbody>
      ${rows.map(({ c, ch }) => `<tr data-node="${c.id}" class="${state.node === c.id ? "sel" : ""}"><td><code>${esc(c.id)}</code><div class="small">${esc(short(c.label, 70))}</div></td><td>${badgeStatus(c)}</td><td>${ch.evs.map(e => chip(e)).join("") || "—"}</td><td>${ch.xs.map(x => `<div style="margin:2px 0">${chip(x.id)} <span class="badge" style="background:${css("--muted")}">${esc(x.tier || "?")}</span> ${k4Badge(x.id)}</div>`).join("") || '<span class="muted">—</span>'}</td><td class="nowrap">${ch.sha ? `${ch.verified}/${ch.sha} 実照合` : "—"}</td><td>${ch.ps.map(p => chip(p)).join("") || "—"}</td><td><button class="iconbtn small" data-trace="${c.id}">辿る</button></td></tr>`).join("")}</tbody></table></div></div>`;
    stage.addEventListener("click", e => { const b = e.target.closest("[data-trace]"); if (b) { e.stopPropagation(); open(b.dataset.trace); } });
  }

  // ---------- 俯瞰 ----------
  function viewAtlas(stage) {
    const vis = VISIBLE; const claims = vis.filter(n => n.type === "Claim");
    const cS = (s) => claims.filter(n => n.status === s).length;
    const grounded = claims.filter(c => (c.supported_by || []).some(e => { const E = byId.get(e); return E && (E.grounded_in || []).some(x => byId.has(x)); })).length;
    const kp = (v, l, s = "") => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
    stage.innerHTML = `<div class="pad">
      <h2 class="vt">俯瞰 — 研究線 × 型 × 状態</h2><p class="vsub">円は研究線 → 型 → ノード。クリックで近づき、葉（ノード）をクリックすると右に詳細。背景クリックで戻る。フィルタ列で絞り込むと全ビューに反映。</p>
      <div class="grid g4" style="margin-bottom:14px">
        ${kp(fmtN(vis.length), "表示ノード", (() => { const last = META.stats.date_max; const dn = NODES.filter(n => n._date === last); const st = [...new Set(dn.flatMap(n => (n.prov || {}).statu || []))].sort(); return `全 ${fmtN(NODES.length)} · 最終更新 ${last}（${dn.length} ノード${st.length ? "、STATU " + st[0] + (st.length > 1 ? "–" + st[st.length - 1] : "") : ""}）`; })())}
        ${kp(`${cS("established")} <span class="muted small">/ ${claims.length}</span>`, "確立した主張（established）", `支持 ${cS("supported")} · 登録的中 ${cS("registered-hit")} · 昇格 ${cS("promoted")}`)}
        ${kp(`${cS("challenged") + cS("rejected") + cS("rejected-recorded")}`, "係争・棄却された主張", `係争 ${cS("challenged")} · 棄却 ${cS("rejected")} · 棄却記録 ${cS("rejected-recorded")}`)}
        ${kp(`${claims.length ? Math.round(100 * grounded / claims.length) : 0}%`, "主張 → 証拠 → 実行単位 の接地率", `${grounded}/${claims.length} が E→X の鎖を持つ · 教訓 ${vis.filter(n => n.type === "Lesson").length} · 登録 ${vis.filter(n => n.type === "Protocol").length}`)}
      </div>
      <div class="toolbar"><span class="hint">葉の色:</span><span class="seg"><button data-cm="type" class="${state.colorMode === "type" ? "on" : ""}">型</button><button data-cm="status" class="${state.colorMode === "status" ? "on" : ""}">状態</button><button data-cm="date" class="${state.colorMode === "date" ? "on" : ""}">日付</button></span>
        <span class="legend" id="packLegend"></span><span class="right hint">葉の大きさ = 次数（リンク数）＋1</span></div>
      <div class="pack" id="pack"><div class="zoomhint" id="zoomhint">全体</div></div>
      <h3 class="ct" style="margin-top:16px">研究線ごとの状態（クリックで研究線ビュー）</h3>
      <div class="linecards" id="linecards"></div>
      <h3 class="ct" style="margin-top:16px">横断原理 × 研究線 — 原理がどの線の証拠・主張に接地しているか（セルをクリックで原理の詳細）</h3>
      <div class="card" style="padding:0;overflow:auto" id="matrix"></div></div>`;
    stage.querySelector(".toolbar").onclick = e => { const b = e.target.closest("[data-cm]"); if (b) { state.colorMode = b.dataset.cm; render(); } };
    // legend
    const lg = $("#packLegend");
    if (state.colorMode === "type") lg.innerHTML = TYPES.map(t => `<span class="it"><span class="sw" style="background:${typeColor(t)}"></span>${TLET[t]} ${TJA[t]}</span>`).join("");
    else if (state.colorMode === "status") lg.innerHTML = [...STATUSES, "none"].map(s => `<span class="it"><span class="sw" style="background:${s === "none" ? css("--s-none") : statusColor(s)}"></span>${s === "none" ? "なし" : SJA[s]}</span>`).join("");
    else lg.innerHTML = `<span class="it"><span class="sw" style="background:#c7d2fe"></span>${META.stats.date_min}</span><span class="it">→</span><span class="it"><span class="sw" style="background:#1e3a8a"></span>${META.stats.date_max}</span>`;
    // line cards
    $("#linecards").innerHTML = LINES.map(l => { const ns = vis.filter(n => n._line === l.id); if (!ns.length) return ""; const cl = ns.filter(n => n.type === "Claim"); const last = d3.max(ns, n => n._date) || ""; return `<div class="linecard" data-line="${l.id}"><div class="n"><span class="sw" style="background:${lineColor(l.id)}"></span>${esc(l.label)}<span class="right muted small">${ns.length}</span></div>${statusBar(ns)}<div class="st"><span>主張 ${cl.length}</span><span>証拠 ${ns.filter(n => n.type === "Evidence").length}</span><span>教訓 ${ns.filter(n => n.type === "Lesson").length}</span><span>最終 ${last}</span></div></div>`; }).join("");
    drawPack($("#pack"), vis);
    // principle × line matrix
    const prins = NODES.filter(n => n._line === "principles" && n.type === "Claim").sort((a, b) => a.id.localeCompare(b.id));
    const cols = LINES.filter(l => !["principles", "program", "unassigned"].includes(l.id));
    const visSet = new Set(vis.map(n => n.id));
    const touch = (p) => { const ids = new Set([...(p.supported_by || []), ...(p.related || []), ...p._in.filter(e => e.rel === "related" || e.rel === "supports").map(e => e.from)]); const c = new Map(); for (const id of ids) { const m = byId.get(id); if (!m || !visSet.has(id)) continue; c.set(m._line, (c.get(m._line) || []).concat(id)); } return c; };
    $("#matrix").innerHTML = `<table class="tbl"><thead><tr><th>原理</th>${cols.map(c => `<th style="text-align:center"><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${lineColor(c.id)};margin-right:4px"></span>${esc(c.short)}</th>`).join("")}</tr></thead><tbody>${prins.map(p => { const t = touch(p); return `<tr><td><span class="chip" data-node="${p.id}"><span class="dot" style="background:${typeColor("Claim")}"></span><span class="t">${esc(short(p.label, 46))}</span></span></td>${cols.map(c => { const arr = t.get(c.id) || []; return `<td style="text-align:center;cursor:${arr.length ? "pointer" : "default"}" data-node="${arr.length ? p.id : ""}" title="${esc(arr.join(", "))}">${arr.length ? `<b>${arr.length}</b>` : '<span class="muted">·</span>'}</td>`; }).join("")}</tr>`; }).join("")}</tbody></table>`;
  }
  let packFocus = null; // {line, type} — survives re-renders
  function drawPack(host, vis) {
    const W = host.clientWidth || 900, H = Math.max(480, window.innerHeight - 220);
    const groups = d3.groups(vis, n => n._line, n => n.type);
    const data = { name: "root", children: LINES.map(l => { const g = groups.find(x => x[0] === l.id); if (!g) return null; return { name: l.id, line: l.id, children: TYPES.map(t => { const tg = g[1].find(x => x[0] === t); if (!tg) return null; return { name: t, type: t, line: l.id, children: tg[1].map(n => ({ name: n.id, node: n, value: 1 + Math.sqrt(n._deg) })) }; }).filter(Boolean) }; }).filter(Boolean) };
    const root = d3.pack().size([W, H]).padding(d => d.depth === 0 ? 16 : d.depth === 1 ? 7 : 2.5)(d3.hierarchy(data).sum(d => d.value || 0).sort((a, b) => b.value - a.value));
    const svg = d3.select(host).insert("svg", ":first-child").attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g");
    let focus = root, view;
    const dateScale = d3.scaleSequential(d3.interpolate("#c7d2fe", "#1e3a8a")).domain([0, Math.max(1, allDates.length - 1)]);
    const leafFill = d => state.colorMode === "type" ? typeColor(d.data.node.type) : state.colorMode === "status" ? (d.data.node.status ? statusColor(d.data.node.status) : css("--s-none")) : dateScale(allDates.indexOf(d.data.node._date));
    const nodesSel = g.selectAll("circle").data(root.descendants().slice(1)).join("circle")
      .attr("data-nid", d => d.depth === 3 ? d.data.node.id : null).attr("data-stroke", d => d.depth === 3 ? "none" : null).attr("data-sw", 1)
      .attr("fill", d => d.depth === 1 ? lineColor(d.data.line) : d.depth === 2 ? typeColor(d.data.type) : leafFill(d))
      .attr("fill-opacity", d => d.depth === 1 ? 0.08 : d.depth === 2 ? 0.14 : 0.95)
      .attr("stroke", d => d.depth === 1 ? lineColor(d.data.line) : d.depth === 2 ? typeColor(d.data.type) : (d.data.node.id === state.node ? css("--ink") : "none"))
      .attr("stroke-width", d => d.depth === 3 && d.data.node.id === state.node ? 2.5 : 1)
      .on("mouseover", (e, d) => { if (d.depth === 3) showTT(nodeTT(d.data.node), e); else showTT(`<b>${esc(d.depth === 1 ? lineLabel(d.data.line) : lineLabel(d.data.line) + " › " + TJA[d.data.type] + "（" + d.data.type + "）")}</b>${d.leaves().length} ノード${d.depth === 1 ? "" : "<br><span style=\"opacity:.8\">クリックで近づく</span>"}`, e); })
      .on("mousemove", moveTT).on("mouseout", hideTT)
      .on("click", (e, d) => { e.stopPropagation(); if (d.depth === 3) { open(d.data.node.id); if (focus !== d.parent) zoom(d.parent); return; } if (focus !== d) zoom(d); else if (d.parent) zoom(d.parent); });
    // labels: group labels sit at the top of their circle with a halo; leaf labels appear when zoomed into a type group
    const labels = g.selectAll("text").data(root.descendants().slice(1)).join("text").attr("class", "lbl")
      .style("paint-order", "stroke").style("stroke", css("--panel")).style("stroke-width", d => d.depth === 3 ? "2px" : "3px").style("stroke-linejoin", "round")
      .style("font-weight", d => d.depth === 1 ? 700 : 500).style("font-family", d => d.depth === 3 ? css("--mono") : null)
      .text(d => d.depth === 1 ? (lineById.get(d.data.line) || {}).label : d.depth === 2 ? `${TLET[d.data.type]} ${TJA[d.data.type]} (${d.leaves().length})` : d.data.node.id);
    svg.on("click", () => { if (focus !== root) zoom(focus.parent || root); });
    function visibleLabel(d, k) { if (d.depth === 3) return focus.depth === 2 && d.parent === focus && d.r * k > 16; if (d.depth === 2) return focus.depth >= 1 && (d.parent === focus || d === focus) && d.r * k > 26; return focus === root || d === focus; }
    const leafText = (d, k) => { const id = d.data.node.id; const maxc = Math.max(4, Math.floor(d.r * k * 2 / 6.4)); return id.length > maxc ? id.slice(0, maxc - 1) + "…" : id; };
    function zoomTo(v) {
      const k = W / v[2]; view = v;
      nodesSel.attr("transform", d => `translate(${(d.x - v[0]) * k + W / 2},${(d.y - v[1]) * k + H / 2})`).attr("r", d => d.r * k);
      labels.attr("transform", d => { const x = (d.x - v[0]) * k + W / 2, y = (d.y - v[1]) * k + H / 2; return d.depth === 3 ? `translate(${x},${y + 3})` : `translate(${x},${y - d.r * k + (d.depth === 1 ? 16 : 13)})`; })
        .style("font-size", d => d.depth === 1 ? Math.max(11, Math.min(16, d.r * k / 9)) + "px" : d.depth === 2 ? "11.5px" : "10px")
        .text(d => d.depth === 3 ? leafText(d, k) : d.depth === 1 ? (lineById.get(d.data.line) || {}).label : `${TLET[d.data.type]} ${TJA[d.data.type]} (${d.leaves().length})`)
        .style("display", d => visibleLabel(d, k) ? "inline" : "none");
    }
    function zoom(d, animate = true) {
      focus = d; packFocus = d === root ? null : d.depth === 1 ? { line: d.data.line } : { line: d.data.line, type: d.data.type };
      $("#zoomhint").textContent = d === root ? "全体（円をクリックで近づく）" : d.depth === 1 ? lineLabel(d.data.line) + "（背景クリックで戻る）" : `${lineLabel(d.data.line)} › ${TJA[d.data.type]}（背景クリックで戻る）`;
      const target = [focus.x, focus.y, focus.r * 2 * 1.06];
      if (!animate) { zoomTo(target); return; }
      svg.transition().duration(650).tween("zoom", () => { const i = d3.interpolateZoom(view, target); return tt => zoomTo(i(tt)); });
    }
    zoomTo([root.x, root.y, root.r * 2]);
    let start = null;
    if (packFocus) { const ln = root.children.find(c => c.data.line === packFocus.line); if (ln) start = packFocus.type ? (ln.children.find(c => c.data.type === packFocus.type) || ln) : ln; }
    else if (state.line && state.view === "atlas" && state.lineJump) { start = root.children.find(c => c.data.line === state.line); state.lineJump = false; }
    if (start) zoom(start, false); else $("#zoomhint").textContent = "全体（円をクリックで近づく）";
  }

  // ---------- 研究線 ----------
  function viewLines(stage) {
    const vis = VISIBLE; const lineNodes = (l) => vis.filter(n => n._line === l);
    if (!state.line || !lineById.has(state.line)) state.line = LINES.find(l => lineNodes(l.id).length)?.id || LINES[0].id;
    const ns = lineNodes(state.line); const L = lineById.get(state.line);
    const claims = ns.filter(n => n.type === "Claim"), hyps = ns.filter(n => n.type === "Hypothesis"), evs = ns.filter(n => n.type === "Evidence"), prots = ns.filter(n => n.type === "Protocol"), qs = ns.filter(n => n.type === "Quantity"), objs = ns.filter(n => n.type === "Object"), xs = ns.filter(n => n.type === "ExecutionUnit");
    const lessons = vis.filter(n => n.type === "Lesson" && (n._line === state.line || (n.taught_by || []).some(t => (byId.get(t) || {})._line === state.line)));
    const groups = [["established", ["established"]], ["支持・昇格", ["supported", "promoted"]], ["登録的中", ["registered-hit"]], ["暫定・未決", ["provisional", "open"]], ["係争", ["challenged"]], ["棄却", ["rejected", "rejected-recorded", "superseded"]]];
    const col = (title, sts) => { const cs = claims.filter(c => sts.includes(c.status)).sort((a, b) => (b._date || "").localeCompare(a._date || "")); return `<div class="col"><h4><span class="sw" style="width:9px;height:9px;border-radius:2px;background:${statusColor(sts[0])};display:inline-block"></span>${title}<span class="n">${cs.length}</span></h4>${cs.map(c => card(c, { line: false, len: 110 })).join("") || '<div class="hint">—</div>'}</div>`; };
    // object tree
    const objIds = new Set(objs.map(o => o.id));
    const kids = new Map(); objs.forEach(o => { const p = (o.derives_from || []).find(x => objIds.has(x)); const key = p || "__root"; if (!kids.has(key)) kids.set(key, []); kids.get(key).push(o); });
    const treeHtml = (key) => (kids.get(key) || []).sort((a, b) => a.id.localeCompare(b.id)).map(o => `<li><span class="nd" data-node="${o.id}"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${typeColor("Object")};display:inline-block"></span><code>${esc(o.id)}</code><span class="t">${esc(short(o.label, 80))}</span></span>${kids.has(o.id) ? `<ul>${treeHtml(o.id)}</ul>` : ""}</li>`).join("");
    const monthly = d3.rollups(ns.filter(n => n._date), v => v.length, n => n._date.slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0]));
    stage.innerHTML = `<div class="pad">
      <div class="pillbar">${LINES.map(l => { const c = lineNodes(l.id).length; return c ? `<span class="chip" data-selline="${l.id}" style="${l.id === state.line ? "border-color:var(--accent);background:var(--sel)" : ""}"><span class="dot" style="background:${lineColor(l.id)}"></span>${esc(l.label)} <span class="muted">${c}</span></span>` : ""; }).join("")}</div>
      <h2 class="vt"><span class="sw" style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${lineColor(state.line)}"></span> ${esc(L.label)} <button class="iconbtn small" id="toAtlas" style="margin-left:8px">◎ 俯瞰でこの線を見る</button> <button class="iconbtn small" id="toGraphLine">◎ この線だけのグラフ</button></h2>
      <p class="vsub">ノード ${ns.length}（主張 ${claims.length} · 仮説 ${hyps.length} · 証拠 ${evs.length} · 実行 ${xs.length} · 登録 ${prots.length} · 量 ${qs.length} · 対象 ${objs.length}）· 教訓 ${lessons.length} · 月別: ${monthly.map(m => `${m[0]} <b>${m[1]}</b>`).join("、")}</p>
      <div class="card" style="margin-bottom:12px"><h3 class="ct">主張の梯子 — 状態別（新しい順）</h3><div class="ladder">${groups.map(g => col(g[0], g[1])).join("")}</div></div>
      <div class="grid g2">
        <div class="card"><h3 class="ct">対象（Object）の派生木 — derives_from</h3><div class="tree"><ul>${treeHtml("__root") || '<li class="hint">—</li>'}</ul></div></div>
        <div class="card"><h3 class="ct">仮説（Hypothesis）</h3>${hyps.sort((a, b) => (b._date || "").localeCompare(a._date || "")).map(h => card(h, { line: false })).join("") || '<div class="hint">—</div>'}</div>
        <div class="card"><h3 class="ct">事前登録（Protocol）</h3>${prots.sort((a, b) => (b._date || "").localeCompare(a._date || "")).map(p => card(p, { line: false })).join("") || '<div class="hint">—</div>'}</div>
        <div class="card"><h3 class="ct">教訓（Lesson）— この線の証拠が教えたもの</h3>${lessons.sort((a, b) => (b._date || "").localeCompare(a._date || "")).map(l => card(l, { line: false })).join("") || '<div class="hint">—</div>'}</div>
        <div class="card"><h3 class="ct">証拠（Evidence）— 新しい順</h3>${evs.sort((a, b) => (b._date || "").localeCompare(a._date || "")).slice(0, 60).map(e => card(e, { line: false })).join("") || '<div class="hint">—</div>'}${evs.length > 60 ? `<div class="hint">…他 ${evs.length - 60} 件（表ビューで一覧）</div>` : ""}</div>
        <div class="card"><h3 class="ct">量（Quantity）</h3>${qs.map(q => card(q, { line: false })).join("") || '<div class="hint">—</div>'}</div>
      </div></div>`;
    stage.querySelector(".pillbar").onclick = e => { const c = e.target.closest("[data-selline]"); if (c) { state.line = c.dataset.selline; render(); } };
    $("#toAtlas").onclick = () => { packFocus = { line: state.line }; go("atlas"); };
    $("#toGraphLine").onclick = () => { state.f.lines = new Set([state.line]); state.graphFocus = null; recompute(); go("graph"); };
  }

  // ---------- 時間 ----------
  function viewTimeline(stage) {
    const vis = VISIBLE.filter(n => n._date);
    const mode = state.tlMode || "type"; const KEYS = mode === "type" ? TYPES : [...STATUSES, "none"]; const keyOfNode = n => mode === "type" ? n.type : (n.status || "none"); const colorOfKey = k => mode === "type" ? typeColor(k) : (k === "none" ? css("--s-none") : statusColor(k)); const nameOfKey = k => mode === "type" ? TJA[k] : (k === "none" ? "状態なし" : SJA[k]);
    stage.innerHTML = `<div class="pad"><h2 class="vt">時間 — ノードはいつ生まれたか</h2><p class="vsub">日ごとの新規ノード数。ドラッグで期間を選ぶとフィルタに反映。棒をクリックするとその日の一覧へ。</p>
      <div class="toolbar"><span class="hint">積み上げ:</span><span class="seg" id="tlmode"><button data-m="type" class="${mode === "type" ? "on" : ""}">型</button><button data-m="status" class="${mode === "status" ? "on" : ""}">状態</button></span><span class="legend">${KEYS.map(k => `<span class="it"><span class="sw" style="background:${colorOfKey(k)}"></span>${nameOfKey(k)}</span>`).join("")}</span></div>
      <div class="timeline card" style="padding:8px"><svg id="tl"></svg></div><div class="daylist" id="daylist"></div></div>`;
    $("#tlmode").onclick = e => { const b = e.target.closest("[data-m]"); if (b) { state.tlMode = b.dataset.m; render(); } };
    const days = d3.rollups(vis, v => v, n => n._date).sort((a, b) => a[0].localeCompare(b[0]));
    const parse = d3.timeParse("%Y-%m-%d"); const host = $("#tl"); const W = host.clientWidth || 900, H = 260, m = { t: 14, r: 16, b: 34, l: 40 };
    const svg = d3.select(host).attr("viewBox", `0 0 ${W} ${H}`);
    const x = d3.scaleTime().domain([d3.timeDay.offset(parse(days[0][0]), -1), d3.timeDay.offset(parse(days[days.length - 1][0]), 1)]).range([m.l, W - m.r]);
    const stackData = days.map(([d, ns]) => { const o = { date: parse(d), key: d }; KEYS.forEach(t => o[t] = ns.filter(n => keyOfNode(n) === t).length); return o; });
    const series = d3.stack().keys(KEYS)(stackData);
    const y = d3.scaleLinear().domain([0, d3.max(stackData, d => d3.sum(KEYS, t => d[t])) || 1]).nice().range([H - m.b, m.t]);
    const bw = Math.max(2, Math.min(18, (W - m.l - m.r) / Math.max(1, d3.timeDay.count(x.domain()[0], x.domain()[1])) - 1));
    svg.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat("%m/%d"))).selectAll("text").style("fill", css("--muted"));
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5)).selectAll("text").style("fill", css("--muted"));
    svg.selectAll(".domain,.tick line").style("stroke", css("--line"));
    svg.append("g").selectAll("g").data(series).join("g").attr("fill", s => colorOfKey(s.key)).selectAll("rect").data(s => s.map(d => ({ ...d, key: s.key }))).join("rect")
      .attr("x", d => x(d.data.date) - bw / 2).attr("y", d => y(d[1])).attr("height", d => Math.max(0, y(d[0]) - y(d[1]))).attr("width", bw).attr("rx", 1.5)
      .style("cursor", "pointer").on("mouseover", (e, d) => showTT(`<b>${d.data.key}</b>${nameOfKey(d.key)} ${d[1] - d[0]} · 合計 ${d3.sum(KEYS, t => d.data[t])}`, e)).on("mousemove", moveTT).on("mouseout", hideTT)
      .on("click", (e, d) => { state.tlDay = d.data.key; renderDayList(); document.getElementById("day-" + d.data.key)?.scrollIntoView({ behavior: "smooth", block: "start" }); });
    const brush = d3.brushX().extent([[m.l, m.t], [W - m.r, H - m.b]]).on("end", (e) => { if (!e.selection) return; const [a, b] = e.selection.map(x.invert); const f = d3.timeFormat("%Y-%m-%d"); const i0 = allDates.findIndex(d => d >= f(a)), i1 = (() => { let k = -1; allDates.forEach((d, i) => { if (d <= f(b)) k = i; }); return k; })(); if (i0 >= 0 && i1 >= i0) { state.f.d0 = i0; state.f.d1 = i1; update(); } });
    svg.append("g").call(brush);
    function renderDayList() {
      const list = $("#daylist"); const sel = state.tlDay ? days.filter(d => d[0] === state.tlDay) : days.slice().reverse();
      list.innerHTML = (state.tlDay ? `<div class="toolbar"><span class="hint">${esc(state.tlDay)} のノード</span><button class="iconbtn" id="tlAll">全日を表示</button></div>` : "") + sel.map(([d, ns]) => {
        const byStatu = d3.groups(ns, n => ((n.prov || {}).statu || ["—"]).join(",")).sort((a, b) => a[0].localeCompare(b[0]));
        return `<div class="day" id="day-${d}"><h4>${d}<span class="n">${ns.length} ノード</span>${statusMini(ns)}</h4>${byStatu.map(([s, arr]) => `<div class="statu">STATU ${esc(s)}</div><div class="wrap">${arr.sort((a, b) => a.id.localeCompare(b.id)).map(n => chip(n.id)).join("")}</div>`).join("")}</div>`;
      }).join("");
      const b = $("#tlAll"); if (b) b.onclick = () => { state.tlDay = null; renderDayList(); };
    }
    function statusMini(ns) { const c = d3.rollup(ns.filter(n => n.status), v => v.length, n => n.status); return [...c].map(([s, k]) => `<span class="badge" style="background:${statusColor(s)}">${esc(SJA[s] || s)} ${k}</span>`).join(" "); }
    renderDayList();
  }

  // ---------- グラフ ----------
  function viewGraph(stage) {
    const vis = VISIBLE; const visSet = new Set(vis.map(n => n.id));
    stage.innerHTML = `<div class="pad"><h2 class="vt">グラフ — リンク構造</h2><p class="vsub">ノード = 円（大きさ = 次数）。ホバーで近傍を強調、クリックで詳細、ダブルクリックでそのノードを中心に近傍だけを表示（深さ ${state.graphDepth}）。ホイールで拡大、ドラッグで移動。</p>
      <div class="toolbar"><span class="hint">色:</span><span class="seg" id="gcol">${[["line", "研究線"], ["type", "型"], ["status", "状態"]].map(([k, l]) => `<button data-gc="${k}" class="${state.graphColor === k ? "on" : ""}">${l}</button>`).join("")}</span>
        <span class="hint">近傍の深さ:</span><span class="seg" id="gdep">${[1, 2, 3].map(k => `<button data-gd="${k}" class="${state.graphDepth === k ? "on" : ""}">${k}</button>`).join("")}</span>
        ${state.graphFocus ? `<span class="chip" id="gclear">中心: <code>${esc(state.graphFocus)}</code> ✕ 解除</span>` : ""}
        <span class="right legend" id="glegend"></span></div>
      <div class="graphwrap card" style="padding:0"><svg id="gsvg"></svg><div class="ov" id="gov"></div></div></div>`;
    $("#gcol").onclick = e => { const b = e.target.closest("[data-gc]"); if (b) { state.graphColor = b.dataset.gc; render(); } };
    $("#gdep").onclick = e => { const b = e.target.closest("[data-gd]"); if (b) { state.graphDepth = +b.dataset.gd; render(); } };
    const gc = $("#gclear"); if (gc) gc.onclick = () => { state.graphFocus = null; render(); };
    // subgraph
    let nodes = vis, edgeList = [];
    const adj = new Map();
    for (const n of vis) for (const e of n._out) if (visSet.has(e.to)) { edgeList.push({ source: n.id, target: e.to, rel: e.rel }); (adj.get(n.id) || adj.set(n.id, new Set()).get(n.id)).add(e.to); (adj.get(e.to) || adj.set(e.to, new Set()).get(e.to)).add(n.id); }
    if (state.graphFocus && byId.has(state.graphFocus)) {
      const keep = new Set([state.graphFocus]); let frontier = [state.graphFocus];
      for (let d = 0; d < state.graphDepth; d++) { const nf = []; for (const id of frontier) for (const m of (byId.get(id)._out.map(e => e.to).concat(byId.get(id)._in.map(e => e.from)))) if (!keep.has(m) && byId.has(m)) { keep.add(m); nf.push(m); } frontier = nf; if (keep.size > 400) break; }
      nodes = NODES.filter(n => keep.has(n.id)); const ks = new Set(nodes.map(n => n.id)); edgeList = []; for (const n of nodes) for (const e of n._out) if (ks.has(e.to)) edgeList.push({ source: n.id, target: e.to, rel: e.rel });
    }
    const colorOf = n => state.graphColor === "line" ? lineColor(n._line) : state.graphColor === "type" ? typeColor(n.type) : (n.status ? statusColor(n.status) : css("--s-none"));
    const lg = $("#glegend"); lg.innerHTML = state.graphColor === "line" ? LINES.map(l => `<span class="it"><span class="sw" style="background:${lineColor(l.id)}"></span>${esc(l.short)}</span>`).join("") : state.graphColor === "type" ? TYPES.map(t => `<span class="it"><span class="sw" style="background:${typeColor(t)}"></span>${TLET[t]}</span>`).join("") : STATUSES.map(s => `<span class="it"><span class="sw" style="background:${statusColor(s)}"></span>${SJA[s]}</span>`).join("");
    $("#gov").innerHTML = `<b>${fmtN(nodes.length)}</b> ノード · <b>${fmtN(edgeList.length)}</b> リンク${state.graphFocus ? ` · 中心 <code>${esc(state.graphFocus)}</code>` : ""}`;
    const host = $("#gsvg"); const W = host.clientWidth || 1000, H = Math.max(500, window.innerHeight - 190);
    const svg = d3.select(host).attr("viewBox", `0 0 ${W} ${H}`); const root = svg.append("g");
    const sim = d3.forceSimulation(nodes.map(n => ({ id: n.id, n, r: 3 + Math.sqrt(n._deg) * 1.6 })));
    const simNodes = sim.nodes(); const idx = new Map(simNodes.map(d => [d.id, d]));
    const links = edgeList.filter(e => idx.has(e.source) && idx.has(e.target)).map(e => ({ source: idx.get(e.source), target: idx.get(e.target), rel: e.rel }));
    sim.force("link", d3.forceLink(links).distance(l => 26 + (l.rel === "related" ? 20 : 0)).strength(l => l.rel === "related" ? 0.15 : 0.5))
      .force("charge", d3.forceManyBody().strength(nodes.length > 300 ? -40 : -120)).force("center", d3.forceCenter(W / 2, H / 2)).force("collide", d3.forceCollide(d => d.r + 2)).force("x", d3.forceX(W / 2).strength(0.03)).force("y", d3.forceY(H / 2).strength(0.03)).stop();
    for (let i = 0, k = nodes.length > 300 ? 220 : 300; i < k; i++) sim.tick();
    const link = root.append("g").attr("stroke", css("--line")).attr("stroke-opacity", 0.7).selectAll("line").data(links).join("line").attr("stroke-width", l => l.rel === "related" ? 0.6 : 1.1).attr("stroke-dasharray", l => l.rel === "related" ? "2,3" : null)
      .attr("x1", l => l.source.x).attr("y1", l => l.source.y).attr("x2", l => l.target.x).attr("y2", l => l.target.y);
    const node = root.append("g").selectAll("circle").data(simNodes).join("circle").attr("data-nid", d => d.id).attr("data-stroke", "#fff").attr("data-sw", 0.8).attr("r", d => d.r).attr("cx", d => d.x).attr("cy", d => d.y).attr("fill", d => colorOf(d.n)).attr("stroke", d => d.id === state.node ? css("--ink") : "#fff").attr("stroke-width", d => d.id === state.node ? 2.5 : 0.8).style("cursor", "pointer");
    const label = root.append("g").selectAll("text").data(simNodes.filter(d => d.r > 8 || d.id === state.node || d.id === state.graphFocus)).join("text").text(d => d.id).attr("x", d => d.x + d.r + 2).attr("y", d => d.y + 3).style("font-size", "10px").style("fill", css("--muted")).style("pointer-events", "none");
    node.on("mouseover", (e, d) => { showTT(nodeTT(d.n), e); const nb = adj.get(d.id) || new Set(); node.attr("opacity", o => o === d || nb.has(o.id) ? 1 : 0.15); link.attr("stroke-opacity", l => l.source === d || l.target === d ? 1 : 0.08).attr("stroke", l => l.source === d || l.target === d ? css("--accent") : css("--line")); })
      .on("mousemove", moveTT).on("mouseout", () => { hideTT(); node.attr("opacity", 1); link.attr("stroke-opacity", 0.7).attr("stroke", css("--line")); })
      .on("click", (e, d) => { e.stopPropagation(); open(d.id); }).on("dblclick", (e, d) => { e.stopPropagation(); state.graphFocus = d.id; render(); });
    const zb = d3.zoom().scaleExtent([0.2, 8]).on("zoom", e => { root.attr("transform", e.transform); label.style("display", e.transform.k * fitK > 1.4 || nodes.length <= 200 ? null : "none"); });
    svg.call(zb);
    // fit to bounds
    const xs = simNodes.map(d => d.x), ys = simNodes.map(d => d.y); const bx0 = d3.min(xs) - 20, bx1 = d3.max(xs) + 20, by0 = d3.min(ys) - 20, by1 = d3.max(ys) + 20;
    const fitK = Math.min(W / (bx1 - bx0), H / (by1 - by0), 2.5);
    svg.call(zb.transform, d3.zoomIdentity.translate(W / 2 - fitK * (bx0 + bx1) / 2, H / 2 - fitK * (by0 + by1) / 2).scale(fitK));
  }

  // ---------- 教訓 ----------
  function viewLessons(stage) {
    const ls = VISIBLE.filter(n => n.type === "Lesson").sort((a, b) => (b._date || "").localeCompare(a._date || ""));
    const months = d3.groups(ls, l => (l._date || "").slice(0, 7)).sort((a, b) => b[0].localeCompare(a[0]));
    stage.innerHTML = `<div class="pad"><h2 class="vt">教訓（Lesson）— 何が失敗し、何が規則になったか</h2><p class="vsub">${ls.length} 件。各教訓は taught_by で証拠・主張に接地している。クリックで詳細（教えた証拠 → その主張へ辿れる）。</p>
      ${months.map(([m, arr]) => `<h3 class="ct" style="margin-top:14px">${m} <span class="muted">${arr.length}</span></h3><div class="grid g2">${arr.map(l => `<div class="card" style="padding:10px 12px"><div class="nodecard" data-node="${l.id}" style="border:0;padding:0;background:transparent"><div class="h"><span class="id">${esc(l.id)}</span><span class="muted small">${esc(l._date)}</span></div><div class="lbl" style="font-weight:600">${esc(l.label)}</div><div class="stmt small muted" style="margin-top:4px">${esc(short(plain(textOf(l)), 220))}</div></div><div style="margin-top:6px"><span class="hint">taught_by:</span> ${(l.taught_by || []).map(t => chip(t)).join("") || "—"}</div></div>`).join("")}</div>`).join("")}</div>`;
  }

  // ---------- 登録・判定 ----------
  function viewProtocols(stage) {
    const ps = VISIBLE.filter(n => n.type === "Protocol").sort((a, b) => (b._date || "").localeCompare(a._date || ""));
    const hits = VISIBLE.filter(n => n.status === "registered-hit");
    const rows = ps.map(p => {
      const regIds = new Set([...p._in.filter(e => e.rel === "registered_by" || e.rel === "related").map(e => e.from), ...p._out.filter(e => e.rel === "related").map(e => e.to)]);
      const regs = [...regIds].map(id => byId.get(id)).filter(r => r && (r.type === "Claim" || r.type === "Evidence" || r.type === "Hypothesis"));
      const verdicts = regs.flatMap(r => r.type === "Evidence" ? [((r.values || {}).verdict || "")].filter(Boolean) : []);
      const fr = p.frozen ? `<code>${esc((p.frozen.sha256 || "").slice(0, 10))}</code> ${esc(p.frozen.frozen_at || "")} ${prLink(p.frozen.pr)}` : "";
      return `<tr data-node="${p.id}" class="${state.node === p.id ? "sel" : ""}"><td><code>${esc(p.id)}</code>${p.direction ? ` <span class="badge" style="background:${lineColor("dir-" + p.direction)}">${p.direction}</span>` : ""}</td><td>${esc(short(p.label, 90))}</td><td class="nowrap">${esc(p._date)}</td><td>${fr}</td><td>${regs.map(r => chip(r.id)).join("") || "—"}</td><td>${verdicts.map(v => `<span class="badge" style="background:${/REJECT|棄却|✗|外れ/.test(v) ? statusColor("rejected") : /PASS|VERIFIED|CONFIRMED|的中|✓/.test(v) ? statusColor("established") : statusColor("open")}">${esc(short(v, 40))}</span>`).join(" ")}</td></tr>`;
    });
    stage.innerHTML = `<div class="pad"><h2 class="vt">事前登録（Protocol）と判定</h2><p class="vsub">${ps.length} 件の登録。frozen = 凍結 sha（登録は走行前にコードごと凍結）。右列は登録に紐づく証拠ノードの判定（values.verdict）。</p>
      <div class="card" style="margin-bottom:12px"><h3 class="ct">登録的中（registered-hit）の主張 — ${hits.length}</h3><div class="grid g3">${hits.map(h => card(h)).join("") || '<div class="hint">—</div>'}</div></div>
      <div class="card" style="padding:0;overflow:auto"><table class="tbl"><thead><tr><th>ID</th><th>ラベル</th><th>日付</th><th>凍結</th><th>登録・関連する主張・証拠</th><th>判定</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></div>`;
  }

  // ---------- 表 ----------
  let sortKey = "_date", sortDir = -1;
  function viewTable(stage) {
    const vis = VISIBLE.slice().sort((a, b) => { const ka = a[sortKey] || "", kb = b[sortKey] || ""; return (ka < kb ? -1 : ka > kb ? 1 : 0) * sortDir || a.id.localeCompare(b.id); });
    const cols = [["id", "ID"], ["type", "型"], ["status", "状態"], ["_line", "研究線"], ["_date", "日付"], ["_deg", "次数"], ["label", "ラベル"]];
    stage.innerHTML = `<div class="pad"><h2 class="vt">表 — ${fmtN(vis.length)} ノード</h2><p class="vsub">列見出しで並べ替え。行クリックで詳細。<a id="csv" style="cursor:pointer">CSV を書き出す</a></p>
      <div class="card" style="padding:0;overflow:auto;max-height:calc(100vh - 200px)"><table class="tbl"><thead><tr>${cols.map(c => `<th data-k="${c[0]}">${c[1]}${sortKey === c[0] ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>
      ${vis.map(n => `<tr data-node="${n.id}" class="${state.node === n.id ? "sel" : ""}"><td><code>${esc(n.id)}</code></td><td>${badgeType(n)}</td><td>${badgeStatus(n)}</td><td>${badgeLine(n._line)}</td><td class="nowrap">${esc(n._date)}</td><td>${n._deg}</td><td>${esc(short(n.label, 120))}</td></tr>`).join("")}</tbody></table></div></div>`;
    stage.querySelector("thead").onclick = e => { const th = e.target.closest("th"); if (!th) return; if (sortKey === th.dataset.k) sortDir *= -1; else { sortKey = th.dataset.k; sortDir = th.dataset.k === "_date" || th.dataset.k === "_deg" ? -1 : 1; } render(); };
    $("#csv").onclick = () => { const q = s => '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; const csv = [["id", "type", "status", "line", "date", "degree", "label", "statement"].join(",")].concat(vis.map(n => [n.id, n.type, n.status || "", n._line, n._date, n._deg, n.label, textOf(n)].map(q).join(","))).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "bias-kb-atlas.csv"; a.click(); };
  }

  // ------------------------------------------------------------------ inspector
  function renderInspector() {
    const host = $("#inspBody");
    if (!state.node) { host.innerHTML = `<div class="empty"><b>詳細パネル</b>俯瞰の葉・カード・チップ・検索結果をクリックすると、ここにノードの全内容・根拠の鎖・近傍が出ます。</div>`; return; }
    const n = byId.get(state.node); const prov = n.prov || {};
    const canBack = state.trailPos > 0, canFwd = state.trailPos < state.trail.length - 1;
    const outG = d3.groups(n._out, e => e.rel), inG = d3.groups(n._in, e => e.rel);
    const linksHtml = (groups, dir) => groups.length ? groups.map(([rel, es]) => `<div class="grp"><div class="rel">${dir === "out" ? "→" : "←"} ${esc(REL_JA[rel] || rel)} <code>${esc(rel)}</code> <span class="muted">${es.length}</span></div>${es.map(e => { const other = dir === "out" ? e.to : e.from; const rec = reciprocal(n.id, other); return chip(other, rec ? `<span title="記録層に逆向きのリンクもある（双方向）" style="color:var(--accent);font-weight:700">⇄</span>` : ""); }).join("")}</div>`).join("") : `<div class="hint">—</div>`;
    const fields = [];
    const kv = (k, v) => fields.push(`<div class="k">${esc(k)}</div><div class="v">${v}</div>`);
    if (n.definition) kv("定義", `<div class="stmt">${md(n.definition)}</div>`);
    if (n.counterpoints) kv("反論・留保", `<div class="stmt">${md(n.counterpoints)}</div>`);
    if (n.conventions) kv("規約", `<div class="stmt">${md(n.conventions)}</div>`);
    if (n.pre_named_killers) kv("pre-named killers", `<div class="stmt">${Array.isArray(n.pre_named_killers) ? n.pre_named_killers.map((k, i) => `${i + 1}. ${md(k)}`).join("<br>") : md(n.pre_named_killers)}</div>`);
    if (n.derivation_hooks) kv("導出フック", `<div class="stmt">${(Array.isArray(n.derivation_hooks) ? n.derivation_hooks : [n.derivation_hooks]).map((k, i) => `${i + 1}. ${md(k)}`).join("<br>")}</div>`);
    if (n.tier) kv("tier", `<code>${esc(n.tier)}</code>`);
    if (n.entry && n.type !== "ExecutionUnit") kv("entry", `<div class="stmt"><code>${esc(n.entry)}</code></div>`);
    if (n.env && n.type !== "ExecutionUnit") kv("env", `<code>${esc(JSON.stringify(n.env))}</code>`);
    if (n.seed != null) kv("seed", `<code>${esc(JSON.stringify(n.seed))}</code>`);
    if (n.expected && n.type !== "ExecutionUnit") kv("expected", `<div class="vals"><table>${(Array.isArray(n.expected) ? n.expected : [n.expected]).map(x => `<tr><td>${esc(x.name || "")}</td><td>${esc(typeof x.value === "object" ? JSON.stringify(x.value) : x.value)}${x.tolerance ? ` <span class="muted">± ${esc(x.tolerance)}</span>` : ""}</td></tr>`).join("")}</table></div>`);
    if (n.inputs && n.type !== "ExecutionUnit") kv("inputs", (Array.isArray(n.inputs) ? n.inputs : [n.inputs]).map(x => typeof x === "string" ? `<code>${esc(x)}</code>` : `<div>${repoLink(x.ref || x.path || JSON.stringify(x))}${x.sha256 ? ` <span class="muted small">sha ${esc(x.sha256.slice(0, 10))}${x.sha_verified ? " · " + esc(x.sha_verified) : ""}</span>` : ""}</div>`).join(""));
    if (n.frozen) kv("凍結", `<div>${repoLink(n.frozen.path || "")}<br><span class="muted small">sha256 ${esc(n.frozen.sha256 || "")}</span><br>${esc(n.frozen.frozen_at || "")} ${PUBLIC ? esc(n.frozen.pr || "") : prLink(n.frozen.pr)}</div>`);
    if (n.measures) kv("measures", (Array.isArray(n.measures) ? n.measures : [n.measures]).map(m => byId.has(m) ? chip(m) : `<code>${esc(typeof m === "string" ? m : JSON.stringify(m))}</code>`).join(" "));
    if (n.values) kv("values", `<div class="vals"><table>${flatten(n.values).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table></div>`);
    if (n.lmfdb_label) kv("LMFDB", `<code>${esc(n.lmfdb_label)}</code>`);
    if (n.sameAs) kv("sameAs", (Array.isArray(n.sameAs) ? n.sameAs : [n.sameAs]).map(s => /^https?:/.test(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>` : esc(s)).join("<br>"));
    if (n.independence) kv("独立性", `<div class="stmt">${md(typeof n.independence === "string" ? n.independence : JSON.stringify(n.independence))}</div>`);
    if (n.notebook) kv("notebook", `<code>${esc(n.notebook)}</code>`);
    const arts = (n.artifacts || []).map(a => `<div>${repoLink(a.path || "")} <span class="muted small">${esc(a.role || "")}${a.location ? " · " + esc(a.location) : ""}${a.sha256 ? " · sha256 " + esc(a.sha256.slice(0, 12)) + "…" : ""}</span>${a.sha_verified ? ` <span class="badge" style="background:${a.sha_verified === "verified" ? statusColor("established") : statusColor("provisional")}">${a.sha_verified === "verified" ? "sha 実照合済" : esc(a.sha_verified)}</span>` : ""}</div>`).join("");
    // 再実行ボックス（X）／検証単位一覧（E）
    let reexec = "";
    if (n.type === "ExecutionUnit") {
      const r = k4Of(n.id); const off = (n.env || {}).offline;
      const cmd = `${PUBLIC && PUBREPO ? `git clone ${PUBREPO}.git && cd ${META.public_repo.split("/")[1]}\n` : `cd ${META.repo.split("/")[1]}   # ${META.repo}\n`}${n.entry || ""}`;
      reexec = `<h5>再実行 — この単位を走らせて期待値と比べる</h5><div class="reexec">
        <div class="row2"><span class="badge" style="background:${css("--muted")}">tier ${esc(n.tier || "?")}</span> ${off ? `<span class="badge" style="background:${statusColor("established")}">offline: 同梱データだけで再実行可</span>` : `<span class="badge" style="background:${statusColor("provisional")}">本走系（mdx／大規模データ）</span>`} ${k4Badge(n.id)}</div>
        <div class="small muted" style="margin:6px 0 2px">コマンド（リポジトリ直下で）</div><pre class="raw cmd" id="cmdbox">${esc(cmd)}</pre><button class="iconbtn small" id="copyCmd">⧉ コマンドをコピー</button>
        ${n.inputs ? `<div class="small muted" style="margin:8px 0 2px">入力（凍結 sha256）</div>${(Array.isArray(n.inputs) ? n.inputs : [n.inputs]).map(x => typeof x === "string" ? `<div class="inp"><code>${esc(x)}</code></div>` : `<div class="inp">${repoLink(x.ref || x.path || "")}<div class="sha">${x.sha256 ? `<code>${esc(x.sha256)}</code> <span class="muted">(${esc(x.sha_kind || "")})</span>` : '<span class="muted">sha 記録なし</span>'}${x.sha_verified ? ` <span class="badge" style="background:${x.sha_verified === "verified" ? statusColor("established") : statusColor("provisional")}">${esc(x.sha_verified)}</span>` : ""}</div></div>`).join("")}` : ""}
        ${n.expected ? `<div class="small muted" style="margin:8px 0 2px">期待値（expected）</div><div class="vals"><table>${(Array.isArray(n.expected) ? n.expected : [n.expected]).map(x => `<tr><td>${esc(x.name || "")}</td><td><code>${esc(typeof x.value === "object" ? JSON.stringify(x.value) : x.value)}</code>${x.tolerance ? ` <span class="muted">許容: ${esc(x.tolerance)}</span>` : ""}</td></tr>`).join("")}</table></div>` : ""}
        ${r ? `<div class="small muted" style="margin:8px 0 2px">k4 再実行の記録（knowledge/index/k4_results.md）</div><div class="vals"><table><tr><td>status</td><td><b>${esc(r.status)}</b></td></tr>${r.got ? `<tr><td>got</td><td><code>${esc(r.got)}</code></td></tr><tr><td>want</td><td><code>${esc(r.want)}</code></td></tr>` : ""}${r.note ? `<tr><td>note</td><td>${esc(r.note)}</td></tr>` : ""}</table></div>` : ""}
        ${n.env ? `<div class="small muted" style="margin:8px 0 2px">環境</div><code>${esc(JSON.stringify(n.env))}</code>` : ""}
        ${n.independence ? `<div class="small muted" style="margin:8px 0 2px">独立性</div><div class="small">${md(typeof n.independence === "string" ? n.independence : JSON.stringify(n.independence))}</div>` : ""}
      </div>`;
    } else if (n.type === "Evidence") {
      const xs = [...new Set([...(n.grounded_in || []), ...n._in.filter(i => i.rel === "verifies").map(i => i.from)])].filter(x => byId.has(x));
      reexec = `<h5>この証拠を再実行で確かめる実行単位</h5>${xs.length ? xs.map(x => { const X = byId.get(x); const rec = (n.grounded_in || []).includes(x) && (X.verifies || []).includes(n.id); return `<div style="margin:3px 0">${chip(x)} <span class="badge" style="background:${css("--muted")}">${esc(X.tier || "?")}</span> ${k4Badge(x)} ${rec ? '<span title="grounded_in と verifies が両方向に記録されている" style="color:var(--accent);font-weight:700">⇄ 双方向</span>' : ""}</div>`; }).join("") : '<div class="hint">—</div>'}`;
    }
    const statu = (prov.statu || []).map(s => PUBLIC ? `STATU ${esc(s)}` : `<a href="${REPO}/tree/main/.bus/STATU/outbox" target="_blank" rel="noopener" title="outbox を開く">STATU ${esc(s)}</a>`).join(" ");
    const prs = (prov.pr || []).map(p => prLink(p)).join(" ");
    const lineage = [...(n.supersedes ? [["置換する（旧）", n.supersedes]] : []), ...(n.superseded_by ? [["置換された（新）", n.superseded_by]] : []), ...(n.promoted_to ? [["昇格先", n.promoted_to]] : [])];
    host.innerHTML = `<div class="top"><div class="nav"><button class="iconbtn" id="iBack" ${canBack ? "" : "disabled"} title="戻る">←</button><button class="iconbtn" id="iFwd" ${canFwd ? "" : "disabled"} title="進む">→</button><span class="sp"></span>
        <button class="iconbtn" id="iGraph" title="このノードを中心にグラフ">◎ グラフ</button><button class="iconbtn" id="iLine" title="研究線ビュー">≡ 研究線</button><button class="iconbtn" id="iCopy" title="このノードへのリンクをコピー">⧉</button><button class="iconbtn" id="iClose" title="閉じる">✕</button></div>
      <div class="ident">${badgeType(n)}${badgeStatus(n)}${badgeLine(n._line)}<code>${esc(n.id)}</code><span>${esc(n._date)}</span></div><div class="title">${esc(n.label)}</div>
      <div class="trail">${state.trail.map((t, i) => `<a data-node="${t}" style="${i === state.trailPos ? "color:var(--ink);font-weight:700" : ""}">${esc(t)}</a>${i < state.trail.length - 1 ? '<span class="sep">›</span>' : ""}`).join("")}</div></div>
    <div class="bd">
      ${n.statement ? `<div class="stmt${n.statement.length > 700 ? " clamp" : ""}" id="stmt">${md(n.statement)}</div>${n.statement.length > 700 ? `<button class="iconbtn small" id="stmtMore" style="margin-top:4px">全文を表示（${fmtN(n.statement.length)} 字）</button>` : ""}` : ""}
      ${n.type === "ExecutionUnit" ? reexec : ""}
      ${lineage.length ? `<h5>系譜</h5>${lineage.map(([l, id]) => `<div><span class="hint">${l}:</span> ${(Array.isArray(id) ? id : [id]).map(chip).join("")}</div>`).join("")}` : ""}
      <h5>根拠の鎖 — 登録 → 主張 → 証拠 → 実行 → 教訓</h5><div class="chain" id="chain"></div>
      ${n.type !== "ExecutionUnit" ? reexec : ""}
      <h5>近傍（クリックで移動）</h5><div class="ego" id="ego"></div>
      ${fields.length ? `<h5>フィールド</h5><div class="kv">${fields.join("")}</div>` : ""}
      <div class="links"><h5>出るリンク <span class="muted">${n._out.length}</span></h5>${linksHtml(outG, "out")}<h5>入るリンク（逆リンク） <span class="muted">${n._in.length}</span></h5>${linksHtml(inG, "in")}</div>
      ${arts ? `<h5>成果物（artifacts）</h5>${arts}` : ""}
      <h5>来歴（prov）</h5><div class="kv"><div class="k">主張者</div><div class="v">${esc(prov.asserted_by || "")}</div><div class="k">受入</div><div class="v">${esc(prov.accepted_by || "—")}</div><div class="k">日付</div><div class="v">${esc(prov.date || "")}</div>${statu ? `<div class="k">STATU</div><div class="v">${statu}</div>` : ""}${prs ? `<div class="k">PR</div><div class="v">${prs}</div>` : ""}<div class="k">可視性</div><div class="v">${esc(prov.visibility || "")}</div><div class="k">記録</div><div class="v">${PUBLIC ? `<code>${esc(n._src)}</code> <span class="muted small">（非公開リポジトリ内。抜粋は kb/nodes.json に同梱）</span>` : `<a href="${REPO}/blob/main/${esc(n._src)}" target="_blank" rel="noopener"><code>${esc(n._src)}</code></a>`}</div></div>
      <details class="sec" style="margin-top:12px"><summary>生の JSON<span class="n"></span></summary><pre class="raw">${esc(JSON.stringify(stripDerived(n), null, 1))}</pre></details>
    </div>`;
    const cc = $("#copyCmd"); if (cc) cc.onclick = () => { const t = $("#cmdbox").textContent; const done = () => { cc.textContent = "✓ コピーしました"; setTimeout(() => { cc.textContent = "⧉ コマンドをコピー"; }, 1200); }; if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => window.prompt("コマンド:", t)); else window.prompt("コマンド:", t); };
    const sm = $("#stmtMore"); if (sm) sm.onclick = () => { $("#stmt").classList.toggle("clamp"); sm.textContent = $("#stmt").classList.contains("clamp") ? `全文を表示（${fmtN(n.statement.length)} 字）` : "折りたたむ"; };
    $("#iBack").onclick = () => { if (canBack) { state.trailPos--; state.node = state.trail[state.trailPos]; render(); } };
    $("#iFwd").onclick = () => { if (canFwd) { state.trailPos++; state.node = state.trail[state.trailPos]; render(); } };
    $("#iClose").onclick = () => { state.node = null; state.inspOpen = false; render(); };
    $("#iGraph").onclick = () => { state.graphFocus = n.id; go("graph"); };
    $("#iCopy").onclick = () => { const u = location.href; const done = () => { $("#iCopy").textContent = "✓"; setTimeout(() => { $("#iCopy").textContent = "⧉"; }, 1200); }; if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, () => window.prompt("URL:", u)); else window.prompt("URL:", u); };
    $("#iLine").onclick = () => go("lines", { line: n._line });
    drawEgo($("#ego"), n); const ch = $("#chain"); if (ch) drawChain(ch, n);
    host.parentElement.scrollTop = 0;
  }
  function stripDerived(n) { const o = {}; for (const k of Object.keys(n)) if (!k.startsWith("_")) o[k] = n[k]; return o; }
  function flatten(v, pre = "", out = []) { if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of Object.keys(v)) flatten(v[k], pre ? pre + "." + k : k, out); } else out.push([pre, Array.isArray(v) ? JSON.stringify(v) : String(v)]); return out; }
  function drawEgo(host, n) {
    const W = host.clientWidth || 400, H = 260, cx = W / 2, cy = H / 2;
    const nb = []; const seen = new Set([n.id]);
    for (const e of n._out) if (!seen.has(e.to) && byId.has(e.to)) { seen.add(e.to); nb.push({ id: e.to, rel: e.rel, dir: "out" }); }
    for (const e of n._in) if (!seen.has(e.from) && byId.has(e.from)) { seen.add(e.from); nb.push({ id: e.from, rel: e.rel, dir: "in" }); }
    nb.sort((a, b) => byId.get(b.id)._deg - byId.get(a.id)._deg); const more = nb.length - 36; const show = nb.slice(0, 36);
    const R = Math.min(cx, cy) - 30;
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    show.forEach((m, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / show.length; m.x = cx + R * Math.cos(a); m.y = cy + R * Math.sin(a); m.a = a; });
    svg.append("g").selectAll("line").data(show).join("line").attr("x1", cx).attr("y1", cy).attr("x2", d => d.x).attr("y2", d => d.y).attr("stroke", d => d.dir === "out" ? css("--accent") : css("--line")).attr("stroke-width", 1).attr("stroke-dasharray", d => d.rel === "related" ? "2,3" : null).attr("opacity", .8);
    const g = svg.append("g").selectAll("g").data(show).join("g").attr("transform", d => `translate(${d.x},${d.y})`).style("cursor", "pointer").on("click", (e, d) => open(d.id)).on("mouseover", (e, d) => showTT(nodeTT(byId.get(d.id)) + `<br><span style="opacity:.8">${d.dir === "out" ? "→" : "←"} ${esc(REL_JA[d.rel] || d.rel)}</span>`, e)).on("mousemove", moveTT).on("mouseout", hideTT);
    g.append("circle").attr("r", 6).attr("fill", d => typeColor(byId.get(d.id).type)).attr("stroke", "#fff");
    if (show.length <= 24) g.append("text").text(d => short(d.id, 22)).attr("x", d => Math.cos(d.a) >= 0 ? 9 : -9).attr("y", 3).attr("text-anchor", d => Math.cos(d.a) >= 0 ? "start" : "end").style("font-size", "9.5px").style("fill", css("--muted")).style("font-family", css("--mono"));
    else svg.append("text").attr("x", 8).attr("y", H - 8).style("font-size", "10px").style("fill", css("--muted")).text(`${show.length} 件（ホバーで名前）`);
    svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 11).attr("fill", typeColor(n.type)).attr("stroke", css("--ink")).attr("stroke-width", 1.5);
    svg.append("text").attr("x", cx).attr("y", cy + 24).attr("text-anchor", "middle").style("font-size", "10px").style("fill", css("--ink")).style("font-family", css("--mono")).text(short(n.id, 30));
    if (more > 0) svg.append("text").attr("x", W - 8).attr("y", H - 8).attr("text-anchor", "end").style("font-size", "10px").style("fill", css("--muted")).text(`+${more} 件はリンク一覧で`);
    if (!show.length) svg.append("text").attr("x", cx).attr("y", cy - 20).attr("text-anchor", "middle").style("font-size", "11px").style("fill", css("--muted")).text("リンクなし");
  }
  function drawChain(host, n) {
    // columns: P | C/H | E | X | L
    const cols = { P: new Set(), C: new Set(), E: new Set(), X: new Set(), L: new Set() };
    const add = (k, id) => { if (byId.has(id)) cols[k].add(id); };
    let claims = []; const evs = new Set();
    if (n.type === "Claim" || n.type === "Hypothesis") claims = [n.id];
    else if (n.type === "Evidence") { evs.add(n.id); claims = n._in.filter(e => ["supported_by", "refuted_by"].includes(e.rel)).map(e => e.from); }
    else if (n.type === "Lesson") { add("L", n.id); for (const t of (n.taught_by || [])) { const T = byId.get(t); if (!T) continue; if (T.type === "Evidence") { evs.add(t); T._in.filter(e => ["supported_by", "refuted_by"].includes(e.rel)).forEach(e => claims.push(e.from)); } else if (T.type === "Claim" || T.type === "Hypothesis") claims.push(t); } }
    else if (n.type === "Protocol") { add("P", n.id); for (const e of n._in) { const F = byId.get(e.from); if (!F) continue; if (F.type === "Evidence") evs.add(e.from); else if (F.type === "Claim" || F.type === "Hypothesis") claims.push(e.from); } for (const e of n._out.filter(e => e.rel === "related")) { const T = byId.get(e.to); if (T && T.type === "Evidence") evs.add(e.to); else if (T && (T.type === "Claim" || T.type === "Hypothesis")) claims.push(e.to); } }
    else if (n.type === "ExecutionUnit") { add("X", n.id); (n.verifies || []).forEach(e => { evs.add(e); const E = byId.get(e); if (E) E._in.filter(i => ["supported_by", "refuted_by"].includes(i.rel)).forEach(i => claims.push(i.from)); }); }
    else if (n.type === "Quantity" || n.type === "Object") { n._in.filter(e => e.rel === "quantities" || e.rel === "about").forEach(e => claims.push(e.from)); }
    claims = [...new Set(claims)]; claims.forEach(c => add("C", c));
    for (const c of claims) { const C = byId.get(c); [...(C.supported_by || []), ...(C.refuted_by || [])].forEach(e => evs.add(e)); (C.registered_by || []).forEach(p => add("P", p)); C._in.filter(e => e.rel === "promoted_to").forEach(e => add("C", e.from)); }
    evs.forEach(e => { add("E", e); const E = byId.get(e); if (!E) return; (E.grounded_in || []).forEach(x => add("X", x)); E._in.filter(i => i.rel === "verifies").forEach(i => add("X", i.from)); (E.registered_by || []).forEach(p => add("P", p)); E._in.filter(i => i.rel === "taught_by").forEach(i => add("L", i.from)); });
    claims.forEach(c => byId.get(c)._in.filter(i => i.rel === "taught_by").forEach(i => add("L", i.from)));
    const order = ["P", "C", "E", "X", "L"], names = { P: "登録", C: "主張・仮説", E: "証拠", X: "実行単位", L: "教訓" };
    const items = order.map(k => [...cols[k]].map(id => byId.get(id)).sort((a, b) => (a._date || "").localeCompare(b._date || "")));
    if (!items.some(a => a.length)) { host.innerHTML = '<div class="hint">この型のノードには鎖を構成するリンクがありません。</div>'; return; }
    const rowsMax = Math.max(1, ...items.map(a => a.length)); const colW = Math.max(130, Math.min(170, Math.floor(((host.clientWidth || 440) - 24) / order.length))), rowH = 44, W = order.length * colW + 20, H = 30 + rowsMax * rowH;
    const svg = d3.select(host).html("").append("svg").attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    const pos = new Map();
    order.forEach((k, ci) => { svg.append("text").attr("x", 10 + ci * colW + (colW - 10) / 2).attr("y", 14).attr("text-anchor", "middle").style("font-size", "11px").style("fill", css("--muted")).text(`${names[k]} (${items[ci].length})`); items[ci].forEach((it, ri) => pos.set(it.id, { x: 10 + ci * colW, y: 26 + ri * rowH, w: colW - 10, h: rowH - 8 })); });
    const edges = [];
    for (const [id, p] of pos) { const N = byId.get(id); for (const e of N._out) if (pos.has(e.to) && e.to !== id) edges.push([pos.get(id), pos.get(e.to), e.rel]); }
    const path = d3.linkHorizontal().x(d => d[0]).y(d => d[1]);
    svg.append("g").selectAll("path").data(edges).join("path").attr("d", e => { const a = e[0], b = e[1]; const left = a.x < b.x; return path({ source: [left ? a.x + a.w : a.x, a.y + a.h / 2], target: [left ? b.x : b.x + b.w, b.y + b.h / 2] }); }).attr("fill", "none").attr("stroke", css("--line")).attr("stroke-width", 1.2).attr("stroke-dasharray", e => e[2] === "related" ? "2,3" : null);
    const g = svg.append("g").selectAll("g").data([...pos].map(([id, p]) => ({ id, p, n: byId.get(id) }))).join("g").attr("transform", d => `translate(${d.p.x},${d.p.y})`).style("cursor", "pointer").on("click", (e, d) => open(d.id)).on("mouseover", (e, d) => showTT(nodeTT(d.n), e)).on("mousemove", moveTT).on("mouseout", hideTT);
    g.append("rect").attr("width", d => d.p.w).attr("height", d => d.p.h).attr("rx", 6).attr("fill", css("--panel")).attr("stroke", d => d.id === n.id ? css("--ink") : (d.n.status ? statusColor(d.n.status) : typeColor(d.n.type))).attr("stroke-width", d => d.id === n.id ? 2 : 1.2);
    g.append("rect").attr("width", 5).attr("height", d => d.p.h).attr("rx", 2).attr("fill", d => typeColor(d.n.type));
    const maxc = Math.floor((colW - 22) / 6.2);
    g.append("text").attr("x", 10).attr("y", 14).style("font-size", "9.5px").style("font-family", css("--mono")).style("fill", css("--ink")).text(d => short(d.id, maxc));
    g.append("text").attr("x", 10).attr("y", 27).style("font-size", "9px").style("fill", css("--muted")).text(d => short((d.n.status ? SJA[d.n.status] + " · " : "") + d.n.label, Math.floor(maxc * 0.9)));
  }

  // ------------------------------------------------------------------ boot
  readHash(); render();
  window.addEventListener("resize", (() => { let t; return () => { clearTimeout(t); t = setTimeout(render, 250); }; })());
  }
})();
