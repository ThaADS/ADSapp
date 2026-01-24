# Internationalization (i18n) and SEO Strategy for ADSapp

**Research Date:** January 24, 2026
**Target:** Next.js 15 App Router SaaS Application
**Languages:** 11 (EN, NL, DE, FR, ES, PT-BR, PL, IT, TR, AR, HI)
**Landing Pages:** 150+ across niches, case studies, and features

---

## Executive Summary

This document provides a comprehensive strategy for implementing internationalization and SEO for ADSapp's multi-tenant WhatsApp Business Inbox SaaS platform. The recommended approach uses **next-intl** for i18n with **subfolder-based URL routing** (`/en/`, `/nl/`, `/de/`), static generation for landing pages, and CSS logical properties for RTL support.

---

## 1. i18n Library Recommendation

### Comparison Matrix

| Library | App Router Support | Server Components | TypeScript | Bundle Size | Recommendation |
|---------|-------------------|-------------------|------------|-------------|----------------|
| **next-intl** | Excellent | Native | Excellent | Small | **RECOMMENDED** |
| react-i18next | Good (with setup) | Requires config | Good | Medium | Alternative |
| Lingui | Good | Supported (v4.10+) | Good | Small | Alternative |
| next-i18n-router | Good | N/A (routing only) | Good | Minimal | Supplement |

### Recommended: next-intl

**Why next-intl is the best choice for ADSapp:**

1. **App Router Native**: Built specifically for Next.js App Router with seamless Server Component support
2. **Weekly Downloads**: 931,000+ weekly downloads, 3,700+ GitHub stars (as of 2025)
3. **TypeScript First**: Full type safety with autocompletion for message keys
4. **ICU Message Format**: Industry-standard syntax for plurals, gender, and rich text
5. **Performance**: Messages loaded per-request, no client bundle bloat for Server Components
6. **Active Maintenance**: Regularly updated by Jan Amann, adopted by nodejs.org

**Basic Setup:**

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'nl', 'de', 'fr', 'es', 'pt-BR', 'pl', 'it', 'tr', 'ar', 'hi'],
  defaultLocale: 'en',
  localePrefix: 'always' // Always show locale in URL for SEO
});
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(nl|de|fr|es|pt-BR|pl|it|tr|ar|hi)/:path*']
};
```

### Sources
- [next-intl Official Documentation](https://next-intl.dev/)
- [Best i18n Libraries for Next.js App Router 2025](https://medium.com/better-dev-nextjs-react/the-best-i18n-libraries-for-next-js-app-router-in-2025-21cb5ab2219a)
- [next-intl Guide 2025](https://www.greasyguide.com/development/next-intl-guide-nextjs-internationalization-2025/)

---

## 2. URL Structure for SEO

### Recommendation: Subfolder Structure

**Decision: Use subfolder structure (`adsapp.com/de/`) over subdomains (`de.adsapp.com`) or ccTLDs (`adsapp.de`)**

| Structure | SEO Authority | Setup Cost | Maintenance | Recommendation |
|-----------|---------------|------------|-------------|----------------|
| **Subfolders** (`/de/`) | Inherits main domain | Low | Easy | **RECOMMENDED** |
| Subdomains (`de.`) | Builds separately | Medium | Medium | Not recommended |
| ccTLDs (`.de`) | Strongest geo-signal | High | Complex | Not recommended |

**Reasons for Subfolders:**
1. **Domain Authority Consolidation**: All languages benefit from main domain's SEO authority
2. **Cost-Effective**: No additional domain purchases or DNS configuration
3. **Simpler Analytics**: Single property tracking across languages
4. **Easier Maintenance**: One deployment, unified codebase
5. **Google's Preference**: Google treats subfolders as part of the same site

### URL Structure Examples

```
adsapp.com/en/                    # English homepage
adsapp.com/nl/                    # Dutch homepage
adsapp.com/ar/                    # Arabic homepage (RTL)

# Industry Landing Pages
adsapp.com/en/industries/retail/
adsapp.com/de/industries/einzelhandel/
adsapp.com/es/industries/comercio-minorista/

