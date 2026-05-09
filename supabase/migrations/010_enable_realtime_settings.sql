-- 010_enable_realtime_settings.sql
-- Enable Supabase Realtime on system_config so all browsers get instant
-- updates when admin changes a setting.

ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
