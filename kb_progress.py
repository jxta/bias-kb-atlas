#!/usr/bin/env python3
"""bias-kb 「研究の現在地」— 1 枚で状況と方向性を見るページ（ORDER 0014）。

外部資源を使わない自己完結の HTML を書く。図はサーバ側で SVG に描くので
JavaScript もライブラリも要らない（印刷しても崩れない）。

  python3 knowledge/tools/kb_progress.py                       # 記録層から（private）
  python3 knowledge/tools/kb_progress.py --nodes kb/nodes.json # 公開抜粋から
  python3 knowledge/tools/kb_progress.py -o out.html --title "…"

面:
  1. いま何があるか（型別・研究線別・同期）
  2. 研究線のレーン（登録 ◇ → 判定 ● ★ ✗ ⚠ を時間軸に）
  3. 予測台帳の推移（計器・機構の的中率）— 「登録した予測が当たった割合」
  4. 主張の棚卸し（状態 × 接地の深さ）
  5. 未払いの借り（凍結・規約・ノートブック・再実行）
  6. 失敗から出た規則（L と、それを生んだ登録・判定）
"""
import json, os, re, sys, argparse, html, datetime
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

TYPES = ["Object", "Quantity", "Hypothesis", "Protocol", "ExecutionUnit", "Evidence", "Claim", "Lesson"]
TYPE_JA = {"Object": "対象 O", "Quantity": "量 Q", "Hypothesis": "仮説 H", "Protocol": "登録 P",
           "ExecutionUnit": "実行 X", "Evidence": "証拠 E", "Claim": "主張 C", "Lesson": "教訓 L"}


# ---------- データ ----------

def load_nodes(path=None):
    if not path:
        import kb_build
        return kb_build.load_nodes()
    doc = json.load(open(path, encoding="utf-8"))
    arr = doc.get("nodes", doc) if isinstance(doc, dict) else doc
    return {n["id"]: n for n in arr if not n.get("_stub")}


def _d(nd):
    return (nd.get("prov") or {}).get("date") or ""


# ---------- SVG の下ごしらえ ----------

def _days(a, b):
    try:
        return (datetime.date.fromisoformat(b[:10]) - datetime.date.fromisoformat(a[:10])).days
    except Exception:
        return 0


def _esc(s):
    return html.escape(str(s), quote=True)


VERDICT_MARK = [
    (re.compile(r"INSTRUMENT FAIL"), "instr", "⚠", "計器の失敗"),
    (re.compile(r"★"), "star", "★", "予測が当たった判定"),
    (re.compile(r"FAIL|✗|NOT |NO "), "bad", "✗", "反証・不成立"),
]


def mark_of(name):
    for rx, cls, glyph, why in VERDICT_MARK:
        if rx.search(name or ""):
            return cls, glyph, why
    return "plain", "●", "判定"


# ---------- 面 2: レーン ----------

