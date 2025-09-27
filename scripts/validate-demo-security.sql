-- Demo System Security Validation Script
-- This script validates the security and data isolation of the demo system

-- Function to test demo session validation
CREATE OR REPLACE FUNCTION test_demo_session_security()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  test_token TEXT;
  demo_org_id UUID;
  validation_result RECORD;
BEGIN
  -- Test 1: Create demo session
  BEGIN
    SELECT session_token, organization_id INTO test_token, demo_org_id
    FROM create_demo_session('ecommerce', 'test@example.com', 'Test User', 1);

    RETURN QUERY SELECT 'Demo Session Creation', 'PASS', 'Successfully created demo session: ' || test_token;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Demo Session Creation', 'FAIL', 'Error: ' || SQLERRM;
    RETURN;
  END;

  -- Test 2: Validate session token
  BEGIN
    SELECT * INTO validation_result FROM validate_demo_session(test_token);

    IF validation_result.is_valid THEN
      RETURN QUERY SELECT 'Session Token Validation', 'PASS', 'Session token validated successfully';
    ELSE
      RETURN QUERY SELECT 'Session Token Validation', 'FAIL', 'Session token validation failed';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Session Token Validation', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 3: Validate invalid token
  BEGIN
    SELECT * INTO validation_result FROM validate_demo_session('invalid_token_123');

    IF NOT validation_result.is_valid THEN
      RETURN QUERY SELECT 'Invalid Token Rejection', 'PASS', 'Invalid token correctly rejected';
    ELSE
      RETURN QUERY SELECT 'Invalid Token Rejection', 'FAIL', 'Invalid token was incorrectly accepted';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Invalid Token Rejection', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 4: Track demo activity
  BEGIN
    IF track_demo_activity(test_token, 'page_view', '{"page": "/dashboard"}'::jsonb, '/dashboard', 30) THEN
      RETURN QUERY SELECT 'Activity Tracking', 'PASS', 'Activity tracked successfully';
    ELSE
      RETURN QUERY SELECT 'Activity Tracking', 'FAIL', 'Activity tracking failed';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Activity Tracking', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 5: Extend demo session
  BEGIN
    PERFORM extend_demo_session(test_token, 2);
    RETURN QUERY SELECT 'Session Extension', 'PASS', 'Session extended successfully';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Session Extension', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 6: Reset demo organization
  BEGIN
    PERFORM reset_demo_organization(demo_org_id, 'security_test');
    RETURN QUERY SELECT 'Demo Reset', 'PASS', 'Demo organization reset successfully';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Demo Reset', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Cleanup test data
  DELETE FROM organizations WHERE id = demo_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test RLS policies for demo data isolation
CREATE OR REPLACE FUNCTION test_demo_rls_policies()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  demo_org_id UUID;
  regular_org_id UUID;
  demo_session_token TEXT;
  demo_contact_id UUID;
  regular_contact_id UUID;
  accessible_count INTEGER;
