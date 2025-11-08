-- Add global bubble color preferences to profiles table
-- This allows users to set a bubble color preference that applies to ALL conversations

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bubble_color_preference VARCHAR(50) DEFAULT 'bg-white',
ADD COLUMN IF NOT EXISTS bubble_text_color_preference VARCHAR(50) DEFAULT 'text-gray-900';

-- Add comment explaining the columns
COMMENT ON COLUMN profiles.bubble_color_preference IS 'Global bubble color preference for chat messages (Tailwind CSS class)';
COMMENT ON COLUMN profiles.bubble_text_color_preference IS 'Global text color preference for chat message bubbles (Tailwind CSS class)';