def lanes_svg(recs, protos, w=1040, row_h=44, pad_l=64, pad_r=16, pad_t=26, pad_b=30):
    pts = [r for r in recs if r["date"]]
    if not pts:
        return "<p class=none>時間軸に置ける判定がありません。</p>"
    dirs = sorted({(r.get("direction") or "—") for r in pts})
    d0 = min(r["date"] for r in pts + protos) if protos else min(r["date"] for r in pts)
    d1 = max(r["date"] for r in pts + protos) if protos else max(r["date"] for r in pts)
    span = max(_days(d0, d1), 1)
    iw = w - pad_l - pad_r
    x = lambda d: pad_l + iw * _days(d0, d) / span
    h = pad_t + row_h * len(dirs) + pad_b
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="研究線ごとの登録と判定の時間軸">']
    # 目盛り（週）
    try:
        cur = datetime.date.fromisoformat(d0[:10])
        end = datetime.date.fromisoformat(d1[:10])
        cur -= datetime.timedelta(days=cur.weekday())
        while cur <= end:
            xx = x(cur.isoformat())
            o.append(f'<line class="grid" x1="{xx:.1f}" y1="{pad_t-8}" x2="{xx:.1f}" y2="{h-pad_b+4}"/>')
            o.append(f'<text class="tick" x="{xx:.1f}" y="{h-pad_b+18}" text-anchor="middle">{cur.strftime("%m/%d")}</text>')
            cur += datetime.timedelta(days=7)
    except Exception:
        pass
    for i, dr in enumerate(dirs):
        y = pad_t + row_h * i + row_h / 2
        o.append(f'<line class="lane" x1="{pad_l}" y1="{y:.1f}" x2="{w-pad_r}" y2="{y:.1f}"/>')
        lab = f"線 {dr}" if dr != "—" else "（線の記載なし）"
        o.append(f'<text class="lane-label" x="{pad_l-10}" y="{y+4:.1f}" text-anchor="end">{_esc(lab)}</text>')
        for p in protos:
            if (p.get("direction") or "—") != dr or not p["date"]:
                continue
            o.append(f'<g><title>登録 {_esc(p["id"])}（{_esc(p["date"])}）\n{_esc(p["label"][:110])}</title>'
                     f'<path class="reg" d="M{x(p["date"]):.1f},{y-13} l5,5 l-5,5 l-5,-5 z"/></g>')
        for r in pts:
            if (r.get("direction") or "—") != dr:
                continue
            nm = (r.get("verdict") or {}).get("name") or ""
            cls, glyph, why = mark_of(nm)
            kn = (r.get("verdict") or {})
            kk = f' {kn["k"]}/{kn["n"]}' if kn.get("k") is not None and kn.get("n") is not None else ""
            o.append(f'<g><title>{_esc(r["date"])}　{_esc(nm)}{_esc(kk)}（{_esc(why)}）\n{_esc(r["id"])}\n'
                     f'{_esc(r["label"][:110])}</title>'
                     f'<text class="mk {cls}" x="{x(r["date"]):.1f}" y="{y+6:.1f}" text-anchor="middle">{glyph}</text></g>')
    o.append("</svg>")
    return "\n".join(o)


# ---------- 面 3: 台帳 ----------

def ledger_svg(series, w=505, hgt=190, pad_l=42, pad_r=12, pad_t=16, pad_b=28):
    out = []
    for dr in sorted(series):
        pts = [p for p in series[dr] if p.get("mechanism") or p.get("instrument")]
        if len(pts) < 2:
            continue
        d0, d1 = pts[0]["date"], pts[-1]["date"]
        span = max(_days(d0, d1), 1)
        iw, ih = w - pad_l - pad_r, hgt - pad_t - pad_b
        x = lambda d: pad_l + iw * _days(d0, d) / span
        y = lambda v: pad_t + ih * (1 - v)
        o = [f'<svg viewBox="0 0 {w} {hgt}" width="100%" role="img" aria-label="研究線 {_esc(dr)} の予測台帳の推移">']
        for v, lab in ((0, "0%"), (0.5, "50%"), (1, "100%")):
            o.append(f'<line class="grid" x1="{pad_l}" y1="{y(v):.1f}" x2="{w-pad_r}" y2="{y(v):.1f}"/>'
                     f'<text class="tick" x="{pad_l-6}" y="{y(v)+4:.1f}" text-anchor="end">{lab}</text>')
        for key, cls in (("instrument", "inst"), ("mechanism", "mech")):
            sel = [p for p in pts if p.get(key) and p[key]["n"]]
            if len(sel) < 2:
                continue
            path = " ".join(f'{x(p["date"]):.1f},{y(p[key]["hit"]/p[key]["n"]):.1f}' for p in sel)
            o.append(f'<polyline class="ln {cls}" points="{path}"/>')
            for p in sel:
                t = p[key]
                o.append(f'<g><title>{_esc(p["date"])}　{"計器" if key=="instrument" else "機構"} '
                         f'{t["hit"]}/{t["n"]}（{100*t["hit"]/t["n"]:.0f}%）\n{_esc(p["id"])}'
                         f'{"　⚠ " + _esc(p["suspect"]) if p.get("suspect") else ""}</title>'
                         f'<circle class="pt {cls}{" susp" if p.get("suspect") else ""}" '
                         f'cx="{x(p["date"]):.1f}" cy="{y(t["hit"]/t["n"]):.1f}" r="3"/></g>')
        o.append(f'<text class="tick" x="{pad_l}" y="{hgt-8}">{_esc(d0)}</text>'
                 f'<text class="tick" x="{w-pad_r}" y="{hgt-8}" text-anchor="end">{_esc(d1)}</text></svg>')
        last = pts[-1]
        cap = "　".join(f'{"計器" if k=="instrument" else "機構"} <b>{last[k]["hit"]}/{last[k]["n"]}</b>'
                       for k in ("instrument", "mechanism") if last.get(k))
        out.append(f'<figure><figcaption>研究線 {_esc(dr)}　<span class=cap>最新 {cap}</span></figcaption>'
                   + "\n".join(o) + "</figure>")
    return "\n".join(out) or "<p class=none>台帳の記載がありません（この抜粋には研究線のノードが入っていません）。</p>"


