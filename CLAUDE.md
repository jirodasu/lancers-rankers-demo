# CLAUDE.md — ランサーズ・ランカーズ / Claude Code

## 体制と権限
本プロジェクトは **Claude Code が単独で** 設計・実装・デバッグ・QAを行う（2026-10-16 ユーザー決定）。ユーザー（jirodasu）は仕様・優先順位の最終決定者であり、要承認事項の承認者。他のAIエージェントとの分担は行わない。GitHub の main、PR、Issue、`AGENTS.md`、本ファイル、`docs/` を唯一の記録とする（セッション間でチャットの記憶は共有されない）。

ユーザーから、**既存仕様の範囲内の修正については、テスト合格後の main へのマージまで**許可されている。ただし、以下の「要承認事項」は独断で変更しない。main への直接 push、force push、履歴書き換えは禁止。ブランチ → PR → 必須テスト・差分確認 → 独立レビュー → squash merge を原則とする。GitHub Pages への反映は main へのマージに連動するため、本番公開と同じ扱いで慎重に行う。

## 最優先で読む
1. `AGENTS.md`（本ファイルよりもゲームの確定設定について優先）
2. `config/lancers-tuning.json`（正本。ユーザーの明示的な指示なしに変更禁止）
3. `docs/qa-2026-10-15-rank6-1-plan.md`（ランク6〜1位の現状調査・課題ID・実装計画）
4. `docs/rank6-1-combat-redesign.md`（ランク6〜1位の攻略設計）
5. `docs/qa-2026-10-14-main-game.md`（起動問題の証拠、QAの限界）
6. `.github/workflows/validate-source.yml` と `.github/workflows/factory-browser-smoke.yml`
7. 関連する最新の Issue / PR / main の履歴

## プロジェクト構成
- 公開URL: https://jirodasu.github.io/lancers-rankers-demo/
- ソース: `src/game01.txt`〜`src/game07.txt`、各種 `src/*-fix.txt`。これらは**単体で独立したPythonファイルではない**。
- `index.html` がランタイム断片を所定順で結合し、Pyxel実行とJavaScript UIを起動する。HTML中には文字列置換によるランタイムパッチがあるため、`src/` 変更時にはブート処理との互換性も確認する。
- `dev-editor/` は別の編集UI。GAME EDITORのブラウザテストは本編の実プレイ検証ではない。
- `tests/main_game_real_browser_qa.mjs` は本編をPlaywright Chromium（390×844、タッチ対応エミュレーション）で起動・操作し、`qa-artifacts/` にスクリーンショットとログを保存する。
- `tests/ranks_7_to_1_regression.py` の30回はボス状態遷移シミュレーションであり、30回のフル戦闘プレイではない。
- iPhone Safari実機の確認はChromiumのエミュレーションと区別する。

## 実行環境の制約（Claude Code Web）
- クラウドの作業環境からは `cdn.jsdelivr.net`（Pyxel本体）と GitHub Pages に接続できないことがある。その場合、ローカルでの本編起動はできない。
- 本編のブラウザ実操作検証は **GitHub Actions 上で実行し、成果物（スクリーンショット・動画・ログ）を取得して確認する**。ユーザーのPCがデスクトップアプリ経由で接続されている場合は、アプリ内ブラウザで公開ページを直接操作してもよい。
- 本編Pythonコードのヘッドレス実行は有用だが、必ず「シミュレーション」と明記する。

## ゲームの核と要承認事項
- プレイヤーは槍を操作してボスを攻略する。勝敗に影響する操作判断、予告と当たり判定の整合性、手触りを重視する。
- ランク6〜1位は攻略法が異なるべき：6壁誘導、5分身識別、4通常突きでガード崩し、3近距離維持、2予告LOCK後の回避、1複合判断。
- `config/lancers-tuning.json`、ランク10〜8位の確定バランス・操作、基本操作、素材ライセンス、ゲームの核となるルールは**変更前にユーザー承認**を得る。
- 新たな攻撃力・HP・時間・追従係数・判定半径などのバランス数値を根拠なく変更しない。変更が必要なときは、変更前の測定値、仮説、副作用、採用・撤回条件を先に提示する。
- 既存ファイルの無関係なリファクタリング、広範囲の整形、依存関係の無断更新は禁止。
- SE・BGMなど音に関する作業は「ゲーム音楽業界30年のプロ。キャラクターや世界観を踏襲した音作りが得意で、常に最短技術と効率化を図る」という設定のもとで行う。

