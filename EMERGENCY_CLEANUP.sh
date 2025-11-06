#!/bin/bash

# 🚨 EMERGENCY SECURITY CLEANUP SCRIPT
# This script removes all files containing leaked credentials from the repository
# RUN THIS IMMEDIATELY

set -e

echo "🚨 EMERGENCY: Cleaning up exposed credentials"
echo "================================================"

# Step 1: Remove files with leaked credentials
echo "📁 Removing files with exposed secrets..."

rm -f FINAL_STATUS_2025-10-20.md
rm -f ADMIN_FIX_COMPLETE.md
rm -f ADMIN_DASHBOARD_COMPLETE_FIX.md
rm -f ADMIN_TABS_FIXED_COMPLETE.md
rm -f SUPER-ADMIN-PRODUCTION-GUIDE.md
rm -f docker-compose.test.yml
rm -f setup-db-simple.js
rm -f apply-schema.js
rm -rf .jest-cache/
rm -rf temp-docs/
rm -f .claude/settings.local.json
rm -rf docs/AI_BUILD_STATUS_FINAL.md

# Step 2: Update .gitignore
echo "🛡️ Updating .gitignore with security patterns..."

cat >> .gitignore <<'GITIGNORE'

# ===============================================
# SECURITY: Never commit these files
# ===============================================

# Credentials and Secrets
*.local.json
*.backup
.env
.env.*
!.env.example
**/secrets/**
leaked-*
credential-*

# Status/Completion Files (often contain credentials)
FINAL_STATUS_*.md
ADMIN_*_COMPLETE*.md
SUPER-ADMIN-*.md
*_BREACH_*.md
*_SECURITY_*.md
STATUS_*_PERCENT.md

# Scripts with embedded credentials
setup-db-simple.js
apply-schema.js
*-with-credentials.*
add-env-vars.ps1
setup-stripe-env.ps1

# Docker files with secrets
docker-compose.test.yml
docker-compose.local.yml

# Temporary and cache directories
.jest-cache/
temp-docs/
.cursor/

# Test files with real credentials
*.test.backup
.env.test.backup
auth.setup.ts.bak

GITIGNORE

# Step 3: Stage the changes
echo "📝 Staging cleaned files..."
git add -A

# Step 4: Commit the cleanup
echo "💾 Committing security cleanup..."
git commit -m "security: Emergency cleanup of 79 leaked credentials

🚨 CRITICAL SECURITY FIX

Removed files containing:
- Resend API keys
- Supabase Service Role keys
- OpenRouter API keys
- PostgreSQL credentials
- Redis credentials
- Email passwords
- JWT tokens
- Stripe webhook secrets

Files removed:
- FINAL_STATUS_2025-10-20.md
- ADMIN_FIX_COMPLETE.md
- SUPER-ADMIN-PRODUCTION-GUIDE.md
- docker-compose.test.yml
- setup-db-simple.js
- .claude/settings.local.json
- temp-docs/ directory
- .jest-cache/ directory

Updated .gitignore to prevent future leaks.

ACTION REQUIRED:
1. Revoke ALL API keys immediately
2. Reset database passwords
3. Update production environment variables
4. Force push to rewrite git history

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Cleanup commit created"
echo ""
echo "⚠️  NEXT STEPS (DO NOT SKIP):"
echo "1. Revoke ALL API keys in their respective dashboards"
echo "2. Reset database password in Supabase"
echo "3. Update Vercel environment variables"
echo "4. Run git history cleanup (see SECURITY_BREACH_REMEDIATION.md)"
echo "5. Force push: git push --force origin main"
echo ""
echo "📖 See SECURITY_BREACH_REMEDIATION.md for detailed instructions"
