-- 011_enable_realtime_all_tables.sql
-- Enable Supabase Realtime on all application tables so every connected
-- browser gets instant updates without polling.
-- (system_config was already added in migration 010.)

ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE policies;
ALTER PUBLICATION supabase_realtime ADD TABLE premiums;
ALTER PUBLICATION supabase_realtime ADD TABLE renewals;
ALTER PUBLICATION supabase_realtime ADD TABLE commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE commission_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE early_checkout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE holidays;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE branches;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_portal_users;
