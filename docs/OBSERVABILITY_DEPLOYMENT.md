# Observability & RBAC Deployment Checklist

## Phase 4 Week 27-28: Distributed Tracing & Advanced RBAC

### Pre-Deployment

#### Environment Variables

```bash
# OpenTelemetry - Development
OTEL_SERVICE_NAME=adsapp-whatsapp-inbox
OTEL_SAMPLING_RATE=1.0
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# OpenTelemetry - Production
OTEL_SERVICE_NAME=adsapp-production
OTEL_SAMPLING_RATE=0.1
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector:4318
OTEL_EXPORTER_OTLP_HEADERS={"api-key":"your-key"}

# Feature Flags
ENABLE_DISTRIBUTED_TRACING=true
ENABLE_RBAC=true
```

#### Database Migration

```bash
# 1. Backup database
pg_dump -h your-host -U your-user -d your-db > backup-$(date +%Y%m%d).sql

# 2. Run RBAC migration
psql -h your-host -U your-user -d your-db < supabase/migrations/20251014_advanced_rbac.sql

# 3. Verify tables created
psql -h your-host -U your-user -d your-db -c "\dt"
# Should see: roles, user_roles, permission_overrides, rbac_audit_log

# 4. Verify system roles created
psql -h your-host -U your-user -d your-db -c "SELECT name, priority FROM roles WHERE is_system_role = true ORDER BY priority DESC;"
```

#### Dependencies

```bash
# Install OpenTelemetry and RBAC dependencies
npm install

# Verify installation
npm list @opentelemetry/sdk-node
npm list @casl/ability
```

### Deployment Steps

#### 1. Deploy Infrastructure

**Jaeger (Development)**
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

**OTLP Collector (Production)**
```bash
# Deploy OpenTelemetry Collector
kubectl apply -f k8s/otel-collector.yaml

# Or Docker Compose
docker-compose -f docker-compose.otel.yaml up -d
```

#### 2. Deploy Application

```bash
# Build application
npm run build

# Run database migrations
npm run migration:apply

# Start application
npm run start

# Verify instrumentation loaded
# Check logs for: "✅ OpenTelemetry tracing initialized"
```

#### 3. Verify Telemetry

```bash
# Test tracing endpoint
curl http://localhost:3000/api/health

# Check Jaeger UI
open http://localhost:16686

# Verify traces appear
# Should see: "adsapp-whatsapp-inbox" service
```

#### 4. Verify RBAC

```sql
-- Check system roles created
SELECT COUNT(*) FROM roles WHERE is_system_role = true;
-- Expected: 7 roles (super_admin, org_owner, org_admin, team_lead, supervisor, agent, billing_manager)

-- Verify RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('roles', 'user_roles', 'permission_overrides', 'rbac_audit_log');
-- Expected: Multiple policies per table

-- Test permission function
SELECT check_user_permission(
  'user-uuid',
  'conversations',
  'read',
  NULL,
  'org-uuid'
);
-- Expected: true or false
```

#### 5. Assign Initial Roles

```sql
-- Assign super admin role to initial admin
INSERT INTO user_roles (user_id, role_id, granted_by)
SELECT
  'your-admin-user-id',
  id,
  'system'
FROM roles
WHERE name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assign organization owner roles
INSERT INTO user_roles (user_id, role_id, granted_by)
SELECT
  p.id as user_id,
  r.id as role_id,
  'system' as granted_by
FROM profiles p
JOIN roles r ON r.organization_id = p.organization_id
WHERE r.name = 'organization_owner'
  AND p.role = 'owner' -- Your existing role field
ON CONFLICT DO NOTHING;
```

### Post-Deployment Verification

#### Telemetry Verification

**1. HTTP Tracing**
```bash
# Make API request
curl -X GET http://localhost:3000/api/conversations \
  -H "Authorization: Bearer your-token"

# Check Jaeger for trace
# Should see spans: HTTP request → DB query → Response
```

**2. Database Tracing**
```bash
# Trigger database operation
curl -X POST http://localhost:3000/api/contacts \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"+1234567890"}'

# Check Jaeger
# Should see: db.query.insert span with table: contacts
```

**3. External API Tracing**
```bash
# Send WhatsApp message (triggers external API)
curl -X POST http://localhost:3000/api/conversations/123/messages \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test"}'

# Check Jaeger
# Should see: external.whatsapp.send_message span
```

**4. Metrics Endpoint**
```bash
# Check metrics (requires super admin)
curl -X GET http://localhost:3000/api/metrics \
  -H "Authorization: Bearer super-admin-token"

# Expected response with performance metrics
```

#### RBAC Verification

**1. Permission Check**
```bash
# Test as agent (should succeed)
curl -X GET http://localhost:3000/api/conversations \
  -H "Authorization: Bearer agent-token"
# Expected: 200 OK with conversations

# Test as agent trying admin action (should fail)
curl -X DELETE http://localhost:3000/api/users/123 \
  -H "Authorization: Bearer agent-token"
# Expected: 403 Permission Denied
```

