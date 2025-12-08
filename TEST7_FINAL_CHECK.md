# テスト7: パスワード変更完了メール送信 - 最終確認手順

## 📋 事前準備

✅ Resend APIキーが設定済みであることを確認
✅ 開発サーバーが起動していることを確認

---

## 📝 テスト手順（詳細版）

### ステップ1: 開発者ツールを開く

1. **ブラウザで開発者ツールを開く**
   - `F12` を押す
   - または、右クリック → 「検証」

2. **以下のタブを開く**
   - **Console** タブ（ログ確認用）
   - **Network** タブ（リクエスト確認用）
   - Networkタブのフィルターをクリア（必要に応じて `password-changed-notify` でフィルター）

---

### ステップ2: パスワード再設定フローを開始

1. **パスワード再設定メールを送信**
   - ブラウザで `http://localhost:3001/auth/forgot-password` にアクセス
   - テスト用メールアドレスを入力（例: `kanjinagatomi99@gmail.com`）
   - 「送信する」をクリック
   - 成功メッセージが表示されることを確認

2. **メール内のURLをクリック**
   - メールボックスを確認
   - Supabaseから送信されたパスワード再設定メールを開く
   - メール内のリンクをクリック
   - `/auth/reset-password` に遷移することを確認

---

### ステップ3: パスワードを更新

1. **新しいパスワードを入力**
   - パスワード入力欄に新しいパスワードを入力
   - 例: `Test123!newpass`
   - パスワード強度ルールを満たすことを確認（小文字・大文字・数字・記号を含む）

2. **「送信する」をクリック**
   - ボタンをクリック
   - ローディング状態（「設定中...」）になることを確認

3. **ログイン画面にリダイレクトされることを確認**
   - 自動的に `/login?message=password-reset-success` に遷移
   - 成功メッセージが表示される

---

### ステップ4: Consoleタブで確認

1. **Consoleタブを確認**
   - 以下のログが表示されることを確認：

   **成功時のログ:**
   ```
   [ResetPassword] Sending password changed notification email request...
   {userId: '...', email: '...'}
   
   [ResetPassword] Password changed notification response:
   {status: 200, data: {...}}
   
   [Email] Password changed email sent successfully:
   {to: '...', emailId: '...', timestamp: '...'}
   ```

   **エラー時のログ（メール送信に失敗した場合）:**
   ```
   [Email] Failed to send password changed email: ...
   [PasswordChangedNotify] Failed to send email: ...
   ```

2. **エラーがないことを確認**
   - 赤いエラーメッセージが出ていないことを確認
   - 上記のログが表示されていればOK

---

### ステップ5: Networkタブで確認

1. **Networkタブを確認**
   - フィルターに `password-changed-notify` と入力（必要に応じて）

2. **リクエストを確認**
   - `/api/auth/password-changed-notify` というリクエストが表示されることを確認
   - **Status**: `200`（成功）
   - **Type**: `fetch` または `xhr`

3. **リクエストの詳細を確認**
   - リクエストをクリック
   - **Request Payload** タブ:
     ```json
     {
       "userId": "...",
       "email": "kanjinagatomi99@gmail.com"
     }
     ```
   - **Response** タブ:
     ```json
     {
       "success": true,
       "message": "Password changed notification email sent successfully",
       "emailSent": true
     }
     ```

---

### ステップ6: メールボックスを確認

1. **メールボックスを開く**
   - テストで使用したメールアドレス（例: `kanjinagatomi99@gmail.com`）のメールボックスを開く

2. **メールを確認**
   - **件名**: 「パスワード変更のご連絡（CareBridge Hub）」
   - **送信者**: `CareBridge Hub <onboarding@resend.dev>` または設定した送信元アドレス

3. **メールの内容を確認**
   - 以下の内容が含まれていることを確認：
     - ✅ 「CareBridge Hub」のヘッダー
     - ✅ 「パスワード変更のご連絡」というタイトル
     - ✅ 「CareBridge Hub にて、パスワードの再設定が行われました。」
     - ✅ 「もしこのメールにお心当たりがない場合は...」という注意書き
     - ✅ 「このメールに返信はできません。」

4. **セキュリティ確認**
   - ✅ メール内に**パスワードそのもの**が含まれていない
   - ✅ メール内に**トークン**が含まれていない
   - ✅ パスワード変更時刻が記載されている（あれば）

---

### ステップ7: Resend Dashboardで確認（オプション）

1. **Resend Dashboardにアクセス**
   - https://resend.com/emails にアクセス
   - ログイン

2. **送信ログを確認**
   - 左側メニュー → 「Emails」をクリック
   - 最新の送信履歴を確認
   - 「パスワード変更のご連絡（CareBridge Hub）」という件名のメールが表示される
   - ステータスが「Delivered」または「Sent」であることを確認

---

## ✅ 期待される結果

### 成功パターン

- ✅ パスワード更新が成功する
- ✅ Consoleに成功ログが表示される
- ✅ Networkタブで `/api/auth/password-changed-notify` リクエストが `200` で成功
- ✅ メールボックスにメールが届く
- ✅ メールの件名が正しい
- ✅ メールの内容が正しい
- ✅ メール内にパスワードやトークンが含まれていない

### 失敗パターン（メール送信のみ失敗）

- ⚠️ パスワード更新は成功する
- ⚠️ ログイン画面にリダイレクトされる
- ⚠️ メールが届かない
- ⚠️ Consoleにメール送信エラーが表示される
- ⚠️ Networkタブでレスポンスに `emailSent: false` が含まれる

**注意**: メール送信が失敗しても、パスワード更新自体は成功しているため、エラーは無視されます。

---

## 🔍 トラブルシューティング

### メールが届かない場合

1. **Resend APIキーを確認**
   - `.env.local` ファイルで `RESEND_API_KEY` が正しく設定されているか確認
   - 開発サーバーを再起動したか確認

2. **Resend Dashboardで確認**
   - https://resend.com/emails にアクセス
   - 送信履歴を確認
   - エラーメッセージがないか確認

3. **迷惑メールフォルダを確認**
   - メールが迷惑メールフォルダに入っている可能性があります
   - 特に `onboarding@resend.dev` からのメールは迷惑メールになる可能性があります

4. **Consoleログを確認**
   - ブラウザのConsoleタブでエラーメッセージを確認
   - Next.jsのターミナルでもエラーメッセージを確認

### エラーメッセージが出る場合

**「Email service is not configured」**
- `.env.local` に `RESEND_API_KEY` が設定されていない
- 開発サーバーを再起動していない

**「Failed to send email」**
- Resend APIキーが無効
- レート制限に達している（無料プラン: 月間3,000通）

---

## 📊 テスト結果の記録

| 確認項目 | 結果 | 備考 |
|---------|------|------|
| パスワード更新が成功する | ☐ | |
| Consoleに成功ログが表示される | ☐ | |
| Networkタブでリクエストが成功 | ☐ | Status: 200 |
| メールが届く | ☐ | |
| メールの件名が正しい | ☐ | |
| メールの内容が正しい | ☐ | |
| パスワード/トークンが含まれていない | ☐ | |

---

## ✅ 合格条件

以下のすべてが満たされれば合格です：

- ✅ パスワード更新が成功する
- ✅ `/api/auth/password-changed-notify` リクエストが送信される
- ✅ メールがメールボックスに届く
- ✅ メールの件名・内容が正しい
- ✅ セキュリティ要件を満たしている（パスワード/トークンが含まれていない）

**テスト7の判定: 上記の条件をすべて満たせば合格です！**

