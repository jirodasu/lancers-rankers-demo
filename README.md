# Lancers Rankers Demo

Pyxelで制作中の「ランサーズ・ランカーズ」体験版です。

## 調整値の正規ソース

UI配置、HITSTOP、HITエフェクト、被弾リアクション、画面揺れ、SE設定など、LANCERS DEV EDITORで採用した調整値の正規ソースは次です。

`config/lancers-tuning.json`

本編ソース内に同じ数値がハードコードされていても、正規設定と競合する場合はこのJSONを優先します。ChatGPT / Codex / その他の開発エージェントは、関連修正の前にこのファイルと `AGENTS.md` を確認し、無関係な変更で採用済みパラメーターを上書きしないでください。

DEV EDITOR: `/dev-editor/`

## DEV EDITORから本編へ実装

DEV EDITORの「本編へ実装」は、認証情報をエディターへ入力しません。現在値と正規設定の差分からGitHub Issueの確認画面を作り、リポジトリ所有者がIssueを送信すると `.github/workflows/apply-dev-editor.yml` が所有者・schema・基準版を検証します。検証後、`config/lancers-tuning.json` をmainへコミットし、GitHub Pagesの再ビルドを要求します。

古いエディターを開いたまま別の更新が入った場合は、基準版の不一致として実装を停止します。
