-- ============================================================
-- Migration 029: Add Missing Lead Status Values
-- Fixes mismatch between database enum and TypeScript types
-- ============================================================

-- Add missing lead status values to match TypeScript
-- These values exist in lib/types/index.ts but not in the database enum

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'meeting_done' AFTER 'interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'proposal_sent' AFTER 'meeting_done';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'negotiation' AFTER 'proposal_sent';
