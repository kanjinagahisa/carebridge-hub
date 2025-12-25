# 📦 Storage復旧ガイド

## 📌 目的

本番 Supabase（`carebridge-hub-prod`）に対し、`attachments`（必要に応じて `client-documents`）バケットを作成し、開発環境と同等の設定に近づけること。

**⚠️ 重要: このガイドは本番環境専用です。開発環境（`carebridge-hub-dev`）では実行しないでください。**

---

## 📋 前提条件

### プロジェクトの確認

| プロジェクト名 | URL（xxx部分） | 役割 |
|--------------|---------------|------|
| **carebridge-hub-prod** | `wqtnffvhhssgdnecjwpy` | **本番**（このガイドの対象） |
| carebridge-hub-dev | `nwszimmkjrkzddypegzy` | 開発（参照のみ） |

### 現状の確認

- ✅ 本番環境にはまだStorageバケットが存在しない
- ✅ 開発環境には `attachments`・`client-documents` の2バケットが存在
- ✅ スキーマ（テーブル構造）は本番・開発で完全一致済み

---

## 🔒 ステップ1: バックアップ取得（可能であれば推奨）

**注意: Free Planでは手動バックアップ機能が利用できません。このステップはスキップして、次のステップに進むことができます。**

### Free Planの場合

**Supabase Free Planでは、手動バックアップ（Create backup）機能は利用できません。**

以下のいずれかの方法で対応してください：

#### オプションA: バックアップなしで進む（推奨）

**Storageバケットの作成は破壊的操作ではありません。** 既存のテーブルやデータには影響しません。

- ✅ バックアップなしでも安全に実行できます
- ✅ この復旧作業は新規バケットの作成のみで、既存データを変更しません
- ⚠️ ただし、念のため重要なデータがある場合は、オプションBを検討してください

**→ この場合は、このステップをスキップして「ステップ2」または「ステップ3」に進んでください。**

#### オプションB: 代替手段でバックアップを取得（上級者向け）

以下の方法でバックアップを取得できます：

1. **pg_dump を使用した手動バックアップ**
   ```bash
   # 接続情報を取得: Settings → Database → Connection string
   pg_dump -h <host> -U postgres -d postgres > backup.sql
   ```

2. **Point in time restore の確認**
   - Settings → Database → Backups → **Point in time** タブを確認
   - Free Planでは利用できない可能性があります

3. **Pro Planへのアップグレード**
   - Settings → Database → Backups 画面の **Enable add-on** ボタンから
   - Pro Planにアップグレードすると、7日間のスケジュールバックアップが利用可能

### Pro Planの場合

以下の手順でバックアップを取得できます：

1. Supabase ダッシュボードにログイン
2. **本番プロジェクト（`carebridge-hub-prod`）** を選択
3. 左メニュー → **Settings** → **Database**
4. **Backups** タブを開く
5. **Create backup** ボタンをクリック（表示されない場合は Free Plan です）
6. バックアップ名を入力（例: `pre-storage-recovery-2025-12-11`）
7. **Create** をクリックしてバックアップを作成

**推奨:**
- 開発環境（`carebridge-hub-dev`）のバックアップも取得することを推奨します
- 理由: 開発環境の設定を参照するため

---

## 🖥️ ステップ2: GUIで行う場合の手順

### 2-1. attachmentsバケットの作成

1. Supabase ダッシュボードで **本番プロジェクト（`carebridge-hub-prod`）** を選択
2. 左メニュー → **Storage** → **Buckets**
3. **New bucket** ボタンをクリック
4. 以下の設定を入力:
   - **Name**: `attachments`
   - **Public bucket**: `false`（非公開・Private）
     - 理由: アプリ側からサイン付きURLでアクセスする運用を推奨
   - **File size limit**: `50MB`（または必要に応じて調整）
   - **Allowed MIME types**: `image/*, application/pdf, video/*`（または必要に応じて調整）
5. **Create bucket** をクリック

### 2-2. client-documentsバケットの作成（推奨）

開発環境に `client-documents` バケットが存在する場合、本番環境にも作成することを推奨します。

1. 同じく **Storage** → **Buckets** 画面で
2. **New bucket** ボタンをクリック
3. 以下の設定を入力:
   - **Name**: `client-documents`
   - **Public bucket**: `false`（非公開・Private）
   - **File size limit**: `50MB`（または必要に応じて調整）
   - **Allowed MIME types**: `application/pdf, image/*`（または必要に応じて調整）
4. **Create bucket** をクリック

### 2-3. RLSポリシーの設定

バケット作成後、RLSポリシーを設定する必要があります。

**⚠️ 注意: GUIではRLSポリシーを設定できません。SQLで設定する必要があります。**

次のステップ3（SQLで行う場合）に進んで、RLSポリシーを設定してください。

---

## 💻 ステップ3: SQLで行う場合の手順（推奨）

**⚠️ 重要: このSQLは本番プロジェクト（`carebridge-hub-prod`）専用です。開発プロジェクトでは実行しないでください。**

### 3-1. SQLファイルの準備

1. `supabase/sql/storage-create-attachments.sql` を開く
2. ファイルの内容をコピー

### 3-2. SQLの実行

1. Supabase ダッシュボードで **本番プロジェクト（`carebridge-hub-prod`）** を選択
   - **⚠️ 必ずプロジェクト選択を確認してください**
2. 左メニュー → **SQL Editor** → **New query**
3. コピーしたSQLを貼り付ける
4. **Run** ボタンをクリック（または `Cmd+Enter` / `Ctrl+Enter`）
5. エラーが表示されないことを確認

