# src/custom/ — 顧客固有の追加・オーバーライド領域

このディレクトリは、このマスターテンプレートを実案件（顧客リポジトリ）へ
複製した際に、その案件だけに必要なコンポーネント・ユーティリティ・
スクリプトを追加するための場所です（`納品済みの顧客テンプレートの
一括アップデート.md`「② コンフリクトを防ぐ構造分離の原則」参照）。

## 運用ルール

- **マスターテンプレート側ではこのディレクトリを空のまま維持します**
  （コア機能は `src/core/` 側に実装すること。`src/admin/config/custom.yml`
  ＝Decap CMS設定の顧客固有プレースホルダーと対になる構成です）。
- **顧客リポジトリでは、このディレクトリにのみ追記します**。
  `src/core/` 配下はマスターからの一括アップデート（`multi-gitter`
  による一斉PR発行）で丸ごと上書きされる想定のため、ここに顧客固有の
  変更を書き込むと次回アップデートで失われます。
- インポートは `@custom/*` パスエイリアス（`src/custom/*` を指す。
  `tsconfig.json` / `astro.config.mjs` の `vite.resolve.alias` で
  定義済み）経由で行ってください。

## 想定する使い方

```
src/custom/
  components/
    CampaignBanner.astro   ← 顧客独自の追加コンポーネント
  lib/
    campaign.ts             ← 顧客独自のユーティリティ
```

`src/pages/*.astro` から参照する場合：

```astro
---
import CampaignBanner from '@custom/components/CampaignBanner.astro';
---
```

`src/core/` 側のコンポーネントを顧客専用の見た目へ差し替えたい場合は、
`src/pages/index.astro` 等の呼び出し側で `@core/components/Xxx.astro`
の代わりに `@custom/components/Xxx.astro`（同名・同インターフェースで
上書きしたもの）を import するよう変更してください（コンポーネント自体を
`src/core/` 内で直接書き換えると、次回の一括アップデートで上書きされて
しまうため）。
