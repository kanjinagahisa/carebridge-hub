# SupabaseカスタムSMTP設定ガイド

## 概要

SupabaseのカスタムSMTP設定により、Supabase Authが送信する認証メール（パスワード再設定メールなど）の送信制限を緩和できます。

**注意:** この設定は、Supabase Authが自動的に送信するメールに適用されます。カスタムで実装した「パスワード変更完了メール」は、引き続きResendを使用します。

---

## 設定手順

### ステップ1: SMTPプロバイダーの準備

#### オプション1: Resendを使用（推奨）

1. [Resend](https://resend.com) にアクセス
2. アカウントを作成（無料プラン: 月間3,000通）
3. ダッシュボード → 「API Keys」を選択
4. 「Create API Key」をクリック
5. APIキーをコピー（例: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**SMTP設定情報:**
```
Host: smtp.resend.com
Port: 465 (SSL) または 587 (TLS)
Username: resend
Password: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx (APIキー)
```

#### オプション2: SendGridを使用

1. [SendGrid](https://sendgrid.com) にアクセス
2. アカウントを作成（無料プラン: 月間12,000通）
3. ダッシュボード → 「Settings」→ 「API Keys」
4. 「Create API Key」をクリック
5. APIキーをコピー（例: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**SMTP設定情報:**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx (APIキー)
```

#### オプション3: Gmailを使用

1. Googleアカウントでログイン
2. [Googleアカウント設定](https://myaccount.google.com/) → 「セキュリティ」
3. 「2段階認証プロセス」を有効化
4. 「アプリパスワード」を生成
5. アプリパスワードをコピー（16文字）

**SMTP設定情報:**
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: xxxx xxxx xxxx xxxx (アプリパスワード)
```

---

### ステップ2: Supabase Dashboardで設定

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard
   - 該当プロジェクトを選択

2. **Authentication設定を開く**
   - 左側メニュー → **Authentication**
   - **Settings**タブを選択

3. **SMTP Settingsを開く**
   - ページを下にスクロール
   - 「SMTP Settings」セクションを展開

4. **カスタムSMTPを有効化**
   - 「Enable Custom SMTP」トグルをオン

5. **SMTP情報を入力**

   **Resendの場合:**
   ```
   Sender email: noreply@onboarding.resend.dev
   （または、カスタムドメインを設定している場合: noreply@yourdomain.com）
   
   Sender name: CareBridge Hub
   
   Host: smtp.resend.com
   
   Port: 465
   （または 587 を選択）
   
   Username: resend
   
   Password: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   （ResendのAPIキー）
   ```

   **SendGridの場合:**
   ```
   Sender email: noreply@yourdomain.com
   （SendGridで認証済みのドメイン）
   
   Sender name: CareBridge Hub
   
   Host: smtp.sendgrid.net
   
   Port: 587
   
   Username: apikey
   
   Password: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   （SendGridのAPIキー）
   ```

   **Gmailの場合:**
   ```
   Sender email: your-email@gmail.com
   
   Sender name: CareBridge Hub
   
   Host: smtp.gmail.com
   
   Port: 587
   
   Username: your-email@gmail.com
   
   Password: xxxx xxxx xxxx xxxx
   （Googleアプリパスワード）
   ```

6. **設定を保存**
   - 「Save」ボタンをクリック
   - 設定が保存されます

---

### ステップ3: 動作確認

1. **テストメールを送信**
   - Supabase Dashboard → Authentication → Users
   - テストユーザーを選択
   - 「Send password reset email」をクリック
   - または、実際にパスワード再設定フローを実行

2. **メールが届くことを確認**
   - メールボックスを確認
   - 送信者名が「CareBridge Hub」になっているか確認
   - 送信元メールアドレスが設定したものになっているか確認

3. **ログを確認**
   - Supabase Dashboard → Logs → Auth Logs
   - メール送信のログを確認

---

## 設定後の動作

### 適用されるメール

以下のSupabase Authが自動送信するメールにカスタムSMTP設定が適用されます：

- ✅ パスワード再設定メール（`resetPasswordForEmail`）
- ✅ サインアップ確認メール
- ✅ メールアドレス変更確認メール
- ✅ その他の認証関連メール

### 適用されないメール

以下のカスタムで実装したメールは、引き続きResendを使用します：

- ⚠️ パスワード変更完了メール（`/api/auth/password-changed-notify`）
  - これはカスタム実装のため、Resendの設定（環境変数）を使用します

---

## Resendのテストモードと本番モード

### 現在の動作（テストモード）

現在、Resendのテストモードで動作している場合：

- ✅ **動作**: テストモードでは、**自分のメールアドレス（アカウント登録時のメールアドレス）にのみ送信可能**
- ✅ **自動対応**: システムが自動的に許可されているメールアドレスを検出し、そのアドレスに再送信します
- ✅ **メール本文**: 「【テスト環境】本来の送信先: [実際のユーザーのメールアドレス]」が記載されます
- ⚠️ **制限**: 他のユーザーのメールアドレスに直接送信することはできません

**例：**
- ユーザー `kanjinagatomi99@gmail.com` がパスワードを変更
- Resendアカウントのメールアドレスが `kanjinagahisa@gmail.com` の場合
- → メールは `kanjinagahisa@gmail.com` に送信され、本文に本来の送信先が記載されます

### 本番モードへの移行方法

本番環境で、**すべてのユーザーに直接メールを送信する**には、以下の手順でResendの本番モードに移行します：

#### ステップ1: ドメインの認証

1. **Resend Dashboardにアクセス**
   - https://resend.com/domains にアクセス
   - または、Resend Dashboard → 「Domains」を選択

2. **ドメインを追加**
   - 「Add Domain」ボタンをクリック
   - 使用したいドメイン名を入力（例: `yourdomain.com`）
   - 「Add」をクリック

3. **DNSレコードを設定**
   - Resendが表示するDNSレコードをコピー
   - ドメインのDNS管理画面で、以下のレコードを追加：
     - **SPFレコード** (TXT)
     - **DKIMレコード** (CNAME) × 3件
     - **DMARCレコード** (TXT) - 推奨

4. **認証を完了**
   - DNSレコードの反映を待つ（通常数分〜24時間）
   - Resend Dashboardで「Verified」ステータスになることを確認

#### ステップ2: 環境変数の更新

`.env.local` ファイルを編集：

```bash
# 変更前（テストモード）
RESEND_FROM_EMAIL=CareBridge Hub <onboarding@resend.dev>

# 変更後（本番モード）
RESEND_FROM_EMAIL=CareBridge Hub <noreply@yourdomain.com>
```

**重要：**
- `yourdomain.com` を実際に認証したドメインに置き換えてください
- ドメインを認証するまで、`onboarding@resend.dev` のままではテストモードが継続します

#### ステップ3: サーバーの再起動

環境変数を変更した後、開発サーバーを再起動します：

```bash
# サーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

#### ステップ4: 動作確認

1. **パスワード変更を実行**
   - テストユーザーでパスワード変更を実行
   - 本来の送信先のメールアドレスに直接メールが届くことを確認

2. **メール内容を確認**
   - 「【テスト環境】」の記載がなくなっていることを確認
   - 送信元メールアドレスが `noreply@yourdomain.com` になっていることを確認

### テストモードと本番モードの比較

| 項目 | テストモード | 本番モード |
|------|------------|----------|
| **送信先** | 自分のメールアドレスのみ | すべてのメールアドレス |
| **FROMアドレス** | `onboarding@resend.dev` | `noreply@yourdomain.com`（認証済みドメイン） |
| **DNS設定** | 不要 | 必要（SPF/DKIM/DMARC） |
| **メール本文** | 「【テスト環境】」の記載あり | 通常のメール本文のみ |
| **用途** | 開発・テスト環境 | 本番環境 |

### 注意事項

- ⚠️ **ドメイン認証は必須**: 本番環境で他のユーザーにメールを送信するには、必ずドメインの認証が必要です
- ⚠️ **DNS設定の反映時間**: DNSレコードの反映には数分〜24時間かかる場合があります
- ⚠️ **送信制限**: Resend無料プランでは月間3,000通まで送信可能です
- ✅ **段階的な移行**: まずテストモードで動作確認し、問題なければ本番モードに移行することを推奨します

---

## トラブルシューティング

### メールが届かない場合

1. **SMTP設定を確認**
   - Host、Port、Username、Passwordが正しいか確認
   - 特に、APIキーやパスワードに余分なスペースがないか確認

2. **Resend/SendGridのダッシュボードを確認**
   - 送信ログを確認
   - エラーメッセージがないか確認

3. **Supabaseのログを確認**
   - Dashboard → Logs → Auth Logs
   - エラーメッセージを確認

4. **ポート番号を確認**
   - 465 (SSL) と 587 (TLS) を試す
   - ファイアウォールでブロックされていないか確認

### よくあるエラー

**「Authentication failed」**
- Username または Password が間違っている
- APIキーが正しくコピーされているか確認

**「Connection timeout」**
- Host または Port が間違っている
- ネットワーク接続を確認

**「Sender email not verified」**
- 送信元メールアドレスが認証されていない
- Resend/SendGridでドメイン認証が必要な場合がある

---

## 送信制限の比較

### SupabaseデフォルトSMTP
- 1時間あたり: 3通まで
- 1日あたり: 30通まで

### カスタムSMTP（Resend無料プラン）
- 1日あたり: 100通まで
- 月間: 3,000通まで

### カスタムSMTP（SendGrid無料プラン）
- 1日あたり: 100通まで
- 月間: 12,000通まで

---

## セキュリティについて

- APIキーやパスワードは、Supabase Dashboardで安全に管理されます
- これらの情報は暗号化されて保存されます
- 定期的にAPIキーを更新することを推奨します

---

## まとめ

SupabaseのカスタムSMTP設定により：

- ✅ パスワード再設定メールの送信制限が緩和される
- ✅ より多くの認証メールを送信できる
- ✅ 独自の送信者名・アドレスを設定できる
- ✅ 配信性が向上する可能性がある

設定はSupabase Dashboardで行うだけで、プログラム側の変更は不要です。

