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

### 外部JSON設定によるマップスタイル管理の実装
**実装内容**:
1. **JSONファイル作成** - `/public/map-styles.json`でマップスタイル設定を外部管理
   - 国土地理院ベクタ地図、航空写真、OpenStreetMap Japanの3スタイル定義
   - デフォルトスタイルの指定機能
2. **LayerSwitcherControl.tsx改良** - 動的スタイル読み込みとボタン+ドロップダウンUI
   - システム起動時にJSONファイルから設定読み込み
   - ラジオボタンからドロップダウンメニューに変更
   - ボタンは▼アイコンのみ表示（ベースマップ名は非表示）
3. **App.tsx更新** - 外部設定への対応
   - 起動時の非同期データ読み込み処理
   - スタイル設定の動的反映

### オーバーレイレイヤ機能の実装
**実装内容**:
1. **JSONファイル作成** - `/public/overlay-layers.json`でオーバーレイレイヤ設定を管理
   - 洪水浸水想定区域、土砂災害警戒区域、鉄道路線、等高線の4レイヤ定義
   - 各レイヤのタイプ（raster/vector）、ソース、スタイル設定
2. **OverlayControl.tsx作成** - オーバーレイレイヤ管理コンポーネント
   - 📋アイコンボタンでモードレスダイアログを表示
   - ドラッグ可能なヘッダーバー付きダイアログ
   - 各レイヤの表示/非表示切り替え機能
   - 透過率制御（0-100%、100が最も透過）
   - レイヤードラッグ&ドロップによる表示順序変更
3. **App.tsx統合** - オーバーレイレイヤのレンダリング
   - LayerStateによるレイヤ状態管理
   - 透過率に応じたraster-opacity/line-opacity/fill-opacityの動的設定
   - レイヤ順序に基づく重ね合わせ表示

### UIの改善
**変更内容**:
1. **LayerSwitcherControl** - ボタンのアイコン化（▼のみ表示）
2. **OverlayControl** - モードレスダイアログの実装
   - 背景オーバーレイなしで画面左上に固定配置から移動可能に変更
   - ヘッダーバーのドラッグで位置変更機能
   - 閉じるボタンを「閉じる」テキストから✕アイコンに変更
3. **スライダー機能** - 透過率制御の改善
   - カスタムCSSによるスライダーつまみの拡大（18px×18px）
   - ドラッグ中の一時値表示機能
   - マウスボタン離し時の確定値適用
   - レイヤードラッグとスライダードラッグの競合解決

### 技術的改善点
**実装内容**:
1. **TypeScript型定義** - MapStyleConfig、LayerState、OverlayLayerConfigの追加
2. **イベント処理** - stopPropagation()による競合回避
3. **状態管理** - useStateによる複雑な状態の管理
4. **CSSスタイリング** - カスタムスライダーとドラッグ&ドロップの視覚的フィードバック
5. **ファイル構造** - `/public/`での設定ファイル管理、`src/`でのコンポーネント分離

### PMTilesベースの注記レイヤ機能実装
**実装内容**:
1. **注記レイヤの復活と修正** - 等高線数値、地名、駅名の日本語テキスト表示
   - `Anno` source-layerからの地名・駅名データ取得
   - `Cntr` source-layerからの等高線数値データ取得
   - PMTiles vectorタイルの正しいフィールド名特定（`vt_text`, `vt_alti`）

2. **glyphsエラーの解決**
   - map-styles.jsonの全スタイルに`glyphs`プロパティを追加
   - 国土地理院標準glyphsの参照（`https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf`）
   - 航空写真・背景なしスタイルへのglyphsとsprite設定追加

3. **std.json参照の修正**
   - 外部std.json URLからローカル`/std.json`参照に変更（net::ERR_CONNECTION_RESETエラー解決）
   - ローカルstd.jsonファイルの活用

4. **透過率初期値の調整**
   - オーバーレイレイヤの初期透過率を70%から30%に変更（App.tsx:84行目）
   - より見やすい初期設定の提供

**技術的成果**:
1. **データフィールドの特定**
   - std.jsonから実際のフィールド名`vt_text`（注記）、`vt_alti`（標高）を特定
   - PMTilesのsource-layer構造の理解（`Anno`, `Cntr`の動作確認）

2. **レイヤ設定の最適化**
   - ftCodeによる地物分類フィルタリング（411-422: 市町村・県名, 521-534: 駅名・施設）
   - ズームレベル応答テキストサイズ（`interpolate`）
   - 適切なtext-anchorとtext-placementの設定

