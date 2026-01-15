-- Client documents table
-- 利用者書類テーブル: 利用者に関連する書類（計画書、報告書など）を管理

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 種別（計画書 / 報告書 / その他 など）
  path TEXT NOT NULL, -- Storage 上のパス
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_created_at ON client_documents(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_client_documents_updated_at BEFORE UPDATE ON client_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;









