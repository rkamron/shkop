-- =============================================================================
-- Shkop — Drop All Tables
-- Run this BEFORE 001_initial_schema.sql when resetting from scratch.
-- WARNING: destroys all data. Development use only.
-- =============================================================================

DROP TABLE IF EXISTS feedback       CASCADE;
DROP TABLE IF EXISTS wear_history   CASCADE;
DROP TABLE IF EXISTS outfit_items   CASCADE;
DROP TABLE IF EXISTS outfits        CASCADE;
DROP TABLE IF EXISTS clothing_items CASCADE;
DROP TABLE IF EXISTS preferences    CASCADE;
DROP TABLE IF EXISTS profiles       CASCADE;
