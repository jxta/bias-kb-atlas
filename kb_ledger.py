#!/usr/bin/env python3
"""bias-kb 予測台帳と判定の集約（ORDER 0014 — 俯瞰ビューの土台）。

「この研究がいまどこにいるか」を最も短く言うのは判定名（★SERIES CONFIRMED、
INSTRUMENT FAIL、★CLAIMS CONFIRMED k/n …）と予測台帳（計器 n/N・機構 n/N）だが、
どちらも長らく E.statement の散文と values.verdict の文字列にしかなく、
線ごとの推移を機械的に出せなかった。

このツールは 2 つの経路で同じ形に揃える:
  1. 構造化された `verdict` / `ledger` 欄（schema v1.2、新規ノードはこちらを書く）
  2. 無い場合は statement の散文から拾う（既存 853 ノードのための後方互換。R10-2 によりノードは書き換えない）

出力 knowledge/index/ledger.json は派生物（手編集禁止）。俯瞰ビューはこれを読む。

  python3 knowledge/tools/kb_ledger.py --build    # index/ledger.json を書く
  python3 knowledge/tools/kb_ledger.py --report   # 線ごとの推移を表示
  python3 knowledge/tools/kb_ledger.py --check    # 新規ノードに構造化欄が無ければ exit 1
"""
import json, os, re, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
KN = os.path.join(ROOT, "knowledge")
OUT = os.path.join(KN, "index", "ledger.json")
# 構造化欄を「必須」にする日。既存 853 ノードは対象外（R10-2）。
# agents.json の new_nodes_from とは別に持つ: 統率AI が走行中の登録・判定を
# 止めないよう、本 ORDER が読まれてから移行できる日付にしてある。
REQUIRED_FROM = "2026-09-13"

# 散文の書き方の実測（2026-09-06 時点）:
#   「予測台帳: 計器 19/23・機構 4/16。」
#   「台帳 B: 計器 23/28、機構 2/12」
#   「予測台帳: 機構 14 件目 的中 → 計器 19/23・機構 3/14。」
#   「予測台帳 機構 10 件目 外れ（計器 18/22・機構 0/10）。」
#   「記録のみ（台帳外）。」「（予測台帳には数えない）」
# さらに values.ledger に "計器 19/23 ／ 機構 3/14" 形式の半構造化欄が 41 ノードにある。
WIN = 120                      # 「台帳」から後ろ何文字を見るか
RE_ANCHOR = re.compile(r"台帳")
RE_OUT = re.compile(r"台帳外|台帳には数えない|台帳に数えない")
RE_INST = re.compile(r"計器\s*(\d+)\s*/\s*(\d+)")
RE_MECH = re.compile(r"機構\s*(\d+)\s*/\s*(\d+)")
RE_DIR = re.compile(r"台帳\s*([A-Z])\s*[:：]")
# 判定名: ★ 付き、または大文字の判定語 + 任意の k/n
RE_VNAME = re.compile(r"^\s*(★?\s*[A-Z][A-Za-z0-9 '’\-+/()]*[A-Za-z)])\s*(?:(\d+)\s*/\s*(\d+))?")


def _tally(m):
    return {"hit": int(m.group(1)), "n": int(m.group(2))} if m else None


def parse_ledger_value(values):
    """values.ledger（記録層に実在する半構造化欄。例 "計器 19/23 ／ 機構 3/14"）から拾う。
    statement の散文より確実なので、構造化欄の次にこれを見る。"""
    s = (values or {}).get("ledger")
    if not isinstance(s, str) or not s.strip():
        return None
    if RE_OUT.search(s):
        return {"counted": False, "source": "values"}
    inst = mech = None
    for m in RE_INST.finditer(s):
        inst = m
    for m in RE_MECH.finditer(s):
        mech = m
    if not (inst or mech):
        return None
    d = {"counted": True, "source": "values"}
    if inst:
        d["instrument"] = _tally(inst)
    if mech:
        d["mechanism"] = _tally(mech)
    dm = RE_DIR.search(s)
    if dm:
        d["direction"] = dm.group(1)
    return d


