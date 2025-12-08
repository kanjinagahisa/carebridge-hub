# 403エラーの詳細確認手順

## 現在の状況

API Gatewayログで`403 POST /rest/v1/facilities`が確認されました。これは、施設作成リクエストが403 Forbiddenエラーで失敗していることを示しています。

## 確認すべき情報

### ステップ1: API Gatewayログの詳細を確認

1. SupabaseダッシュボードのAPI Gatewayログで、**`403 POST /rest/v1/facilities`のログエントリをクリック**
2. 以下の情報を確認してください：

#### リクエストヘッダー（Request Headers）
- `Authorization: Bearer <token>`が存在するか
- `apikey`ヘッダーが正しく設定されているか
- リクエストURLが正しいか（`/rest/v1/facilities?select=*`）

#### レスポンスボディ（Response Body）
- エラーメッセージの全文
- 例：`{"message":"new row violates row-level security policy for table \"facilities\""}`

#### レスポンスヘッダー（Response Headers）
- HTTPステータスコード（403）
- エラーの詳細情報

### ステップ2: 確認結果を共有

以下の情報を共有してください：
1. **リクエストヘッダー**（特に`Authorization`ヘッダーが存在するか）
2. **レスポンスボディ**（エラーメッセージの全文）
3. **タイムスタンプ**（施設作成を試行した時刻）

## 考えられる原因

### 原因1: JWTトークンが正しく送信されていない
- `Authorization`ヘッダーが存在しない、または形式が正しくない
- トークンが期限切れ、または無効

### 原因2: PostgRESTがJWTトークンを正しく検証できていない
- JWTシークレットが正しく設定されていない
- PostgRESTの設定に問題がある

### 原因3: RLSポリシーが正しく評価されていない
- `auth.uid()`が`NULL`として評価されている
- RLSポリシーの条件が正しく設定されていない

## 次のステップ

API Gatewayログの詳細を確認した後、結果を共有してください。それに基づいて、適切な修正案を提案します。