**2. Role Hierarchy**
```bash
# Verify role priorities work
psql -c "SELECT u.email, r.name, r.priority
FROM user_roles ur
JOIN profiles u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
WHERE ur.is_active = true
ORDER BY r.priority DESC;"
```

**3. Audit Trail**
```bash
# Check audit logs are being created
psql -c "SELECT event_type, COUNT(*)
FROM rbac_audit_log
GROUP BY event_type
ORDER BY COUNT(*) DESC;"
```

### Performance Benchmarks

#### Baseline Metrics (Before Telemetry)

```
Average Response Time: 50ms
P95 Response Time: 150ms
P99 Response Time: 300ms
Error Rate: 0.5%
```

#### Target Metrics (With Telemetry)

```
Average Response Time: <55ms (10% overhead acceptable)
P95 Response Time: <165ms
P99 Response Time: <330ms
Error Rate: <0.5% (should not increase)
Telemetry Overhead: <5%
```

#### Benchmark Tests

```bash
# Run load tests
npm run test:performance

# Expected results:
# - Response time increase <10%
# - No memory leaks
# - CPU usage increase <2%
# - All traces captured correctly
```

### Monitoring Setup

#### Alerts

**Critical Alerts** (Page on-call)
```yaml
- High error rate (>5%)
- P99 latency >1000ms
- Database connection pool exhausted
- RBAC audit log failures
```

**Warning Alerts** (Team notification)
```yaml
- Error rate >2%
- P95 latency >500ms
- Permission check failures >10%
- Trace export failures
```

#### Dashboards

**Telemetry Dashboard**
- Request throughput
- Latency percentiles (P50, P95, P99)
- Error rates by endpoint
- Database query performance
- External API latency
- Queue processing times

**RBAC Dashboard**
- Permission checks/sec
- Permission denials
- Role assignments
- Active users by role
- Audit log growth

### Rollback Plan

#### If Telemetry Causes Issues

```bash
# 1. Disable telemetry via environment variable
ENABLE_DISTRIBUTED_TRACING=false

# 2. Restart application
pm2 restart adsapp

# 3. Verify performance returns to baseline
curl http://localhost:3000/api/health
```

#### If RBAC Causes Issues

```sql
-- 1. Disable RLS temporarily (emergency only)
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides DISABLE ROW LEVEL SECURITY;

-- 2. Grant temporary superuser access
UPDATE profiles SET role = 'super_admin' WHERE email = 'admin@company.com';

-- 3. Investigate and fix

-- 4. Re-enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;
```

### Production Readiness Checklist

#### OpenTelemetry

- [ ] Environment variables configured
- [ ] Trace exporter endpoint accessible
- [ ] Sampling rate appropriate (10% production)
- [ ] Critical endpoints force-sampled
- [ ] Spans properly ended (no leaks)
- [ ] Sensitive data excluded from spans
- [ ] Performance overhead <5%
- [ ] Alerts configured
- [ ] Dashboards created
- [ ] Team trained on Jaeger UI

#### RBAC

- [ ] Database migration completed
- [ ] System roles created
- [ ] Initial roles assigned
- [ ] RLS policies active
- [ ] Permission checks working
- [ ] Audit logging active
- [ ] Admin UI accessible
- [ ] Documentation reviewed
- [ ] Team trained on permissions
- [ ] Rollback plan tested

### Success Criteria

**Telemetry**
- ✅ All API requests traced
- ✅ Database queries instrumented
- ✅ External API calls tracked
- ✅ Queue jobs traced
- ✅ Business events recorded
- ✅ Metrics exported successfully
- ✅ Performance overhead <5%
- ✅ No trace data loss

**RBAC**
- ✅ 50+ granular permissions defined
- ✅ 7 system roles operational
- ✅ Permission checks <10ms
- ✅ Audit trail complete
- ✅ RLS policies enforced
- ✅ Zero unauthorized access
- ✅ Admin UI functional
- ✅ 95%+ test coverage

### Support Contacts

**Telemetry Issues**
- DevOps Team: devops@company.com
- On-call: +1-555-ONCALL
- Slack: #observability

**RBAC Issues**
- Security Team: security@company.com
- On-call: +1-555-SECURITY
- Slack: #security

### Additional Resources

- [Distributed Tracing Guide](./DISTRIBUTED_TRACING_GUIDE.md)
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

### Maintenance

**Weekly**
- Review trace sampling rates
- Check permission denial patterns
- Monitor audit log growth
- Review alert thresholds

**Monthly**
- Analyze performance trends
- Review role assignments
- Update documentation
- Team training refresher

**Quarterly**
- Permission audit
- Role hierarchy review
- Telemetry cost optimization
- Security assessment