def parse_ledger_prose(text):
    """statement の散文から台帳を拾う。返り値 None = 台帳の記載なし。"""
    if not text:
        return None
    if RE_OUT.search(text):
        return {"counted": False, "source": "prose"}
    best = None
    for m in RE_ANCHOR.finditer(text):
        win = text[m.start(): m.start() + WIN]
        inst = None
        mech = None
        for mm in RE_INST.finditer(win):
            inst = mm                      # 窓の中の最後のものを採る（「→ 計器 a/b」が累積）
        for mm in RE_MECH.finditer(win):
            mech = mm
        if inst or mech:
            d = {"counted": True, "source": "prose"}
            if inst:
                d["instrument"] = _tally(inst)
            if mech:
                d["mechanism"] = _tally(mech)
            dm = RE_DIR.search(win)
            if dm:
                d["direction"] = dm.group(1)
            best = d                        # 複数あれば最後の記載を採る
    return best


def parse_verdict_string(s):
    """'★SERIES CONFIRMED ／ INCONCLUSIVE 付き → E-...' を name/qualifier/k/n/evidence に割る。"""
    if not isinstance(s, str) or not s.strip():
        return None
    out = {"source": "string"}
    rest = s
    ev = re.search(r"(E-[a-z0-9][a-z0-9-]*)", rest)
    if ev:
        out["evidence"] = ev.group(1)
        rest = rest[:ev.start()]
    rest = re.sub(r"[→>]+\s*$", "", rest).strip()
    parts = re.split(r"\s*[／/]\s*(?![0-9])", rest, maxsplit=1)   # k/n の / では割らない
    m = RE_VNAME.match(parts[0])
    if m:
        out["name"] = re.sub(r"\s+", " ", m.group(1)).replace("★ ", "★").strip()
        if m.group(2):
            out["k"], out["n"] = int(m.group(2)), int(m.group(3))
        tail = parts[0][m.end():].strip(" 　（）()")
        if tail:
            out.setdefault("note", tail)
    else:
        out["name"] = parts[0].strip()
    if len(parts) > 1 and parts[1].strip():
        out["qualifier"] = parts[1].strip()
    return out if out.get("name") else None


def _num(lst):
    """['0240'] や ['#438'] から整数を取る（同日の判定を STATU / PR 番号で細かく並べるため）。"""
    ns = [int(x) for v in (lst or []) for x in re.findall(r"\d+", str(v))]
    return max(ns) if ns else -1


def _order_key(r):
    # 日付だけだと同日の複数判定の順序が id のアルファベット順になり、
    # 台帳の単調性が偽陽性になる。STATU 番号・PR 番号で細かく並べる。
    return (r["date"], _num(r.get("statu")), _num(r.get("pr")), r["id"])


def collect(nodes):
    """ノード集合 -> 判定レコードの一覧（構造化欄を優先、無ければ散文）。"""
    recs = []
    for nid, nd in sorted(nodes.items()):
        typ = nd.get("type")
        if typ not in ("Evidence", "Protocol"):
            continue
        v = nd.get("verdict")
        if isinstance(v, dict):
            vd = dict(v); vd["source"] = "field"
        else:
            vd = parse_verdict_string(v if isinstance(v, str) else
                                      (nd.get("values") or {}).get("verdict"))
        lg = nd.get("ledger")
        if isinstance(lg, dict):
            lg = dict(lg); lg["source"] = "field"
        else:
            lg = (parse_ledger_value(nd.get("values"))
                  or parse_ledger_prose(nd.get("statement") or ""))
        if not vd and not lg:
            continue
        pv = nd.get("prov") or {}
        rec = {"id": nid, "type": typ, "date": pv.get("date") or "",
               "direction": nd.get("direction") or (lg or {}).get("direction"),
               "label": nd.get("label") or "",
               "statu": pv.get("statu") or [], "pr": pv.get("pr") or []}
        if vd:
            rec["verdict"] = vd
        if lg:
            rec["ledger"] = lg
        recs.append(rec)
    recs.sort(key=_order_key)
    return recs


