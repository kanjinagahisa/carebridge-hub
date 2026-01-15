# Networkタブでのリクエストヘッダー確認ガイド

## 確認すべき情報

### ステップ1: Networkタブを開く

1. ブラウザの開発者ツールを開く（F12または右クリック → 「検証」）
2. **「Network」タブ**をクリック
3. フィルターに `facilities` と入力して、施設作成リクエストのみを表示

### ステップ2: 施設作成を試行

1. ブラウザで `/setup/create` を開く
2. 施設名を入力（例：「テスト施設」）
3. **「施設を作成する」ボタン**をクリック

### ステップ3: リクエストの詳細を確認

1. Networkタブで、`facilities?select=*` へのリクエストをクリック
2. **「Headers」タブ**を開く
3. **「Request Headers」**セクションを確認

### 確認すべき項目

#### 1. Authorizationヘッダー
- `Authorization: Bearer <token>` が存在するか
- トークンが正しく設定されているか（空でないか）

#### 2. apikeyヘッダー
- `apikey: <anon_key>` が存在するか
- 正しいanonキーが設定されているか

#### 3. Content-Typeヘッダー
- `Content-Type: application/json` が存在するか

#### 4. リクエストURL
- URLが正しいか（`/rest/v1/facilities?select=*`）

### ステップ4: レスポンスの詳細を確認

1. **「Response」タブ**を開く
2. エラーメッセージの全文を確認
3. **「Preview」タブ**も確認（JSON形式で表示される場合がある）

## 期待される結果

### 正常な場合
- `Authorization: Bearer <長いトークン>` が存在する
- `apikey: <anon_key>` が存在する
- レスポンスステータス: `201 Created`
- レスポンスボディ: 作成された施設のJSONデータ

### エラーの場合
- `Authorization`ヘッダーが存在しない、または空
- レスポンスステータス: `403 Forbidden`
- レスポンスボディ: `{"message":"new row violates row-level security policy for table \"facilities\""}`

## 次のステップ

Networkタブで確認した結果を共有してください。特に：
1. **Authorizationヘッダーが存在するか**
2. **Authorizationヘッダーの値（最初の20文字程度でOK）**
3. **レスポンスステータスコード**
4. **レスポンスボディの全文**

これらの情報を基に、適切な修正案を提案します。












