# ADSapp Production Deployment Checklist

**Version**: 1.0.0
**Last Updated**: October 2025
**Status**: Production Ready
**Estimated Time**: 2-4 hours

---

## How to Use This Checklist

1. **Print or open in second monitor** - Keep visible during deployment
2. **Check boxes as you complete** each step
3. **Do not skip steps** - Each is critical for successful deployment
4. **If a step fails**, stop and resolve before continuing
5. **Document issues** encountered for post-mortem
6. **Keep deployment log** with timestamps

---

## Pre-Deployment Phase (30-60 minutes)

### Step 1: Account Verification

**Deadline**: 48 hours before deployment

- [ ] **Vercel Account**
  - [ ] Account created at https://vercel.com
  - [ ] Pro or Team plan activated
  - [ ] Payment method added
  - [ ] Team members invited (if applicable)
  - [ ] GitHub repository connected

- [ ] **Supabase Account**
  - [ ] Project created at https://supabase.com
  - [ ] Pro plan activated ($25/month)
  - [ ] Database password saved securely
  - [ ] API keys documented
  - [ ] Backup schedule configured

- [ ] **Stripe Account**
  - [ ] Account created at https://stripe.com
  - [ ] Business verification completed
  - [ ] Live mode activated
  - [ ] API keys obtained (live mode)
  - [ ] Webhook endpoint configured

- [ ] **WhatsApp Business API**
  - [ ] Meta Business account created
  - [ ] Business verification completed
  - [ ] Phone number registered
  - [ ] WhatsApp Business API access granted
  - [ ] Access token obtained

- [ ] **Resend Account**
  - [ ] Account created at https://resend.com
  - [ ] Domain verified
  - [ ] DNS records configured (SPF, DKIM)
  - [ ] API key obtained
  - [ ] Test email sent successfully

- [ ] **Optional: Sentry Account**
  - [ ] Account created at https://sentry.io
  - [ ] Project created
  - [ ] DSN obtained
  - [ ] Team members invited

### Step 2: Code Preparation

**Deadline**: 24 hours before deployment

- [ ] **Code Quality**
  - [ ] `npm run type-check` - 0 errors
  - [ ] `npm run lint` - 0 errors, 0 warnings
  - [ ] `npm run test` - All tests passing
  - [ ] `npm run test:e2e` - All E2E tests passing (optional)
  - [ ] `npm run test:security` - 0 vulnerabilities
  - [ ] `npm run build` - Build successful
  - [ ] No `console.log` statements in production code
  - [ ] No hardcoded credentials in code

- [ ] **Version Control**
  - [ ] All changes committed to Git
  - [ ] Working on correct branch (e.g., `main` or `production`)
  - [ ] Branch is up to date with remote
  - [ ] Git tags created for release (e.g., `v1.0.0`)
  - [ ] Release notes documented

- [ ] **Environment Files**
  - [ ] `.env.example` updated with all variables
  - [ ] `.env.local` contains valid development values
  - [ ] `.env.production` prepared (NOT committed)
  - [ ] `.gitignore` includes all environment files
  - [ ] Verified no secrets in Git history

### Step 3: Environment Variables Preparation

**Deadline**: 12 hours before deployment

- [ ] **Application Variables**
  - [ ] `NEXT_PUBLIC_APP_URL` - Production URL
  - [ ] `NEXT_PUBLIC_APP_NAME` - "ADSapp"
  - [ ] `NEXT_PUBLIC_APP_VERSION` - Current version
  - [ ] `NEXT_PUBLIC_APP_DOMAIN` - Your domain
  - [ ] `NODE_ENV` - "production"

