# Lancers Rankers Demo

Pyxelで制作中の「ランサーズ・ランカーズ」体験版です。

## 調整値の正規ソース

UI配置、HITSTOP、HITエフェクト、被弾リアクション、画面揺れ、SE設定など、LANCERS DEV EDITORで採用した調整値の正規ソースは次です。

`config/lancers-tuning.json`

本編ソース内に同じ数値がハードコードされていても、正規設定と競合する場合はこのJSONを優先します。ChatGPT / Codex / その他の開発エージェントは、関連修正の前にこのファイルと `AGENTS.md` を確認し、無関係な変更で採用済みパラメーターを上書きしないでください。

DEV EDITOR: `/dev-editor/`
