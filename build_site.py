#!/usr/bin/env python3
"""kb_site.py / build_site.py — 公開バンドルの「機械可読の入口」を kb/nodes.json から生成する（ORDER 0014 g0）。

  python3 build_site.py            # リポジトリ直下で。kb/nodes.json（と kb/context.jsonld, kb/schema.json）を読み、
                                   # n/<id>.html, n/<id>.json, n/index.html, kb/kb.jsonld, kb/backlinks.json, llms.txt, sitemap.txt を書く

private 側では knowledge/tools/kb_site.py として kb_atlas.py から呼ばれ、公開バンドルへは同じファイルが build_site.py として複製される
（公開リポジトリの CI が push ごとに実行し、派生ファイルを再生成して commit する）。入力は kb/nodes.json だけで、出力は決定的
（同じ nodes.json からは同じファイル）。すべて生成物であり手編集しない。
"""
import os, sys, json, re, html, glob, shutil, collections

TYPE_LETTER = {"Object": "O", "Quantity": "Q", "Evidence": "E", "Claim": "C", "Hypothesis": "H", "Protocol": "P",
               "ExecutionUnit": "X", "Lesson": "L"}
INVERSE = {"grounded_in": "verifies", "verifies": "grounded_in", "supported_by": "supports", "supports": "supported_by",
           "refuted_by": "refutes", "refutes": "refuted_by", "supersedes": "superseded_by", "superseded_by": "supersedes",
           "related": "related"}


def as_list(v):
    if v is None: return []
    if isinstance(v, str): return [v]
    if isinstance(v, list): return [x for x in v if isinstance(x, str)]
    return []


def default_context():
    """kb/context.jsonld が無いときの最小 context（private 側の knowledge/schema/context.jsonld と同じ語彙。W3C PROV は w3prov:）。"""
    ctx = {"lrr": "https://nii.ac.jp/ns/lrr#", "schema": "https://schema.org/", "w3prov": "http://www.w3.org/ns/prov#", "lmfdb": "https://www.lmfdb.org/",
           "id": "@id", "type": "@type", "label": "schema:name", "statement": "schema:description",
           "about": {"@id": "schema:about", "@type": "@id"}, "supported_by": {"@id": "lrr:supportedBy", "@type": "@id"},
           "refuted_by": {"@id": "lrr:refutedBy", "@type": "@id"}, "grounded_in": {"@id": "lrr:groundedIn", "@type": "@id"},
           "registered_by": {"@id": "lrr:registeredBy", "@type": "@id"}, "derives_from": {"@id": "w3prov:wasDerivedFrom", "@type": "@id"},
           "supersedes": {"@id": "lrr:supersedes", "@type": "@id"}, "verifies": {"@id": "lrr:verifies", "@type": "@id"},
           "sameAs": {"@id": "schema:sameAs", "@type": "@id"}, "lmfdb_label": "lrr:lmfdbLabel", "prov": "lrr:provenance",
           "asserted_by": "w3prov:wasAttributedTo", "date": "w3prov:generatedAtTime", "stub": "lrr:redactedNode"}
    for k, iri in [("quantities", "lrr:quantities"), ("promoted_to", "lrr:promotedTo"), ("superseded_by", "lrr:supersededBy"), ("related", "lrr:related"),
                   ("supports", "lrr:supports"), ("refutes", "lrr:refutes"), ("taught_by", "lrr:taughtBy"), ("constrains", "lrr:constrains")]:
        ctx[k] = {"@id": iri, "@type": "@id"}
    for t in TYPE_LETTER: ctx[t] = "lrr:" + t
    return ctx

def strip_derived(n):
    return {k: v for k, v in n.items() if not k.startswith("_")}



def public_backlinks(all_nodes):
    """抜粋（スタブ込み）の逆リンク表。各項目に bidir（記録層に逆向きのリンクもあるか）を付ける。"""
    byid = {n["id"]: n for n in all_nodes}
    back = {}
    for n in all_nodes:
        for e in n["_out"]:
            t = byid.get(e["to"])
            if not t: continue
            inv = INVERSE.get(e["rel"])
            bidir = bool(inv) and any(x["rel"] == inv and x["to"] == n["id"] for x in t["_out"])
            back.setdefault(e["to"], []).append({"from": n["id"], "rel": e["rel"], "bidir": bidir, "stub": bool(n.get("_stub"))})
    return {k: sorted(v, key=lambda x: (x["rel"], x["from"])) for k, v in sorted(back.items())}


