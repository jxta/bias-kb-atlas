#!/usr/bin/env python3
"""bias-kb 主張⇄証拠の向きと状態遷移（ORDER 0015 §3 = ORDER 0014 §g4 の裁定）。

なぜ要るか:
  - `supported_by`（C→E）は 183 本あるのに逆向きの `supports`（E→C）は 1 本しか
    書かれていない。双方向律 P2 は実質 `grounded_in`⇄`verifies` だけで回っていて、
    **証拠から「これは何を支えたか」を辿れない**。
  - `status_history` は 1 本も無い。いま出せるのは現在のスナップショットだけで、
    **「いつ確立し、いつ何が原因で覆されたか」が描けない**。棄却を残すことが
    この知識基盤の主な資産なのに、その時間発展が機械的に問えない。

規則（ORDER 0015 §3）:
  - 新規 Evidence は `supports` または `refutes` を必ず書く。相互に書かれていること。
  - Claim / Hypothesis は `status` を変えるときに `status_history` へ 1 行足す。
    最後の要素の `status` は現在の `status` と一致していること。
  - **既存は遡及しない**（R10-2）。既存分はここで派生として補い、印を付ける。
  - 必須化は REQUIRED_FROM 以降の `prov.date` を持つノードだけ。

  python3 knowledge/tools/kb_g4.py --build    # index/g4.json を書く
  python3 knowledge/tools/kb_g4.py --report   # 充足状況を表示
  python3 knowledge/tools/kb_g4.py --check    # 新規ノードが規則を満たさなければ exit 1
"""
import json, os, sys, argparse
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
KN = os.path.join(ROOT, "knowledge")
OUT = os.path.join(KN, "index", "g4.json")
SCHEMA = os.path.join(KN, "schema", "kb-schema.json")

# 必須化の日（ORDER 0015 §3、kb_ledger.py の REQUIRED_FROM と同日に揃える）
REQUIRED_FROM = "2026-09-13"

FWD = {"supports": "supported_by", "refutes": "refuted_by"}   # E 側の欄 -> C/H 側の欄
HOLDER = ("Claim", "Hypothesis")

# ★「書いて、空だった」と「まだ書いていない」を区別する（META 裁定 巡回228 §4）。
#   ORDER 0015 §3 の目的は「証拠から**何を支えた・覆したかを辿れる**こと」。
#   `any(written.values())` はその 2 つを区別できない**実装の穴**で、規則の弱化ではない。
#   ★成立条件は狭く取る —— 逃げ道にしないため、次の**全部**を満たすときだけ免除する:
#     (a) supports と refutes が**両方とも存在し、両方とも空配列**（欄が無いのは従来どおり error）
#     (b) supports_refutes == "none"
#     (c) supports_refutes_note が非空
#     (d) object 形式の verdict があり **decided: false**（＝ その行が何も決めていない）。
#         ★補助として matched: false かつ k == 0 も要求する（狭くする方向）。
#   ★(d) を `k == 0` だけに預けてはいけない（META 裁定 巡回231 §1）——
#     main の実データで `k` は (i) 決着した判別量の本数（E-c7 の CLAIMS FALSIFIED 1/1 は k=1）と
#     (ii) 的中数（E-b6 の ★分解能不足 は k=0）の**どちらとも読め**、schema はどちらとも言っていない。
#     (ii) の読みだと **反証した判定（P-b6 の判定表 行 6 ＝ B-2b の −0.064 を反証する行）も
#     matched:false・k:0 になり、免除に入る**。
#   ★初版の「反証した判定は refutes が非空だからここには来ない」は**著者がそう書くという前提**であって、
#     コードが強制していることではない。免除はまさにその前提が崩れたときのために要る検査なので、
#     前提を条件に使うと分母が自分の外に出る（#447・#460・#461 と同じ形）。
#   ★`decided` の欠落は**免除不成立**（既定で通さない）。
#   ★status_history（C/H）には一切適用しない。免除は supports / refutes だけ。
NONE_DECL = "none"

def intentionally_empty(nd):
    """「意図的に空」の宣言が成立しているか。(成立, 理由) を返す。"""
    for f in FWD:
        if not isinstance(nd.get(f), list):
            return False, "%s 欄が無い（空配列として明示すること）" % f
        if nd[f]:
            return False, "%s が空でない" % f
    if nd.get("supports_refutes") != NONE_DECL:
        return False, "supports_refutes が %r（%r であるべき）" % (nd.get("supports_refutes"), NONE_DECL)
    if not (nd.get("supports_refutes_note") or "").strip():
        return False, "supports_refutes_note が空（なぜ空なのかを書くこと）"
    v = nd.get("verdict")
    if not isinstance(v, dict):
        return False, "verdict が object 形式でない（何も決めていない判定に限る）"
    if "decided" not in v:
        return False, "verdict.decided が無い（何も決めていない行なら false と明記する。欠落は免除不成立）"
    if v.get("decided") is not False:
        return False, "verdict.decided が false でない（決めた判定は支えた/覆した相手を名指せるはず）"
    if v.get("matched") is not False:
        return False, "verdict.matched が false でない（決めた判定は相手を名指せるはず）"
    if v.get("k") != 0:
        return False, "verdict.k が 0 でない（決めた判定は相手を名指せるはず）"
    return True, ""