## 1課題ごとの作業手順
1. `git status` と最新 `origin/main`、未完了PRを確認。未コミットのユーザー変更は保護し、破棄しない。
2. 変更前に**実際の画面と通常入力**で再現を試み、環境・画面サイズ・操作・結果・証拠を記録。実操作できなければ明示。
3. 問題を P0（起動不能）/P1（進行不能・誤判定）/P2（操作・視認・攻略偏り）/P3（軽微）に分類。
4. 「観察→原因仮説→最小修正→期待する変化→副作用→合格条件」をPRに記す。
5. 課題ごとに `claude/<issue>-<topic>` の専用ブランチを作る。同時に複数のClaudeセッションが動く場合も、同じファイルを並行して編集しない。
6. 修正後は同じ入力で再操作し、別条件と退行を確認。画面の証拠と実行ログを保存。
7. PRを作り、GitHub Actionsの `validate concatenated source` と `Factory browser smoke` を確認する。パス条件で起動しなかったワークフローは **未実行** として扱い、必要なら `workflow_dispatch` で実行。
8. **独立レビュー**：差分を書いたコンテキストとは別のサブエージェント（実装に関与していないもの）に、PR差分・課題の合格条件・要承認事項の一覧だけを渡してレビューさせる。指摘はPRに記録し、対応または理由付きで却下する。
9. CIが全て成功し、QAの再現手順でも改善を確認し、独立レビューで未解決の指摘がなく、要承認事項に触れず、競合がないことを確認した場合のみmainへsquash merge。デプロイ結果はPagesのworkflowで確認。失敗・不明・未検証のときはマージしない。
10. PRに実測、未検証範囲、証拠リンク、コミット、公開反映状況を日本語で記載。

## 検証コマンドの基準
```bash
cat src/game01.txt src/game02.txt src/layout-fix.txt src/practice-flow-fix.txt src/balance-ui-fix.txt src/rank-timer-fix.txt src/game03.txt src/game04.txt src/game05.txt src/game06.txt src/game07.txt > /tmp/lancers_runtime.py
python -m py_compile /tmp/lancers_runtime.py
python tests/rank9_five_battle_regression.py
python tests/ranker_factory_contract.py
python tests/beginner_ux_contract.py
python tests/ranks_7_to_1_regression.py
```
ブラウザ実操作テストは、CI `.github/workflows/factory-browser-smoke.yml` を優先する。ローカルで再現するならHTTPサーバー・Playwright・Chromiumを準備し `node tests/main_game_real_browser_qa.mjs` を実行する。ネットワーク、音声、端末差による失敗はログを確認して切り分ける。

## 次の開発課題
`docs/qa-2026-10-15-rank6-1-plan.md` §7 の順に進める：
1. ランク6〜1の戦法比較ヘッドレステスト（現状値を基準として記録）
2. `?qa=1` 時のみ動く読み取り専用テレメトリ（ゲーム挙動は不変）
3. 本編ブラウザ戦闘QA（通常操作で勝利・敗北・再戦・ランク復帰・溜め・外周操作）
4. QA-101 勝利バナーの誤表示修正
QA-104〜109（ハメ・分身・判定・評価秒数）は要承認事項。測定値と案を提示してから着手する。

## 報告フォーマット
日本語で「環境と版／実際に操作した内容と回数／課題ID・優先度／修正内容／修正前後の証拠／CI・実操作の合否／独立レビューの結果／未検証事項／PR・マージ・Pages状態／次の判断」を簡潔に報告。「構文成功」「状態遷移成功」「シミュレーション成功」を「実プレイ済み」と表現しない。