# Case Studies
adsapp.com/en/case-studies/acme-corp-50-percent-response-increase/
adsapp.com/nl/case-studies/acme-corp-50-procent-respons-toename/

# Feature Pages
adsapp.com/en/features/ai-auto-reply/
adsapp.com/fr/fonctionnalites/reponse-automatique-ia/
```

### hreflang Implementation

```typescript
// src/app/[locale]/layout.tsx
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export async function generateMetadata({ params: { locale } }) {
  const host = 'https://adsapp.com';

  // Generate alternate URLs for all locales
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${host}/${loc}`;
  }
  languages['x-default'] = `${host}/en`; // Fallback to English

  return {
    alternates: {
      canonical: `${host}/${locale}`,
      languages
    }
  };
}
```

**Generated HTML:**
```html
<link rel="canonical" href="https://adsapp.com/en/" />
<link rel="alternate" hreflang="en" href="https://adsapp.com/en/" />
<link rel="alternate" hreflang="nl" href="https://adsapp.com/nl/" />
<link rel="alternate" hreflang="de" href="https://adsapp.com/de/" />
<link rel="alternate" hreflang="ar" href="https://adsapp.com/ar/" />
<link rel="alternate" hreflang="x-default" href="https://adsapp.com/en/" />
```

### Sitemap Generation

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const host = 'https://adsapp.com';

// Define all static pages
const staticPages = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
];

// Define industry pages (will be translated URLs)
const industryPages = [
  'retail', 'healthcare', 'automotive', 'real-estate', 'education',
  'hospitality', 'finance', 'e-commerce', 'restaurants', 'fitness'
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemap: MetadataRoute.Sitemap = [];

  // Static pages with all locale variants
  for (const page of staticPages) {
    for (const locale of routing.locales) {
      const url = `${host}/${locale}${page.path}`;

      // Generate hreflang alternates
      const languages: Record<string, string> = {};
      for (const altLocale of routing.locales) {
        languages[altLocale] = `${host}/${altLocale}${page.path}`;
      }
      languages['x-default'] = `${host}/en${page.path}`;

      sitemap.push({
        url,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency as 'daily' | 'weekly' | 'monthly',
        priority: page.priority,
        alternates: { languages }
      });
    }
  }

  // Industry landing pages
  for (const industry of industryPages) {
    for (const locale of routing.locales) {
      const localizedSlug = await getLocalizedIndustrySlug(industry, locale);
      const url = `${host}/${locale}/industries/${localizedSlug}`;

      const languages: Record<string, string> = {};
      for (const altLocale of routing.locales) {
        const altSlug = await getLocalizedIndustrySlug(industry, altLocale);
        languages[altLocale] = `${host}/${altLocale}/industries/${altSlug}`;
      }
      languages['x-default'] = `${host}/en/industries/${industry}`;

      sitemap.push({
        url,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: { languages }
      });
    }
  }

  return sitemap;
}
```

### Sources
- [Next.js Multilingual SEO Checklist 2024](https://staarter.dev/blog/nextjs-multilingual-seo-checklist-2024)
- [Canonical Tags and Hreflang in Next.js 15](https://www.buildwithmatija.com/blog/nextjs-advanced-seo-multilingual-canonical-tags)
- [Multilingual SEO Guide 2025](https://linkjuiceclub.com/blog/multilingual-seo-guide/)

---

## 3. SEO Landing Page Architecture

### Recommended Folder Structure

```
src/app/[locale]/
├── layout.tsx                           # Root locale layout (RTL handling here)
├── page.tsx                             # Homepage
├── (marketing)/                         # Route group - no URL impact
│   ├── layout.tsx                       # Marketing-specific layout
│   ├── pricing/
│   │   └── page.tsx
│   ├── features/
│   │   ├── page.tsx                     # Features overview
│   │   └── [feature]/                   # Dynamic feature pages
│   │       └── page.tsx                 # ai-auto-reply, team-inbox, etc.
│   ├── industries/
│   │   ├── page.tsx                     # Industries overview
│   │   └── [industry]/                  # Dynamic industry pages
│   │       └── page.tsx                 # retail, healthcare, automotive...
│   ├── use-cases/
│   │   └── [useCase]/
│   │       └── page.tsx                 # customer-support, sales, marketing...
│   └── case-studies/
│       ├── page.tsx                     # Case studies overview
│       └── [slug]/
│           └── page.tsx                 # Individual case studies
├── (legal)/
│   ├── privacy/
│   ├── terms/
│   └── gdpr/
└── (app)/                               # Authenticated app routes
    └── dashboard/
        └── ...
