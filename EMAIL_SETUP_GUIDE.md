# メール送信機能のセットアップガイド

## 概要

パスワード変更完了メールの送信には、[Resend](https://resend.com) を使用します。

## セットアップ手順

### 1. Resendアカウントの作成

1. [Resend](https://resend.com) にアクセス
2. 「Sign Up」からアカウントを作成
3. メールアドレスを確認してアカウントを有効化

### 2. APIキーの取得

1. Resendダッシュボードにログイン
2. 左側メニューから「API Keys」を選択
3. 「Create API Key」をクリック
4. 以下の設定でAPIキーを作成：
   - **Name**: `CareBridge Hub Production` など
   - **Permission**: `Sending access`
   - **Domain**: 任意（後で設定可能）
5. APIキーをコピー（**このキーは一度しか表示されません**）

### 3. ドメインの設定（オプション）

カスタムドメインを使用する場合：

1. Resendダッシュボード → 「Domains」を選択
2. 「Add Domain」をクリック
3. ドメイン名を入力（例: `yourdomain.com`）
4. DNS設定を追加：
   - Resendが提供するDNSレコードをドメインのDNS設定に追加
   - 確認には数時間かかる場合があります

**注意:** ドメインを設定しない場合、Resendのデフォルトドメイン（`onboarding.resend.dev`）が使用されます。

### 4. 環境変数の設定

プロジェクトルートの `.env.local` ファイルに以下を追加：

```env
# Resend設定
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=CareBridge Hub <noreply@yourdomain.com>
```

**`RESEND_FROM_EMAIL` の形式:**
- カスタムドメイン使用時: `CareBridge Hub <noreply@yourdomain.com>`
- デフォルトドメイン使用時: `CareBridge Hub <noreply@onboarding.resend.dev>`

**注意:** デフォルトドメイン（`onboarding.resend.dev`）を使用する場合、受信者が迷惑メールフォルダに振り分けられる可能性があります。

### 5. 動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. パスワードリセット機能をテスト：
   - `/auth/forgot-password` にアクセス
   - テスト用メールアドレスを入力
   - パスワードを再設定

3. メールが届いているか確認：
   - メールボックスを確認
   - 迷惑メールフォルダも確認

## トラブルシューティング

### メールが届かない場合

1. **APIキーが正しく設定されているか確認**
   - `.env.local` ファイルの `RESEND_API_KEY` を確認
   - 開発サーバーを再起動（環境変数の変更は再起動が必要）

2. **Resendダッシュボードでログを確認**
   - Resendダッシュボード → 「Emails」を確認
   - 送信失敗の場合は、エラーメッセージが表示されます

3. **コンソールログを確認**
   - ブラウザの開発者ツール → Consoleタブ
   - Next.jsのターミナル
   - `[Email]` で始まるログを確認

4. **迷惑メールフォルダを確認**
   - 特にデフォルトドメイン（`onboarding.resend.dev`）を使用している場合

### APIキーが設定されていない場合

- `RESEND_API_KEY` が設定されていない場合、メール送信はスキップされます
- コンソールに警告メッセージが表示されます：
  ```
  [Email] RESEND_API_KEY is not set. Email sending will be disabled.
  ```
- パスワード更新自体は成功しますが、メールは送信されません

## 料金について

- **無料プラン**: 月3,000通まで送信可能
- **有料プラン**: 送信量に応じた料金設定

詳細は [Resendの料金ページ](https://resend.com/pricing) を確認してください。

## セキュリティについて

- APIキーは `.env.local` ファイルに保存し、**Gitにコミットしないでください**
- `.gitignore` に `.env.local` が含まれていることを確認
- 本番環境では、環境変数を安全に管理してください

