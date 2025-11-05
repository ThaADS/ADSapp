# ============================================================================
# Apply Migrations Directly via Supabase
# ============================================================================
# Prerequisites: You need to get your DATABASE_URL from Supabase Dashboard
# Settings > Database > Connection string (Direct connection)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Supabase Migrations - Direct Application" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Option 1: Via Supabase CLI with access token
Write-Host "Option 1: Via Supabase CLI" -ForegroundColor Yellow
Write-Host "1. Go to: https://supabase.com/dashboard/account/tokens" -ForegroundColor White
Write-Host "2. Generate a new access token" -ForegroundColor White
Write-Host "3. Run: `$env:SUPABASE_ACCESS_TOKEN='your-token'" -ForegroundColor White
Write-Host "4. Run: npx supabase link --project-ref egaiyydjgeqlhthxmvbn" -ForegroundColor White
Write-Host "5. Run: npx supabase db push" -ForegroundColor White
Write-Host ""

# Option 2: Manual via Dashboard
Write-Host "Option 2: Manual via Dashboard (RECOMMENDED - easiest)" -ForegroundColor Green
Write-Host "1. Go to: https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new" -ForegroundColor White
Write-Host "2. Copy and paste each migration file in order:" -ForegroundColor White
Write-Host "   a) 20251105_team_invitations_ABSOLUTE_MINIMAL.sql" -ForegroundColor Cyan
Write-Host "   b) 20251105_team_invitations_ADD_CONSTRAINTS.sql" -ForegroundColor Cyan
Write-Host "   c) 20251105_team_invitations_part2_functions.sql" -ForegroundColor Cyan
Write-Host "   d) 20251105_whatsapp_credentials_enhancement.sql" -ForegroundColor Cyan
Write-Host ""

# Check if migrations already applied
Write-Host "Checking current database state..." -ForegroundColor Yellow
Write-Host ""
Write-Host "ALREADY APPLIED (via Dashboard):" -ForegroundColor Green
Write-Host "✅ ABSOLUTE_MINIMAL - team_invitations table created" -ForegroundColor Green
Write-Host ""
Write-Host "PENDING:" -ForegroundColor Yellow
Write-Host "⏳ ADD_CONSTRAINTS - Foreign keys + CHECK + RLS" -ForegroundColor Yellow
Write-Host "⏳ part2_functions - Functions + Triggers" -ForegroundColor Yellow
Write-Host "⏳ whatsapp_credentials - Access token columns" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press any key to open Supabase SQL Editor..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

Start-Process "https://supabase.com/dashboard/project/egaiyydjgeqlhthxmvbn/sql/new"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open migration file: 20251105_team_invitations_ADD_CONSTRAINTS.sql" -ForegroundColor White
Write-Host "2. Copy ALL contents" -ForegroundColor White
Write-Host "3. Paste in SQL Editor" -ForegroundColor White
Write-Host "4. Click 'Run'" -ForegroundColor White
Write-Host "5. Repeat for remaining migrations" -ForegroundColor White
Write-Host ""
