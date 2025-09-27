-- Demo Session Management Utilities
-- This script provides comprehensive utilities for managing demo sessions

-- Function to get demo session statistics
CREATE OR REPLACE FUNCTION get_demo_session_stats(
  date_from DATE DEFAULT (NOW() - INTERVAL '30 days')::DATE,
  date_to DATE DEFAULT NOW()::DATE
) RETURNS TABLE (
  total_sessions INTEGER,
  active_sessions INTEGER,
  expired_sessions INTEGER,
  converted_sessions INTEGER,
  abandoned_sessions INTEGER,
  avg_session_duration INTERVAL,
  top_template_types JSONB,
  conversion_rate NUMERIC,
  activity_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'expired') as expired,
      COUNT(*) FILTER (WHERE status = 'converted') as converted,
      COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned,
      AVG(CASE
        WHEN status = 'active' THEN NOW() - started_at
        ELSE last_activity_at - started_at
      END) as avg_duration
    FROM demo_sessions ds
    JOIN organizations o ON o.id = ds.organization_id
    WHERE ds.created_at::DATE BETWEEN date_from AND date_to
  ),
  template_stats AS (
    SELECT jsonb_object_agg(
      o.demo_template_type,
      COUNT(*)
    ) as template_breakdown
    FROM demo_sessions ds
    JOIN organizations o ON o.id = ds.organization_id
    WHERE ds.created_at::DATE BETWEEN date_from AND date_to
    GROUP BY ()
  ),
  activity_stats AS (
    SELECT jsonb_object_agg(
      dsa.activity_type,
      COUNT(*)
    ) as activity_breakdown
    FROM demo_session_activities dsa
    JOIN demo_sessions ds ON ds.id = dsa.session_id
    WHERE dsa.created_at::DATE BETWEEN date_from AND date_to
    GROUP BY ()
  )
  SELECT
    ss.total::INTEGER,
    ss.active::INTEGER,
    ss.expired::INTEGER,
    ss.converted::INTEGER,
    ss.abandoned::INTEGER,
    ss.avg_duration,
    ts.template_breakdown,
    CASE
      WHEN ss.total > 0 THEN ROUND((ss.converted::NUMERIC / ss.total::NUMERIC) * 100, 2)
      ELSE 0
    END,
    ast.activity_breakdown
  FROM session_stats ss
  CROSS JOIN template_stats ts
  CROSS JOIN activity_stats ast;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active demo sessions with details