```

### Page Generation Strategy

| Page Type | Count | Generation | Revalidation |
|-----------|-------|------------|--------------|
| Homepage | 11 | Static (SSG) | 24 hours |
| Features | ~55 (5 per lang) | Static (SSG) | 24 hours |
| Industries | ~110 (10 per lang) | Static (SSG) | Weekly |
| Use Cases | ~55 (5 per lang) | Static (SSG) | Weekly |
| Case Studies | ~110 (10 per lang) | ISR | 1 hour |
| Blog/Resources | Dynamic | ISR | 1 hour |

**Total: ~340+ statically generated pages**

### Implementation Examples

**Industry Landing Page:**

```typescript
// src/app/[locale]/(marketing)/industries/[industry]/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// Define all industries
const industries = [
  'retail', 'healthcare', 'automotive', 'real-estate', 'education',
  'hospitality', 'finance', 'e-commerce', 'restaurants', 'fitness'
];

// Generate static params for all locale + industry combinations
export async function generateStaticParams() {
  const params = [];
  for (const locale of routing.locales) {
    for (const industry of industries) {
      params.push({ locale, industry });
    }
  }
  return params; // 11 locales x 10 industries = 110 pages
}

export async function generateMetadata({ params: { locale, industry } }) {
  const t = await getTranslations({ locale, namespace: 'Industries' });

  return {
    title: t(`${industry}.metaTitle`),
    description: t(`${industry}.metaDescription`),
    openGraph: {
      title: t(`${industry}.ogTitle`),
      description: t(`${industry}.ogDescription`),
      images: [`/images/industries/${industry}-og.jpg`]
    }
  };
}

export default async function IndustryPage({ params: { locale, industry } }) {
  setRequestLocale(locale);
  const t = await getTranslations('Industries');

  return (
    <div>
      <HeroSection
        title={t(`${industry}.heroTitle`)}
        subtitle={t(`${industry}.heroSubtitle`)}
        cta={t('common.startFreeTrial')}
      />
      <PainPointsSection painPoints={t.raw(`${industry}.painPoints`)} />
      <SolutionSection features={t.raw(`${industry}.features`)} />
      <ROICalculator industry={industry} />
      <TestimonialsSection testimonials={t.raw(`${industry}.testimonials`)} />
      <CTASection />
    </div>
  );
}
```

**Case Study Page:**

```typescript
// src/app/[locale]/(marketing)/case-studies/[slug]/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface CaseStudy {
  slug: string;
  company: string;
  industry: string;
  metrics: {
    responseTimeReduction: string;
    conversionIncrease: string;
    costSavings: string;
  };
}

export async function generateStaticParams() {
  // Fetch case studies from CMS or database
  const caseStudies = await getCaseStudies();
  const params = [];

  for (const locale of routing.locales) {
    for (const study of caseStudies) {
      params.push({
        locale,
        slug: getLocalizedSlug(study.slug, locale)
      });
    }
  }
  return params;
}

