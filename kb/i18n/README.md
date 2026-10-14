# kb/i18n/ — English overlay for the public Atlas (presentation layer)

`en.json` holds English texts for the Japanese node texts of the public excerpt (`kb/nodes.json`): labels, statements,
definitions, counterpoints, lessons, artifact roles, tolerances, k4 notes, and the research-line labels. When the Atlas UI is
in English (`#lang=en`, or a non-Japanese browser), `atlas.js` fetches this file and shows the English text in place of the
Japanese — in the detail panel, cards, chips, search, the map and the table.

What it is **not**: it is not part of the record layer. `kb/nodes.json`, `kb/parts/`, `n/<id>.json`, `kb/kb.jsonld`,
`rerun.py`, `build_site.py` and `check_site.py` never read it. The Japanese record stays authoritative; the detail panel of a
translated node shows the original under “Original (Japanese)”, and the raw JSON there is the record, not the translation.

## Layout

```json
{ "meta":  { "lang": "en", "generated": "...", "source_generated_at": "...", "source_ref": "...", "counts": {...} },
  "nodes": { "<node id>": { "label": "...", "statement": "...", "artifacts[0].role": "...",
                            "_src": { "label": "<fp>", "statement": "<fp>", "artifacts[0].role": "<fp>" } } },
  "lines": { "<line id>": { "label": "...", "short": "...", "_src": {...} } },
  "k4":    { "<X id>":    { "note": "...", "_src": {...} } } }
```

* keys inside a node are dotted paths into the node JSON (`statement`, `env.k4_status`, `expected[1].tolerance`, …);
* `_src[path]` is a fingerprint of the **Japanese** source text at translation time: FNV-1a 32-bit over the Unicode code
  points, hex, then `:` and the length in code points (e.g. `9f2c1a7b:84`). `atlas.js` recomputes it at load time and applies
  a translation only when the fingerprint still matches — so when a record changes, that field falls back to Japanese instead
  of showing a stale translation (the banner says how many fields did);
* `prov` is never translated in the data; the detail panel only maps names for display (統率AI → orchestrating AI).
  Private stubs (`非公開の主張` …) are labelled from their type (`private claim`) and need no entry here.

## Checking and updating

```
python3 i18n_check.py            # structure (ids, paths, fingerprints) → exit 1 on breakage; STALE / LOSSY are warnings
python3 i18n_check.py --strict   # also fail on STALE
```

CI (`.github/workflows/rerun.yml`) runs the check after `check_site.py`. To update after the excerpt changes: look at the
STALE lines, re-translate those fields, recompute their `_src` with the same fingerprint (the function is in
`i18n_check.py`), and open a PR. Keep identifiers, numbers, formulas, file names and PR/ORDER/STATU numbers verbatim; the
LOSSY check lists tokens of the Japanese text that do not appear in the English.

The translations were produced with an AI assistant (Claude) and checked by the project; `X-census-d19.entry` is left in
Japanese on purpose because it is a runnable command whose printed text is part of the command.

---

## 日本語

`en.json` は公開抜粋（`kb/nodes.json`）の日本語ノード本文（label・statement・definition・counterpoints・教訓・成果物の役割・
許容差・k4 の注記・研究線の名前）に対する英訳です。Atlas の UI が英語のとき（`#lang=en`、または日本語以外のブラウザ）だけ
`atlas.js` がこのファイルを読み、詳細パネル・カード・チップ・検索・地図・表の表示を英語に差し替えます。

**記録層ではありません。** `kb/nodes.json`・`kb/parts/`・`n/<id>.json`・`kb/kb.jsonld`・`rerun.py`・`build_site.py`・
`check_site.py` はこのファイルを読みません。正本は日本語の記録層のままで、英訳されたノードの詳細パネルには
「Original (Japanese)」として原文が残り、そこに出る生の JSON も記録そのものです。

* ノード内のキーは JSON への経路（`statement`、`env.k4_status`、`expected[1].tolerance` …）。
* `_src[path]` は翻訳時点の**日本語原文**の指紋（FNV-1a 32bit をコードポイント列に、16 進 + `:` + 文字数。例 `9f2c1a7b:84`）。
  `atlas.js` は読み込み時に同じ指紋を計算し、一致する欄にだけ訳を当てます。記録が変われば古い訳は出ず、その欄は日本語に戻ります
  （バナーに欄数が出ます）。
* `prov` はデータ上は訳しません（詳細パネルの表示だけ 統率AI → orchestrating AI などに写像）。非公開スタブ（「非公開の主張」…）は
  型から `private claim` のように作るので、ここに項目は要りません。

検査は `python3 i18n_check.py`（構造の崩れは終了コード 1、STALE / LOSSY は警告。`--strict` で STALE も失敗）。CI は `check_site.py`
の直後に走らせます。抜粋が更新されたら STALE の欄を再翻訳し、`_src` を同じ指紋で付け直して PR にしてください。ID・数値・式・
ファイル名・PR/ORDER/STATU 番号は原文どおりに保ちます（LOSSY は原文の語で英文に見つからないものの一覧）。

翻訳は AI（Claude）が作り、プロジェクトが確認しました。`X-census-d19.entry` は実行コマンド（出力文字列がコマンドの一部）なので
意図的に日本語のままです。
