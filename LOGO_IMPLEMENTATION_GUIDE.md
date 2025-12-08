# ロゴ導入実装ガイド

## 📋 実装完了内容

### ✅ 1. ディレクトリ構造の作成

以下のディレクトリ構造を作成しました：

```
/public/assets/
  ├── logo/
  │   ├── logo-app-light.png  （ここに配置してください）
  │   ├── logo-app-dark.png   （将来ダークモード用・未使用）
  │   └── logo-print.png      （将来PDF帳票用・未使用）
  └── icon/
      ├── icon-192.png        （ここに配置してください）
      ├── icon-512.png        （ここに配置してください）
      ├── favicon.ico         （ここに配置してください）
      └── apple-touch-icon.png（ここに配置してください）
```

### ✅ 2. Logo.tsx の実装

**ファイル**: `components/Logo.tsx`

- テキストロゴから画像ロゴに変更
- Next.jsの`Image`コンポーネントを使用
- `priority`属性でパフォーマンス最適化
- `sizes`属性でレスポンシブ対応

**実装内容:**
- アプリ内表示用ロゴ（横長・文字なし）: `/assets/logo/logo-app-light.png`
- サイズ: 幅120px、高さ32px（高さは8 = 32pxに調整）

### ✅ 3. Header.tsx の実装

**ファイル**: `components/Header.tsx`

- ロゴをクリックすると`/home`に戻る機能を追加
- iPhoneノッチ対応（safe-area-inset）を追加

**実装内容:**
- `Link`コンポーネントでロゴをラップ
- `env(safe-area-inset-top)`でノッチ対応
- `env(safe-area-inset-left)`と`env(safe-area-inset-right)`で横方向の安全領域対応

### ✅ 4. app/layout.tsx の実装

**ファイル**: `app/layout.tsx`

- favicon設定を追加
- PWAアイコン設定を追加
- Apple Touch Icon設定を追加
- manifest.jsonの参照を追加

**実装内容:**
- Metadata APIを使用してfaviconとアイコンを設定
- テーマカラーを設定
- Apple Web App設定を追加
- viewport設定でviewport-fit=coverを追加（ノッチ対応）

### ✅ 5. manifest.json の作成

**ファイル**: `public/manifest.json`

- PWA用のマニフェストファイルを作成
- アイコン設定（192x192、512x512）
- アプリ名、説明、スタートURLを設定

## 📝 必要な画像ファイル

以下の画像ファイルを配置してください：

### アプリ内ロゴ（横長）

1. **`/public/assets/logo/logo-app-light.png`**
   - 横長ロゴ（文字なし）
   - 推奨サイズ: 幅240px × 高さ64px（@2x対応）
   - または幅120px × 高さ32px（標準）
   - フォーマット: PNG（透明背景可）

2. **`/public/assets/logo/logo-app-dark.png`**（将来用・今は未使用）
   - ダークモード用ロゴ
   - 現在は未使用ですが、将来の拡張用に配置予定

3. **`/public/assets/logo/logo-print.png`**（将来用・今は未使用）
   - PDF帳票用ロゴ
   - 現在は未使用ですが、将来の拡張用に配置予定

### アイコン用（正方形）

1. **`/public/assets/icon/icon-192.png`**
   - サイズ: 192×192px
   - PWAアイコン（小）
   - フォーマット: PNG

2. **`/public/assets/icon/icon-512.png`**
   - サイズ: 512×512px
   - PWAアイコン（大）
   - フォーマット: PNG

3. **`/public/assets/icon/favicon.ico`**
   - サイズ: 32×32px または 16×16px
   - ブラウザタブアイコン
   - フォーマット: ICO

4. **`/public/assets/icon/apple-touch-icon.png`**
   - サイズ: 180×180px
   - iOS用アプリアイコン
   - フォーマット: PNG

## 🎯 実装の特徴

### パフォーマンス最適化

- `priority`属性で初期表示のロゴを優先読み込み
- `sizes`属性でレスポンシブ画像最適化
- 静的ファイル配置で外部依存なし

### セキュリティ

- `public`ディレクトリのみ使用
- API経由での取得なし
- 外部CDN非依存

### iPhoneノッチ対応

- `env(safe-area-inset-top)`で上部安全領域対応
- `env(safe-area-inset-left)`と`env(safe-area-inset-right)`で横方向対応
- `viewport-fit=cover`で全画面表示対応

## ✅ 動作確認項目

### 1. ログイン画面

- [ ] ロゴが画面上部中央に表示される
- [ ] ロゴが正しいサイズで表示される
- [ ] ロゴの読み込みが速い（チラつかない）
- [ ] 既存のUIが壊れていない

### 2. ホーム画面 & Header

- [ ] 左上にロゴが表示される
- [ ] ロゴをクリックすると`/home`に遷移する
- [ ] iPhoneノッチでロゴが欠けない
- [ ] 既存のHeader機能が正常に動作する

### 3. PWA / favicon / スマホアイコン

- [ ] ブラウザタブにfaviconが表示される
- [ ] PWAとしてインストール時にアイコンが表示される
- [ ] iOSで「ホーム画面に追加」時にアイコンが表示される

### 4. コンソールエラー

- [ ] Consoleタブにエラーが出ていない
- [ ] 画像読み込みエラーがない
- [ ] リンクエラーがない

## 📝 注意事項

### 画像ファイルの配置

画像ファイルを配置する際は、以下の点に注意してください：

1. **ファイル名は正確に**
   - 大文字小文字を区別
   - 拡張子を正確に

2. **画像の最適化**
   - PNGファイルは軽量化（圧縮）することを推奨
   - 必要に応じてWebP形式も検討可能

3. **透明背景**
   - ロゴは透明背景でも可
   - ただし、白背景で見た時の見栄えを確認

### 既存UIの保護

- 既存のレイアウトを変更していない
- 既存のスタイルを変更していない
- 既存の機能を壊していない

## 🚀 次のステップ

1. **画像ファイルの配置**
   - デザイナーからロゴ画像を受け取る
   - 指定されたディレクトリに配置

2. **動作確認**
   - 各画面でロゴが正しく表示されることを確認
   - PWAアイコンが正しく表示されることを確認

3. **パフォーマンス確認**
   - 画像読み込み速度を確認
   - 初回表示時のチラつきがないことを確認

## 🔗 関連ファイル

- `components/Logo.tsx` - ロゴコンポーネント
- `components/Header.tsx` - Headerコンポーネント
- `app/layout.tsx` - ルートレイアウト
- `public/manifest.json` - PWAマニフェスト

