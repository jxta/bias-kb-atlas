# ⑦ 関数体 census（FF）— 研究線の物語

生成 2026-09-23・記録層の最終追記 2026-08-24・ノード 61（C 11、E 8、H 3、L 5、O 12、P 3、Q 7、X 12）

読み方: 記録層（private repo jxta/ai4math-lab の knowledge/）から生成した文書。`ID` は同 repo の knowledge/＜型＞/＜ID＞.json、または private Atlas（knowledge/rendered/atlas.html の #v=grounding&node=＜ID＞）で開ける。議論は同 repo の Discussions（研究線ごとのスレッド）、結論は knowledge/decisions/ に残す（裁定 0022）。

主張 11（確立 5・登録的中 4・棄却 1）／登録 3（未判定 0）／判定 2（★ 0・✗ 0・⚠ 0）／開いた仮説 2

## 現在地
直近の判定: 2026-08-13 ● 判定 middle-law FALSE (holds only e=2,6)  — `E-middle-e10` 中央係数則 反例（-6024≠-5880）

## 判断待ち — 開いた仮説
- `H-middle-weil-sum` 中央係数の均された Weil 和（open）
- `H-supersingular-scaling` m_D=2 層の増大則（24→72）（open）

## 判断の記録（knowledge/decisions/）
（なし。問い・選択肢・根拠・決定を D-*.json で残すと、ここと地図に出る）

## 節目（日付順）
- 2026-08-04 ◇ 登録 `P-census-exec-a`  — 全数 census 手順（EXEC_A_v2）
- 2026-08-08 ▲ 主張の確立 `C-registered-prediction-method` established — 事前登録予測が2例的中（d11, d15）
- 2026-08-12 ▲ 主張の確立 `C-1q-law` established — 1/q 法則（境界余剰の主漸近）
- 2026-08-12 ▲ 主張の確立 `C-boundary-closedform` established — 境界 O 項の閉形式（Theorem 1・厳密）
- 2026-08-12 ▲ 主張の確立 `C-cg-sequence` established — c(g) 整数列（Theorem 2）
- 2026-08-12 ◇ 登録 `P-o19-registration`  — O-19 d=19 決定的検定の実行前登録（ORDER 0008 凍結）
- 2026-08-12 ◇ 登録 `P-registered-prediction`  — 事前登録予測プロトコル（register-then-verify）
- 2026-08-13 ▲ 主張の確立 `C-a1-mobius` established — A_1 の Möbius 閉形式（§5A 厳密証明）
- 2026-08-13 ▲ 主張の確立 `C-d19-sign-reversal` registered-hit — d=19 で境界超過の符号反転を実行前登録どおり的中（n=6 問題の実験決着）
- 2026-08-13 ▽ 棄却 `C-middle-law-false` rejected — 中央係数則は偽（自己反証）
- 2026-08-13 ● 判定 `E-census-d19` PASS — census d=19 実測（Σ側超過 −2.4300e-05・登録帯内 PASS）
- 2026-08-13 ● 判定 `E-middle-e10` middle-law FALSE (holds only e=2,6) — 中央係数則 反例（-6024≠-5880）
- 2026-08-23 ▲ 主張の確立 `C-d11-registered-hit` registered-hit — d11 登録予測 的中（registered-hit）
- 2026-08-23 ▲ 主張の確立 `C-d15-registered-hit` registered-hit — d15 登録予測 的中（registered-hit）
- 2026-08-23 ▲ 主張の確立 `C-d17-registered-hit` registered-hit — d17 登録帯 的中（registered-hit）

## 教訓
- `L-direction-preregistration` R11 方向起動規律: 方向の最初の実験は P-ノード凍結後に走らせる
- `L-extraction-vs-record` 知識化は記録層からの転記であり、要約器の出力を記録層より優先してはならない
- `L-middle-law-self-refutation` 少数例外挿の自己反証（中央係数則）※ORDER_KB 必須
- `L-novelty-search-scope` 新規性 claim は探索範囲を明示する

---
この文書は記録層から生成（kb_atlas.py）。手で編集しない。議論は各 ID を引いて行い、決定は D-*.json に残す。
