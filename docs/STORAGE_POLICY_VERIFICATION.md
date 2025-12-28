# Storageポリシー最終確認ガイド

## 目的
本番環境（Supabase: carebridge-hub-prod）で、StorageバケットとRLSポリシーが期待通りに作成・適用されているかを確認します。

**重要**: このタスクでは既存の設定やポリシーを変更しません（DDL/CREATE/ALTER/DROP禁止）。参照（SELECT）での検証のみです。

## 実行環境
- Supabase Dashboard → carebridge-hub-prod → SQL Editor → New query
- 以下SQLをそのまま実行し、結果を貼り付けて報告してください

---

## 実行SQL（コピペしてRun）

### 1) バケットの存在と設定確認

```sql
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
from storage.buckets
where id in ('attachments', 'client-documents')
order by id;
```

### 2) objects のRLS有効化状態（念のため）

```sql
select
  n.nspname as schema,
  c.relname as table,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage'
  and c.relname = 'objects';
```

### 3) objects に紐づくRLSポリシー一覧（全体像）

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname, cmd;
```

### 4) "attachments / client-documents" に関係しそうなポリシーだけ抽出（読みやすく）

```sql
select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    policyname ilike '%attachments%'
    or policyname ilike '%client%documents%'
    or policyname ilike '%client-documents%'
    or policyname ilike '%client_documents%'
  )
order by policyname, cmd;
```

---

## 期待する結果（チェック観点）

### A. バケット
- **attachments** が存在
  - `public = false` (private bucket)
  - `file_size_limit = 52428800` (50MB) または適切な値
  - `allowed_mime_types` が設定されている（`image/*`, `application/pdf`, `video/*` など）
- **client-documents** が存在
  - `public = false` (private bucket)
  - `file_size_limit` が設定されている
  - `allowed_mime_types` が設定されている（`application/pdf`, `image/*` など）

### B. RLS
- **storage.objects** で `rls_enabled = true`
- **attachments** 向けに以下のポリシーが存在：
  - `INSERT` ポリシー（例: "Users can upload attachments to their facilities"）
  - `SELECT` ポリシー（例: "Users can read attachments from their facilities"）
  - `DELETE` ポリシー（例: "Users can delete attachments from their facilities"）
- **client-documents** 向けに以下のポリシーが存在：
  - `INSERT` ポリシー
  - `SELECT` ポリシー
  - `DELETE` ポリシー

---

## 報告フォーマット

実行結果を以下の形式で報告してください：

### 1. バケット確認結果
- **attachments**: 
  - 存在: ある/ない
  - public: true/false
  - file_size_limit: ?? (bytes)
  - allowed_mime_types: ??
- **client-documents**: 
  - 存在: ある/ない
  - public: true/false
  - file_size_limit: ?? (bytes)
  - allowed_mime_types: ??

### 2. RLS確認結果
- **objects RLS**: enabled/disabled, forced/false
- **attachments**: 
  - INSERT: ある/ない（ポリシー名: ??）
  - SELECT: ある/ない（ポリシー名: ??）
  - DELETE: ある/ない（ポリシー名: ??）
- **client-documents**: 
  - INSERT: ある/ない（ポリシー名: ??）
  - SELECT: ある/ない（ポリシー名: ??）
  - DELETE: ある/ない（ポリシー名: ??）

### 3. 結論
- ✅ 問題なし / ⚠️ 不足あり（不足内容を箇条書き）
- ※この段階では修正提案だけ（修正SQLは出さない）

---

## 参考: 期待されるポリシー名（マイグレーションファイルより）

### attachments バケット
- **INSERT**: "Users can upload attachments to their facilities"
- **SELECT**: "Users can read attachments from their facilities"
- **DELETE**: "Users can delete attachments from their facilities"

### client-documents バケット
- マイグレーションファイルでStorageバケットのRLSポリシーが見つかりませんでした
- テーブル `client_documents` のRLSポリシーは存在しますが、Storageバケット `client-documents` のRLSポリシーは別途確認が必要です






