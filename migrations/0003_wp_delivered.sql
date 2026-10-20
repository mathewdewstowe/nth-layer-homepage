-- 2026-10-20 11:24: double opt-in removed; the white paper is emailed on submit
ALTER TABLE wp_requests ADD COLUMN delivered_at TEXT;      -- ISO 8601 UTC when the delivery email was accepted by Resend
ALTER TABLE wp_requests ADD COLUMN delivery_method TEXT;   -- 'attached' or 'link'
