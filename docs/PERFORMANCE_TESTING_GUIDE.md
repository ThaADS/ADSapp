# Performance Testing Guide

## Quick Start

### Automated Lighthouse Testing

```bash
# Run Lighthouse CI with configuration
npm run test:performance

# This will:
# 1. Build the production application
# 2. Start the server
# 3. Run Lighthouse on key pages (3 runs each)
# 4. Generate performance reports
# 5. Assert performance budgets
```

### Manual Lighthouse Testing

#### Chrome DevTools Method

1. Open Chrome browser
2. Navigate to page to test
3. Open DevTools (F12)
4. Go to "Lighthouse" tab
5. Select:
   - ☑️ Performance
   - ☑️ Accessibility
   - ☑️ Best Practices
   - ☑️ SEO
6. Choose Device: Mobile or Desktop
7. Click "Generate report"

#### Pages to Test

- Homepage: `http://localhost:3000`
- Sign In: `http://localhost:3000/auth/signin`
- Dashboard: `http://localhost:3000/dashboard`
- Inbox: `http://localhost:3000/dashboard/inbox`
- Conversations: `http://localhost:3000/dashboard/conversations`

### Core Web Vitals Testing

#### Local Testing

**1. Development Console**

```bash
npm run dev
# Open http://localhost:3000
# Check browser console for Web Vitals logs:
# [Web Vitals] LCP: { value: 1234ms, rating: 'good' }
# [Web Vitals] FID: { value: 45ms, rating: 'good' }
# [Web Vitals] CLS: { value: 0.05, rating: 'good' }
```

**2. Chrome DevTools Performance Tab**

1. Open DevTools > Performance
2. Click Record button
3. Load page and interact
4. Stop recording
5. Check "Experience" section for:
   - Layout Shifts (CLS)
   - Long Tasks (FID)
   - LCP marker

**3. Chrome DevTools Coverage Tab**

1. Open DevTools > Coverage
2. Click Record
3. Load page
4. Check unused JavaScript/CSS percentages
5. Target: <20% unused code

### Network Throttling Tests

#### Slow 3G Simulation

1. Open DevTools > Network tab
2. Select "Slow 3G" from throttling dropdown
3. Reload page
4. Verify acceptable performance

**Expected Results:**

- LCP < 4 seconds on Slow 3G
- Page functional within 5 seconds
- Progressive enhancement working

#### Fast 3G Simulation

1. Select "Fast 3G"
2. Reload page
3. Verify near-native performance

**Expected Results:**

- LCP < 3 seconds
- Smooth interactions
- No blocking resources

### CPU Throttling Tests

#### 4x Slowdown

1. Open DevTools > Performance tab
2. Click gear icon ⚙️
3. Set CPU throttling to "4x slowdown"
4. Record performance
5. Check FID/INP metrics

**Expected Results:**

- FID < 200ms on 4x throttle
- No frozen UI
- Responsive inputs

### Bundle Size Analysis

#### Analyze Bundle

```bash
npm run analyze
# Opens bundle analyzer reports:
# - .next/analyze/client.html
# - .next/analyze/server.html
```

**What to Check:**

- Largest modules (should be <100KB)
- Duplicate dependencies
- Unexpected large packages
- Tree-shaking effectiveness

**Performance Budgets:**

- Main bundle: <200KB
- Dashboard chunk: <150KB
- Total JS: <500KB
- CSS: <50KB

### Automated Testing Workflows

#### Pre-Commit Testing

```bash
# Fast checks before commit
npm run type-check
npm run lint
npm run format:check
```

#### Pre-Push Testing

```bash
# Comprehensive checks before push
npm run build
npm run test:ci
```

#### CI/CD Pipeline Testing

```bash
# Full test suite in CI
npm run build
npm run test:ci
npm run test:performance
npm run test:e2e
```

## Performance Checklist

### Before Each Release

- [ ] Run Lighthouse on all key pages
- [ ] Check Core Web Vitals in production
- [ ] Analyze bundle sizes
- [ ] Test on Slow 3G
- [ ] Test with CPU throttling
- [ ] Verify image optimization
- [ ] Check for layout shifts
- [ ] Test lazy loading
- [ ] Verify skeleton loaders
- [ ] Check font loading

### Performance Metrics to Monitor

#### Critical Metrics

- **LCP**: <2.5s (must pass)
- **FID**: <100ms (must pass)
- **CLS**: <0.1 (must pass)

#### Secondary Metrics

- **FCP**: <1.8s (target)
- **TTFB**: <800ms (target)
- **INP**: <200ms (target)
- **Speed Index**: <3.4s (target)