def series(recs):
    """線ごとの台帳の推移。単調でない点は suspect（散文の取り違えの疑い）として印を付ける。"""
    out = {}
    for r in recs:
        lg = r.get("ledger")
        if not lg or not lg.get("counted", True):
            continue
        d = r.get("direction") or lg.get("direction") or "-"
        out.setdefault(d, [])
        pt = {"id": r["id"], "date": r["date"], "source": lg.get("source")}
        for k in ("instrument", "mechanism"):
            if lg.get(k):
                pt[k] = lg[k]
        if r.get("verdict"):
            pt["verdict"] = r["verdict"].get("name")
        out[d].append(pt)
    for d, pts in out.items():
        last = {}
        for pt in pts:
            why = []
            for k in ("instrument", "mechanism"):
                t = pt.get(k)
                if not t:
                    continue
                if t["hit"] > t["n"]:
                    why.append(f"{k}: hit {t['hit']} > n {t['n']}")
                p = last.get(k)
                if p and (t["n"] < p["n"] or t["hit"] < p["hit"]):
                    why.append(f"{k}: {p['hit']}/{p['n']} から {t['hit']}/{t['n']} へ後退")
                else:
                    last[k] = t
            if why:
                pt["suspect"] = "；".join(why)
    return out


def write_index(nodes, path=OUT):
    """kb_build.py --build から呼ばれる。index/ledger.json（派生物）を書く。"""
    recs = collect(nodes)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump({"generated_by": "kb_ledger.py（kb_build.py --build から。手編集禁止）",
               "n_nodes": len(nodes), "n_verdicts": len(recs),
               "required_from": new_from(), "series": series(recs), "verdicts": recs},
              open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return recs


def new_from():
    return REQUIRED_FROM


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args(argv)
    if not (a.build or a.report or a.check):
        ap.error("give --build, --report and/or --check")
    sys.path.insert(0, HERE)
    import kb_build
    nodes = kb_build.load_nodes()
    recs = collect(nodes)
    ser = series(recs)
    cutoff = new_from()

    if a.build:
        write_index(nodes)
        print(f"--build: {os.path.relpath(OUT, ROOT)} ({len(recs)} 判定, 線 {sorted(ser)})")

    if a.report:
        for d in sorted(ser):
            print(f"\n== 研究線 {d} — {len(ser[d])} 判定 ==")
            for pt in ser[d]:
                f = lambda k: (f"{pt[k]['hit']}/{pt[k]['n']}" if pt.get(k) else "-")
                print(f"  {pt['date']}  計器 {f('instrument'):>7}  機構 {f('mechanism'):>7}  "
                      f"{(pt.get('verdict') or '')[:34]:<34} {pt['id']}"
                      + (f"\n      ⚠ {pt['suspect']}" if pt.get("suspect") else ""))
        nf = sum(1 for r in recs if (r.get("verdict") or {}).get("source") == "field")
        print(f"\n判定 {len(recs)} 本（構造化 {nf} / 散文 {len(recs)-nf}）、"
              f"台帳の点 {sum(len(v) for v in ser.values())}、"
              f"suspect {sum(1 for v in ser.values() for p in v if p.get('suspect'))}")

    rc = 0
    if a.check:
        errors, warns = [], []
        for r in recs:
            nd = nodes[r["id"]]
            newish = r["date"] >= cutoff
            if r.get("verdict") and (r["verdict"].get("source") != "field"):
                (errors if newish else warns).append(
                    f"[ledger] {r['id']}: 判定が構造化されていない（verdict 欄が無く "
                    f"{'values.verdict' if isinstance(nd.get('verdict'), type(None)) else 'verdict 文字列'} から復元）")
            if r.get("ledger") and r["ledger"].get("source") != "field":
                src = {"values": "values.ledger の文字列", "prose": "statement の散文"}.get(
                    r["ledger"].get("source"), "?")
                (errors if newish else warns).append(
                    f"[ledger] {r['id']}: 台帳が{src}にしかない（ledger 欄を書くこと）")
            if newish and r.get("verdict") and not r.get("direction"):
                errors.append(f"[ledger] {r['id']}: 判定があるのに direction が無い（線ごとに集計できない）")
        for d, pts in ser.items():
            for pt in pts:
                if pt.get("suspect"):
                    warns.append(f"[ledger] 線 {d} {pt['id']}（{pt['date']}）の台帳が単調でない: {pt['suspect']}"
                                 + ("　※散文からの復元なので取り違えの可能性" if pt.get("source") == "prose" else ""))
        for w in warns:
            print("WARN " + w)
        for e in errors:
            print("FAIL " + e)
        print(f"\n--check: {len(nodes)} nodes, {len(recs)} 判定, {len(errors)} errors, "
              f"{len(warns)} warnings (required_from={cutoff})")
        rc = 1 if errors else 0
    return rc


if __name__ == "__main__":
    sys.exit(main())
