#!/usr/bin/env python3
"""rerun.py — 公開抜粋 KB（kb/nodes.json）の offline 実行単位（ExecutionUnit）を再実行し、記録された期待値と照合する。

  python3 rerun.py            # 全 offline 単位を再実行して表を出す（不一致があれば終了コード 1）
  python3 rerun.py X-census-d17-spot   # 1 単位だけ
  python3 rerun.py --json out.json     # 結果を JSON にも書く

手順（各単位）:
  1. inputs に記録された sha256 と、同梱ファイルの sha256 を照合（凍結入力の完全性）
  2. entry コマンドをリポジトリ直下で実行し、標準出力を expected[0].value と比較
     （knowledge/tools/kb_k4.py と同じ規則: 完全一致、または一方が他方を含む）
依存: Python 3.9+、sympy（verify_*.py のみ）。ネットワーク不要。
"""
import json, os, sys, hashlib, subprocess, time

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def main(argv):
    out_json = None
    if "--json" in argv:
        i = argv.index("--json"); out_json = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    only = set(a for a in argv if a.startswith("X-"))
    data = json.load(open(os.path.join(ROOT, "kb", "nodes.json"), encoding="utf-8"))
    units = [n for n in data["nodes"] if n.get("type") == "ExecutionUnit" and (n.get("env") or {}).get("offline")]
    if only: units = [u for u in units if u["id"] in only]
    results = []
    for u in units:
        rec = {"id": u["id"], "tier": u.get("tier"), "entry": u.get("entry"), "inputs": [], "status": "", "got": "", "want": ""}
        # 1. input integrity
        ok_inputs = True
        for inp in u.get("inputs") or []:
            ref = inp.get("ref") if isinstance(inp, dict) else str(inp)
            if not ref or ref.startswith("annex"): continue
            item = {"ref": ref, "recorded": (inp.get("sha256") if isinstance(inp, dict) else None), "actual": None, "ok": None}
            if os.path.exists(ref):
                item["actual"] = sha256(ref)
                item["ok"] = (item["recorded"] is None) or (item["actual"] == item["recorded"])
            else:
                item["ok"] = False
            ok_inputs &= bool(item["ok"])
            rec["inputs"].append(item)
        # 2. run
        want = ""
        if u.get("expected"):
            v = u["expected"][0].get("value"); want = json.dumps(v) if isinstance(v, (list, dict)) else str(v)
        rec["want"] = want
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
        print(f"{r['id']:<{w}}  {str(r['tier']):<6} {r['status']:<15} {r['got'][:48]} / {r['want'][:48]}")
        for it in r["inputs"]:
            print(f"{'':<{w}}  input {it['ref']}  sha256 {('ok' if it['recorded'] else 'present (no recorded sha)') if it['ok'] else 'MISMATCH'}"
                  + (f" ({it['actual'][:12]}… vs recorded {it['recorded'][:12]}…)" if it['recorded'] and it['actual'] and not it['ok'] else ""))
    npass = sum(1 for r in results if r["status"] == "PASS")
    print(f"\n{npass}/{len(results)} PASS")
    if out_json:
        json.dump({"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "results": results}, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 0 if npass == len(results) and results else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