def _d(nd):
    return (nd.get("prov") or {}).get("date") or ""


def _statuses():
    """schema の status enum を正とする（語彙の二重管理を避ける）。"""
    try:
        return set(json.load(open(SCHEMA, encoding="utf-8"))["properties"]["status"]["enum"])
    except Exception:
        return set()


def derive(nodes):
    """既存ノードを書き換えずに、逆向きと状態履歴を派生で補う。

    返り値:
      evidence: {E-id: {supports:[], refutes:[], written:{}, derived:{}, source:'field|derived|mixed|none'}}
      claims:   [{id, type, direction, status, history:[...], history_source:'field|derived'}]
    """
    want = defaultdict(lambda: {"supports": set(), "refutes": set()})
    for nid, nd in nodes.items():
        if nd.get("type") not in HOLDER:
            continue
        for fld, back in (("supports", "supported_by"), ("refutes", "refuted_by")):
            for e in (nd.get(back) or []):
                want[e][fld].add(nid)

    evidence = {}
    for nid, nd in sorted(nodes.items()):
        if nd.get("type") != "Evidence":
            continue
        w = want.get(nid) or {"supports": set(), "refutes": set()}
        written = {f: set(nd.get(f) or []) for f in FWD}
        has_w = any(written.values())
        has_d = any(w.values())
        # 「双方向に書けている」は往復が成立している場合だけ。E が名指した相手が名指し返して
        # いなければ片方向なので mixed に落とす。旧実装は derived ⊆ written しか見ておらず、
        # 記録層の片方向 31 本が field に混ざっていた（STATU 0268 が --check との食い違いで検出）。
        both = all(written[f] == w[f] for f in FWD)
        src = ("field" if both else "mixed") if has_w else ("derived" if has_d else "none")
        evidence[nid] = {
            "supports": sorted(written["supports"] | w["supports"]),
            "refutes": sorted(written["refutes"] | w["refutes"]),
            "written": {f: sorted(written[f]) for f in FWD},
            "derived": {f: sorted(w[f]) for f in FWD},
            "source": src,
            "date": _d(nd),
        }

    claims = []
    for nid, nd in sorted(nodes.items()):
        if nd.get("type") not in HOLDER:
            continue
        hist = nd.get("status_history")
        if isinstance(hist, list) and hist:
            h, hs = [dict(x) for x in hist], "field"
        else:
            # 擬似履歴（1 点だけ）: 「その日にその状態で現れた」以上のことは言わない
            h = [{"status": nd.get("status"), "date": _d(nd),
                  "by": (nd.get("prov") or {}).get("asserted_by"), "derived": True}]
            hs = "derived"
        claims.append({"id": nid, "type": nd.get("type"), "direction": nd.get("direction"),
                       "status": nd.get("status"), "history": h, "history_source": hs})
    return {"evidence": evidence, "claims": claims}


def summary(g4):
    ev = g4["evidence"]
    cl = g4["claims"]
    src = defaultdict(int)
    for v in ev.values():
        src[v["source"]] += 1
    return {"n_evidence": len(ev), "evidence_source": dict(src),
            "n_claims": len(cl),
            "history_field": sum(1 for c in cl if c["history_source"] == "field"),
            "history_derived": sum(1 for c in cl if c["history_source"] == "derived")}