#### Bundle Metrics

- **Main Bundle**: <200KB (budget)
- **Page Chunks**: <150KB (budget)
- **Total JS**: <500KB (budget)

## Real User Monitoring (RUM)

### Production Monitoring

**1. Vercel Analytics**

- Real-time Web Vitals from actual users
- Geographical performance breakdown
- Device-specific metrics
- Historical trend analysis

**2. Supabase Web Vitals Table**

```sql
-- Query recent Web Vitals
SELECT
  metric_name,
  AVG(metric_value) as avg_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75,
  COUNT(*) FILTER (WHERE rating = 'good') as good_count,
  COUNT(*) as total_count
FROM web_vitals
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY metric_name;
```

**3. Custom Dashboards**

- Access: `/api/analytics/web-vitals/dashboard`
- Metrics by page, device, geography
- Performance trends over time
- Alerting for regressions

### Setting Up Alerts

**Performance Regression Alert:**

```javascript
// Example alert logic
if (p75_LCP > 2500) {
  alert('LCP regression detected!')
}
if (p75_FID > 100) {
  alert('FID regression detected!')
}
if (p75_CLS > 0.1) {
  alert('CLS regression detected!')
}
```

## Debugging Performance Issues

### LCP Issues

**Symptoms:**

- Large Contentful Paint >2.5s
- Slow image loading
- Blocking resources

**Debug Steps:**

1. Check Network tab for slow resources
2. Verify image optimization (WebP/AVIF)
3. Check for render-blocking CSS/JS
4. Verify CDN configuration
5. Check server response times

**Common Fixes:**

- Add priority to above-the-fold images
- Implement code splitting
- Use Next.js Image component
- Preload critical resources
- Optimize fonts

### FID Issues

**Symptoms:**

- First Input Delay >100ms
- Unresponsive buttons
- Delayed interactions

**Debug Steps:**

1. Check Coverage tab for unused code
2. Analyze long tasks in Performance tab
3. Check for expensive React renders
4. Verify event handler efficiency
5. Check for blocking scripts

**Common Fixes:**

- Code splitting
- Memoization (React.memo, useMemo)
- Defer non-critical scripts
- Optimize event handlers
- Reduce bundle size

### CLS Issues

**Symptoms:**

- Content jumping/shifting
- Layout instability
- Cumulative Layout Shift >0.1

**Debug Steps:**

1. Record page load in Performance tab
2. Check Layout Shift events
3. Find elements without dimensions
4. Check for dynamic content insertion
5. Verify font loading strategy

**Common Fixes:**

- Add explicit dimensions to images
- Reserve space with skeleton loaders
- Use font-display: swap
- Avoid inserting content above existing
- Stabilize ad/banner positions

## Performance Testing Tools

### Browser Tools

- Chrome DevTools (Performance, Network, Lighthouse)
- Firefox DevTools
- Edge DevTools

### CLI Tools

- `lighthouse` - Official CLI
- `@lhci/cli` - Lighthouse CI
- `webpack-bundle-analyzer` - Bundle analysis

### Online Tools

- WebPageTest.org - Real device testing
- PageSpeed Insights - Google's tool
- GTmetrix - Comprehensive analysis

### Monitoring Services

- Vercel Analytics
- Sentry Performance Monitoring
- Google Analytics (Web Vitals)
- New Relic Browser Monitoring

## Troubleshooting Common Issues

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Lighthouse Errors

```bash
# Ensure server is running
npm run build
npm run start

# Then in another terminal
npm run test:performance
```

### Bundle Analyzer Not Opening

```bash
# Set ANALYZE env var
ANALYZE=true npm run build

# Manually open reports
open .next/analyze/client.html
open .next/analyze/server.html
```

## Performance Best Practices

### Images

- Always use Next.js Image component
- Specify width and height
- Use priority for above-the-fold
- Use lazy loading for below-the-fold
- Optimize image formats (WebP/AVIF)

### JavaScript

- Code split heavy components
- Lazy load modals and dialogs
- Use dynamic imports
- Memoize expensive computations
- Defer non-critical scripts

### CSS

- Remove unused styles
- Use CSS-in-JS efficiently
- Avoid inline styles where possible
- Optimize Tailwind configuration
- Enable CSS minification

### Fonts

- Use font-display: swap
- Preload critical fonts
- Subset fonts when possible
- Use system fonts as fallback
- Limit font variations

## Resources

### Documentation

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

### Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Bundle Phobia](https://bundlephobia.com/)

### Communities

- [Web Performance Slack](https://webperformance.slack.com/)
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- [r/webdev](https://reddit.com/r/webdev)
