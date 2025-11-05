# Administrator Manual Update

**Last Updated:** October 20, 2025
**Version:** 1.2.0
**Audience:** Organization Owners and Administrators

---

## What's New in This Update

This update introduces three powerful new features to help you manage your organization more effectively:

1. **Business Hours Management** - Control when your team is available to respond to messages
2. **Logo Upload** - Customize your organization's branding
3. **Integration Status Monitoring** - Monitor the health of your connected services

---

## Table of Contents

- [Business Hours Management](#business-hours-management)
  - [Overview](#business-hours-overview)
  - [How to Configure Business Hours](#how-to-configure-business-hours)
  - [Business Hours Best Practices](#business-hours-best-practices)
  - [Troubleshooting Business Hours](#troubleshooting-business-hours)
- [Logo Upload](#logo-upload)
  - [Overview](#logo-upload-overview)
  - [How to Upload Your Logo](#how-to-upload-your-logo)
  - [Logo Requirements](#logo-requirements)
  - [Troubleshooting Logo Upload](#troubleshooting-logo-upload)
- [Integration Status Monitoring](#integration-status-monitoring)
  - [Overview](#integration-status-overview)
  - [How to Check Integration Status](#how-to-check-integration-status)
  - [Understanding Status Indicators](#understanding-status-indicators)
  - [Troubleshooting Integration Issues](#troubleshooting-integration-issues)

---

## Business Hours Management

### Business Hours Overview

Business Hours allow you to define when your organization is available to respond to customer messages. This feature helps you:

- **Set Customer Expectations**: Let customers know when they can expect a response
- **Manage Team Workload**: Ensure your team isn't overwhelmed outside working hours
- **Automate Responses**: Send automatic messages when customers contact you outside business hours
- **Improve Customer Service**: Clear communication about availability builds trust

**Example Use Cases:**

- **Retail Store**: Monday-Saturday 9:00 AM - 6:00 PM, Closed Sundays
- **Professional Services**: Monday-Friday 8:30 AM - 5:30 PM, Closed Weekends
- **24/7 Support Center**: Open all days, all hours
- **Restaurant**: Monday-Sunday 11:00 AM - 10:00 PM

---

### How to Configure Business Hours

#### Step 1: Access Organization Settings

1. Log in to your ADSapp dashboard
2. Click on **"Settings"** in the left sidebar navigation
3. Select the **"Organization"** tab at the top of the settings page

**Visual Guide:**
```
Dashboard → Left Sidebar → Settings → Organization Tab
```

#### Step 2: Locate Business Hours Section

Scroll down the Organization Settings page until you see the **"Business Hours"** section. This section displays a weekly schedule with toggle switches for each day.

#### Step 3: Enable or Disable Days

For each day of the week, you can control whether your organization is available:

1. **To Open on a Day**: Toggle the switch to the **ON** position (usually shown in blue or green)
2. **To Close on a Day**: Toggle the switch to the **OFF** position (usually shown in gray)

**Example:**
- Monday: **ON** → Your organization is open on Mondays
- Sunday: **OFF** → Your organization is closed on Sundays

#### Step 4: Set Operating Hours

For each day that is enabled (toggled ON):

1. **Start Time**: Click the first time picker and select when your business opens
   - Example: 9:00 AM
   - Use the dropdown or type the time directly

2. **End Time**: Click the second time picker and select when your business closes
   - Example: 5:00 PM
   - Ensure the end time is later than the start time

**Time Format:**
- Times are displayed in 12-hour format (AM/PM)
- You can select times in 15-minute intervals (9:00 AM, 9:15 AM, 9:30 AM, etc.)

#### Step 5: Review Your Schedule

Before saving, review your complete weekly schedule:

| Day | Status | Hours |
|-----|--------|-------|
| Monday | Open | 9:00 AM - 5:00 PM |
| Tuesday | Open | 9:00 AM - 5:00 PM |
| Wednesday | Open | 9:00 AM - 5:00 PM |
| Thursday | Open | 9:00 AM - 5:00 PM |
| Friday | Open | 9:00 AM - 5:00 PM |
| Saturday | Closed | - |
| Sunday | Closed | - |

#### Step 6: Save Your Changes

1. Click the **"Save Changes"** button at the bottom of the Organization Settings page
2. Wait for the confirmation message: **"Organization settings updated successfully"**
3. Your business hours are now active

**Important:** Changes take effect immediately after saving. Any automation rules using business hours will start following the new schedule right away.

---

### Business Hours Best Practices

#### 1. Set Realistic Hours

Choose hours that accurately reflect when your team can respond to messages:

✅ **Good Practice:**
- Set hours: 9:00 AM - 5:00 PM
- Team actually available: 9:00 AM - 5:00 PM
- Result: Customers get timely responses, expectations are met

❌ **Avoid:**
- Set hours: 8:00 AM - 8:00 PM
- Team actually available: 9:00 AM - 5:00 PM
- Result: Customers expect responses but don't receive them, leading to frustration

#### 2. Account for Lunch Breaks

If your team takes a lunch break and cannot respond during that time, consider:

**Option A: Split Hours**
- Morning: 9:00 AM - 12:00 PM
- Afternoon: 1:00 PM - 5:00 PM
- (Future feature: Multiple time slots per day)

**Option B: Continuous Hours with Note**
- Hours: 9:00 AM - 5:00 PM
- Add automation: "Reduced availability 12:00 PM - 1:00 PM"

#### 3. Communicate Holidays

Business Hours define regular weekly schedules. For holidays and special closures:

1. Temporarily disable all days in Business Hours settings
2. Update your automation rules to send holiday messages
3. Restore normal hours after the holiday

**Example Holiday Message:**
"Thank you for contacting us! Our office is closed December 25-26 for the holidays. We'll respond to your message when we return on December 27."

#### 4. Time Zone Considerations

Business hours are set according to your local time zone. Make sure customers understand your time zone:

- Add time zone to your profile: "Available Mon-Fri 9 AM - 5 PM EST"
- Use automation messages: "We're currently outside business hours (9 AM - 5 PM PST)"

#### 5. Align with Automation Rules

If you use automation rules that reference business hours:

1. **Auto-Reply During Off Hours**: "Thanks for your message! We're currently closed but will respond during business hours (Mon-Fri 9 AM - 5 PM)."
2. **Assignment Rules**: Only assign conversations to agents during business hours
3. **SLA Tracking**: Calculate response time SLAs based on business hours only

---

### Troubleshooting Business Hours

#### Problem: Changes Not Saving

**Symptoms:**
- Clicking "Save Changes" doesn't update the schedule
- Page refreshes but old settings remain
- Error message appears

**Solutions:**

1. **Check Required Fields**:
   - If a day is enabled (toggled ON), both start and end times must be set
   - Solution: Either set both times or toggle the day OFF

2. **Verify Time Logic**:
   - End time must be later than start time
   - Example: Start 9:00 AM, End 5:00 PM ✅
   - Example: Start 5:00 PM, End 9:00 AM ❌
   - Solution: Correct the time order

3. **Check Network Connection**:
   - Ensure you have a stable internet connection
   - Solution: Refresh the page and try again

4. **Browser Issues**:
   - Clear your browser cache
   - Try a different browser
   - Disable browser extensions temporarily

#### Problem: Automation Not Respecting Business Hours

**Symptoms:**
- Auto-replies sent during business hours
- Messages not being routed correctly

**Solutions:**

1. **Verify Save Completed**:
   - Look for "Settings updated successfully" confirmation
   - Refresh the page to confirm changes are visible

2. **Check Automation Rule Settings**:
   - Navigate to Dashboard → Automation
   - Review rules that reference business hours
   - Ensure the rule is active (toggle ON)

3. **Time Zone Mismatch**:
   - Verify your organization's time zone setting
   - Check if the server time matches your expectations

#### Problem: Cannot Access Business Hours Settings

**Symptoms:**
- Business Hours section not visible
- Settings page shows limited options

**Solutions:**

1. **Check User Permissions**:
   - Only Organization Owners and Administrators can modify business hours
   - Contact your organization owner if you need access

2. **Feature Availability**:
   - Ensure your subscription plan includes business hours management
   - Contact support if the feature should be available

---

## Logo Upload

### Logo Upload Overview

The Logo Upload feature allows you to add your company logo to your ADSapp organization profile. Your logo will:

- **Appear in Your Dashboard**: Personalize your workspace with your brand
- **Display to Team Members**: Reinforce brand identity across your organization
- **Show in Customer-Facing Elements**: Build brand recognition in automated messages (future feature)
- **Enhance Professionalism**: Present a polished, branded experience

**Who Can Upload Logos:**
- Organization Owners
- Organization Administrators

---

### How to Upload Your Logo

#### Step 1: Prepare Your Logo File

Before uploading, ensure your logo meets these requirements:

**Supported Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png) - recommended for logos with transparency
- WebP (.webp) - modern format with excellent compression
- SVG (.svg) - vector format, scalable without quality loss

**File Size Limit:**
- Maximum: 5 MB (5,120 KB)
- Recommended: Under 500 KB for optimal performance

**Recommended Dimensions:**
- Minimum: 200 × 200 pixels
- Recommended: 512 × 512 pixels or 1000 × 1000 pixels
- Aspect Ratio: Square (1:1) or horizontal rectangle (2:1, 3:1)

**Image Quality:**
- Use high-resolution images
- Ensure good contrast against light and dark backgrounds
- Test visibility at small sizes

#### Step 2: Access Organization Settings

1. Log in to your ADSapp dashboard
2. Click **"Settings"** in the left sidebar
3. Select the **"Organization"** tab

**Navigation Path:**
```
Dashboard → Settings → Organization
```

#### Step 3: Locate Logo Upload Section

Scroll to the **"Organization Logo"** section near the top of the Organization Settings page. You will see:

- A placeholder image or your current logo (if one is already uploaded)
- An **"Upload Logo"** button
- File format and size requirements text

#### Step 4: Upload Your Logo

1. Click the **"Upload Logo"** button
2. Your computer's file browser will open
3. Navigate to the location of your logo file
4. Select the logo file
5. Click **"Open"** or **"Choose"**

**What Happens Next:**

- The system uploads your file to secure cloud storage
- A progress indicator may briefly appear
- Your logo preview updates automatically
- The logo is automatically optimized for web display

#### Step 5: Verify Upload Success

After upload:

1. **Check the Preview**: Your logo should appear in the preview area
2. **Verify Quality**: Ensure the logo looks clear and professional
3. **Test Scaling**: The logo should look good at different sizes

**Success Indicator:**
- Your logo appears in the preview box
- No error messages are displayed

#### Step 6: Save Your Changes

1. Scroll to the bottom of the Organization Settings page
2. Click the **"Save Changes"** button
3. Wait for the confirmation: **"Organization settings updated successfully"**

**Important:** You must click "Save Changes" to finalize the logo upload. If you navigate away without saving, the logo will not be stored.

#### Step 7: Verify Logo Across Application

After saving, verify your logo appears correctly:

1. **Dashboard Header**: Check the top navigation area
2. **Settings Page**: Should display in the organization profile
3. **Refresh if Needed**: Press F5 or refresh your browser

---

### Logo Requirements

#### Supported File Formats

| Format | Extension | Best For | Transparency | Notes |
|--------|-----------|----------|--------------|-------|
| **PNG** | .png | Logos with transparency | Yes | Most versatile format |
| **JPEG** | .jpg, .jpeg | Photographs, complex images | No | Smaller file sizes |
| **WebP** | .webp | Modern web applications | Yes | Excellent compression |
| **SVG** | .svg | Vector logos, icons | Yes | Scalable, but automatic security sanitization applied |

**Recommended Format:** PNG for logos with transparent backgrounds

#### File Size Guidelines

**Maximum Allowed:** 5 MB (5,120 KB)

**Size Recommendations:**

| Image Type | Recommended Size | Reason |
|------------|------------------|--------|
| Simple Logo | 50-200 KB | Fast loading, sufficient quality |
| Detailed Logo | 200-500 KB | Good balance of quality and performance |
| Photo-based Logo | 500 KB - 1 MB | Higher detail, acceptable load time |

**Why Size Matters:**
- Smaller files load faster
- Better performance on mobile devices
- Reduced bandwidth usage
- Improved user experience

**How to Reduce File Size:**

1. **Use Online Compression Tools**:
   - TinyPNG (for PNG files): https://tinypng.com
   - Squoosh (all formats): https://squoosh.app
   - JPEG Optimizer: https://jpeg-optimizer.com

2. **Reduce Image Dimensions**:
   - Resize to 512 × 512 pixels if larger
   - Use image editing software (Photoshop, GIMP, etc.)

3. **Choose Appropriate Format**:
   - Simple logos: SVG or PNG
   - Complex logos: WebP or optimized JPEG

#### Security: Automatic SVG Sanitization

**What is SVG Sanitization?**

SVG (Scalable Vector Graphics) files can contain scripts that pose security risks. ADSapp automatically sanitizes all uploaded SVG files to prevent:

- Cross-Site Scripting (XSS) attacks
- Malicious code execution
- Security vulnerabilities

**What Gets Removed:**
- JavaScript code (`<script>` tags)
- Event handlers (`onclick`, `onload`, etc.)
- External references to potentially harmful resources
- Embedded objects and foreign elements

**What Stays:**
- Visual elements (paths, shapes, text)
- Colors and styling (fill, stroke, gradients)
- Transformations and animations (safe CSS animations)
- Metadata (title, description)

**Result:**
- Your logo displays correctly
- All security risks are eliminated
- No action required from you

**Note:** This sanitization is automatic and invisible. You'll never know it happened unless the SVG contained malicious code, in which case the upload will be rejected with an error message.

#### Image Quality Best Practices

1. **Use High-Resolution Source Files**:
   - Start with the highest quality version of your logo
   - Avoid upscaling low-resolution images
   - Vector formats (SVG) maintain quality at any size

2. **Test on Different Backgrounds**:
   - Ensure logo is visible on light backgrounds
   - Ensure logo is visible on dark backgrounds
   - Consider using PNG with transparency

3. **Avoid These Common Mistakes**:
   - ❌ Stretched or distorted logos
   - ❌ Logos with excessive white space
   - ❌ Pixelated or blurry images
   - ❌ Logos with unreadable text at small sizes

4. **Optimize for Web Display**:
   - Use RGB color mode (not CMYK)
   - Save at 72 DPI for web (not 300 DPI for print)
   - Remove unnecessary metadata to reduce file size

---

### Troubleshooting Logo Upload

#### Problem: File Upload Fails

**Symptoms:**
- Error message: "Failed to upload logo"
- Upload progress bar stalls
- File doesn't appear in preview

**Solutions:**

1. **Check File Size**:
   - Error: "File size exceeds 5MB limit"
   - Solution: Compress or resize your image (see File Size Guidelines)
   - Verify file size before upload (right-click → Properties on Windows, Get Info on Mac)

2. **Verify File Format**:
   - Error: "Unsupported file format"
   - Solution: Convert to PNG, JPEG, WebP, or SVG
   - Check file extension matches actual file type

3. **Test Internet Connection**:
   - Large files require stable connection
   - Solution: Connect to reliable Wi-Fi or retry upload

4. **Try Different Browser**:
   - Some browsers have upload limitations
   - Solution: Try Chrome, Firefox, or Edge

5. **Disable Browser Extensions**:
   - Ad blockers or security extensions may interfere
   - Solution: Temporarily disable extensions

#### Problem: Logo Appears Distorted or Stretched

**Symptoms:**
- Logo looks squished or stretched
- Aspect ratio doesn't match original
- Logo appears pixelated or blurry

**Solutions:**

1. **Use Correct Aspect Ratio**:
   - Recommended: Square (1:1) or horizontal rectangle
   - Solution: Crop logo to appropriate dimensions before upload

2. **Increase Image Resolution**:
   - Minimum: 200 × 200 pixels
   - Recommended: 512 × 512 pixels or larger
   - Solution: Re-save logo at higher resolution

3. **Use Vector Format**:
   - SVG files scale without quality loss
   - Solution: Convert logo to SVG if possible

#### Problem: Logo Not Displaying After Upload

**Symptoms:**
- Upload succeeds but logo doesn't appear
- Placeholder image still showing
- Logo visible in settings but not in dashboard

**Solutions:**

1. **Click Save Changes**:
   - Most common issue: Forgetting to save
   - Solution: Scroll down and click "Save Changes" button

2. **Refresh Browser**:
   - Browser may be showing cached version
   - Solution: Press F5 or Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

3. **Clear Browser Cache**:
   - Old cached images may persist
   - Solution: Clear browser cache and reload page

4. **Wait for Processing**:
   - Large files may take time to process
   - Solution: Wait 30-60 seconds and refresh

#### Problem: SVG Upload Rejected

**Symptoms:**
- Error: "SVG file contains unsafe content"
- Upload fails with security warning

**Solutions:**

1. **SVG Contains Scripts**:
   - Automatic sanitization detected malicious code
   - Solution: Use a vector editing tool (Inkscape, Adobe Illustrator) to remove scripts

2. **Export Clean SVG**:
   - Re-export from original design software
   - Disable "Include JavaScript" or "Include Scripts" options

3. **Use Alternative Format**:
   - Convert to high-resolution PNG instead
   - Solution: Export as PNG at 1000 × 1000 pixels

#### Problem: Logo Too Large or Too Small in Display

**Symptoms:**
- Logo appears tiny or oversized
- Logo doesn't fit properly in header

**Solutions:**

1. **Check Image Dimensions**:
   - Recommended: 512 × 512 pixels
   - Solution: Resize image to recommended dimensions

2. **Remove Excess White Space**:
   - Large transparent borders make logo appear small
   - Solution: Crop image to remove excess space

3. **Adjust Logo Design**:
   - Consider a simpler design for small displays
   - Test logo at various sizes before upload

---

## Integration Status Monitoring

### Integration Status Overview

The Integration Status Monitoring feature provides real-time visibility into the health of your connected services. This helps you:

- **Prevent Service Disruptions**: Identify integration issues before they impact customers
- **Reduce Downtime**: Quickly diagnose and resolve connectivity problems
- **Maintain Service Quality**: Ensure all systems are functioning correctly
- **Simplify Troubleshooting**: Get instant feedback on integration health

**Monitored Integrations:**

1. **WhatsApp Business API** - Customer messaging platform
2. **Stripe Payment System** - Subscription billing and payments
3. **Email Service (Resend)** - Transactional email delivery
4. **Database (Supabase)** - Data storage and real-time features

---

### How to Check Integration Status

#### Step 1: Access Integration Settings

1. Log in to your ADSapp dashboard
2. Click **"Settings"** in the left sidebar navigation
3. Click the **"Integrations"** tab at the top of the settings page

**Navigation Path:**
```
Dashboard → Settings → Integrations
```

#### Step 2: View Integration Status Dashboard

The Integrations page displays a status card for each connected service:

**Status Card Layout:**
```
┌─────────────────────────────────────────┐
│ 🟢 WhatsApp Business API                │
│                                         │
│ Status: Connected                       │
│ Last Checked: 2 minutes ago             │
│                                         │
│ Details: All systems operational        │
│                                         │
│ [Refresh Status]                        │
└─────────────────────────────────────────┘
```

**Information Displayed:**

- **Integration Name**: Service being monitored
- **Status Indicator**: Visual icon showing health (green check, red X, yellow warning)
- **Status Text**: "Connected", "Error", or "Checking..."
- **Last Checked**: Time since last status verification
- **Details**: Additional information or error messages
- **Refresh Button**: Manually trigger status check

#### Step 3: Interpret Status Indicators

Each integration shows one of three status levels:

**🟢 Connected (Green Check)**
- Service is fully operational
- Connection is active and healthy
- No action required

**🔴 Error (Red X)**
- Service is not responding or misconfigured
- Connection failed or credentials invalid
- Immediate action required

**🟡 Checking... (Yellow Warning)**
- Status check in progress
- Temporary state during verification
- Wait for check to complete

#### Step 4: Refresh Integration Status

To manually check the current status of integrations:

1. Locate the integration you want to check
2. Click the **"Refresh Status"** button on the integration card
3. The status indicator changes to "Checking..."
4. Wait 2-5 seconds for the check to complete
5. Status updates to "Connected" or "Error"

**Automatic Refresh:**
- Status is automatically checked when you visit the Integrations page
- Background checks run every 5 minutes while page is open

#### Step 5: Review All Integrations

Scan all four integration cards to ensure everything is operational:

**Healthy System Example:**
```
✅ WhatsApp Business API - Connected
✅ Stripe Payment System - Connected
✅ Email Service (Resend) - Connected
✅ Database (Supabase) - Connected
```

**Issue Detected Example:**
```
✅ WhatsApp Business API - Connected
❌ Stripe Payment System - Error: Invalid API key
✅ Email Service (Resend) - Connected
✅ Database (Supabase) - Connected
```

---

### Understanding Status Indicators

#### WhatsApp Business API Status

**What It Checks:**
- WhatsApp API endpoint connectivity
- Access token validity
- Phone number ID configuration
- Webhook configuration

**🟢 Connected Means:**
- Can send and receive WhatsApp messages
- Webhooks are receiving message notifications
- API credentials are valid

**🔴 Error Means:**
- Cannot send WhatsApp messages
- Messages from customers may not be received
- Immediate troubleshooting required

**Common Error Messages:**

| Error Message | Meaning | Action Required |
|--------------|---------|-----------------|
| "Invalid access token" | WhatsApp credentials expired | Update access token in settings |
| "Phone number not found" | Phone ID misconfigured | Verify phone number ID |
| "Connection timeout" | WhatsApp API unreachable | Check internet, try again later |
| "Rate limit exceeded" | Too many API requests | Wait 10 minutes, reduce message volume |

#### Stripe Payment System Status

**What It Checks:**
- Stripe API endpoint connectivity
- Stripe API key validity
- Webhook endpoint configuration
- Account status

**🟢 Connected Means:**
- Can process subscription payments
- Can create customer accounts
- Webhooks receiving payment notifications

**🔴 Error Means:**
- Cannot process new subscriptions
- Payment updates may not be received
- Customer billing may be affected

**Common Error Messages:**

| Error Message | Meaning | Action Required |
|--------------|---------|-----------------|
| "Invalid API key" | Stripe credentials incorrect | Update Stripe API key |
| "Account not active" | Stripe account suspended | Contact Stripe support |
| "Webhook verification failed" | Webhook secret mismatch | Update webhook secret key |
| "Test mode active" | Using test keys in production | Switch to live API keys |

#### Email Service (Resend) Status

**What It Checks:**
- Resend API endpoint connectivity
- Resend API key validity
- Domain verification status
- Email sending capability

**🟢 Connected Means:**
- Can send transactional emails
- Password reset emails will be delivered
- Notification emails functioning

**🔴 Error Means:**
- Cannot send emails to users
- Password resets won't work
- Notifications won't be delivered

**Common Error Messages:**

| Error Message | Meaning | Action Required |
|--------------|---------|-----------------|
| "Invalid API key" | Resend credentials incorrect | Update Resend API key |
| "Domain not verified" | Email domain not configured | Verify domain in Resend dashboard |
| "Rate limit exceeded" | Sending too many emails | Wait or upgrade Resend plan |
| "From address not allowed" | Invalid sender email | Configure authorized sender |

#### Database (Supabase) Status

**What It Checks:**
- Database connection health
- Supabase API endpoint connectivity
- Authentication service status
- Real-time features functionality

**🟢 Connected Means:**
- Database queries working normally
- Real-time updates functioning
- User authentication operational

**🔴 Error Means:**
- Cannot access stored data
- Real-time features not working
- May prevent user login

**Common Error Messages:**

| Error Message | Meaning | Action Required |
|--------------|---------|-----------------|
| "Connection refused" | Database unreachable | Check Supabase status, verify credentials |
| "Invalid project URL" | Supabase URL misconfigured | Update project URL in settings |
| "Anonymous key invalid" | Anon key expired or wrong | Update Supabase anon key |
| "Service unavailable" | Supabase maintenance | Wait for Supabase to restore service |

---

### Troubleshooting Integration Issues

#### General Troubleshooting Steps

When you see an error status on any integration:

**Step 1: Identify the Problem**
- Note the exact error message displayed
- Check "Last Checked" timestamp to see when error started
- Review details section for additional information

**Step 2: Try Quick Fixes**
1. Click **"Refresh Status"** button to recheck
2. Refresh your web browser (F5)
3. Wait 1-2 minutes and check again (temporary network issues may resolve)

**Step 3: Verify Credentials**
- Check that API keys and tokens are correct
- Ensure credentials haven't expired
- Verify you're using production keys (not test keys) in production

**Step 4: Check Service Status**
- Visit the service's status page:
  - WhatsApp: https://developers.facebook.com/status
  - Stripe: https://status.stripe.com
  - Resend: https://status.resend.com
  - Supabase: https://status.supabase.com

**Step 5: Contact Support**
- If issue persists after 30 minutes, contact ADSapp support
- Provide error message and screenshot of integration status
- Include approximate time when error started

#### Specific Integration Troubleshooting

#### WhatsApp Business API Issues

**Problem: "Invalid access token"**

**Solution:**
1. Access Meta Business Manager (business.facebook.com)
2. Navigate to WhatsApp Manager
3. Generate a new access token
4. Update token in ADSapp Settings → Integrations
5. Refresh status to verify connection

**Problem: "Phone number not found"**

**Solution:**
1. Verify phone number ID in Meta Business Manager
2. Ensure phone number is verified and active
3. Update phone number ID in ADSapp settings
4. Ensure format matches: 15-digit numeric ID

**Problem: Messages not being received**

**Solution:**
1. Check webhook configuration in Meta Business Manager
2. Verify webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
3. Ensure webhook verify token matches ADSapp configuration
4. Check that webhook subscriptions include "messages" event

#### Stripe Payment System Issues

**Problem: "Invalid API key"**

**Solution:**
1. Log in to Stripe Dashboard (dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Reveal and copy the secret key (starts with `sk_live_` for production)
4. Update in ADSapp Settings → Integrations
5. Ensure using live keys in production, test keys in development

**Problem: "Webhook verification failed"**

**Solution:**
1. Log in to Stripe Dashboard
2. Navigate to Developers → Webhooks
3. Locate the webhook endpoint for ADSapp
4. Click "Signing secret" to reveal the secret
5. Update webhook secret in ADSapp settings
6. Ensure webhook URL is: `https://your-domain.com/api/webhooks/stripe`

**Problem: Test mode in production**

**Solution:**
1. Verify you're using live API keys (start with `sk_live_`)
2. Replace test keys (`sk_test_`) with live keys
3. Update webhook endpoints to use live mode
4. Test a small transaction to verify

#### Email Service (Resend) Issues

**Problem: "Invalid API key"**

**Solution:**
1. Log in to Resend Dashboard (resend.com/dashboard)
2. Navigate to API Keys section
3. Create a new API key if needed
4. Copy the key (starts with `re_`)
5. Update in ADSapp Settings → Integrations

**Problem: "Domain not verified"**

**Solution:**
1. Log in to Resend Dashboard
2. Navigate to Domains section
3. Add your domain if not present
4. Follow DNS verification steps:
   - Add TXT record to your domain's DNS
   - Add DKIM records for authentication
5. Wait for verification (can take 24-48 hours)
6. Retry email sending after verification

**Problem: Emails not arriving**

**Solution:**
1. Check spam/junk folder
2. Verify sender email address is authorized in Resend
3. Check Resend dashboard for delivery logs
4. Ensure daily/monthly sending limits not exceeded
5. Verify recipient email address is valid

#### Database (Supabase) Issues

**Problem: "Connection refused"**

**Solution:**
1. Check Supabase status page: status.supabase.com
2. Log in to Supabase Dashboard (app.supabase.com)
3. Verify project is active (not paused)
4. Check database connection string is correct
5. Ensure IP allowlist includes your server IP (if configured)

**Problem: "Invalid project URL"**

**Solution:**
1. Log in to Supabase Dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy the project URL (format: `https://xxxxx.supabase.co`)
5. Update in ADSapp environment configuration
6. Redeploy application with updated URL

**Problem: Real-time features not working**

**Solution:**
1. Verify real-time is enabled in Supabase project settings
2. Check browser console for connection errors
3. Ensure WebSocket connections are not blocked by firewall
4. Verify Row Level Security (RLS) policies allow real-time subscriptions

#### When to Contact Support

Contact ADSapp Support if:

- ✅ Error persists for more than 1 hour
- ✅ Multiple integrations showing errors simultaneously
- ✅ Credentials are correct but connection still fails
- ✅ Service status pages show all systems operational but error persists
- ✅ Issue is affecting customer service or billing

**What to Include in Support Request:**

1. **Error Description**: Exact error message displayed
2. **Screenshots**: Capture integration status page
3. **Timeline**: When the error started
4. **Steps Taken**: What you've already tried
5. **Impact**: How this affects your business operations
6. **Contact Info**: Best way to reach you for follow-up

**Support Channels:**

- **Email**: support@adsapp.com
- **In-App Chat**: Click support icon in dashboard
- **Priority Support**: Available for Enterprise plans (24/7)

---

## Best Practices for Administrators

### Regular Monitoring Schedule

Establish a routine for checking integration status:

**Daily (Start of Business Day):**
- Quick scan of all integration status indicators
- Takes 30 seconds
- Ensures all systems operational before customers arrive

**Weekly (Monday Morning):**
- Full integration status review
- Test key functionality:
  - Send test WhatsApp message
  - Verify email delivery
  - Check recent payment processing
- Review any warning messages or degraded performance

**Monthly (First of Month):**
- Comprehensive system health check
- Review integration logs for patterns
- Update API keys/tokens if nearing expiration
- Test disaster recovery procedures

### Proactive Maintenance

**Keep Credentials Updated:**
- Set calendar reminders for token expiration dates
- Rotate API keys quarterly for security
- Document all credential changes

**Monitor Service Announcements:**
- Subscribe to status updates from:
  - WhatsApp Business Platform updates
  - Stripe API changelog
  - Resend service notices
  - Supabase platform updates
- Review breaking changes that may require configuration updates

**Test Integrations After Changes:**
- After updating any credentials, verify status immediately
- Test actual functionality (send message, process payment, etc.)
- Document what was changed and when

### Team Communication

**Notify Team of Issues:**
- When integration error detected, inform relevant team members immediately
- Use internal communication channels (Slack, Teams, etc.)
- Provide ETA for resolution if known

**Document Resolutions:**
- Keep log of integration issues and how they were resolved
- Build internal knowledge base for faster future troubleshooting
- Share learnings with team to prevent recurrence

**Escalation Procedures:**
- Define who to contact for each integration issue
- Establish escalation timeline (e.g., if not resolved in 2 hours, escalate)
- Maintain list of support contacts for each service

---

## Quick Reference Guide

### Business Hours Configuration

| Task | Steps |
|------|-------|
| **Set hours** | Settings → Organization → Business Hours → Toggle day ON → Set times → Save |
| **Close a day** | Settings → Organization → Business Hours → Toggle day OFF → Save |
| **Update schedule** | Settings → Organization → Business Hours → Modify times → Save |

### Logo Upload

| Task | Steps |
|------|-------|
| **Upload logo** | Settings → Organization → Upload Logo → Select file → Save Changes |
| **Change logo** | Settings → Organization → Upload Logo (replaces current) → Save Changes |
| **Requirements** | PNG/JPEG/WebP/SVG, max 5MB, recommended 512×512px |

### Integration Status

| Task | Steps |
|------|-------|
| **Check status** | Settings → Integrations → View all status cards |
| **Refresh status** | Settings → Integrations → Click "Refresh Status" on card |
| **Troubleshoot** | Note error → Try refresh → Check service status → Update credentials → Contact support |

---

## Frequently Asked Questions (FAQ)

### Business Hours

**Q: Do business hours affect when messages are sent?**
A: Business hours don't prevent sending messages. They help automation rules determine when to send auto-replies or route conversations differently.

**Q: Can I set different hours for different days?**
A: Yes! Each day has independent toggle and time settings.

**Q: What happens if I don't configure business hours?**
A: Your organization will appear as available 24/7 by default. It's recommended to set accurate hours for better customer expectations.

**Q: Can I set split shifts (morning and afternoon with lunch break)?**
A: Currently, each day supports one continuous time range. Split shifts will be added in a future update. For now, use the full operating range and communicate breaks via automation messages.

**Q: Do business hours account for time zones?**
A: Business hours are set in your local time zone. Make sure to communicate your time zone to customers in your profile or automation messages.

### Logo Upload

**Q: What's the best file format for my logo?**
A: PNG is recommended for most logos, especially if your logo has a transparent background. SVG is excellent for vector logos.

**Q: My logo is 10MB. How do I reduce the file size?**
A: Use online compression tools like TinyPNG (tinypng.com) or resize your image to 512×512 pixels.

**Q: Will my logo appear on customer-facing messages?**
A: Currently, logos appear in your dashboard and admin areas. Customer-facing branding features are planned for a future update.

**Q: Can I remove my logo once uploaded?**
A: Yes, you can upload a new logo to replace the current one. A "Remove Logo" feature will be added in a future update.

**Q: What is SVG sanitization and why is it needed?**
A: SVG files can contain code that poses security risks. ADSapp automatically removes any potentially harmful code while preserving your logo's appearance. This protects your organization and users from security vulnerabilities.

### Integration Status

**Q: How often is integration status checked?**
A: Status is checked when you visit the Integrations page and automatically every 5 minutes while the page is open.

**Q: What should I do if all integrations show errors?**
A: This usually indicates a network or authentication issue on your end. Check your internet connection, refresh the page, and verify your login session is still active.

**Q: Can I disable an integration?**
A: Integrations cannot be disabled as they are essential for ADSapp functionality. If you need to change providers, contact support for migration assistance.

**Q: Why does Stripe show "Error" but payments are processing?**
A: The status check may be failing while the core service works. This can happen due to temporary API issues. Monitor your Stripe dashboard directly and contact support if the error persists beyond 30 minutes.

**Q: How do I know if an integration issue is affecting customers?**
A: Check the specific integration details:
- **WhatsApp Error**: Customers cannot send/receive messages
- **Stripe Error**: New subscriptions cannot be processed
- **Email Error**: Password resets and notifications won't send
- **Database Error**: Application may be unusable

---

## Summary

This update introduces three powerful features to enhance your ADSapp administration experience:

✅ **Business Hours Management**
- Control your availability schedule
- Improve customer expectations
- Enable time-based automation

✅ **Logo Upload**
- Customize your organization branding
- Professional appearance
- Secure, automatic SVG sanitization

✅ **Integration Status Monitoring**
- Real-time health monitoring
- Proactive issue detection
- Simplified troubleshooting

### Next Steps

1. **Configure Business Hours**: Set your organization's availability schedule
2. **Upload Your Logo**: Add your company branding for a professional appearance
3. **Check Integration Status**: Verify all services are connected and operational
4. **Bookmark This Guide**: Keep this manual handy for future reference
5. **Share with Your Team**: Ensure all administrators are aware of these features

### Need Help?

- **Documentation**: Refer to this manual for step-by-step instructions
- **Support**: Email support@adsapp.com or use in-app chat
- **Training**: Schedule a personalized training session with our team
- **Community**: Join our user community forum for tips and best practices

---

**Document Version:** 1.2.0
**Last Updated:** October 20, 2025
**Next Review:** January 20, 2026

*This document is maintained by the ADSapp team and updated regularly as new features are released.*
