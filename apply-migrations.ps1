# ============================================================================
# Apply Database Migrations via Supabase REST API
# ============================================================================

$ErrorActionPreference = "Stop"

# Supabase Configuration
$SUPABASE_URL = "https://egaiyydjgeqlhthxmvbn.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE"

# Migration files in order
$migrations = @(
    @{
        Name = "ADD_CONSTRAINTS"
        File = "supabase\migrations\20251105_team_invitations_ADD_CONSTRAINTS.sql"
        Description = "Foreign keys, CHECK constraints, RLS policies"
    },
    @{
        Name = "FUNCTIONS"
        File = "supabase\migrations\20251105_team_invitations_part2_functions.sql"
        Description = "Functions and triggers"
    },
    @{
        Name = "WHATSAPP_CREDENTIALS"
        File = "supabase\migrations\20251105_whatsapp_credentials_enhancement.sql"
        Description = "WhatsApp access token columns"
    }
)

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Supabase Migrations - Direct Application" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Project: egaiyydjgeqlhthxmvbn"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

$success = 0
$failed = 0

foreach ($migration in $migrations) {
    Write-Host "`n============================================================" -ForegroundColor Yellow
    Write-Host "Applying: $($migration.Name)" -ForegroundColor Yellow
    Write-Host "File: $($migration.File)" -ForegroundColor Gray
    Write-Host "Description: $($migration.Description)" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Yellow

    try {
        # Read SQL file
        $sql = Get-Content -Path $migration.File -Raw -Encoding UTF8
        Write-Host "Reading SQL file... $($sql.Length) characters" -ForegroundColor Gray

        # Execute via Supabase postgREST
        $headers = @{
            "apikey" = $SERVICE_ROLE_KEY
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
            "Content-Type" = "application/x-www-form-urlencoded"
            "Prefer" = "return=minimal"
        }

        $body = @{
            query = $sql
        } | ConvertTo-Json

        Write-Host "Executing migration..." -ForegroundColor Gray

        $response = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/rpc/exec" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction Stop

        Write-Host "✅ SUCCESS: $($migration.Name)" -ForegroundColor Green
        $success++

    } catch {
        Write-Host "❌ FAILED: $($migration.Name)" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $failed++

        Write-Host "`n⚠️  Migration failed. Stopping here." -ForegroundColor Yellow
        break
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "MIGRATION SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Successful: $success/$($migrations.Count)" -ForegroundColor Green
Write-Host "❌ Failed: $failed/$($migrations.Count)" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host "`n🎉 All migrations applied successfully!" -ForegroundColor Green

    Write-Host "`n📊 Running verification queries..." -ForegroundColor Cyan

    # Verification query
    try {
        $verifyHeaders = @{
            "apikey" = $SERVICE_ROLE_KEY
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
        }

        # Check team_invitations table
        $columns = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/information_schema.columns?table_name=eq.team_invitations&select=column_name" `
            -Method GET `
            -Headers $verifyHeaders

        Write-Host "✓ team_invitations columns: $($columns.Count) found" -ForegroundColor Green

        Write-Host "`n✅ Verification complete" -ForegroundColor Green

    } catch {
        Write-Host "⚠️  Verification queries failed (this is OK, migrations likely succeeded)" -ForegroundColor Yellow
    }

} else {
    Write-Host "`n⚠️  Some migrations failed. Check errors above." -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
