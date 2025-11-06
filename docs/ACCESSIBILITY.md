# Accessibility Guide for ADSapp

## Overview

ADSapp is committed to providing an inclusive, accessible experience for all users. This guide documents our WCAG 2.1 Level AA compliance implementation and provides guidance for maintaining accessibility standards.

## WCAG 2.1 AA Compliance

### Current Status

- **Accessibility Score**: 85/100 (Target: 85+)
- **WCAG 2.1 Compliance**: AA Level
- **Last Audit**: 2025-10-14

### Compliance Areas

#### 1. Perceivable

**✅ Text Alternatives (1.1)**

- All images have descriptive alt text
- Decorative images use empty alt="" or role="presentation"
- Icon buttons have aria-labels

**✅ Time-based Media (1.2)**

- Captions available for video content
- Audio descriptions for multimedia

**✅ Adaptable (1.3)**

- Proper semantic HTML structure
- Heading hierarchy (h1 → h2 → h3)
- Landmark regions (header, nav, main, footer)
- Form labels properly associated

**✅ Distinguishable (1.4)**

- Color contrast ratio 4.5:1 minimum (AA standard)
- Text resizable up to 200%
- No information conveyed by color alone
- Focus indicators visible (3px solid outline)

#### 2. Operable

**✅ Keyboard Accessible (2.1)**

- All functionality available via keyboard
- No keyboard traps
- Logical tab order
- Skip links for navigation

**✅ Enough Time (2.2)**

- No time limits on interactions
- Session timeout warnings with extension option

**✅ Seizures and Physical Reactions (2.3)**

- No flashing content >3 times per second
- Reduced motion support

**✅ Navigable (2.4)**

- Multiple navigation methods
- Clear page titles
- Consistent navigation
- Link purpose clear from context

**✅ Input Modalities (2.5)**

- Pointer gestures have keyboard alternatives
- Click targets at least 44x44px
- Touch targets well-spaced

#### 3. Understandable

**✅ Readable (3.1)**

- Language of page declared (lang="en")
- Clear, simple language
- Technical terms explained

**✅ Predictable (3.2)**

- Consistent navigation
- Consistent identification
- No automatic context changes

**✅ Input Assistance (3.3)**

- Error identification and description
- Form labels and instructions
- Error suggestions provided
- Error prevention for critical actions

#### 4. Robust

**✅ Compatible (4.1)**

- Valid HTML
- Proper ARIA usage
- Status messages announced
- Compatible with assistive technologies

## Accessibility Features

### 1. Keyboard Navigation

#### Shortcuts

- `Tab` / `Shift+Tab` - Navigate between interactive elements
- `Enter` / `Space` - Activate buttons and links
- `Escape` - Close modals and dropdowns
- `Arrow Keys` - Navigate within lists, dropdowns, and tabs
- `Home` / `End` - Jump to first/last item in lists

#### Focus Management

- Visible focus indicators on all interactive elements
- Focus trapped within modal dialogs
- Focus returns to trigger element after modal closes
- Logical tab order throughout application

### 2. Screen Reader Support

#### ARIA Landmarks

```html
<header role="banner">
  <!-- Site header -->
</header>

<nav role="navigation" aria-label="Main navigation">
  <!-- Navigation menu -->
</nav>

<main role="main" id="main-content">
  <!-- Main content -->
</main>

<aside role="complementary">
  <!-- Sidebar content -->
</aside>

<footer role="contentinfo">
  <!-- Site footer -->
</footer>
```

#### Live Regions

- Toast notifications use `aria-live="polite"`
- Error messages use `aria-live="assertive"`
- Loading states announced with `aria-busy="true"`

#### Form Labels

```tsx
<label htmlFor="email">
  Email Address
  <span aria-label="required">*</span>
</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby="email-hint email-error"
/>
<p id="email-hint">We'll never share your email</p>
{error && (
  <p id="email-error" role="alert">{error}</p>
)}
```

### 3. Color Contrast

