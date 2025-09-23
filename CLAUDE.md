# CLAUDE.md

このファイルは、このリポジトリでコードを作業する際のClaude Code（claude.ai/code）へのガイダンスを提供します。

## 開発コマンド

- `npm run dev` - ホットリロード付きで開発サーバーを起動
- `npm run build` - 本番用ビルド（TypeScriptコンパイラを実行してからViteビルド）
- `npm run lint` - 全ファイルでESLintを実行
- `npm run preview` - 本番ビルドをローカルでプレビュー

## アーキテクチャ概要

これは`maplibre-react-components`ライブラリを使用してMapLibre GL JSの統合を実演するReact + TypeScript + Viteアプリケーションです。

### コアコンポーネント

- **App.tsx**: マップとすべてのインタラクティブ要素を含むメインアプリケーションコンポーネント
- **LayerSwitcherControl.tsx**: 異なるベースマップスタイル間を切り替えるためのカスタムマップコントロール
- **util.ts**: カスタムSVGアイコンファクトリとGeoJSONデータを含むユーティリティ関数

### MapLibre統合

アプリはMapLibre GL JSとReactの統合のために`maplibre-react-components`を使用しています：

- **RMap**: メインマップコンテナコンポーネント
- **RSource/RLayer**: データソースとレイヤーレンダリング
- **RGradientMarker**: グラデーションスタイリング付きカスタムマーカー
- **RNavigationControl**: 組み込みナビゲーションコントロール
- **useRControl**: カスタムマップコントロール作成用フック

### マップスタイル

LayerSwitcherControlは3つの異なるマップスタイルを管理します：
- 国土地理院ベクタ地図（バイナリベクタタイル、gsi-cyberjapan.github.io から）
- 航空写真（ラスタタイル、国土地理院 seamlessphoto から）
- OpenStreetMap Japan（tile.openstreetmap.jp から）

**重要な実装詳細**：
- `styles`オブジェクトはLayerSwitcherControl.tsxで定義され、App.tsxにインポートされる必要がある
- RMapコンポーネントの`mapStyle`プロパティは`styles[style]`で動的に設定される
- スタイル切り替えは`useState<StyleID>`で管理される

### データ構造

- 町境界データはutil.tsでGeoJSON Feature<Polygon>として定義（現在はフランスのMarignierの境界データ）
- 初期マーカーの位置は立川駅の座標[139.4075, 35.7011]でハードコード
- クリックインタラクションでクリック位置に一時的な星マーカーを追加

### スタイリング

アプリケーションは複数のCSSファイルをインポートしています：
- `maplibre-gl/dist/maplibre-gl.css` - コアMapLibreスタイル
- `maplibre-theme/icons.default.css` - デフォルトアイコンセット
- `maplibre-theme/modern.css` - モダンテーマ
- `maplibre-react-components/style.css` - コンポーネント固有のスタイル

### TypeScript設定

個別の設定でプロジェクト参照を使用：
- `tsconfig.json` - 参照付きルート設定
- `tsconfig.app.json` - アプリ固有の設定
- `tsconfig.node.json` - Node/Vite固有の設定

## 修正履歴

### マップスタイル切り替えの修正
**問題**: LayerSwitcherControlで選択したスタイルがRMapに反映されない

**原因**:
- `styles`オブジェクトがLayerSwitcherControl.tsxで定義されているが、App.tsxでインポートされていない
- App.tsxで`mapStyle={styles[style]}`を参照しているが`styles`が未定義

**修正内容**:
1. LayerSwitcherControl.tsx:6行目 - `styles`オブジェクトを`export const styles`に変更
2. App.tsx:30行目 - `styles`をインポートに追加
3. App.tsx:57行目 - `handleClick`の型を一時的に`any`に変更（TypeScriptエラー回避）

### Base Mapの変更と初期位置の更新
**変更内容**:
1. LayerSwitcherControl.tsx - `styles`オブジェクトを日本地図用に更新:
   - 国土地理院ベクタ地図（バイナリベクタタイル）
   - 航空写真（ラスタタイル、インラインスタイル定義）
   - OpenStreetMap Japan（日本語対応）
2. App.tsx - 初期位置を立川駅（東京都）に変更 [139.4075, 35.7011]
3. 初期スタイルを「国土地理院ベクタ地図」に設定

### Attribution（クレジット）の追加
**変更内容**:
1. LayerSwitcherControl.tsx - 航空写真スタイルにattributionを直接設定
   - 航空写真のsourcesにattribution: "© <a href=\"https://www.gsi.go.jp/\">国土地理院</a>"を追加
2. 外部スタイル（国土地理院ベクタ地図、OpenStreetMap Japan）は元のスタイルJSONのattributionを使用
3. **注意**: `maplibre-react-components`のRMapコンポーネントでは`attributionControl`プロパティは未対応