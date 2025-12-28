# client-documents バケット実装状況まとめ

**作成日時**: 2025-12-12  
**対象環境**: 本番（carebridge-hub-prod）

---

## 📋 調査結果

### ✅ 導線の存在確認

**結論**: **既に実装済み**

以下の UI/導線が既に存在しています：

1. **ページ**: `/clients/[id]/profile`（利用者プロフィール詳細ページ）
2. **コンポーネント**: `ClientDocumentsCard`（`components/client/ClientDocumentsCard.tsx`）
3. **API関数**: `lib/api/clients.ts` に以下の関数が実装済み：
   - `fetchClientDocuments` - SELECT（一覧取得）
   - `uploadClientDocument` - INSERT（アップロード）
   - `deleteClientDocument` - DELETE（削除）
   - `getClientDocumentUrl` - SELECT（ダウンロードURL取得）

---

## 🔧 実施した変更

### 変更ファイル

1. **`lib/api/clients.ts`** - パス形式の修正

### 変更内容

#### パス形式の修正

**変更前**:
```typescript
const fileName = `${Date.now()}.${ext}`
const path = `${clientId}/${fileName}`
// 例: "550e8400-e29b-41d4-a716-446655440000/1701234567890.pdf"
```

**変更後**:
```typescript
// ファイル名を安全な形式に変換（特殊文字を除去）
const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
// UUIDを生成（ブラウザ環境では crypto.randomUUID() を使用）
const uuid = crypto.randomUUID()
// パス形式: ${clientId}/${uuid}-${filename}
const path = `${clientId}/${uuid}-${safeFileName}`
// 例: "550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6-7890-abcd-ef1234567890-test-document.pdf"
```

**変更理由**:
- RLS ポリシーに完全準拠させるため
- ユーザー要求のパス形式（`${clientId}/${uuid}-${filename}`）に合わせるため
- ファイル名の衝突を防ぐため（UUID を使用）

**RLS ポリシーとの整合性**:
- Storage の RLS ポリシーは `split_part(objects.name, '/'::text, 1)` でパスの最初のセグメント（clientId）をチェック
- 新しいパス形式でも最初のセグメントが clientId であるため、RLS ポリシーと完全に整合している

---

## 📁 既存の実装詳細

### UI コンポーネント

**ファイル**: `components/client/ClientDocumentsCard.tsx`

**機能**:
- 書類一覧の表示（SELECT）
- ファイルアップロード（INSERT）
- ファイルダウンロード（SELECT - 署名付きURL取得）
- ファイル削除（DELETE）
- 編集権限チェック（admin/staff のみ操作可能）

**表示場所**: `/clients/[id]/profile` ページの「書類」セクション

### API 関数

**ファイル**: `lib/api/clients.ts`

#### `fetchClientDocuments(clientId: string)`
- **機能**: 利用者の書類一覧を取得
- **RLS**: `client_documents` テーブルの SELECT ポリシーで制御
- **戻り値**: `ClientDocument[]`

#### `uploadClientDocument(clientId: string, file: File, options?: { type?: string })`
- **機能**: ファイルを Storage にアップロードし、メタデータを DB に保存
- **RLS**: 
  - Storage: `client-documents` バケットの INSERT ポリシーで制御
  - DB: `client_documents` テーブルの INSERT ポリシーで制御
- **戻り値**: `ClientDocument`

#### `deleteClientDocument(doc: ClientDocument)`
- **機能**: Storage からファイルを削除し、DB からもレコードを削除
- **RLS**: 
  - Storage: `client-documents` バケットの DELETE ポリシーで制御
  - DB: `client_documents` テーブルの DELETE ポリシーで制御
- **戻り値**: `void`

#### `getClientDocumentUrl(doc: ClientDocument)`
- **機能**: 署名付きURL（signed URL）を生成（1時間有効）
- **RLS**: `client-documents` バケットの SELECT ポリシーで制御
- **戻り値**: `string`（署名付きURL）

---

## 🔒 RLS ポリシー確認

### Storage バケット（client-documents）

**確認結果**: ✅ すべて正しく設定済み

- **INSERT ポリシー**: ✅ 設定済み
  - パスの最初のセグメント（clientId）が、ユーザーの所属施設の利用者であることを確認
- **SELECT ポリシー**: ✅ 設定済み
  - パスの最初のセグメント（clientId）が、ユーザーの所属施設の利用者であることを確認
- **DELETE ポリシー**: ✅ 設定済み
  - パスの最初のセグメント（clientId）が、ユーザーの所属施設の利用者であることを確認

**詳細**: `docs/STORAGE_POLICY_VERIFICATION_RESULT.md` を参照

### データベーステーブル（client_documents）

**確認結果**: ✅ すべて正しく設定済み

- **SELECT ポリシー**: ✅ 設定済み（Migration 027）
- **INSERT ポリシー**: ✅ 設定済み（Migration 027）
- **UPDATE ポリシー**: ✅ 設定済み（Migration 027）
- **DELETE ポリシー**: ✅ 設定済み（Migration 027）

**詳細**: `supabase/migrations/027_client_documents_rls_policies.sql` を参照

---

## 📝 本番確認手順

### チェックリスト

詳細なチェックリストは `docs/CLIENT_DOCUMENTS_TEST_CHECKLIST.md` を参照してください。

**主要なテスト項目**:
1. ✅ INSERT（アップロード）の動作確認
2. ✅ SELECT（一覧表示・閲覧）の動作確認
3. ✅ DELETE（削除）の動作確認

### 確認用 SQL

Storage の内容を確認するための SQL は `docs/check-client-documents-storage.sql` を参照してください。

**主要なクエリ**:
- 最新 N 件のファイル確認
- パスから clientId を抽出して確認
- 特定の利用者の書類のみを確認
- データベースと Storage の整合性確認

---

## ⚠️ 注意事項

### 既存の仕組みへの影響

- ✅ **影響なし**: 既存の画面・既存APIへの影響は最小限
- ✅ **既存の RLS/ポリシーは変更していない**: パス形式のみ修正
- ✅ **migrations は作成していない**: コード変更のみ

### パス形式の変更による影響

**既存ファイルへの影響**:
- 既にアップロード済みのファイルは、旧形式（`${clientId}/${Date.now()}.${ext}`）のまま
- 新規アップロードされるファイルは、新形式（`${clientId}/${uuid}-${filename}`）になる
- 両方の形式とも RLS ポリシーで正しく動作する（最初のセグメントが clientId であるため）

**推奨事項**:
- 既存ファイルはそのまま使用可能
- 将来的に統一したい場合は、既存ファイルの移行スクリプトを作成することを検討

---

## 🎯 完了条件

- [x] 既存の導線を確認
- [x] パス形式を要求に合わせて修正
- [x] 本番確認用のチェックリストを作成
- [x] Storage 確認用の SQL を作成
- [x] 実装状況をまとめたドキュメントを作成

**次のステップ**: `docs/CLIENT_DOCUMENTS_TEST_CHECKLIST.md` に従って、本番環境で動作テストを実施してください。