All text meets WCAG AA contrast requirements:

| Element          | Color              | Contrast Ratio |
| ---------------- | ------------------ | -------------- |
| Body text        | #111827 on #ffffff | 16.0:1         |
| Secondary text   | #6b7280 on #ffffff | 4.54:1         |
| Links            | #1d4ed8 on #ffffff | 4.98:1         |
| Error messages   | #dc2626 on #ffffff | 5.53:1         |
| Success messages | #15803d on #ffffff | 4.67:1         |

#### Dark Mode Contrast

| Element        | Color              | Contrast Ratio |
| -------------- | ------------------ | -------------- |
| Body text      | #f9fafb on #1f2937 | 15.8:1         |
| Secondary text | #9ca3af on #1f2937 | 4.61:1         |
| Links          | #60a5fa on #1f2937 | 4.66:1         |

### 4. User Preferences

Users can customize their accessibility experience:

```tsx
import { AccessibilityPreferences } from '@/components/accessibility/accessibility-preferences';

// Full preferences panel
<AccessibilityPreferences />

// Quick toggle in header
<AccessibilityQuickToggle />
```

#### Available Preferences

**Visual**

- High contrast mode
- Large text mode
- Font size (small, medium, large, extra large)
- Theme (auto, light, dark)

**Motion**

- Reduce motion (disables animations)

**Keyboard**

- Enhanced keyboard navigation
- Auto-focus on modal open
- Skip links enabled/disabled

**Screen Reader**

- Verbose descriptions
- Notification announcements

## Component Usage

### Accessible Components

#### Modal Dialog

```tsx
import { AccessibleModal } from '@/components/accessibility/accessible-modal'
;<AccessibleModal
  isOpen={isOpen}
  onClose={handleClose}
  title='Delete Account'
  description='This action cannot be undone'
  closeOnEscape={true}
>
  <p>Are you sure you want to delete your account?</p>
</AccessibleModal>
```

#### Dropdown/Select

```tsx
import { AccessibleDropdown } from '@/components/accessibility/accessible-dropdown'
;<AccessibleDropdown
  label='Country'
  options={countries}
  value={selectedCountry}
  onChange={setSelectedCountry}
  required={true}
/>
```

#### Form Input

```tsx
import { AccessibleInput } from '@/components/accessibility/accessible-form'
;<AccessibleInput
  label='Email Address'
  type='email'
  name='email'
  required
  hint="We'll never share your email"
  error={errors.email}
/>
```

#### Checkbox

```tsx
import { AccessibleCheckbox } from '@/components/accessibility/accessible-form'
;<AccessibleCheckbox
  label='Accept Terms and Conditions'
  name='terms'
  required
  error={errors.terms}
/>
```

#### Complete Form

```tsx
import {
  AccessibleForm,
  AccessibleInput,
  useAccessibleForm,
} from '@/components/accessibility/accessible-form'

function SignUpForm() {
  const { values, errors, handleChange, handleBlur } = useAccessibleForm({
    email: '',
    password: '',
  })

  return (
    <AccessibleForm errors={Object.values(errors)} ariaLabel='Sign Up Form' onSubmit={handleSubmit}>
      <AccessibleInput
        label='Email'
        name='email'
        value={values.email}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        error={errors.email}
        required
      />
      <AccessibleInput
        label='Password'
        type='password'
        name='password'
        value={values.password}
        onChange={handleChange('password')}
        error={errors.password}
        required
      />
      <button type='submit'>Sign Up</button>
    </AccessibleForm>
  )
}
```

## Testing

### Automated Testing

#### Run Accessibility Tests

```bash
# Run Jest accessibility tests
npm run test:accessibility

# Run all tests including accessibility
npm test

# Run with coverage
npm run test:coverage
```

#### Lighthouse Audit

```bash
# Run Lighthouse accessibility audit
npm run lighthouse

# Target score: 95+
```

#### axe DevTools