# ---------- 面 4・5・6 ----------

def reach(nodes, c):
    """主張 -> 証拠 -> 実行単位 の到達（即再実行できるか / 構造だけか / 届かないか）"""
    best = 0
    for e in c.get("supported_by", []) or []:
        en = nodes.get(e)
        if not en:
            continue
        for xid in en.get("grounded_in", []) or []:
            t = (nodes.get(xid) or {}).get("tier")
            if t in ("accept", "spot"):
                return 2
            if t == "full":
                best = max(best, 1)
    return best


REACH_JA = {2: "accept/spot に到達（即再実行できる）", 1: "full-tier のみ（mdx 本走が要る）", 0: "実行単位に届かない"}


def claims_table(nodes):
    cs = [n for n in nodes.values() if n.get("type") == "Claim"]
    if not cs:
        return "<p class=none>主張がありません。</p>"
    grid = defaultdict(Counter)
    for c in cs:
        grid[c.get("status") or "（無記入）"][reach(nodes, c)] += 1
    rows = []
    for st in sorted(grid, key=lambda s: -sum(grid[s].values())):
        r = grid[st]
        rows.append(f"<tr><th>{_esc(st)}</th>" + "".join(
            f'<td>{r[k] or "·"}</td>' for k in (2, 1, 0)) + f"<td class=tot>{sum(r.values())}</td></tr>")
    tot = Counter()
    for r in grid.values():
        tot.update(r)
    rows.append("<tr class=sum><th>計</th>" + "".join(f"<td>{tot[k]}</td>" for k in (2, 1, 0))
                + f"<td class=tot>{sum(tot.values())}</td></tr>")
    return ("<table class=grid><thead><tr><th>状態</th>" + "".join(f"<th>{_esc(REACH_JA[k])}</th>" for k in (2, 1, 0))
            + "<th>計</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>")


def debts(nodes):
    xs = [n for n in nodes.values() if n.get("type") == "ExecutionUnit"]
    es = [n for n in nodes.values() if n.get("type") == "Evidence"]
    qs = [n for n in nodes.values() if n.get("type") == "Quantity"]
    cs = [n for n in nodes.values() if n.get("type") == "Claim"]
    art = [a for e in es for a in (e.get("artifacts") or [])]
    inp = [i for x in xs for i in (x.get("inputs") or [])]
    def frac(a, b, lab, why):
        pct = f"{100*a/b:.0f}%" if b else "—"
        return (f'<tr><th>{_esc(lab)}</th><td class=num>{a}<span class=den> / {b}</span></td>'
                f'<td class=num>{pct}</td><td class=why>{_esc(why)}</td></tr>')
    rows = [
        frac(sum(1 for c in cs if reach(nodes, c) == 2), len(cs), "主張が即再実行できる",
             "残りは full-tier。k4 の再実行で accept/spot に上げる"),
        frac(sum(1 for a in art if a.get("sha256")), len(art), "成果物が sha256 で凍結",
             "凍結していない成果物は後から差し替えられる"),
        frac(sum(1 for i in inp if i.get("sha256")), len(inp), "実行単位の入力が凍結", "同上（再実行の同一性）"),
        frac(sum(1 for i in inp if i.get("sha_verified") == "verified"), len(inp), "うち実ファイルと照合済み",
             "記録だけのものは照合していない"),
        frac(sum(1 for q in qs if q.get("convention")), len(qs), "量に規約が書かれている",
             "因子 2・r vs r−1・窓の取り方 — 事故が起きた箇所"),
        frac(sum(1 for x in xs if x.get("notebook")), len(xs), "実行単位にノートブックがある",
             "接地の粒度をノートブックとする設計との乖離"),
        frac(sum(1 for x in xs if (x.get("env") or {}).get("offline")), len(xs), "実行単位が手元で再実行できる",
             "offline でないものは計算機環境が要る"),
    ]
    return "<table class=debt><tbody>" + "".join(rows) + "</tbody></table>"


