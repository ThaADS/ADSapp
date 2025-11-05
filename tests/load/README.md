# ADSapp Load Testing Suite

Comprehensive load testing framework for validating ADSapp's capacity to handle 2000+ concurrent users.

## Quick Start

### Prerequisites

Install required tools:

```bash
# Install k6 (primary load testing tool)
# macOS
brew install k6

# Windows
winget install k6 --source winget
# or download from https://k6.io/docs/getting-started/installation/

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install Artillery (WebSocket testing)
npm install -g artillery

# Verify installations
k6 version
artillery -V
```

### Running Load Tests

1. **Generate Test Data** (first time only):
```bash
npm run load:generate-data
```

2. **Run Complete Load Test Suite**:
```bash
npm run load:test
```

3. **Run Individual Tests**:
```bash
# k6 HTTP/API testing
npm run load:k6

# Artillery WebSocket testing
npm run load:artillery

# Start metrics collector
npm run load:monitor
```

## Test Structure

```
tests/load/
├── k6-scenarios.js           # k6 load test scenarios
├── artillery-config.yml      # Artillery WebSocket tests
├── artillery-processor.js    # Custom Artillery processors
├── data/
│   ├── generate-test-data.js # Test data generator
│   ├── test-users.json       # Generated user accounts
│   ├── test-conversations.json
│   ├── message-templates.json
│   └── test-contacts.json
├── monitors/
│   └── metrics-collector.js  # Real-time metrics collection
├── scripts/
│   └── run-load-test.sh      # Comprehensive test execution
├── reports/                  # Test results (generated)
└── README.md                 # This file
```

## Test Scenarios

### User Profiles

The load tests simulate four distinct user profiles based on real usage patterns:

#### Profile A: Active Agent (40% of users)
- **Behavior**: High engagement, real-time operations
- **Activity**:
  - Check inbox: 10 req/min
  - Send messages: 2 req/min
  - Update conversations: 1 req/min
  - Search contacts: 0.5 req/min
- **WebSocket**: Maintains persistent connection

#### Profile B: Moderate User (35% of users)
- **Behavior**: Periodic engagement
- **Activity**:
  - Check inbox: 5 req/min
  - Send messages: 1 req/min
  - View analytics: 0.2 req/min
- **WebSocket**: Intermittent connection

#### Profile C: Light User (20% of users)
- **Behavior**: Infrequent access
- **Activity**:
  - Check inbox: 2 req/min
  - Send messages: 0.5 req/min
- **WebSocket**: Occasional connection

#### Profile D: Admin (5% of users)
- **Behavior**: Dashboard-heavy operations
- **Activity**:
  - View dashboards: 3 req/min
  - Manage settings: 0.5 req/min
  - Export reports: 0.1 req/min
- **WebSocket**: Minimal usage

### Load Test Stages

| Stage | Duration | Target Users | Purpose |
|-------|----------|--------------|---------|
| 1. Baseline | 10 min | 100 | Establish performance baseline |
| 2. Ramp Up | 15 min | 100→500 | Detect early degradation |
| 3. Sustained | 30 min | 500 | Stability and leak detection |
| 4. Spike | 5 min | 500→1500 | Auto-scaling validation |
| 5. Peak | 20 min | 2000 | Maximum capacity validation |
| 6. Stress | 10 min | 2000→3000 | Find breaking point |
| 7. Soak | 2 hours | 1000 | Long-duration stability |

**Total Duration**: ~4 hours (without soak) or 6+ hours (with soak)

## Performance Targets

### Response Time Targets

| Endpoint | p95 Target | p99 Target | Max Acceptable |
|----------|------------|------------|----------------|
| Health Check | <100ms | <150ms | 200ms |
| Conversations | <500ms | <800ms | 1500ms |
| Messages | <800ms | <1200ms | 2000ms |
| Contacts | <400ms | <600ms | 1000ms |
| Analytics | <1500ms | <2500ms | 5000ms |

### System Metrics

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | <0.1% | <1% | >5% |
| CPU Usage | <50% | 50-70% | >70% |
| Memory Usage | <60% | 60-80% | >80% |
| DB Connections | <50 | 50-80 | >80 |

## Test Configuration

### Environment Variables

Create a `.env.load-test` file:

```bash
# Application
BASE_URL=http://localhost:3000
TEST_ENV=staging
TEST_RUN_ID=auto-generated

# Test Configuration
RUN_BASELINE=true
RUN_RAMPUP=true
RUN_SUSTAINED=true
RUN_SPIKE=true
RUN_PEAK=true
RUN_STRESS=true
RUN_SOAK=false

# Tools
USE_K6=true
USE_ARTILLERY=true

# Monitoring
METRICS_INTERVAL=5000
```

### k6 Configuration

Edit `k6-scenarios.js` to customize:

```javascript
export const options = {
  stages: [
    { duration: '10m', target: 100 },  // Baseline
    { duration: '15m', target: 500 },  // Ramp up
    { duration: '30m', target: 500 },  // Sustained
    { duration: '5m', target: 1500 },  // Spike
    { duration: '20m', target: 2000 }, // Peak
    { duration: '10m', target: 3000 }, // Stress
  ],

  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.05'],
  },
};
```

## Monitoring & Metrics

### Real-Time Monitoring

While tests run, monitor:

1. **Console Output**: Live metrics and status
2. **Health Endpoint**: `http://localhost:3000/api/health`
3. **Metrics Collector**: Real-time system metrics
4. **Database Dashboard**: Supabase dashboard
5. **Redis Dashboard**: Upstash console

### Collected Metrics