CREATE OR REPLACE FUNCTION get_active_demo_sessions()
RETURNS TABLE (
  session_id UUID,
  organization_name TEXT,
  template_type TEXT,
  user_email TEXT,
  user_name TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  time_remaining INTERVAL,
  last_activity_at TIMESTAMPTZ,
  total_activities INTEGER,
  session_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    o.name,
    o.demo_template_type,
    ds.user_email,
    ds.user_name,
    ds.started_at,
    ds.expires_at,
    ds.expires_at - NOW(),
    ds.last_activity_at,
    COALESCE(activity_counts.activity_count, 0)::INTEGER,
    ds.session_token
  FROM demo_sessions ds
  JOIN organizations o ON o.id = ds.organization_id
  LEFT JOIN (
    SELECT
      session_id,
      COUNT(*) as activity_count
    FROM demo_session_activities
    GROUP BY session_id
  ) activity_counts ON activity_counts.session_id = ds.id
  WHERE ds.status = 'active'
    AND ds.expires_at > NOW()
  ORDER BY ds.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get demo session activity timeline
CREATE OR REPLACE FUNCTION get_demo_session_activity_timeline(
  session_token_param TEXT
) RETURNS TABLE (
  activity_time TIMESTAMPTZ,
  activity_type TEXT,
  page_path TEXT,
  duration_seconds INTEGER,
  activity_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dsa.created_at,
    dsa.activity_type,
    dsa.page_path,
    dsa.duration_seconds,
    dsa.activity_data
  FROM demo_session_activities dsa
  JOIN demo_sessions ds ON ds.id = dsa.session_id
  WHERE ds.session_token = session_token_param
  ORDER BY dsa.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert demo session to real account
CREATE OR REPLACE FUNCTION convert_demo_session(
  session_token_param TEXT,
  user_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  subscription_tier TEXT DEFAULT 'starter'
) RETURNS TABLE (
  success BOOLEAN,
  new_organization_id UUID,
  message TEXT
) AS $$
DECLARE
  demo_session_record RECORD;
  demo_org_record RECORD;
  new_org_id UUID;
  contact_mapping JSONB := '{}'::jsonb;
  conversation_mapping JSONB := '{}'::jsonb;
BEGIN
  -- Validate demo session
  SELECT ds.*, o.* INTO demo_session_record
  FROM demo_sessions ds
  JOIN organizations o ON o.id = ds.organization_id
  WHERE ds.session_token = session_token_param
    AND ds.status = 'active'
    AND ds.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid or expired demo session';
    RETURN;
  END IF;

  -- Check if organization slug is available
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = organization_slug AND NOT is_demo) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Organization slug already exists';
    RETURN;
  END IF;

  BEGIN
    -- Create new real organization
    INSERT INTO organizations (
      name,
      slug,
      is_demo,
      subscription_status,
      subscription_tier,
      trial_ends_at
    ) VALUES (
      organization_name,
      organization_slug,
      false,
      'trial',
      subscription_tier,
      NOW() + INTERVAL '14 days'
    ) RETURNING id INTO new_org_id;

    -- Create profile for the user
    INSERT INTO profiles (
      id,
      organization_id,
      email,
      full_name,
      role,
      is_active
    ) VALUES (
      user_id,
      new_org_id,
      COALESCE(demo_session_record.user_email, 'converted@example.com'),
      COALESCE(demo_session_record.user_name, 'Converted User'),
      'owner',
      true
    ) ON CONFLICT (id) DO UPDATE SET
      organization_id = new_org_id,
      role = 'owner';

    -- Copy contacts from demo organization
    WITH copied_contacts AS (
      INSERT INTO contacts (
        organization_id,
        whatsapp_id,
        phone_number,
        name,
        profile_picture_url,
        tags,
        notes,
        is_blocked,
        created_at
      )
      SELECT
        new_org_id,
        whatsapp_id,
        phone_number,
        name,
        profile_picture_url,
        tags,
        notes,
        is_blocked,
        NOW()
      FROM contacts
      WHERE organization_id = demo_session_record.organization_id
      RETURNING id, whatsapp_id
    )
    SELECT jsonb_object_agg(
      old_contacts.id::TEXT,
      new_contacts.id::TEXT
    ) INTO contact_mapping
    FROM contacts old_contacts
    JOIN copied_contacts new_contacts ON new_contacts.whatsapp_id = old_contacts.whatsapp_id
    WHERE old_contacts.organization_id = demo_session_record.organization_id;

    -- Copy conversations from demo organization
    WITH copied_conversations AS (
      INSERT INTO conversations (
        organization_id,
        contact_id,
        assigned_to,
        status,
        priority,
        subject,
        created_at
      )
      SELECT
        new_org_id,
        (contact_mapping->>old_conv.contact_id::TEXT)::UUID,
        user_id, -- Assign to the new owner
        old_conv.status,
        old_conv.priority,
        old_conv.subject,
        NOW()
      FROM conversations old_conv
      WHERE old_conv.organization_id = demo_session_record.organization_id
        AND contact_mapping ? old_conv.contact_id::TEXT
      RETURNING id, subject
    )
    SELECT jsonb_object_agg(
      old_conversations.id::TEXT,
      new_conversations.id::TEXT
    ) INTO conversation_mapping
    FROM conversations old_conversations
    JOIN copied_conversations new_conversations ON new_conversations.subject = old_conversations.subject
    WHERE old_conversations.organization_id = demo_session_record.organization_id;

    -- Copy recent messages (last 50 per conversation)
    INSERT INTO messages (
      conversation_id,
      whatsapp_message_id,
      sender_type,
      sender_id,
      content,
      message_type,
      media_url,
      media_mime_type,
      is_read,
      created_at
    )
    SELECT
      (conversation_mapping->>old_messages.conversation_id::TEXT)::UUID,
      old_messages.whatsapp_message_id,
      old_messages.sender_type,
      CASE
        WHEN old_messages.sender_type = 'agent' THEN user_id
        ELSE old_messages.sender_id
      END,
      old_messages.content,
      old_messages.message_type,
      old_messages.media_url,
      old_messages.media_mime_type,
      old_messages.is_read,
      NOW() - (EXTRACT(epoch FROM (NOW() - old_messages.created_at)) || ' seconds')::INTERVAL
    FROM (
      SELECT
        m.*,
        ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) as rn
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.organization_id = demo_session_record.organization_id
    ) old_messages
    WHERE old_messages.rn <= 50
      AND conversation_mapping ? old_messages.conversation_id::TEXT;

    -- Copy automation rules
    INSERT INTO automation_rules (
      organization_id,
      name,
      description,
      trigger_type,
      trigger_conditions,
      actions,
      is_active,
      created_by
    )
    SELECT
      new_org_id,
      name,
      description,
      trigger_type,
      trigger_conditions,
      actions,
      is_active,
      user_id
    FROM automation_rules
    WHERE organization_id = demo_session_record.organization_id;

    -- Copy message templates
    INSERT INTO message_templates (
      organization_id,
      name,
      content,
      category,
      variables,
      is_active,
      created_by
    )
    SELECT
      new_org_id,
      name,
      content,
      category,
      variables,
      is_active,
      user_id
    FROM message_templates
    WHERE organization_id = demo_session_record.organization_id;

    -- Update demo session status
    UPDATE demo_sessions
    SET
      status = 'converted',
      conversion_data = jsonb_build_object(
        'converted_at', NOW(),
        'new_organization_id', new_org_id,
        'new_organization_name', organization_name,
        'user_id', user_id,
        'contacts_copied', jsonb_object_length(contact_mapping),
        'conversations_copied', jsonb_object_length(conversation_mapping)
      )
    WHERE session_token = session_token_param;

    -- Log the conversion
    INSERT INTO demo_session_activities (
      session_id,
      activity_type,
      activity_data
    ) VALUES (
      demo_session_record.id,
      'signup_clicked',
      jsonb_build_object(
        'conversion_completed', true,
        'new_organization_id', new_org_id,
        'organization_name', organization_name
      )
    );

    RETURN QUERY SELECT true, new_org_id, 'Demo session converted successfully';

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN QUERY SELECT false, NULL::UUID, 'Conversion failed: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk extend demo sessions
CREATE OR REPLACE FUNCTION bulk_extend_demo_sessions(
  template_type_filter TEXT DEFAULT NULL,
  hours_to_extend INTEGER DEFAULT 24,
  max_sessions INTEGER DEFAULT 100
) RETURNS TABLE (
  sessions_extended INTEGER,
  session_tokens TEXT[]
) AS $$
DECLARE
  session_record RECORD;
  extended_count INTEGER := 0;
  extended_tokens TEXT[] := '{}';