def lessons_list(nodes):
    ls = [n for n in nodes.values() if n.get("type") == "Lesson"]
    if not ls:
        return "<p class=none>教訓ノードがありません。</p>"
    back = Counter()
    for n in nodes.values():
        for t in (n.get("taught_by") or []):
            back[t] += 1
    ls.sort(key=lambda n: (-len(n.get("taught_by") or []), _d(n)))
    li = []
    for n in ls[:40]:
        src = n.get("taught_by") or []
        li.append(f'<li><span class=lid>{_esc(n["id"])}</span> {_esc(n.get("label") or "")}'
                  f'<span class=src>　{len(src)} 件の登録・判定から</span></li>')
    more = f'<li class=more>ほか {len(ls)-40} 件</li>' if len(ls) > 40 else ""
    return f"<ul class=lessons>{''.join(li)}{more}</ul>"


def type_bars(nodes):
    tc = Counter(n.get("type") for n in nodes.values())
    mx = max(tc.values()) if tc else 1
    rows = []
    for t in TYPES:
        n = tc.get(t, 0)
        rows.append(f'<tr><th>{_esc(TYPE_JA[t])}</th><td class=num>{n}</td>'
                    f'<td class=bar><span style="width:{100*n/mx:.1f}%"></span></td></tr>')
    return "<table class=types><tbody>" + "".join(rows) + "</tbody></table>"


def growth_svg(nodes, w=1040, hgt=150, pad_l=42, pad_r=12, pad_t=12, pad_b=26):
    per = Counter()
    for n in nodes.values():
        d = _d(n)[:10]
        if d:
            per[d] += 1
    if len(per) < 2:
        return ""
    ds = sorted(per)
    d0, d1 = ds[0], ds[-1]
    span = max(_days(d0, d1), 1)
    iw, ih = w - pad_l - pad_r, hgt - pad_t - pad_b
    mx = max(per.values())
    bw = max(1.5, iw / (span + 1) * 0.8)
    o = [f'<svg viewBox="0 0 {w} {hgt}" width="100%" role="img" aria-label="日ごとに積まれたノード数">']
    o.append(f'<line class="grid" x1="{pad_l}" y1="{pad_t+ih}" x2="{w-pad_r}" y2="{pad_t+ih}"/>')
    o.append(f'<text class="tick" x="{pad_l-6}" y="{pad_t+9}" text-anchor="end">{mx}</text>')
    o.append(f'<line class="grid" x1="{pad_l}" y1="{pad_t+4}" x2="{w-pad_r}" y2="{pad_t+4}"/>')
    for d in ds:
        xx = pad_l + iw * _days(d0, d) / span
        bh = ih * per[d] / mx
        o.append(f'<g><title>{_esc(d)}　{per[d]} ノード</title>'
                 f'<rect class="gb" x="{xx-bw/2:.1f}" y="{pad_t+ih-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}"/></g>')
    o.append(f'<text class="tick" x="{pad_l}" y="{hgt-6}">{_esc(d0)}</text>'
             f'<text class="tick" x="{w-pad_r}" y="{hgt-6}" text-anchor="end">{_esc(d1)}</text></svg>')
    return "\n".join(o)