**Application Metrics:**
- Request rate (req/sec)
- Response times (p50, p95, p99)
- Error rates
- Active connections

**System Metrics:**
- CPU utilization
- Memory usage
- Network I/O
- Disk I/O

**Database Metrics:**
- Connection pool usage
- Query response times
- Cache hit rates
- Active queries

**Business Metrics:**
- Messages sent/received
- Conversation operations
- Search queries
- WebSocket connections

## Results Analysis

### Report Locations

After test completion, find reports in:

```
tests/load/reports/{TEST_RUN_ID}/
├── k6-full-suite-results.json
├── k6-full-suite-summary.json
├── artillery-websocket-test-results.json
├── artillery-websocket-test-report.html
├── metrics-{timestamp}.json
├── current-metrics.json
└── LOAD_TEST_REPORT.md
```

### Analyzing Results

1. **Open HTML Reports**:
```bash
open tests/load/reports/{TEST_RUN_ID}/artillery-websocket-test-report.html
```

2. **Check Summary**:
```bash
cat tests/load/reports/{TEST_RUN_ID}/LOAD_TEST_REPORT.md
```

3. **Review Metrics**:
```bash
cat tests/load/reports/{TEST_RUN_ID}/current-metrics.json | jq .
```

### Key Questions to Answer

✅ **Did the system pass all thresholds?**
- Check: Error rate <1%
- Check: p95 response time <1000ms
- Check: No critical errors

✅ **What was the breaking point?**
- Identify: Maximum concurrent users supported
- Identify: First bottleneck encountered
- Identify: Resource that saturated first

✅ **Are there memory leaks?**
- Check: Memory usage over time (soak test)
- Check: Resource cleanup after load reduction
- Check: Connection pool stability

✅ **How effective is caching?**
- Check: Cache hit rate >70%
- Check: Response time improvement with cache
- Check: Cache eviction patterns

✅ **Is auto-scaling working?**
- Check: Scale-up trigger times
- Check: Performance during scaling
- Check: Scale-down behavior

## Troubleshooting

### Common Issues

**Issue**: k6 reports connection errors
```bash
# Solution: Check if application is running
curl http://localhost:3000/api/health

# If not running, start application
npm run dev
```

**Issue**: Test data generation fails
```bash
# Solution: Ensure output directory exists
mkdir -p tests/load/data

# Re-run generator
npm run load:generate-data
```

**Issue**: High error rates during test
```bash
# Solutions:
# 1. Check database connection pool size
# 2. Verify API rate limits
# 3. Review application logs
# 4. Check external service availability
```

**Issue**: Metrics collector stops
```bash
# Solution: Check for errors in console
# Restart manually:
node tests/load/monitors/metrics-collector.js
```

### Debug Mode

Run tests with verbose output:

```bash
# k6 with debug
k6 run --verbose tests/load/k6-scenarios.js

# Artillery with debug
DEBUG=* artillery run tests/load/artillery-config.yml
```

## Best Practices

### Before Testing

1. ✅ Test on non-production environment
2. ✅ Ensure test data is isolated
3. ✅ Verify baseline system health
4. ✅ Alert team of upcoming test
5. ✅ Prepare rollback procedures

### During Testing

1. ✅ Monitor all dashboards actively
2. ✅ Take notes of anomalies
3. ✅ Be ready to stop test if critical issues
4. ✅ Document unexpected behaviors
5. ✅ Keep communication channels open

### After Testing

1. ✅ Analyze all reports thoroughly
2. ✅ Document bottlenecks found
3. ✅ Create optimization tasks
4. ✅ Update capacity planning
5. ✅ Share findings with team

## Advanced Usage

### Custom Scenarios

Create custom k6 scenarios:

```javascript
// tests/load/custom-scenario.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },
  ],
};

export default function() {
  const response = http.get('http://localhost:3000/api/custom-endpoint');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

Run custom scenario:
```bash
k6 run tests/load/custom-scenario.js
```

### Distributed Load Testing

For higher load, run tests from multiple machines:

```bash
# Machine 1
k6 run --out influxdb=http://influxdb:8086/k6 tests/load/k6-scenarios.js

# Machine 2
k6 run --out influxdb=http://influxdb:8086/k6 tests/load/k6-scenarios.js

# Aggregate results in InfluxDB/Grafana
```

### CI/CD Integration

Add to GitHub Actions:

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

      - name: Generate Test Data
        run: npm run load:generate-data

      - name: Run Load Test
        run: k6 run tests/load/k6-scenarios.js

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/reports/
```

## Documentation

For detailed information, see:

- **[Load Test Plan](../../docs/load-testing/LOAD_TEST_PLAN.md)** - Complete testing strategy
- **[Bottleneck Analysis](../../docs/load-testing/BOTTLENECK_ANALYSIS.md)** - How to identify issues
- **[Capacity Planning](../../docs/load-testing/CAPACITY_PLANNING.md)** - Scaling recommendations
- **[Optimization Guide](../../docs/load-testing/OPTIMIZATION_GUIDE.md)** - Performance improvements

## Support

### Need Help?

- **Documentation**: `/docs/load-testing/`
- **Issues**: Create GitHub issue with `load-testing` label
- **Team Chat**: #performance-testing Slack channel
- **On-Call**: Contact DevOps team

### Contributing

To improve load tests:

1. Fork repository
2. Create feature branch
3. Add/modify test scenarios
4. Update documentation
5. Submit pull request

## License

Internal use only - ADSapp Performance Engineering Team

---

**Version**: 1.0
**Last Updated**: 2025-10-14
**Maintainer**: Performance Engineering Team
