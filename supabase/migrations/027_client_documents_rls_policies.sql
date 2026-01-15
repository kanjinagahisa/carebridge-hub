-- RLS policies for client_documents table
-- 利用者書類テーブルのRLSポリシー

-- Users can view client documents for clients in their facilities
CREATE POLICY "Users can view client documents in their facilities"
  ON client_documents FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
    AND deleted = FALSE
  );

-- Users can insert client documents for clients in their facilities
CREATE POLICY "Users can insert client documents in their facilities"
  ON client_documents FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );

-- Users can update client documents for clients in their facilities
CREATE POLICY "Users can update client documents in their facilities"
  ON client_documents FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );

-- Users can delete client documents for clients in their facilities
CREATE POLICY "Users can delete client documents in their facilities"
  ON client_documents FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );









