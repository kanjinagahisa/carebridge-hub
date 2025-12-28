# API Gatewayログでのエラー確認ガイド

## 重要な発見

PostgRESTログに以下のメッセージが表示されています：
> "Only errors are captured into PostgREST logs by default. Check the API Gateway logs for HTTP requests."

これは、**HTTPリクエストの詳細（403エラーなど）はAPI Gatewayログで確認する必要がある**ことを示しています。

## API Gatewayログの確認方法

### ステップ1: API Gatewayログに切り替える

1. Supabaseダッシュボードの左サイドバーで、**「API Gateway」**をクリック
2. PostgRESTではなく、**API Gateway**のログを表示

### ステップ2: 時間範囲を広げる

1. 「Last hour」または「Last 5 minutes」を選択
2. 施設作成を試行した時刻を含む範囲に設定

### ステップ3: 検索フィルターを設定

「Search events」フィールドに以下を入力：
- `facilities` - 施設テーブルに関連するリクエスト
- `403` - 403エラーレスポンス
- `/rest/v1/facilities` - 施設テーブルへのリクエスト

### ステップ4: ログエントリを確認

各ログエントリをクリックして、以下を確認：
- **HTTPステータスコード**（403が表示されているか）
- **リクエストヘッダー**（`Authorization: Bearer <token>`が含まれているか）
- **レスポンスボディ**（エラーメッセージの全文）
- **タイムスタンプ**（施設作成を試行した時刻と一致するか）

## 確認すべき具体的なログパターン

### パターンA: 403エラーレスポンス
```
POST /rest/v1/facilities?select=* HTTP/1.1
Status: 403 Forbidden
Response: {"message":"new row violates row-level security policy for table \"facilities\""}
```

### パターンB: リクエストヘッダーが欠落している場合
```
POST /rest/v1/facilities?select=* HTTP/1.1
Headers: (Authorizationヘッダーが存在しない)
Status: 401 Unauthorized
```

### パターンC: 正常なリクエスト（エラーなし）
```
POST /rest/v1/facilities?select=* HTTP/1.1
Status: 201 Created
Response: {"id":"...","name":"...","type":"other"}
```

## 次のステップ

1. **API Gatewayログに切り替える**
2. **時間範囲を「Last 5 minutes」または「Last hour」に設定**
3. **施設作成を再試行する**
4. **すぐにAPI Gatewayログを確認する**
5. **403エラーまたは関連するログエントリを探す**

特に、以下の情報を確認してください：
- HTTPステータスコード（403かどうか）
- リクエストヘッダー（`Authorization`ヘッダーが存在するか）
- レスポンスボディ（エラーメッセージの全文）
- タイムスタンプ（施設作成を試行した時刻と一致するか）