def write_index(nodes, path=OUT):
    g4 = derive(nodes)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump({"generated_by": "kb_g4.py --build（手編集禁止・派生物）",
               "required_from": REQUIRED_FROM, "n_nodes": len(nodes),
               "summary": summary(g4), **g4},
              open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return g4


def check(nodes, cutoff=REQUIRED_FROM):
    errors, warns = [], []
    ok_status = _statuses()
    want = derive(nodes)["evidence"]
    # ★分母（ORDER 0018 §2）。0 でも印字する。
    #   n_written は has_w（＝何か書いてある）で、**相手が名指し返していない片方向も含む**。
    #   片方向は同時に error にもなるので、内訳 n_oneway を別に数える
    #   （分母の印字は意味が厳密であることが取り柄。巡回231 軽微 1）。
    n_denom = n_written = n_oneway = n_none = n_short = 0
    n_hc = n_hist = n_hist_short = 0                # C/H 側（status_history）の分母

    for nid, nd in sorted(nodes.items()):
        if nd.get("type") != "Evidence":
            continue
        newish = _d(nd) >= cutoff
        v = want[nid]
        written = v["written"]
        has_w = any(written.values())
        if newish: n_denom += 1
        if not has_w:
            ok_none, why = intentionally_empty(nd)
            if ok_none:
                if newish: n_none += 1
            else:
                if newish: n_short += 1
                msg = (f"[g4] {nid}: Evidence に supports / refutes が無い"
                       "（何を支えた・覆した証拠か辿れない）"
                       f"／★意図的に空なら supports_refutes: \"none\" と理由を書く: {why}")
                (errors if newish else warns).append(msg)
        elif newish:
            n_written += 1
        # 片方向: E が名指した相手が E を名指し返していない
        for fld, back in FWD.items():
            for tgt in written[fld]:
                if newish and tgt in nodes and nid not in (nodes[tgt].get(back) or []):
                    n_oneway += 1
                tn = nodes.get(tgt)
                if tn is None:
                    errors.append(f"[g4] {nid}.{fld} -> {tgt} が存在しない")
                elif nid not in (tn.get(back) or []):
                    msg = (f"[g4] {nid}.{fld} は {tgt} を名指しているが、{tgt}.{back} に {nid} が無い"
                           "（片方向）")
                    (errors if newish else warns).append(msg)
        # 逆の片方向: 相手が名指しているのに E 側が書いていない
        for fld in FWD:
            miss = set(v["derived"][fld]) - set(written[fld])
            if miss and has_w:
                msg = (f"[g4] {nid}: {', '.join(sorted(miss))} が {nid} を名指しているのに "
                       f"{nid}.{fld} に無い（片方向）")
                (errors if newish else warns).append(msg)

    # ★分母を必ず印字。n_none が増え始めたら規則のほうを見直す合図（META 裁定 巡回228 §4-3）
    print("[g4] 必須化の分母: prov.date >= %s の Evidence = %d" % (cutoff, n_denom))
    print("     書けている %d（うち片方向 %d）／ 意図的に空（宣言あり） %d ／ 不足（error） %d"
          % (n_written, n_oneway, n_none, n_short))

    for nid, nd in sorted(nodes.items()):
        if nd.get("type") not in HOLDER:
            continue
        newish = _d(nd) >= cutoff
        if newish: n_hc += 1
        hist = nd.get("status_history")
        if not (isinstance(hist, list) and hist):
            if newish: n_hist_short += 1
            msg = f"[g4] {nid}: status_history が無い（状態の遷移が辿れない）"
            (errors if newish else warns).append(msg)
            continue
        if newish: n_hist += 1
        last = hist[-1]
        if last.get("status") != nd.get("status"):
            errors.append(f"[g4] {nid}: status_history の最後 {last.get('status')!r} が "
                          f"現在の status {nd.get('status')!r} と一致しない")
        prev = ""
        for i, h in enumerate(hist):
            if ok_status and h.get("status") not in ok_status:
                errors.append(f"[g4] {nid}: status_history[{i}].status {h.get('status')!r} は語彙外")
            dt = h.get("date") or ""
            if dt < prev:
                errors.append(f"[g4] {nid}: status_history[{i}] の date {dt} が前の {prev} より古い")
            prev = max(prev, dt)

    # ★C/H 側の分母も印字する。Evidence と要求される欄が違うので 2 行に分ける（巡回231 要修正 2）。
    #   「0 でも印字する」の狙いは *その検査が何件を見たか* を常に見せることなので、
    #   片方が無言なら同じ穴になる。
    print("[g4] 同           : prov.date >= %s の Claim/Hypothesis = %d ／ status_history あり %d ／ 不足 %d"
          % (cutoff, n_hc, n_hist, n_hist_short))

    return errors, warns


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

    if a.build:
        write_index(nodes)
        print(f"--build: {os.path.relpath(OUT, ROOT)}")

    if a.report:
        s = summary(derive(nodes))
        es = s["evidence_source"]
        print(f"\n== 主張⇄証拠の向き（Evidence {s['n_evidence']} 本）==")
        for k, ja in (("field", "双方向に書けている"), ("derived", "相手からの派生のみ"),
                      ("mixed", "片方向（往復していない）"), ("none", "どちらも無い")):
            print(f"  {ja:<22} {es.get(k, 0):4d}")
        print(f"\n== 状態遷移（Claim/Hypothesis {s['n_claims']} 本）==")
        print(f"  status_history が書かれている  {s['history_field']:4d}")
        print(f"  擬似履歴（1 点・派生）         {s['history_derived']:4d}")

    rc = 0
    if a.check:
        errors, warns = check(nodes)
        for w in warns[:40]:
            print("WARN " + w)
        if len(warns) > 40:
            print(f"WARN … ほか {len(warns)-40} 件（既存ノードは遡及しない）")
        for e in errors:
            print("FAIL " + e)
        print(f"\n--check: {len(nodes)} nodes, {len(errors)} errors, {len(warns)} warnings "
              f"(required_from={REQUIRED_FROM})")
        rc = 1 if errors else 0
    return rc


if __name__ == "__main__":
    sys.exit(main())
