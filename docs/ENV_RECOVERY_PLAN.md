# 🧩 CareBridge Hub — 環境復旧計画

## 📌 このドキュメントの目的

本番・開発環境の混線状態を整理し、Storageバケットの不足を解消するための復旧計画です。

**⚠️ 重要: この復旧作業では、既存のテーブル構造やデータを変更しません。**

---

## 🎯 現状の整理

### 環境とSupabaseプロジェクトの対応関係（確定済み）

| 環境 | Supabaseプロジェクト | URL（xxx部分） | 状態 |
|------|---------------------|---------------|------|
| **Vercel 本番** | `carebridge-hub-prod` | `wqtnffvhhssgdnecjwpy` | ✅ 正常（Storageバケット不足） |
| **ローカル開発** | `carebridge-hub-dev` | `nwszimmkjrkzddypegzy` | ✅ 正常 |

### 診断結果のサマリー

**✅ 確認済み（問題なし）:**
- 本番・開発のスキーマ（テーブル構造）は完全一致
- Migration 026（client_documents）、036（posts.client_id）は両環境とも適用済み
- インデックス・制約も完全一致
- 環境変数の設定は正しく分離されている

**⚠️ 問題点（今回の復旧対象）:**
- **本番環境（carebridge-hub-prod）にStorageバケットが存在しない**
  - `attachments` バケット: ❌ 存在しない
  - `client-documents` バケット: ❌ 存在しない（開発環境には存在）
- 開発環境（carebridge-hub-dev）には両方のバケットが存在

---

## 🎯 復旧のゴール

1. **環境の役割を明確に固定**
   - Vercel 本番 → `carebridge-hub-prod`（本番）
   - ローカル開発 → `carebridge-hub-dev`（開発）

2. **Storageの整合性を取る**
   - 本番に `attachments` バケット（+必要なポリシー）を安全に作成
   - 必要であれば `client-documents` バケットも本番に作成（開発環境を参照）

3. **migrations / コードとDB実体が「同じ前提」で揃っている状態**
   - 以後は `supabase/migrations` を前提に開発・本番反映できる状態にする

4. **既存データを壊さないこと**
   - 既存の本番テーブル行・開発データ・ユーザー情報などを削除・上書きしない

---

## 📋 復旧方針

### ✅ 今回の復旧で行うこと

1. **本番環境にStorageバケットを作成**
   - `attachments` バケットの作成（必須）
   - `client-documents` バケットの作成（推奨・開発環境を参照）

2. **Storage RLSポリシーの設定**
   - Migration 057, 058 から抽出した最新のポリシーを適用

3. **復旧ガイドとSQLサンプルの提供**
   - 人間がSupabaseダッシュボードから実行できる形で提供

### ❌ 今回の復旧で行わないこと

1. **既存テーブル構造の変更**
   - `ALTER TABLE`、`DROP COLUMN`、`DROP TABLE` などは一切行わない

2. **既存データの削除・変更**
   - `DELETE`、`TRUNCATE`、`UPDATE` などで既存データを変更しない

3. **Migrationファイルの編集**
   - `supabase/migrations/` 配下の既存ファイルは一切書き換えない

4. **開発環境の変更**
   - 開発環境のバケット・データは一切触らない

---

## 📚 関連ドキュメント

- [Storage復旧ガイド](./STORAGE_RECOVERY_GUIDE.md) - 詳細な手順と注意事項
- [診断サマリー](./DIAGNOSIS_SUMMARY.md) - 現状の詳細な診断結果
- [SQLサンプル](../supabase/sql/storage-create-attachments.sql) - 実行用SQLファイル

---

## ⚠️ 重要な注意事項

1. **バックアップ取得について（Free Planの場合）**
   - **Free Planでは手動バックアップ機能が利用できません**
   - この復旧作業は新規バケットの作成のみで、既存データを変更しないため、バックアップなしでも安全に実行できます
   - Pro Planの場合は、Settings → Database → Backups からバックアップを取得することを推奨します
   - 詳細は [Storage復旧ガイド](./STORAGE_RECOVERY_GUIDE.md) の「ステップ1」を参照してください

2. **プロジェクト選択の確認**
   - SQL実行時は必ず **`carebridge-hub-prod`** を選択してください
   - 開発プロジェクト（`carebridge-hub-dev`）では実行しないでください

3. **既存バケットの確認**
   - 実行前に、本番環境に同名のバケットが存在しないことを確認してください
   - 存在する場合は、この復旧ガイドを一旦中断して相談してください

---

## 📝 次のステップ

1. [Storage復旧ガイド](./STORAGE_RECOVERY_GUIDE.md) を読む
2. バックアップを取得する（Free Planの場合はスキップ可能）
3. SQLサンプルを実行する（またはGUIでバケットを作成する）
4. バケットの存在を確認する
5. 本番アプリからのファイルアップロードテストを実施する

---

**作成日**: 2025年12月11日  
**対象環境**: carebridge-hub-prod（本番）







