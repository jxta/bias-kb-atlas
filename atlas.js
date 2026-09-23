/* bias-kb Atlas — 俯瞰 → 研究線 → 主張 → 根拠の鎖 → ノード、と対話的に近づくための単一ファイル UI。
   依存: d3 v7（同梱）。データ: <script id="atlas-data"> の JSON（kb_atlas.py が生成）。 */
(function () {
  "use strict";
  // 言語: #lang=en（または ?lang=en、前回の選択）で 案内・接地・ヘッダ・フィルタ・詳細の見出し・図のラベル を英語にする。
  // ノードの本文（label / statement）は記録層の言語のまま。切替はページ再読込（定数を組み直すため）。
  const LANG = (() => { try { const h = new URLSearchParams(location.hash.replace(/^#/, "")), q = new URLSearchParams(location.search); const l = h.get("lang") || q.get("lang") || localStorage.getItem("atlas-lang"); return l === "en" ? "en" : "ja"; } catch (e) { return "ja"; } })();
  const EN = LANG === "en"; document.documentElement.lang = LANG;
  const T = EN ? {
    tabs: { guide: "Guide", grounding: "Grounding", atlas: "Overview", lines: "Lines", timeline: "Time", graph: "Graph", lessons: "Lessons", protocols: "Registrations", table: "Table" },
    hdr_rec: "record layer", hdr_exc: "excerpt", hdr_sync: "synced", hdr_ref: "source commit of the record layer", hdr_rerun_t: "latest re-run of the offline units by the public CI (rerun.yml → kb/rerun-latest.json)", hdr_rerun: "last re-run",
    search_ph: "search id / label / text ( / to focus)", btn_filters: "⛭ Filters", btn_insp: "▤ Detail", btn_theme_t: "light / dark", btn_help_t: "legend and usage", btn_lang: "日本語", btn_lang_t: "日本語で表示",
    help_title: "bias-kb Atlas — legend and usage",
    private: "private", stub_t: "exists in the record layer but is outside the public excerpt (only the type is public; the id is the first 10 hex of sha256 of the real id)",
    rail_showing: "showing", rail_nodes: "nodes", rail_type: "Type", rail_status: "Status", rail_line: "Research line", rail_period: "Period", rail_tier: "Execution tier (X only)", rail_actor: "Asserted by", rail_all: "all", rail_none: "none", rail_reset: "reset filters", status_none: "no status",
    actors: { "統率": "orchestrator AI", meta: "meta-AI", other: "other" },
    deg: "degree", insp_empty_h: "Detail panel", insp_empty: "Click a leaf in the overview, a card, a chip or a search hit to see the whole node, its chain of grounds and its neighbourhood here.",
    chain_h: "Chain of grounds — registration → claim → evidence → execution → lesson", ego_h: "Neighbourhood (click to move)", fields_h: "Fields", out_h: "Outgoing links", in_h: "Incoming links (backlinks)", arts_h: "Artifacts", prov_h: "Provenance (prov)", raw_h: "Raw JSON",
    prov_by: "asserted by", prov_acc: "accepted by", prov_date: "date", prov_vis: "visibility", prov_rec: "record", prov_rec_note: "(inside the private repository; the excerpt is bundled in kb/nodes.json)", prov_page: "standalone page", prov_cite: "URL to cite:",
    hist_h: "Status history", hist_by: "by", hist_ev: "evidence", hist_pr: "PR", hist_reason: "reason", hist_derived: "(derived — not written in the node)",
    kv_def: "definition", kv_cp: "counterpoints / reservations", kv_conv: "conventions", kv_hooks: "derivation hooks", kv_frozen: "frozen", kv_indep: "independence", kv_scope: "scope", kv_predicts: "predicts", kv_measured: "measured with", kv_direction: "direction", kv_verdict: "verdict", kv_ledger: "ledger", kv_other: "other fields",
    chain_names: { P: "Protocol", C: "Claim / Hyp.", E: "Evidence", X: "Execution", L: "Lesson" }, chain_none: "Nodes of this type have no links that form a chain.",
    reexec_h: "Re-run — execute this unit and compare with the expected values", reexec_off: "offline: re-executable from the bundled data alone", reexec_nb: "offline in the record layer, but the frozen input is not bundled (too large / annexed) — not re-executable from this bundle", reexec_full: "full-tier run (mdx / large data) — private, not re-run here",
    reexec_cmd: "command (in the repository root)", copy: "⧉ copy command", copied: "✓ copied", inputs_h: "inputs (frozen sha256)", no_sha: "no sha recorded", expected_h: "expected values", tol: "tolerance:", k4_h: "k4 re-run record (knowledge/index/k4_results.md)", env_h: "environment", indep_h: "independence",
    ev_units_h: "Execution units that re-run this evidence", bidir: "⇄ bidirectional", bidir_t: "grounded_in and verifies are both written in the record layer",
    k4_none: "no re-run record", k4_none_t: "no record in k4 (the record-layer-wide re-run)", k4_pass: "re-run PASS", k4_pend: "private · not re-run", k4_pend_t: "private · not re-run: a full-tier run on the mdx computer; cannot be re-executed from this bundle and the record-layer re-run has not been settled either",
    lineage_h: "Lineage", sup_old: "supersedes (old)", sup_new: "superseded by (new)", promoted: "promoted to", more: "show full text", less: "collapse", chars: "chars",
    guide_th: ["Element of the figure", "What it is in this knowledge base", "Live examples (click for detail) / where to look"],
    tour_h: "Check it in 3 minutes", tour_sub: "— a tour (progress is kept only in this browser)", tour_open: "open", tour_go: { grounding: "Grounding", protocols: "Registrations", table: "Table", graph: "Graph", lessons: "Lessons", lines: "Lines" }, tour_chk: "checked step", tour_binder: "open in Binder", tour_binder_t: "open this repository in JupyterLab in the browser (re-run without a local Python)", tour_cs: "Codespaces", tour_cs_t: "open this repository in GitHub Codespaces", tour_expect: "expected output (PASS if it matches):", tour_check: "what to check:",
    tour_done: "checked", tour_you: "— what you have checked:", tour_start: ". Go from the top: “open” takes you to the live example; tick the box once you have checked it.", tour_all: " — you have walked the record layer once around: claim, evidence, execution, registration, provenance.",
    guide_foot: "This guide is embedded by the generator (`GUIDE` in `kb_atlas.py`); the example node ids were verified to exist in the record layer at generation time. Every element of the figure, example and “→” button moves within this page.", guide_foot_pub: "Machine-readable entry points:", guide_nodepages: "standalone node pages",
    growth_h: "Size of the record layer (counts only)", growth_sub: "The public excerpt is fixed by rule to the grounding chain (function-field census line and the Q8 W layer), so it does not grow with the research. The record layer behind it does; only its counts are shown here — nothing about the private research content.",
    growth_nodes: "nodes in the record layer", growth_claims: "claims", growth_grounded: "claims whose chain reaches an execution unit", growth_quick: "of them reach an accept/spot unit (re-executable at once)", growth_bidir: "evidence ⇄ execution pairs written in both directions", growth_proto: "pre-registrations frozen before the run", growth_lessons: "lessons (failures promoted to rules)", growth_k4: "offline units re-run and matched", growth_pending: "full-tier units not yet re-run", growth_hist: "claims / hypotheses with a status history", growth_daily: "nodes added per day (cumulative line, right axis)", growth_status: "claim status across the record layer",
    gr_title: "Grounding — from claims to re-executable evidence", gr_sub: "Every claim is grounded, by links in both directions, in the re-executable computation that produced it, so that reasoning can always be traced back to evidence that can be re-run — measured here on the nodes currently shown.",
    p1_h: "P1 computational grounding", p1: "claim <code>supported_by</code> → evidence <code>grounded_in</code> → execution unit (<code>entry</code> command, <code>inputs</code> sha256, <code>expected</code>, <code>env</code>). The CI gate R9 (“grounding rule”) rejects claims without evidence and evidence without an execution unit.",
    p2_h: "P2 bidirectionality", p2: "evidence <code>grounded_in</code> ⇄ execution unit <code>verifies</code> is written in <b>both directions</b> in the record layer (measured below). For claim ⇄ evidence the inverse is derived by CI into <code>backlinks.json</code> and checked (“bidirectionality rule”); the incoming links on this page are those backlinks.",
    p3_h: "P3 execution granularity", p3: "execution units carry a <code>tier</code> (full = the main run, accept = acceptance, spot = spot check) that bounds the scope and cost of a re-run. Offline units re-run with one command; <code>kb_k4.py</code> re-runs all units and records the match rate (k4).",
    kpi1: "structural grounding", kpi1_s: (g, c) => `${g}/${c} claims have a chain evidence → execution unit`, kpi1_d: "Definition: share of claims whose links claim supported_by → evidence grounded_in → execution unit close in the record layer. It only says the chain is written; it does not say a re-run matched.",
    kpi2: "re-run match (k4, measured)", kpi2_s: (w, c, p) => `${w}/${c} claims reach a unit with a re-run PASS · only private/not-re-run ${p}`, kpi2_d: "Definition: share of claims with at least one execution unit at the end of the chain that was re-run and matched the recorded expected value (k4 PASS). A different quantity from structural grounding — this is the measured “actually traced to the grounds”. PENDING (private, not re-run) counts neither as match nor mismatch.",
    kpi3: "bidirectional pairs (grounded_in ⇄ verifies)", kpi3_s: (b, p) => `${b}/${p} pairs written in both directions`, kpi3_d: "Definition: for each evidence → execution unit link (grounded_in), the share for which execution unit → evidence (verifies) is also written in the record layer. Checked by the CI bidirectionality rule.",
    kpi4: "re-run match of bundled offline units", kpi4_s: (a) => `private/not re-run (mdx runs) ${a.Xpend} · no record ${a.Xnone}${a.Xnb ? ` · inputs not bundled ${a.Xnb}` : ""} · sha verified ${a.artsVer}/${a.artsSha} · frozen registrations ${a.Pfrozen} · registered hits ${a.hits}`, kpi4_d: "Definition: among execution units whose frozen inputs are all in this bundle (re-executable with one command), those with PASS in k4 (the record-layer-wide re-run). “private · not re-run” = full-tier runs on mdx: not re-executable from this bundle and not yet settled on the record-layer side either. Counted honestly in a separate box.",
    pend_h: (n) => `Private · not re-run units — ${n}`, pend1: (n) => `<b>${n}</b> units are full-tier runs on the mdx computer (e.g. exhaustive census); their frozen inputs are not bundled. Records, sha256 and registration bands are in the nodes, but the re-run match (k4) is not settled (PENDING).`, pend2: (n) => ` <b>${n}</b> units are offline in the record layer but the frozen input is too large / annexed, so <code>rerun.py</code> reports them as NOT-BUNDLED and leaves them out of the count.`, pend3: " Not counting these as matches is what separates the two rates above.",
    how_h: "How to re-run", how1: "Run each unit’s <code>entry</code> in the repository root and compare with <code>expected</code>. All at once:", how2: "The re-run box of each execution-unit card shows the individual command, input sha256, expected values and the k4 record (got / want).", how3: (b, c) => ` Without a local Python, open the repository in <a href="${b}" target="_blank" rel="noopener">Binder</a> (JupyterLab in the browser) or <a href="${c}" target="_blank" rel="noopener">GitHub Codespaces</a> and run the same commands.`,
    ci_h: "Latest CI re-run", ci_nb: "not bundled", ci_wait: "The latest CI re-run (kb/rerun-latest.json) will appear here after the next CI run.",
    gr_th: ["Claim", "Status", "Evidence", "Execution unit (tier · re-run)", "Artifact sha", "Registration", ""], verified: "verified", trace: "trace",
    map: { story_h: "Story of a research line", story_sub: "One line, in order: what was ordered, registered, judged, established, learned — and what is waiting for a decision. Shareable by URL; the same content exists as lines/<line>.md and .json for people and for AI.", to_story: "story →", back_map: "← map", copy_url: "copy URL", copy_md: "copy as Markdown", copied: "copied", dl_json: "JSON", dl_md: "Markdown", pending_h: "Waiting for a decision", decisions_h: "Decisions (knowledge/decisions/)", decisions_none: "No decision record yet for this line. Write the question, options, grounds and choice as D-*.json (see knowledge/decisions/README.md); AI files it as proposed, a person decides.", d_q: "question", d_opt: "options", d_choice: "choice", d_why: "why", d_by: "by", d_prop: "proposed by", d_status: { proposed: "proposed", decided: "decided", superseded: "superseded" }, timeline_h: "Milestones in order", orders_line_h: "Orders and rulings that touch this line", discuss: "discussion thread", discuss_none: "No discussion base URL configured (kb_atlas.py --discussions <URL>).", all_stories: "all lines", tab: "Map", title: "Research map — where we are, and where next", sub: "One page for a human: every research line with its milestones (registrations ◇, verdicts ★✗●, claims ▲▽) on a time axis, the current position and the next moves, the direction layer, and what changed recently. Generated from the record layer — nothing is hand-written.",
      fresh: (d, n) => `Record layer last appended <b>${d}</b>${n != null ? ` (${n} day${n === 1 ? "" : "s"} ago)` : ""}`, stale: "No node has been appended for several days: recent work may still live only in status reports and not yet be knowledge-ized (obligation R10).", stale_pub: "No node has been appended to the record layer for several days.",
      latest_order: (no, d) => ` · latest order/ruling <b>${no}</b> (${d})`, window: "window", all: "all", days: "d", lanes_h: "Lines on a time axis", legend: "◇ registration (dashed = no verdict yet) · ★ predicted and hit · ● verdict · ✗ falsified · ⚠ instrument failed · ▲ claim established · ▽ rejected · ○ other status change · click a mark to open the node",
      quiet: (n) => `Lines with no milestone in this window: ${n}`, cards_h: "Current position and next moves, per line", now: "Now", next: "Next moves", ledger: "Prediction ledger", instr: "instruments", mech: "mechanisms", asof: "as of",
      est: "established / hits", rej: "rejected", openh: "open hypotheses", openp: "registered, not yet judged", lessons: "lessons", none: "—", nothing_open: "nothing pending", claims_line: (n, a, b, c) => `${n} claims: ${a} established · ${b} registered hits · ${c} rejected`, hyps_line: (o) => `${o} open hypotheses`, regs_line: (r, o) => `${r} registrations, ${o} not yet judged`,
      last_ev: "latest milestone", no_ev: "no milestone recorded", program_h: "Direction layer", program_sub: "The root of the programme, the cross-cutting principles and the six research directions, with their current status.", principles: "Cross-cutting principles", directions: "Research directions", orders_h: "Orders and rulings (human → orchestrator)", orders_sub: "The directive stream in the private repository — what was ordered, when. Titles only.", ruling: "ruling", order: "order",
      changed_h: "What changed recently", new7: "added in the last 7 days", new30: "added in the last 30 days", trans: "status transitions (30 days)", no_change: "none", private_h: "Private lines (counts only)", private_sub: "These research lines are outside the public excerpt by rule; only their size is shown.", goto_line: "line view", goto_ground: "grounding", last: "last" },
    line_view_t: "go to the research-line view",
  } : {
    tabs: { guide: "案内", grounding: "接地", atlas: "俯瞰", lines: "研究線", timeline: "時間", graph: "グラフ", lessons: "教訓", protocols: "登録・判定", table: "表" },
    hdr_rec: "記録層", hdr_exc: "抜粋", hdr_sync: "同期", hdr_ref: "記録層の元コミット", hdr_rerun_t: "公開バンドルの CI（rerun.yml）が最後に offline 単位を再実行した結果（kb/rerun-latest.json）", hdr_rerun: "最終再実行",
    search_ph: "ID・ラベル・本文を検索（/ でフォーカス）", btn_filters: "⛭ フィルタ", btn_insp: "▤ 詳細", btn_theme_t: "ライト／ダーク", btn_help_t: "凡例・使い方", btn_lang: "EN", btn_lang_t: "Show the guide, grounding and headings in English",
    help_title: "bias-kb Atlas — 凡例と使い方",
    private: "非公開", stub_t: "記録層に存在するが公開抜粋に含まれないノード（型だけ公開。ID は実 ID の sha256 先頭 10 桁）",
    rail_showing: "表示中", rail_nodes: "ノード", rail_type: "型", rail_status: "状態", rail_line: "研究線", rail_period: "期間", rail_tier: "実行 tier（X のみ）", rail_actor: "主張者", rail_all: "全て", rail_none: "なし", rail_reset: "フィルタを初期化", status_none: "状態なし",
    actors: { "統率": "統率AI", meta: "meta-AI", other: "その他" },
    deg: "次数", insp_empty_h: "詳細パネル", insp_empty: "俯瞰の葉・カード・チップ・検索結果をクリックすると、ここにノードの全内容・根拠の鎖・近傍が出ます。",
    chain_h: "根拠の鎖 — 登録 → 主張 → 証拠 → 実行 → 教訓", ego_h: "近傍（クリックで移動）", fields_h: "フィールド", out_h: "出るリンク", in_h: "入るリンク（逆リンク）", arts_h: "成果物（artifacts）", prov_h: "来歴（prov）", raw_h: "生の JSON",
    prov_by: "主張者", prov_acc: "受入", prov_date: "日付", prov_vis: "可視性", prov_rec: "記録", prov_rec_note: "（非公開リポジトリ内。抜粋は kb/nodes.json に同梱）", prov_page: "単体ページ", prov_cite: "引用用 URL:",
    hist_h: "状態の履歴（status_history）", hist_by: "by", hist_ev: "証拠", hist_pr: "PR", hist_reason: "理由", hist_derived: "（派生 — ノードには書かれていない）",
    kv_def: "定義", kv_cp: "反論・留保", kv_conv: "規約", kv_hooks: "導出フック", kv_frozen: "凍結", kv_indep: "独立性", kv_scope: "適用範囲（scope）", kv_predicts: "予測（predicts）", kv_measured: "計器（measured_with）", kv_direction: "研究線（direction）", kv_verdict: "判定（verdict）", kv_ledger: "台帳（ledger）", kv_other: "その他の欄",
    chain_names: { P: "登録", C: "主張・仮説", E: "証拠", X: "実行単位", L: "教訓" }, chain_none: "この型のノードには鎖を構成するリンクがありません。",
    reexec_h: "再実行 — この単位を走らせて期待値と比べる", reexec_off: "offline: 同梱データだけで再実行可", reexec_nb: "offline だが凍結入力は未同梱（大きすぎる／annex）— この束からは再実行不可", reexec_full: "本走系（mdx／大規模データ）— 非公開・未再実行",
    reexec_cmd: "コマンド（リポジトリ直下で）", copy: "⧉ コマンドをコピー", copied: "✓ コピーしました", inputs_h: "入力（凍結 sha256）", no_sha: "sha 記録なし", expected_h: "期待値（expected）", tol: "許容:", k4_h: "k4 再実行の記録（knowledge/index/k4_results.md）", env_h: "環境", indep_h: "独立性",
    ev_units_h: "この証拠を再実行で確かめる実行単位", bidir: "⇄ 双方向", bidir_t: "grounded_in と verifies が両方向に記録されている",
    k4_none: "再実行記録なし", k4_none_t: "k4（記録層側の一斉再実行）の記録なし", k4_pass: "再実行 PASS", k4_pend: "非公開・未再実行", k4_pend_t: "非公開・未再実行: mdx 上の本走（full tier）で、この束からは再実行できない。記録層側でも再実行一致はまだ確定していない",
    lineage_h: "系譜", sup_old: "置換する（旧）", sup_new: "置換された（新）", promoted: "昇格先", more: "全文を表示", less: "折りたたむ", chars: "字",
    guide_th: ["図の要素", "この知識基盤での実体", "実例（クリックで詳細）／見る場所"],
    tour_h: "３分で確かめる", tour_sub: "— ツアー（進み具合はこの端末だけに保存）", tour_open: "開く", tour_go: { grounding: "接地", protocols: "登録・判定", table: "表", graph: "グラフ", lessons: "教訓", lines: "研究線" }, tour_chk: "ステップ", tour_binder: "Binder で開く", tour_binder_t: "ブラウザ内の JupyterLab でこのリポジトリを開く（手元に Python が無くても再実行できる）", tour_cs: "Codespaces", tour_cs_t: "GitHub Codespaces でこのリポジトリを開く", tour_expect: "期待される出力（一致すれば PASS）:", tour_check: "確かめる点:",
    tour_done: "確かめた", tour_you: "— あなたが確かめたこと:", tour_start: "。上から順に、各ステップの「開く」で実例へ移動し、確かめたらチェックを入れる。", tour_all: " — 主張から証拠・実行・登録・来歴まで、記録層の鎖を一周した。",
    guide_foot: "この案内は生成器（`kb_atlas.py` の `GUIDE`）が埋め込んだもので、実例のノード ID は生成時に記録層で実在を確認している。図の要素・実例・「→」ボタンはすべてこのページ内のビューへ移動する。", guide_foot_pub: "機械可読の入口:", guide_nodepages: "ノード単体ページ",
    growth_h: "記録層の規模（数だけ）", growth_sub: "公開抜粋は規則で「接地の鎖」（関数体 census 線と Q8 の W 層）に固定しているので、研究が進んでも抜粋は増えない。その背後の記録層は成長しており、ここではその**数だけ**を出す（非公開の研究内容は出さない）。",
    growth_nodes: "記録層のノード数", growth_claims: "主張", growth_grounded: "主張の鎖が実行単位に到達", growth_quick: "うち accept/spot 単位に到達（即再実行可）", growth_bidir: "証拠 ⇄ 実行単位 が両方向に記録", growth_proto: "走行前に凍結した事前登録", growth_lessons: "教訓（失敗から規則へ）", growth_k4: "offline 単位を再実行して一致", growth_pending: "未再実行の full-tier 単位", growth_hist: "状態履歴を持つ主張・仮説", growth_daily: "日ごとに増えたノード数（折れ線は累計、右軸）", growth_status: "記録層全体の主張の状態",
    gr_title: "接地 — 主張から再実行可能な証拠へ", gr_sub: "主張を、それを生んだ再実行可能な計算に双方向のリンクで接地させ、推論が常に再実行可能な証拠まで遡れるようにする — この設計を bias-kb がどう実装しているかを、表示中のノードで実測する。",
    p1_h: "P1 計算接地", p1: "主張 <code>supported_by</code>→ 証拠 <code>grounded_in</code>→ 実行単位（<code>entry</code> コマンド・<code>inputs</code> の sha256・<code>expected</code>・<code>env</code>）。CI の R9 検査「接地律」が、証拠を持たない主張と実行単位を持たない証拠を拒否する。",
    p2_h: "P2 双方向性", p2: "証拠 <code>grounded_in</code> ⇄ 実行単位 <code>verifies</code> は記録層に<b>両方向</b>で書く（下の実測）。主張 ⇄ 証拠の逆向きは <code>backlinks.json</code> を CI が導出し「双方向律」で照合。この画面の「入るリンク」がその逆リンク。",
    p3_h: "P3 実行粒度", p3: "実行単位は <code>tier</code>（full = 本走・accept = 受入・spot = 抽出照合）で再実行の範囲とコストを限定。offline 単位は 1 コマンドで再実行でき、<code>kb_k4.py</code> が全単位を再走して一致率を記録する（k4）。",
    kpi1: "構造接地率", kpi1_s: (g, c) => `${g}/${c} 主張が 証拠 → 実行単位 の鎖を持つ`, kpi1_d: "定義: 主張 supported_by → 証拠 grounded_in → 実行単位 のリンクが記録層で閉じている主張の割合。鎖が「書かれている」ことだけを見る指標で、再実行して一致したかどうかは含まない。",
    kpi2: "再実行一致（k4 実測）", kpi2_s: (w, c, p) => `${w}/${c} 主張が 再実行 PASS の単位まで辿れる · 非公開・未再実行のみ ${p}`, kpi2_d: "定義: 鎖の先の実行単位に、再実行して記録の期待値と一致した記録（k4 PASS）が 1 本以上ある主張の割合。構造接地率とは別の量で、こちらが「根拠まで実際に辿れた」実測値。PENDING（非公開・未再実行）は一致にも不一致にも数えない。",
    kpi3: "双方向ペア（grounded_in ⇄ verifies）", kpi3_s: (b, p) => `${b}/${p} 組が記録層に両方向あり`, kpi3_d: "定義: 証拠 → 実行単位（grounded_in）の各リンクについて、実行単位 → 証拠（verifies）が記録層にも書かれている割合。CI の双方向律が照合する。",
    kpi4: "同梱 offline 単位の再実行一致", kpi4_s: (a) => `非公開・未再実行（mdx 本走）${a.Xpend} · 記録なし ${a.Xnone}${a.Xnb ? ` · 入力未同梱 ${a.Xnb}` : ""} · sha 実照合 ${a.artsVer}/${a.artsSha} · 凍結登録 ${a.Pfrozen} · 登録的中 ${a.hits}`, kpi4_d: "定義: この束に凍結入力がそろい 1 コマンドで再実行できる実行単位のうち、k4（記録層側の一斉再実行）で PASS のもの。「非公開・未再実行」= mdx 上の本走で、この束からは再実行できず、記録層側の再実行一致もまだ確定していない単位。正直に別枠で数える。",
    pend_h: (n) => `非公開・未再実行の単位 — ${n}`, pend1: (n) => `<b>${n}</b> 単位は mdx 計算機上の本走（full tier: 全数 census など）で、この束には凍結入力を同梱していない。記録・sha256・登録帯は各ノードにあるが、再実行一致（k4）はまだ確定していない（PENDING）。`, pend2: (n) => ` <b>${n}</b> 単位は記録層では offline だが、凍結入力が大きすぎる／annex にあるため同梱できず、<code>rerun.py</code> は NOT-BUNDLED として集計から外す。`, pend3: " これらを「一致」に数えていない点が、上の 2 つの率の差になる。",
    how_h: "再実行のしかた", how1: "各実行単位の <code>entry</code> をリポジトリ直下で実行し、<code>expected</code> と比べる。まとめて走らせるには:", how2: "実行単位カードの「再実行」欄に、個別のコマンド・入力の sha256・期待値・k4 の記録（got / want）を示す。", how3: (b, c) => ` 手元に Python が無ければ <a href="${b}" target="_blank" rel="noopener">Binder</a>（ブラウザ内 JupyterLab）か <a href="${c}" target="_blank" rel="noopener">GitHub Codespaces</a> でリポジトリを開いて同じコマンドを実行できる。`,
    ci_h: "CI の最終再実行", ci_nb: "未同梱", ci_wait: "CI の最終再実行結果（kb/rerun-latest.json）は次回の CI 実行後にここへ出る。",
    gr_th: ["主張", "状態", "証拠", "実行単位（tier・再実行）", "成果物 sha", "登録", ""], verified: "実照合", trace: "辿る",
    map: { story_h: "研究線の物語", story_sub: "1 本の線を順に読む: 何を指示し、登録し、判定し、確立し、学んだか — そして何が判断待ちか。URL で共有でき、同じ内容が lines/<line>.md と .json にあって人にも AI にも渡せる。", to_story: "物語 →", back_map: "← 地図", copy_url: "URL をコピー", copy_md: "Markdown でコピー", copied: "コピーしました", dl_json: "JSON", dl_md: "Markdown", pending_h: "判断待ち", decisions_h: "判断の記録（knowledge/decisions/）", decisions_none: "この線の判断の記録はまだ無い。問い・選択肢・根拠・決定を D-*.json に書く（knowledge/decisions/README.md）。AI は proposed で起案し、人が決める。", d_q: "問い", d_opt: "選択肢", d_choice: "決定", d_why: "理由", d_by: "決めた人", d_prop: "起案", d_status: { proposed: "起案", decided: "決定", superseded: "置換済み" }, timeline_h: "節目（日付順）", orders_line_h: "この線に触れた指示・裁定", discuss: "議論スレッド", discuss_none: "議論の土台 URL が未設定（kb_atlas.py --discussions <URL>）。", all_stories: "全線", tab: "地図", title: "研究の地図 — いまどこにいて、次はどこへ", sub: "人間が 1 頁で見るための面。研究線ごとの節目（登録 ◇・判定 ★✗●・主張 ▲▽）を時間軸に並べ、線ごとの現在地と次の一手、方向層、直近の変化を出す。すべて記録層から生成（手書きの文はない）。",
      fresh: (d, n) => `記録層の最終追記 <b>${d}</b>${n != null ? `（${n} 日前）` : ""}`, stale: "数日以上ノードが追記されていない。直近の研究は STATU 報告に留まり、まだ知識化（R10）されていない可能性がある。", stale_pub: "記録層に数日以上ノードが追記されていない。",
      latest_order: (no, d) => ` · 最新の指示・裁定 <b>${no}</b>（${d}）`, window: "窓", all: "全期間", days: "日", lanes_h: "研究線の時間軸", legend: "◇ 登録（点線＝未判定）・★ 予測が当たった判定・● 判定・✗ 反証・⚠ 計器の失敗・▲ 主張の確立・▽ 棄却・○ その他の状態変更・印をクリックでノードを開く",
      quiet: (n) => `この窓に節目のない線: ${n}`, cards_h: "線ごとの現在地と次の一手", now: "現在地", next: "次の一手", ledger: "予測台帳", instr: "計器", mech: "機構", asof: "時点",
      est: "確立・登録的中", rej: "棄却", openh: "開いた仮説", openp: "登録済み・未判定", lessons: "教訓", none: "—", nothing_open: "保留なし", claims_line: (n, a, b, c) => `主張 ${n}（確立 ${a}・登録的中 ${b}・棄却 ${c}）`, hyps_line: (o) => `開いた仮説 ${o}`, regs_line: (r, o) => `登録 ${r}（未判定 ${o}）`,
      last_ev: "直近の節目", no_ev: "節目の記録なし", program_h: "方向層", program_sub: "プログラムの根・横断原理・6 つの研究方向と、その現在の状態。", principles: "横断原理", directions: "研究方向", orders_h: "指示と裁定の流れ（人間 → 統率AI）", orders_sub: "private リポジトリの指示書（ORDER）と裁定の列 — いつ、何を指示したか。表題のみ。", ruling: "裁定", order: "指示",
      changed_h: "直近の変化", new7: "7 日以内に追記", new30: "30 日以内に追記", trans: "状態の遷移（30 日）", no_change: "なし", private_h: "非公開の研究線（数だけ）", private_sub: "これらの研究線は規則で公開抜粋の外にある。規模だけを出す。", goto_line: "研究線ビュー", goto_ground: "接地", last: "最終" },
    line_view_t: "研究線ビューへ",
  };
  // 図（docs/overview.svg）のラベル: 日本語 → 英語。lang=en のとき <text> の中身を置き換える（SVG 自体は変えない）
  const SVG_EN = { "人間の研究者": "Human researcher", "問題設定・解釈・最終判断（merge）": "problem, interpretation, final decision (merge)", "AI エージェント（統率AI・実行AI）": "AI agents (orchestrator, executor)", "計算して証拠を生み、記録層に書く": "compute evidence, write the record layer", "別の AI（meta-AI）": "A different AI (meta-AI)", "独立に再計算して検収・裁定": "recomputes independently; accepts, arbitrates", "知識基盤 bias-kb": "Knowledge base bias-kb", "8 型のノードと型付きリンク（すべて JSON の記録層）": "8 node types, typed links (all JSON in the record layer)", "知識グラフ": "Knowledge graph", "対象 O": "Object O", "族・体・census 表": "family, field, census table", "計測": "measure", "量 Q ・ 証拠 E": "Quantity Q · Evidence E", "計測値と、その記録": "measured values and their record", "支持": "support", "主張 C": "Claim C", "状態（確立・棄却…）": "status (established, rejected …)", "反証（棄却も残す）": "refutation (rejections kept)", "登録 P ・ 仮説 H": "Protocol P · Hypothesis H", "予測を走行前に凍結": "predictions frozen before the run", "登録": "registers", "教訓 L": "Lesson L", "失敗・修正を規則へ": "failures, corrections → rules", "双方向リンク": "bidirectional links", "証拠 grounded_in ⇄ 実行単位 verifies（両方向を記録層に書く）": "E grounded_in ⇄ X verifies (both written in the record layer)", "再実行可能な研究": "Re-executable research", "記録層": "Record layer", "ノード JSON（private）": "node JSON (private)", "CI: 参照整合・接地律": "CI: references, grounding", "双方向律・凍結律": "bidirectionality, freezing", "公開抜粋は規則で生成": "public excerpt by rule", "実行単位 X（tier で粒度を限定）": "ExecutionUnit X (tier bounds the scope)", "コード": "code", "データ": "data", "inputs＋sha256": "inputs + sha256", "環境": "environment", "来歴": "provenance", "prov・PR": "prov · PR", "成果物・期待値": "artifacts, expected values", "sha256 で凍結、再実行して": "frozen by sha256; re-run and", "一致を記録（k4）": "record the match (k4)", "確かめられること": "What can be checked", "再実行できる": "Can be re-executed", "rerun.py・CI": "rerun.py · CI", "入力 sha256 を照合 →": "check input sha256 →", "実行 → 期待値と比較": "run → compare with expected", "根拠まで辿れる": "Can be traced to its grounds", "主張 → 証拠 → 実行単位": "claim → evidence → execution unit", "→ 再実行結果（接地タブ）": "→ re-run result (Grounding tab)", "別の AI の独立再集計も X": "meta-AI’s recount is also an X", "予測が先に凍結": "Predictions frozen first", "蓄積 → 予測 → 的中・棄却": "accumulate → predict → hit / reject", "後から合わせられない": "cannot be adjusted afterwards", "（登録・判定）": "(Registrations tab)" };
  const tr = (o, k) => (EN && o && o[k + "_en"]) || (o ? o[k] : "");
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
  // 公開抜粋では、抜粋外の隣接ノードが「型だけのスタブ」（_stub: true、匿名 ID）として同梱される。
  // NODES は実ノードのみ（集計・表・検索の母数）。byId はスタブも含む（リンク表示・近傍のため）。
  const META = DATA.meta, NODES = DATA.nodes.filter(n => !n._stub), STUBS = DATA.nodes.filter(n => n._stub);
  const byId = new Map(DATA.nodes.map(n => [n.id, n]));
  const isStub = (id) => { const n = byId.get(id); return !!(n && n._stub); };
  const REPO = "https://github.com/" + (META.repo || "jxta/ai4math-lab");
  const TYPES = ["Object", "Quantity", "Evidence", "Claim", "Hypothesis", "Protocol", "ExecutionUnit", "Lesson"];
  const TLET = { Object: "O", Quantity: "Q", Evidence: "E", Claim: "C", Hypothesis: "H", Protocol: "P", ExecutionUnit: "X", Lesson: "L" };
  const TJA = EN ? { Object: "Object", Quantity: "Quantity", Evidence: "Evidence", Claim: "Claim", Hypothesis: "Hypothesis", Protocol: "Protocol", ExecutionUnit: "Execution", Lesson: "Lesson" } : { Object: "対象", Quantity: "量", Evidence: "証拠", Claim: "主張", Hypothesis: "仮説", Protocol: "登録", ExecutionUnit: "実行", Lesson: "教訓" };
  const STATUSES = ["established", "registered-hit", "supported", "promoted", "provisional", "open", "challenged", "rejected", "rejected-recorded", "superseded"];
  const SJA = EN ? { established: "established", "registered-hit": "registered hit", supported: "supported", promoted: "promoted", provisional: "provisional", open: "open", challenged: "challenged", rejected: "rejected", "rejected-recorded": "rejected (recorded)", superseded: "superseded" } : { established: "確立", "registered-hit": "登録的中", supported: "支持", promoted: "昇格", provisional: "暫定", open: "未決", challenged: "係争", rejected: "棄却", "rejected-recorded": "棄却記録", superseded: "置換済" };
  const REL_JA = EN ? { about: "about", quantities: "quantities", supported_by: "supported by", refuted_by: "refuted by", registered_by: "registered by", derives_from: "derives from", supersedes: "supersedes", superseded_by: "superseded by", promoted_to: "promoted to", related: "related", grounded_in: "grounded in", supports: "supports", refutes: "refutes", verifies: "verifies", taught_by: "taught by", constrains: "constrains" } : { about: "対象", quantities: "量", supported_by: "根拠", refuted_by: "反証", registered_by: "登録", derives_from: "派生元", supersedes: "置換する", superseded_by: "置換された", promoted_to: "昇格先", related: "関連", grounded_in: "接地", supports: "支持する", refutes: "反証する", verifies: "検証する", taught_by: "教えた証拠", constrains: "制約" };
  const LINES = META.lines;
  const LINE_COLORS = { "O-fs-family": "#2a78d6", "O-qec-family": "#eb6834", "O-ecnf-family": "#1baf7a", "O-dihedral-artin-family": "#eda100", "O-cubic-family": "#e87ba4", "O-fingerprint-family": "#008300", "O-ff-q3-family": "#4a3aa7", "dir-A": "#e34948", "dir-B": "#0e7490", principles: "#7c3aed", program: "#6b7280", unassigned: "#a3a9b5" };
  const lineById = new Map(LINES.map(l => [l.id, l]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const typeColor = (t) => css("--c-" + (TLET[t] || "O")) || "#888";
  const statusColor = (s) => css("--s-" + (s || "none")) || css("--s-none");
  const lineColor = (l) => LINE_COLORS[l] || "#999";
  const lineLabel = (l) => (lineById.get(l) || {}).label || l;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtN = (n) => (n == null ? "" : Number(n).toLocaleString(EN ? "en-US" : "ja-JP"));
  const ID_RE = /\b([OQECHPXL]-[a-z0-9][a-z0-9-]*)\b/g;
  const md = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(ID_RE, (m) => byId.has(m) ? `<a class="nl" data-node="${m}">${m}</a>` : m).replace(/\n/g, "<br>");
  const short = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const plain = (s) => String(s || "").replace(/\*\*/g, "").replace(/`/g, "");
  const textOf = (n) => n.statement || n.definition || n.entry || "";
  const k4Of = (xid) => K4[xid] || null;
  const k4Badge = (xid) => { const r = k4Of(xid); if (!r) return `<span class="badge" style="background:${css("--s-none")}" title="${T.k4_none_t}">${T.k4_none}</span>`; const c = r.status === "PASS" ? statusColor("established") : r.status === "PENDING" ? statusColor("provisional") : statusColor("rejected"); const t = r.status === "PASS" ? `${T.k4_pass} (got ${r.got} / want ${r.want})` : r.status === "PENDING" ? T.k4_pend_t : (r.note || r.status); return `<span class="badge" style="background:${c}" title="${esc(t)}">${r.status === "PASS" ? T.k4_pass : r.status === "PENDING" ? T.k4_pend : esc(r.status)}</span>`; };
  // 「offline」は記録層の宣言、「_bundled」はこの束に凍結入力が全部そろい実際に再実行できるか（生成時に判定）
  const rerunable = (x) => !!((x.env || {}).offline && x._bundled !== false);
  const reciprocal = (a, b) => { const A = byId.get(a), B = byId.get(b); if (!A || !B) return false; return B._out.some(e => e.to === a); };
  const repoLink = (path) => { if (!path) return ""; const pth = String(path).replace(/^annex:\s*/, ""); if (PUBLIC) { return BUNDLED.has(pth) && PUBREPO ? `<a href="${PUBREPO}/blob/main/${esc(pth)}" target="_blank" rel="noopener"><code>${esc(pth)}</code></a> <span class="badge" style="background:${statusColor("established")}">同梱</span>` : `<code>${esc(pth)}</code> <span class="muted small">（非公開リポジトリ内）</span>`; } return `<a href="${REPO}/blob/main/${esc(pth)}" target="_blank" rel="noopener"><code>${esc(pth)}</code></a>`; };
  const prLink = (p) => { if (p == null || p === "") return ""; const m = String(p).match(/^#?(\d{1,5})$/); return m ? `<a href="${REPO}/pull/${m[1]}" target="_blank" rel="noopener">#${m[1]}</a>` : `<span class="muted">${esc(p)}</span>`; };

  // ------------------------------------------------------------------ state & routing
  const allDates = [...new Set(NODES.map(n => n._date).filter(Boolean))].sort();
  const defaultView = () => META.profile === "public-grounding" ? ((META.guide && META.guide.rows && META.guide.rows.length) ? "guide" : "grounding") : (META.map && META.map.lanes ? "map" : "atlas");
  const state = {
    view: defaultView(), line: null, node: null, trail: [], trailPos: -1,
    f: { types: new Set(TYPES), statuses: new Set([...STATUSES, "none"]), lines: new Set(LINES.map(l => l.id)), tiers: new Set(["full", "accept", "spot", "none"]), d0: 0, d1: allDates.length - 1, actors: new Set(["統率", "meta", "other"]) },
    colorMode: "type", filtersOpen: window.innerWidth > 1100, inspOpen: window.innerWidth > 1100, graphColor: "line", graphFocus: null, graphDepth: 2, tlDay: null, showStubs: false,
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
    if (EN) p.set("lang", "en");
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
    <div class="brand"><b>bias-kb Atlas</b><small id="fresh">${META.profile === "public-grounding"
      ? `${T.hdr_rec} <b>${fmtN(META.stats.full_n || 0)}</b> ／ ${T.hdr_exc} <b>${fmtN(NODES.length)}</b> ／ ${T.hdr_sync} ${esc((META.generated_at || "").slice(0, 10))}${META.source_ref ? ` <span class="muted" title="${T.hdr_ref}">(${esc(String(META.source_ref).slice(0, 7))})</span>` : ""}<span id="rerunHdr" title="${T.hdr_rerun_t}"></span>`
      : `${esc(META.version || "")} · ${fmtN(NODES.length)} nodes · ${esc((META.generated_at || "").slice(0, 10))}`}</small></div>
    <nav class="tabs" id="tabs"></nav>
    <div class="search"><input id="q" placeholder="${T.search_ph}" autocomplete="off"><span class="kbd">/</span><div class="drop" id="drop"></div></div>
    <button class="iconbtn" id="btnFilters" title="${EN ? "toggle the filter column" : "フィルタ列の表示切替"}">${T.btn_filters}</button>
    <button class="iconbtn" id="btnInsp" title="${EN ? "toggle the detail panel" : "詳細パネルの表示切替"}">${T.btn_insp}</button>
    <button class="iconbtn" id="btnLang" title="${T.btn_lang_t}" lang="${EN ? "ja" : "en"}">${T.btn_lang}</button>
    <button class="iconbtn" id="btnTheme" title="${T.btn_theme_t}">◐</button>
    <button class="iconbtn" id="btnHelp" title="${T.btn_help_t}">?</button>
  </header>
  <div class="help" id="help" hidden><div class="helpbox"><div class="helphd"><b>${T.help_title}</b><button class="iconbtn" id="helpClose">✕</button></div><div class="helpbd" id="helpBody"></div></div></div>
  ${META.profile === "public-grounding" ? (EN ? `<div class="banner" id="banner"><b>Public excerpt</b> — ${fmtN(NODES.length)} nodes selected by rule from the knowledge base bias-kb (private repository <code>${esc(META.repo)}</code>, ${fmtN(META.stats.full_n || 0)} nodes as of ${esc((META.generated_at || "").slice(0, 10))}): the nodes that take part in a chain <b>claim → evidence → re-executable execution unit</b> (function-field census line and the Q8 W layer). Neighbours outside the excerpt remain as <b>private stubs</b> (${fmtN(STUBS.length)}, dashed) that carry only their type, so that “evidence exists but is private” is distinguishable from “no evidence”. The frozen inputs of the offline execution units are bundled and can be re-run with <code>python3 rerun.py</code>${META.public_repo ? ` (<a href="https://github.com/${esc(META.public_repo)}" target="_blank" rel="noopener">${esc(META.public_repo)}</a>)` : ""}. Every node also has a standalone page without JavaScript, <code>n/&lt;id&gt;.html</code> / <code>.json</code> (<a href="n/index.html">index</a> · <a href="llms.txt">llms.txt</a>). Node texts are in Japanese (the language of the record layer).</div>` : `<div class="banner" id="banner"><b>公開抜粋</b> — 知識基盤 bias-kb（private リポジトリ <code>${esc(META.repo)}</code>、${esc((META.generated_at || "").slice(0, 10))} 時点 ${fmtN(META.stats.full_n || 0)} ノード）から、<b>主張 → 証拠 → 再実行可能な実行単位</b> の鎖に関わる ${fmtN(NODES.length)} ノードを規則で抜き出したものです（関数体 census 線と Q8 の W 層）。抜粋外の隣接ノードは型だけの<b>非公開スタブ</b>（${fmtN(STUBS.length)} 件、点線）として残し、「証拠はあるが非公開」と「根拠がない」を区別します。offline 実行単位の凍結入力は同梱され、<code>python3 rerun.py</code> で再実行できます${META.public_repo ? `（<a href="https://github.com/${esc(META.public_repo)}" target="_blank" rel="noopener">${esc(META.public_repo)}</a>）` : ""}。各ノードは JS なしの単体ページ <code>n/&lt;id&gt;.html</code>／<code>.json</code> でも読めます（<a href="n/index.html">一覧</a>・<a href="llms.txt">llms.txt</a>）。</div>`) : ""}
  <div class="body" id="body"><aside class="rail" id="rail"></aside><main class="stage" id="stage"></main><aside class="insp" id="insp"><div class="splitter" id="split"></div><div id="inspBody"></div></aside></div>
  <div class="tt" id="tt"></div>`;
  const $ = (s, r = document) => r.querySelector(s);
  if (META.profile === "public-grounding") app.classList.add("hasbanner");
  const PUBLIC = META.profile === "public-grounding";
  const K4 = META.k4 || {};
  const BUNDLED = new Set(META.bundled || []);
  const PUBREPO = META.public_repo ? "https://github.com/" + META.public_repo : "";
  const HAS_GUIDE = !!(META.guide && META.guide.rows && META.guide.rows.length);
  const SITE = (META.site_url || "").replace(/\/$/, "");
  const BINDER = META.public_repo ? `https://mybinder.org/v2/gh/${META.public_repo}/main?urlpath=lab/tree/README.md` : "";
  const CODESPACES = META.public_repo ? `https://codespaces.new/${META.public_repo}?quickstart=1` : "";
  // 最終再実行（公開バンドルの CI が書く kb/rerun-latest.json）— 無ければ静かに省く
  let RERUN = null;
  if (PUBLIC && META.rerun_latest && !inline) {
    fetch(META.rerun_latest, { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !Array.isArray(j.results)) return; RERUN = j;
      const np = j.results.filter(r => r.status === "PASS").length, nt = j.results.filter(r => r.status !== "NOT-BUNDLED").length;
      const el = $("#rerunHdr"); if (el) el.innerHTML = ` ／ ${T.hdr_rerun} <b style="color:${np === nt ? "var(--ok, #15803d)" : "var(--bad, #b91c1c)"}">${np}/${nt} PASS</b> <span class="muted">${esc((j.generated_at || "").slice(0, 10))}${j.python ? " · Python " + esc(j.python) : ""}</span>`;
      if (state.view === "grounding") renderStage();
    }).catch(() => { });
  }
  const HAS_MAP = !!(META.map && META.map.lanes);
  const VIEWS = [...(HAS_GUIDE ? [["guide", T.tabs.guide]] : []), ...(HAS_MAP ? [["map", T.map.tab]] : []), ["grounding", T.tabs.grounding], ["atlas", T.tabs.atlas], ["lines", T.tabs.lines], ["timeline", T.tabs.timeline], ["graph", T.tabs.graph], ["lessons", T.tabs.lessons], ["protocols", T.tabs.protocols], ["table", T.tabs.table]];
  $("#tabs").innerHTML = VIEWS.map(([k, l]) => `<button class="tab" data-v="${k}">${l}</button>`).join("");
  $("#tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) go(b.dataset.v); });
  $("#btnFilters").onclick = () => { state.filtersOpen = !state.filtersOpen; layout(); };
  $("#btnHelp").onclick = () => { renderHelp(); $("#help").hidden = false; };
  $("#btnLang").onclick = () => { const to = EN ? "ja" : "en"; try { localStorage.setItem("atlas-lang", to); } catch (e) { } const p = new URLSearchParams(location.hash.replace(/^#/, "")); if (to === "en") p.set("lang", "en"); else p.delete("lang"); location.hash = "#" + p.toString(); location.reload(); };
  $("#helpClose").onclick = () => { $("#help").hidden = true; };
  $("#help").addEventListener("click", e => { if (e.target.id === "help") $("#help").hidden = true; });
  function renderHelp() {
    if (EN) { $("#helpBody").innerHTML = `
      <p>This page is a self-contained viewer generated by <code>kb_atlas.py</code> from the record layer (node JSON) in <code>knowledge/</code> of the repository <code>${esc(META.repo)}</code> (generated ${esc(META.generated_at)}, source ${esc(META.source)} ${esc(META.source_ref)}). The record layer is never modified.</p>
      <h4>Eight node types</h4><div class="legend">${TYPES.map(t => `<span class="it"><span class="sw" style="background:${typeColor(t)}"></span><b>${TLET[t]}</b> ${t}</span>`).join("")}</div>
      <p class="small muted">Claims (C) are grounded in evidence (E); evidence in re-executable execution units (X) and in artifacts frozen by sha256. Hypotheses (H) are conjectures, protocols (P) are pre-registrations frozen before the run, lessons (L) are failures promoted to rules.</p>
      <h4>Status</h4><div class="legend">${STATUSES.map(st => `<span class="it"><span class="sw" style="background:${statusColor(st)}"></span>${st}</span>`).join("")}</div>
      <p class="small muted">Rejected claims stay as <code>rejected</code> / <code>rejected-recorded</code>; <code>supersedes</code> links the lineage. <code>registered-hit</code> = a prediction frozen before the run that came true.</p>
      <h4>Links</h4><div class="legend">${Object.keys(REL_JA).map(r => `<span class="it"><code>${r}</code> ${REL_JA[r]}</span>`).join("")}</div>
      <h4>Usage</h4><ul class="small"><li><b>Guide</b>: the figure of the mechanism, the table figure → implementation → live examples, and a tour of five checks.</li><li><b>Grounding</b>: per claim, evidence → execution unit (tier, k4 re-run) → artifact sha → registration; “trace” opens the detail. The re-run box of an execution-unit card shows the command, input sha256, expected values and the k4 record.</li><li><b>Overview / Lines / Time / Graph / Lessons / Registrations / Table</b>: the other views (labels in Japanese).</li><li><b>Detail panel</b>: node ids in the text are clickable; the chain of grounds is registration → claim → evidence → execution → lesson; ← → history; ⧉ copies the URL (the hash holds the current place, including <code>lang=en</code>).</li><li><b>Keys</b>: <code>/</code> search, <code>Esc</code> close, Enter/Space opens the focused chip or figure element.</li></ul>`; return; }
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
    // キーボード操作: フォーカス中のノードチップ・図のホット領域・行を Enter／Space で開く（マウスと同じ）
    if ((e.key === "Enter" || e.key === " ") && document.activeElement && document.activeElement !== $("#q") && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      const el = document.activeElement.closest ? document.activeElement.closest("[data-node],[data-key].hot,[data-line]") : null;
      if (el) { e.preventDefault(); el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
    }
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
  function badgeLine(l) { return `<span class="badge" data-line="${l}" style="background:${lineColor(l)};cursor:pointer" title="${T.line_view_t}">${esc((lineById.get(l) || {}).short || l)}</span>`; }
  function chip(id, extra = "") {
    const n = byId.get(id); if (!n) return `<span class="chip"><span class="id">${esc(id)}</span></span>`;
    if (n._stub) return `<span class="chip stub" data-node="${id}" tabindex="0" role="link" title="${T.stub_t}"><span class="dot" style="background:${typeColor(n.type)}"></span><span class="id">${esc(TLET[n.type])} ${T.private}</span><span class="t">${esc(n.label)}</span>${extra}</span>`;
    return `<span class="chip" data-node="${id}" tabindex="0" role="link" title="${esc(short(n.label, 200))}"><span class="dot" style="background:${typeColor(n.type)}"></span><span class="id">${esc(id)}</span><span class="t">${esc(short(n.label, 70))}</span>${extra}</span>`;
  }
  function card(n, o = {}) {
    return `<div class="nodecard${state.node === n.id ? " sel" : ""}" data-node="${n.id}"><div class="h">${badgeType(n)}${badgeStatus(n)}<span class="id">${esc(n.id)}</span></div><div class="lbl">${esc(short(n.label, o.len || 140))}</div><div class="meta"><span>${esc(n._date)}</span>${o.line !== false ? `<span>${esc((lineById.get(n._line) || {}).short || "")}</span>` : ""}${n.tier ? `<span>tier ${esc(n.tier)}</span>` : ""}<span>${T.deg} ${n._deg}</span></div></div>`;
  }
  function statusBar(nodes) {
    const c = d3.rollup(nodes.filter(n => n.status), v => v.length, n => n.status); const tot = d3.sum([...c.values()]) || 1;
    return `<div class="bar">${STATUSES.filter(s => c.get(s)).map(s => `<i style="width:${100 * c.get(s) / tot}%;background:${statusColor(s)}" title="${esc(SJA[s])} ${c.get(s)}"></i>`).join("")}</div>`;
  }

  // ------------------------------------------------------------------ filter rail
  function renderRail() {
    const rail = $("#rail"); const vis = VISIBLE;
    const cnt = (pred) => NODES.filter(n => pred(n)).length, vcnt = (pred) => vis.filter(n => pred(n)).length;
    const rows = (title, key, items, colorFn, labelFn) => `<h4>${title} <span class="right"></span></h4><div class="mini"><button data-all="${key}">${T.rail_all}</button><button data-none="${key}">${T.rail_none}</button></div>` +
      items.map(it => `<div class="row${state.f[key].has(it) ? "" : " off"}" data-f="${key}" data-val="${esc(it)}"><span class="sw" style="background:${colorFn(it)}"></span><span>${esc(labelFn(it))}</span><span class="cnt">${vcnt(n => keyOf(key, n) === it)}/${cnt(n => keyOf(key, n) === it)}</span></div>`).join("");
    rail.innerHTML = `<div class="hint">${T.rail_showing} <b class="count">${fmtN(vis.length)}</b> / ${fmtN(NODES.length)} ${T.rail_nodes}</div>
      ${rows(T.rail_type, "types", TYPES, typeColor, t => EN ? `${TLET[t]} ${t}` : `${TLET[t]} ${TJA[t]}（${t}）`)}
      ${rows(T.rail_status, "statuses", [...STATUSES, "none"], s => s === "none" ? css("--s-none") : statusColor(s), s => s === "none" ? T.status_none : EN ? s : `${SJA[s]}（${s}）`)}
      ${rows(T.rail_line, "lines", LINES.map(l => l.id), lineColor, l => lineLabel(l))}
      <h4>${T.rail_period}</h4><div class="daterange"><span id="dl0">${allDates[state.f.d0]}</span> — <span id="dl1">${allDates[state.f.d1]}</span></div>
      <input type="range" id="r0" min="0" max="${allDates.length - 1}" value="${state.f.d0}"><input type="range" id="r1" min="0" max="${allDates.length - 1}" value="${state.f.d1}">
      ${rows(T.rail_tier, "tiers", ["full", "accept", "spot", "none"], () => "#94a3b8", t => t)}
      ${rows(T.rail_actor, "actors", ["統率", "meta", "other"], () => "#94a3b8", a => T.actors[a])}
      <div class="mini" style="margin-top:12px"><button id="fReset">${T.rail_reset}</button></div>`;
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
    ({ guide: viewGuide, map: viewMap, story: viewStory, grounding: viewGrounding, atlas: viewAtlas, lines: viewLines, timeline: viewTimeline, graph: viewGraph, lessons: viewLessons, protocols: viewProtocols, table: viewTable }[state.view] || viewAtlas)(stage);
  }

  // ---------- 案内（この知識基盤のしくみ — 図と実例の対応） ----------
  function viewGuide(stage) {
    const G = META.guide; if (!G || !G.rows || !G.rows.length) { viewGrounding(stage); return; }
    const rowHtml = G.rows.map(r => `<tr id="gr-${esc(r.key)}" data-key="${esc(r.key)}"><td class="gfig">${esc(tr(r, "fig"))}</td><td class="gkb">${md(tr(r, "kb"))}</td><td class="gex">${(r.nodes || []).map(id => chip(id)).join("") || '<span class="muted small">—</span>'}${r.view ? `<div style="margin-top:5px"><button class="iconbtn small" data-go="${esc(r.view)}">${esc(tr(r, "view_label") || r.view)} →</button></div>` : ""}</td></tr>`).join("");
    // ３分で確かめる — ツアー形式（進行状態・コマンドのコピー・期待出力・最後に「確かめたこと」の要約）。状態は端末内だけに保存。
    const STEPS = G.steps || [];
    const tourKey = "atlas-tour-" + (META.generated_at || "").slice(0, 10);
    const done = (() => { try { return new Set(JSON.parse(localStorage.getItem(tourKey) || "[]")); } catch (e) { return new Set(); } })();
    const saveTour = () => { try { localStorage.setItem(tourKey, JSON.stringify([...done])); } catch (e) { } };
    const stepHtml = (s, i) => `<li class="tstep${done.has(i) ? " done" : ""}" data-step="${i}">
        <div class="thead"><label class="tchk"><input type="checkbox" data-chk="${i}" ${done.has(i) ? "checked" : ""} aria-label="${T.tour_chk} ${i + 1}"> <b>${i + 1}. ${esc(tr(s, "title"))}</b></label>${s.node ? ` <button class="iconbtn small" data-trace="${esc(s.node)}">${T.tour_open}</button>` : ""}${s.view && s.view !== "guide" ? ` <button class="iconbtn small" data-go="${esc(s.view)}">${esc(T.tour_go[s.view] || s.view)} →</button>` : ""}</div>
        <div class="tbody">${md(tr(s, "text"))}
        ${s.cmd ? `<div class="tcmd"><pre class="raw cmd">${esc(s.cmd)}</pre><button class="iconbtn small" data-copy="${i}">${T.copy}</button>${BINDER ? ` <a class="iconbtn small" href="${BINDER}" target="_blank" rel="noopener" title="${T.tour_binder_t}">${T.tour_binder}</a>` : ""}${CODESPACES ? ` <a class="iconbtn small" href="${CODESPACES}" target="_blank" rel="noopener" title="${T.tour_cs_t}">${T.tour_cs}</a>` : ""}</div>` : ""}
        ${s.expect ? `<div class="small muted" style="margin-top:6px">${T.tour_expect}</div><pre class="raw texp">${esc(s.expect)}</pre>` : ""}
        ${s.check ? `<div class="small tcheck">${T.tour_check} ${esc(tr(s, "check"))}</div>` : ""}</div></li>`;
    const tourSummary = () => { const k = [...done].filter(i => i < STEPS.length).sort(); return `<div class="tsum${k.length === STEPS.length && STEPS.length ? " all" : ""}"><div class="tprog"><i style="width:${STEPS.length ? Math.round(100 * k.length / STEPS.length) : 0}%"></i></div><div class="small"><b>${k.length} / ${STEPS.length}</b> ${T.tour_done}${k.length ? ` ${T.tour_you} ${k.map(i => esc(tr(STEPS[i], "check") || tr(STEPS[i], "title"))).join(EN ? "; " : "；")}` : T.tour_start}${k.length === STEPS.length && STEPS.length ? T.tour_all : ""}</div></div>`; };
    // 記録層の規模（数だけ）— 公開抜粋は規則で固定なので増えないが、背後の記録層の成長は数で示す
    const growthCard = () => {
      const F = META.full_stats; if (!F || !F.types) return "";
      const tot = Object.values(F.types).reduce((a, b) => a + b, 0);
      const kp = (v, l) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`;
      const st = F.claim_status || {}; const sOrder = ["established", "registered-hit", "supported", "promoted", "provisional", "open", "challenged", "rejected", "rejected-recorded", "superseded"];
      const stBar = `<div class="bar" style="margin-top:6px">${sOrder.filter(k => st[k]).map(k => `<i style="width:${100 * st[k] / Math.max(1, Object.values(st).reduce((a, b) => a + b, 0))}%;background:${statusColor(k)}" title="${esc(SJA[k] || k)} ${st[k]}"></i>`).join("")}</div><div class="small muted" style="margin-top:4px">${sOrder.filter(k => st[k]).map(k => `<span class="it"><span class="sw" style="background:${statusColor(k)};display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:3px"></span>${esc(SJA[k] || k)} ${st[k]}</span>`).join(" · ")}</div>`;
      const g = F.grounding || {}, bp = F.bidir_pairs || {}, k4 = F.k4 || {}, pr = F.protocols || {};
      return `<div class="card" style="margin-top:12px"><h3 class="ct">${T.growth_h} <span class="muted small">— ${esc((META.generated_at || "").slice(0, 10))}${META.source_ref ? ` (${esc(String(META.source_ref).slice(0, 7))})` : ""}</span></h3><div class="small" style="margin-bottom:8px">${md(T.growth_sub)}</div>
        <div class="grid g4">${kp(fmtN(tot), T.growth_nodes + ` <span class="muted small">(${TYPES.map(t => `${TLET[t]} ${F.types[t] || 0}`).join(" · ")})</span>`)}${kp(`${g.structural || 0}<span class="muted small"> / ${g.claims || 0}</span>`, T.growth_grounded + ` <span class="muted small">· ${g.quick || 0} ${T.growth_quick}</span>`)}${kp(`${bp.bidir || 0}<span class="muted small"> / ${bp.pairs || 0}</span>`, T.growth_bidir)}${kp(`${k4.offline_pass || 0}<span class="muted small"> / ${k4.offline_run || 0}</span>`, T.growth_k4 + ` <span class="muted small">· ${k4.pending || 0} ${T.growth_pending}</span>`)}</div>
        <div class="grid g3" style="margin-top:8px">${kp(fmtN(pr.frozen || 0), T.growth_proto)}${kp(fmtN(F.lessons || 0), T.growth_lessons)}${kp(fmtN(F.status_history || 0), T.growth_hist)}</div>
        <div class="small" style="margin-top:10px"><b>${T.growth_status}</b> (${fmtN(g.claims || 0)})${stBar}</div>
        <div class="small" style="margin-top:10px"><b>${T.growth_daily}</b></div><div id="growth"></div></div>`;
    };
    const drawGrowth = (host) => {
      const F = META.full_stats; if (!host || !F || !F.daily || !F.daily.length) return;
      const W = host.clientWidth || 700, H = 150, m = { l: 34, r: 40, t: 8, b: 22 };
      const days = F.daily.map(([d, n]) => ({ d: new Date(d + "T00:00:00Z"), n })); let c = 0; days.forEach(x => { c += x.n; x.c = c; });
      const x = d3.scaleUtc().domain(d3.extent(days, d => d.d)).range([m.l, W - m.r]), y = d3.scaleLinear().domain([0, d3.max(days, d => d.n)]).nice().range([H - m.b, m.t]), y2 = d3.scaleLinear().domain([0, d3.max(days, d => d.c)]).nice().range([H - m.b, m.t]);
      const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("role", "img").attr("aria-label", T.growth_daily);
      const bw = Math.max(2, (W - m.l - m.r) / Math.max(1, (x.domain()[1] - x.domain()[0]) / 864e5) - 1);
      svg.append("g").selectAll("rect").data(days).join("rect").attr("x", d => x(d.d) - bw / 2).attr("y", d => y(d.n)).attr("width", bw).attr("height", d => y(0) - y(d.n)).attr("fill", css("--accent")).attr("opacity", .55).append("title").text(d => `${d.d.toISOString().slice(0, 10)}: +${d.n} (${d.c})`);
      svg.append("path").datum(days).attr("fill", "none").attr("stroke", css("--ink")).attr("stroke-width", 1.4).attr("d", d3.line().x(d => x(d.d)).y(d => y2(d.c)));
      svg.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.utcFormat("%m/%d"))).selectAll("text").style("font-size", "10px");
      svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4)).selectAll("text").style("font-size", "10px");
      svg.append("g").attr("transform", `translate(${W - m.r},0)`).call(d3.axisRight(y2).ticks(4)).selectAll("text").style("font-size", "10px");
      svg.selectAll(".domain, .tick line").attr("stroke", css("--line"));
    };
    stage.innerHTML = `<div class="pad guide">
      <h2 class="vt">${esc(tr(G, "title"))}</h2>
      <p class="vsub">${esc(tr(G, "source"))}</p>
      <div class="card gfigure" role="group" aria-label="${EN ? "Figure of the mechanism of the knowledge base; elements can be selected with the keyboard" : "知識基盤のしくみの図。要素はキーボードでも選べる"}">${G.svg || ""}</div>
      <div class="card" style="padding:0;overflow:auto;margin-top:12px"><table class="tbl gtbl"><thead><tr>${T.guide_th.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rowHtml}</tbody></table></div>
      <div class="card tour" style="margin-top:12px"><h3 class="ct">${T.tour_h} <span class="muted small">${T.tour_sub}</span></h3><div id="tsum">${tourSummary()}</div><ol class="gsteps">${STEPS.map(stepHtml).join("")}</ol></div>
      ${growthCard()}
      <p class="small muted" style="margin-top:8px">${md(T.guide_foot)}${PUBLIC ? ` ${T.guide_foot_pub} <a href="llms.txt">llms.txt</a>・<a href="kb/kb.jsonld">kb/kb.jsonld</a>・<a href="n/index.html">${T.guide_nodepages}</a>${EN ? "" : "。"}` : ""}</p>
    </div>`;
    drawGrowth(stage.querySelector("#growth"));
    const svg = stage.querySelector(".gfigure svg");
    if (svg && EN) { svg.classList.add("lang-en"); svg.querySelectorAll("text").forEach(t => { const k = (t.textContent || "").trim(); if (SVG_EN[k]) { t.textContent = SVG_EN[k]; const fs = parseFloat(t.getAttribute("font-size") || getComputedStyle(t).fontSize) || 11; t.style.fontSize = (fs * 0.86).toFixed(1) + "px"; } }); }
    const rowOf = (key) => stage.querySelector(`#gr-${CSS.escape(key)}`);
    if (svg) svg.querySelectorAll(".hot").forEach(h => {
      const row = G.rows.find(r => r.key === h.dataset.key);
      h.setAttribute("tabindex", "0"); h.setAttribute("role", "button"); h.setAttribute("aria-label", (row ? tr(row, "fig") : h.dataset.key) + (EN ? " — open the matching row and example" : " — 対応表の行と実例を開く"));
      h.addEventListener("click", e => {
        e.stopPropagation(); const key = h.dataset.key, tr = rowOf(key); if (!tr) return;
        svg.querySelectorAll(".hot").forEach(x => x.classList.toggle("on", x === h));
        stage.querySelectorAll(".gtbl tr.on").forEach(x => x.classList.remove("on")); tr.classList.add("on");
        tr.scrollIntoView({ block: "center", behavior: "smooth" });
        if (row && row.nodes && row.nodes.length) open(row.nodes[0]);
      });
      h.addEventListener("mouseenter", () => { const tr = rowOf(h.dataset.key); if (tr) tr.classList.add("hl"); });
      h.addEventListener("mouseleave", () => { const tr = rowOf(h.dataset.key); if (tr) tr.classList.remove("hl"); });
      h.addEventListener("focus", () => { const tr = rowOf(h.dataset.key); if (tr) tr.classList.add("hl"); });
      h.addEventListener("blur", () => { const tr = rowOf(h.dataset.key); if (tr) tr.classList.remove("hl"); });
    });
    stage.querySelectorAll("input[data-chk]").forEach(cb => cb.addEventListener("change", () => { const i = +cb.dataset.chk; if (cb.checked) done.add(i); else done.delete(i); saveTour(); cb.closest(".tstep").classList.toggle("done", cb.checked); $("#tsum").innerHTML = tourSummary(); }));
    stage.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const t = STEPS[+b.dataset.copy].cmd || ""; const ok = () => { b.textContent = T.copied; setTimeout(() => { b.textContent = T.copy; }, 1200); }; if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, () => window.prompt(EN ? "command:" : "コマンド:", t)); else window.prompt(EN ? "command:" : "コマンド:", t); }));
    stage.querySelectorAll(".gtbl tr[data-key]").forEach(tr => {
      tr.addEventListener("mouseenter", () => { if (svg) { const h = svg.querySelector(`.hot[data-key="${tr.dataset.key}"]`); if (h) h.classList.add("on"); } });
      tr.addEventListener("mouseleave", () => { if (svg) { const h = svg.querySelector(`.hot[data-key="${tr.dataset.key}"]`); if (h && !tr.classList.contains("on")) h.classList.remove("on"); } });
    });
    stage.addEventListener("click", e => {
      const g = e.target.closest("[data-go]"); if (g) { e.stopPropagation(); go(g.dataset.go); return; }
      const b = e.target.closest("[data-trace]"); if (b) { e.stopPropagation(); open(b.dataset.trace); }
    });
  }

  // ---------- 地図（研究の俯瞰） ----------
  // meta.map は kb_atlas.research_map() が記録層から作る（節目・現在地・次の一手・方向層・ORDER・直近の変化）。ここは描くだけ。
  const MARK = { reg: ["◇", "reg"], star: ["★", "star"], plain: ["●", "plain"], bad: ["✗", "bad"], instr: ["⚠", "instr"], est: ["▲", "est"], rej: ["▽", "rej"], st: ["○", "st"] };
  const MARK_JA = { reg: "登録", star: "予測が当たった判定", plain: "判定", bad: "反証", instr: "計器の失敗", est: "主張の確立", rej: "棄却", st: "状態変更" };
  const MARK_EN = { reg: "registration", star: "predicted and hit", plain: "verdict", bad: "falsified", instr: "instrument failed", est: "claim established", rej: "rejected", st: "status change" };
  const fmtD = (d) => d ? (EN ? d.slice(5).replace("-", "/") : `${+d.slice(5, 7)}/${+d.slice(8, 10)}`) : "";
  function viewMap(stage) {
    const M = META.map; if (!M || !M.lanes) { viewAtlas(stage); return; }
    const win = state.mapWin || 60;
    const today = new Date(M.today + "T00:00:00Z");
    const dayOf = (d) => new Date(d + "T00:00:00Z");
    const inWin = (d) => win >= 9999 || (today - dayOf(d)) / 864e5 <= win;
    const lanesAll = M.lanes; const lanes = lanesAll.filter(l => l.events.some(e => inWin(e.date)));
    const quiet = lanesAll.filter(l => !lanes.includes(l));
    const stale = M.stale_days != null && M.stale_days >= 3;
    const latestOrder = M.orders && M.orders.length ? M.orders[M.orders.length - 1] : null;
    const kp = (v, l) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    const lineL = (l) => EN ? `${esc(l.short)} <span class="muted small">${esc(l.label)}</span>` : esc(l.label);
    const laneCard = (l) => {
      const c = l.claims || {}, h = l.hyps || {};
      const nC = Object.values(c).reduce((a, b) => a + b, 0), est = (c.established || 0), hit = (c["registered-hit"] || 0), rej = (c.rejected || 0) + (c["rejected-recorded"] || 0);
      const oH = (h.open || 0) + (h.provisional || 0) + (h.challenged || 0);
      const last = l.events.length ? l.events[l.events.length - 1] : null;
      const lastV = [...l.events].reverse().find(e => e.t === "E") || null;
      const lg = l.ledger || {};
      const bar = (t) => t ? `<span class="lbar" title="${t.hit}/${t.n}"><i style="width:${Math.round(100 * t.hit / Math.max(1, t.n))}%"></i></span> ${t.hit}/${t.n}` : "—";
      const chips = (ids) => ids.length ? ids.map(i => chip(i)).join("") : `<span class="muted small">${T.map.none}</span>`;
      return `<div class="card mlane" id="ml-${esc(l.id)}"><h3 class="ct"><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${lineColor(l.id)};margin-right:6px"></span>${lineL(l)} <span class="muted small">${l.n} ${T.rail_nodes} · ${T.map.last} ${esc(l.last)}</span>
        <span class="right"><button class="iconbtn small" data-story="${esc(l.id)}">${T.map.to_story}</button> <button class="iconbtn small" data-line="${esc(l.id)}">${T.map.goto_line} →</button></span></h3>
        ${nC ? `<div class="bar">${["established", "registered-hit", "supported", "promoted", "provisional", "open", "challenged", "rejected", "rejected-recorded", "superseded"].filter(s => c[s]).map(s => `<i style="width:${100 * c[s] / nC}%;background:${statusColor(s)}" title="${esc(SJA[s] || s)} ${c[s]}"></i>`).join("")}</div>` : ""}
        <div class="small" style="margin-top:6px">${T.map.claims_line(nC, est, hit, rej)} · ${T.map.hyps_line(oH)} · ${T.map.regs_line(l.verdicts.reg, l.open_p.length)}</div>
        <div class="mrow"><b>${T.map.now}</b> ${lastV ? `${esc(fmtD(lastV.date))} <span class="mk ${lastV.mark}">${MARK[lastV.mark][0]}</span> ${esc(lastV.name || "")}${lastV.kn ? ` ${esc(lastV.kn)}` : ""} — ${chip(lastV.id)}` : last ? `${esc(fmtD(last.date))} <span class="mk ${last.mark}">${MARK[last.mark][0]}</span> ${chip(last.id)}` : `<span class="muted small">${T.map.no_ev}</span>`}</div>
        ${l.ledger && (lg.instrument || lg.mechanism) ? `<div class="mrow"><b>${T.map.ledger}</b> ${T.map.instr} ${bar(lg.instrument)} · ${T.map.mech} ${bar(lg.mechanism)} <span class="muted small">(${T.map.asof} ${esc(fmtD(lg.as_of))})</span></div>` : ""}
        <div class="mrow"><b>${T.map.next}</b> ${l.open_p.length || l.open_h.length ? `${l.open_p.length ? `<div class="small muted">${T.map.openp}</div>${chips(l.open_p)}` : ""}${l.open_h.length ? `<div class="small muted">${T.map.openh}</div>${chips(l.open_h)}` : ""}` : `<span class="muted small">${T.map.nothing_open}</span>`}</div>
        <details class="sec"><summary>${T.map.est} <span class="n">${l.established.length}</span> · ${T.map.rej} <span class="n">${l.rejected.length}</span> · ${T.map.lessons} <span class="n">${l.lessons.length}</span></summary><div class="mrow"><div class="small muted">${T.map.est}</div>${chips(l.established)}<div class="small muted">${T.map.rej}</div>${chips(l.rejected)}<div class="small muted">${T.map.lessons}</div>${chips(l.lessons)}</div></details>
      </div>`;
    };
    const P = M.program || {};
    const stChip = (x) => `<span class="chip" data-node="${esc(x.id)}" tabindex="0" role="link"><span class="dot" style="background:${statusColor(x.status)}"></span><span class="id">${esc(x.id.replace(/^(C-principle-|H-dir-)/, ""))}</span><span class="t">${esc(short(x.label, 60))}</span><span class="badge" style="background:${statusColor(x.status)};margin-left:4px">${esc(SJA[x.status] || x.status || "")}</span></span>`;
    const ordersHtml = M.orders && M.orders.length ? `<div class="card" style="padding:0;overflow:auto"><table class="tbl"><thead><tr><th>No</th><th>${T.prov_date}</th><th></th><th>${EN ? "title" : "表題"}</th></tr></thead><tbody>${[...M.orders].reverse().map(o => `<tr><td><code>${esc(o.no)}</code></td><td class="nowrap">${esc(o.date)}</td><td>${o.kind === "ruling" ? `<span class="badge" style="background:${css("--muted")}">${T.map.ruling}</span>` : ""}</td><td class="small">${esc(o.title)}</td></tr>`).join("")}</tbody></table></div>` : "";
    const byLine = (ids) => { const g = new Map(); ids.forEach(i => { const n = byId.get(i); if (!n) return; const k = n._line; if (!g.has(k)) g.set(k, []); g.get(k).push(i); }); return [...g].sort((a, b) => b[1].length - a[1].length); };
    const recent7 = M.recent["7"] || [], recent30 = M.recent["30"] || [];
    const privLanes = M.private_lanes || [];
    stage.innerHTML = `<div class="pad map">
      <h2 class="vt">${T.map.title}</h2><p class="vsub">${T.map.sub}</p>
      <div class="card${stale ? " pend" : ""}" style="margin-bottom:12px"><div class="small">${T.map.fresh(esc(M.full_record_max || M.record_max), M.stale_days)}${latestOrder ? T.map.latest_order(esc(latestOrder.no), esc(latestOrder.date)) : ""}${stale ? ` — <b>${PUBLIC ? T.map.stale_pub : T.map.stale}</b>` : ""}</div></div>
      <div class="grid g4" style="margin-bottom:12px">${kp(fmtN(lanesAll.length), EN ? "research lines" : "研究線")}${kp(fmtN(lanesAll.reduce((a, l) => a + l.verdicts.reg, 0)), EN ? "registrations" : "登録")}${kp(fmtN(lanesAll.reduce((a, l) => a + l.verdicts.star, 0)) + `<span class="muted small"> / ${fmtN(lanesAll.reduce((a, l) => a + l.verdicts.star + l.verdicts.plain + l.verdicts.bad + l.verdicts.instr, 0))}</span>`, EN ? "★ hits / verdicts" : "★ 的中 / 判定")}${kp(fmtN(recent7.length) + `<span class="muted small"> / ${fmtN(recent30.length)}</span>`, EN ? "nodes added, 7 d / 30 d" : "追記 7 日 / 30 日")}</div>
      <div class="card" style="margin-bottom:12px"><h3 class="ct">${T.map.lanes_h} <span class="seg" style="margin-left:10px">${[30, 60, 120, 9999].map(w => `<button data-win="${w}" class="${win === w ? "on" : ""}">${w === 9999 ? T.map.all : w + " " + T.map.days}</button>`).join("")}</span></h3><div id="mapLanes"></div><div class="small muted" style="margin-top:6px">${T.map.legend}</div>${quiet.length ? `<div class="small muted" style="margin-top:4px">${T.map.quiet(quiet.map(l => `<a data-line="${esc(l.id)}" style="cursor:pointer">${esc(l.short)}</a>`).join(EN ? ", " : "・"))}</div>` : ""}</div>
      <h3 class="ct">${T.map.cards_h}</h3><div class="grid g2" style="margin-bottom:12px">${lanesAll.map(laneCard).join("")}</div>
      ${privLanes.length ? `<div class="card" style="margin-bottom:12px"><h3 class="ct">${T.map.private_h}</h3><div class="small muted">${T.map.private_sub}</div><div class="small" style="margin-top:6px">${privLanes.map(l => `<span class="it"><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${lineColor("dir-" + l.key)};margin-right:4px"></span>${esc(l.label)}: ${fmtN(l.n)} ${T.rail_nodes} · ${EN ? "claims" : "主張"} ${l.claims} · ${EN ? "registrations" : "登録"} ${l.protocols} · ${EN ? "last" : "最終"} ${esc(l.last)}</span>`).join("<br>")}</div></div>` : ""}
      <div class="grid g2" style="margin-bottom:12px">
        <div class="card"><h3 class="ct">${T.map.program_h}</h3><div class="small muted">${T.map.program_sub}</div>${P.root ? `<div class="mrow">${chip(P.root)}</div>` : ""}<div class="mrow"><b>${T.map.principles}</b><div>${(P.principles || []).map(stChip).join("") || T.map.none}</div></div><div class="mrow"><b>${T.map.directions}</b>${P.next ? ` ${chip(P.next)}` : ""}<div>${(P.directions || []).map(stChip).join("") || T.map.none}</div>${P.next_statement ? `<div class="small muted" style="margin-top:4px">${esc(short(P.next_statement, 200))}</div>` : ""}</div></div>
        <div class="card"><h3 class="ct">${T.map.changed_h}</h3><div class="mrow"><b>${T.map.new7}</b> <span class="muted small">${recent7.length}</span><div>${recent7.length ? byLine(recent7).map(([ln, ids]) => `<div class="small"><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${lineColor(ln)};margin-right:4px"></span>${esc((lineById.get(ln) || {}).short || ln)} ${ids.slice(0, 12).map(i => chip(i)).join("")}${ids.length > 12 ? `<span class="muted small"> +${ids.length - 12}</span>` : ""}</div>`).join("") : `<span class="muted small">${T.map.no_change}</span>`}</div></div>
          <div class="mrow"><b>${T.map.new30}</b> <span class="muted small">${recent30.length}</span><div class="small">${byLine(recent30).map(([ln, ids]) => `<span class="it"><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${lineColor(ln)};margin-right:3px"></span>${esc((lineById.get(ln) || {}).short || ln)} <b>${ids.length}</b></span>`).join(" · ") || T.map.no_change}</div></div>
          <div class="mrow"><b>${T.map.trans}</b> <span class="muted small">${(M.changes || []).length}</span><div>${(M.changes || []).slice(0, 12).map(c => `<div class="small">${esc(fmtD(c.date))} ${chip(c.id)} <span class="badge" style="background:${statusColor(c.from)}">${esc(SJA[c.from] || c.from)}</span> → <span class="badge" style="background:${statusColor(c.to)}">${esc(SJA[c.to] || c.to)}</span>${c.reason ? `<div class="muted small" style="margin-left:14px">${esc(short(c.reason, 120))}</div>` : ""}</div>`).join("") || `<span class="muted small">${T.map.no_change}</span>`}</div></div></div>
      </div>
      ${ordersHtml ? `<div class="card" style="margin-bottom:12px"><h3 class="ct">${T.map.orders_h}</h3><div class="small muted" style="margin-bottom:6px">${T.map.orders_sub}</div>${ordersHtml}</div>` : ""}
    </div>`;
    stage.querySelectorAll("[data-win]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); state.mapWin = +b.dataset.win; render(); }));
    stage.querySelectorAll("[data-story]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); go("story", { line: b.dataset.story }); }));
    drawLanes(stage.querySelector("#mapLanes"), lanes, win, today);
  }
  // ---------- 研究線の物語（1 本の線を順に読む・共有する） ----------
  function storyMarkdown(L, ods, ds) {
    const MK = EN ? MARK_EN : MARK_JA; const c = L.claims || {}, nC = Object.values(c).reduce((a, b) => a + b, 0), v = L.verdicts;
    const lab = (i) => plain((byId.get(i) || {}).label || "").slice(0, 110);
    const o = [`# ${L.label}（${L.short}）`, "", `${EN ? "generated" : "生成"} ${META.map.today} · ${T.map.last} ${L.last} · ${L.n} ${T.rail_nodes}`, "",
      `${T.map.claims_line(nC, c.established || 0, c["registered-hit"] || 0, (c.rejected || 0) + (c["rejected-recorded"] || 0))} · ${T.map.regs_line(v.reg, L.open_p.length)} · ${T.map.hyps_line(L.open_h.length)}`];
    const lastV = [...L.events].reverse().find(e => e.t === "E");
    o.push("", `## ${T.map.now}`, lastV ? `${lastV.date} ${MARK[lastV.mark][0]} ${lastV.name || ""} ${lastV.kn || ""} — \`${lastV.id}\` ${plain(lastV.label).slice(0, 120)}` : T.map.no_ev);
    if (L.open_p.length) o.push("", `## ${T.map.pending_h} — ${T.map.openp}`, ...L.open_p.map(i => `- \`${i}\` ${lab(i)}`));
    if (L.open_h.length) o.push("", `## ${T.map.pending_h} — ${T.map.openh}`, ...L.open_h.map(i => `- \`${i}\` ${lab(i)}`));
    if (ods.length) o.push("", `## ${T.map.orders_line_h}`, ...ods.map(x => `- ${x.no}（${x.date}）${x.title}`));
    o.push("", `## ${T.map.decisions_h}`, ...(ds.length ? ds.map(d => `- [${d.status}] ${d.date} \`${d.id}\` **${d.question}** → ${d.choice || "—"}（${d.by || d.proposed_by || ""}）${(d.based_on || []).length ? " " + d.based_on.map(b => "`" + b + "`").join(", ") : ""}`) : [T.map.decisions_none]));
    o.push("", `## ${T.map.timeline_h}`, ...L.events.map(x => `- ${x.date} ${MARK[x.mark][0]} ${MK[x.mark]} \`${x.id}\` ${x.name || ""}${x.kn ? " " + x.kn : ""} — ${plain(x.label).slice(0, 110)}`));
    if (L.lessons.length) o.push("", `## ${T.map.lessons}`, ...L.lessons.map(i => `- \`${i}\` ${lab(i)}`));
    o.push("", `${location.origin}${location.pathname}#v=story&line=${L.id}${EN ? "&lang=en" : ""}`);
    return o.join("\n") + "\n";
  }
  function viewStory(stage) {
    const M = META.map; if (!M || !M.lanes) { viewAtlas(stage); return; }
    const L = M.lanes.find(l => l.id === state.line) || M.lanes[0]; if (!L) { viewMap(stage); return; } state.line = L.id;
    const ods = (M.orders || []).filter(o => (L.orders || []).includes(o.no)), ds = (M.decisions || []).filter(d => (L.decisions || []).includes(d.id));
    const c = L.claims || {}, nC = Object.values(c).reduce((a, b) => a + b, 0), v = L.verdicts, lg = L.ledger || {};
    const bar = (t) => t ? `<span class="lbar" title="${t.hit}/${t.n}"><i style="width:${Math.round(100 * t.hit / Math.max(1, t.n))}%"></i></span> ${t.hit}/${t.n}` : "—";
    const chips = (ids) => ids.length ? ids.map(i => chip(i)).join("") : `<span class="muted small">${T.map.none}</span>`;
    const byDate = d3.groups(L.events, e => e.date);
    const disc = META.discussions ? `<a class="iconbtn small" href="${esc(META.discussions)}${META.discussions.includes("?") ? "&" : "?"}discussions_q=${encodeURIComponent(L.short)}" target="_blank" rel="noopener">${T.map.discuss} ↗</a>` : `<span class="muted small" title="${T.map.discuss_none}">${T.map.discuss}: —</span>`;
    const dcard = (d) => `<div class="card dcard"><div class="h"><span class="badge" style="background:${d.status === "decided" ? statusColor("established") : d.status === "superseded" ? css("--muted") : statusColor("provisional")}">${esc(T.map.d_status[d.status] || d.status)}</span> <span class="badge" style="background:${css("--muted")}">${esc(d.kind || "")}</span> <code>${esc(d.id)}</code> <span class="muted small">${esc(d.date)}</span></div>
      <div class="mrow"><b>${T.map.d_q}</b> ${esc(d.question)}</div>${(d.options || []).length ? `<div class="mrow"><b>${T.map.d_opt}</b> ${d.options.map(x => `<span class="badge" style="background:${x === d.choice ? statusColor("established") : css("--line")};color:${x === d.choice ? "#fff" : "var(--ink)"}">${esc(x)}</span>`).join(" ")}</div>` : ""}
      ${d.choice ? `<div class="mrow"><b>${T.map.d_choice}</b> ${esc(d.choice)}</div>` : ""}${d.rationale ? `<div class="mrow"><b>${T.map.d_why}</b> <span class="small">${md(d.rationale)}</span></div>` : ""}
      ${(d.based_on || []).length ? `<div class="mrow"><b>${EN ? "grounds" : "根拠"}</b> ${chips(d.based_on)}</div>` : ""}<div class="mrow small muted">${d.proposed_by ? `${T.map.d_prop} ${esc(d.proposed_by)} · ` : ""}${d.by ? `${T.map.d_by} ${esc(d.by)}` : ""}${d.source ? ` · ${Object.entries(d.source).filter(([k, x]) => x && (!Array.isArray(x) || x.length)).map(([k, x]) => `${esc(k)} ${esc(Array.isArray(x) ? x.join(" ") : x)}`).join(" · ")}` : ""}${d.note ? `<div>${esc(d.note)}</div>` : ""}</div></div>`;
    stage.innerHTML = `<div class="pad map story">
      <div class="pillbar">${M.lanes.map(l => `<span class="chip" data-story="${esc(l.id)}" style="${l.id === L.id ? "border-color:var(--accent);background:var(--sel)" : ""}"><span class="dot" style="background:${lineColor(l.id)}"></span>${esc(EN ? l.short : l.label)} <span class="muted">${l.n}</span></span>`).join("")}<button class="iconbtn small" data-go="map" style="margin-left:8px">${T.map.back_map}</button></div>
      <h2 class="vt"><span class="sw" style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${lineColor(L.id)}"></span> ${esc(L.label)} <span class="muted small">${L.n} ${T.rail_nodes} · ${T.map.last} ${esc(L.last)}</span></h2>
      <p class="vsub">${T.map.story_sub}</p>
      <div class="toolbar"><button class="iconbtn small" id="stCopyUrl">${T.map.copy_url}</button> <button class="iconbtn small" id="stCopyMd">${T.map.copy_md}</button> <button class="iconbtn small" id="stDlMd">${T.map.dl_md}</button> <button class="iconbtn small" id="stDlJson">${T.map.dl_json}</button> ${disc} <button class="iconbtn small" data-line="${esc(L.id)}" style="margin-left:auto">${T.map.goto_line} →</button></div>
      <div class="grid g3" style="margin:10px 0 12px">
        <div class="card kpi"><div class="v">${nC}</div><div class="l">${T.map.claims_line(nC, c.established || 0, c["registered-hit"] || 0, (c.rejected || 0) + (c["rejected-recorded"] || 0))}</div></div>
        <div class="card kpi"><div class="v">${v.star}<span class="muted small"> / ${v.star + v.plain + v.bad + v.instr}</span></div><div class="l">${EN ? "★ hits / verdicts" : "★ 的中 / 判定"} · ${T.map.regs_line(v.reg, L.open_p.length)}</div></div>
        <div class="card kpi"><div class="v">${L.open_h.length + L.open_p.length}</div><div class="l">${T.map.pending_h}${L.ledger && (lg.instrument || lg.mechanism) ? ` · ${T.map.instr} ${bar(lg.instrument)} · ${T.map.mech} ${bar(lg.mechanism)}` : ""}</div></div>
      </div>
      <div class="grid g2">
        <div>
          <div class="card"><h3 class="ct">${T.map.pending_h}</h3><div class="mrow"><b>${T.map.openp}</b><div>${chips(L.open_p)}</div></div><div class="mrow"><b>${T.map.openh}</b><div>${chips(L.open_h)}</div></div></div>
          <div class="card" style="margin-top:12px"><h3 class="ct">${T.map.decisions_h} <span class="muted small">${ds.length}</span></h3>${ds.length ? ds.map(dcard).join("") : `<div class="small muted">${T.map.decisions_none}</div>`}</div>
          ${ods.length ? `<div class="card" style="margin-top:12px"><h3 class="ct">${T.map.orders_line_h}</h3>${ods.map(o => `<div class="small">${esc(o.no)} <span class="muted">${esc(o.date)}</span> ${esc(o.title)}</div>`).join("")}</div>` : ""}
          ${L.lessons.length ? `<div class="card" style="margin-top:12px"><h3 class="ct">${T.map.lessons}</h3>${chips(L.lessons)}</div>` : ""}
        </div>
        <div class="card"><h3 class="ct">${T.map.timeline_h} <span class="muted small">${L.events.length}</span></h3><div class="stl">${byDate.map(([d, arr]) => `<div class="sday"><div class="sdate">${esc(d)}</div><div class="sev">${arr.map(x => `<div class="sitem"><span class="mk ${x.mark}">${MARK[x.mark][0]}</span> ${chip(x.id)} ${x.name ? `<span class="small">${esc(x.name)}${x.kn ? " " + esc(x.kn) : ""}</span>` : ""}${x.open ? `<span class="badge" style="background:${statusColor("provisional")}">${T.map.openp}</span>` : ""}</div>`).join("")}</div></div>`).join("") || `<div class="hint">${T.map.no_ev}</div>`}</div></div>
      </div></div>`;
    const flash = (b, t) => { const o = b.textContent; b.textContent = t; setTimeout(() => { b.textContent = o; }, 1200); };
    const url = () => location.href.replace(/#.*$/, "") + `#v=story&line=${L.id}${EN ? "&lang=en" : ""}`;
    const dl = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
    $("#stCopyUrl").onclick = (e) => { e.stopPropagation(); const b = e.currentTarget; if (navigator.clipboard) navigator.clipboard.writeText(url()).then(() => flash(b, T.map.copied), () => window.prompt("URL:", url())); else window.prompt("URL:", url()); };
    $("#stCopyMd").onclick = (e) => { e.stopPropagation(); const b = e.currentTarget, t = storyMarkdown(L, ods, ds); if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => flash(b, T.map.copied), () => window.prompt("Markdown:", t)); else window.prompt("Markdown:", t); };
    $("#stDlMd").onclick = (e) => { e.stopPropagation(); dl(`${L.id}.md`, storyMarkdown(L, ods, ds), "text/markdown"); };
    $("#stDlJson").onclick = (e) => { e.stopPropagation(); dl(`${L.id}.json`, JSON.stringify({ generated_at: META.map.today, lane: L, orders: ods, decisions: ds }, null, 1), "application/json"); };
    stage.querySelectorAll("[data-story]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); go("story", { line: b.dataset.story }); }));
    stage.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); go(b.dataset.go); }));
  }
  function drawLanes(host, lanes, win, today) {
    if (!host) return; if (!lanes.length) { host.innerHTML = `<div class="hint">${T.map.no_ev}</div>`; return; }
    const dayOf = (d) => new Date(d + "T00:00:00Z");
    const allD = lanes.flatMap(l => l.events.map(e => dayOf(e.date)));
    const x0 = win >= 9999 ? new Date(Math.min(...allD) - 2 * 864e5) : new Date(today - win * 864e5);
    const W = host.clientWidth || 900, padL = 110, padR = 150, padT = 22, padB = 24;
    const rowHs = lanes.map(l => { const m = d3.max(d3.rollup(l.events.filter(e => dayOf(e.date) >= x0), v => v.length, e => e.date).values()) || 1; return Math.min(96, Math.max(30, 12 * m + 10)); });
    const rowY = rowHs.map((h, i) => padT + rowHs.slice(0, i).reduce((a, b) => a + b, 0) + h / 2);
    const H = padT + padB + rowHs.reduce((a, b) => a + b, 0);
    const x = d3.scaleUtc().domain([x0, new Date(+today + 864e5)]).range([padL, W - padR]);
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("role", "img");
    svg.append("g").attr("transform", `translate(0,${padT - 6})`).call(d3.axisTop(x).ticks(Math.max(4, Math.min(12, Math.round((W - padL - padR) / 80)))).tickFormat(d3.utcFormat(EN ? "%m/%d" : "%-m/%-d"))).selectAll("text").style("font-size", "10px").style("fill", css("--muted"));
    svg.selectAll(".domain, .tick line").attr("stroke", css("--line"));
    svg.append("line").attr("x1", x(today)).attr("x2", x(today)).attr("y1", padT - 4).attr("y2", H - padB + 4).attr("stroke", css("--accent")).attr("stroke-dasharray", "3,3").attr("opacity", .7);
    lanes.forEach((l, i) => {
      const y = rowY[i];
      svg.append("line").attr("x1", padL).attr("x2", W - padR).attr("y1", y).attr("y2", y).attr("stroke", css("--line"));
      svg.append("rect").attr("x", 4).attr("y", y - 6).attr("width", 6).attr("height", 12).attr("rx", 2).attr("fill", lineColor(l.id));
      const lab = svg.append("text").attr("x", 14).attr("y", y + 4).style("font-size", "11px").style("fill", css("--ink")).style("cursor", "pointer").text(short(EN ? l.short : l.label, 14)).attr("data-line", l.id);
      lab.append("title").text(l.label);
      const ev = l.events.filter(e => dayOf(e.date) >= x0);
      const byDate = d3.groups(ev, e => e.date);
      byDate.forEach(([d, arr]) => arr.forEach((e, j) => {
        const dy = arr.length > 1 ? (j - (arr.length - 1) / 2) * 11 : 0;
        const [g, cls] = MARK[e.mark] || MARK.plain;
        const t = svg.append("text").attr("x", x(dayOf(d))).attr("y", y + dy + 4).attr("text-anchor", "middle").attr("class", "mmk " + cls + (e.open ? " open" : "")).style("cursor", "pointer").text(g).attr("data-node", e.id);
        t.append("title").text(`${e.date} ${(EN ? MARK_EN : MARK_JA)[e.mark]}${e.name ? " · " + e.name : ""}${e.kn ? " " + e.kn : ""}\n${e.id}\n${(e.label || "").slice(0, 100)}`);
        t.on("mouseover", (ev2) => showTT(`<b>${esc(e.id)}</b>${esc(short(e.label, 110))}<br><span style="opacity:.8">${esc(e.date)} · ${esc((EN ? MARK_EN : MARK_JA)[e.mark])}${e.name ? " · " + esc(e.name) : ""}${e.kn ? " " + esc(e.kn) : ""}</span>`, ev2)).on("mousemove", moveTT).on("mouseout", hideTT);
      }));
      const lastV = [...l.events].reverse().find(e => e.t === "E" && dayOf(e.date) >= x0);
      const v = l.verdicts;
      svg.append("text").attr("x", W - padR + 8).attr("y", y - 3).style("font-size", "10px").style("fill", css("--ink")).text(lastV ? short(lastV.name || "", 22) : "");
      svg.append("text").attr("x", W - padR + 8).attr("y", y + 10).style("font-size", "9.5px").style("fill", css("--muted")).text(`◇${v.reg} ★${v.star} ●${v.plain} ✗${v.bad + v.instr}`);
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
    const Xall = vis.filter(n => n.type === "ExecutionUnit"); const Xoff = Xall.filter(x => (x.env || {}).offline); const Xrun = Xoff.filter(rerunable);
    const k4pass = Xrun.filter(x => (k4Of(x.id) || {}).status === "PASS").length;
    const Xpend = Xall.filter(x => (k4Of(x.id) || {}).status === "PENDING").length, Xnone = Xall.filter(x => !k4Of(x.id)).length, Xnb = Xoff.length - Xrun.length;
    const claimsPending = rows.filter(r => !r.ch.pass && r.ch.xs.length).length;
    const Eall = vis.filter(n => n.type === "Evidence"); let pairs = 0, bidir = 0; Eall.forEach(E => (E.grounded_in || []).forEach(x => { if (!byId.has(x)) return; pairs++; if ((byId.get(x).verifies || []).includes(E.id)) bidir++; }));
    const arts = Eall.flatMap(E => E.artifacts || []); const artsSha = arts.filter(a => a.sha256).length, artsVer = arts.filter(a => a.sha_verified === "verified").length;
    const Pfrozen = vis.filter(n => n.type === "Protocol" && n.frozen).length, hits = vis.filter(n => n.status === "registered-hit").length;
    const order = { "registered-hit": 0, established: 1, supported: 2, promoted: 2, provisional: 3, open: 4, challenged: 5, rejected: 6, "rejected-recorded": 6 };
    rows.sort((a, b) => (b.ch.pass - a.ch.pass) || ((order[a.c.status] ?? 9) - (order[b.c.status] ?? 9)) || (b.c._date || "").localeCompare(a.c._date || ""));
    const kp = (v, l, s = "", def = "") => `<div class="card kpi"${def ? ` title="${esc(def)}"` : ""}><div class="v">${v}</div><div class="l">${l}${def ? ` <span class="def" aria-label="定義">ⓘ</span>` : ""}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
    const cloneCmd = PUBLIC && PUBREPO ? `git clone ${PUBREPO}.git && cd ${esc(META.public_repo.split("/")[1])} && python3 rerun.py` : `git clone git@github.com:${esc(META.repo)}.git && cd ${esc(META.repo.split("/")[1])} && python3 knowledge/tools/kb_k4.py`;
    const rerunBox = RERUN ? (() => { const np = RERUN.results.filter(r => r.status === "PASS").length, nb = RERUN.results.filter(r => r.status === "NOT-BUNDLED").length, nt = RERUN.results.length - nb; return `<div class="small" style="margin-top:8px"><b>${T.ci_h}</b>（<a href="${esc(META.rerun_latest)}">kb/rerun-latest.json</a>、${esc((RERUN.generated_at || "").slice(0, 16).replace("T", " "))} UTC${RERUN.python ? "、Python " + esc(RERUN.python) : ""}${RERUN.commit ? "、commit " + esc(String(RERUN.commit).slice(0, 7)) : ""}）: <b style="color:${np === nt ? "var(--ok, #15803d)" : "var(--bad, #b91c1c)"}">${np}/${nt} PASS</b>${nb ? `、${T.ci_nb} ${nb}` : ""} — ${RERUN.results.map(r => `<code title="${esc(r.status)}${r.got ? " got " + esc(r.got) : ""}">${esc(r.id)}</code> ${r.status === "PASS" ? "✓" : r.status === "NOT-BUNDLED" ? "–" : "✗"}`).join(" ")}</div>`; })() : (PUBLIC ? `<div class="small muted" style="margin-top:8px">${T.ci_wait}</div>` : "");
    stage.innerHTML = `<div class="pad">
      <h2 class="vt">${T.gr_title}</h2>
      <p class="vsub">${T.gr_sub}</p>
      <div class="grid g3" style="margin-bottom:12px">
        <div class="card"><h3 class="ct">${T.p1_h}</h3><div class="small">${T.p1}</div></div>
        <div class="card"><h3 class="ct">${T.p2_h}</h3><div class="small">${T.p2}</div></div>
        <div class="card"><h3 class="ct">${T.p3_h}</h3><div class="small">${T.p3}</div></div>
      </div>
      <div class="grid g4" style="margin-bottom:12px">
        ${kp(`${claims.length ? Math.round(100 * grounded / claims.length) : 0}%`, T.kpi1, T.kpi1_s(grounded, claims.length), T.kpi1_d)}
        ${kp(`${claims.length ? Math.round(100 * withPass / claims.length) : 0}%`, T.kpi2, T.kpi2_s(withPass, claims.length, claimsPending), T.kpi2_d)}
        ${kp(`${pairs ? Math.round(100 * bidir / pairs) : 0}%`, T.kpi3, T.kpi3_s(bidir, pairs), T.kpi3_d)}
        ${kp(`${k4pass}<span class="muted small"> / ${Xrun.length}</span>`, T.kpi4, T.kpi4_s({ Xpend, Xnone, Xnb, artsVer, artsSha, Pfrozen, hits }), T.kpi4_d)}
      </div>
      ${Xpend || Xnb ? `<div class="card pend" style="margin-bottom:12px"><h3 class="ct">${T.pend_h(Xpend + Xnb)}</h3><div class="small">${Xpend ? T.pend1(Xpend) : ""}${Xnb ? T.pend2(Xnb) : ""}${T.pend3}</div><div style="margin-top:6px">${Xall.filter(x => (k4Of(x.id) || {}).status === "PENDING" || ((x.env || {}).offline && !rerunable(x))).map(x => `${chip(x.id)} <span class="badge" style="background:${css("--muted")}">${esc(x.tier || "?")}</span>`).join(" ")}</div></div>` : ""}
      <div class="card" style="margin-bottom:12px"><h3 class="ct">${T.how_h}</h3><div class="small">${T.how1}</div><pre class="raw" style="max-height:none">${esc(cloneCmd)}</pre><div class="small muted">${T.how2}${BINDER ? T.how3(BINDER, CODESPACES) : ""}</div>${rerunBox}</div>
      <div class="card" style="padding:0;overflow:auto"><table class="tbl"><thead><tr>${T.gr_th.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(({ c, ch }) => `<tr data-node="${c.id}" class="${state.node === c.id ? "sel" : ""}"><td><code>${esc(c.id)}</code><div class="small">${esc(short(c.label, 70))}</div></td><td>${badgeStatus(c)}</td><td>${ch.evs.map(e => chip(e)).join("") || "—"}</td><td>${ch.xs.map(x => `<div style="margin:2px 0">${chip(x.id)} <span class="badge" style="background:${css("--muted")}">${esc(x.tier || "?")}</span> ${k4Badge(x.id)}</div>`).join("") || '<span class="muted">—</span>'}</td><td class="nowrap">${ch.sha ? `${ch.verified}/${ch.sha} ${T.verified}` : "—"}</td><td>${ch.ps.map(p => chip(p)).join("") || "—"}</td><td><button class="iconbtn small" data-trace="${c.id}">${T.trace}</button></td></tr>`).join("")}</tbody></table></div></div>`;
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
        ${STUBS.length ? `<label class="small" style="margin-left:10px;cursor:pointer" title="記録層に存在するが公開抜粋に含まれない隣接ノード（型だけ公開）を点線の円で示す"><input type="checkbox" id="gstubs" ${state.showStubs ? "checked" : ""}> 非公開スタブを表示（${fmtN(STUBS.length)}）</label>` : ""}
        <span class="right legend" id="glegend"></span></div>
      <div class="graphwrap card" style="padding:0"><svg id="gsvg"></svg><div class="ov" id="gov"></div></div></div>`;
    $("#gcol").onclick = e => { const b = e.target.closest("[data-gc]"); if (b) { state.graphColor = b.dataset.gc; render(); } };
    $("#gdep").onclick = e => { const b = e.target.closest("[data-gd]"); if (b) { state.graphDepth = +b.dataset.gd; render(); } };
    const gc = $("#gclear"); if (gc) gc.onclick = () => { state.graphFocus = null; render(); };
    const gs = $("#gstubs"); if (gs) gs.onchange = () => { state.showStubs = gs.checked; render(); };
    // subgraph（スタブは表示を選んだときだけ、表示中ノードに隣接するものを加える）
    let nodes = vis, edgeList = [];
    if (state.showStubs && STUBS.length) { const extra = STUBS.filter(s => s._out.some(e => visSet.has(e.to)) || s._in.some(e => visSet.has(e.from))); nodes = vis.concat(extra); extra.forEach(s => visSet.add(s.id)); }
    const adj = new Map();
    for (const n of nodes) for (const e of n._out) if (visSet.has(e.to)) { edgeList.push({ source: n.id, target: e.to, rel: e.rel }); (adj.get(n.id) || adj.set(n.id, new Set()).get(n.id)).add(e.to); (adj.get(e.to) || adj.set(e.to, new Set()).get(e.to)).add(n.id); }
    if (state.graphFocus && byId.has(state.graphFocus)) {
      const keep = new Set([state.graphFocus]); let frontier = [state.graphFocus];
      for (let d = 0; d < state.graphDepth; d++) { const nf = []; for (const id of frontier) { if (isStub(id)) continue; for (const m of (byId.get(id)._out.map(e => e.to).concat(byId.get(id)._in.map(e => e.from)))) if (!keep.has(m) && byId.has(m) && (state.showStubs || !isStub(m))) { keep.add(m); nf.push(m); } } frontier = nf; if (keep.size > 400) break; }
      nodes = DATA.nodes.filter(n => keep.has(n.id) && (state.showStubs || !n._stub)); const ks = new Set(nodes.map(n => n.id)); edgeList = []; for (const n of nodes) for (const e of n._out) if (ks.has(e.to)) edgeList.push({ source: n.id, target: e.to, rel: e.rel });
    }
    const colorOf = n => n._stub ? "none" : state.graphColor === "line" ? lineColor(n._line) : state.graphColor === "type" ? typeColor(n.type) : (n.status ? statusColor(n.status) : css("--s-none"));
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
    const node = root.append("g").selectAll("circle").data(simNodes).join("circle").attr("data-nid", d => d.id).attr("data-stroke", d => d.n._stub ? css("--muted") : "#fff").attr("data-sw", 0.8).attr("r", d => d.r).attr("cx", d => d.x).attr("cy", d => d.y).attr("fill", d => colorOf(d.n)).attr("stroke", d => d.id === state.node ? css("--ink") : d.n._stub ? css("--muted") : "#fff").attr("stroke-width", d => d.id === state.node ? 2.5 : 0.8).attr("stroke-dasharray", d => d.n._stub ? "2,2" : null).style("cursor", "pointer");
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
    if (!state.node) { host.innerHTML = `<div class="empty"><b>${T.insp_empty_h}</b>${T.insp_empty}</div>`; return; }
    const n = byId.get(state.node); const prov = n.prov || {};
    const canBack = state.trailPos > 0, canFwd = state.trailPos < state.trail.length - 1;
    if (n._stub) {  // 非公開スタブ: 型と隣接だけを示す（実 ID・本文は出さない）
      const nb = [...n._out.map(e => ({ id: e.to, rel: e.rel, dir: "out" })), ...n._in.map(e => ({ id: e.from, rel: e.rel, dir: "in" }))];
      host.innerHTML = `<div class="top"><div class="nav"><button class="iconbtn" id="iBack" ${canBack ? "" : "disabled"} title="戻る">←</button><button class="iconbtn" id="iFwd" ${canFwd ? "" : "disabled"} title="進む">→</button><span class="sp"></span><button class="iconbtn" id="iClose" title="閉じる">✕</button></div>
        <div class="ident">${badgeType(n)}<span class="badge" style="background:${css("--muted")}">非公開</span><code>${esc(n.id)}</code></div><div class="title">${esc(n.label)}</div></div>
        <div class="bd"><div class="stmt">このノードは記録層（private リポジトリ）に存在するが、公開抜粋の選択規則に入っていない。<b>型だけを公開</b>し、本文・実 ID は出さない。ID の <code>~</code> 以降は実 ID の sha256 先頭 10 桁で、記録層を持つ側は同じ計算で照合できる。<br><br>スタブを残す理由: 公開ノードから見て「証拠・主張が<b>ある</b>が非公開」なのか「<b>無い</b>」のかを区別できるようにするため。</div>
        <h5>公開ノードとの関係 <span class="muted">${nb.length}</span></h5>${nb.map(m => `<div style="margin:3px 0"><span class="hint">${m.dir === "out" ? "→" : "←"} ${esc(REL_JA[m.rel] || m.rel)}</span> ${chip(m.id)}</div>`).join("") || '<div class="hint">—</div>'}
        <details class="sec" style="margin-top:12px"><summary>生の JSON<span class="n"></span></summary><pre class="raw">${esc(JSON.stringify({ id: n.id, type: n.type, stub: true }, null, 1))}</pre></details></div>`;
      $("#iBack").onclick = () => { if (canBack) { state.trailPos--; state.node = state.trail[state.trailPos]; render(); } };
      $("#iFwd").onclick = () => { if (canFwd) { state.trailPos++; state.node = state.trail[state.trailPos]; render(); } };
      $("#iClose").onclick = () => { state.node = null; state.inspOpen = false; render(); };
      host.parentElement.scrollTop = 0; return;
    }
    const outG = d3.groups(n._out, e => e.rel), inG = d3.groups(n._in, e => e.rel);
    const linksHtml = (groups, dir) => groups.length ? groups.map(([rel, es]) => `<div class="grp"><div class="rel">${dir === "out" ? "→" : "←"} ${esc(REL_JA[rel] || rel)} <code>${esc(rel)}</code> <span class="muted">${es.length}</span></div>${es.map(e => { const other = dir === "out" ? e.to : e.from; const rec = reciprocal(n.id, other); return chip(other, rec ? `<span title="記録層に逆向きのリンクもある（双方向）" style="color:var(--accent);font-weight:700">⇄</span>` : ""); }).join("")}</div>`).join("") : `<div class="hint">—</div>`;
    const fields = [];
    const kv = (k, v) => fields.push(`<div class="k">${esc(k)}</div><div class="v">${v}</div>`);
    if (n.definition) kv(T.kv_def, `<div class="stmt">${md(n.definition)}</div>`);
    if (n.counterpoints) kv(T.kv_cp, `<div class="stmt">${md(n.counterpoints)}</div>`);
    if (n.conventions) kv(T.kv_conv, `<div class="stmt">${md(n.conventions)}</div>`);
    if (n.convention) kv("convention", `<div class="stmt">${md(typeof n.convention === "string" ? n.convention : JSON.stringify(n.convention))}</div>`);
    if (n.direction) kv(T.kv_direction, `<code>${esc(n.direction)}</code>`);
    // g4（ORDER 0014）: 主張の適用範囲・予測・計器・判定・台帳 — 記録層に入り始めた構造化欄をそのまま見せる（無ければ出ない）
    const jsonKv = (k, v) => kv(k, `<div class="vals"><table>${flatten(v).map(([a, b]) => `<tr><td>${esc(a)}</td><td>${byId.has(b) ? chip(b) : esc(b)}</td></tr>`).join("")}</table></div>`);
    if (n.scope) jsonKv(T.kv_scope, n.scope);
    if (n.predicts) jsonKv(T.kv_predicts, n.predicts);
    if (n.measured_with) kv(T.kv_measured, (Array.isArray(n.measured_with) ? n.measured_with : [n.measured_with]).map(m => byId.has(m) ? chip(m) : `<code>${esc(String(m))}</code>`).join(" "));
    if (n.verdict) { if (typeof n.verdict === "string") kv(T.kv_verdict, `<div class="stmt">${md(n.verdict)}</div>`); else jsonKv(T.kv_verdict, n.verdict); }
    if (n.ledger) jsonKv(T.kv_ledger, n.ledger);
    if (n.pre_named_killers) kv("pre-named killers", `<div class="stmt">${Array.isArray(n.pre_named_killers) ? n.pre_named_killers.map((k, i) => `${i + 1}. ${md(k)}`).join("<br>") : md(n.pre_named_killers)}</div>`);
    if (n.derivation_hooks) kv("導出フック", `<div class="stmt">${(Array.isArray(n.derivation_hooks) ? n.derivation_hooks : [n.derivation_hooks]).map((k, i) => `${i + 1}. ${md(k)}`).join("<br>")}</div>`);
    if (n.tier) kv("tier", `<code>${esc(n.tier)}</code>`);
    if (n.entry && n.type !== "ExecutionUnit") kv("entry", `<div class="stmt"><code>${esc(n.entry)}</code></div>`);
    if (n.env && n.type !== "ExecutionUnit") kv("env", `<code>${esc(JSON.stringify(n.env))}</code>`);
    if (n.seed != null) kv("seed", `<code>${esc(JSON.stringify(n.seed))}</code>`);
    if (n.expected && n.type !== "ExecutionUnit") kv("expected", `<div class="vals"><table>${(Array.isArray(n.expected) ? n.expected : [n.expected]).map(x => `<tr><td>${esc(x.name || "")}</td><td>${esc(typeof x.value === "object" ? JSON.stringify(x.value) : x.value)}${x.tolerance ? ` <span class="muted">± ${esc(x.tolerance)}</span>` : ""}</td></tr>`).join("")}</table></div>`);
    if (n.inputs && n.type !== "ExecutionUnit") kv("inputs", (Array.isArray(n.inputs) ? n.inputs : [n.inputs]).map(x => typeof x === "string" ? `<code>${esc(x)}</code>` : `<div>${repoLink(x.ref || x.path || JSON.stringify(x))}${x.sha256 ? ` <span class="muted small">sha ${esc(x.sha256.slice(0, 10))}${x.sha_verified ? " · " + esc(x.sha_verified) : ""}</span>` : ""}</div>`).join(""));
    if (n.frozen) kv(T.kv_frozen, `<div>${repoLink(n.frozen.path || "")}<br><span class="muted small">sha256 ${esc(n.frozen.sha256 || "")}</span><br>${esc(n.frozen.frozen_at || "")} ${PUBLIC ? esc(n.frozen.pr || "") : prLink(n.frozen.pr)}</div>`);
    if (n.measures) kv("measures", (Array.isArray(n.measures) ? n.measures : [n.measures]).map(m => byId.has(m) ? chip(m) : `<code>${esc(typeof m === "string" ? m : JSON.stringify(m))}</code>`).join(" "));
    if (n.values) kv("values", `<div class="vals"><table>${flatten(n.values).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table></div>`);
    if (n.lmfdb_label) kv("LMFDB", `<code>${esc(n.lmfdb_label)}</code>`);
    if (n.sameAs) kv("sameAs", (Array.isArray(n.sameAs) ? n.sameAs : [n.sameAs]).map(s => /^https?:/.test(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>` : esc(s)).join("<br>"));
    if (n.independence) kv(T.kv_indep, `<div class="stmt">${md(typeof n.independence === "string" ? n.independence : JSON.stringify(n.independence))}</div>`);
    if (n.notebook) kv("notebook", `<code>${esc(n.notebook)}</code>`);
    // 生成器が知らない欄（schema の純加算で増えた欄）も落とさずに見せる — 別の AI が「何が書かれているか」を機械的に見られるように
    const KNOWN = new Set(["id", "type", "label", "statement", "status", "status_history", "prov", "definition", "counterpoints", "conventions", "convention", "direction", "scope", "predicts", "measured_with", "verdict", "ledger", "tier", "entry", "env", "seed", "expected", "inputs", "frozen", "measures", "values", "lmfdb_label", "sameAs", "independence", "notebook", "artifacts", "pre_named_killers", "derivation_hooks", "about", "quantities", "supported_by", "refuted_by", "registered_by", "derives_from", "supersedes", "superseded_by", "promoted_to", "related", "grounded_in", "supports", "refutes", "verifies", "taught_by", "constrains", "uses"]);
    const other = Object.keys(n).filter(k => !k.startsWith("_") && !KNOWN.has(k));
    if (other.length) kv(T.kv_other, `<div class="vals"><table>${other.flatMap(k => flatten(n[k], k)).map(([a, b]) => `<tr><td>${esc(a)}</td><td>${byId.has(b) ? chip(b) : esc(b)}</td></tr>`).join("")}</table></div>`);
    const histHtml = Array.isArray(n.status_history) && n.status_history.length ? `<h5>${T.hist_h}</h5><div class="hist">${n.status_history.map((h, i) => `<div class="hrow"><span class="badge" style="background:${statusColor(h.status)}">${esc(SJA[h.status] || h.status || "")}</span> <span class="muted small">${esc(h.date || "")}</span>${h.by ? ` <span class="small">${T.hist_by} ${esc(h.by)}</span>` : ""}${h.evidence ? ` <span class="small">${T.hist_ev} ${byId.has(h.evidence) ? chip(h.evidence) : `<code>${esc(h.evidence)}</code>`}</span>` : ""}${h.protocol ? ` ${byId.has(h.protocol) ? chip(h.protocol) : `<code>${esc(h.protocol)}</code>`}` : ""}${h.pr ? ` <span class="small">${T.hist_pr} ${PUBLIC ? esc(h.pr) : prLink(h.pr)}</span>` : ""}${h.reason ? `<div class="small muted">${md(h.reason)}</div>` : ""}${h.derived ? ` <span class="muted small">${T.hist_derived}</span>` : ""}${i < n.status_history.length - 1 ? '<span class="muted"> ↓</span>' : ""}</div>`).join("")}</div>` : "";
    const arts = (n.artifacts || []).map(a => `<div>${repoLink(a.path || "")} <span class="muted small">${esc(a.role || "")}${a.location ? " · " + esc(a.location) : ""}${a.sha256 ? " · sha256 " + esc(a.sha256.slice(0, 12)) + "…" : ""}</span>${a.sha_verified ? ` <span class="badge" style="background:${a.sha_verified === "verified" ? statusColor("established") : statusColor("provisional")}">${a.sha_verified === "verified" ? "sha 実照合済" : esc(a.sha_verified)}</span>` : ""}</div>`).join("");
    // 再実行ボックス（X）／検証単位一覧（E）
    let reexec = "";
    if (n.type === "ExecutionUnit") {
      const r = k4Of(n.id); const off = (n.env || {}).offline;
      const cmd = `${PUBLIC && PUBREPO ? `git clone ${PUBREPO}.git && cd ${META.public_repo.split("/")[1]}\n` : `cd ${META.repo.split("/")[1]}   # ${META.repo}\n`}${n.entry || ""}`;
      reexec = `<h5>${T.reexec_h}</h5><div class="reexec">
        <div class="row2"><span class="badge" style="background:${css("--muted")}">tier ${esc(n.tier || "?")}</span> ${off ? (rerunable(n) ? `<span class="badge" style="background:${statusColor("established")}">${T.reexec_off}</span>` : `<span class="badge" style="background:${statusColor("provisional")}" title="${esc((n._missing_inputs || []).join(", "))}">${T.reexec_nb}</span>`) : `<span class="badge" style="background:${statusColor("provisional")}">${T.reexec_full}</span>`} ${k4Badge(n.id)}</div>
        <div class="small muted" style="margin:6px 0 2px">${T.reexec_cmd}</div><pre class="raw cmd" id="cmdbox">${esc(cmd)}</pre><button class="iconbtn small" id="copyCmd">${T.copy}</button>${PUBLIC && BINDER && rerunable(n) ? ` <a class="iconbtn small" href="${BINDER}" target="_blank" rel="noopener" title="${T.tour_binder_t}">Binder</a> <a class="iconbtn small" href="${CODESPACES}" target="_blank" rel="noopener">Codespaces</a>` : ""}
        ${n.inputs ? `<div class="small muted" style="margin:8px 0 2px">${T.inputs_h}</div>${(Array.isArray(n.inputs) ? n.inputs : [n.inputs]).map(x => typeof x === "string" ? `<div class="inp"><code>${esc(x)}</code></div>` : `<div class="inp">${repoLink(x.ref || x.path || "")}<div class="sha">${x.sha256 ? `<code>${esc(x.sha256)}</code> <span class="muted">(${esc(x.sha_kind || "")})</span>` : `<span class="muted">${T.no_sha}</span>`}${x.sha_verified ? ` <span class="badge" style="background:${x.sha_verified === "verified" ? statusColor("established") : statusColor("provisional")}">${esc(x.sha_verified)}</span>` : ""}</div></div>`).join("")}` : ""}
        ${n.expected ? `<div class="small muted" style="margin:8px 0 2px">${T.expected_h}</div><div class="vals"><table>${(Array.isArray(n.expected) ? n.expected : [n.expected]).map(x => `<tr><td>${esc(x.name || "")}</td><td><code>${esc(typeof x.value === "object" ? JSON.stringify(x.value) : x.value)}</code>${x.tolerance ? ` <span class="muted">${T.tol} ${esc(x.tolerance)}</span>` : ""}</td></tr>`).join("")}</table></div>` : ""}
        ${r ? `<div class="small muted" style="margin:8px 0 2px">${T.k4_h}</div><div class="vals"><table><tr><td>status</td><td><b>${esc(r.status)}</b></td></tr>${r.got ? `<tr><td>got</td><td><code>${esc(r.got)}</code></td></tr><tr><td>want</td><td><code>${esc(r.want)}</code></td></tr>` : ""}${r.note ? `<tr><td>note</td><td>${esc(r.note)}</td></tr>` : ""}</table></div>` : ""}
        ${n.env ? `<div class="small muted" style="margin:8px 0 2px">${T.env_h}</div><code>${esc(JSON.stringify(n.env))}</code>` : ""}
        ${n.independence ? `<div class="small muted" style="margin:8px 0 2px">${T.indep_h}</div><div class="small">${md(typeof n.independence === "string" ? n.independence : JSON.stringify(n.independence))}</div>` : ""}
      </div>`;
    } else if (n.type === "Evidence") {
      const xs = [...new Set([...(n.grounded_in || []), ...n._in.filter(i => i.rel === "verifies").map(i => i.from)])].filter(x => byId.has(x));
      reexec = `<h5>${T.ev_units_h}</h5>${xs.length ? xs.map(x => { const X = byId.get(x); const rec = (n.grounded_in || []).includes(x) && (X.verifies || []).includes(n.id); return `<div style="margin:3px 0">${chip(x)} <span class="badge" style="background:${css("--muted")}">${esc(X.tier || "?")}</span> ${k4Badge(x)} ${rec ? `<span title="${T.bidir_t}" style="color:var(--accent);font-weight:700">${T.bidir}</span>` : ""}</div>`; }).join("") : '<div class="hint">—</div>'}`;
    }
    const statu = (prov.statu || []).map(s => PUBLIC ? `STATU ${esc(s)}` : `<a href="${REPO}/tree/main/.bus/STATU/outbox" target="_blank" rel="noopener" title="outbox を開く">STATU ${esc(s)}</a>`).join(" ");
    const prs = (prov.pr || []).map(p => prLink(p)).join(" ");
    const lineage = [...(n.supersedes ? [[T.sup_old, n.supersedes]] : []), ...(n.superseded_by ? [[T.sup_new, n.superseded_by]] : []), ...(n.promoted_to ? [[T.promoted, n.promoted_to]] : [])];
    host.innerHTML = `<div class="top"><div class="nav"><button class="iconbtn" id="iBack" ${canBack ? "" : "disabled"} title="戻る">←</button><button class="iconbtn" id="iFwd" ${canFwd ? "" : "disabled"} title="進む">→</button><span class="sp"></span>
        <button class="iconbtn" id="iGraph" title="このノードを中心にグラフ">◎ グラフ</button><button class="iconbtn" id="iLine" title="研究線ビュー">≡ 研究線</button><button class="iconbtn" id="iCopy" title="このノードへのリンクをコピー">⧉</button><button class="iconbtn" id="iClose" title="閉じる">✕</button></div>
      <div class="ident">${badgeType(n)}${badgeStatus(n)}${badgeLine(n._line)}<code>${esc(n.id)}</code><span>${esc(n._date)}</span></div><div class="title">${esc(n.label)}</div>
      <div class="trail">${state.trail.map((t, i) => `<a data-node="${t}" style="${i === state.trailPos ? "color:var(--ink);font-weight:700" : ""}">${esc(t)}</a>${i < state.trail.length - 1 ? '<span class="sep">›</span>' : ""}`).join("")}</div></div>
    <div class="bd">
      ${n.statement ? `<div class="stmt${n.statement.length > 700 ? " clamp" : ""}" id="stmt">${md(n.statement)}</div>${n.statement.length > 700 ? `<button class="iconbtn small" id="stmtMore" style="margin-top:4px">${T.more}（${fmtN(n.statement.length)} ${T.chars}）</button>` : ""}` : ""}
      ${histHtml}
      ${n.type === "ExecutionUnit" ? reexec : ""}
      ${lineage.length ? `<h5>${T.lineage_h}</h5>${lineage.map(([l, id]) => `<div><span class="hint">${l}:</span> ${(Array.isArray(id) ? id : [id]).map(chip).join("")}</div>`).join("")}` : ""}
      <h5>${T.chain_h}</h5><div class="chain" id="chain"></div>
      ${n.type !== "ExecutionUnit" ? reexec : ""}
      <h5>${T.ego_h}</h5><div class="ego" id="ego"></div>
      ${fields.length ? `<h5>${T.fields_h}</h5><div class="kv">${fields.join("")}</div>` : ""}
      <div class="links"><h5>${T.out_h} <span class="muted">${n._out.length}</span></h5>${linksHtml(outG, "out")}<h5>${T.in_h} <span class="muted">${n._in.length}</span></h5>${linksHtml(inG, "in")}</div>
      ${arts ? `<h5>${T.arts_h}</h5>${arts}` : ""}
      <h5>${T.prov_h}</h5><div class="kv"><div class="k">${T.prov_by}</div><div class="v">${esc(prov.asserted_by || "")}</div><div class="k">${T.prov_acc}</div><div class="v">${esc(prov.accepted_by || "—")}</div><div class="k">${T.prov_date}</div><div class="v">${esc(prov.date || "")}</div>${statu ? `<div class="k">STATU</div><div class="v">${statu}</div>` : ""}${prs ? `<div class="k">PR</div><div class="v">${prs}</div>` : ""}<div class="k">${T.prov_vis}</div><div class="v">${esc(prov.visibility || "")}</div><div class="k">${T.prov_rec}</div><div class="v">${PUBLIC ? `<code>${esc(n._src)}</code> <span class="muted small">${T.prov_rec_note}</span>` : `<a href="${REPO}/blob/main/${esc(n._src)}" target="_blank" rel="noopener"><code>${esc(n._src)}</code></a>`}</div>${PUBLIC ? `<div class="k">${T.prov_page}</div><div class="v"><a href="n/${esc(n.id)}.html" target="_blank" rel="noopener">n/${esc(n.id)}.html</a> · <a href="n/${esc(n.id)}.json" target="_blank" rel="noopener">JSON-LD</a>${SITE ? ` · <span class="muted small">${T.prov_cite}</span> <code class="small">${esc(SITE)}/n/${esc(n.id)}.html</code>` : ""}</div>` : ""}</div>
      <details class="sec" style="margin-top:12px"><summary>${T.raw_h}<span class="n"></span></summary><pre class="raw">${esc(JSON.stringify(stripDerived(n), null, 1))}</pre></details>
    </div>`;
    const cc = $("#copyCmd"); if (cc) cc.onclick = () => { const t = $("#cmdbox").textContent; const done = () => { cc.textContent = T.copied; setTimeout(() => { cc.textContent = T.copy; }, 1200); }; if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => window.prompt(EN ? "command:" : "コマンド:", t)); else window.prompt(EN ? "command:" : "コマンド:", t); };
    const sm = $("#stmtMore"); if (sm) sm.onclick = () => { $("#stmt").classList.toggle("clamp"); sm.textContent = $("#stmt").classList.contains("clamp") ? `${T.more}（${fmtN(n.statement.length)} ${T.chars}）` : T.less; };
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
    g.append("circle").attr("r", 6).attr("fill", d => byId.get(d.id)._stub ? "none" : typeColor(byId.get(d.id).type)).attr("stroke", d => byId.get(d.id)._stub ? typeColor(byId.get(d.id).type) : "#fff").attr("stroke-dasharray", d => byId.get(d.id)._stub ? "2,2" : null);
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
    const order = ["P", "C", "E", "X", "L"], names = T.chain_names;
    const items = order.map(k => [...cols[k]].map(id => byId.get(id)).sort((a, b) => (a._date || "").localeCompare(b._date || "")));
    if (!items.some(a => a.length)) { host.innerHTML = `<div class="hint">${T.chain_none}</div>`; return; }
    const rowsMax = Math.max(1, ...items.map(a => a.length)); const colW = Math.max(130, Math.min(170, Math.floor(((host.clientWidth || 440) - 24) / order.length))), rowH = 44, W = order.length * colW + 20, H = 30 + rowsMax * rowH;
    const svg = d3.select(host).html("").append("svg").attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    const pos = new Map();
    order.forEach((k, ci) => { svg.append("text").attr("x", 10 + ci * colW + (colW - 10) / 2).attr("y", 14).attr("text-anchor", "middle").style("font-size", "11px").style("fill", css("--muted")).text(`${names[k]} (${items[ci].length})`); items[ci].forEach((it, ri) => pos.set(it.id, { x: 10 + ci * colW, y: 26 + ri * rowH, w: colW - 10, h: rowH - 8 })); });
    const edges = [];
    for (const [id, p] of pos) { const N = byId.get(id); for (const e of N._out) if (pos.has(e.to) && e.to !== id) edges.push([pos.get(id), pos.get(e.to), e.rel]); }
    const path = d3.linkHorizontal().x(d => d[0]).y(d => d[1]);
    svg.append("g").selectAll("path").data(edges).join("path").attr("d", e => { const a = e[0], b = e[1]; const left = a.x < b.x; return path({ source: [left ? a.x + a.w : a.x, a.y + a.h / 2], target: [left ? b.x : b.x + b.w, b.y + b.h / 2] }); }).attr("fill", "none").attr("stroke", css("--line")).attr("stroke-width", 1.2).attr("stroke-dasharray", e => e[2] === "related" ? "2,3" : null);
    const g = svg.append("g").selectAll("g").data([...pos].map(([id, p]) => ({ id, p, n: byId.get(id) }))).join("g").attr("transform", d => `translate(${d.p.x},${d.p.y})`).style("cursor", "pointer").on("click", (e, d) => open(d.id)).on("mouseover", (e, d) => showTT(nodeTT(d.n), e)).on("mousemove", moveTT).on("mouseout", hideTT);
    g.append("rect").attr("width", d => d.p.w).attr("height", d => d.p.h).attr("rx", 6).attr("fill", css("--panel")).attr("stroke", d => d.id === n.id ? css("--ink") : d.n._stub ? css("--muted") : (d.n.status ? statusColor(d.n.status) : typeColor(d.n.type))).attr("stroke-width", d => d.id === n.id ? 2 : 1.2).attr("stroke-dasharray", d => d.n._stub ? "3,3" : null);
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
