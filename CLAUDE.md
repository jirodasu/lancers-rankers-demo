# CLAUDE.md — ランサーズ・ランカーズ / Claude Code Web

## あなたの役割と権限
Claude Code は **実装・デバッグ・QAの主担当**。ユーザーは仕様・優先順位の最終決定者。ChatGPT/Codexは設計相談と独立レビューを担当し得るが、エージェント間でチャットの記憶は共有されない。GitHub の main、PR、Issue、`AGENTS.md`、本ファイル、`docs/` を共通の記録とする。

ユーザーから、**既存仕様の範囲内の修正については、テスト合格後の main へのマージまで**許可されている。ただし、以下の「要承認事項」は独断で変更しない。main への直接 push、force push、履歴書き換えは禁止。ブランチ → PR → 必須テスト・差分確認 → squash merge を原則とする。GitHub Pages への反映は main へのマージに連動するため、本番公開と同じ扱いで慎重に行う。

## 最優先で読む
1. `AGENTS.md`（本ファイルよりもゲームの確定設定について優先）
2. `config/lancers-tuning.json`（正本。ユーザーの明示的な指示なしに変更禁止）
3. `docs/rank6-1-combat-redesign.md`（ランク6〜1位の攻略設計と未検証事項）
4. `docs/qa-2026-10-14-main-game.md`（起動問題の証拠、QAの限界）
5. `.github/workflows/validate-source.yml` と `.github/workflows/factory-browser-smoke.yml`
6. 関連する最新の Issue / PR / main の履歴

## プロジェクト構成
- 公開URL: https://jirodasu.github.io/lancers-rankers-demo/
- ソース: `src/game01.txt`〜`src/game07.txt`、各種 `src/*-fix.txt`。これらは**単体で独立したPythonファイルではない**。
- `index.html` がランタイム断片を所定順で結合し、Pyxel実行とJavaScript UIを起動する。HTML中には文字列置換によるランタイムパッチがあるため、`src/` 変更時にはブート処理との互換性も確認する。
- `dev-editor/` は別の編集UI。GAME EDITORのブラウザテストは本編の実プレイ検証ではない。
- `tests/main_game_real_browser_qa.mjs` は本編をPlaywright Chromium（390×844、タッチ対応エミュレーション）で起動・操作し、`qa-artifacts/` にスクリーンショットとログを保存する。
- `tests/ranks_7_to_1_regression.py` の30回はボス状態遷移シミュレーションであり、30回のフル戦闘プレイではない。
- iPhone Safari実機の確認はChromiumのエミュレーションと区別する。

## ゲームの核と要承認事項
- プレイヤーは槍を操作してボスを攻略する。勝敗に影響する操作判断、予告と当たり判定の整合性、手触りを重視する。
- ランク6〜1位は攻略法が異なるべき：6壁誘導、5分身識別、4通常突きでガード崩し、3近距離維持、2予告LOCK後の回避、1複合判断。
- `config/lancers-tuning.json`、ランク10〜8位の確定バランス・操作、素材ライセンス、ゲームの核となるルールは**変更前にユーザー承認**を得る。
- 新たな攻撃力・HP・時間・追従係数などのバランス数値を根拠なく変更しない。変更が必要なときは、変更前の測定値、仮説、副作用、採用・撤回条件を先に提示する。
- 既存ファイルの無関係なリファクタリング、広範囲の整形、依存関係の無断更新は禁止。

## 1課題ごとの作業手順
1. `git status` と最新 `origin/main`、未完了PRを確認。未コミットのユーザー変更は保護し、破棄しない。
2. 変更前に**実際の画面と通常入力**で再現を試み、環境・画面サイズ・操作・結果・証拠を記録。実操作できなければ明示。
3. 問題を P0（起動不能）/P1（進行不能・誤判定）/P2（操作・視認・攻略偏り）/P3（軽微）に分類。
4. 「観察→原因仮説→最小修正→期待する変化→副作用→合格条件」をPRに記す。
5. 課題ごとに `claude/<issue>-<topic>` など専用ブランチを作る。複数セッションが同じファイルを編集しないよう調整。
6. 修正後は同じ入力で再操作し、別条件と退行を確認。画面の証拠と実行ログを保存。
7. PRを作り、GitHub Actionsの `validate concatenated source` と `Factory browser smoke` を確認する。パス条件で起動しなかったワークフローは **未実行** として扱い、必要なら `workflow_dispatch` で実行。
8. CIが全て成功し、QAの再現手順でも改善を確認し、要承認事項に触れず、競合・他者のPRがないことを確認した場合のみmainへsquash merge。デプロイ結果はPagesのworkflowで確認。失敗・不明・未検証のときはマージしない。
9. PRに実測、未検証範囲、証拠リンク、コミット、公開反映状況を日本語で記載。

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

## AI同士の競合防止
- mainは唯一の統合基準。作業開始時・PR作成前・マージ直前に更新を確認。
- Claude Codeが**実装オーナー**。ChatGPTは原則、設計レビュー・QA報告・Issue整理。ChatGPTがコード修正する場合は別ブランチ・別課題・別ファイル範囲を明示する。
- 同一箇所の変更を並行して始めない。PRに対象ファイル、課題ID、変更禁止範囲を記載。
- コンフリクトは勝手に `ours`/`theirs` で一括解決しない。仕様差分を比較してから解決する。
- GitHub AppのPR自動修正機能を使う場合も、許可済みの範囲だけを対象にする。
- CLAUDE.mdは協業ルールでありGitHubの強制権限設定ではない。必要に応じてGitHubのブランチ保護・必須チェックを別途設定する。

## 最初の開発課題
まずは**調査のみ・コード変更なし**。v5.4.0以降のmainを確認し、ランク6〜1位の「固有攻略を使う場合／使わない場合」のフル戦闘を通常入力で比較するための実行可能なQA計画を立てる。現行の本編Playwrightテストで未検証の勝利・敗北・リトライ・攻撃命中・長押し・画面端操作を特定し、最初に直すべきP0/P1課題があれば再現手順と証拠を提出する。初回調査後、既存仕様内の実装修正・PR作成・CI成功後のマージはこの文書のルールに従って進めてよい。

## 報告フォーマット
日本語で「環境と版／実際に操作した内容と回数／課題ID・優先度／修正内容／修正前後の証拠／CI・実操作の合否／未検証事項／PR・マージ・Pages状態／次の判断」を簡潔に報告。「構文成功」「状態遷移成功」を「実プレイ済み」と表現しない。