export default async function CaseStudyPage({ params: { locale, slug } }) {
  setRequestLocale(locale);
  const t = await getTranslations('CaseStudies');
  const caseStudy = await getCaseStudyBySlug(slug, locale);

  return (
    <article itemScope itemType="https://schema.org/Article">
      <header>
        <h1 itemProp="headline">{caseStudy.title}</h1>
        <div className="flex gap-4">
          <Badge>{t(`industries.${caseStudy.industry}`)}</Badge>
          <Badge>{caseStudy.company}</Badge>
        </div>
      </header>

      {/* ROI Metrics - Critical for conversions */}
      <MetricsGrid>
        <MetricCard
          value={caseStudy.metrics.responseTimeReduction}
          label={t('metrics.responseTime')}
          icon="clock"
        />
        <MetricCard
          value={caseStudy.metrics.conversionIncrease}
          label={t('metrics.conversions')}
          icon="trending-up"
        />
        <MetricCard
          value={caseStudy.metrics.costSavings}
          label={t('metrics.costSavings')}
          icon="dollar"
        />
      </MetricsGrid>

      <section itemProp="articleBody">
        <h2>{t('sections.challenge')}</h2>
        <p>{caseStudy.challenge}</p>

        <h2>{t('sections.solution')}</h2>
        <p>{caseStudy.solution}</p>

        <h2>{t('sections.results')}</h2>
        <p>{caseStudy.results}</p>
      </section>

      {/* Structured Data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": caseStudy.title,
          "author": { "@type": "Organization", "name": "ADSapp" },
          "publisher": { "@type": "Organization", "name": "ADSapp" }
        })}
      </script>
    </article>
  );
}
```

### Sources
- [Next.js Project Structure Best Practices](https://nextjs.org/docs/app/getting-started/project-structure)
- [Inside the App Router: Best Practices 2025](https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3)
- [Static Site Generation with Next.js](https://nextjs.org/docs/pages/building-your-application/rendering/static-site-generation)

---

## 4. Content Strategy

### Landing Page Distribution (Per Language)

| Page Type | Count | Purpose |
|-----------|-------|---------|
| Industry Pages | 10-15 | Target specific verticals |
| Use Case Pages | 5-8 | Target job functions |
| Feature Pages | 8-12 | Deep-dive on capabilities |
| Case Studies | 10-20 | Social proof with metrics |
| Comparison Pages | 5-10 | vs. competitors |
| Integration Pages | 10-15 | Partner ecosystems |

**Total per language: ~50-80 pages**
**Total across 11 languages: ~550-880 pages**

### Industry Pages Template

```markdown
# [Industry] WhatsApp Business Solutions

## Hero Section
- Industry-specific headline
- Pain point callout
- Primary CTA: "Start Free Trial"
- Trust badges (industry certifications)

## Pain Points Section (3-4)
- Industry-specific challenges
- Statistics and data points
- Emotional connection

## Solution Section
- How ADSapp solves each pain point
- Industry-specific features highlighted
- Screenshots/demos

## ROI Calculator
- Interactive calculator
- Industry-specific metrics
- Personalized results

## Case Study Snippet
- Brief success story from the industry
- Key metrics (3 numbers)
- Link to full case study

## Features Grid
- 6-8 relevant features
- Industry-specific use cases

## Testimonials
- 2-3 quotes from industry customers
- Company logos
- Role/title of speaker

## FAQ Section (5-7 questions)
- Industry-specific questions
- Structured data for rich snippets

## Final CTA
- Free trial or demo request
- No credit card messaging
```

### Case Study Template

```markdown
# [Company Name]: [Headline with Key Metric]

## Quick Stats
- Industry: [Industry]
- Company Size: [Employees]
- Location: [Country]
- Results Timeline: [X months]

## Key Metrics (Visual Cards)
1. [X]% increase in response rate
2. [Y] hours saved per week
3. $[Z] cost reduction

## The Challenge
- Specific pain points
- Previous solution limitations
- Business impact

## The Solution
- Why they chose ADSapp
- Implementation timeline
- Key features used

## The Results
- Quantified improvements
- Before/after comparison
- Unexpected benefits

## Customer Quote
> "Quote from decision maker"
> - Name, Title, Company

## Implementation Details
- Timeline
- Integration points
- Team adoption

## What's Next
- Future plans
- Expansion goals

## CTA
- "Get Similar Results"
- Link to demo/trial
```

### Feature Page Template

```markdown
# [Feature Name]: [Benefit-Focused Headline]

## Hero Section
- Feature name + primary benefit
- Short video/GIF demo
- CTA: "Try It Free"

## The Problem
- What challenge this solves
- Who experiences this
- Cost of not solving

## How It Works
- Step-by-step explanation
- Visual walkthrough
- Technical details (collapsible)

## Key Benefits (4-6)
- Benefit 1 with proof point
- Benefit 2 with proof point
- ...

## Use Cases
- Use case 1: [Industry/Role]
- Use case 2: [Industry/Role]
- Use case 3: [Industry/Role]

## Integration
- Works with: [Platform icons]
- Setup time
- No code required

## Comparison
- Before ADSapp / After ADSapp
- vs. Manual process
- vs. Competitor approach

## Customer Story
- Brief testimonial
- Specific to this feature

## Pricing
- Which plans include this
- Link to pricing page

## FAQ
- Feature-specific questions

## Related Features
- 3-4 complementary features
```

---

## 5. RTL Support (Arabic)

**Note:** Hindi is an LTR (left-to-right) language and does not require RTL support. Only Arabic requires RTL handling.

### Direction Detection Utility

```typescript
// src/lib/i18n/direction.ts
export type Direction = 'ltr' | 'rtl';

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'] as const;

export function getDirection(locale: string): Direction {
  return RTL_LOCALES.includes(locale as typeof RTL_LOCALES[number])
    ? 'rtl'
    : 'ltr';
}
```

### Root Layout with Direction

```typescript
// src/app/[locale]/layout.tsx
import { getDirection } from '@/lib/i18n/direction';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const messages = await getMessages();
  const direction = getDirection(locale);

  return (
    <html lang={locale} dir={direction}>
      <body className={direction === 'rtl' ? 'font-arabic' : ''}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Tailwind CSS RTL Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [
    // Enable RTL plugin if needed
    require('tailwindcss-rtl'),
  ],
};
```

### CSS Logical Properties (Recommended)

**Replace directional properties with logical equivalents:**

| Physical (Avoid) | Logical (Use) | Description |
|------------------|---------------|-------------|
| `ml-4` | `ms-4` | margin-inline-start |
| `mr-4` | `me-4` | margin-inline-end |
| `pl-4` | `ps-4` | padding-inline-start |
| `pr-4` | `pe-4` | padding-inline-end |
| `left-0` | `start-0` | inset-inline-start |
| `right-0` | `end-0` | inset-inline-end |
| `text-left` | `text-start` | text-align: start |
| `text-right` | `text-end` | text-align: end |
| `float-left` | `float-start` | float: inline-start |
| `float-right` | `float-end` | float: inline-end |
| `border-l-4` | `border-s-4` | border-inline-start |
| `border-r-4` | `border-e-4` | border-inline-end |
| `rounded-l-lg` | `rounded-s-lg` | border-start-radius |
| `rounded-r-lg` | `rounded-e-lg` | border-end-radius |

### RTL-Aware Component Example

```tsx
// src/components/ui/Card.tsx
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      // Use logical properties - automatically flips for RTL
      "rounded-lg border bg-card p-6",
      "ms-4 me-4",        // margin-start/end instead of left/right
      "ps-6 pe-6",        // padding-start/end
      className
    )}>
      {children}
    </div>
  );
}
```

### RTL-Specific Overrides (When Needed)

```tsx
// For cases where logical properties aren't enough
<div className="flex gap-4 rtl:flex-row-reverse">
  <Icon className="rtl:rotate-180" /> {/* Flip directional icons */}
  <span>Next</span>
</div>
```

### Icons and Directional Elements

```tsx
// src/components/ui/DirectionalIcon.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DirectionalIconProps {
  direction: 'forward' | 'backward';
  className?: string;
}

export function DirectionalIcon({ direction, className }: DirectionalIconProps) {
  // Icons automatically flip based on CSS logical properties
  // or use rtl: variant for explicit control
  return (
    <span className="inline-flex rtl:rotate-180">
      {direction === 'forward' ? (
        <ChevronRight className={className} />
      ) : (
        <ChevronLeft className={className} />
      )}
    </span>
  );
}
```

### Sources
- [Tailwind CSS RTL Support (Flowbite)](https://flowbite.com/docs/customize/rtl/)
- [Next.js i18n and RTL Layouts](https://medium.com/wtxhq/next-js-i18n-support-and-rtl-layouts-87144ad727c9)
- [Supporting RTL Languages in Next.js](https://lingo.dev/en/nextjs-i18n/right-to-left-languages)

---

## 6. Performance Optimization

### Bundle Size Management

**Challenge:** 11 languages can bloat the bundle significantly if not managed properly.

**Solutions:**

1. **Server Components First**: Use Server Components for translation rendering when possible
2. **Namespace Splitting**: Load only required translations per page
3. **Dynamic Imports**: Lazy load client-side translations

### Message Organization Strategy

```
messages/
├── en/
│   ├── common.json          # Shared across all pages (navigation, footer)
│   ├── home.json            # Homepage specific
│   ├── industries/
│   │   ├── retail.json
│   │   ├── healthcare.json
│   │   └── ...
│   ├── features/
│   │   ├── ai-auto-reply.json
│   │   └── ...
│   └── case-studies/
│       └── index.json
├── nl/
│   └── ... (same structure)
└── ar/
    └── ... (same structure)
```

### Dynamic Message Loading

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  // Load common messages + page-specific messages
  const [common, pageMessages] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    getPageMessages(locale, pathname) // Dynamic based on route
  ]);

  return {
    locale,
    messages: {
      ...common.default,
      ...pageMessages
    }
  };
});
```

### Client Component Optimization

```typescript
// For interactive components that need translations
'use client';

import { useTranslations } from 'next-intl';

// Only pass needed messages to client
export function ContactForm() {
  const t = useTranslations('ContactForm');
  // Only ContactForm namespace is sent to client
  return <form>...</form>;
}
```

### Estimated Bundle Impact

| Approach | Bundle Size Impact | Recommendation |
|----------|-------------------|----------------|
| All messages in bundle | +500KB-1MB | Avoid |
| Per-page loading | +10-30KB/page | Recommended |
| Server Components only | Minimal | Best |
| Lazy loading | Async load | Good for heavy pages |

### Image Localization Strategy

```typescript
// src/components/LocalizedImage.tsx
import Image from 'next/image';
import { useLocale } from 'next-intl';

interface LocalizedImageProps {
  src: string;
  alt: string; // Should come from translations
  localizedSrc?: boolean; // Whether to look for locale-specific image
  width: number;
  height: number;
}

export function LocalizedImage({
  src,
  alt,
  localizedSrc = false,
  width,
  height
}: LocalizedImageProps) {
  const locale = useLocale();

  // Check for locale-specific image first
  const imageSrc = localizedSrc
    ? `/images/${locale}/${src}`
    : `/images/${src}`;

  return (
    <Image
      src={imageSrc}
      alt={alt} // Always use translated alt from t()
      width={width}
      height={height}
      loading="lazy"
    />
  );
}

// Usage
const t = useTranslations('Hero');
<LocalizedImage
  src="hero-banner.jpg"
  alt={t('heroImageAlt')}
  localizedSrc={true}
  width={1200}
  height={600}
/>
```

### Caching Strategy

```typescript
// next.config.ts
const nextConfig = {
  // Static page revalidation
  experimental: {
    staleTimes: {
      dynamic: 30, // 30 seconds for dynamic pages
      static: 180, // 3 minutes for static pages
    },
  },

  // Image optimization
  images: {
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    formats: ['image/webp', 'image/avif'],
  },
};
```

### Sources
- [Architecture for Next.js App Router i18n at Scale](https://geekyants.com/en-us/blog/architecture-for-nextjs-app-router-i18n-at-scale-fixing-100-locale-ssr-bottlenecks)
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/app/guides/lazy-loading)
- [Optimizing Next.js Performance](https://namastedev.com/blog/optimizing-next-js-build-performance-lazy-loading-and-bundle-size-reduction/)

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Install and configure next-intl
- [ ] Set up folder structure with `[locale]` segment
- [ ] Create middleware for locale detection
- [ ] Set up base message files for EN and one test locale (NL)
- [ ] Implement RTL support for AR locale layout
- [ ] Create `getDirection()` utility
- [ ] Update Tailwind config for logical properties

### Phase 2: Core Pages (Week 3-4)
- [ ] Migrate homepage to i18n
- [ ] Migrate pricing page
- [ ] Migrate features overview
- [ ] Implement hreflang metadata
- [ ] Create sitemap generator
- [ ] Set up translation management workflow

### Phase 3: Landing Pages (Week 5-8)
- [ ] Create industry page template
- [ ] Create feature page template
- [ ] Create case study template
- [ ] Generate 10 industry pages (EN first)
- [ ] Generate 5 feature deep-dives
- [ ] Create 5 case studies with metrics

### Phase 4: Translation (Week 9-12)
- [ ] Complete NL translations
- [ ] Complete DE translations
- [ ] Complete FR, ES, PT-BR translations
- [ ] Complete PL, IT, TR translations
- [ ] Complete AR translations (with RTL review)
- [ ] Complete HI translations
- [ ] QA all locales

### Phase 5: Optimization (Week 13-14)
- [ ] Bundle size audit with @next/bundle-analyzer
- [ ] Implement namespace splitting
- [ ] Performance testing across locales
- [ ] SEO audit (hreflang, sitemap, meta)
- [ ] Core Web Vitals optimization

---

## 8. Tools and Services

### Translation Management
- **Crowdin**: Git integration, in-context editing
- **Lokalise**: Screenshot context, collaboration
- **POEditor**: Simple, cost-effective
- **Tolgee**: Open-source, in-app editing

### SEO Monitoring
- **Google Search Console**: hreflang validation, indexing
- **Ahrefs/Semrush**: International ranking tracking
- **Screaming Frog**: Technical SEO audit

### Testing
- **Playwright**: E2E testing across locales
- **BrowserStack**: Cross-browser RTL testing
- **Lighthouse**: Performance per locale

---

## 9. Key Recommendations Summary

| Area | Recommendation | Priority |
|------|----------------|----------|
| i18n Library | next-intl | Critical |
| URL Structure | Subfolders (`/en/`, `/nl/`) | Critical |
| hreflang | Include on all pages + x-default | Critical |
| Page Generation | Static (SSG) for landing pages | High |
| RTL Support | CSS logical properties + dir attribute | High |
| Message Splitting | Namespace per feature area | High |
| Sitemap | One sitemap with all locales + alternates | High |
| Bundle Size | Server Components + lazy loading | Medium |
| Translation Tool | Crowdin or Lokalise | Medium |

---

## 10. References

### Official Documentation
- [Next.js Internationalization Guide](https://nextjs.org/docs/app/guides/internationalization)
- [next-intl Documentation](https://next-intl.dev/)
- [Tailwind CSS RTL Support](https://flowbite.com/docs/customize/rtl/)

### Tutorials and Guides
- [next-intl Guide: Add i18n to Next.js 15](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025)
- [Best i18n Libraries for Next.js App Router 2025](https://medium.com/better-dev-nextjs-react/the-best-i18n-libraries-for-next-js-app-router-in-2025-21cb5ab2219a)
- [Complete Guide to Internationalization in Next.js](https://blog.logrocket.com/complete-guide-internationalization-nextjs/)

### SEO Resources
- [Next.js Multilingual SEO Checklist](https://staarter.dev/blog/nextjs-multilingual-seo-checklist-2024)
- [Canonical Tags and Hreflang in Next.js 15](https://www.buildwithmatija.com/blog/nextjs-advanced-seo-multilingual-canonical-tags)
- [Multilingual SEO Guide 2025](https://linkjuiceclub.com/blog/multilingual-seo-guide/)

### Performance
- [Architecture for Next.js App Router i18n at Scale](https://geekyants.com/en-us/blog/architecture-for-nextjs-app-router-i18n-at-scale-fixing-100-locale-ssr-bottlenecks)
- [Implementing Multilingual Sitemap with next-intl](https://dev.to/oikon/implementing-multilingual-sitemap-with-next-intl-in-nextjs-app-router-1354)

---

*Document created: January 24, 2026*
*Last updated: January 24, 2026*