- [ ] **Supabase Variables**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` - Project URL
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key
  - [ ] `SUPABASE_JWT_SECRET` - JWT secret
  - [ ] All keys are from production project

- [ ] **Stripe Variables**
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Live publishable key
  - [ ] `STRIPE_SECRET_KEY` - Live secret key
  - [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
  - [ ] `STRIPE_STARTER_PRICE_ID` - Starter plan price ID
  - [ ] `STRIPE_PROFESSIONAL_PRICE_ID` - Professional plan price ID
  - [ ] `STRIPE_ENTERPRISE_PRICE_ID` - Enterprise plan price ID
  - [ ] All IDs are from live mode

- [ ] **WhatsApp Variables**
  - [ ] `WHATSAPP_ACCESS_TOKEN` - Permanent access token
  - [ ] `WHATSAPP_PHONE_NUMBER_ID` - Phone number ID
  - [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID` - Business account ID
  - [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Secure random token
  - [ ] Token has no expiry or > 180 days

- [ ] **Email Variables**
  - [ ] `RESEND_API_KEY` - Production API key
  - [ ] `RESEND_FROM_EMAIL` - Verified sender email
  - [ ] Email domain DNS verified

- [ ] **Security Variables**
  - [ ] `JWT_SECRET` - 256-bit random secret
  - [ ] Generated using: `openssl rand -hex 32`

- [ ] **Optional: Monitoring Variables**
  - [ ] `SENTRY_DSN` - Server-side DSN
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` - Client-side DSN
  - [ ] `SENTRY_ORG` - Organization slug
  - [ ] `SENTRY_PROJECT` - Project name
  - [ ] `SENTRY_AUTH_TOKEN` - Auth token
  - [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics

### Step 4: Database Backup

**Deadline**: 6 hours before deployment

- [ ] **Backup Creation**
  - [ ] Supabase Dashboard → Database → Backups
  - [ ] Manual backup created
  - [ ] Backup downloaded to local machine
  - [ ] Backup stored in secure location
  - [ ] Backup tested (restore to test database)
  - [ ] Backup size verified (> 0 bytes)
  - [ ] Backup timestamp documented

- [ ] **Backup Information**
  ```
  Backup Date: ____________________
  Backup Time: ____________________
  Backup Size: ____________________
  Backup Location: ____________________
  Verified By: ____________________
  ```

### Step 5: Migration Files Verification

**Deadline**: 6 hours before deployment

- [ ] **Migration Count**
  - [ ] Total migrations: 39 files
  - [ ] Verified with: `ls supabase/migrations/*.sql | wc -l`
  - [ ] All migrations numbered correctly
  - [ ] No duplicate migration numbers

- [ ] **Migration Content**
  - [ ] Each migration file has valid SQL syntax
  - [ ] No hardcoded values in migrations
  - [ ] All `CREATE TABLE` statements include `IF NOT EXISTS`
  - [ ] All `DROP TABLE` statements include `IF EXISTS`
  - [ ] RLS policies defined for all tables

- [ ] **Migration Order**
  - [ ] Migrations listed in correct execution order
  - [ ] Dependencies verified (foreign keys)
  - [ ] No circular dependencies

### Step 6: Team Notification

**Deadline**: 4 hours before deployment

- [ ] **Team Communication**
  - [ ] Deployment scheduled and announced
  - [ ] Deployment window communicated
  - [ ] Expected downtime (if any) communicated
  - [ ] Rollback plan shared with team
  - [ ] Emergency contacts list distributed

- [ ] **Roles Assigned**
  - [ ] Deployment lead: ********\_\_\_\_********
  - [ ] Database admin: ********\_\_\_\_********
  - [ ] DevOps engineer: ********\_\_\_\_********
  - [ ] QA tester: ********\_\_\_\_********
  - [ ] Customer support lead: ********\_\_\_\_********

- [ ] **Communication Channels**
  - [ ] Slack/Teams channel for deployment updates
  - [ ] Status page updated (if applicable)
  - [ ] Email notification to stakeholders
  - [ ] Customer notification drafted (if needed)

---

## Deployment Phase (60-90 minutes)

### Step 7: Vercel Project Setup

**Estimated Time**: 15 minutes

- [ ] **Project Import**
  - [ ] Logged into Vercel Dashboard
  - [ ] "Add New Project" clicked
  - [ ] GitHub repository selected
  - [ ] Repository imported successfully

- [ ] **Framework Configuration**
  - [ ] Framework preset: Next.js
  - [ ] Root directory: `./`
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `.next`
  - [ ] Install command: `npm ci --legacy-peer-deps`
  - [ ] Development command: `npm run dev`

- [ ] **Project Settings**
  - [ ] Node.js version: 20.x
  - [ ] Project name: `adsapp`
  - [ ] Project slug verified
  - [ ] Team selected (if applicable)

### Step 8: Environment Variables Configuration

**Estimated Time**: 20 minutes

- [ ] **Variable Entry Method**
  - [ ] Navigate to Settings → Environment Variables
  - [ ] Choose entry method: Manual or Bulk Import
  - [ ] Prepare variables in secure document

- [ ] **Add All Required Variables**
  - [ ] Application variables (5 variables)
  - [ ] Supabase variables (4 variables)
  - [ ] Stripe variables (6 variables)
  - [ ] WhatsApp variables (4 variables)
  - [ ] Email variables (2 variables)
  - [ ] Security variables (1 variable)
  - [ ] Optional monitoring variables (if applicable)

- [ ] **Verify Variable Scope**
  - [ ] Production scope selected for all secrets
  - [ ] Preview scope selected for public variables
  - [ ] Development scope configured (if needed)

- [ ] **Double-Check Critical Variables**
  - [ ] No test/sandbox keys in production
  - [ ] All keys match production services
  - [ ] No typos in variable names
  - [ ] No trailing spaces in values
  - [ ] No exposed secrets in logs

### Step 9: Domain Configuration

**Estimated Time**: 10 minutes (+ DNS propagation time)

- [ ] **Add Domain**
  - [ ] Navigate to Settings → Domains
  - [ ] Domain added: `app.yourdomain.com`
  - [ ] Domain ownership verified

- [ ] **DNS Configuration**
  - [ ] DNS provider accessed
  - [ ] CNAME record added:
    ```
    Type: CNAME
    Name: app
    Value: cname.vercel-dns.com
    TTL: 3600
    ```
  - [ ] DNS changes saved

- [ ] **DNS Verification**
  - [ ] Wait for DNS propagation (5-60 minutes)
  - [ ] Verify with: `dig app.yourdomain.com`
  - [ ] Vercel shows "Valid Configuration"
  - [ ] SSL certificate provisioned automatically

### Step 10: Database Migration

**Estimated Time**: 30 minutes

- [ ] **Pre-Migration Checks**
  - [ ] Database backup completed (from Step 4)
  - [ ] Supabase project is production instance
  - [ ] No active users in database (if applicable)
  - [ ] Migration files prepared locally

- [ ] **Migration Method Selection**
  - [ ] Method chosen: Dashboard / CLI / psql
  - [ ] Migration tool verified working
  - [ ] Connection to database tested

- [ ] **Apply Migrations - Method 1: Supabase Dashboard**
  - [ ] Navigate to SQL Editor
  - [ ] Create new query
  - [ ] Copy/paste `001_initial_schema.sql`
  - [ ] Execute migration
  - [ ] Verify success (no errors)
  - [ ] Repeat for all 39 migrations
  - [ ] Document completion time

- [ ] **OR Apply Migrations - Method 2: Supabase CLI**
  - [ ] `supabase login` executed
  - [ ] Project linked: `supabase link --project-ref xxxxx`
  - [ ] `supabase db push` executed
  - [ ] All migrations applied successfully
  - [ ] Output log saved

- [ ] **OR Apply Migrations - Method 3: Direct psql**
  - [ ] Connected to database
  - [ ] Each migration executed in order
  - [ ] No errors in output
  - [ ] Transaction committed

- [ ] **Post-Migration Verification**
  - [ ] Table count verified: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`
  - [ ] Expected: 50+ tables
  - [ ] Critical tables verified:
    ```sql
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN (
      'profiles', 'organizations', 'contacts',
      'conversations', 'messages', 'message_templates'
    );
    ```
  - [ ] RLS enabled on all tables:
    ```sql
    SELECT COUNT(*) FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false;
    ```
  - [ ] Expected: 0 rows
  - [ ] Functions created: `SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';`
  - [ ] Indexes created: `SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';`

### Step 11: Initial Deployment

**Estimated Time**: 5-10 minutes

- [ ] **Deployment Trigger**
  - [ ] Method: Automatic (git push) or Manual (Vercel CLI)
  - [ ] If automatic: Changes pushed to main branch
  - [ ] If manual: `vercel --prod` executed

- [ ] **Monitor Deployment**
  - [ ] Vercel Dashboard → Deployments
  - [ ] Deployment status: Building
  - [ ] No build errors
  - [ ] Build logs reviewed
  - [ ] Build time documented: ****\_\_****

- [ ] **Deployment Completion**
  - [ ] Status changed to: Ready
  - [ ] Deployment URL displayed
  - [ ] Production URL active
  - [ ] Deployment time documented: ****\_\_****

- [ ] **Deployment Information**
  ```
  Deployment ID: ____________________
  Deployment URL: ____________________
  Build Time: ____________________
  Deployment Time: ____________________
  Deployed By: ____________________
  ```

---

## Post-Deployment Verification Phase (30-60 minutes)

### Step 12: Health Check Verification

**Estimated Time**: 5 minutes

- [ ] **Overall Health**
  - [ ] Navigate to: `https://app.yourdomain.com/api/health`
  - [ ] Response status: 200 OK
  - [ ] `status` field: "healthy"
  - [ ] Response time < 1000ms

- [ ] **Service Health**
  - [ ] Supabase status: "up"
  - [ ] Stripe status: "up"
  - [ ] WhatsApp status: "up"
  - [ ] All response times < 2000ms

- [ ] **System Health**
  - [ ] Memory usage < 80%
  - [ ] Node.js version correct
  - [ ] Environment: "production"
  - [ ] Version matches expected

- [ ] **Health Check Log**
  ```bash
  curl https://app.yourdomain.com/api/health | jq
  ```
  ```
  Status: ____________________
  Response Time: ____________________
  All Services Up: ____________________
  Verified By: ____________________
  Timestamp: ____________________
  ```

### Step 13: SSL Certificate Verification

**Estimated Time**: 2 minutes

- [ ] **Certificate Check**
  - [ ] HTTPS loads without warnings
  - [ ] Certificate issued by Let's Encrypt
  - [ ] Certificate valid (green padlock in browser)
  - [ ] Certificate expiry > 60 days
  - [ ] Certificate covers domain correctly

- [ ] **Security Headers**
  - [ ] `Strict-Transport-Security` present
  - [ ] `X-Content-Type-Options` present
  - [ ] `X-Frame-Options` present
  - [ ] Content Security Policy configured

- [ ] **SSL Verification Command**
  ```bash
  echo | openssl s_client -servername app.yourdomain.com \
    -connect app.yourdomain.com:443 2>/dev/null | \
    openssl x509 -noout -dates
  ```
  ```
  Valid From: ____________________
  Valid Until: ____________________
  Days Remaining: ____________________
  ```

### Step 14: Authentication Flow Testing

**Estimated Time**: 10 minutes

- [ ] **Sign Up Flow**
  - [ ] Navigate to `/auth/signup`
  - [ ] Form renders correctly
  - [ ] Enter test email: `test-deploy@yourdomain.com`
  - [ ] Enter secure password
  - [ ] Submit form
  - [ ] No errors displayed
  - [ ] Verification email received
  - [ ] Email received within 5 minutes
  - [ ] Verification link works
  - [ ] Redirects to dashboard

- [ ] **Sign In Flow**
  - [ ] Navigate to `/auth/signin`
  - [ ] Enter test credentials
  - [ ] Submit form
  - [ ] No errors displayed
  - [ ] Redirects to dashboard
  - [ ] Session persists on refresh
  - [ ] User data loads correctly

- [ ] **Password Reset Flow**
  - [ ] Navigate to `/auth/forgot-password`
  - [ ] Enter test email
  - [ ] Reset email received
  - [ ] Reset link works
  - [ ] Password changed successfully
  - [ ] Can sign in with new password

- [ ] **Authentication Test Results**
  ```
  Sign Up Working: Yes / No
  Sign In Working: Yes / No
  Password Reset Working: Yes / No
  Session Persistence: Yes / No
  Issues Found: ____________________
  ```

### Step 15: Database Connectivity Testing

**Estimated Time**: 5 minutes

- [ ] **Connection Test**
  - [ ] Application connects to database
  - [ ] No connection errors in logs
  - [ ] Health endpoint shows database "up"

- [ ] **RLS Policy Test**
  - [ ] Sign in as test user
  - [ ] Access dashboard
  - [ ] Data loads for user's organization only
  - [ ] Cannot access other organization's data
  - [ ] All API calls respect RLS

- [ ] **Multi-Tenant Isolation Test**
  - [ ] Create second test user in different org
  - [ ] Verify data isolation
  - [ ] Test user 1 cannot see user 2's data
  - [ ] Test user 2 cannot see user 1's data

- [ ] **Database Query Test**

  ```sql
  -- Run as authenticated user
  SELECT COUNT(*) FROM organizations;
  -- Should return: 1 (user's org only)

  SELECT COUNT(*) FROM profiles;
  -- Should return: >= 1 (user's profile)
  ```

  ```
  Query Results Valid: Yes / No
  RLS Working Correctly: Yes / No
  Isolation Verified: Yes / No
  ```

### Step 16: Payment Integration Testing

**Estimated Time**: 10 minutes

- [ ] **Stripe Webhook Verification**
  - [ ] Stripe Dashboard → Developers → Webhooks
  - [ ] Webhook endpoint: `https://app.yourdomain.com/api/webhooks/stripe`
  - [ ] Webhook status: Active
  - [ ] Test webhook sent
  - [ ] Webhook received successfully (check logs)

- [ ] **Test Payment Flow**
  - [ ] Sign in to application
  - [ ] Navigate to `/dashboard/billing`
  - [ ] Click "Upgrade to Pro"
  - [ ] Enter test card: `4242 4242 4242 4242`
  - [ ] Expiry: `12/34`, CVC: `123`
  - [ ] Submit payment
  - [ ] Payment succeeds
  - [ ] Subscription created in Stripe Dashboard
  - [ ] Subscription saved in database
  - [ ] User account upgraded

- [ ] **Payment Test Results**
  ```
  Webhook Endpoint Active: Yes / No
  Test Payment Successful: Yes / No
  Subscription Created: Yes / No
  Database Updated: Yes / No
  Issues Found: ____________________
  ```

### Step 17: WhatsApp Integration Testing

**Estimated Time**: 10 minutes

- [ ] **Webhook Verification**
  - [ ] Meta Business → WhatsApp → Configuration
  - [ ] Webhook URL: `https://app.yourdomain.com/api/webhooks/whatsapp`
  - [ ] Verify token configured
  - [ ] Webhook verified by Meta
  - [ ] Webhook status: Connected

- [ ] **Manual Webhook Test**

  ```bash
  curl -X GET "https://app.yourdomain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=YOUR_TOKEN"
  ```

  - [ ] Returns: `test123`
  - [ ] Status code: 200

- [ ] **Message Sending Test**
  - [ ] Sign in to application
  - [ ] Navigate to `/dashboard/inbox`
  - [ ] Select test contact (or create one)
  - [ ] Send test message: "Production test message"
  - [ ] Message appears in conversation
  - [ ] Message received on WhatsApp
  - [ ] Message saved in database
  - [ ] Message status updates correctly

- [ ] **Message Receiving Test**
  - [ ] Send message to WhatsApp Business number
  - [ ] Message appears in ADSapp inbox
  - [ ] Message saved in database
  - [ ] Notification received (if configured)
  - [ ] Message marked as unread

- [ ] **WhatsApp Test Results**
  ```
  Webhook Connected: Yes / No
  Message Sending Works: Yes / No
  Message Receiving Works: Yes / No
  Database Sync Working: Yes / No
  Issues Found: ____________________
  ```

### Step 18: Email Delivery Testing

**Estimated Time**: 5 minutes

- [ ] **Domain Verification**
  - [ ] Resend Dashboard → Domains
  - [ ] Domain status: Verified
  - [ ] SPF record: Valid
  - [ ] DKIM record: Valid

- [ ] **Test Email Sending**
  - [ ] Trigger welcome email (create new account)
  - [ ] Email sent within 30 seconds
  - [ ] Email received in inbox (not spam)
  - [ ] Email formatting correct
  - [ ] Links in email work
  - [ ] Unsubscribe link works (if applicable)

- [ ] **Resend Dashboard Check**
  - [ ] Navigate to Resend Dashboard → Emails
  - [ ] Test email shown in list
  - [ ] Status: Delivered
  - [ ] No bounces or complaints
  - [ ] Delivery time < 5 seconds

- [ ] **Email Test Results**
  ```
  Domain Verified: Yes / No
  Email Delivered: Yes / No
  Delivery Time: ____________________
  Spam Score: Pass / Fail
  Issues Found: ____________________
  ```

### Step 19: Performance Verification

**Estimated Time**: 10 minutes

- [ ] **Page Load Testing**
  - [ ] Homepage loads < 3 seconds
  - [ ] Dashboard loads < 2 seconds
  - [ ] Inbox loads < 2 seconds
  - [ ] No console errors
  - [ ] Images load correctly

- [ ] **API Response Testing**

  ```bash
  # Test critical endpoints
  time curl https://app.yourdomain.com/api/health
  time curl -H "Authorization: Bearer TOKEN" https://app.yourdomain.com/api/conversations
  time curl -H "Authorization: Bearer TOKEN" https://app.yourdomain.com/api/contacts
  ```

  - [ ] `/api/health` < 500ms
  - [ ] `/api/conversations` < 1000ms
  - [ ] `/api/contacts` < 1000ms

- [ ] **Google PageSpeed Insights**
  - [ ] Test URL: `https://pagespeed.web.dev/`
  - [ ] Performance score: **\_\_** (target: > 90)
  - [ ] Accessibility score: **\_\_** (target: > 95)
  - [ ] Best Practices score: **\_\_** (target: > 95)
  - [ ] SEO score: **\_\_** (target: > 90)

- [ ] **Core Web Vitals**
  - [ ] First Contentful Paint (FCP): **\_\_** (target: < 1.8s)
  - [ ] Largest Contentful Paint (LCP): **\_\_** (target: < 2.5s)
  - [ ] Total Blocking Time (TBT): **\_\_** (target: < 300ms)
  - [ ] Cumulative Layout Shift (CLS): **\_\_** (target: < 0.1)

- [ ] **Performance Test Results**
  ```
  All Pages Load Fast: Yes / No
  API Response Times Acceptable: Yes / No
  PageSpeed Score: ____________________
  Core Web Vitals: Pass / Fail
  Issues Found: ____________________
  ```

### Step 20: Security Verification

**Estimated Time**: 5 minutes

- [ ] **Security Headers Check**

  ```bash
  curl -I https://app.yourdomain.com
  ```

  - [ ] `Strict-Transport-Security` present
  - [ ] `X-Content-Type-Options: nosniff` present
  - [ ] `X-Frame-Options: DENY` present
  - [ ] `X-XSS-Protection` present

- [ ] **HTTPS Enforcement**
  - [ ] HTTP redirects to HTTPS
  - [ ] All resources loaded via HTTPS
  - [ ] No mixed content warnings
  - [ ] Certificate valid and trusted

- [ ] **Security Audit**

  ```bash
  npm audit --production
  ```

  - [ ] 0 critical vulnerabilities
  - [ ] 0 high vulnerabilities
  - [ ] < 5 moderate vulnerabilities

- [ ] **Authentication Security**
  - [ ] Sessions expire correctly
  - [ ] Password requirements enforced
  - [ ] Rate limiting active
  - [ ] CSRF protection enabled

- [ ] **Security Test Results**
  ```
  All Headers Present: Yes / No
  HTTPS Enforced: Yes / No
  No Vulnerabilities: Yes / No
  Authentication Secure: Yes / No
  Security Score: 99/100 ✓
  Issues Found: ____________________
  ```

---

## Post-Deployment Configuration (30 minutes)

### Step 21: Monitoring Setup

**Estimated Time**: 15 minutes

- [ ] **Vercel Analytics**
  - [ ] Navigate to Vercel Dashboard → Analytics
  - [ ] Web Analytics enabled
  - [ ] Speed Insights enabled
  - [ ] Data retention configured
  - [ ] Performance budgets set

- [ ] **Sentry Configuration** (if applicable)
  - [ ] Sentry project created
  - [ ] DSN configured in environment
  - [ ] Source maps uploaded
  - [ ] Test error triggered
  - [ ] Error appears in Sentry
  - [ ] Alerts configured

- [ ] **Database Monitoring**
  - [ ] Supabase Dashboard → Database → Query Performance
  - [ ] Slow query alerts configured
  - [ ] Connection pool monitoring enabled
  - [ ] Backup schedule verified

### Step 22: Team Access Configuration

**Estimated Time**: 10 minutes

- [ ] **Vercel Team Access**
  - [ ] Team members invited
  - [ ] Roles assigned correctly
  - [ ] Deployment permissions configured
  - [ ] Environment variable access restricted

- [ ] **Supabase Team Access**
  - [ ] Team members invited
  - [ ] Database access granted appropriately
  - [ ] Read-only access for non-admins

- [ ] **Production Access Documentation**
  - [ ] Access procedures documented
  - [ ] Emergency contacts list created
  - [ ] Escalation path defined

### Step 23: Documentation Update

**Estimated Time**: 5 minutes

- [ ] **Deployment Documentation**
  - [ ] Deployment date recorded
  - [ ] Deployment by recorded
  - [ ] Issues encountered documented
  - [ ] Resolution steps documented

- [ ] **Team Documentation**
  - [ ] Production URLs shared with team
  - [ ] Admin credentials shared securely
  - [ ] Monitoring dashboard links shared
  - [ ] Support procedures updated

---

## Final Verification (15 minutes)

### Step 24: End-to-End User Journey Test

**Estimated Time**: 10 minutes

- [ ] **Complete User Flow**
  - [ ] Sign up for new account
  - [ ] Verify email
  - [ ] Complete onboarding
  - [ ] Connect WhatsApp number
  - [ ] Send first message
  - [ ] Receive reply
  - [ ] Create contact
  - [ ] Create message template
  - [ ] Set up automation rule
  - [ ] View analytics dashboard
  - [ ] Upgrade subscription
  - [ ] Verify billing
  - [ ] Update profile
  - [ ] Sign out
  - [ ] Sign back in

- [ ] **User Journey Success**
  - [ ] All steps completed without errors
  - [ ] UI responsive and fast
  - [ ] No broken links or images
  - [ ] All features working

### Step 25: Stakeholder Sign-Off

**Estimated Time**: 5 minutes

- [ ] **Deployment Review**
  - [ ] All checklist items completed
  - [ ] No critical issues found
  - [ ] Performance acceptable
  - [ ] Security verified
  - [ ] Team notified

- [ ] **Sign-Off**

  ```
  Deployment Completed By: ____________________
  Date: ____________________
  Time: ____________________

  Verified By: ____________________
  Date: ____________________

  Approved For Production By: ____________________
  Date: ____________________

  Total Deployment Time: ____________________
  Issues Encountered: ____________________
  ```

---

## Post-Deployment Monitoring (First 24 Hours)

### Immediate Monitoring (First Hour)

- [ ] **Error Rate Monitoring**
  - [ ] Check Vercel Analytics every 15 minutes
  - [ ] Error rate < 1%
  - [ ] No 500 errors
  - [ ] No database connection errors

- [ ] **Performance Monitoring**
  - [ ] Response times stable
  - [ ] No performance degradation
  - [ ] Database query times normal
  - [ ] CDN cache hit rate > 80%

- [ ] **User Activity Monitoring**
  - [ ] New sign-ups successful
  - [ ] Existing users can sign in
  - [ ] No unusual error patterns
  - [ ] Support tickets minimal

### First 6 Hours

- [ ] **System Health**
  - [ ] Health endpoint checked hourly
  - [ ] All services remain "up"
  - [ ] No service degradation
  - [ ] Memory usage stable

- [ ] **Business Metrics**
  - [ ] New user registrations tracking
  - [ ] Message sending/receiving working
  - [ ] Payment processing functional
  - [ ] No customer complaints

### First 24 Hours

- [ ] **Comprehensive Review**
  - [ ] Error logs reviewed
  - [ ] Performance metrics analyzed
  - [ ] User feedback collected
  - [ ] No critical issues identified

- [ ] **Team Debrief**
  - [ ] Deployment retrospective scheduled
  - [ ] Lessons learned documented
  - [ ] Process improvements identified
  - [ ] Documentation updated

---

## Rollback Procedures (If Needed)

### Rollback Criteria

Initiate rollback if:

- [ ] Critical functionality broken
- [ ] Error rate > 5%
- [ ] Database corruption detected
- [ ] Security vulnerability discovered
- [ ] Payment processing failing
- [ ] Multiple customer complaints

### Rollback Steps

- [ ] **Immediate Actions**
  - [ ] Stop new deployments
  - [ ] Notify team immediately
  - [ ] Document issue thoroughly

- [ ] **Vercel Rollback**
  - [ ] Vercel Dashboard → Deployments
  - [ ] Find last stable deployment
  - [ ] Click "Promote to Production"
  - [ ] Verify rollback successful

- [ ] **Database Rollback** (if needed)
  - [ ] Stop application writes
  - [ ] Restore from backup
  - [ ] Verify data integrity
  - [ ] Re-enable application

- [ ] **Post-Rollback**
  - [ ] Verify application working
  - [ ] Notify team and stakeholders
  - [ ] Create incident report
  - [ ] Schedule root cause analysis

---

## Sign-Off

**Deployment Status**: ☐ Successful ☐ Completed with Issues ☐ Rolled Back

**Deployment Completed By**: ********\_\_\_\_********

**Date**: ********\_\_\_\_********

**Time**: ********\_\_\_\_********

**Total Duration**: ********\_\_\_\_********

**Critical Issues Found**: ********\_\_\_\_********

**Resolution Status**: ********\_\_\_\_********

**Next Steps**:

1. ***
2. ***
3. ***

**Approved for Production**: ☐ Yes ☐ No

**Approver Name**: ********\_\_\_\_********

**Approver Signature**: ********\_\_\_\_********

**Date**: ********\_\_\_\_********

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Next Review Date**: ********\_\_\_\_********