BEGIN
  FOR session_record IN
    SELECT ds.session_token
    FROM demo_sessions ds
    JOIN organizations o ON o.id = ds.organization_id
    WHERE ds.status = 'active'
      AND ds.expires_at > NOW()
      AND ds.expires_at < NOW() + INTERVAL '2 hours'  -- Sessions expiring soon
      AND (template_type_filter IS NULL OR o.demo_template_type = template_type_filter)
    ORDER BY ds.expires_at ASC
    LIMIT max_sessions
  LOOP
    PERFORM extend_demo_session(session_record.session_token, hours_to_extend);
    extended_count := extended_count + 1;
    extended_tokens := array_append(extended_tokens, session_record.session_token);
  END LOOP;

  RETURN QUERY SELECT extended_count, extended_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversion funnel analytics
CREATE OR REPLACE FUNCTION get_demo_conversion_funnel(
  date_from DATE DEFAULT (NOW() - INTERVAL '30 days')::DATE,
  date_to DATE DEFAULT NOW()::DATE
) RETURNS TABLE (
  step_name TEXT,
  step_order INTEGER,
  total_sessions INTEGER,
  completed_step INTEGER,
  conversion_rate NUMERIC,
  avg_time_to_complete INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_steps AS (
    SELECT 'Session Created' as step_name, 1 as step_order
    UNION ALL
    SELECT 'First Page View', 2
    UNION ALL
    SELECT 'Message Interaction', 3
    UNION ALL
    SELECT 'Contact Viewed', 4
    UNION ALL
    SELECT 'Analytics Viewed', 5
    UNION ALL
    SELECT 'Signup Clicked', 6
    UNION ALL
    SELECT 'Conversion Completed', 7
  ),
  session_data AS (
    SELECT
      ds.id as session_id,
      ds.created_at,
      ds.status,
      CASE WHEN EXISTS (
        SELECT 1 FROM demo_session_activities dsa
        WHERE dsa.session_id = ds.id AND dsa.activity_type = 'page_view'
      ) THEN 1 ELSE 0 END as has_page_view,
      CASE WHEN EXISTS (
        SELECT 1 FROM demo_session_activities dsa
        WHERE dsa.session_id = ds.id AND dsa.activity_type = 'message_sent'
      ) THEN 1 ELSE 0 END as has_message_interaction,
      CASE WHEN EXISTS (
        SELECT 1 FROM demo_session_activities dsa
        WHERE dsa.session_id = ds.id AND dsa.activity_type = 'contact_viewed'
      ) THEN 1 ELSE 0 END as has_contact_viewed,
      CASE WHEN EXISTS (
        SELECT 1 FROM demo_session_activities dsa
        WHERE dsa.session_id = ds.id AND dsa.activity_type = 'analytics_viewed'
      ) THEN 1 ELSE 0 END as has_analytics_viewed,
      CASE WHEN EXISTS (
        SELECT 1 FROM demo_session_activities dsa
        WHERE dsa.session_id = ds.id AND dsa.activity_type = 'signup_clicked'
      ) THEN 1 ELSE 0 END as has_signup_clicked,
      CASE WHEN ds.status = 'converted' THEN 1 ELSE 0 END as is_converted,
      -- Time to complete each step
      (SELECT MIN(dsa.created_at) FROM demo_session_activities dsa
       WHERE dsa.session_id = ds.id AND dsa.activity_type = 'page_view') - ds.created_at as time_to_page_view,
      (SELECT MIN(dsa.created_at) FROM demo_session_activities dsa
       WHERE dsa.session_id = ds.id AND dsa.activity_type = 'signup_clicked') - ds.created_at as time_to_signup
    FROM demo_sessions ds
    WHERE ds.created_at::DATE BETWEEN date_from AND date_to
  ),
  total_sessions_count AS (
    SELECT COUNT(*) as total FROM session_data
  )
  SELECT
    fs.step_name,
    fs.step_order,
    tsc.total::INTEGER,
    CASE fs.step_order
      WHEN 1 THEN tsc.total
      WHEN 2 THEN SUM(sd.has_page_view)
      WHEN 3 THEN SUM(sd.has_message_interaction)
      WHEN 4 THEN SUM(sd.has_contact_viewed)
      WHEN 5 THEN SUM(sd.has_analytics_viewed)
      WHEN 6 THEN SUM(sd.has_signup_clicked)
      WHEN 7 THEN SUM(sd.is_converted)
    END::INTEGER as completed_step,
    CASE
      WHEN tsc.total > 0 THEN
        ROUND((CASE fs.step_order
          WHEN 1 THEN tsc.total
          WHEN 2 THEN SUM(sd.has_page_view)
          WHEN 3 THEN SUM(sd.has_message_interaction)
          WHEN 4 THEN SUM(sd.has_contact_viewed)
          WHEN 5 THEN SUM(sd.has_analytics_viewed)
          WHEN 6 THEN SUM(sd.has_signup_clicked)
          WHEN 7 THEN SUM(sd.is_converted)
        END::NUMERIC / tsc.total::NUMERIC) * 100, 2)
      ELSE 0
    END as conversion_rate,
    CASE fs.step_order
      WHEN 2 THEN AVG(sd.time_to_page_view)
      WHEN 6 THEN AVG(sd.time_to_signup)
      ELSE NULL
    END as avg_time_to_complete
  FROM funnel_steps fs
  CROSS JOIN session_data sd
  CROSS JOIN total_sessions_count tsc
  GROUP BY fs.step_name, fs.step_order, tsc.total
  ORDER BY fs.step_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate demo session management report
CREATE OR REPLACE FUNCTION generate_demo_management_report()
RETURNS TEXT AS $$
DECLARE
  report_text TEXT;
  stats_record RECORD;
  funnel_record RECORD;
  session_record RECORD;
BEGIN
  report_text := E'Demo Session Management Report\n';
  report_text := report_text || E'Generated: ' || NOW()::TEXT || E'\n';
  report_text := report_text || E'=====================================\n\n';

  -- Overall statistics
  SELECT * INTO stats_record FROM get_demo_session_stats();

  report_text := report_text || E'Overall Statistics (Last 30 Days):\n';
  report_text := report_text || E'----------------------------------\n';
  report_text := report_text || 'Total Sessions: ' || stats_record.total_sessions || E'\n';
  report_text := report_text || 'Active Sessions: ' || stats_record.active_sessions || E'\n';
  report_text := report_text || 'Expired Sessions: ' || stats_record.expired_sessions || E'\n';
  report_text := report_text || 'Converted Sessions: ' || stats_record.converted_sessions || E'\n';
  report_text := report_text || 'Conversion Rate: ' || stats_record.conversion_rate || '%' || E'\n';
  report_text := report_text || 'Average Session Duration: ' || stats_record.avg_session_duration || E'\n\n';

  -- Template breakdown
  report_text := report_text || 'Template Type Breakdown: ' || stats_record.top_template_types::TEXT || E'\n\n';

  -- Conversion funnel
  report_text := report_text || E'Conversion Funnel:\n';
  report_text := report_text || E'-----------------\n';

  FOR funnel_record IN
    SELECT * FROM get_demo_conversion_funnel()
    ORDER BY step_order
  LOOP
    report_text := report_text || funnel_record.step_order || '. ' || funnel_record.step_name;
    report_text := report_text || ': ' || funnel_record.completed_step || '/' || funnel_record.total_sessions;
    report_text := report_text || ' (' || funnel_record.conversion_rate || '%)' || E'\n';
  END LOOP;

  -- Active sessions requiring attention
  report_text := report_text || E'\nActive Sessions Expiring Soon:\n';
  report_text := report_text || E'-------------------------------\n';

  FOR session_record IN
    SELECT * FROM get_active_demo_sessions()
    WHERE time_remaining < INTERVAL '2 hours'
    ORDER BY time_remaining ASC
    LIMIT 10
  LOOP
    report_text := report_text || '• ' || session_record.organization_name;
    report_text := report_text || ' (' || session_record.template_type || ')';
    report_text := report_text || ' - expires in ' || session_record.time_remaining;
    report_text := report_text || ' - ' || session_record.total_activities || ' activities' || E'\n';
  END LOOP;

  IF NOT FOUND THEN
    report_text := report_text || 'No sessions expiring in the next 2 hours.' || E'\n';
  END IF;

  report_text := report_text || E'\nReport completed successfully.\n';

  RETURN report_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;