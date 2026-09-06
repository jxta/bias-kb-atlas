#!/usr/bin/env python3
"""rerun.py — 公開抜粋 KB（kb/nodes.json）の offline 実行単位（ExecutionUnit）を再実行し、記録された期待値と照合する。

  python3 rerun.py            # 全 offline 単位を再実行して表を出す（不一致があれば終了コード 1）
  python3 rerun.py X-census-d17-spot   # 1 単位だけ
  python3 rerun.py --json out.json     # 結果を JSON にも書く（CI は kb/rerun-latest.json に書いて commit する）

手順（各単位）:
  0. 凍結入力（inputs）が同梱されているか。無い単位は NOT-BUNDLED（大きすぎる／annex にある）— 失敗ではなく集計から外す
  1. inputs に記録された sha256 と、同梱ファイルの sha256 を照合（凍結入力の完全性）
  2. entry コマンドをリポジトリ直下で実行し、標準出力を expected[0].value と比較
     （knowledge/tools/kb_k4.py と同じ規則: 完全一致、または一方が他方を含む）
依存: Python 3.9+、sympy（verify_*.py のみ）。ネットワーク不要。
"""
import json, os, sys, hashlib, subprocess, time, platform, re

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def git_head():
    sha = os.environ.get("GITHUB_SHA")
    if sha: return sha
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, timeout=10, cwd=ROOT).stdout.strip()
    except Exception:  # noqa
        return ""

def main(argv):
    out_json = None
    if "--json" in argv:
        i = argv.index("--json"); out_json = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    only = set(a for a in argv if a.startswith("X-"))
    data = json.load(open(os.path.join(ROOT, "kb", "nodes.json"), encoding="utf-8"))
    units = [n for n in data["nodes"] if n.get("type") == "ExecutionUnit" and (n.get("env") or {}).get("offline") and not n.get("_stub")]
    if only: units = [u for u in units if u["id"] in only]
    results = []
    for u in units:
        rec = {"id": u["id"], "tier": u.get("tier"), "entry": u.get("entry"), "inputs": [], "status": "", "got": "", "want": ""}
        want = ""
        if u.get("expected"):
            v = u["expected"][0].get("value"); want = json.dumps(v) if isinstance(v, (list, dict)) else str(v)
        rec["want"] = want
        # 0./1. input presence and integrity
        ok_inputs = True; missing = []
        for inp in u.get("inputs") or []:
            ref = inp.get("ref") if isinstance(inp, dict) else str(inp)
            if not ref: continue
            rel = re.sub(r"^annex:\s*", "", str(ref))
            item = {"ref": rel, "recorded": (inp.get("sha256") if isinstance(inp, dict) else None), "actual": None, "ok": None}
            if os.path.exists(rel):
                item["actual"] = sha256(rel)
                item["ok"] = (item["recorded"] is None) or (item["actual"] == item["recorded"])
            else:
                item["ok"] = False; missing.append(rel)
            ok_inputs &= bool(item["ok"])
            rec["inputs"].append(item)
        if missing or u.get("_bundled") is False:
            rec["status"] = "NOT-BUNDLED"; rec["missing"] = missing or u.get("_missing_inputs") or []
            rec["seconds"] = 0.0; results.append(rec); continue
        # 2. run
        t0 = time.time()
        try:
            p = subprocess.run(u["entry"], shell=True, capture_output=True, text=True, timeout=300, cwd=ROOT)
            got = p.stdout.strip(); rec["got"] = got; rec["stderr"] = p.stderr.strip()[-400:]
            match = got != "" and (want == got or (want and (want in got or got in want)))
            rec["status"] = "PASS" if (match and ok_inputs) else ("INPUT-MISMATCH" if not ok_inputs else ("ERR" if p.stderr.strip() and not got else "MISMATCH"))
        except Exception as e:  # noqa
            rec["status"] = "ERR"; rec["got"] = str(e)[:200]
        rec["seconds"] = round(time.time() - t0, 2)
        results.append(rec)
    # report
    w = max([len(r["id"]) for r in results] + [10])
    print(f"{'unit':<{w}}  {'tier':<6} {'status':<15} got / want")
    for r in results:
        if r["status"] == "NOT-BUNDLED":
            print(f"{r['id']:<{w}}  {str(r['tier']):<6} {r['status']:<15} (frozen input not bundled: {', '.join(r.get('missing') or [])})")
            continue
        print(f"{r['id']:<{w}}  {str(r['tier']):<6} {r['status']:<15} {r['got'][:48]} / {r['want'][:48]}")
        for it in r["inputs"]:
            print(f"{'':<{w}}  input {it['ref']}  sha256 {('ok' if it['recorded'] else 'present (no recorded sha)') if it['ok'] else 'MISMATCH'}"
                  + (f" ({it['actual'][:12]}… vs recorded {it['recorded'][:12]}…)" if it['recorded'] and it['actual'] and not it['ok'] else ""))
    ran = [r for r in results if r["status"] != "NOT-BUNDLED"]
    npass = sum(1 for r in ran if r["status"] == "PASS"); nnb = len(results) - len(ran)
    print(f"\n{npass}/{len(ran)} PASS" + (f" ({nnb} not bundled)" if nnb else ""))
    if out_json:
        summary = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "commit": git_head(),
                   "python": platform.python_version(), "platform": platform.platform(),
                   "kb_generated_at": (data.get("meta") or {}).get("generated_at", ""), "kb_source_ref": (data.get("meta") or {}).get("source_ref", ""),
                   "n_pass": npass, "n_run": len(ran), "n_not_bundled": nnb,
                   "results": [{k: v for k, v in r.items() if k not in ("stderr",)} for r in results]}
        os.makedirs(os.path.dirname(os.path.abspath(out_json)), exist_ok=True)
        json.dump(summary, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 0 if npass == len(ran) and ran else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
