# Accessibility Testing Guide

## Overview

This guide provides comprehensive instructions for testing accessibility compliance in ADSapp. Follow these procedures to ensure WCAG 2.1 AA compliance is maintained.

## Automated Testing

### 1. Jest Accessibility Tests

Run the automated accessibility test suite:

```bash
# Run all accessibility tests
npm run test tests/accessibility

# Run with coverage
npm run test:coverage tests/accessibility

# Run in watch mode during development
npm run test:watch tests/accessibility
```

### 2. axe-core Integration

Install the axe DevTools browser extension:

**Chrome/Edge**

1. Visit [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "axe DevTools"
3. Click "Add to Chrome/Edge"

**Firefox**

1. Visit [Firefox Add-ons](https://addons.mozilla.org)
2. Search for "axe DevTools"
3. Click "Add to Firefox"

**Usage**:

```
1. Open the page you want to test
2. Open DevTools (F12)
3. Click the "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review violations and fix them
```

### 3. Lighthouse Audit

Run Lighthouse accessibility audit:

```bash
# Via command line
npx lighthouse https://yourapp.com --only-categories=accessibility --view

# Or use Chrome DevTools:
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Check "Accessibility"
# 4. Click "Generate report"
```

**Target Scores**:

- Accessibility: 95+
- Performance: 90+
- Best Practices: 90+
- SEO: 90+

### 4. Pa11y CI

Add to your CI/CD pipeline:

```bash
# Install pa11y-ci
npm install --save-dev pa11y-ci

# Run pa11y
npx pa11y-ci --sitemap https://yourapp.com/sitemap.xml
```

## Manual Testing

### Keyboard Navigation Testing

#### Test Procedure

**Step 1: Basic Navigation**

```
1. Disconnect mouse/trackpad
2. Press Tab to navigate forward
3. Press Shift+Tab to navigate backward
4. Verify all interactive elements are reachable
5. Verify focus indicator is visible
```

**Step 2: Interactive Elements**

```
✓ Buttons: Press Enter or Space to activate
✓ Links: Press Enter to follow
✓ Checkboxes: Press Space to toggle
✓ Radio buttons: Use Arrow keys to select
✓ Dropdowns:
  - Arrow Down to open
  - Arrow Up/Down to navigate options
  - Enter to select
  - Escape to close
```

**Step 3: Modal Dialogs**

```
✓ Focus traps within modal
✓ Escape key closes modal
✓ Focus returns to trigger element after close
✓ Can't access background content while modal is open
```

**Step 4: Forms**

```
✓ Tab through all form fields in logical order
✓ Error messages are announced
✓ Required fields are indicated
✓ Form can be submitted with Enter key
```

#### Keyboard Shortcuts Reference

| Key        | Action                           |
| ---------- | -------------------------------- |
| Tab        | Move focus forward               |
| Shift+Tab  | Move focus backward              |
| Enter      | Activate button/link             |
| Space      | Activate button, toggle checkbox |
| Escape     | Close modal/dropdown             |
| Arrow keys | Navigate within components       |
| Home       | Jump to first item               |
| End        | Jump to last item                |

### Screen Reader Testing

#### NVDA (Windows)

**Installation**:

1. Download from [nvaccess.org](https://www.nvaccess.org/)
2. Run installer
3. Follow setup wizard

**Basic Commands**:

```
Ctrl+Alt+N: Start/Stop NVDA
Insert+Down Arrow: Read current line
Insert+Up Arrow: Read from current position
H: Next heading
Shift+H: Previous heading
D: Next landmark
Shift+D: Previous landmark
1-6: Jump to heading level
Insert+F7: List all headings/links
```

**Testing Checklist**:

- [ ] All images have descriptive alt text
- [ ] Heading structure is logical (h1 → h2 → h3)
- [ ] Landmark regions are announced
- [ ] Form labels are read correctly
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced
- [ ] Link purpose is clear
- [ ] Button labels are descriptive

#### VoiceOver (Mac)

**Activation**:

```bash
Cmd+F5: Turn VoiceOver on/off
```

**Basic Commands**:

```
VO = Ctrl+Option

VO+A: Start reading
VO+Right Arrow: Next item
VO+Left Arrow: Previous item
VO+Space: Activate item
VO+Cmd+H: Next heading
VO+U: Open rotor (navigate by headings/links/landmarks)
VO+Shift+Down Arrow: Interact with group
VO+Shift+Up Arrow: Stop interacting
```

**Testing Procedure**:

```
1. Enable VoiceOver (Cmd+F5)
2. Navigate to the page
3. Listen to how content is announced
4. Use rotor (VO+U) to check:
   - Headings structure
   - Landmarks
   - Links
   - Form controls
5. Navigate through forms and verify labels
6. Test dynamic content (modals, alerts)
7. Verify focus management in interactive elements
```

### Browser Testing Matrix

Test across multiple browser/screen reader combinations:

| Browser | Screen Reader | Platform | Priority |
| ------- | ------------- | -------- | -------- |
| Chrome  | NVDA          | Windows  | High     |
| Firefox | NVDA          | Windows  | High     |
| Safari  | VoiceOver     | macOS    | High     |
| Edge    | Narrator      | Windows  | Medium   |
| Chrome  | JAWS          | Windows  | Medium   |

### Color Contrast Testing

#### Tools

**WebAIM Contrast Checker**

1. Visit [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/)
2. Enter foreground and background colors
3. Verify contrast ratio meets requirements:
   - Normal text: 4.5:1 minimum
   - Large text (18pt+): 3:1 minimum
   - UI components: 3:1 minimum

**Chrome DevTools**

```
1. Open DevTools (F12)
2. Select element with Inspect tool
3. Click color swatch in Styles panel
4. Check contrast ratio shown
5. DevTools will indicate if it meets AA/AAA
```

**Color Oracle**

- Download from [colororacle.org](https://www.colororacle.org/)
- Simulates color blindness
- Test your application with different color vision deficiencies

#### Color Contrast Requirements

| Element Type       | Contrast Ratio |
| ------------------ | -------------- |
| Body text          | 4.5:1 (AA)     |
| Large text (18pt+) | 3:1 (AA)       |
| UI components      | 3:1 (AA)       |
| Graphical objects  | 3:1 (AA)       |
| Focus indicators   | 3:1 (AA)       |

### Zoom and Reflow Testing

**Test Procedure**:

```
1. Open the application in browser
2. Zoom to 200% (Ctrl/Cmd + Plus)
3. Verify:
   - Content is still readable
   - No horizontal scrolling on mobile (320px width)
   - All functionality still works
   - Text doesn't overlap
   - Images scale properly
4. Test at 400% zoom for text content
```

### Touch Target Testing

**Requirements**:

- Minimum touch target size: 44x44 CSS pixels
- Adequate spacing between targets: 8px minimum

**Test Procedure**:

```
1. Open browser DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device
4. Test tapping all interactive elements
5. Verify no mis-taps occur
6. Check spacing between adjacent buttons
```

## Testing Checklists

### Component Accessibility Checklist

When creating a new component:

#### General

- [ ] Semantic HTML elements used
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Color contrast meets requirements
- [ ] Works at 200% zoom
- [ ] Touch targets adequate size

#### Interactive Elements

- [ ] Proper ARIA roles/attributes
- [ ] Focus indicators visible
- [ ] Keyboard shortcuts documented
- [ ] Tab order is logical
- [ ] No keyboard traps

#### Forms

- [ ] Labels associated with inputs
- [ ] Required fields indicated
- [ ] Error messages clear and helpful
- [ ] Error prevention in place
- [ ] Validation messages announced
- [ ] Can submit with Enter key

#### Images and Media

- [ ] Alt text provided
- [ ] Decorative images have empty alt
- [ ] Complex images have detailed descriptions
- [ ] Icons have text alternatives

#### Dynamic Content

- [ ] Updates announced to screen readers
- [ ] Loading states indicated
- [ ] Live regions implemented correctly
- [ ] Focus management on content changes

### Page Accessibility Checklist

For each page/view:

#### Structure

- [ ] Page title is descriptive
- [ ] Heading hierarchy is correct
- [ ] Landmarks are present (header, nav, main, footer)
- [ ] Skip links functional

#### Navigation

- [ ] Multiple ways to navigate (menu, search, breadcrumbs)
- [ ] Current page indicated
- [ ] Navigation order is logical
- [ ] Links have descriptive text

#### Content

- [ ] Language declared (lang attribute)
- [ ] Text alternatives for non-text content
- [ ] Color not sole means of conveying information
- [ ] Text can be resized without loss of functionality

#### Interactive

- [ ] All functionality keyboard accessible
- [ ] No time limits (or can be extended)
- [ ] No content flashes
- [ ] Forms have clear labels and instructions

## Continuous Monitoring

### Automated CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run Jest accessibility tests
        run: npm run test:accessibility
      - name: Run Pa11y CI
        run: npx pa11y-ci
```

### Regular Audit Schedule

- **Weekly**: Automated tests on dev branch
- **Before release**: Full manual testing
- **Monthly**: Comprehensive audit with real users
- **Quarterly**: External accessibility audit

### User Feedback

Provide accessibility feedback channels:

- Email: accessibility@adsapp.com
- In-app feedback form
- GitHub issues with `accessibility` label

## Common Issues and Fixes

### Issue: Missing Alt Text

**Problem**:

```tsx
<img src='profile.jpg' />
```

**Fix**:

```tsx
<img src="profile.jpg" alt="User profile picture" />

// For decorative images:
<img src="divider.png" alt="" role="presentation" />
```

### Issue: Poor Color Contrast

**Problem**:

```css
.text-gray-400 {
  color: #9ca3af; /* 2.8:1 contrast - fails */
}
```

**Fix**:

```css
.text-gray-600 {
  color: #4b5563; /* 7.1:1 contrast - passes */
}
```

### Issue: No Focus Indicator

**Problem**:

```css
button:focus {
  outline: none; /* Bad! */
}
```

**Fix**:

```css
button:focus {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

### Issue: Unlabeled Form Input

**Problem**:

```tsx
<div>Email</div>
<input type="email" />
```

**Fix**:

```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Issue: Keyboard Trap

**Problem**:

```tsx
<div onKeyDown={e => e.preventDefault()}>{/* Content */}</div>
```

**Fix**:

```tsx
<FocusTrap active={isModalOpen}>{/* Content */}</FocusTrap>
```

## Resources

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://pa11y.org/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Screen Readers

- [NVDA](https://www.nvaccess.org/) - Free, Windows
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) - Built-in, Mac/iOS
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) - Commercial, Windows
- [TalkBack](https://support.google.com/accessibility/android/answer/6283677) - Built-in, Android

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)
- [Deque University](https://dequeuniversity.com/)

## Support

For questions or issues:

- Technical: accessibility@adsapp.com
- GitHub: Create an issue with `accessibility` label
- Slack: #accessibility channel (internal)

Last Updated: 2025-10-14
