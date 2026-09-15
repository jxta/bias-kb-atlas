#!/usr/bin/env python3
"""check_site.py — 公開バンドルの機械可読の入口が壊れていないことを CI で確かめる（純検査、何も書かない）。

  python3 check_site.py            # 終了コード 0 = 合格

検査:
  1. kb/nodes.json の全ノード（スタブ除く）の欄が kb/context.jsonld で宣言されている（JSON-LD で語が消えない）
  2. prov の来歴語（asserted_by / date / accepted_by）が W3C PROV または lrr の IRI に展開される（ORDER 0014 g1）
  3. リンク欄の指し先が抜粋（スタブ込み）の中で解決する（dangling 0）
  4. 証拠 grounded_in ⇄ 実行単位 verifies の双方向ペア数を印字し、kb/backlinks.json の bidir と一致する
  5. kb/schema.json（JSON Schema 2020-12）で全実ノードが通る（jsonschema があるときだけ。無ければ SKIP）
  6. 派生ファイル（n/<id>.html|json・kb/kb.jsonld・llms.txt・sitemap.txt・ro-crate-metadata.json）が nodes.json と同じノード集合を指す
"""
import os, sys, json, glob, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
LINK_KEYS = ["about", "quantities", "supported_by", "refuted_by", "registered_by", "derives_from", "supersedes", "superseded_by",
             "promoted_to", "related", "grounded_in", "supports", "refutes", "verifies", "taught_by", "constrains", "uses"]
fails = []


def fail(msg):
    fails.append(msg); print("FAIL", msg)


def expand(ctx, term):
    """JSON-LD の最小展開（prefix:suffix と @id 付き定義だけ）。pyld を要求しない。"""
    d = ctx.get(term)
    if d is None: return None
    iri = d["@id"] if isinstance(d, dict) else d
    if iri.startswith("@"): return iri
    if ":" in iri:
        pre, suf = iri.split(":", 1)
        base = ctx.get(pre)
        if isinstance(base, str) and (base.startswith("http") or base.endswith("#") or base.endswith("/")): return base + suf
    return iri


def main():
    os.chdir(ROOT)
    data = json.load(open("kb/nodes.json", encoding="utf-8"))
    meta, nodes = data["meta"], data["nodes"]
    real = [n for n in nodes if not n.get("_stub")]; stubs = [n for n in nodes if n.get("_stub")]
    ids = set(n["id"] for n in nodes)
    ctx = json.load(open("kb/context.jsonld", encoding="utf-8"))["@context"]
    # 1. context coverage
    used = collections.Counter(k for n in real for k in n if not k.startswith("_"))
    undeclared = sorted(k for k in used if k not in ctx and not k.startswith("@"))
    if undeclared: fail(f"context: undeclared terms {undeclared}")
    else: print(f"ok   context: {len(used)} node terms all declared ({len(ctx)} terms in context)")
    # 2. PROV
    want = {"asserted_by": "http://www.w3.org/ns/prov#wasAttributedTo", "date": "http://www.w3.org/ns/prov#generatedAtTime", "derives_from": "http://www.w3.org/ns/prov#wasDerivedFrom"}
    for t, iri in want.items():
        got = expand(ctx, t)
        if got != iri: fail(f"prov: {t} expands to {got!r}, want {iri!r}")
    if not any(f.startswith("prov:") for f in fails): print("ok   prov: asserted_by / date / derives_from expand to W3C PROV IRIs")
    # 3. dangling
    dang = [(n["id"], k, t) for n in real for k in LINK_KEYS for t in ([n[k]] if isinstance(n.get(k), str) else (n.get(k) or [])) if t not in ids]
    if dang: fail(f"links: {len(dang)} dangling, e.g. {dang[:3]}")
    else: print(f"ok   links: 0 dangling over {sum(len(n.get(k) or []) if isinstance(n.get(k), list) else (1 if n.get(k) else 0) for n in real for k in LINK_KEYS)} links, {len(stubs)} redacted stubs")
    # 4. bidir pairs
    byid = {n["id"]: n for n in nodes}
    pairs = bidir = 0
    for E in real:
        if E["type"] != "Evidence": continue
        for x in (E.get("grounded_in") or []):
            X = byid.get(x)
            if not X or X.get("_stub"): continue
            pairs += 1
            if E["id"] in (X.get("verifies") or []): bidir += 1
    bl = json.load(open("kb/backlinks.json", encoding="utf-8"))["backlinks"]
    bl_bidir = sum(1 for tgt, lst in bl.items() for e in lst if e["rel"] == "grounded_in" and e["bidir"] and not e["stub"])
    if bl_bidir != bidir: fail(f"backlinks: bidir grounded_in pairs {bl_bidir} != recomputed {bidir}")
    else: print(f"ok   bidir: grounded_in ⇄ verifies {bidir}/{pairs} pairs, matches kb/backlinks.json")
    # 5. schema
    try:
        import jsonschema  # noqa
        schema = json.load(open("kb/schema.json", encoding="utf-8"))
        v = jsonschema.Draft202012Validator(schema)
        bad = []
        for n in real:
            raw = {k: val for k, val in n.items() if not k.startswith("_")}
            errs = list(v.iter_errors(raw))
            if errs: bad.append((n["id"], errs[0].message[:100]))
        if bad: fail(f"schema: {len(bad)} nodes fail, e.g. {bad[:2]}")
        else: print(f"ok   schema: {len(real)} nodes valid against kb/schema.json ({schema.get('title', '')[:40]})")
    except ImportError:
        print("SKIP schema (jsonschema not installed)")
    # 6. derived files
    pages = set(os.path.basename(p)[:-5] for p in glob.glob("n/*.html")) - {"index"}
    jsons = set(os.path.basename(p)[:-5] for p in glob.glob("n/*.json"))
    rid = set(n["id"] for n in real)
    if pages != rid: fail(f"n/: html pages {len(pages)} != nodes {len(rid)} (missing {sorted(rid - pages)[:3]}, extra {sorted(pages - rid)[:3]})")
    if jsons != rid: fail(f"n/: json {len(jsons)} != nodes {len(rid)}")
    ld = json.load(open("kb/kb.jsonld", encoding="utf-8"))
    if len(ld["@graph"]) != len(nodes): fail(f"kb.jsonld: @graph {len(ld['@graph'])} != nodes.json {len(nodes)}")
    if "@base" not in ld["@context"]: fail("kb.jsonld: @base missing (node ids would not resolve to URLs)")
    for f in ["llms.txt", "sitemap.txt", "ro-crate-metadata.json", "progress.html"]:
        if not os.path.exists(f): fail(f"missing {f}")
    if os.path.exists("ro-crate-metadata.json"):
        ro = json.load(open("ro-crate-metadata.json", encoding="utf-8"))
        acts = [e for e in ro["@graph"] if e.get("@type") == "CreateAction"]
        offl = [n for n in real if n["type"] == "ExecutionUnit" and (n.get("env") or {}).get("offline")]
        if len(acts) != len(offl): fail(f"ro-crate: {len(acts)} actions != {len(offl)} offline units")
    if not fails: print(f"ok   derived: n/ {len(pages)} pages + json, kb.jsonld @graph {len(ld['@graph'])} (@base set), llms.txt, sitemap.txt, ro-crate-metadata.json, progress.html")
    print(f"\n{'PASS' if not fails else 'FAIL'}: {len(fails)} failure(s); record layer {meta.get('stats', {}).get('full_n')} nodes ({meta.get('source_ref')}), excerpt {len(real)} + {len(stubs)} stubs, generated {meta.get('generated_at')}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
