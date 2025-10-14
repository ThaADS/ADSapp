-- Migration: Accessibility Preferences
-- Description: Add user accessibility preferences table for WCAG 2.1 AA compliance
-- Date: 2025-10-14

-- Create accessibility preferences table
CREATE TABLE IF NOT EXISTS accessibility_preferences (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to profiles
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Visual preferences
  high_contrast_mode BOOLEAN DEFAULT false,
  large_text BOOLEAN DEFAULT false,
  font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'xl')),
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('auto', 'light', 'dark')),

  -- Motion preferences
  reduce_motion BOOLEAN DEFAULT false,

  -- Keyboard navigation
  keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
  auto_focus_enabled BOOLEAN DEFAULT true,
  skip_links_enabled BOOLEAN DEFAULT true,

  -- Screen reader preferences
  announce_notifications BOOLEAN DEFAULT true,
  verbose_descriptions BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_accessibility_preferences_user_id
ON accessibility_preferences(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_accessibility_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accessibility_preferences_updated_at
  BEFORE UPDATE ON accessibility_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_preferences_updated_at();

-- Enable Row Level Security
ALTER TABLE accessibility_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own preferences
CREATE POLICY "Users can view own accessibility preferences"
ON accessibility_preferences
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can create own accessibility preferences"
ON accessibility_preferences
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own accessibility preferences"
ON accessibility_preferences
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users can delete own accessibility preferences"
ON accessibility_preferences
FOR DELETE
USING (user_id = auth.uid());

-- Super admins can view all preferences (for support purposes)
CREATE POLICY "Super admins can view all accessibility preferences"
ON accessibility_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Create function to initialize default preferences for new users
CREATE OR REPLACE FUNCTION initialize_user_accessibility_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO accessibility_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create preferences when a new user is created
CREATE TRIGGER trigger_initialize_accessibility_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_accessibility_preferences();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON accessibility_preferences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE accessibility_preferences IS 'User accessibility preferences for WCAG 2.1 AA compliance';
COMMENT ON COLUMN accessibility_preferences.user_id IS 'Foreign key to profiles table';
COMMENT ON COLUMN accessibility_preferences.high_contrast_mode IS 'Enable high contrast mode for better visibility';
COMMENT ON COLUMN accessibility_preferences.large_text IS 'Enable larger text size throughout application';
COMMENT ON COLUMN accessibility_preferences.font_size IS 'Preferred font size: small, medium, large, or xl';
COMMENT ON COLUMN accessibility_preferences.theme IS 'Preferred theme: auto (system), light, or dark';
COMMENT ON COLUMN accessibility_preferences.reduce_motion IS 'Minimize animations and transitions';
COMMENT ON COLUMN accessibility_preferences.keyboard_shortcuts_enabled IS 'Enable keyboard shortcuts and enhanced navigation';
COMMENT ON COLUMN accessibility_preferences.auto_focus_enabled IS 'Automatically focus first element in modals';
COMMENT ON COLUMN accessibility_preferences.skip_links_enabled IS 'Show skip navigation links';
COMMENT ON COLUMN accessibility_preferences.announce_notifications IS 'Announce notifications to screen readers';
COMMENT ON COLUMN accessibility_preferences.verbose_descriptions IS 'Provide detailed descriptions for screen readers';

-- Create view for easy preference retrieval with user info
CREATE OR REPLACE VIEW user_accessibility_view AS
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  ap.high_contrast_mode,
  ap.large_text,
  ap.font_size,
  ap.theme,
  ap.reduce_motion,
  ap.keyboard_shortcuts_enabled,
  ap.auto_focus_enabled,
  ap.skip_links_enabled,
  ap.announce_notifications,
  ap.verbose_descriptions,
  ap.updated_at as preferences_updated_at
FROM profiles p
LEFT JOIN accessibility_preferences ap ON p.id = ap.user_id;

-- Grant select on view
GRANT SELECT ON user_accessibility_view TO authenticated;

-- Migration complete