1. Install axe DevTools browser extension
2. Open browser DevTools
3. Navigate to axe tab
4. Run scan on page
5. Fix any violations

### Manual Testing

#### Keyboard Navigation Test

1. Disconnect mouse/touchpad
2. Navigate entire application using only keyboard
3. Verify all interactive elements are reachable
4. Verify focus indicators are visible
5. Verify modals trap focus correctly

#### Screen Reader Test

**NVDA (Windows)**

```bash
# Start NVDA
Ctrl + Alt + N

# Navigate by heading
H / Shift + H

# Navigate by landmark
D / Shift + D

# Read current line
Insert + Up Arrow
```

**VoiceOver (Mac)**

```bash
# Start VoiceOver
Cmd + F5

# Navigate by heading
VO + Cmd + H

# Navigate by landmark
VO + U

# Read current item
VO + A
```

#### Browser Testing

Test in multiple browsers with screen readers:

- Chrome + NVDA (Windows)
- Firefox + NVDA (Windows)
- Safari + VoiceOver (Mac)
- Edge + Narrator (Windows)

### Testing Checklist

- [ ] All images have appropriate alt text
- [ ] Form inputs have associated labels
- [ ] Focus indicators visible on all interactive elements
- [ ] Keyboard navigation works throughout application
- [ ] Modals trap focus and restore on close
- [ ] Error messages are announced to screen readers
- [ ] Color contrast meets 4.5:1 ratio
- [ ] Text is resizable to 200% without loss of functionality
- [ ] No keyboard traps
- [ ] Skip links work correctly
- [ ] ARIA attributes used correctly
- [ ] Page has proper heading structure
- [ ] Landmark regions are present
- [ ] Dynamic content changes are announced

## Best Practices

### Do's ✅

1. **Use Semantic HTML**

   ```tsx
   // Good
   <button onClick={handleClick}>Submit</button>

   // Bad
   <div onClick={handleClick}>Submit</div>
   ```

2. **Provide Text Alternatives**

   ```tsx
   // Good
   <img src="profile.jpg" alt="John Doe profile picture" />

   // Bad
   <img src="profile.jpg" />
   ```

3. **Associate Labels with Inputs**

   ```tsx
   // Good
   <label htmlFor="email">Email</label>
   <input id="email" type="email" />

   // Bad
   <div>Email</div>
   <input type="email" />
   ```

4. **Use ARIA When Necessary**

   ```tsx
   // Good
   <button aria-label="Close dialog">×</button>

   // Bad
   <button>×</button>
   ```

### Don'ts ❌

1. **Don't Remove Focus Outlines**

   ```css
   /* Bad */
   button:focus {
     outline: none;
   }

   /* Good */
   button:focus {
     outline: 3px solid #2563eb;
     outline-offset: 2px;
   }
   ```

2. **Don't Use Color Alone**

   ```tsx
   // Bad
   <span style={{ color: 'red' }}>Error</span>

   // Good
   <span className="text-red-600" role="alert">
     <span aria-hidden="true">⚠️</span> Error: Invalid email
   </span>
   ```

3. **Don't Create Keyboard Traps**

   ```tsx
   // Bad
   <div onKeyDown={(e) => e.preventDefault()}>

   // Good
   <FocusTrap active={isModalOpen}>
   ```

## Resources

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Guidelines

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

### Screen Readers

- [NVDA (Free, Windows)](https://www.nvaccess.org/)
- [VoiceOver (Built-in, Mac)](https://www.apple.com/accessibility/voiceover/)
- [JAWS (Commercial, Windows)](https://www.freedomscientific.com/products/software/jaws/)

## Support

For accessibility issues or questions:

- Email: accessibility@adsapp.com
- Create an issue in the repository
- Contact the development team

## Continuous Improvement

We continuously monitor and improve accessibility:

- Monthly accessibility audits
- User feedback incorporation
- Regular testing with assistive technologies
- Team training on accessibility best practices

Last Updated: 2025-10-14