3. **デバッグプロセス**
   - 段階的テストレイヤによる問題特定
   - source-layer別動作確認（Cntr ✅, Anno ✅, AdmArea ❌）
   - フィールド名とフォントレンダリングの分離検証

**最終的な注記レイヤ構成**:
- **等高線数値**: `vt_alti`フィールド、茶色表示、12px
- **地名（市町村・県名）**: `vt_text`フィールド、ftCode 411-422フィルタ、濃紺色、ズーム応答サイズ
- **駅名・施設名**: `vt_text`フィールド、暗赤色、12px

### グループベースオーバーレイシステムの実装
**実装日**: 2025年9月30日

**背景と要求**:
従来の単一ファイル（`overlay-layers.json`）によるフラットなオーバーレイ管理から、階層的なグループベースシステムへの完全移行を実施。ユーザビリティ向上と設定ファイル管理の効率化を目的とした。

**アーキテクチャ変更**:
1. **カタログベース設計**
   - `/public/layercat.json` - グループ定義と参照ファイルのカタログ
   - `/public/disaster-map.json` - ハザードマップグループの設定
   - `/public/overlay-layers.json` - 地理院ベクトルタイルグループの設定

2. **動的ローディングシステム**
   ```typescript
   // 新しいインターフェース群
   interface LayerCatalogGroup {
     id: string;
     name: string;
     file: string;
     format?: string;
   }

   interface GroupLayersData {
     [groupId: string]: OverlayLayersData;
   }
   ```

**ファイル構造の変更**:
```
public/
├── layercat.json          # グループカタログ（新規）
├── disaster-map.json      # ハザードマップ定義（既存活用）
└── overlay-layers.json    # 地理院ベクトルタイル定義（既存転用）
```

**OverlayControl.tsx 完全リライト**:
1. **階層UI実装**
   - グループ名の一覧表示（初期状態）
   - グループクリックで展開/折りたたみ機能
   - ▼アイコンの回転アニメーション
   - グループ内レイヤリストの動的表示

2. **動的ローディング**
   ```typescript
   const handleGroupToggle = async (groupId: string) => {
     // グループ初回展開時に定義ファイルを読み込み
     if (!loadedGroups.has(groupId) && catalog) {
       await loadGroupLayers(groupId, groupInfo.file);
       setLoadedGroups(prev => new Set(prev).add(groupId));
     }
   };
   ```

3. **状態管理の改善**
   - `expandedGroups`: 展開中のグループ管理
   - `loadedGroups`: ロード済みグループ管理
   - レイヤ状態の動的初期化（デフォルト値: `visible: false, opacity: 30`）

**App.tsx の統合**:
1. **初期化処理の変更**
   ```typescript
   Promise.all([
     loadMapStyles(),
     loadLayerCatalog()  // overlay-layers.json → layercat.json
   ]).then(([stylesData, catalogData]) => {
     setLayerStates([]);  // 空の初期状態、グループ展開時に動的追加
   });
   ```

2. **レイヤレンダリングの改善**
   - 全グループ横断検索によるレイヤ設定特定
   - グループIDに関係なく統一的なレイヤ管理

**UI/UX の向上**:
1. **直感的な階層ナビゲーション**
   - 「ハザードマップ」「地理院ベクタタイル」のグループ単位表示
   - ワンクリックでのグループ内容表示/非表示

2. **グループ内ドラッグ&ドロップ**
   - グループ内でのレイヤ順序変更機能維持
   - グループ境界を越えた移動は制限

3. **設定の継承**
   - 既存の透過率制御とスライダー機能
   - チェックボックスによる表示/非表示制御

**技術的解決事項**:
1. **初期レイヤ状態問題**
   - 問題: `layerStates`が空の場合、`find()`が`undefined`を返してレイヤが表示されない
   - 解決: デフォルトレイヤ状態オブジェクトの動的生成
   ```typescript
   const layerState = layerStates.find(ls => ls.id === layerId) || {
     id: layerId, visible: false, opacity: 30
   };
   ```

2. **JSON構文エラー修正**
   - `disaster-map.json`の末尾構文エラー修正（`},}`→`}}`）

**運用上の利点**:
1. **スケーラビリティ**: 新しいレイヤグループの追加が容易
2. **保守性**: グループごとの設定分離により管理効率向上
3. **UX向上**: 階層的表示による視認性とナビゲーション改善
4. **設定管理**: カタログシステムによる一元的な構成管理

**検証済み機能**:
✅ グループ一覧表示
✅ グループ展開/折りたたみ
✅ レイヤ動的ロード
✅ レイヤ表示切り替え
✅ 透過率制御
✅ グループ内ドラッグ&ドロップ
✅ 複数グループ同時展開対応