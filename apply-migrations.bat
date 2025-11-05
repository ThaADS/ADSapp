@echo off
echo ============================================================
echo Applying Team Invitations + WhatsApp Credentials Migrations
echo ============================================================
echo.

REM Get project ref from user
set /p PROJECT_REF="Enter your Supabase Project Reference (from dashboard URL): "

echo.
echo Linking project...
npx supabase link --project-ref %PROJECT_REF%

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to link project
    echo Make sure:
    echo 1. Project reference is correct
    echo 2. You are logged in: npx supabase login
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Step 1: Applying ABSOLUTE_MINIMAL migration
echo ============================================================
npx supabase db execute --file supabase/migrations/20251105_team_invitations_ABSOLUTE_MINIMAL.sql --linked

if %errorlevel% neq 0 (
    echo ERROR: Step 1 failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Step 2: Applying CONSTRAINTS migration
echo ============================================================
npx supabase db execute --file supabase/migrations/20251105_team_invitations_ADD_CONSTRAINTS.sql --linked

if %errorlevel% neq 0 (
    echo ERROR: Step 2 failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Step 3: Applying FUNCTIONS migration
echo ============================================================
npx supabase db execute --file supabase/migrations/20251105_team_invitations_part2_functions.sql --linked

if %errorlevel% neq 0 (
    echo ERROR: Step 3 failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Step 4: Applying WhatsApp Credentials migration
echo ============================================================
npx supabase db execute --file supabase/migrations/20251105_whatsapp_credentials_enhancement.sql --linked

if %errorlevel% neq 0 (
    echo ERROR: Step 4 failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS! All migrations applied
echo ============================================================
echo.
echo Verification queries:
echo.
echo SELECT column_name FROM information_schema.columns WHERE table_name = 'team_invitations';
echo SELECT proname FROM pg_proc WHERE proname LIKE '%%team%%';
echo.
pause
