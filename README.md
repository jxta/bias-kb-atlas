# bias-kb Atlas — 公開抜粋（主張から再実行可能な証拠へ）

[![rerun-offline-units](https://github.com/jxta/bias-kb-atlas/actions/workflows/rerun.yml/badge.svg)](https://github.com/jxta/bias-kb-atlas/actions/workflows/rerun.yml)

**閲覧**: https://jxta.github.io/bias-kb-atlas/ （静的ページ。ローカルで見るときは `python3 -m http.server` でこのディレクトリを配信して `index.html` を開く。外部依存は d3 v7.9.0 を jsDelivr から SRI 付きで読むだけ）

これは、素数の偏り（Chebyshev bias）の系統的研究を複数の AI エージェントと人間で進めている
知識基盤 **bias-kb**（private リポジトリ `jxta/ai4math-lab` の `knowledge/`）から、
**「主張 → 証拠 → 再実行可能な実行単位」の鎖**に関わるノードを規則で抜き出した公開版です。
全 719 ノード中 100 ノード（関数体 census 線と Q8 の W 層）。抜き出し規則は生成器
`kb_atlas.py --profile public-grounding`（private 側 `knowledge/tools/`）に書かれており、手では選んでいません。

## 何を示すためのものか

科研費研究計画（Open Science for AI）の核心
「知識グラフ上の各主張を、それを生んだ再現可能な研究に双方向リンクで接地させ、AI の推論が常に再実行可能な証拠に遡れる構造とする」
が、進行中の研究で実際に動いていることを、閲覧者自身が確かめられるようにしています。

| 原理 | KB での実装 | このリポジトリで確かめる方法 |
|---|---|---|
| **P1 計算接地** | 主張 `supported_by` → 証拠 `grounded_in` → 実行単位（`entry` コマンド・`inputs` の sha256・`expected`・`env`）。CI の R9 検査「接地律」が、証拠のない主張・実行単位のない証拠を拒否 | Atlas の「接地」タブ。主張ごとに証拠 → 実行単位 → 再実行結果を一覧し、「辿る」で詳細へ |
| **P2 双方向性** | 証拠 `grounded_in` ⇄ 実行単位 `verifies` は記録層に両方向で書く。主張 ⇄ 証拠の逆向きは `backlinks.json` を CI が導出し「双方向律」で照合 | 詳細パネルの「出るリンク／入るリンク」。⇄ 印は記録層に両方向あるもの |
| **P3 実行粒度** | 実行単位は `tier`（full = 本走・accept = 受入・spot = 抽出照合）で再実行の範囲とコストを限定 | offline 単位 7 本は同梱データだけで 1 コマンドずつ再実行できる（下記） |

## 再実行する

```bash
git clone https://github.com/jxta/bias-kb-atlas.git && cd bias-kb-atlas
pip install -r requirements.txt      # sympy（閉形式の記号照合に使う）
python3 rerun.py                     # 7 単位: 入力の sha256 照合 → entry 実行 → expected と比較
python3 rerun.py X-census-d17-spot   # 1 単位だけ
```

期待される出力（2026-09-03、Python 3.12）:

```
X-a1-mobius            spot   PASS   A1_closedform_match: match / match
X-boundary-closedform  spot   PASS   closedform_vs_census(1/q law): match / match
X-census-d11-spot      spot   PASS   -0.49076650925398013 / -0.49076650925398013
X-census-d13-spot      spot   PASS   -0.4949126864583562 / -0.4949126864583562
X-census-d15-spot      spot   PASS   -0.4989715075302701 / -0.4989715075302701
X-census-d17-spot      spot   PASS   -0.4994337027369984 / -0.4994337027369984
X-q8-ks                accept PASS   0 / 0
7/7 PASS
```

GitHub Actions（上のバッジ）が push のたびと毎週、同じ再実行を行います。

`spot` 単位は凍結された集計ファイルから記録値を読み直すもの（記録と成果物の完全性の照合）、
`verify_*.py` は閉形式を sympy で記号的に再計算して census 実測と照合するものです。
本走（`full`、mdx 計算機上の全数 census: 例 d=17 は 86,093,442 個の指標）は同梱していません。
その本走の記録・sha・登録帯は各ノードの JSON にあります。

## 中身

```
index.html                 Atlas（俯瞰・研究線・時間・グラフ・教訓・登録・表・接地 ＋ 詳細パネル）
kb/nodes.json              抜粋 100 ノードの記録（型・状態・リンク・来歴・凍結 sha・期待値）＋派生情報（_line, _in, _out）
rerun.py                   offline 実行単位の再実行器（kb/nodes.json を読む）
subprojects/hurwitz_ea/    関数体 census の凍結集計 (d=11,13,15,17) と検証スクリプト 2 本
subprojects/q8_drh/...     D4 対照群 970 体の零点データ（Q8 KS 二側検定の入力）
.github/workflows/rerun.yml  再実行 CI
```

ノードの 8 型: O 対象・Q 量・E 証拠・C 主張・H 仮説・P 事前登録・X 実行単位・L 教訓。
状態: established／registered-hit（走行前に凍結した予測の的中）／supported／provisional／open／challenged／rejected（棄却も残す）。

## 出所と生成

- 記録層: `jxta/ai4math-lab`（private）`knowledge/` — 統率AI（Claude）が知識化し、meta-AI（Claude）が検収、横山（NII）が merge で承認。
- 生成: `knowledge/tools/kb_atlas.py --profile public-grounding --public-repo jxta/bias-kb-atlas --dump-nodes kb/nodes.json`（同リポジトリ）。
- 研究: JHPCN jh261018「AI for Science of Science: 系統的素数偏り研究」（青木美穂・島根大学、横山重俊・国立情報学研究所）。

*bias-kb Atlas public excerpt — claims grounded in re-executable evidence. Open `index.html`, or run `python3 rerun.py` to re-execute the seven offline execution units bundled here and compare with the recorded expected values.*