### 3-3. 実行結果の確認

- ✅ **Success** と表示されれば完了
- ❌ エラーが表示された場合は、エラーメッセージを確認し、次の「トラブルシューティング」セクションを参照

---

## ✅ ステップ4: 作成後の確認

### 4-1. バケットの存在確認

1. Supabase ダッシュボード → **Storage** → **Buckets**
2. 以下のバケットが表示されていることを確認:
   - ✅ `attachments` バケット
   - ✅ `client-documents` バケット（作成した場合）

### 4-2. RLSポリシーの確認

1. Supabase ダッシュボード → **Storage** → **Policies**
2. `attachments` バケットに関連するポリシーが表示されていることを確認:
   - ✅ `Users can upload attachments to their facilities` (INSERT)
   - ✅ `Users can read attachments from their facilities` (SELECT)
   - ✅ `Users can delete attachments from their facilities` (DELETE)
3. `client-documents` バケットに関連するポリシーが表示されていることを確認:
   - ✅ `Users can upload client documents to their facilities` (INSERT)
   - ✅ `Users can read client documents from their facilities` (SELECT)
   - ✅ `Users can delete client documents from their facilities` (DELETE)

### 4-3. サンプルファイルのアップロードテスト（推奨）

1. **Storage** → **Buckets** → `attachments` を開く
2. **Upload file** ボタンをクリック
3. 小さなテストファイル（例: 1KBのテキストファイル）をアップロード
4. アップロードが成功することを確認
5. テストファイルを削除（必要に応じて）

**注意:**
- 本番環境でのテストは慎重に行ってください
- テストファイルは必ず削除してください

---

## 🔧 トラブルシューティング

### 問題1: すでに同名のバケットが存在する

**症状:**
- SQL実行時に「bucket already exists」などのエラーが表示される
- GUIでバケット作成時に「Bucket name already exists」と表示される

**対処:**
1. **この復旧ガイドを一旦中断してください**
2. Supabase ダッシュボードで既存のバケットを確認
3. 既存バケットの設定（Public/Private、ポリシーなど）を確認
4. 必要に応じて、既存バケットの設定を確認・調整するか、別の名前でバケットを作成するか、相談してください

### 問題2: SQL実行エラー（ポリシー関連）

**症状:**
- SQL実行時に「policy already exists」などのエラーが表示される

**対処:**
1. エラーメッセージを確認
2. 既存のポリシーを確認:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```
3. 既存ポリシーを削除してから再実行するか、`DROP POLICY IF EXISTS` を使用したSQLに修正してください

### 問題3: ファイルアップロードが失敗する

**症状:**
- バケットは作成されたが、ファイルアップロード時にエラーが発生する

**対処:**
1. RLSポリシーが正しく設定されているか確認
2. アップロードするユーザーが `user_facility_roles` テーブルに正しく登録されているか確認
3. ファイルパスの形式が正しいか確認（`{client_id}/{filename}` または `{group_id}/{filename}`）
4. ブラウザのコンソールやネットワークタブでエラーメッセージを確認

### 問題4: プロジェクトを間違えて実行してしまった

**症状:**
- 開発プロジェクト（`carebridge-hub-dev`）でSQLを実行してしまった

**対処:**
1. 開発環境には既にバケットが存在するため、通常はエラーになります
2. エラーが表示されれば問題ありません（既存バケットが保護されます）
3. もしエラーが表示されずに実行されてしまった場合は、開発環境のバケット設定を確認してください

---

## 📚 参考情報

### バケット設定の推奨値

| 項目 | 推奨値 | 理由 |
|------|--------|------|
| **Public bucket** | `false`（Private） | セキュリティのため。アプリ側からサイン付きURLでアクセス |
| **File size limit** | `50MB` | 一般的な画像・PDFファイルのサイズを考慮 |
| **Allowed MIME types** | `image/*, application/pdf, video/*` | アプリで使用するファイル形式を考慮 |

### RLSポリシーの動作

#### attachments バケット
- **INSERT（アップロード）**: ユーザーが所属する施設の `client_id` または `group_id` で始まるパスのみアップロード可能
- **SELECT（読み取り）**: ユーザーが所属する施設の `client_id` または `group_id` で始まるパスのみ読み取り可能
- **DELETE（削除）**: ユーザーが所属する施設の `client_id` または `group_id` で始まるパスのみ削除可能

#### client-documents バケット
- **INSERT（アップロード）**: ユーザーが所属する施設の `client_id` で始まるパスのみアップロード可能
- **SELECT（読み取り）**: ユーザーが所属する施設の `client_id` で始まるパスのみ読み取り可能
- **DELETE（削除）**: ユーザーが所属する施設の `client_id` で始まるパスのみ削除可能

---

## ✅ 完了チェックリスト

- [ ] バックアップを取得した（Free Planの場合はスキップ可能）
- [ ] 本番プロジェクト（`carebridge-hub-prod`）を選択した
- [ ] `attachments` バケットを作成した
- [ ] `client-documents` バケットを作成した（推奨）
- [ ] `attachments` バケット用のRLSポリシーを設定した（3つ: INSERT, SELECT, DELETE）
- [ ] `client-documents` バケット用のRLSポリシーを設定した（3つ: INSERT, SELECT, DELETE）
- [ ] バケットの存在を確認した（両方のバケット）
- [ ] RLSポリシーの存在を確認した（両方のバケット）
- [ ] サンプルファイルのアップロードテストを実施した（推奨）

---

**作成日**: 2025年12月11日  
**対象環境**: carebridge-hub-prod（本番）