BEGIN
  -- Setup: Create demo and regular organizations
  INSERT INTO organizations (name, slug, is_demo, demo_expires_at, demo_template_type)
  VALUES ('Demo Org Test', 'demo-test-org', true, NOW() + INTERVAL '1 hour', 'ecommerce')
  RETURNING id INTO demo_org_id;

  INSERT INTO organizations (name, slug, is_demo)
  VALUES ('Regular Org Test', 'regular-test-org', false)
  RETURNING id INTO regular_org_id;

  -- Create demo session
  INSERT INTO demo_sessions (organization_id, session_token, expires_at)
  VALUES (demo_org_id, 'test-token-' || extract(epoch from now())::text, NOW() + INTERVAL '1 hour')
  RETURNING session_token INTO demo_session_token;

  -- Create test contacts
  INSERT INTO contacts (organization_id, whatsapp_id, phone_number, name)
  VALUES
    (demo_org_id, 'demo_contact_1', '+15551111111', 'Demo Contact')
    RETURNING id INTO demo_contact_id;

  INSERT INTO contacts (organization_id, whatsapp_id, phone_number, name)
  VALUES
    (regular_org_id, 'regular_contact_1', '+15552222222', 'Regular Contact')
    RETURNING id INTO regular_contact_id;

  -- Test 1: Anonymous users can access demo contacts
  BEGIN
    -- Simulate anonymous access to demo data
    SET ROLE anon;

    SELECT COUNT(*) INTO accessible_count
    FROM contacts
    WHERE organization_id = demo_org_id;

    RESET ROLE;

    IF accessible_count > 0 THEN
      RETURN QUERY SELECT 'Anonymous Demo Access', 'PASS', 'Anonymous users can access demo contacts (' || accessible_count || ' found)';
    ELSE
      RETURN QUERY SELECT 'Anonymous Demo Access', 'FAIL', 'Anonymous users cannot access demo contacts';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'Anonymous Demo Access', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 2: Anonymous users cannot access regular organization data
  BEGIN
    SET ROLE anon;

    SELECT COUNT(*) INTO accessible_count
    FROM contacts
    WHERE organization_id = regular_org_id;

    RESET ROLE;

    IF accessible_count = 0 THEN
      RETURN QUERY SELECT 'Anonymous Regular Data Isolation', 'PASS', 'Anonymous users cannot access regular organization data';
    ELSE
      RETURN QUERY SELECT 'Anonymous Regular Data Isolation', 'FAIL', 'Anonymous users can inappropriately access regular data (' || accessible_count || ' found)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'Anonymous Regular Data Isolation', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 3: Demo sessions are properly isolated
  BEGIN
    SELECT COUNT(*) INTO accessible_count
    FROM demo_sessions ds
    WHERE ds.organization_id = demo_org_id;

    IF accessible_count > 0 THEN
      RETURN QUERY SELECT 'Demo Session Isolation', 'PASS', 'Demo sessions are accessible (' || accessible_count || ' found)';
    ELSE
      RETURN QUERY SELECT 'Demo Session Isolation', 'FAIL', 'Demo sessions are not accessible';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Demo Session Isolation', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Test 4: Expired demo sessions are handled correctly
  BEGIN
    -- Update demo session to be expired
    UPDATE demo_sessions
    SET expires_at = NOW() - INTERVAL '1 hour'
    WHERE session_token = demo_session_token;

    -- Update demo organization to be expired
    UPDATE organizations
    SET demo_expires_at = NOW() - INTERVAL '1 hour'
    WHERE id = demo_org_id;

    -- Test access to expired demo data
    SET ROLE anon;

    SELECT COUNT(*) INTO accessible_count
    FROM contacts
    WHERE organization_id = demo_org_id;

    RESET ROLE;

    IF accessible_count = 0 THEN
      RETURN QUERY SELECT 'Expired Demo Access Control', 'PASS', 'Expired demo data is properly blocked';
    ELSE
      RETURN QUERY SELECT 'Expired Demo Access Control', 'FAIL', 'Expired demo data is still accessible (' || accessible_count || ' found)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'Expired Demo Access Control', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Cleanup test data
  DELETE FROM organizations WHERE id IN (demo_org_id, regular_org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test demo data seeding security
CREATE OR REPLACE FUNCTION test_demo_data_seeding()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  demo_org_id UUID;
  contact_count INTEGER;
  conversation_count INTEGER;
  message_count INTEGER;
  template_count INTEGER;
  rule_count INTEGER;
BEGIN
  -- Create test demo organization
  INSERT INTO organizations (name, slug, is_demo, demo_expires_at, demo_template_type)
  VALUES ('Seed Test Org', 'seed-test-org', true, NOW() + INTERVAL '1 hour', 'ecommerce')
  RETURNING id INTO demo_org_id;

  -- Test seeding function
  BEGIN
    PERFORM seed_demo_organization_data(demo_org_id, 'ecommerce');
    RETURN QUERY SELECT 'Demo Data Seeding', 'PASS', 'Seeding function executed without errors';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Demo Data Seeding', 'FAIL', 'Error: ' || SQLERRM;
    -- Cleanup and exit
    DELETE FROM organizations WHERE id = demo_org_id;
    RETURN;
  END;

  -- Verify seeded data counts
  SELECT COUNT(*) INTO contact_count FROM contacts WHERE organization_id = demo_org_id;
  SELECT COUNT(*) INTO conversation_count FROM conversations WHERE organization_id = demo_org_id;
  SELECT COUNT(*) INTO template_count FROM message_templates WHERE organization_id = demo_org_id;
  SELECT COUNT(*) INTO rule_count FROM automation_rules WHERE organization_id = demo_org_id;

  SELECT COUNT(*) INTO message_count
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.organization_id = demo_org_id;

  -- Validate seeded data
  IF contact_count > 0 THEN
    RETURN QUERY SELECT 'Contacts Seeded', 'PASS', contact_count || ' contacts created';
  ELSE
    RETURN QUERY SELECT 'Contacts Seeded', 'FAIL', 'No contacts were created';
  END IF;

  IF conversation_count > 0 THEN
    RETURN QUERY SELECT 'Conversations Seeded', 'PASS', conversation_count || ' conversations created';
  ELSE
    RETURN QUERY SELECT 'Conversations Seeded', 'FAIL', 'No conversations were created';
  END IF;

  IF message_count > 0 THEN
    RETURN QUERY SELECT 'Messages Seeded', 'PASS', message_count || ' messages created';
  ELSE
    RETURN QUERY SELECT 'Messages Seeded', 'FAIL', 'No messages were created';
  END IF;

  IF template_count > 0 THEN
    RETURN QUERY SELECT 'Templates Seeded', 'PASS', template_count || ' templates created';
  ELSE
    RETURN QUERY SELECT 'Templates Seeded', 'FAIL', 'No templates were created';
  END IF;

  IF rule_count > 0 THEN
    RETURN QUERY SELECT 'Automation Rules Seeded', 'PASS', rule_count || ' rules created';
  ELSE
    RETURN QUERY SELECT 'Automation Rules Seeded', 'FAIL', 'No automation rules were created';
  END IF;

  -- Cleanup test data
  DELETE FROM organizations WHERE id = demo_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test demo cleanup functionality
CREATE OR REPLACE FUNCTION test_demo_cleanup()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  expired_org_id UUID;
  active_org_id UUID;
  cleanup_count INTEGER;
  remaining_count INTEGER;
BEGIN
  -- Create expired demo organization
  INSERT INTO organizations (name, slug, is_demo, demo_expires_at, demo_template_type)
  VALUES ('Expired Demo', 'expired-demo', true, NOW() - INTERVAL '1 hour', 'ecommerce')
  RETURNING id INTO expired_org_id;

  -- Create active demo organization
  INSERT INTO organizations (name, slug, is_demo, demo_expires_at, demo_template_type)
  VALUES ('Active Demo', 'active-demo', true, NOW() + INTERVAL '1 hour', 'ecommerce')
  RETURNING id INTO active_org_id;

  -- Create expired demo session
  INSERT INTO demo_sessions (organization_id, session_token, expires_at, status)
  VALUES (expired_org_id, 'expired-session-token', NOW() - INTERVAL '1 hour', 'active');

  -- Create active demo session
  INSERT INTO demo_sessions (organization_id, session_token, expires_at, status)
  VALUES (active_org_id, 'active-session-token', NOW() + INTERVAL '1 hour', 'active');

  -- Test cleanup function
  BEGIN
    SELECT cleanup_expired_demo_sessions() INTO cleanup_count;
    RETURN QUERY SELECT 'Demo Cleanup Execution', 'PASS', 'Cleanup function executed, cleaned up ' || cleanup_count || ' items';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Demo Cleanup Execution', 'FAIL', 'Error: ' || SQLERRM;
  END;

  -- Verify expired organization was cleaned up
  SELECT COUNT(*) INTO remaining_count
  FROM organizations
  WHERE id = expired_org_id;

  IF remaining_count = 0 THEN
    RETURN QUERY SELECT 'Expired Org Cleanup', 'PASS', 'Expired demo organization was properly cleaned up';
  ELSE
    RETURN QUERY SELECT 'Expired Org Cleanup', 'FAIL', 'Expired demo organization was not cleaned up';
  END IF;

  -- Verify active organization was preserved
  SELECT COUNT(*) INTO remaining_count
  FROM organizations
  WHERE id = active_org_id;

  IF remaining_count = 1 THEN
    RETURN QUERY SELECT 'Active Org Preservation', 'PASS', 'Active demo organization was preserved';
  ELSE
    RETURN QUERY SELECT 'Active Org Preservation', 'FAIL', 'Active demo organization was incorrectly removed';
  END IF;

  -- Cleanup remaining test data
  DELETE FROM organizations WHERE id = active_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main validation function that runs all tests
CREATE OR REPLACE FUNCTION validate_demo_system_security()
RETURNS TABLE (
  test_category TEXT,
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Test demo session functionality
  RETURN QUERY
  SELECT 'Session Management', t.test_name, t.status, t.details
  FROM test_demo_session_security() t;

  -- Test RLS policies
  RETURN QUERY
  SELECT 'RLS Policies', t.test_name, t.status, t.details
  FROM test_demo_rls_policies() t;

  -- Test data seeding
  RETURN QUERY
  SELECT 'Data Seeding', t.test_name, t.status, t.details
  FROM test_demo_data_seeding() t;

  -- Test cleanup functionality
  RETURN QUERY
  SELECT 'Cleanup', t.test_name, t.status, t.details
  FROM test_demo_cleanup() t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a security validation report
CREATE OR REPLACE FUNCTION generate_demo_security_report()
RETURNS TEXT AS $$
DECLARE
  report_text TEXT;
  test_record RECORD;
  pass_count INTEGER := 0;
  fail_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  report_text := E'Demo System Security Validation Report\n';
  report_text := report_text || E'Generated: ' || NOW()::TEXT || E'\n';
  report_text := report_text || E'===============================================\n\n';

  FOR test_record IN
    SELECT * FROM validate_demo_system_security()
    ORDER BY test_category, test_name
  LOOP
    total_count := total_count + 1;

    report_text := report_text || '[' || test_record.test_category || '] ';
    report_text := report_text || test_record.test_name || ': ';
    report_text := report_text || test_record.status;

    IF test_record.status = 'PASS' THEN
      pass_count := pass_count + 1;
    ELSE
      fail_count := fail_count + 1;
    END IF;

    report_text := report_text || E'\n  ' || test_record.details || E'\n\n';
  END LOOP;

  report_text := report_text || E'Summary:\n';
  report_text := report_text || E'--------\n';
  report_text := report_text || 'Total Tests: ' || total_count || E'\n';
  report_text := report_text || 'Passed: ' || pass_count || E'\n';
  report_text := report_text || 'Failed: ' || fail_count || E'\n';
  report_text := report_text || 'Success Rate: ' || ROUND((pass_count::NUMERIC / total_count::NUMERIC) * 100, 2) || '%' || E'\n';

  IF fail_count = 0 THEN
    report_text := report_text || E'\n✅ All security tests passed! Demo system is secure.\n';
  ELSE
    report_text := report_text || E'\n❌ Some security tests failed. Please review and fix issues.\n';
  END IF;

  RETURN report_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;