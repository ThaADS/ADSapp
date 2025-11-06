# CI/CD Pipeline Guide - ADSapp

Complete guide for understanding and working with the ADSapp CI/CD infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Local Testing Environment](#local-testing-environment)
5. [Deployment Process](#deployment-process)
6. [Quality Gates](#quality-gates)
7. [Troubleshooting](#troubleshooting)

## Overview

ADSapp uses a comprehensive CI/CD pipeline that ensures code quality, security, and reliability through automated testing and deployment processes.

### Key Features

- ✅ Automated testing (unit, integration, E2E)
- 🔒 Security scanning and vulnerability detection
- 📊 Code coverage reporting (80%+ target)
- 🚀 Automated deployment to staging and production
- 🔄 Rollback capabilities
- 📈 Performance monitoring with Lighthouse CI

## Pipeline Architecture

```
┌─────────────────┐
│   Code Push     │
│   Pull Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         GitHub Actions Trigger          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         CI Pipeline (.github/           │
│         workflows/ci.yml)               │
├─────────────────────────────────────────┤
│  1. Code Quality Checks                 │
│     - TypeScript type checking          │
│     - ESLint code quality               │
│     - Prettier format check             │
│                                         │
│  2. Unit Tests                          │
│     - Jest with coverage                │
│     - 89 unit tests                     │
│                                         │
│  3. Integration Tests                   │
│     - API endpoint testing              │
│     - Database integration              │
│     - 53 integration tests              │
│                                         │
│  4. E2E Tests                           │
│     - Playwright browser automation     │
│     - User journey validation           │
│                                         │
│  5. Build Verification                  │
│     - Production build                  │
│     - Bundle size analysis              │
│                                         │
│  6. Security Scan                       │
│     - NPM audit                         │
│     - Dependency vulnerabilities        │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     Security Pipeline (.github/         │
│     workflows/security.yml)             │
├─────────────────────────────────────────┤
│  - NPM vulnerability audit              │
│  - TypeScript strict mode validation    │
│  - License compliance checking          │
│  - OWASP dependency check               │
│  - Secret scanning (GitLeaks)           │
│  - Code security analysis (Semgrep)     │
│  - Container security (Trivy)           │
│  - SQL injection detection              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      Deployment Pipeline (.github/      │
│      workflows/deploy.yml)              │
├─────────────────────────────────────────┤
│  1. Pre-deployment Validation           │
│  2. Database Migrations                 │
│  3. Deploy to Vercel                    │
│  4. Health Checks                       │
│  5. Smoke Tests                         │
│  6. E2E Verification (staging)          │
│  7. Rollback (if needed)                │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Production    │
│   Environment   │
└─────────────────┘
```

## GitHub Actions Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers:**

- Push to `main`, `develop` branches
- Pull requests to `main`, `develop`

**Jobs:**

#### Code Quality (3-5 minutes)

```yaml
- TypeScript type checking
- ESLint linting
- Prettier format check
- Console.log detection
```

#### Unit Tests (5-10 minutes)

```yaml
- Run 89 unit tests
- Generate coverage report
- Upload to Codecov
- Minimum coverage: 80%
```

#### Integration Tests (10-15 minutes)

```yaml
- Start PostgreSQL service
- Run 53 integration tests
- Test API endpoints
- Test database operations
```

#### E2E Tests (15-20 minutes)

```yaml
- Install Playwright
- Build application
- Run browser automation tests
- Generate test reports
```

#### Build Verification (5-10 minutes)

```yaml
- Production build
- Bundle analysis
- Size validation
```

**Total Duration:** 40-60 minutes

### 2. Security Pipeline (`security.yml`)

**Triggers:**

- Daily at 2 AM UTC (scheduled)
- Push to main/develop
- Changes to package files
- Manual workflow dispatch

**Jobs:**

```yaml
1. NPM Audit - Vulnerability scanning
2. TypeScript Strict - Type safety validation
3. License Check - License compliance
4. OWASP Dependency Check - Security vulnerabilities
5. Secret Scan - Hardcoded credentials detection
6. Semgrep - Security pattern analysis
7. Trivy - Container security scanning
8. SQL Injection Check - Query safety validation
```

**Total Duration:** 15-25 minutes

### 3. Deployment Pipeline (`deploy.yml`)

**Triggers:**

- Manual workflow dispatch
- Push to `main` (production)
- Push to `develop` (staging)

**Deployment Flow:**

```yaml
Staging (develop branch):
1. Pre-deployment validation (2 min)
2. Run tests (optional, 10 min)
3. Database migrations (2 min)
4. Build application (5 min)
5. Deploy to Vercel staging (3 min)
6. Health checks (2 min)
7. E2E verification (15 min)
8. Notification (1 min)

Total: ~40 minutes

Production (main branch):
1. Pre-deployment validation (2 min)
2. Run full test suite (20 min)
3. Database migrations (3 min)
4. Build application (5 min)
5. Deploy to Vercel production (3 min)
6. Health checks (3 min)
7. Smoke tests (2 min)
8. Notification (1 min)
9. Auto-rollback on failure

Total: ~40 minutes
```

## Local Testing Environment

### Using Docker Compose

```bash
# Start local test environment
docker-compose -f docker-compose.test.yml up -d

# Check services status
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs -f

# Stop environment
docker-compose -f docker-compose.test.yml down

# Clean up (including volumes)
docker-compose -f docker-compose.test.yml down -v
```

### Test Environment Services

| Service          | Port  | Purpose        |
| ---------------- | ----- | -------------- |
| PostgreSQL       | 54322 | Test database  |
| Redis            | 6380  | Cache/sessions |
| Supabase Auth    | 54321 | Authentication |
| Supabase Storage | 54323 | File storage   |
| PostgREST API    | 54324 | REST API       |
| Realtime         | 54325 | WebSocket      |
| Inbucket Mail    | 54326 | Email testing  |

### Running Tests Locally

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI mode (no watch)
npm run test:ci
```

## Deployment Process

### Manual Deployment

#### Staging Deployment

```bash
# Using deployment script
./scripts/deploy-staging.sh

# Or using GitHub CLI
gh workflow run deploy.yml \
  -f environment=staging \
  -f skip_tests=false
```

#### Production Deployment

```bash
# Using deployment script
./scripts/deploy-production.sh

# Or using GitHub CLI
gh workflow run deploy.yml \
  -f environment=production \
  -f skip_tests=false
```

### Automated Deployment

**Staging:**

- Automatically deploys on push to `develop` branch
- Runs E2E tests on deployed environment
- No manual approval required

**Production:**

- Automatically deploys on push to `main` branch
- Requires all CI checks to pass
- Manual approval can be configured
- Auto-rollback on health check failure

### Deployment Checklist

Before deploying to production:

- [ ] All CI checks passed
- [ ] Security scan completed
- [ ] Test coverage ≥ 80%
- [ ] Database migrations reviewed
- [ ] Environment variables updated
- [ ] Rollback plan ready
- [ ] Stakeholders notified

## Quality Gates

### Code Quality Gates

**TypeScript:**

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

**ESLint:**

- No errors allowed
- Warnings reviewed
- Security rules enforced
- Best practices validated

**Prettier:**

- Consistent formatting
- Auto-format on save
- Pre-commit hook validation

### Test Coverage Gates

```yaml
Global Requirements:
  branches: 80%
  functions: 80%
  lines: 80%
  statements: 80%

Component-Specific:
  Library Code (src/lib/): 85%
  API Routes (src/app/api/): 75%
  Components (src/components/): 80%
```

### Security Gates

**Critical Issues:**

- Block merge if critical vulnerabilities found
- Require security review for high-risk changes
- Mandatory dependency updates for CVEs

**License Compliance:**

- Forbidden: GPL, AGPL licenses
- Allowed: MIT, Apache 2.0, ISC, BSD

### Performance Gates

**Lighthouse Scores:**

```yaml
Desktop:
  Performance: ≥ 80
  Accessibility: ≥ 90
  Best Practices: ≥ 90
  SEO: ≥ 90

Mobile:
  Performance: ≥ 70
  Accessibility: ≥ 90
  Best Practices: ≥ 90
```

**Core Web Vitals:**

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

## Troubleshooting

### Common Issues

#### CI Pipeline Failures

**TypeScript Errors:**

```bash
# Run locally
npm run type-check

# Fix auto-fixable issues
npm run lint:fix
```

**Test Failures:**

```bash
# Run specific test
npm test -- path/to/test.test.ts

# Run with verbose output
npm test -- --verbose

# Clear cache
npm test -- --clearCache
```

**Build Failures:**

```bash
# Clean build
rm -rf .next
npm run build

# Check bundle size
npm run analyze
```

#### Deployment Issues

**Health Check Failures:**

```bash
# Check application logs
vercel logs <deployment-url>

# Check database connectivity
vercel env ls
```

**Rollback Procedure:**

```bash
# List recent deployments
vercel ls

# Promote previous deployment
vercel alias set <previous-deployment-url> production
```

### Debug Mode

Enable debug logging in CI:

```yaml
env:
  DEBUG: '*'
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Getting Help

1. **Check Logs:** Review GitHub Actions logs
2. **Search Issues:** Check repository issues
3. **Team Chat:** Contact DevOps team
4. **Documentation:** Review this guide and related docs

## Best Practices

### Commit Messages

```
feat: add user authentication
fix: resolve memory leak in message handler
test: add integration tests for billing
docs: update API documentation
chore: upgrade dependencies
```

### Branch Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/user-auth
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Push and create PR to `develop`
4. Wait for CI checks to pass
5. Request code review
6. Merge after approval
7. Delete feature branch

### Hotfix Process

1. Create hotfix branch from `main`
2. Implement fix with tests
3. Create PR to `main`
4. Fast-track review
5. Deploy to production
6. Merge back to `develop`

## Monitoring and Alerts

### Health Monitoring

- Automatic health checks every 5 minutes
- Alerts on failure
- Response time tracking
- Error rate monitoring

### Notification Channels

- Slack: #deployments channel
- Email: DevOps team list
- GitHub: Issue creation on failure

## Security

### Secrets Management

```bash
# GitHub Secrets (required)
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SLACK_WEBHOOK
CODECOV_TOKEN
```

### Access Control

- CI/CD: GitHub Actions service account
- Deployments: Limited team members
- Production: Senior developers only
- Secrets: Admin access required

## Maintenance

### Regular Tasks

**Daily:**

- Review security scan results
- Monitor build performance
- Check coverage trends

**Weekly:**

- Update dependencies
- Review failed builds
- Optimize CI performance

**Monthly:**

- Audit access permissions
- Review and update documentation
- Performance optimization review

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Maintainers:** DevOps Team
