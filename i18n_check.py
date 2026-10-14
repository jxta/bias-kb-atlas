#!/usr/bin/env python3
"""i18n_check.py — check the English overlay kb/i18n/en.json against kb/nodes.json (read-only; writes nothing).

  python3 i18n_check.py            # exit 0 = structurally sound (stale or lossy entries are warnings, not failures)
  python3 i18n_check.py --strict   # also fail on stale entries

What the overlay is: a presentation layer for the public Atlas. When the UI language is English, atlas.js fetches
kb/i18n/en.json and shows these English texts in place of the Japanese node texts. The Japanese record layer
(kb/nodes.json, generated from the private repository) stays authoritative and untouched; rerun.py, build_site.py,
n/<id>.json and kb/kb.jsonld never read this file.

Layout of en.json:
  { "meta": {...},
    "nodes": { "<node id>": { "<path>": "<English>", ..., "_src": { "<path>": "<fingerprint of the Japanese source>" } } },
    "lines": { "<line id>": { "label": ..., "short": ..., "_src": {...} } },     # research lines (meta.lines; also map lanes)
    "k4":    { "<X id>":    { "note": ...,  "_src": {...} } } }                    # meta.k4 notes
  <path> is a dotted path inside the node: "statement", "artifacts[0].role", "env.k4_status", ...
  fingerprint = FNV-1a 32-bit over the Unicode code points of the Japanese text + ":" + its length in code points,
  e.g. "9f2c1a7b:84". atlas.js recomputes it at load time and applies a translation only when the source text is
  unchanged — so when the record layer changes, the Japanese reappears instead of a stale translation.

Checks:
  1. JSON parses; every node id exists in kb/nodes.json (and is not a stub); every path resolves to a string
  2. every translated path has a fingerprint, and the fingerprint matches the current Japanese text (else: STALE)
  3. tokens that must survive translation — node ids, numbers, ASCII words such as file names, PR/ORDER/STATU numbers —
     appear in the English text (else: LOSSY — a warning for a human to look at)
  4. coverage: which Japanese fields of the excerpt have no translation yet (informational)
"""
import os, sys, json, re, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
JA = re.compile(r"[぀-ヿ㐀-鿿]")
PATH_TOKEN = re.compile(r"([^.\[\]]+)|\[(\d+)\]")
ID_RE = re.compile(r"\b([OQECHPXL]-[a-z0-9][a-z0-9-]*)\b")
NUM_RE = re.compile(r"[−\-+]?\d[\d,]*(?:\.\d+)?(?:e[−\-+]?\d+)?", re.I)
WORD_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_./\-]{1,}")
# ASCII words that are legitimately translated or re-cased (not a loss)
WORD_OK = {"mod", "deg", "root", "odd", "vs", "mdx", "gp", "web", "repo", "report", "spot", "full", "match", "exact", "offline",
           "re-run", "rerun", "and", "or", "the", "of", "to", "in", "on", "by", "at", "for", "with", "from", "is", "are", "no",
           "k4", "k1-b", "k1-d", "k2", "sha", "sha256", "annex", "monic", "squarefree", "idx"}


def fp(s):
    h = 0x811c9dc5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}:{len(s)}"


def resolve(obj, path):
    parts = [p[0] if p[0] else int(p[1]) for p in PATH_TOKEN.findall(path)]
    cur = obj
    for p in parts:
        if isinstance(cur, dict) and isinstance(p, str) and p in cur: cur = cur[p]
        elif isinstance(cur, list) and isinstance(p, int) and p < len(cur): cur = cur[p]
        else: return None
    return cur


def norm_num(s):
    return s.replace("−", "-").replace(",", "")


def tokens(ja):
    ids = set(ID_RE.findall(ja))
    nums = set(norm_num(m) for m in NUM_RE.findall(ja) if any(c.isdigit() for c in m))
    words = set()
    for w in WORD_RE.findall(ja):
        if ID_RE.fullmatch(w): continue
        for part in re.split(r"[/]|(?<=[A-Za-z])(?=\d)", w):  # "T-A/T-B" → two tokens; "Thm7.1" → "Thm" (the number is checked separately)
            part = part.strip(".-_")
            if len(part) >= 2 and part.lower() not in WORD_OK and not part[0].isdigit(): words.add(part)
    return ids, nums, words


def lossy(ja, en):
    ids, nums, words = tokens(ja)
    en_n = norm_num(en); en_l = en.lower()
    miss = [i for i in ids if i not in en] + [n for n in nums if n not in en_n] + [w for w in words if w.lower() not in en_l]
    return miss