def node_page(n, meta, byid, site):
    """ノード単体の静的 HTML（JS なしで読める）。同名 .json と Atlas の深いリンクを指す。"""
    e = html.escape
    T_JA = {"Object": "対象", "Quantity": "量", "Evidence": "証拠", "Claim": "主張", "Hypothesis": "仮説", "Protocol": "登録", "ExecutionUnit": "実行単位", "Lesson": "教訓"}
    REL_JA = {"about": "対象", "quantities": "量", "supported_by": "根拠", "refuted_by": "反証", "registered_by": "登録", "derives_from": "派生元", "supersedes": "置換する", "superseded_by": "置換された", "promoted_to": "昇格先", "related": "関連", "grounded_in": "接地", "supports": "支持する", "refutes": "反証する", "verifies": "検証する", "taught_by": "教えた証拠", "constrains": "制約"}
    def link(i):
        m = byid.get(i)
        if not m: return f"<code>{e(i)}</code>"
        if m.get("_stub"): return f'<span class="stub" title="記録層に存在するが公開抜粋に含まれないノード（型だけ公開）"><code>{e(i)}</code> {e(m["label"])}</span>'
        return f'<a href="{e(i)}.html"><code>{e(i)}</code></a> <span class="l">{e(str(m.get("label") or "")[:90])}</span>'
    def ref_ids(s):
        return re.sub(r"\b([OQECHPXL]-[a-z0-9][a-z0-9-]*)\b", lambda mm: f'<a href="{mm.group(1)}.html">{mm.group(1)}</a>' if mm.group(1) in byid and not byid[mm.group(1)].get("_stub") else mm.group(1), e(s))
    rows = []
    def kv(k, v): rows.append(f"<tr><th>{e(k)}</th><td>{v}</td></tr>")
    if n.get("status"): kv("状態 (status)", f"<b>{e(n['status'])}</b>")
    if n.get("statement"): kv("statement", f'<div class="stmt">{ref_ids(n["statement"])}</div>')
    if n.get("definition"): kv("definition", f'<div class="stmt">{ref_ids(n["definition"])}</div>')
    if n.get("counterpoints"): kv("counterpoints", f'<div class="stmt">{ref_ids(n["counterpoints"])}</div>')
    if n.get("tier"): kv("tier", f"<code>{e(n['tier'])}</code>")
    if n.get("entry"): kv("entry（再実行コマンド）", f"<pre>{e(n['entry'])}</pre>")
    if n.get("env"): kv("env", f"<code>{e(json.dumps(n['env'], ensure_ascii=False))}</code>")
    if n.get("inputs"):
        kv("inputs（凍結 sha256）", "".join(f"<div><code>{e(x.get('ref') or x.get('path') or '')}</code>{' — sha256 <code>' + e(x['sha256']) + '</code>' if x.get('sha256') else ''}{' · ' + e(x['sha_verified']) if x.get('sha_verified') else ''}</div>" if isinstance(x, dict) else f"<div><code>{e(str(x))}</code></div>" for x in n["inputs"]))
    if n.get("expected"):
        kv("expected", "<table class=\"in\">" + "".join(f"<tr><td>{e(str(x.get('name', '')))}</td><td><code>{e(json.dumps(x.get('value'), ensure_ascii=False) if isinstance(x.get('value'), (dict, list)) else str(x.get('value')))}</code>{' ± ' + e(str(x['tolerance'])) if x.get('tolerance') else ''}</td></tr>" for x in n["expected"] if isinstance(x, dict)) + "</table>")
    if n.get("artifacts"):
        kv("artifacts", "".join(f"<div><code>{e(a.get('path', ''))}</code> <span class=\"l\">{e(a.get('role', ''))}{' · sha256 ' + e(a['sha256'][:16]) + '…' if a.get('sha256') else ''}{' · ' + e(a['sha_verified']) if a.get('sha_verified') else ''}</span></div>" for a in n["artifacts"] if isinstance(a, dict)))
    if n.get("frozen"): kv("frozen（凍結）", f"<code>{e(json.dumps(n['frozen'], ensure_ascii=False))}</code>")
    if n.get("values"): kv("values", f"<pre>{e(json.dumps(n['values'], ensure_ascii=False, indent=1))}</pre>")
    if n.get("lmfdb_label"): kv("lmfdb_label", f"<code>{e(n['lmfdb_label'])}</code>")
    if n.get("sameAs"): kv("sameAs", " ".join(f'<a href="{e(s)}">{e(s)}</a>' if str(s).startswith("http") else e(str(s)) for s in as_list(n.get("sameAs"))))
    if n.get("notebook"): kv("notebook", f"<code>{e(n['notebook'])}</code>")
    k4 = (meta.get("k4") or {}).get(n["id"])
    if k4: kv("k4 再実行の記録", f"<b>{e(k4['status'])}</b>{' — got <code>' + e(k4['got']) + '</code> / want <code>' + e(k4['want']) + '</code>' if k4.get('got') else ''}{(' — ' + e(k4['note'])) if k4.get('note') else ''}")
    if n["type"] == "ExecutionUnit" and (n.get("env") or {}).get("offline"):
        kv("この束から再実行", "同梱データだけで再実行できる（<code>python3 rerun.py " + e(n["id"]) + "</code>）" if n.get("_bundled") else "記録層では offline だが、凍結入力が同梱されていない（大きすぎる／annex）: " + e(", ".join(n.get("_missing_inputs") or [])))
    if n["type"] in ("Claim", "Hypothesis"):
        chain = []
        for ev in as_list(n.get("supported_by")) + as_list(n.get("refuted_by")):
            E = byid.get(ev)
            if not E: continue
            xs = [x for x in as_list(E.get("grounded_in")) + [i["from"] for i in E["_in"] if i["rel"] == "verifies"] if x in byid]
            xs = list(dict.fromkeys(xs))
            xh = " · ".join(f"{link(x)} <span class=\"l\">tier {e(str((byid[x].get('tier') or '?')))}</span>" + (f" <b>{e(((meta.get('k4') or {}).get(x) or {}).get('status', ''))}</b>" if (meta.get("k4") or {}).get(x) else "") for x in xs) or '<span class="l">実行単位なし</span>'
            chain.append(f"<div>{'反証' if ev in as_list(n.get('refuted_by')) else '根拠'} {link(ev)}<div style=\"margin-left:18px\">→ 実行単位: {xh}</div></div>")
        if chain: kv("根拠の鎖（主張 → 証拠 → 実行単位 → 再実行）", "".join(chain))
    prov = n.get("prov") or {}
    kv("来歴 (prov)", f"主張者 {e(prov.get('asserted_by', ''))} · 受入 {e(prov.get('accepted_by') or '—')} · 日付 {e(prov.get('date', ''))}{' · STATU ' + e(' '.join(map(str, prov.get('statu', [])))) if prov.get('statu') else ''}{' · PR ' + e(' '.join(map(str, prov.get('pr', [])))) if prov.get('pr') else ''} · 可視性 {e(prov.get('visibility', ''))}")
    kv("記録", f"<code>{e(n['_src'])}</code>（非公開リポジトリ内。抜粋は <a href=\"../kb/nodes.json\">kb/nodes.json</a> と <a href=\"{e(n['id'])}.json\">{e(n['id'])}.json</a>）")
    BI = ' <span class="bi" title="記録層に逆向きのリンクもある（双方向）">⇄</span>'
    def is_bidir(r, i):
        return any(x["rel"] == INVERSE.get(r) and x.get("to") == n["id"] for x in ((byid.get(i) or {}).get("_out") or []))
    def grp(edges, key, arrow):
        by = collections.OrderedDict()
        for ed in edges: by.setdefault(ed["rel"], []).append(ed[key])
        parts = []
        for r, ids in by.items():
            head = f'<div class="grp"><div class="rel">{arrow} {e(REL_JA.get(r, r))} <code>{e(r)}</code> <span class="l">{len(ids)}</span></div>'
            body = "".join("<div>" + link(i) + (BI if is_bidir(r, i) else "") + "</div>" for i in ids)
            parts.append(head + body + "</div>")
        return "".join(parts) or '<div class="l">—</div>'
    ld = {"@context": f"{site}/kb/context.jsonld" if site else "../kb/context.jsonld"}
    ld.update(strip_derived(n))
    ldtxt = json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")
    atlas = f"../#v={'grounding' if n['type'] in ('Claim', 'Evidence', 'ExecutionUnit', 'Hypothesis') else 'guide'}&node={n['id']}"
    stubs_n = sum(1 for ed in n["_out"] + n["_in"] if (byid.get(ed.get("to") or ed.get("from")) or {}).get("_stub"))
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(n['id'])} — {e(str(n.get('label') or '')[:80])} · bias-kb</title>
<meta name="description" content="{e(T_JA.get(n['type'], n['type']))} {e(n['id'])}: {e(str(n.get('label') or '')[:150])}">
<link rel="alternate" type="application/ld+json" href="{e(n['id'])}.json"><link rel="canonical" href="{e(site + '/n/' + n['id'] + '.html' if site else n['id'] + '.html')}">
<script type="application/ld+json">{ldtxt}</script>
<style>body{{font:14px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Hiragino Sans","Noto Sans JP",sans-serif;color:#1f2937;margin:0;background:#fafafa}}main{{max-width:900px;margin:0 auto;padding:20px 18px 48px}}
h1{{font-size:20px;margin:6px 0 4px}}.badge{{display:inline-block;padding:1px 8px;border-radius:10px;background:#e5e7eb;font-size:12px;margin-right:6px}}.badge.t{{background:#dbeafe}}
table.kv{{border-collapse:collapse;width:100%;background:#fff;border:1px solid #e5e7eb}}table.kv th{{text-align:left;vertical-align:top;width:170px;padding:6px 8px;background:#f3f4f6;font-weight:600;border-bottom:1px solid #e5e7eb}}table.kv td{{padding:6px 8px;border-bottom:1px solid #e5e7eb;word-break:break-word}}
table.in td{{padding:1px 8px 1px 0}}pre{{white-space:pre-wrap;word-break:break-all;background:#f3f4f6;padding:8px;border-radius:6px;font-size:12.5px;margin:0}}code{{font-size:12.5px}}.l{{color:#6b7280;font-size:12px}}.stmt{{white-space:pre-wrap}}
.links{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}}@media(max-width:700px){{.links{{grid-template-columns:1fr}}}}.grp{{margin:6px 0}}.rel{{font-weight:600;font-size:13px}}.stub{{color:#6b7280;border:1px dashed #9ca3af;border-radius:6px;padding:0 4px}}.bi{{color:#2563eb;font-weight:700}}
nav a{{margin-right:14px}}footer{{margin-top:28px;color:#6b7280;font-size:12px}}</style></head>
<body><main>
<nav><a href="../">Atlas（トップ）</a><a href="{e(atlas)}">このノードを Atlas で開く</a><a href="{e(n['id'])}.json">JSON（JSON-LD）</a><a href="index.html">ノード一覧</a></nav>
<div style="margin-top:12px"><span class="badge t">{e(TYPE_LETTER.get(n['type'], '?'))} {e(T_JA.get(n['type'], n['type']))}</span>{f'<span class="badge">{e(n["status"])}</span>' if n.get('status') else ''}<code>{e(n['id'])}</code> <span class="l">{e(n.get('_date', ''))}</span></div>
<h1>{e(str(n.get('label') or ''))}</h1>
<table class="kv">{''.join(rows)}</table>
<div class="links"><div><h3>出るリンク <span class="l">{len(n['_out'])}</span></h3>{grp(n['_out'], 'to', '→')}</div><div><h3>入るリンク（逆リンク） <span class="l">{len(n['_in'])}</span></h3>{grp(n['_in'], 'from', '←')}</div></div>
{f'<p class="l">点線のノードは記録層に存在するが公開抜粋に含まれない隣接ノード（{stubs_n} 件、型だけを公開）。「根拠がない」のではなく「非公開」であることを示すために残している。</p>' if stubs_n else ''}
<footer>bias-kb 公開抜粋 — 記録層 {e(str(meta.get('stats', {}).get('full_n', '')))} ノード（{e(meta.get('source_ref', ''))}）から規則で抜粋、生成 {e(meta.get('generated_at', ''))}。このページは <code>kb_atlas.py</code> が生成した静的ファイルで、手編集しない。機械可読: <a href="../kb/kb.jsonld">kb/kb.jsonld</a> · <a href="../kb/backlinks.json">kb/backlinks.json</a> · <a href="../kb/schema.json">kb/schema.json</a> · <a href="../llms.txt">llms.txt</a></footer>
</main></body></html>"""


def node_json(n, meta, byid, site):
    d = {"@context": f"{site}/kb/context.jsonld" if site else "../kb/context.jsonld"}
    d.update(strip_derived(n))
    lk = lambda ed, key: {"rel": ed["rel"], key: ed[key], "bidir": any(x["rel"] == INVERSE.get(ed["rel"]) and (x.get("to") == n["id"] or x.get("from") == n["id"]) for x in ((byid.get(ed[key]) or {}).get("_out") or [])), "stub": bool((byid.get(ed[key]) or {}).get("_stub"))}
    ground = None
    if n["type"] in ("Claim", "Hypothesis"):
        evs = [i for i in as_list(n.get("supported_by")) + as_list(n.get("refuted_by")) if i in byid]
        xs = []
        for ev in evs:
            E = byid[ev]
            for x in as_list(E.get("grounded_in")) + [i["from"] for i in E["_in"] if i["rel"] == "verifies"]:
                if x in byid and x not in [q["id"] for q in xs]:
                    X = byid[x]; xs.append({"id": x, "tier": X.get("tier"), "offline": bool((X.get("env") or {}).get("offline")), "bundled": bool(X.get("_bundled")), "stub": bool(X.get("_stub")), "rerun": (meta.get("k4") or {}).get(x)})
        ground = {"evidence": evs, "execution_units": xs, "protocols": [i for i in as_list(n.get("registered_by")) if i in byid]}
    d["_atlas"] = {"url": (site + "/" if site else "") + f"#v=grounding&node={n['id']}", "page": (site + "/n/" if site else "") + f"{n['id']}.html",
                   "line": n.get("_line"), "date": n.get("_date"), "links_out": [lk(ed, "to") for ed in n["_out"]], "links_in": [lk(ed, "from") for ed in n["_in"]],
                   "grounding": ground, "rerun": (meta.get("k4") or {}).get(n["id"]) if n["type"] == "ExecutionUnit" else None,
                   "record_layer": {"nodes": meta.get("stats", {}).get("full_n"), "source_ref": meta.get("source_ref"), "generated_at": meta.get("generated_at")}}
    return d


def llms_txt(meta, graph, stubs, site):
    S = site or "."
    types = collections.Counter(n["type"] for n in graph)
    xoff = [n["id"] for n in graph if n["type"] == "ExecutionUnit" and (n.get("env") or {}).get("offline") and n.get("_bundled")]
    xnb = [n["id"] for n in graph if n["type"] == "ExecutionUnit" and (n.get("env") or {}).get("offline") and not n.get("_bundled")]
    claims = [n for n in graph if n["type"] == "Claim"]
    return f"""# bias-kb Atlas — public excerpt (claims grounded in re-executable evidence)

> A machine-readable excerpt of a research knowledge base (bias-kb) in which every claim is linked, in both directions, to the evidence and the re-executable computation that produced it. {len(graph)} nodes selected by rule from a record layer of {meta.get('stats', {}).get('full_n', '?')} nodes (private repository `{meta.get('repo', '')}`, ref {meta.get('source_ref', '')}); generated {meta.get('generated_at', '')}. Nothing here is hand-picked; the selection rule and the generator live in `knowledge/tools/kb_atlas.py`.

## Start here

- Site (interactive Atlas, hash routing `#v=<view>&node=<id>`): {S}/
- One node, no JavaScript: {S}/n/<id>.html — machine-readable twin: {S}/n/<id>.json (JSON-LD, `@context` = {S}/kb/context.jsonld)
- Whole excerpt as JSON-LD: {S}/kb/kb.jsonld (context embedded; `@graph` = raw record-layer nodes + redacted stubs)
- Whole excerpt with derived fields (`_line`, `_in`, `_out`, `_deg`, `_stub`): {S}/kb/nodes.json (what the Atlas renders)
- Backlinks with `bidir` flags (is the inverse link also written in the record layer?): {S}/kb/backlinks.json
- Node schema (JSON Schema 2020-12): {S}/kb/schema.json · JSON-LD context: {S}/kb/context.jsonld
- Re-execution results from CI (latest run, written by `.github/workflows/rerun.yml`): {S}/kb/rerun-latest.json
- Node index: {S}/n/index.html · sitemap: {S}/sitemap.txt

## How to walk the graph

Node types (letter = id prefix): O Object, Q Quantity, E Evidence, C Claim, H Hypothesis, P Protocol (pre-registration, frozen before the run), X ExecutionUnit (code + data sha256 + env + provenance), L Lesson.
Link fields: `about` `quantities` `supported_by` `refuted_by` `registered_by` `derives_from` `supersedes` `superseded_by` `promoted_to` `related` `grounded_in` `supports` `refutes` `verifies` `taught_by` `constrains`.
The grounding chain: C.supported_by → E.grounded_in → X (with X.verifies → E written explicitly, so the pair is bidirectional in the record layer). Claims that were refuted keep `status: rejected` and point to the counter-evidence via `refuted_by`; nothing is deleted.
Redacted neighbours: ids of the form `<T>-~<10 hex>` (e.g. `E-~1a2b3c4d5e`, `"stub": true`) are nodes that exist in the record layer but are not in this excerpt; only the type is public. They distinguish "evidence exists but is private" from "no evidence". The hash is sha256 of the real id (first 10 hex), so the holder of the record layer can match them.
Provenance: `prov.asserted_by` (who wrote the node), `prov.accepted_by` (who reviewed), `prov.date`, `prov.pr`, `prov.statu`, `prov.visibility`.

## Re-execute (offline units bundled here: {len(xoff)})

    git clone https://github.com/{meta.get('public_repo', 'jxta/bias-kb-atlas')}.git && cd {(meta.get('public_repo') or 'jxta/bias-kb-atlas').split('/')[1]}
    pip install -r requirements.txt && python3 rerun.py          # checks input sha256, runs each `entry`, compares with `expected`
    python3 rerun.py X-census-d17-spot                             # one unit

Units: {', '.join(xoff)}.{(' Declared offline but not re-executable from this bundle because a frozen input is too large to ship or is annexed (rerun.py reports them as NOT-BUNDLED, not as failures): ' + ', '.join(xnb) + '.') if xnb else ''} Full-tier units (large runs on the mdx supercomputer) are not bundled; their records, sha256 and registration bands are in the node JSON, and their k4 re-run status is `PENDING` = not re-executable from this bundle (private, not yet re-run here).

## Counts

{', '.join(f'{t} {c}' for t, c in sorted(types.items()))}; claims {len(claims)} (status: {', '.join(f'{k} {v}' for k, v in sorted(collections.Counter(c.get('status') for c in claims).items()))}); redacted stubs {len(stubs)}.

## Optional

- Human guide (Japanese) with the figure of the mechanism: {S}/#v=guide · README: https://github.com/{meta.get('public_repo', 'jxta/bias-kb-atlas')}#readme
- Interpretation rule for `k4` results: PASS = re-executed and matched the recorded expected value; PENDING = not re-executed in this environment; MISMATCH/ERR = please open an issue.
"""



def build_site(outdir, graph, stubs, meta, site):
    """公開バンドルの機械可読の入口一式（ORDER 0014 g0）: kb/kb.jsonld・kb/context.jsonld・kb/schema.json・kb/backlinks.json、
    n/<id>.html|json、n/index.html、llms.txt、sitemap.txt。すべて生成物（手編集禁止）。"""
    kbdir = os.path.join(outdir, "kb"); ndir = os.path.join(outdir, "n")
    os.makedirs(kbdir, exist_ok=True); os.makedirs(ndir, exist_ok=True)
    cp = os.path.join(kbdir, "context.jsonld")
    try: ctx = json.load(open(cp, encoding="utf-8"))["@context"]
    except Exception: ctx = default_context()
    if site: ctx = dict(ctx, **{"@base": site + "/n/"})  # ノード ID を解決可能な IRI にする（n/<id> → 単体ページ）
    json.dump({"@context": ctx}, open(cp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ld_graph = [strip_derived(n) for n in graph] + [{"id": s["id"], "type": s["type"], "label": s["label"], "stub": True} for s in stubs]
    json.dump({"@context": ctx, "@graph": ld_graph}, open(os.path.join(kbdir, "kb.jsonld"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    allnodes = graph + stubs
    byid = {n["id"]: n for n in allnodes}
    json.dump({"generated_at": meta["generated_at"], "source_ref": meta.get("source_ref", ""), "inverse": INVERSE,
               "note": "target id -> incoming links. bidir = the inverse link is also written in the record layer; stub = the source is a redacted (private) node.",
               "backlinks": public_backlinks(allnodes)}, open(os.path.join(kbdir, "backlinks.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # 古い n/ を掃除（削除されたノードのページを残さない）
    for f in glob.glob(os.path.join(ndir, "*.html")) + glob.glob(os.path.join(ndir, "*.json")):
        os.remove(f)
    for n in graph:
        open(os.path.join(ndir, n["id"] + ".html"), "w", encoding="utf-8").write(node_page(n, meta, byid, site))
        json.dump(node_json(n, meta, byid, site), open(os.path.join(ndir, n["id"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    e = html.escape
    T_JA = {"Object": "対象", "Quantity": "量", "Evidence": "証拠", "Claim": "主張", "Hypothesis": "仮説", "Protocol": "登録", "ExecutionUnit": "実行単位", "Lesson": "教訓"}
    groups = collections.OrderedDict((t, [n for n in graph if n["type"] == t]) for t in TYPE_LETTER)
    idx = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ノード一覧 · bias-kb 公開抜粋</title>
<style>body{{font:14px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Hiragino Sans","Noto Sans JP",sans-serif;color:#1f2937;margin:0;background:#fafafa}}main{{max-width:900px;margin:0 auto;padding:20px 18px 48px}}h2{{font-size:16px;margin:18px 0 6px}}li{{margin:2px 0}}.l{{color:#6b7280;font-size:12px}}code{{font-size:12.5px}}nav a{{margin-right:14px}}</style></head>
<body><main><nav><a href="../">Atlas（トップ）</a><a href="../kb/kb.jsonld">kb/kb.jsonld</a><a href="../kb/nodes.json">kb/nodes.json</a><a href="../llms.txt">llms.txt</a></nav>
<h1 style="font-size:20px">ノード一覧 — 公開抜粋 {len(graph)} ノード <span class="l">＋ 非公開スタブ {len(stubs)}</span></h1>
<p class="l">記録層 {e(str(meta.get('stats', {}).get('full_n', '')))} ノード（{e(meta.get('source_ref', ''))}）から規則で抜粋。生成 {e(meta.get('generated_at', ''))}。各ページは JS なしで読め、同名の <code>.json</code>（JSON-LD）を持つ。</p>
{''.join(f'<h2>{e(TYPE_LETTER[t])} {e(T_JA[t])}（{e(t)}） <span class="l">{len(ns)}</span></h2><ul>' + ''.join(f'<li><a href="{e(n["id"])}.html"><code>{e(n["id"])}</code></a> {e(str(n.get("label") or "")[:100])}{" <span class=l>" + e(n["status"]) + "</span>" if n.get("status") else ""}</li>' for n in ns) + '</ul>' for t, ns in groups.items() if ns)}
</main></body></html>"""
    open(os.path.join(ndir, "index.html"), "w", encoding="utf-8").write(idx)
    open(os.path.join(outdir, "llms.txt"), "w", encoding="utf-8").write(llms_txt(meta, graph, stubs, site))
    base = (site + "/") if site else ""
    open(os.path.join(outdir, "sitemap.txt"), "w", encoding="utf-8").write("\n".join([base, base + "n/index.html", base + "llms.txt", base + "kb/kb.jsonld"] + [f"{base}n/{n['id']}.html" for n in graph]) + "\n")
    print(f"build_site: n/ ({len(graph)} pages + index), kb/kb.jsonld, kb/context.jsonld, kb/backlinks.json, llms.txt, sitemap.txt; stubs={len(stubs)}")



def main(argv):
    outdir = argv[0] if argv else os.getcwd()
    p = os.path.join(outdir, "kb", "nodes.json")
    data = json.load(open(p, encoding="utf-8"))
    meta = data["meta"]; nodes = data["nodes"]
    graph = [n for n in nodes if not n.get("_stub")]; stubs = [n for n in nodes if n.get("_stub")]
    build_site(outdir, graph, stubs, meta, (meta.get("site_url") or "").rstrip("/"))


if __name__ == "__main__":
    main(sys.argv[1:])
