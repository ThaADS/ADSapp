# Redis Cache Deployment Checklist

**Pre-Deployment Checklist for Production**

## Phase 1: Setup & Configuration (15 minutes)

### 1.1 Upstash Redis Setup
- [ ] Create Upstash Redis account at [console.upstash.com/redis](https://console.upstash.com/redis)
- [ ] Create new Redis database (select region closest to deployment)
- [ ] Copy `UPSTASH_REDIS_REST_URL`
- [ ] Copy `UPSTASH_REDIS_REST_TOKEN`
- [ ] Test connection:
  ```bash
  curl https://your-redis-url.upstash.io/ping
  # Expected: {"result":"PONG"}
  ```

### 1.2 Environment Configuration
- [ ] Add to `.env.production`:
  ```bash
  UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
  UPSTASH_REDIS_REST_TOKEN=AYxxx...
  CACHE_ENABLED=true
  CACHE_L1_ENABLED=true
  CACHE_L2_ENABLED=true
  ```
- [ ] Verify environment variables load in production
- [ ] Configure cache TTLs for production workload

### 1.3 Database Migration
- [ ] Backup production database
- [ ] Review migration SQL: `supabase/migrations/20251016_cache_infrastructure.sql`
- [ ] Apply migration:
  ```bash
  npm run migration:apply
  # OR manually via Supabase dashboard
  ```
- [ ] Verify tables created:
  - [ ] `cache_metadata`
  - [ ] `cache_invalidation_logs`
  - [ ] `cache_stats_daily`
- [ ] Verify RLS policies active
- [ ] Test database functions:
  ```sql
  SELECT * FROM get_cache_health_report('test-tenant-id');
  ```

---

## Phase 2: Testing & Verification (30 minutes)

### 2.1 Local Testing
- [ ] Run unit tests:
  ```bash
  npm run test:cache
  ```
- [ ] Verify cache hit/miss logging in console
- [ ] Test cache invalidation:
  ```typescript
  await invalidateCache('test-tenant', 'conversations');
  ```
- [ ] Test rate limiting:
  ```bash
  # Send 100+ requests to test endpoint
  # Verify 429 responses after limit
  ```

### 2.2 Staging Environment
- [ ] Deploy to staging
- [ ] Monitor cache hit rate (target: >70%)
- [ ] Monitor API response times (target: <50ms P95)
- [ ] Test cache invalidation on mutations
- [ ] Verify tenant isolation
- [ ] Load test:
  ```bash
  npm run test:performance
  ```
- [ ] Check for memory leaks (L1 cache)
- [ ] Verify graceful degradation (disable Redis temporarily)

### 2.3 Performance Validation
- [ ] Baseline metrics (cache disabled):
  ```bash
  CACHE_ENABLED=false npm run test:performance
  ```
- [ ] Cache-enabled metrics:
  ```bash
  CACHE_ENABLED=true npm run test:performance
  ```
- [ ] Compare results:
  - [ ] Response time improvement: >80%
  - [ ] Database query reduction: >70%
  - [ ] No errors or timeouts

---

## Phase 3: Production Deployment (45 minutes)

### 3.1 Pre-Deployment
- [ ] Review deployment plan with team
- [ ] Schedule deployment window (low traffic period)
- [ ] Notify stakeholders
- [ ] Prepare rollback plan
- [ ] Set up monitoring alerts

### 3.2 Deployment Steps
- [ ] Deploy code to production
- [ ] Verify environment variables loaded
- [ ] Apply database migration
- [ ] Verify cache connection:
  ```typescript
  const health = await checkCacheHealth();
  console.log('Cache status:', health.status);
  ```
- [ ] Enable cache gradually:
  ```bash
  # Start with L1 only
  CACHE_L1_ENABLED=true
  CACHE_L2_ENABLED=false

  # Then enable L2
  CACHE_L2_ENABLED=true
  ```

### 3.3 Post-Deployment Monitoring (First 2 Hours)
- [ ] Monitor error rates (target: <0.1% increase)
- [ ] Monitor response times (target: 80% improvement)
- [ ] Monitor cache hit rate (target: >70%)
- [ ] Check Redis usage (operations, memory)
- [ ] Verify cache invalidation working
- [ ] Check for any anomalies
- [ ] Review cache health dashboard

---

## Phase 4: Optimization (Week 1-2)

### 4.1 Cache Hit Rate Optimization
- [ ] Monitor hit rates by endpoint
- [ ] Identify low hit rate endpoints (<60%)
- [ ] Adjust TTLs based on data volatility:
  ```bash
  # Static data
  CACHE_L2_TTL_SECONDS=3600  # 1 hour

  # Dynamic data
  CACHE_L2_TTL_SECONDS=300   # 5 minutes
  ```
- [ ] Implement cache warming for hot data
- [ ] Target: >85% overall hit rate

### 4.2 Cost Optimization
- [ ] Monitor Upstash usage dashboard
- [ ] Review Redis operations per endpoint
- [ ] Optimize cache key sizes
- [ ] Adjust L1 cache size if needed
- [ ] Calculate cost savings vs baseline

### 4.3 Rate Limiting Tuning
- [ ] Monitor rate limit hit rates
- [ ] Adjust limits based on legitimate usage:
  ```bash
  RATE_LIMIT_MAX_REQUESTS=150  # Increase if too strict
  ```
- [ ] Implement tiered limits by subscription plan
- [ ] Set up alerts for unusual patterns

---

## Phase 5: Monitoring Setup (Ongoing)

### 5.1 Health Check Endpoint
- [ ] Deploy health check endpoint:
  ```typescript
  // /api/admin/cache/health
  GET → { status, score, metrics, issues }
  ```
- [ ] Add to monitoring service (Sentry, DataDog, etc.)
- [ ] Configure alerts:
  - ⚠️ Warning: score < 80
  - 🚨 Critical: score < 60

### 5.2 Performance Metrics
- [ ] Track in analytics:
  - Cache hit rate (daily)
  - Average latency (hourly)
  - Error rate (real-time)
  - Cost (monthly)
- [ ] Create dashboard with:
  - Real-time hit rate
  - Latency percentiles (P50, P95, P99)
  - Cache size and operations
  - Cost tracking

### 5.3 Database Analytics
- [ ] Set up cron job for daily aggregation:
  ```sql
  -- Run daily at 00:00
  SELECT aggregate_cache_stats_daily();
  ```
- [ ] Create performance report queries:
  ```sql
  -- Weekly cache report
  SELECT * FROM cache_stats_daily
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY date DESC;
  ```

---

## Phase 6: Team Training (1-2 hours)

### 6.1 Developer Training
- [ ] Share documentation:
  - [ ] [Quick Start Guide](./CACHE_QUICK_START.md)
  - [ ] [Implementation Guide](./REDIS_CACHE_IMPLEMENTATION.md)
  - [ ] [Technical Summary](./REDIS_CACHE_TECHNICAL_SUMMARY.md)
- [ ] Demo cache usage patterns
- [ ] Explain invalidation strategy
- [ ] Show monitoring dashboard
- [ ] Q&A session

### 6.2 Best Practices Review
- [ ] Always invalidate cache on mutations
- [ ] Use tenant-aware cache keys
- [ ] Monitor hit rates for new endpoints
- [ ] Test with cache enabled and disabled
- [ ] Never cache sensitive data without encryption

---

## Rollback Plan

### If Issues Occur

**Step 1: Disable Cache**
```bash
# Set environment variable
CACHE_ENABLED=false

# Redeploy or restart
vercel --prod
```

**Step 2: Investigate**
- Check error logs
- Review cache metrics
- Test Redis connection
- Verify database migration

**Step 3: Fix & Redeploy**
- Fix identified issues
- Test in staging
- Redeploy with `CACHE_ENABLED=true`

**Step 4: Monitor**
- Watch for recurring issues
- Verify metrics return to normal

---

## Success Criteria

### After 24 Hours
- ✅ Cache hit rate: >75%
- ✅ API response time: <50ms P95
- ✅ Error rate: <0.1%
- ✅ Zero production incidents

### After 1 Week
- ✅ Cache hit rate: >80%
- ✅ API response time: <30ms P95
- ✅ Database query reduction: >75%
- ✅ Cost savings visible

### After 1 Month
- ✅ Cache hit rate: >85%
- ✅ API response time: <20ms P95
- ✅ Database query reduction: >80%
- ✅ $1,000+ cost savings (at scale)

---

## Support & Escalation

### Normal Issues
- Check [Troubleshooting Guide](./REDIS_CACHE_IMPLEMENTATION.md#troubleshooting)
- Review error logs
- Test Redis connection
- Verify environment variables

### Critical Issues
1. Disable cache immediately
2. Notify team lead
3. Create incident ticket
4. Rollback if necessary
5. Post-mortem after resolution

### Contact
- 📖 Documentation: See REDIS_CACHE_IMPLEMENTATION.md
- 💬 Slack: #engineering-cache
- 🚨 On-call: escalate@adsapp.com
- 🐛 GitHub: Create issue with "cache" label

---

## Final Checklist

Before marking deployment complete:
- [ ] All phases completed
- [ ] Monitoring active
- [ ] Team trained
- [ ] Documentation shared
- [ ] Success criteria met
- [ ] Rollback plan tested
- [ ] Post-deployment report written

---

**Deployment Status:** [ ] Complete
**Deployed By:** _______________
**Deployment Date:** _______________
**Post-Deployment Notes:**
```
(Add any observations, issues encountered, or recommendations)
```

---

**Next Review:** 1 week after deployment
**Optimization Target:** 85% hit rate, <20ms P95 latency