CSS = """
:root{--ink:#111;--mid:#666;--faint:#c9c9c9;--bg:#fff;--rule:#e3e3e3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font:14px/1.65 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}
main{max-width:1120px;margin:0 auto;padding:34px 22px 80px}
h1{font-size:22px;font-weight:600;margin:0 0 2px;letter-spacing:.02em}
.sub{color:var(--mid);margin:0 0 26px;font-size:13px}
h2{font-size:14px;font-weight:600;margin:38px 0 4px;padding-bottom:5px;border-bottom:1px solid var(--ink)}
h2 .n{color:var(--mid);font-weight:400}
.lead{color:var(--mid);margin:6px 0 14px;font-size:13px}
.none{color:var(--mid);font-size:13px;padding:10px 0}
.kpis{display:flex;flex-wrap:wrap;gap:26px;margin:14px 0 4px;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.kpi b{display:block;font-size:24px;font-weight:600;line-height:1.2}
.kpi span{color:var(--mid);font-size:12px}
.cols{display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start}
.cols>*{flex:1 1 320px;min-width:0}
figure{margin:0 0 10px}
figcaption{font-size:12px;color:var(--mid);margin-bottom:2px}
.cap b{color:var(--ink)}
svg{display:block;overflow:visible}
.grid{stroke:var(--rule);stroke-width:1}
.lane{stroke:var(--faint);stroke-width:1}
.tick{font-size:10px;fill:var(--mid)}
.lane-label{font-size:11px;fill:var(--ink)}
.reg{fill:none;stroke:var(--mid);stroke-width:1.2}
.mk{font-size:13px;fill:var(--ink);cursor:default}
.mk.star{font-size:15px}
.mk.plain{fill:var(--mid)}
.mk.instr,.mk.bad{fill:var(--ink)}
.ln{fill:none;stroke-width:1.4}
.ln.inst{stroke:var(--faint)}
.ln.mech{stroke:var(--ink)}
.pt{stroke:none}.pt.inst{fill:var(--faint)}.pt.mech{fill:var(--ink)}
.pt.susp{stroke:var(--ink);stroke-width:1.2;fill:#fff}
.gb{fill:var(--faint)}
table{border-collapse:collapse;width:100%;font-size:13px}
th{font-weight:500;text-align:left}
.grid th,.grid td{border-bottom:1px solid var(--rule);padding:7px 8px}
.grid thead th{font-size:11px;color:var(--mid);border-bottom:1px solid var(--ink);vertical-align:bottom}
.grid td{text-align:right;font-variant-numeric:tabular-nums}
.grid .tot,.grid .sum{font-weight:600}
.debt th{padding:7px 10px 7px 0;border-bottom:1px solid var(--rule);width:38%}
.debt td{padding:7px 10px;border-bottom:1px solid var(--rule);vertical-align:baseline}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.den{color:var(--mid)}
.why{color:var(--mid);font-size:12px}
.types th{padding:3px 10px 3px 0;width:96px;font-size:12px}
.types td{padding:3px 0}
.types .num{width:52px;padding-right:10px}
.bar span{display:block;height:8px;background:var(--ink)}
.lessons{list-style:none;padding:0;margin:0}
.lessons li{padding:5px 0;border-bottom:1px solid var(--rule);font-size:13px}
.lid{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--mid);margin-right:8px}
.src{color:var(--mid);font-size:12px}
.more{color:var(--mid)}
.legend{font-size:12px;color:var(--mid);margin:8px 0 0}
.legend b{color:var(--ink);font-weight:600}
footer{margin-top:44px;padding-top:14px;border-top:1px solid var(--rule);color:var(--mid);font-size:12px}
@media print{body{font-size:11px}main{padding:0}}
"""


