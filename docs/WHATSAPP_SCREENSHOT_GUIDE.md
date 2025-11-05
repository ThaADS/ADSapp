# WhatsApp Setup Screenshot Guide

## Purpose
Create annotated screenshots showing users exactly where to find WhatsApp Business API credentials in Meta Business Suite.

## Required Screenshots

### 1. Phone Number ID Location
**File:** `public/images/whatsapp-phone-number-id.png`

**What to capture:**
1. Navigate to: https://business.facebook.com/settings/whatsapp-business-accounts
2. Select your WhatsApp Business Account
3. Click on "Phone Numbers" in left sidebar
4. Show the Phone Number ID field

**Annotations needed:**
- Red arrow pointing to Phone Number ID
- Red box around the 15-digit number
- Text label: "Copy this Phone Number ID"
- Additional note: "This is a 15-digit number like 123456789012345"

---

### 2. Business Account ID Location
**File:** `public/images/whatsapp-business-account-id.png`

**What to capture:**
1. In Meta Business Suite settings
2. WhatsApp Business Account overview page
3. Show the Account ID in the URL or account settings

**Annotations needed:**
- Red arrow pointing to Business Account ID
- Red box around the ID
- Text label: "Your Business Account ID"
- Additional note: "Usually 15-20 digits"

---

### 3. Access Token Generation
**File:** `public/images/whatsapp-access-token.png`

**What to capture:**
1. Navigate to: https://developers.facebook.com/apps
2. Select your app
3. Click "WhatsApp" → "Getting Started"
4. Show the "Temporary Access Token" section
5. Show the "Generate" button

**Annotations needed:**
- Step 1: Arrow to "WhatsApp" in left sidebar
- Step 2: Arrow to "Getting Started"
- Step 3: Red box around "Temporary Access Token"
- Step 4: Arrow to "Copy" button
- Warning box: "⚠️ Keep this token secure! Never share it publicly."
- Info box: "💡 Temporary tokens expire in 24 hours. Generate permanent tokens in production."

---

### 4. Webhook Setup (Optional but helpful)
**File:** `public/images/whatsapp-webhook-setup.png`

**What to capture:**
1. WhatsApp → Configuration → Webhook
2. Show callback URL field
3. Show verify token field

**Annotations needed:**
- Arrow to "Configuration" tab
- Red box around "Callback URL" field
- Red box around "Verify Token" field
- Text: "Enter your ADSapp webhook URL here"
- Text: "Create a custom verify token (e.g., 'my_secure_token_123')"

---

## Screenshot Specifications

### Technical Requirements
- **Format:** PNG (for transparency and quality)
- **Resolution:** 1920x1080 minimum (retina displays)
- **File size:** < 500KB each (use compression if needed)
- **Quality:** High quality, clear text, no blur

### Visual Style
- **Annotation color:** #EF4444 (red) for primary highlights
- **Background:** Semi-transparent overlay for text labels
- **Font:** Inter or system font, 16-18px for labels
- **Arrows:** Bold, curved arrows with drop shadow
- **Boxes:** 3px solid border with rounded corners

### Annotation Tools (Recommended)
1. **Snagit** (Windows/Mac) - Best for annotations
2. **Greenshot** (Windows, free) - Good for quick annotations
3. **Skitch** (Mac, free) - Simple and effective
4. **Figma** (Web, free) - Professional design tool

---

## File Organization

```
public/
└── images/
    ├── whatsapp-phone-number-id.png       (Step 1 screenshot)
    ├── whatsapp-business-account-id.png   (Step 2 screenshot)
    ├── whatsapp-access-token.png          (Step 3 screenshot)
    ├── whatsapp-webhook-setup.png         (Optional)
    └── whatsapp-tutorial-thumbnail.jpg    (Video thumbnail)
```

---

## Integration with WhatsAppSetupWizard

Once screenshots are created, they will be displayed in the wizard:

```tsx
// Step 1: Phone Number ID
<img
  src="/images/whatsapp-phone-number-id.png"
  alt="WhatsApp Phone Number ID location"
  className="rounded-lg border-2 border-gray-200 shadow-lg"
/>

// Step 2: Business Account ID
<img
  src="/images/whatsapp-business-account-id.png"
  alt="WhatsApp Business Account ID location"
  className="rounded-lg border-2 border-gray-200 shadow-lg"
/>

// Step 3: Access Token
<img
  src="/images/whatsapp-access-token.png"
  alt="WhatsApp Access Token generation"
  className="rounded-lg border-2 border-gray-200 shadow-lg"
/>
```

---

## Placeholder Images (Temporary)

Until real screenshots are created, we can use placeholder images:

1. **Option A:** Generate placeholder with text
   - Tool: https://placeholder.com/
   - Size: 1920x1080
   - Text: "Screenshot will be added here"

2. **Option B:** Use Meta's official documentation images
   - Source: https://developers.facebook.com/docs/whatsapp
   - Ensure proper attribution

3. **Option C:** Create simple diagrams
   - Tool: Figma or Excalidraw
   - Show conceptual flow rather than actual UI

---

## Testing Checklist

After adding screenshots:

- [ ] Images load correctly in wizard
- [ ] Images are responsive (resize properly on mobile)
- [ ] Alt text is descriptive for accessibility
- [ ] File sizes are optimized (< 500KB each)
- [ ] Annotations are clear and readable
- [ ] Images match current Meta Business Suite UI (not outdated)
- [ ] All sensitive data (tokens, IDs) are masked/redacted in screenshots

---

## Maintenance

**Frequency:** Review screenshots every 3 months

**Reasons for updates:**
- Meta Business Suite UI changes
- New WhatsApp API features
- User feedback on clarity
- Updated best practices

**Update process:**
1. Create new screenshots with current UI
2. Update annotations if needed
3. Replace old files (keep same filenames)
4. Test in staging environment
5. Deploy to production

---

## User Feedback

**Common questions to address with screenshots:**
1. "Where do I find my Phone Number ID?" → Screenshot 1
2. "What's the difference between Phone Number ID and Business Account ID?" → Both screenshots with comparison
3. "How do I generate an access token?" → Screenshot 3 with step-by-step
4. "My token doesn't work, am I copying the right one?" → Screenshot 3 with highlighted copy button

---

## Accessibility

**Alt text examples:**
```html
<img
  src="/images/whatsapp-phone-number-id.png"
  alt="Meta Business Suite interface showing WhatsApp phone numbers list with Phone Number ID highlighted in red box. The ID is a 15-digit number located in the right column next to each phone number."
/>

<img
  src="/images/whatsapp-access-token.png"
  alt="Meta Developer Portal showing WhatsApp API Getting Started page with Temporary Access Token section. The Copy button is highlighted with a red arrow. Warning text states to keep token secure."
/>
```

---

## Next Steps

1. **Create screenshots** using Meta Business Suite
2. **Annotate** with clear, visual highlights
3. **Optimize** file sizes for web
4. **Test** in WhatsAppSetupWizard component
5. **Gather feedback** from beta users
6. **Iterate** based on confusion points

---

## Resources

- **Meta Business Suite:** https://business.facebook.com/
- **WhatsApp Business API Docs:** https://developers.facebook.com/docs/whatsapp
- **UI Screenshot Best Practices:** https://www.nngroup.com/articles/screenshot-best-practices/
- **Image Optimization Tools:**
  - TinyPNG: https://tinypng.com/
  - Squoosh: https://squoosh.app/
