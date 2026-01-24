-- Check existing function definitions
SELECT
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
    'log_invitation_event',
    'log_api_key_event',
    'create_workflow_version',
    'accept_team_invitation',
    'get_crm_connection_status'
)
AND pronamespace = 'public'::regnamespace;