def build(nodes, title, note, out):
    import kb_ledger
    recs = kb_ledger.collect(nodes)
    ser = kb_ledger.series(recs)
    verdicts = [r for r in recs if r.get("verdict") and r["type"] == "Evidence"]
    protos = [{"id": n["id"], "date": _d(n), "direction": n.get("direction"), "label": n.get("label") or ""}
              for n in nodes.values() if n.get("type") == "Protocol"]
    dirs = sorted({(r.get("direction") or "—") for r in verdicts}) or ["—"]
    dates = [d for d in (_d(n) for n in nodes.values()) if d]
    stars = sum(1 for r in verdicts if "★" in ((r.get("verdict") or {}).get("name") or ""))
    susp = sum(1 for v in ser.values() for p in v if p.get("suspect"))

    real_dirs = [d for d in dirs if d != "—"]
    K = [("ノード", len(nodes)), ("判定", len(verdicts)), ("うち ★", stars), ("登録", len(protos))]
    if real_dirs:
        K.append(("研究線", len(real_dirs)))
    kpis = "".join(f'<div class=kpi><b>{v}</b><span>{_esc(k)}</span></div>' for k, v in K)

    if real_dirs:
        lane_section = f"""<h2>研究線のレーン <span class=n>— 登録から判定まで</span></h2>
<p class=lead>◇ は事前登録、記号は凍結判定。★ は予測が当たった判定、✗ は反証・不成立、⚠ は計器の失敗。点に触れると内容が出る。</p>
{lanes_svg(verdicts, protos)}
<p class=legend><b>◇</b> 事前登録　<b>★</b> 確証　<b>✗</b> 反証・不成立　<b>⚠</b> 計器の失敗　<b>●</b> その他の判定</p>

<h2>予測台帳 <span class=n>— 登録した予測が当たった割合</span></h2>
<p class=lead>濃い線が<b>機構</b>（研究の中身の予測）、薄い線が<b>計器</b>（測り方の健全性）。
白抜きの点は台帳が単調でない箇所＝散文からの復元を疑うべき点（{susp} 件）。</p>
<div class=cols>{ledger_svg(ser)}</div>
"""
    else:
        lane_section = ("<h2>研究線のレーンと予測台帳</h2>\n<p class=lead>この抜粋には研究線に属するノード"
                        "（登録と凍結判定の系列）が入っていないため、線ごとの推移は出せない。"
                        "抜粋の選択規則が研究内容側のノードを外しているためで、"
                        "以下の面は抜粋の範囲で言えることに限っている。</p>")

    doc = f"""<!doctype html><html lang=ja><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>{_esc(title)}</title><style>{CSS}</style></head><body><main>
<h1>{_esc(title)}</h1>
<p class=sub>{_esc(note)}　生成 {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%MZ')}
　{f"記録の範囲 {min(dates)} 〜 {max(dates)}" if dates else ""}</p>
<div class=kpis>{kpis}</div>

{lane_section}

<h2>主張の棚卸し <span class=n>— 言っていることは、いま確かめられるか</span></h2>
{claims_table(nodes)}

<h2>未払いの借り <span class=n>— 分かっているが、まだ払っていないもの</span></h2>
{debts(nodes)}

<h2>いま何が積まれているか</h2>
<div class=cols><div>{type_bars(nodes)}</div>
<div><figure><figcaption>日ごとに積まれたノード数</figcaption>{growth_svg(nodes)}</figure></div></div>

<h2>失敗から出た規則 <span class=n>— 教訓</span></h2>
<p class=lead>棄却と失敗を残すことがこの知識基盤の主な資産。多くの登録・判定に効いている順。</p>
{lessons_list(nodes)}

<footer>生成: knowledge/tools/kb_progress.py（手編集禁止）。
判定と台帳の出どころは構造化欄 → values.ledger → statement の散文の順に見ている（kb_ledger.py）。</footer>
</main></body></html>"""
    open(out, "w", encoding="utf-8").write(doc)
    return {"nodes": len(nodes), "verdicts": len(verdicts), "protocols": len(protos),
            "dirs": dirs, "suspect": susp, "bytes": len(doc.encode())}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--nodes", help="kb/nodes.json（省略すると記録層から読む）")
    ap.add_argument("-o", "--out", default=os.path.join(ROOT, "knowledge", "rendered", "progress.html"))
    ap.add_argument("--title", default="研究の現在地 — bias-kb")
    ap.add_argument("--note", default="記録層（非公開）から生成")
    a = ap.parse_args(argv)
    nodes = load_nodes(a.nodes)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    st = build(nodes, a.title, a.note, a.out)
    print(f"kb_progress: {a.out} — {st['nodes']} ノード / 判定 {st['verdicts']} / 登録 {st['protocols']} / "
          f"線 {st['dirs']} / suspect {st['suspect']} / {st['bytes']:,} B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