def walk_ja(o, path, out):
    if isinstance(o, str):
        if JA.search(o): out.append(path)
    elif isinstance(o, dict):
        for k, v in o.items(): walk_ja(v, f"{path}.{k}" if path else k, out)
    elif isinstance(o, list):
        for i, v in enumerate(o): walk_ja(v, f"{path}[{i}]", out)


def main():
    strict = "--strict" in sys.argv
    os.chdir(ROOT)
    fails, stale, lossy_n = [], [], []
    data = json.load(open("kb/nodes.json", encoding="utf-8"))
    byid = {n["id"]: n for n in data["nodes"]}
    meta = data["meta"]
    try:
        ov = json.load(open("kb/i18n/en.json", encoding="utf-8"))
    except Exception as e:
        print("FAIL kb/i18n/en.json does not parse:", e); return 1
    n_fields = 0

    def check_entry(kind, key, obj, src):
        nonlocal n_fields
        fps = obj.get("_src")
        if not isinstance(fps, dict): fails.append(f"{kind} {key}: no _src fingerprints"); return
        for p, en in obj.items():
            if p.startswith("_"): continue
            if not isinstance(en, str) or not en.strip(): fails.append(f"{kind} {key}.{p}: translation is not a non-empty string"); continue
            if JA.search(en): fails.append(f"{kind} {key}.{p}: translation still contains Japanese"); continue
            ja = resolve(src, p)
            if not isinstance(ja, str): fails.append(f"{kind} {key}.{p}: path does not resolve to a string in the source"); continue
            n_fields += 1
            if p not in fps: fails.append(f"{kind} {key}.{p}: no fingerprint"); continue
            if fps[p] != fp(ja): stale.append(f"{kind} {key}.{p}: source changed since translation (now {fp(ja)}, was {fps[p]})"); continue
            m = lossy(ja, en)
            if m: lossy_n.append(f"{kind} {key}.{p}: not found in the English text: {m}")

    for nid, obj in (ov.get("nodes") or {}).items():
        n = byid.get(nid)
        if not n: fails.append(f"node {nid}: not in kb/nodes.json"); continue
        if n.get("_stub"): fails.append(f"node {nid}: is a private stub (must not be translated)"); continue
        check_entry("node", nid, obj, n)
    lines = {l["id"]: l for l in meta.get("lines", [])}
    for lid, obj in (ov.get("lines") or {}).items():
        if lid not in lines: fails.append(f"line {lid}: not in meta.lines"); continue
        check_entry("line", lid, obj, lines[lid])
    k4 = meta.get("k4") or {}
    for xid, obj in (ov.get("k4") or {}).items():
        if xid not in k4 or not isinstance(k4[xid], dict): fails.append(f"k4 {xid}: not in meta.k4"); continue
        check_entry("k4", xid, obj, k4[xid])

    # coverage (informational): Japanese fields of real nodes / lines / k4 without a translation
    missing = []
    for n in data["nodes"]:
        if n.get("_stub"): continue
        acc = []; walk_ja({k: v for k, v in n.items() if not k.startswith("_") and k != "prov"}, "", acc)
        have = set(k for k in (ov.get("nodes") or {}).get(n["id"], {}) if not k.startswith("_"))
        missing += [f"{n['id']}.{p}" for p in acc if p not in have]
    for l in meta.get("lines", []):
        have = set(k for k in (ov.get("lines") or {}).get(l["id"], {}) if not k.startswith("_"))
        missing += [f"@line:{l['id']}.{k}" for k in ("label", "short") if isinstance(l.get(k), str) and JA.search(l[k]) and k not in have]
    for xid, v in k4.items():
        if isinstance(v, dict) and isinstance(v.get("note"), str) and JA.search(v["note"]) and "note" not in (ov.get("k4") or {}).get(xid, {}):
            missing.append(f"@k4:{xid}.note")

    for m in fails: print("FAIL", m)
    for m in stale: print("STALE", m)
    for m in lossy_n: print("LOSSY", m)
    print(f"i18n: {len((ov.get('nodes') or {}))} nodes / {n_fields} fields translated; stale {len(stale)}; lossy {len(lossy_n)}; "
          f"untranslated Japanese fields {len(missing)}" + (": " + ", ".join(missing[:12]) + (" …" if len(missing) > 12 else "") if missing else ""))
    bad = bool(fails) or (strict and bool(stale))
    print("i18n_check:", "FAIL" if bad else "ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
