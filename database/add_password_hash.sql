-- Migration: Add passwordHash column to users table
-- Run this in Supabase SQL Editor if the table already exists

ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash TEXT;
