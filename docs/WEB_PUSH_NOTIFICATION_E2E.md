# Web Push通知 E2Eテスト手順

## 概要

利用者タイムラインに新規投稿が作成されたら、同じfacilityの"通知ON"ユーザーにWeb Push通知を送信する機能のE2Eテスト手順です。

## 前提条件

1. 開発サーバーが起動している（`npm run dev`）
2. Supabaseのマイグレーションが適用されている（特に `068_add_facility_id_to_push_subscriptions.sql`）
3. 環境変数が設定されている：
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`（オプション、デフォルト: `mailto:admin@example.com`）

## VAPIDキーの生成方法

```bash
npx web-push generate-vapid-keys
```

出力された公開鍵と秘密鍵を環境変数に設定してください。

## テスト手順

### 1. 準備：2つのブラウザで異なるユーザーでログイン

#### ブラウザA（投稿者）
1. ブラウザAでアプリにアクセス
2. ユーザーAでログイン（facility_id: `facility-1`）
3. 利用者タイムラインページ（`/clients/{clientId}/timeline`）に移動

#### ブラウザB（通知受信者）
1. ブラウザBでアプリにアクセス
2. ユーザーBでログイン（同じfacility_id: `facility-1`、ユーザーAとは異なるユーザー）
3. 利用者タイムラインページ（`/clients/{clientId}/timeline`）に移動
4. **Web Push通知の許可を求めるダイアログが表示されたら「許可」をクリック**
5. ブラウザの開発者ツール（F12）を開き、Consoleタブを表示

### 2. Web Push通知の購読確認

#### ブラウザBで購読を確認
1. ブラウザBのConsoleで以下を実行して購読状態を確認：
   ```javascript
   // Service Workerが登録されているか確認
   navigator.serviceWorker.ready.then(reg => {
     console.log('Service Worker ready:', reg)
   })
   
   // 通知許可状態を確認
   console.log('Notification permission:', Notification.permission)
   ```

2. 購読が完了していることを確認（`/api/push/subscribe` が呼ばれているはず）

### 3. 投稿作成と通知送信の確認

#### ブラウザAで投稿を作成
1. ブラウザAで利用者タイムラインページに移動
2. テキストエリアに投稿内容を入力（例：「今日は元気でした」）
3. 「送信」ボタンをクリック
4. 投稿が作成されることを確認

#### ブラウザBで通知を受信
1. ブラウザBで通知が表示されることを確認
   - タイトル: "CareBridge Hub｜新着投稿"
   - 本文: "{投稿者名}さんが「{利用者名}」さんのタイムラインに投稿しました"
2. 通知をクリックして、利用者タイムラインページに遷移することを確認

### 4. サーバーログの確認

#### ブラウザA（投稿者）のConsole
投稿作成時に以下のログが表示されることを確認：
```
[ClientPostComposer] Push notification sent: { ok: true, result: { success: 1, failed: 0, deleted: 0 } }
```

#### サーバーログ（ターミナル）
以下のログが表示されることを確認：
```
[push/notify][POST] start
[push/notify][POST] Sending notifications to facility: {facility_id}
[push] Sending notifications to 1 subscribers
[push] Successfully sent notification to user {user_id}
[push] Notification send result: { success: 1, failed: 0, deleted: 0 }
[push/notify][POST] Notification send result: { success: 1, failed: 0, deleted: 0 }
```

### 5. エラーケースの確認

#### 無効なendpointの削除確認
1. ブラウザBの購読情報を手動で無効化（Supabaseの`push_subscriptions`テーブルから該当レコードを削除、またはendpointを変更）
2. ブラウザAで再度投稿を作成
3. サーバーログで以下のログが表示されることを確認：
   ```
   [push] Subscription expired (410), deleting: {endpoint}
   [push] Notification send result: { success: 0, failed: 0, deleted: 1 }
   ```

## 期待される動作

### 正常系
- ✅ 同じfacilityのユーザーに通知が送信される
- ✅ 投稿者本人には通知が送信されない
- ✅ 通知をクリックすると利用者タイムラインページに遷移する
- ✅ 通知のタイトルと本文が正しく表示される

### 異常系
- ✅ 無効なendpoint（410 Gone / 404 Not Found）は自動的に削除される
- ✅ 通知送信の失敗は投稿作成を阻害しない
- ✅ VAPIDキーが設定されていない場合は通知送信をスキップする（警告ログのみ）

## トラブルシューティング

### 通知が表示されない場合

1. **通知許可の確認**
   - ブラウザの設定で通知が許可されているか確認
   - `Notification.permission` が `"granted"` であることを確認

2. **Service Workerの確認**
   - Service Workerが正しく登録されているか確認
   - ブラウザの開発者ツール > Application > Service Workers で確認

3. **VAPIDキーの確認**
   - 環境変数が正しく設定されているか確認
   - VAPIDキーが正しく生成されているか確認

4. **購読情報の確認**
   - Supabaseの`push_subscriptions`テーブルに正しく登録されているか確認
   - `facility_id`が正しく設定されているか確認

5. **サーバーログの確認**
   - エラーログがないか確認
   - 通知送信のログが表示されているか確認

### 通知が複数回表示される場合

- 同じユーザーが複数の端末・ブラウザで購読している可能性があります
- これは正常な動作です（端末・ブラウザ単位で購読情報が保存されます）

## コミットコマンドとコミットメッセージ案

```bash
git add .
git commit -m "feat: 利用者タイムライン投稿作成時にWeb Push通知を送信

- web-pushパッケージを追加
- push_subscriptionsテーブルにfacility_idカラムを追加（マイグレーション068）
- lib/server/push.tsにWeb Push送信ロジックを実装
- /api/push/notifyエンドポイントを追加
- ClientPostComposerで投稿作成後に通知送信APIを呼び出し
- 410 Gone / 404 Not Foundのendpointを自動削除
- 投稿者本人は通知対象から除外
- 送信結果をログ出力（success/fail/delete件数）"
```


